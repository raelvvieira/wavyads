import { useState, useMemo } from 'react';
import { ImageOff } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { StatusBadge } from './StatusBadge';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumber } from '@/data/mock';
import type { MetaAd } from '@/hooks/useMetaAds';

type StatusFilter = 'all' | 'active' | 'paused';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'paused', label: 'Pausados' },
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
  'landing_page_view': 'Página de destino',
  'post_engagement': 'Envolvimento',
  'page_engagement': 'Envolvimento',
};

interface CreativesGalleryProps {
  ads: MetaAd[];
}

export function CreativesGallery({ ads }: CreativesGalleryProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filtered = useMemo(() => {
    const list = statusFilter === 'all' ? ads : ads.filter(a => a.status === statusFilter);
    return [...list].sort((a, b) => b.spend - a.spend);
  }, [ads, statusFilter]);

  return (
    <GlassCard className="animate-fade-in">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold mr-auto">Desempenho por Criativo</h3>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border',
              statusFilter === f.value
                ? 'border-white/20 bg-white/10 text-foreground shadow-sm'
                : 'border-transparent bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((ad) => {
          const imgSrc = ad.image_url || ad.thumbnail_url;
          const actionLabel = ACTION_TYPE_LABELS[ad.result_type] || ad.result_type || '';

          return (
            <div
              key={ad.id}
              className="glass rounded-xl overflow-hidden border border-white/5 hover:border-white/10 transition-all duration-200 group"
            >
              {/* Thumbnail */}
              <div className="aspect-square bg-white/[0.02] relative overflow-hidden">
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt={ad.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageOff className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <StatusBadge status={ad.status === 'active' ? 'active' : 'paused'} />
                </div>
              </div>

              {/* Info */}
              <div className="p-3 space-y-2">
                <div>
                  <p className="text-sm font-medium leading-tight line-clamp-2">{ad.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{ad.campaign_name}</p>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  <div>
                    <span className="text-muted-foreground text-[10px]">Gasto</span>
                    <p className="font-semibold metric-number">{formatCurrency(ad.spend)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px]">
                      {actionLabel ? actionLabel : 'Resultados'}
                    </span>
                    <p className="font-semibold metric-number">{ad.results || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px]">Custo/Resultado</span>
                    <p className="font-semibold metric-number">
                      {ad.cost_per_result ? formatCurrency(ad.cost_per_result) : '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px]">CTR</span>
                    <p className="font-semibold metric-number">{ad.ctr.toFixed(2)}%</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum criativo encontrado.</p>
      )}
    </GlassCard>
  );
}
