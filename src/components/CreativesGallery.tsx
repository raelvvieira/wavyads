import { useState, useMemo } from 'react';
import { ImageOff, ArrowUpDown } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { StatusBadge } from './StatusBadge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/data/mock';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MetaAd } from '@/hooks/useMetaAds';

type StatusFilter = 'all' | 'active' | 'paused';
type SortKey = 'spend' | 'ctr' | 'cost_per_result' | 'results';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'paused', label: 'Pausados' },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'spend', label: 'Maior Gasto' },
  { value: 'ctr', label: 'Melhor CTR' },
  { value: 'cost_per_result', label: 'Menor Custo/Res' },
  { value: 'results', label: 'Mais Resultados' },
];

const ACTION_TYPE_LABELS: Record<string, string> = {
  'onsite_conversion.messaging_conversation_started_7d': 'Conversas',
  'purchase': 'Compras',
  'lead': 'Leads',
  'link_click': 'Cliques',
  'video_view': 'Visualizações',
  'offsite_conversion.fb_pixel_purchase': 'Compras',
  'offsite_conversion.fb_pixel_lead': 'Leads',
  'onsite_conversion.lead_grouped': 'Leads',
  'omni_purchase': 'Compras',
  'landing_page_view': 'Página destino',
  'post_engagement': 'Envolvimento',
  'page_engagement': 'Envolvimento',
};

interface CreativesGalleryProps {
  ads: MetaAd[];
}

export function CreativesGallery({ ads }: CreativesGalleryProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('spend');

  const filtered = useMemo(() => {
    let list = statusFilter === 'all' ? ads : ads.filter(a => a.status === statusFilter);

    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case 'spend': return b.spend - a.spend;
        case 'ctr': return b.ctr - a.ctr;
        case 'cost_per_result':
          return (a.cost_per_result || Infinity) - (b.cost_per_result || Infinity);
        case 'results': return b.results - a.results;
        default: return 0;
      }
    });

    return list.slice(0, 5);
  }, [ads, statusFilter, sortKey]);

  return (
    <GlassCard className="animate-fade-in">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h3 className="text-lg font-semibold mr-auto">Top Criativos</h3>

        <div className="flex items-center gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200 border',
                statusFilter === f.value
                  ? 'border-white/20 bg-white/10 text-foreground shadow-sm'
                  : 'border-transparent bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="w-[150px] h-7 text-[11px] bg-white/[0.03] border-white/10">
            <ArrowUpDown className="h-3 w-3 mr-1 opacity-50" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        {filtered.map((ad) => {
          const imgSrc = ad.image_url || ad.thumbnail_url;
          const actionLabel = ACTION_TYPE_LABELS[ad.result_type] || ad.result_type || 'Resultados';

          return (
            <div
              key={ad.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-200"
            >
              {/* Thumbnail */}
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/[0.03] flex-shrink-0">
                {imgSrc ? (
                  <img src={imgSrc} alt={ad.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageOff className="h-5 w-5 text-muted-foreground/30" />
                  </div>
                )}
              </div>

              {/* Name + Campaign */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight truncate">{ad.name}</p>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{ad.campaign_name}</p>
              </div>

              {/* Metrics */}
              <div className="hidden sm:flex items-center gap-4 text-xs flex-shrink-0">
                <div className="text-center">
                  <span className="text-[10px] text-muted-foreground block">Gasto</span>
                  <span className="font-semibold metric-number">{formatCurrency(ad.spend)}</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-muted-foreground block">{actionLabel}</span>
                  <span className="font-semibold metric-number">{ad.results || '—'}</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-muted-foreground block">Custo/Res</span>
                  <span className="font-semibold metric-number">
                    {ad.cost_per_result ? formatCurrency(ad.cost_per_result) : '—'}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-muted-foreground block">CTR</span>
                  <span className="font-semibold metric-number">{ad.ctr.toFixed(2)}%</span>
                </div>
              </div>

              {/* Status */}
              <div className="flex-shrink-0">
                <StatusBadge status={ad.status === 'active' ? 'active' : 'paused'} />
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhum criativo encontrado.</p>
      )}
    </GlassCard>
  );
}
