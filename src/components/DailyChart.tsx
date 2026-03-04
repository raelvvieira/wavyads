import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { GlassCard } from './GlassCard';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumber } from '@/data/mock';
import type { DailyMetric } from '@/hooks/useMetaInsights';

interface LineConfig {
  key: keyof DailyMetric;
  label: string;
  color: string;
  yAxisId: 'currency' | 'count' | 'cost';
  format: (v: number) => string;
}

const LINES: LineConfig[] = [
  { key: 'spend',              label: 'Gasto',             color: '#22c55e', yAxisId: 'currency', format: formatCurrency },
  { key: 'clicks',             label: 'Cliques',           color: '#06b6d4', yAxisId: 'count',    format: formatNumber },
  { key: 'impressions',        label: 'Impressões',        color: '#3b82f6', yAxisId: 'count',    format: formatNumber },
  { key: 'leads',              label: 'Leads',             color: '#f59e0b', yAxisId: 'count',    format: (v) => v.toString() },
  { key: 'purchases',          label: 'Compras',           color: '#ec4899', yAxisId: 'count',    format: (v) => v.toString() },
  { key: 'results',            label: 'Resultados',        color: '#14b8a6', yAxisId: 'count',    format: (v) => v.toString() },
  { key: 'cost_per_result',    label: 'Custo/Resultado',   color: '#a855f7', yAxisId: 'cost', format: formatCurrency },
  { key: 'cost_per_purchase',  label: 'Custo/Compra',      color: '#f43f5e', yAxisId: 'cost', format: formatCurrency },
];

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg px-4 py-3 text-xs space-y-1.5 min-w-[160px]">
      <p className="text-foreground font-semibold border-b border-white/10 pb-1.5">{label}</p>
      {payload.map((p: any) => {
        const cfg = LINES.find(l => l.key === p.dataKey);
        return (
          <div key={p.dataKey} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-muted-foreground">{cfg?.label}</span>
            </div>
            <span className="font-semibold metric-number text-foreground">{cfg?.format(p.value) ?? p.value}</span>
          </div>
        );
      })}
    </div>
  );
};

interface DailyChartProps {
  data: DailyMetric[];
}

export function DailyChart({ data }: DailyChartProps) {
  const [activeLines, setActiveLines] = useState<Set<string>>(new Set(['spend']));

  const toggle = (key: string) => {
    setActiveLines(prev => {
      const next = new Set(prev);
      if (key === 'spend') return next;
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const hasCountAxis = LINES.some(l => l.yAxisId === 'count' && activeLines.has(l.key));
  const hasCostAxis = LINES.some(l => l.yAxisId === 'cost' && activeLines.has(l.key));

  return (
    <GlassCard className="animate-fade-in">
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <h3 className="text-lg font-semibold mr-auto">Métricas por Dia</h3>
        {LINES.map((l) => (
          <button
            key={l.key}
            onClick={() => toggle(l.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border',
              activeLines.has(l.key)
                ? 'border-white/20 bg-white/10 text-foreground shadow-sm'
                : 'border-transparent bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]',
              l.key === 'spend' && 'cursor-default'
            )}
          >
            <div
              className="h-2 w-2 rounded-full transition-opacity duration-200"
              style={{ backgroundColor: l.color, opacity: activeLines.has(l.key) ? 1 : 0.25 }}
            />
            {l.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <AreaChart data={data}>
          <defs>
            {LINES.map((l) => (
              <linearGradient key={l.key} id={`gradient-${l.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={l.color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={l.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            yAxisId="currency"
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `R$${v}`}
          />
          {hasCountAxis && (
            <YAxis
              yAxisId="count"
              orientation="right"
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatNumber}
            />
          )}
          <Tooltip content={<ChartTooltip />} />
          {LINES.filter(l => activeLines.has(l.key)).map((l) => (
            <Area
              key={l.key}
              yAxisId={l.yAxisId}
              type="monotone"
              dataKey={l.key}
              stroke={l.color}
              strokeWidth={2.5}
              fill={`url(#gradient-${l.key})`}
              animationDuration={600}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </GlassCard>
  );
}
