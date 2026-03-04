import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TrendingUp, RefreshCw, ArrowLeft, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GlassCard } from '@/components/GlassCard';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard, getDefaultCards, saveCards, type MetricKey } from '@/components/KpiCard';
import { DailyChart } from '@/components/DailyChart';
import { CampaignsTable } from '@/components/CampaignsTable';
import { RankingCharts } from '@/components/RankingCharts';
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
import { useMetaCampaigns, useMetaInsights, useMetaInsightsPrevious, type DailyMetric } from '@/hooks/useMetaInsights';
import { generateDailySpend, formatCurrency, formatNumber, mockCampaigns } from '@/data/mock';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useClients } from '@/hooks/useClients';

type Period = '7d' | '30d' | '90d' | 'custom';

const periodToPreset: Record<string, string> = {
  '7d': 'last_7d',
  '30d': 'last_30d',
  '90d': 'last_90d',
};

const periods: { label: string; value: Period }[] = [
  { label: '7 dias', value: '7d' },
  { label: '30 dias', value: '30d' },
  { label: '90 dias', value: '90d' },
  { label: 'Personalizado', value: 'custom' },
];

export default function ClientDashboard() {
  const { clientId: paramClientId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const { user } = useAuth();

  const { data: allClients } = useClients();
  const clientUserRecord = !isAdmin && allClients?.length ? allClients[0] : null;
  const clientId = paramClientId || clientUserRecord?.id;

  const { data: client, isLoading: clientLoading } = useClient(clientId);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('30d');
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const isSynced = client?.is_synced ?? false;

  // Determine the date preset to use
  const datePreset = selectedPeriod === 'custom' ? 'last_30d' : periodToPreset[selectedPeriod];

  const { data: campaigns, isLoading: campaignsLoading } = useMetaCampaigns(clientId, isSynced, datePreset);
  const { data: insights, isLoading: insightsLoading } = useMetaInsights(clientId, isSynced, datePreset);
  const { data: previousInsights } = useMetaInsightsPrevious(clientId, isSynced, datePreset);

  const getAuthUrl = useGetMetaAuthUrl();
  const selectAccount = useSelectMetaAccount();
  const [pendingAccounts, setPendingAccounts] = useState<any[] | null>(null);

  // KPI card customization
  const [kpiCards, setKpiCards] = useState<MetricKey[]>(getDefaultCards);

  const handleChangeMetric = (index: number, newKey: MetricKey) => {
    setKpiCards(prev => {
      const next = [...prev];
      next[index] = newKey;
      saveCards(next);
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

  const handlePeriodSelect = (period: Period) => {
    if (period === 'custom') {
      setDatePickerOpen(true);
    } else {
      setSelectedPeriod(period);
      setDatePickerOpen(false);
    }
  };

  // Aggregate data
  const campaignList = useMemo(() => {
    if (isSynced && campaigns) return campaigns;
    return isSynced ? [] : mockCampaigns.slice(0, 5).map(c => ({
      ...c, reach: c.impressions * 0.8, leads: Math.floor(c.conversions * 0.7),
      cpl: c.spend / Math.max(1, Math.floor(c.conversions * 0.7)),
      purchases: Math.floor(c.conversions * 0.3),
      cost_per_purchase: c.spend / Math.max(1, Math.floor(c.conversions * 0.3)),
      results: c.conversions,
      cost_per_result: c.spend / Math.max(1, c.conversions),
      cpm: (c.spend / c.impressions) * 1000, frequency: 1.5,
    }));
  }, [isSynced, campaigns]);

  const dailyData: DailyMetric[] = useMemo(() => {
    if (isSynced && insights?.daily?.length) return insights.daily;
    if (!isSynced) {
      const days = selectedPeriod === 'custom' ? 30 : { '7d': 7, '30d': 30, '90d': 90 }[selectedPeriod];
      return generateDailySpend(days).map(d => ({
        date: d.date, spend: d.value,
        impressions: Math.floor(d.value * 50), reach: Math.floor(d.value * 40),
        clicks: Math.floor(d.value * 2), leads: Math.floor(d.value * 0.3), purchases: Math.floor(d.value * 0.05),
        results: Math.floor(d.value * 0.3) + Math.floor(d.value * 0.05),
        conversions: Math.floor(d.value * 0.3) + Math.floor(d.value * 0.05),
      }));
    }
    return [];
  }, [isSynced, insights, selectedPeriod]);

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

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {periods.map((p) => (
            p.value !== 'custom' ? (
              <button
                key={p.value}
                onClick={() => handlePeriodSelect(p.value)}
                className={cn(
                  'rounded-lg px-4 py-2 text-xs font-medium transition-all duration-300',
                  selectedPeriod === p.value
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
                      'rounded-lg px-4 py-2 text-xs font-medium transition-all duration-300 flex items-center gap-1.5',
                      selectedPeriod === 'custom'
                        ? 'btn-accent'
                        : 'glass text-muted-foreground hover:text-foreground hover:bg-white/[0.08]'
                    )}
                  >
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {selectedPeriod === 'custom' && customDateRange.from && customDateRange.to
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
                          setSelectedPeriod('custom');
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

          {isAdmin && (
            <button
              onClick={handleSync}
              disabled={getAuthUrl.isPending}
              className="btn-accent rounded-lg px-4 py-2 text-xs font-semibold flex items-center gap-2 ml-2"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', getAuthUrl.isPending && 'animate-spin')} />
              Sync Facebook Ads
            </button>
          )}
        </div>
      </header>

      {/* Not synced state */}
      {!isSynced && isAdmin ? (
        <div className="p-6 flex items-center justify-center min-h-[60vh]">
          <GlassCard className="max-w-md text-center py-16 animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 mx-auto mb-6">
              <TrendingUp className="h-8 w-8 text-accent" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Sincronize com Meta Ads</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Conecte a conta de anúncios do Facebook para visualizar dados reais de campanhas.
            </p>
            <button
              onClick={handleSync}
              disabled={getAuthUrl.isPending}
              className="btn-accent rounded-xl px-6 py-3 text-sm font-semibold flex items-center gap-2 mx-auto"
            >
              <RefreshCw className={cn('h-4 w-4', getAuthUrl.isPending && 'animate-spin')} />
              Sync Facebook Ads
            </button>
          </GlassCard>
        </div>
      ) : !isSynced && !isAdmin ? (
        <div className="p-6 flex items-center justify-center min-h-[60vh]">
          <GlassCard className="max-w-md text-center py-16 animate-fade-in">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Aguardando sincronização</h2>
            <p className="text-sm text-muted-foreground">
              Seu dashboard será exibido assim que o administrador sincronizar sua conta com Meta Ads.
            </p>
          </GlassCard>
        </div>
      ) : (
        /* Dashboard content */
        <div className="p-6 space-y-6">
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

          {/* Ranking Charts */}
          {!isLoading && campaignList.length > 0 && (
            <RankingCharts campaigns={campaignList} />
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
              period={selectedPeriod}
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
