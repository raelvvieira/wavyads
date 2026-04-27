import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { StatusBadge } from './StatusBadge';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumber } from '@/data/mock';
import type { MetaCampaign } from '@/hooks/useMetaInsights';

type SortKey = keyof MetaCampaign;
type SortDir = 'asc' | 'desc';

const ACTION_TYPE_LABELS: Record<string, string> = {
  'onsite_conversion.messaging_conversation_started_7d': 'Conversas por mensagem iniciadas',
  'purchase': 'Compras no site',
  'lead': 'Leads',
  'link_click': 'Cliques no link',
  'video_view': 'Visualizações de vídeo',
  'offsite_conversion.fb_pixel_purchase': 'Compras (pixel)',
  'offsite_conversion.fb_pixel_lead': 'Leads (pixel)',
  'onsite_conversion.lead_grouped': 'Leads (agrupados)',
  'omni_purchase': 'Compras (omni)',
  'landing_page_view': 'Visualizações da página de destino',
  'post_engagement': 'Envolvimento com a publicação',
  'page_engagement': 'Envolvimento com a página',
  'omni_app_install': 'Instalações do app',
  'app_install': 'Instalações do app',
};

function getActionLabel(resultType: string): string {
  return ACTION_TYPE_LABELS[resultType] || resultType || '';
}

interface Column {
  key: SortKey;
  label: string;
  format: (v: any) => string;
  align: 'left' | 'right';
  hideOn?: string;
  custom?: boolean;
}

const COLUMNS: Column[] = [
  { key: 'name',              label: 'Campanha',          format: (v) => v,                         align: 'left' },
  { key: 'status',            label: 'Status',            format: () => '',                         align: 'left' },
  { key: 'reach',             label: 'Alcance',           format: formatNumber,                     align: 'right', hideOn: 'md' },
  { key: 'impressions',       label: 'Impressões',        format: formatNumber,                     align: 'right', hideOn: 'md' },
  { key: 'clicks',            label: 'Cliques',           format: formatNumber,                     align: 'right', hideOn: 'md' },
  { key: 'ctr',               label: 'CTR',               format: (v) => v.toFixed(2) + '%',        align: 'right', hideOn: 'lg' },
  { key: 'cpm',               label: 'CPM',               format: formatCurrency,                   align: 'right', hideOn: 'lg' },
  { key: 'results',           label: 'Resultados',        format: (v) => v.toString(),              align: 'right', custom: true },
  { key: 'cost_per_result',   label: 'Custo por resultado', format: formatCurrency,                 align: 'right', custom: true },
  { key: 'purchases',         label: 'Compras',           format: (v) => v.toString(),              align: 'right', hideOn: 'lg' },
  { key: 'cost_per_purchase', label: 'Custo/Compra',      format: formatCurrency,                   align: 'right', hideOn: 'lg' },
  { key: 'purchase_value',    label: 'Valor Compras',     format: formatCurrency,                   align: 'right', hideOn: 'lg' },
  { key: 'purchase_roas',     label: 'ROAS',              format: (v) => v.toFixed(2) + 'x',        align: 'right' },
];

const MOBILE_SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'spend', label: 'Gasto' },
  { key: 'results', label: 'Resultados' },
  { key: 'cost_per_result', label: 'Custo/Resultado' },
  { key: 'purchase_roas', label: 'ROAS' },
  { key: 'purchase_value', label: 'Valor Compras' },
  { key: 'purchases', label: 'Compras' },
  { key: 'cost_per_purchase', label: 'Custo/Compra' },
  { key: 'clicks', label: 'Cliques' },
  { key: 'impressions', label: 'Impressões' },
];

function getHideClass(hideOn?: string) {
  if (!hideOn) return '';
  return hideOn === 'md' ? 'hidden md:table-cell' : 'hidden lg:table-cell';
}

interface CampaignsTableProps {
  campaigns: MetaCampaign[];
}

type StatusFilter = 'all' | 'active' | 'paused' | 'ended';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Ativas' },
  { value: 'paused', label: 'Pausadas' },
  { value: 'ended', label: 'Encerradas' },
];

