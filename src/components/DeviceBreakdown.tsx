import { GlassCard } from './GlassCard';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/data/mock';
import type { GoogleAdsDevice } from '@/hooks/useGoogleAdsInsights';

interface DeviceBreakdownProps {
  devices: GoogleAdsDevice[];
  isLoading: boolean;
}

export function DeviceBreakdown({ devices, isLoading }: DeviceBreakdownProps) {
  if (isLoading) {
    return (
      <GlassCard className="animate-fade-in">
        <Skeleton className="h-6 w-48 bg-white/5 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full bg-white/5" />
          ))}
        </div>
      </GlassCard>
    );
  }

  if (devices.length === 0) {
    return (
      <GlassCard className="animate-fade-in">
        <h3 className="text-base sm:text-lg font-semibold mb-2">Dispositivos</h3>
        <p className="text-sm text-muted-foreground">Sem dados no período selecionado.</p>
      </GlassCard>
    );
  }

  const maxSpend = Math.max(...devices.map((d) => d.spend), 1);

  return (
    <GlassCard className="animate-fade-in">
      <h3 className="text-base sm:text-lg font-semibold mb-4">Dispositivos</h3>
      <div className="space-y-3">
        {devices.map((d) => (
          <div key={d.device}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium">{d.device}</span>
              <span className="metric-number font-semibold">{formatCurrency(d.spend)}</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-1">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${(d.spend / maxSpend) * 100}%` }}
              />
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>{formatNumber(d.clicks)} cliques</span>
              <span>{formatNumber(d.impressions)} impressões</span>
              <span>{d.conversions.toFixed(1)} conversões</span>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
