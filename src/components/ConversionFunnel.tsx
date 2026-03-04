import { GlassCard } from './GlassCard';
import { cn } from '@/lib/utils';
import { formatNumber, formatCurrency } from '@/data/mock';
import { ArrowDown } from 'lucide-react';

interface FunnelStage {
  label: string;
  value: number;
  costLabel?: string;
  costValue?: number;
}

interface ConversionFunnelProps {
  reach: number;
  impressions: number;
  clicks: number;
  leads: number;
  purchases: number;
  cpm: number;
  cpc: number;
  cpl: number;
  costPerPurchase: number;
}

function rateColor(rate: number, warningThreshold: number, criticalThreshold: number) {
  if (rate < criticalThreshold) return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (rate < warningThreshold) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
}

export function ConversionFunnel({ reach, impressions, clicks, leads, purchases, cpm, cpc, cpl, costPerPurchase }: ConversionFunnelProps) {
  const stages: FunnelStage[] = [
    { label: 'Impressões', value: impressions, costLabel: 'CPM', costValue: cpm },
    { label: 'Alcance', value: reach },
    { label: 'Cliques', value: clicks, costLabel: 'CPC', costValue: cpc },
    { label: 'Leads', value: leads, costLabel: 'CPL', costValue: cpl },
    { label: 'Compras', value: purchases, costLabel: 'Custo/Compra', costValue: costPerPurchase },
  ];

  const maxValue = Math.max(...stages.map(s => s.value), 1);

  const rates = [
    null,
    reach && impressions ? { rate: (reach / impressions) * 100, warn: 80, crit: 40 } : null,
    clicks && reach ? { rate: (clicks / reach) * 100, warn: 1, crit: 0.5 } : null,
    leads && clicks ? { rate: (leads / clicks) * 100, warn: 3, crit: 1 } : null,
    purchases && leads ? { rate: (purchases / leads) * 100, warn: 5, crit: 1 } : null,
  ];

  return (
    <GlassCard className="animate-fade-in">
      <h3 className="text-lg font-semibold mb-6">Funil de Conversão</h3>

      <div className="flex flex-col items-center gap-1">
        {stages.map((stage, i) => {
          const widthPercent = Math.max(20, (stage.value / maxValue) * 100);
          const rate = rates[i];

          return (
            <div key={stage.label} className="w-full flex flex-col items-center">
              {i > 0 && rate && (
                <div className="flex items-center gap-2 py-1.5">
                  <ArrowDown className="h-4 w-4 text-muted-foreground" />
                  <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', rateColor(rate.rate, rate.warn, rate.crit))}>
                    {rate.rate.toFixed(1)}%
                  </span>
                </div>
              )}

              <div
                className="relative glass rounded-xl py-3 px-4 text-center transition-all duration-300"
                style={{ width: `${widthPercent}%`, minWidth: '160px' }}
              >
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{stage.label}</p>
                <p className="text-xl font-bold metric-number">{formatNumber(stage.value)}</p>
                {stage.costLabel && stage.costValue !== undefined && stage.costValue > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {stage.costLabel}: <span className="metric-number">{formatCurrency(stage.costValue)}</span>
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {reach > 0 && (
        <div className="mt-6 glass rounded-xl p-4 text-center text-sm text-muted-foreground">
          Para cada <span className="text-foreground font-semibold">{formatNumber(reach)}</span> alcançadas →{' '}
          <span className="text-foreground font-semibold">{formatNumber(clicks)}</span> clicaram →{' '}
          <span className="text-foreground font-semibold">{leads}</span> viraram leads →{' '}
          <span className="text-foreground font-semibold">{purchases}</span> compraram
        </div>
      )}
    </GlassCard>
  );
}
