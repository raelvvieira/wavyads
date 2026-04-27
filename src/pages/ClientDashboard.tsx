import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TrendingUp, RefreshCw, ArrowLeft, CalendarIcon, Send } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GlassCard } from '@/components/GlassCard';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard, getDefaultCards, saveCards, type MetricKey } from '@/components/KpiCard';
import { DailyChart } from '@/components/DailyChart';
import { CampaignsTable } from '@/components/CampaignsTable';
import { CreativesGallery } from '@/components/CreativesGallery';

import { ConversionFunnel } from '@/components/ConversionFunnel';
import { InsightsCards } from '@/components/InsightsCards';
import { StrategicSummary } from '@/components/StrategicSummary';
import { GapAlert } from '@/components/GapAlert';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useClient } from '@/hooks/useClients';
import { useRole } from '@/hooks/useRole';
import { useGetMetaAuthUrl, useSelectMetaAccount } from '@/hooks/useMetaOAuth';
import { useGetGoogleAdsAuthUrl, useSelectGoogleAdsAccount } from '@/hooks/useGoogleAdsOAuth';
import { useMetaCampaigns, useMetaInsights, useMetaInsightsPrevious, type DailyMetric, type TimeRange } from '@/hooks/useMetaInsights';
import { useMetaAds } from '@/hooks/useMetaAds';
import { useGoogleAdsCampaigns, useGoogleAdsInsights, useGoogleAdsInsightsPrevious } from '@/hooks/useGoogleAdsInsights';
import { generateDailySpend, formatCurrency, formatNumber, mockCampaigns } from '@/data/mock';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useClients } from '@/hooks/useClients';
import { OfflineConversionDialog } from '@/components/OfflineConversionDialog';

const CONVERSION_ENABLED_CLIENTS = ['deni haut cursos'];
const showConversionButton = (name?: string | null) =>
  !!name && CONVERSION_ENABLED_CLIENTS.includes(name.trim().toLowerCase());

type PresetKey = 'today' | 'yesterday' | 'last_7d' | 'last_14d' | 'last_30d' | 'this_month' | 'last_month' | 'custom';
type Platform = 'meta' | 'google';

const PRESETS: { label: string; value: PresetKey }[] = [
  { label: 'Hoje', value: 'today' },
  { label: 'Ontem', value: 'yesterday' },
  { label: 'Últimos 7 dias', value: 'last_7d' },
  { label: 'Últimos 14 dias', value: 'last_14d' },
  { label: 'Últimos 30 dias', value: 'last_30d' },
  { label: 'Este mês', value: 'this_month' },
  { label: 'Mês passado', value: 'last_month' },
  { label: 'Personalizado', value: 'custom' },
];

function computeTimeRange(preset: PresetKey): TimeRange {
  const today = startOfDay(new Date());
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

  switch (preset) {
    case 'today':
      return { since: fmt(today), until: fmt(today) };
    case 'yesterday': {
      const y = subDays(today, 1);
      return { since: fmt(y), until: fmt(y) };
    }
    case 'last_7d':
      return { since: fmt(subDays(today, 6)), until: fmt(today) };
    case 'last_14d':
      return { since: fmt(subDays(today, 13)), until: fmt(today) };
    case 'last_30d':
      return { since: fmt(subDays(today, 29)), until: fmt(today) };
    case 'this_month':
      return { since: fmt(startOfMonth(today)), until: fmt(today) };
    case 'last_month': {
      const lastMonth = subMonths(today, 1);
      return { since: fmt(startOfMonth(lastMonth)), until: fmt(endOfMonth(lastMonth)) };
    }
    default:
      return { since: fmt(subDays(today, 29)), until: fmt(today) };
  }
}

