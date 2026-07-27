import { GlassCard } from './GlassCard';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/data/mock';
import type { GoogleAdsConversionAction } from '@/hooks/useGoogleAdsInsights';

interface ConversionBreakdownTableProps {
  actions: GoogleAdsConversionAction[];
  isLoading: boolean;
}

export function ConversionBreakdownTable({ actions, isLoading }: ConversionBreakdownTableProps) {
  if (isLoading) {
    return (
      <GlassCard className="animate-fade-in">
        <Skeleton className="h-6 w-56 bg-white/5 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full bg-white/5" />
          ))}
        </div>
      </GlassCard>
    );
  }

  if (actions.length === 0) return null;

  return (
    <GlassCard className="animate-fade-in">
      <h3 className="text-base sm:text-lg font-semibold mb-4">Conversões por tipo</h3>
      <div className="space-y-1">
        {actions.map((a) => (
          <div key={a.action_name} className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
            <span className="text-sm text-foreground truncate">{a.action_name}</span>
            <div className="flex items-center gap-4 shrink-0">
              <span className="text-sm font-semibold metric-number">{a.conversions.toFixed(1)}</span>
              {a.conversions_value > 0 && (
                <span className="text-xs text-muted-foreground metric-number">{formatCurrency(a.conversions_value)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
