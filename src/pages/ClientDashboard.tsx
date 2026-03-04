import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { DollarSign, Eye, MousePointer, Target, TrendingUp, RefreshCw, ArrowLeft } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, Cell,
} from 'recharts';
import { GlassCard } from '@/components/GlassCard';
import { MetricCard } from '@/components/MetricCard';
import { StatusBadge } from '@/components/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { useClient } from '@/hooks/useClients';
import { useRole } from '@/hooks/useRole';
import { useGetMetaAuthUrl, useSelectMetaAccount } from '@/hooks/useMetaOAuth';
import { useMetaCampaigns, useMetaInsights } from '@/hooks/useMetaInsights';
import { generateDailySpend, formatCurrency, formatNumber, mockCampaigns } from '@/data/mock';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClients } from '@/hooks/useClients';

type Period = '7d' | '30d' | '90d';

const periodToPreset: Record<Period, string> = {
  '7d': 'last_7d',
  '30d': 'last_30d',
  '90d': 'last_90d',
};

const periods: { label: string; value: Period }[] = [
  { label: '7 dias', value: '7d' },
  { label: '30 dias', value: '30d' },
  { label: '90 dias', value: '90d' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg px-3 py-2 text-xs">
      <p className="text-white/60">{label}</p>
      <p className="font-semibold">{formatCurrency(payload[0].value)}</p>
    </div>
  );
};

export default function ClientDashboard() {
  const { clientId: paramClientId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const { user } = useAuth();

  // For client users, find their own client record
  const { data: allClients } = useClients();
  const clientUserRecord = !isAdmin && allClients?.length ? allClients[0] : null;
  const clientId = paramClientId || clientUserRecord?.id;

  const { data: client, isLoading: clientLoading } = useClient(clientId);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('30d');

  const isSynced = client?.is_synced ?? false;
  const { data: campaigns, isLoading: campaignsLoading } = useMetaCampaigns(clientId, isSynced, periodToPreset[selectedPeriod]);
  const { data: insights, isLoading: insightsLoading } = useMetaInsights(clientId, isSynced, periodToPreset[selectedPeriod]);

  const getAuthUrl = useGetMetaAuthUrl();
  const selectAccount = useSelectMetaAccount();
  const [pendingAccounts, setPendingAccounts] = useState<any[] | null>(null);

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

  // Data
  const periodDays = { '7d': 7, '30d': 30, '90d': 90 };
  const dailySpend = useMemo(() => {
    if (isSynced && insights?.daily_spend?.length) return insights.daily_spend;
    return isSynced ? [] : generateDailySpend(periodDays[selectedPeriod]);
  }, [isSynced, insights, selectedPeriod]);

  const campaignList = useMemo(() => {
    if (isSynced && campaigns) return campaigns;
    return isSynced ? [] : mockCampaigns.slice(0, 5);
  }, [isSynced, campaigns]);

  const totalSpend = isSynced && insights ? insights.spend : campaignList.reduce((s, c) => s + c.spend, 0);
  const totalImpressions = isSynced && insights ? insights.impressions : campaignList.reduce((s, c) => s + c.impressions, 0);
  const totalClicks = isSynced && insights ? insights.clicks : campaignList.reduce((s, c) => s + c.clicks, 0);
  const totalConversions = isSynced && insights ? insights.conversions : campaignList.reduce((s, c) => s + c.conversions, 0);

  const topCampaigns = [...campaignList]
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5)
    .map((c) => ({ name: c.name.length > 22 ? c.name.slice(0, 22) + '…' : c.name, spend: c.spend }));

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
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-4 border-b border-white/10 bg-black/60 backdrop-blur-xl px-6 py-4">
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

        <div className="flex items-center gap-2 ml-auto">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setSelectedPeriod(p.value)}
              className={cn(
                'rounded-lg px-4 py-2 text-xs font-medium transition-all duration-300',
                selectedPeriod === p.value
                  ? 'btn-accent'
                  : 'glass text-white/60 hover:text-white hover:bg-white/[0.08]'
              )}
            >
              {p.label}
            </button>
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
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <GlassCard key={i}><Skeleton className="h-24 bg-white/5" /></GlassCard>
              ))
            ) : (
              <>
                <MetricCard label="Total Gasto" value={formatCurrency(totalSpend)} change={0} icon={DollarSign} />
                <MetricCard label="Impressões" value={formatNumber(totalImpressions)} change={0} icon={Eye} />
                <MetricCard label="Cliques" value={formatNumber(totalClicks)} change={0} icon={MousePointer} />
                <MetricCard label="Conversões" value={totalConversions.toString()} change={0} icon={Target} />
              </>
            )}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <GlassCard className="lg:col-span-3 animate-fade-in">
              <h3 className="text-lg font-semibold mb-4">Gastos por dia</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailySpend}>
                  <defs>
                    <linearGradient id="accentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#accentGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>

            <GlassCard className="lg:col-span-2 animate-fade-in">
              <h3 className="text-lg font-semibold mb-4">Top 5 Campanhas</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topCampaigns} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="spend" radius={[0, 6, 6, 0]} barSize={24}>
                    {topCampaigns.map((_, i) => (
                      <Cell key={i} fill="url(#barGradAccent)" />
                    ))}
                  </Bar>
                  <defs>
                    <linearGradient id="barGradAccent" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--accent))" />
                      <stop offset="100%" stopColor="hsl(160, 80%, 55%)" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          </div>

          {/* Campaigns Table */}
          <GlassCard className="animate-fade-in">
            <h3 className="text-lg font-semibold mb-4">Todas as Campanhas</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-white/60 font-medium">Campanha</th>
                    <th className="text-left py-3 px-4 text-white/60 font-medium">Status</th>
                    <th className="text-right py-3 px-4 text-white/60 font-medium">Gasto</th>
                    <th className="text-right py-3 px-4 text-white/60 font-medium hidden md:table-cell">Impressões</th>
                    <th className="text-right py-3 px-4 text-white/60 font-medium hidden md:table-cell">Cliques</th>
                    <th className="text-right py-3 px-4 text-white/60 font-medium hidden lg:table-cell">CTR</th>
                    <th className="text-right py-3 px-4 text-white/60 font-medium hidden lg:table-cell">CPC</th>
                    <th className="text-right py-3 px-4 text-white/60 font-medium">Conv.</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignList.map((c) => (
                    <tr key={c.id} className="border-b border-white/5 transition-colors duration-200 hover:bg-white/[0.03]">
                      <td className="py-3 px-4 font-medium">{c.name}</td>
                      <td className="py-3 px-4"><StatusBadge status={c.status} /></td>
                      <td className="py-3 px-4 text-right metric-number">{formatCurrency(c.spend)}</td>
                      <td className="py-3 px-4 text-right text-white/60 hidden md:table-cell">{formatNumber(c.impressions)}</td>
                      <td className="py-3 px-4 text-right text-white/60 hidden md:table-cell">{formatNumber(c.clicks)}</td>
                      <td className="py-3 px-4 text-right text-white/60 hidden lg:table-cell">{typeof c.ctr === 'number' ? c.ctr.toFixed(2) : c.ctr}%</td>
                      <td className="py-3 px-4 text-right text-white/60 hidden lg:table-cell">{formatCurrency(c.cpc)}</td>
                      <td className="py-3 px-4 text-right metric-number">{c.conversions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
