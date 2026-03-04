import { LucideIcon } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string;
  change: number;
  icon: LucideIcon;
}

export function MetricCard({ label, value, change, icon: Icon }: MetricCardProps) {
  const isPositive = change >= 0;

  return (
    <GlassCard hover className="animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-white/60">{label}</p>
          <p className="text-3xl font-bold tracking-tight metric-number">{value}</p>
          <div
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
              isPositive
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            )}
          >
            {isPositive ? '+' : ''}{change}%
          </div>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl btn-accent shrink-0">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </GlassCard>
  );
}
