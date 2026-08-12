import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumber } from '@/data/mock';
import type { GoogleAdsKeyword } from '@/hooks/useGoogleAdsKeywords';

type SortKey = 'text' | 'impressions' | 'clicks' | 'ctr' | 'cpc' | 'spend' | 'conversions' | 'cost_per_conversion' | 'quality_score';
type SortDir = 'asc' | 'desc';

interface Column {
  key: SortKey;
  label: string;
  align: 'left' | 'right';
  hideOn?: 'md' | 'lg';
}

const COLUMNS: Column[] = [
  { key: 'text', label: 'Palavra-chave', align: 'left' },
  { key: 'impressions', label: 'Impressões', align: 'right', hideOn: 'md' },
  { key: 'clicks', label: 'Cliques', align: 'right', hideOn: 'md' },
  { key: 'ctr', label: 'CTR', align: 'right', hideOn: 'lg' },
  { key: 'cpc', label: 'CPC médio', align: 'right', hideOn: 'lg' },
  { key: 'spend', label: 'Custo', align: 'right' },
  { key: 'conversions', label: 'Conversões', align: 'right' },
  { key: 'cost_per_conversion', label: 'Custo/Conv', align: 'right', hideOn: 'lg' },
  { key: 'quality_score', label: 'Qualidade', align: 'right' },
];

function getHideClass(hideOn?: 'md' | 'lg') {
  if (!hideOn) return '';
  return hideOn === 'md' ? 'hidden md:table-cell' : 'hidden lg:table-cell';
}

function qualityScoreClass(score: number | null): string {
  if (score === null) return 'bg-white/5 text-white/40 border-white/10';
  if (score < 4) return 'bg-red-500/10 text-red-400 border-red-500/20';
  if (score < 8) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  return 'bg-status-active/10 text-status-active border-status-active/20';
}

function MatchTypeBadge({ matchType }: { matchType: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-muted-foreground font-medium">
      {matchType || '—'}
    </span>
  );
}

function QualityBadge({ score }: { score: number | null }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', qualityScoreClass(score))}>
      {score === null ? '—' : score}
    </span>
  );
}

interface KeywordsTableProps {
  keywords: GoogleAdsKeyword[];
  isLoading: boolean;
  truncated?: boolean;
  total?: number;
}

export function KeywordsTable({ keywords, isLoading, truncated, total }: KeywordsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('spend');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sorted = useMemo(() => {
    return [...keywords].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [keywords, sortKey, sortDir]);

  if (isLoading) {
    return (
      <GlassCard className="animate-fade-in">
        <Skeleton className="h-6 w-48 bg-white/5 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full bg-white/5" />
          ))}
        </div>
      </GlassCard>
    );
  }

  if (keywords.length === 0) {
    return (
      <GlassCard className="animate-fade-in">
        <h3 className="text-base sm:text-lg font-semibold mb-2">Palavras-chave</h3>
        <p className="text-sm text-muted-foreground">Sem dados no período selecionado.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="animate-fade-in">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <h3 className="text-base sm:text-lg font-semibold mr-auto">Palavras-chave</h3>
        {truncated && (
          <span className="text-[10px] text-muted-foreground">
            Mostrando as {keywords.length} de maior custo (de {total} no total)
          </span>
        )}
      </div>

      {/* Mobile: card list */}
      <div className="md:hidden space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
        {sorted.map((k) => (
          <div key={k.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-sm font-medium whitespace-normal break-words flex-1">{k.text}</span>
              <QualityBadge score={k.quality_score} />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <MatchTypeBadge matchType={k.match_type} />
              <span className="text-[10px] text-muted-foreground truncate">{k.ad_group_name}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-2 border-t border-white/5">
              <Stat label="Custo" value={formatCurrency(k.spend)} />
              <Stat label="Conversões" value={k.conversions.toString()} />
              <Stat label="Cliques" value={formatNumber(k.clicks)} />
              <Stat label="CTR" value={k.ctr.toFixed(2) + '%'} />
            </div>
          </div>
        ))}
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
              {sorted.map((k) => (
                <tr key={k.id} className="border-b border-white/5 transition-colors duration-200 hover:bg-white/[0.03]">
                  <td className="py-3 px-3 font-medium">
                    <div className="flex flex-col gap-1">
                      <span className="whitespace-normal break-words min-w-[180px]">{k.text}</span>
                      <div className="flex items-center gap-1.5">
                        <MatchTypeBadge matchType={k.match_type} />
                        <span className="text-[10px] text-muted-foreground truncate">{k.ad_group_name}</span>
                      </div>
                    </div>
                  </td>
                  <td className={cn('py-3 px-3 text-right text-muted-foreground', getHideClass('md'))}>{formatNumber(k.impressions)}</td>
                  <td className={cn('py-3 px-3 text-right text-muted-foreground', getHideClass('md'))}>{formatNumber(k.clicks)}</td>
                  <td className={cn('py-3 px-3 text-right text-muted-foreground', getHideClass('lg'))}>{k.ctr.toFixed(2)}%</td>
                  <td className={cn('py-3 px-3 text-right text-muted-foreground', getHideClass('lg'))}>{formatCurrency(k.cpc)}</td>
                  <td className="py-3 px-3 text-right font-semibold metric-number">{formatCurrency(k.spend)}</td>
                  <td className="py-3 px-3 text-right metric-number">{k.conversions || '—'}</td>
                  <td className={cn('py-3 px-3 text-right text-muted-foreground', getHideClass('lg'))}>
                    {k.conversions > 0 ? formatCurrency(k.cost_per_conversion) : '—'}
                  </td>
                  <td className="py-3 px-3 text-right"><QualityBadge score={k.quality_score} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </GlassCard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">{label}</div>
      <div className="text-sm font-semibold metric-number truncate">{value}</div>
    </div>
  );
}
