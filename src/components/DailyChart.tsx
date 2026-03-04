import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { GlassCard } from './GlassCard';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumber } from '@/data/mock';
import type { DailyMetric } from '@/hooks/useMetaInsights';

interface LineConfig {
  key: keyof DailyMetric;
  label: string;
  color: string;
  yAxisId: 'currency' | 'count';
  format: (v: number) => string;
}

const LINES: LineConfig[] = [
  { key: 'spend',       label: 'Gasto',       color: '#22c55e', yAxisId: 'currency', format: formatCurrency },
  { key: 'clicks',      label: 'Cliques',     color: '#06b6d4', yAxisId: 'count',    format: formatNumber },
  { key: 'impressions', label: 'Impressões',  color: '#3b82f6', yAxisId: 'count',    format: formatNumber },
  { key: 'leads',       label: 'Leads',       color: '#f59e0b', yAxisId: 'count',    format: (v) => v.toString() },
  { key: 'purchases',   label: 'Compras',     color: '#ec4899', yAxisId: 'count',    format: (v) => v.toString() },
];

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg px-3 py-2 text-xs space-y-1">
      <p className="text-muted-foreground font-medium">{label}</p>
      {payload.map((p: any) => {
        const cfg = LINES.find(l => l.key === p.dataKey);
        return (
          <div key={p.dataKey} className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground">{cfg?.label}:</span>
            <span className="font-semibold metric-number">{cfg?.format(p.value) ?? p.value}</span>
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
      if (key === 'spend') return next; // always on
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const hasCountAxis = LINES.some(l => l.yAxisId === 'count' && activeLines.has(l.key));

  return (
    <GlassCard className="animate-fade-in">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h3 className="text-lg font-semibold mr-auto">Métricas por Dia</h3>
        {LINES.map((l) => (
          <button
            key={l.key}
            onClick={() => toggle(l.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
              activeLines.has(l.key)
                ? 'border-white/20 bg-white/10 text-foreground'
                : 'border-transparent bg-white/[0.03] text-muted-foreground hover:bg-white/5',
              l.key === 'spend' && 'cursor-default'
            )}
          >
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color, opacity: activeLines.has(l.key) ? 1 : 0.3 }} />
            {l.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data}>
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
            <Line
              key={l.key}
              yAxisId={l.yAxisId}
              type="monotone"
              dataKey={l.key}
              stroke={l.color}
              strokeWidth={2}
              dot={false}
              animationDuration={500}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </GlassCard>
  );
}
