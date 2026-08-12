import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumber } from '@/data/mock';
import type { GoogleAdsSearchTerm } from '@/hooks/useGoogleAdsKeywords';

type SortKey = 'term' | 'impressions' | 'clicks' | 'spend' | 'conversions';
type SortDir = 'asc' | 'desc';

interface Column {
  key: SortKey;
  label: string;
  align: 'left' | 'right';
  hideOn?: 'md';
}

const COLUMNS: Column[] = [
  { key: 'term', label: 'Termo de busca', align: 'left' },
  { key: 'impressions', label: 'Impressões', align: 'right', hideOn: 'md' },
  { key: 'clicks', label: 'Cliques', align: 'right', hideOn: 'md' },
  { key: 'spend', label: 'Custo', align: 'right' },
  { key: 'conversions', label: 'Conversões', align: 'right' },
];

const STATUS_CONFIG: Record<GoogleAdsSearchTerm['status'], { label: string; className: string }> = {
  none: { label: 'Não gerenciado', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  added: { label: 'Já é palavra-chave', className: 'bg-white/5 text-white/50 border-white/10' },
  excluded: { label: 'Excluído (negativa)', className: 'bg-status-active/10 text-status-active border-status-active/20' },
};

function StatusPill({ status }: { status: GoogleAdsSearchTerm['status'] }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.none;
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium', config.className)}>
      {config.label}
    </span>
  );
}

interface SearchTermsTableProps {
  searchTerms: GoogleAdsSearchTerm[];
  isLoading: boolean;
  truncated?: boolean;
  total?: number;
}

export function SearchTermsTable({ searchTerms, isLoading, truncated, total }: SearchTermsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('spend');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sorted = useMemo(() => {
    return [...searchTerms].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [searchTerms, sortKey, sortDir]);

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

  if (searchTerms.length === 0) {
    return (
      <GlassCard className="animate-fade-in">
        <h3 className="text-base sm:text-lg font-semibold mb-2">Termos de busca</h3>
        <p className="text-sm text-muted-foreground">Sem dados no período selecionado.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="animate-fade-in">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <h3 className="text-base sm:text-lg font-semibold mr-auto">Termos de busca</h3>
        {truncated && (
          <span className="text-[10px] text-muted-foreground">
            Mostrando os {searchTerms.length} de maior custo (de {total} no total)
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        O que as pessoas realmente digitaram no Google antes de ver o anúncio — diferente das palavras-chave configuradas.
        Termos <span className="text-amber-400 font-medium">"Não gerenciado"</span> com custo alto são bons candidatos a palavra-chave negativa.
      </p>

      {/* Mobile: card list */}
      <div className="md:hidden space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
        {sorted.map((t) => (
          <div key={`${t.term}::${t.ad_group_name}`} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-sm font-medium whitespace-normal break-words flex-1">{t.term}</span>
            </div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <StatusPill status={t.status} />
              <span className="text-[10px] text-muted-foreground truncate">{t.ad_group_name}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-2 border-t border-white/5">
              <Stat label="Custo" value={formatCurrency(t.spend)} />
              <Stat label="Conversões" value={t.conversions.toString()} />
              <Stat label="Cliques" value={formatNumber(t.clicks)} />
              <Stat label="Impressões" value={formatNumber(t.impressions)} />
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
                      col.hideOn === 'md' && 'hidden md:table-cell'
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
              {sorted.map((t) => (
                <tr key={`${t.term}::${t.ad_group_name}`} className="border-b border-white/5 transition-colors duration-200 hover:bg-white/[0.03]">
                  <td className="py-3 px-3 font-medium">
                    <div className="flex flex-col gap-1">
                      <span className="whitespace-normal break-words min-w-[200px]">{t.term}</span>
                      <div className="flex items-center gap-1.5">
                        <StatusPill status={t.status} />
                        <span className="text-[10px] text-muted-foreground truncate">{t.ad_group_name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right text-muted-foreground hidden md:table-cell">{formatNumber(t.impressions)}</td>
                  <td className="py-3 px-3 text-right text-muted-foreground hidden md:table-cell">{formatNumber(t.clicks)}</td>
                  <td className="py-3 px-3 text-right font-semibold metric-number">{formatCurrency(t.spend)}</td>
                  <td className="py-3 px-3 text-right metric-number">{t.conversions || '—'}</td>
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