export default function ClientDashboard() {
  const { clientId: paramClientId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const { user } = useAuth();

  const { data: allClients } = useClients();
  const clientUserRecord = !isAdmin && allClients?.length ? allClients[0] : null;
  const clientId = paramClientId || clientUserRecord?.id;

  const { data: client, isLoading: clientLoading } = useClient(clientId);
  // Preferences persistence
  const prefsKey = clientId ? `wavy-dash-prefs-${clientId}` : null;
  const savedPrefs = useMemo(() => {
    if (!prefsKey) return {};
    try { return JSON.parse(localStorage.getItem(prefsKey) || '{}'); } catch { return {}; }
  }, [prefsKey]);

  const [selectedPreset, setSelectedPreset] = useState<PresetKey>(savedPrefs.preset || 'this_month');
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [conversionDialogOpen, setConversionDialogOpen] = useState(false);

  const isMetaSynced = client?.is_synced ?? false;
  const isGoogleSynced = (client as any)?.google_ads_synced ?? false;

  // Platform toggle — default to whichever is synced
  const [platform, setPlatform] = useState<Platform>(savedPrefs.platform || 'meta');
  useEffect(() => {
    if (!savedPrefs.platform) {
      if (isMetaSynced && !isGoogleSynced) setPlatform('meta');
      else if (!isMetaSynced && isGoogleSynced) setPlatform('google');
    }
  }, [isMetaSynced, isGoogleSynced, savedPrefs.platform]);

  // Save prefs on change
  useEffect(() => {
    if (!prefsKey) return;
    const data = JSON.stringify({ preset: selectedPreset, platform });
    localStorage.setItem(prefsKey, data);
  }, [prefsKey, selectedPreset, platform]);

  const isSynced = platform === 'meta' ? isMetaSynced : isGoogleSynced;

  // Compute the time range based on preset or custom
  const timeRange: TimeRange | undefined = useMemo(() => {
    if (selectedPreset === 'custom') {
      if (customDateRange.from && customDateRange.to) {
        return {
          since: format(customDateRange.from, 'yyyy-MM-dd'),
          until: format(customDateRange.to, 'yyyy-MM-dd'),
        };
      }
      return undefined;
    }
    return computeTimeRange(selectedPreset);
  }, [selectedPreset, customDateRange]);

  // Meta hooks
  const { data: metaCampaigns, isLoading: metaCampaignsLoading } = useMetaCampaigns(clientId, platform === 'meta' && isMetaSynced, timeRange);
  const { data: metaInsights, isLoading: metaInsightsLoading } = useMetaInsights(clientId, platform === 'meta' && isMetaSynced, timeRange);
  const { data: metaPreviousInsights } = useMetaInsightsPrevious(clientId, platform === 'meta' && isMetaSynced, timeRange);
  const { data: metaAds, isLoading: metaAdsLoading } = useMetaAds(clientId, platform === 'meta' && isMetaSynced, timeRange);
  // Google Ads hooks
  const { data: googleCampaigns, isLoading: googleCampaignsLoading } = useGoogleAdsCampaigns(clientId, platform === 'google' && isGoogleSynced, timeRange);
  const { data: googleInsights, isLoading: googleInsightsLoading } = useGoogleAdsInsights(clientId, platform === 'google' && isGoogleSynced, timeRange);
  const { data: googlePreviousInsights } = useGoogleAdsInsightsPrevious(clientId, platform === 'google' && isGoogleSynced, timeRange);

  // Active data based on platform
  const campaigns = platform === 'meta' ? metaCampaigns : googleCampaigns;
  const campaignsLoading = platform === 'meta' ? metaCampaignsLoading : googleCampaignsLoading;
  const insights = platform === 'meta' ? metaInsights : googleInsights;
  const insightsLoading = platform === 'meta' ? metaInsightsLoading : googleInsightsLoading;
  const previousInsights = platform === 'meta' ? metaPreviousInsights : googlePreviousInsights;

  const getAuthUrl = useGetMetaAuthUrl();
  const selectAccount = useSelectMetaAccount();
  const [pendingAccounts, setPendingAccounts] = useState<any[] | null>(null);

  // KPI card customization
  const [kpiCards, setKpiCards] = useState<MetricKey[]>(() => getDefaultCards(clientId));

  const handleChangeMetric = (index: number, newKey: MetricKey) => {
    setKpiCards(prev => {
      const next = [...prev];
      next[index] = newKey;
      saveCards(next, clientId);
      return next;
    });
  };

  const isLoading = clientLoading || (isSynced && (campaignsLoading || insightsLoading));

  // Listen for popup message
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'META_OAUTH_CALLBACK' && event.data?.accounts) {
        setPendingAccounts(event.data.accounts);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleSync = useCallback(() => {
    if (!clientId) return;
    const redirectUri = `${window.location.origin}/auth/meta/callback`;
    getAuthUrl.mutate(
      { clientId, redirectUri },
      {
        onSuccess: (url) => {
          const popup = window.open(url, 'meta-oauth', 'width=600,height=700,scrollbars=yes');
          if (!popup) toast({ title: 'Erro', description: 'Popup bloqueado. Permita popups para este site.', variant: 'destructive' });
        },
        onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
      }
    );
  }, [clientId, getAuthUrl]);

  const handleSelectAccount = (account: { id: string; name: string }) => {
    if (!clientId) return;
    selectAccount.mutate(
      { clientId, adAccountId: account.id, adAccountName: account.name },
      {
        onSuccess: () => {
          toast({ title: 'Conta conectada!', description: account.name });
          setPendingAccounts(null);
        },
        onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
      }
    );
  };

  const handlePresetSelect = (preset: PresetKey) => {
    if (preset === 'custom') {
      setDatePickerOpen(true);
    } else {
      setSelectedPreset(preset);
      setDatePickerOpen(false);
    }
  };

  // Aggregate data
  const campaignList = useMemo(() => {
    if (isSynced && campaigns) return campaigns;
    return isSynced ? [] : mockCampaigns.slice(0, 5).map(c => {
      const purchases = Math.floor(c.conversions * 0.3);
      const purchase_value = purchases * 150;
      return {
        ...c, reach: c.impressions * 0.8, leads: Math.floor(c.conversions * 0.7),
        cpl: c.spend / Math.max(1, Math.floor(c.conversions * 0.7)),
        purchases,
        cost_per_purchase: c.spend / Math.max(1, purchases),
        purchase_value,
        purchase_roas: c.spend > 0 ? purchase_value / c.spend : 0,
        results: c.conversions,
        cost_per_result: c.spend / Math.max(1, c.conversions),
        cpm: (c.spend / c.impressions) * 1000, frequency: 1.5,
      };
    });
  }, [isSynced, campaigns]);

  const dailyData: DailyMetric[] = useMemo(() => {
    if (isSynced && insights?.daily?.length) return insights.daily;
    if (!isSynced) {
      const days = selectedPreset === 'custom' ? 30 : { 'today': 1, 'yesterday': 1, 'last_7d': 7, 'last_14d': 14, 'last_30d': 30, 'this_month': 30, 'last_month': 30 }[selectedPreset] || 30;
      return generateDailySpend(days).map(d => {
        const leads = Math.floor(d.value * 0.3);
        const purchases = Math.floor(d.value * 0.05);
        const results = leads + purchases;
        return {
          date: d.date, spend: d.value,
          impressions: Math.floor(d.value * 50), reach: Math.floor(d.value * 40),
          clicks: Math.floor(d.value * 2), leads, purchases, results,
          conversions: results,
          cost_per_purchase: purchases > 0 ? d.value / purchases : 0,
          cost_per_result: results > 0 ? d.value / results : 0,
        };
      });
    }
    return [];
  }, [isSynced, insights, selectedPreset]);

  // Metric values for KPI cards
  const metricValues: Record<MetricKey, number> = useMemo(() => {
    const i = insights;
    const fromCampaigns = (key: string) => campaignList.reduce((s, c) => s + ((c as any)[key] || 0), 0);
    const spend = i?.spend ?? fromCampaigns('spend');
    const impressions = i?.impressions ?? fromCampaigns('impressions');
    const clicks = i?.clicks ?? fromCampaigns('clicks');
    const leads = i?.leads ?? fromCampaigns('leads');
    const purchases = i?.purchases ?? fromCampaigns('purchases');
    const results = i?.results ?? fromCampaigns('results');

    return {
      spend,
      impressions,
      reach: i?.reach ?? fromCampaigns('reach'),
      clicks,
      ctr: i?.ctr ?? (impressions > 0 ? (clicks / impressions) * 100 : 0),
      cpm: i?.cpm ?? (impressions > 0 ? (spend / impressions) * 1000 : 0),
      cpc: i?.cpc ?? (clicks > 0 ? spend / clicks : 0),
      leads,
      cpl: i?.cpl ?? (leads > 0 ? spend / leads : 0),
      purchases,
      cost_per_purchase: i?.cost_per_purchase ?? (purchases > 0 ? spend / purchases : 0),
      purchase_value: (i as any)?.purchase_value ?? campaignList.reduce((s, c) => s + ((c as any).purchase_value || 0), 0),
      purchase_roas: (i as any)?.purchase_roas ?? (spend > 0 ? (campaignList.reduce((s, c) => s + ((c as any).purchase_value || 0), 0)) / spend : 0),
      roas: i?.roas ?? 0,
      frequency: i?.frequency ?? 0,
      results,
      cost_per_result: i?.cost_per_result ?? (results > 0 ? spend / results : 0),
    };
  }, [insights, campaignList]);

  // Previous period values for comparison
  const previousValues: Record<MetricKey, number> | null = useMemo(() => {
    const p = previousInsights;
    if (!p) return null;
    return {
      spend: p.spend ?? 0,
      impressions: p.impressions ?? 0,
      reach: p.reach ?? 0,
      clicks: p.clicks ?? 0,
      ctr: p.ctr ?? 0,
      cpm: p.cpm ?? 0,
      cpc: p.cpc ?? 0,
      leads: p.leads ?? 0,
      cpl: p.cpl ?? 0,
      purchases: p.purchases ?? 0,
      cost_per_purchase: p.cost_per_purchase ?? 0,
      roas: p.roas ?? 0,
      frequency: p.frequency ?? 0,
      results: p.results ?? 0,
      cost_per_result: p.cost_per_result ?? 0,
    };
  }, [previousInsights]);

  if (clientLoading) {
    return (
      <div className="p-6 pt-20 lg:pt-6 flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6 pt-20 lg:pt-6">
        <GlassCard className="text-center py-16">
          <p className="text-muted-foreground">Cliente não encontrado</p>
        </GlassCard>
      </div>
    );
  }

  // Account selection modal
  if (pendingAccounts) {
    return (
      <div className="p-6 pt-20 lg:pt-6 max-w-2xl mx-auto space-y-6 animate-fade-in">
        <GlassCard>
          <h2 className="text-lg font-semibold mb-2">Selecione a Conta de Anúncios</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Escolha a conta de anúncios para <strong>{client.name}</strong>
          </p>
          {pendingAccounts.length > 0 ? (
            <div className="space-y-2">
              {pendingAccounts.map((acc: any) => (
                <button
                  key={acc.id}
                  onClick={() => handleSelectAccount({ id: acc.id, name: acc.name })}
                  disabled={selectAccount.isPending}
                  className="w-full glass rounded-xl p-4 text-left hover:border-accent/50 transition-all flex items-center justify-between group"
                >
                  <div>
                    <p className="text-sm font-medium">{acc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ID: {acc.account_id}
                      {acc.business_name && ` · ${acc.business_name}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma conta encontrada.</p>
          )}
          <button onClick={() => setPendingAccounts(null)} className="text-sm text-muted-foreground mt-4 hover:text-foreground transition-colors">
            Cancelar
          </button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-2 sm:gap-4 border-b border-white/10 bg-black/60 backdrop-blur-xl px-4 sm:px-6 py-3 sm:py-4 pt-14 lg:pt-4">
        {isAdmin && (
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent/70 text-sm font-bold">
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="font-semibold text-base">{client.name}</h1>
            {client.meta_ad_account_name && (
              <p className="text-xs text-muted-foreground">{client.meta_ad_account_name}</p>
            )}
          </div>
        </div>

        {/* Platform Toggle */}
        {(isMetaSynced || isGoogleSynced) && (
          <div className="flex items-center gap-1 glass rounded-xl p-1">
            <button
              onClick={() => setPlatform('meta')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-300',
                platform === 'meta' ? 'btn-accent' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Meta Ads
            </button>
            <button
              onClick={() => setPlatform('google')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-300',
                platform === 'google' ? 'btn-accent' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Google Ads
            </button>
          </div>
        )}

        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          {PRESETS.map((p) => (
            p.value !== 'custom' ? (
              <button
                key={p.value}
                onClick={() => handlePresetSelect(p.value)}
                className={cn(
                  'rounded-lg px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium transition-all duration-300',
                  selectedPreset === p.value
                    ? 'btn-accent'
                    : 'glass text-muted-foreground hover:text-foreground hover:bg-white/[0.08]'
                )}
              >
                {p.label}
              </button>
            ) : (
              <Popover key={p.value} open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      'rounded-lg px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium transition-all duration-300 flex items-center gap-1.5',
                      selectedPreset === 'custom'
                        ? 'btn-accent'
                        : 'glass text-muted-foreground hover:text-foreground hover:bg-white/[0.08]'
                    )}
                  >
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {selectedPreset === 'custom' && customDateRange.from && customDateRange.to
                      ? `${format(customDateRange.from, 'dd/MM')} - ${format(customDateRange.to, 'dd/MM')}`
                      : 'Personalizado'}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 glass border-white/10" align="end">
                  <div className="flex flex-col">
                    <Calendar
                      mode="range"
                      selected={customDateRange.from ? { from: customDateRange.from, to: customDateRange.to } : undefined}
                      onSelect={(range) => {
                        if (range?.from) {
                          setCustomDateRange({ from: range.from, to: range.to });
                        } else {
                          setCustomDateRange({});
                        }
                      }}
                      disabled={(date) => date > new Date()}
                      numberOfMonths={2}
                      className={cn("p-3 pointer-events-auto")}
                    />
                    <div className="flex items-center justify-between px-4 pb-3">
                      <span className="text-xs text-muted-foreground">
                        {customDateRange.from && customDateRange.to
                          ? `${format(customDateRange.from, 'dd/MM/yyyy')} — ${format(customDateRange.to, 'dd/MM/yyyy')}`
                          : customDateRange.from
                            ? `${format(customDateRange.from, 'dd/MM/yyyy')} — …`
                            : 'Selecione as datas'}
                      </span>
                      <Button
                        size="sm"
                        disabled={!customDateRange.from || !customDateRange.to}
                        onClick={() => {
                          setSelectedPreset('custom');
                          setDatePickerOpen(false);
                        }}
                        className="btn-accent text-xs px-4"
                      >
                        Aplicar
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )
          ))}
        </div>
      </header>

      {showConversionButton(client?.name) && clientId && (
        <>
          <div className="px-4 sm:px-6 pt-4 flex justify-end">
            <button
              onClick={() => setConversionDialogOpen(true)}
              className="btn-accent rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Registrar Conversão
            </button>
          </div>
          <OfflineConversionDialog
            open={conversionDialogOpen}
            onOpenChange={setConversionDialogOpen}
            clientId={clientId}
          />
        </>
      )}

      {/* Not synced state */}
      {!isSynced && isAdmin ? (
        <div className="p-6 flex items-center justify-center min-h-[60vh]">
          <GlassCard className="max-w-md text-center py-16 animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 mx-auto mb-6">
              <TrendingUp className="h-8 w-8 text-accent" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {platform === 'meta' ? 'Sincronize com Meta Ads' : 'Sincronize com Google Ads'}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {platform === 'meta'
                ? 'Conecte a conta de anúncios do Facebook para visualizar dados reais de campanhas.'
                : 'Conecte a conta do Google Ads para visualizar dados reais de campanhas.'}
            </p>
            {platform === 'meta' ? (
              <button
                onClick={handleSync}
                disabled={getAuthUrl.isPending}
                className="btn-accent rounded-xl px-6 py-3 text-sm font-semibold flex items-center gap-2 mx-auto"
              >
                <RefreshCw className={cn('h-4 w-4', getAuthUrl.isPending && 'animate-spin')} />
                Sync Meta Ads
              </button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sincronize pelo painel de clientes do admin.
              </p>
            )}
          </GlassCard>
        </div>
      ) : !isSynced && !isAdmin ? (
        <div className="p-6 flex items-center justify-center min-h-[60vh]">
          <GlassCard className="max-w-md text-center py-16 animate-fade-in">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Aguardando sincronização</h2>
            <p className="text-sm text-muted-foreground">
              Seu dashboard será exibido assim que o administrador sincronizar sua conta com {platform === 'meta' ? 'Meta Ads' : 'Google Ads'}.
            </p>
          </GlassCard>
        </div>
      ) : (
        /* Dashboard content */
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Gap Alert */}
          <GapAlert leads={metricValues.leads} purchases={metricValues.purchases} />

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <GlassCard key={i}><Skeleton className="h-20 bg-white/5" /></GlassCard>
              ))
            ) : (
              kpiCards.map((key, i) => (
                <KpiCard
                  key={`${key}-${i}`}
                  metricKey={key}
                  value={metricValues[key]}
                  previousValue={previousValues?.[key]}
                  onChangeMetric={(newKey) => handleChangeMetric(i, newKey)}
                />
              ))
            )}
          </div>

          {/* Daily Chart */}
          {!isLoading && dailyData.length > 0 && (
            <DailyChart data={dailyData} />
          )}

          {/* Campaigns Table */}
          {!isLoading && campaignList.length > 0 && (
            <CampaignsTable campaigns={campaignList} />
          )}

          {/* Creatives Gallery — visible for all clients with Meta ads data */}
          {!isLoading && !metaAdsLoading && metaAds && metaAds.length > 0 && (
            <CreativesGallery ads={metaAds} />
          )}


          {/* Conversion Funnel */}
          {!isLoading && (
            <ConversionFunnel
              reach={metricValues.reach}
              impressions={metricValues.impressions}
              clicks={metricValues.clicks}
              leads={metricValues.leads}
              purchases={metricValues.purchases}
              results={metricValues.results}
              cpm={metricValues.cpm}
              cpc={metricValues.cpc}
              cpl={metricValues.cpl}
              costPerPurchase={metricValues.cost_per_purchase}
              costPerResult={metricValues.cost_per_result}
            />
          )}

          {/* Insights & Recommendations */}
          {!isLoading && campaignList.length > 0 && (
            <InsightsCards
              campaigns={campaignList}
              totalSpend={metricValues.spend}
              totalLeads={metricValues.leads}
              totalResults={metricValues.results}
              avgCpl={metricValues.cpl}
              avgCpm={metricValues.cpm}
              avgCtr={metricValues.ctr}
            />
          )}

          {/* Strategic Summary */}
          {!isLoading && campaignList.length > 0 && (
            <StrategicSummary
              clientName={client.name}
              period={selectedPreset}
              totalSpend={metricValues.spend}
              totalLeads={metricValues.leads}
              totalResults={metricValues.results}
              totalPurchases={metricValues.purchases}
              avgCpl={metricValues.cpl}
              costPerResult={metricValues.cost_per_result}
              campaigns={campaignList}
            />
          )}
        </div>
      )}
    </div>
  );
}