export function CampaignsTable({ campaigns }: CampaignsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('spend');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return campaigns;
    return campaigns.filter(c => c.status === statusFilter);
  }, [campaigns, statusFilter]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = (a[sortKey] as any) ?? 0;
      const bv = (b[sortKey] as any) ?? 0;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  // Tags
  const bestCplId = useMemo(() => {
    const withLeads = filtered.filter(c => c.leads > 0 && c.cpl > 0);
    if (!withLeads.length) return null;
    return withLeads.reduce((best, c) => c.cpl < best.cpl ? c : best).id;
  }, [filtered]);

  const worstCplId = useMemo(() => {
    const withLeads = filtered.filter(c => c.leads > 0 && c.cpl > 0);
    if (!withLeads.length) return null;
    return withLeads.reduce((worst, c) => c.cpl > worst.cpl ? c : worst).id;
  }, [filtered]);

  const mostLeadsId = useMemo(() => {
    const withLeads = filtered.filter(c => c.leads > 0);
    if (!withLeads.length) return null;
    return withLeads.reduce((best, c) => c.leads > best.leads ? c : best).id;
  }, [filtered]);

  // Totals
  const totals = useMemo(() => {
    const spendTotal = filtered.reduce((s, c) => s + c.spend, 0);
    const purchaseValueTotal = filtered.reduce((s, c) => s + (c.purchase_value || 0), 0);
    return {
      reach: filtered.reduce((s, c) => s + (c.reach || 0), 0),
      impressions: filtered.reduce((s, c) => s + c.impressions, 0),
      clicks: filtered.reduce((s, c) => s + c.clicks, 0),
      results: filtered.reduce((s, c) => s + (c.results || 0), 0),
      purchases: filtered.reduce((s, c) => s + (c.purchases || 0), 0),
      spend: spendTotal,
      ctr: filtered.length ? filtered.reduce((s, c) => s + c.ctr, 0) / filtered.length : 0,
      cpm: filtered.length ? filtered.reduce((s, c) => s + (c.cpm || 0), 0) / filtered.length : 0,
      cost_per_result: (() => {
        const totalResults = filtered.reduce((s, c) => s + (c.results || 0), 0);
        return totalResults > 0 ? spendTotal / totalResults : 0;
      })(),
      cost_per_purchase: (() => {
        const wp = filtered.filter(c => (c.cost_per_purchase || 0) > 0);
        return wp.length ? wp.reduce((s, c) => s + c.cost_per_purchase, 0) / wp.length : 0;
      })(),
      purchase_value: purchaseValueTotal,
      purchase_roas: spendTotal > 0 ? purchaseValueTotal / spendTotal : 0,
    };
  }, [filtered]);

  const getTags = (c: MetaCampaign) => {
    const tags: { label: string; className: string }[] = [];
    if (c.id === bestCplId) tags.push({ label: 'Melhor CPL', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' });
    if (c.id === worstCplId) tags.push({ label: 'Pior CPL', className: 'bg-red-500/20 text-red-400 border-red-500/30' });
    if (c.id === mostLeadsId) tags.push({ label: 'Mais Leads', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' });
    if ((c.purchases || 0) > 0) tags.push({ label: 'Venda', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' });
    return tags;
  };

  const getCplClass = (cpr: number) => {
    const avgCpr = totals.cost_per_result;
    if (!cpr || !avgCpr) return '';
    if (cpr < avgCpr * 0.8) return 'bg-emerald-500/10';
    if (cpr > avgCpr * 1.2) return 'bg-red-500/10';
    return '';
  };

  const getRoasClass = (roas: number) => {
    if (!roas) return 'text-muted-foreground';
    if (roas >= 2) return 'text-emerald-400';
    if (roas >= 1) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <GlassCard className="animate-fade-in">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <h3 className="text-base sm:text-lg font-semibold mr-auto">Desempenho por Campanha</h3>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              'px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium transition-all duration-200 border',
              statusFilter === f.value
                ? 'border-white/20 bg-white/10 text-foreground shadow-sm'
                : 'border-transparent bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Mobile: card list with sort selector */}
      <div className="md:hidden">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Ordenar:</span>
          <select
            value={sortKey as string}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="flex-1 bg-white/[0.04] border border-white/10 rounded-md text-xs py-1.5 px-2 text-foreground"
          >
            {MOBILE_SORT_OPTIONS.map(opt => (
              <option key={opt.key as string} value={opt.key as string}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
            className="px-2 py-1.5 rounded-md bg-white/[0.04] border border-white/10 text-xs text-foreground"
            aria-label="Inverter direção"
          >
            {sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
          </button>
        </div>
        <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
          {sorted.map((c) => {
            const tags = getTags(c);
            const actionLabel = getActionLabel(c.result_type || '');
            return (
              <div
                key={c.id}
                className="rounded-lg border border-white/5 bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-sm font-medium whitespace-normal break-words flex-1">{c.name}</span>
                  <StatusBadge status={c.status} />
                </div>
                {tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap mb-2">
                    {tags.map(t => (
                      <span key={t.label} className={cn('text-[9px] px-1.5 py-0.5 rounded-full border font-medium', t.className)}>
                        {t.label}
                      </span>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-2 border-t border-white/5">
                  <Stat label="Gasto" value={formatCurrency(c.spend)} />
                  <Stat label="Resultados" value={(c.results || 0).toString()} sub={actionLabel} />
                  <Stat label="Custo/Result." value={formatCurrency(c.cost_per_result || 0)} />
                  <Stat
                    label="ROAS"
                    value={c.purchase_roas ? c.purchase_roas.toFixed(2) + 'x' : '—'}
                    valueClass={getRoasClass(c.purchase_roas || 0)}
                  />
                  <Stat label="Valor Compras" value={formatCurrency(c.purchase_value || 0)} />
                  <Stat label="Compras" value={(c.purchases || 0).toString()} />
                </div>
              </div>
            );
          })}
        </div>
        {/* Mobile totals */}
        <div className="mt-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
          <div className="text-[10px] uppercase tracking-widest text-accent font-semibold mb-2">Total / Média</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            <Stat label="Gasto" value={formatCurrency(totals.spend)} valueClass="text-accent" />
            <Stat label="Resultados" value={totals.results.toString()} valueClass="text-accent" />
            <Stat label="Custo/Result." value={formatCurrency(totals.cost_per_result)} valueClass="text-accent" />
            <Stat label="ROAS" value={totals.purchase_roas.toFixed(2) + 'x'} valueClass="text-accent" />
            <Stat label="Valor Compras" value={formatCurrency(totals.purchase_value)} valueClass="text-accent" />
            <Stat label="Compras" value={totals.purchases.toString()} valueClass="text-accent" />
          </div>
        </div>
      </div>

      {/* Desktop: full table */}
      <div className="hidden md:block overflow-x-auto">
        <div className="max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-[hsl(var(--card))] backdrop-blur-sm">
              <tr className="border-b border-white/10">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className={cn(
                      'py-3 px-3 text-[10px] uppercase tracking-widest text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors select-none',
                      col.align === 'right' ? 'text-right' : 'text-left',
                      getHideClass(col.hideOn)
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sortKey === col.key ? (
                        sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-30" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => {
                const tags = getTags(c);
                const actionLabel = getActionLabel(c.result_type || '');
                return (
                  <tr key={c.id} className="border-b border-white/5 transition-colors duration-200 hover:bg-white/[0.03]">
                    <td className="py-3 px-3 font-medium">
                      <div className="flex flex-col gap-1">
                        <span className="whitespace-normal break-words min-w-[200px]">{c.name}</span>
                        {tags.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {tags.map(t => (
                              <span key={t.label} className={cn('text-[9px] px-1.5 py-0.5 rounded-full border font-medium', t.className)}>
                                {t.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3"><StatusBadge status={c.status} /></td>
                    <td className={cn('py-3 px-3 text-right text-muted-foreground', getHideClass('md'))}>{formatNumber(c.reach || 0)}</td>
                    <td className={cn('py-3 px-3 text-right text-muted-foreground', getHideClass('md'))}>{formatNumber(c.impressions)}</td>
                    <td className={cn('py-3 px-3 text-right text-muted-foreground', getHideClass('md'))}>{formatNumber(c.clicks)}</td>
                    <td className={cn('py-3 px-3 text-right text-muted-foreground', getHideClass('lg'))}>{c.ctr.toFixed(2)}%</td>
                    <td className={cn('py-3 px-3 text-right text-muted-foreground', getHideClass('lg'))}>{formatCurrency(c.cpm || 0)}</td>
                    {/* Resultados */}
                    <td className="py-3 px-3 text-right">
                      {c.results ? (
                        <div className="flex flex-col">
                          <span className="font-semibold metric-number">{c.results}</span>
                          {actionLabel && <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">{actionLabel}</span>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    {/* Custo por resultado */}
                    <td className={cn('py-3 px-3 text-right', getCplClass(c.cost_per_result || 0))}>
                      {c.cost_per_result ? (
                        <div className="flex flex-col">
                          <span className="font-semibold metric-number">{formatCurrency(c.cost_per_result)}</span>
                          {actionLabel && <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">Por {actionLabel.toLowerCase()}</span>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className={cn('py-3 px-3 text-right metric-number', getHideClass('lg'))}>{c.purchases || 0}</td>
                    <td className={cn('py-3 px-3 text-right text-muted-foreground', getHideClass('lg'))}>{formatCurrency(c.cost_per_purchase || 0)}</td>
                    <td className={cn('py-3 px-3 text-right text-muted-foreground', getHideClass('lg'))}>{formatCurrency(c.purchase_value || 0)}</td>
                    <td className={cn('py-3 px-3 text-right font-semibold metric-number', getRoasClass(c.purchase_roas || 0))}>
                      {c.purchase_roas ? c.purchase_roas.toFixed(2) + 'x' : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="sticky bottom-0 z-10 bg-[hsl(var(--card))] backdrop-blur-sm">
              <tr className="border-t border-accent/30 bg-accent/5">
                <td className="py-3 px-3 font-semibold text-accent">Total / Média</td>
                <td className="py-3 px-3" />
                <td className={cn('py-3 px-3 text-right font-semibold text-accent metric-number', getHideClass('md'))}>{formatNumber(totals.reach)}</td>
                <td className={cn('py-3 px-3 text-right font-semibold text-accent metric-number', getHideClass('md'))}>{formatNumber(totals.impressions)}</td>
                <td className={cn('py-3 px-3 text-right font-semibold text-accent metric-number', getHideClass('md'))}>{formatNumber(totals.clicks)}</td>
                <td className={cn('py-3 px-3 text-right font-semibold text-accent metric-number', getHideClass('lg'))}>{totals.ctr.toFixed(2)}%</td>
                <td className={cn('py-3 px-3 text-right font-semibold text-accent metric-number', getHideClass('lg'))}>{formatCurrency(totals.cpm)}</td>
                <td className="py-3 px-3 text-right font-semibold text-accent metric-number">{totals.results}</td>
                <td className="py-3 px-3 text-right font-semibold text-accent metric-number">{formatCurrency(totals.cost_per_result)}</td>
                <td className={cn('py-3 px-3 text-right font-semibold text-accent metric-number', getHideClass('lg'))}>{totals.purchases}</td>
                <td className={cn('py-3 px-3 text-right font-semibold text-accent metric-number', getHideClass('lg'))}>{formatCurrency(totals.cost_per_purchase)}</td>
                <td className={cn('py-3 px-3 text-right font-semibold text-accent metric-number', getHideClass('lg'))}>{formatCurrency(totals.purchase_value)}</td>
                <td className="py-3 px-3 text-right font-semibold text-accent metric-number">{totals.purchase_roas.toFixed(2)}x</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </GlassCard>
  );
}

function Stat({ label, value, sub, valueClass }: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">{label}</div>
      <div className={cn('text-sm font-semibold metric-number truncate', valueClass)}>{value}</div>
      {sub && <div className="text-[9px] text-muted-foreground leading-tight truncate">{sub}</div>}
    </div>
  );
}
