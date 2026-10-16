import { useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { GlassCard } from './GlassCard';
import { chartSeriesPalette, chartSurface } from '@/lib/chartTheme';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { DailyMetric } from '@/hooks/useMetaInsights';
import {
  agregarSerie, pontosPorGranularidade,
  type Granularidade, type PontoDaSerie,
} from '@/lib/dashboard/serieTemporal';

interface LineConfig {
  /* `PontoDaSerie` e não `DailyMetric`: o gráfico desenha a série AGREGADA,
     que carrega as derivadas que o dado diário não tem. */
  key: keyof PontoDaSerie;
  label: string;
  color: string;
  yAxisId: 'currency' | 'count' | 'cost';
  format: (v: number) => string;
}

const LINES: LineConfig[] = [
  { key: 'spend',              label: 'Gasto',             color: chartSeriesPalette.spend,           yAxisId: 'currency', format: formatCurrency },
  { key: 'clicks',             label: 'Cliques',           color: chartSeriesPalette.clicks,          yAxisId: 'count',    format: formatNumber },
  { key: 'impressions',        label: 'Impressões',        color: chartSeriesPalette.impressions,     yAxisId: 'count',    format: formatNumber },
  { key: 'leads',              label: 'Leads',             color: chartSeriesPalette.leads,           yAxisId: 'count',    format: (v) => v.toString() },
  { key: 'purchases',          label: 'Compras',           color: chartSeriesPalette.purchases,       yAxisId: 'count',    format: (v) => v.toString() },
  { key: 'results',            label: 'Resultados',        color: chartSeriesPalette.results,         yAxisId: 'count',    format: (v) => v.toString() },
  { key: 'cost_per_result',    label: 'Custo/Resultado',   color: chartSeriesPalette.costPerResult,   yAxisId: 'cost', format: formatCurrency },
  { key: 'cost_per_purchase',  label: 'Custo/Compra',      color: chartSeriesPalette.costPerPurchase, yAxisId: 'cost', format: formatCurrency },
  /* Derivadas: nunca vieram prontas da API por dia — são recalculadas a
     partir das somas de cada balde, em `agregarSerie`. */
  { key: 'ctr',                label: 'CTR',               color: chartSeriesPalette.clicks,          yAxisId: 'cost',  format: (v) => v.toFixed(2) + '%' },
  { key: 'cpm',                label: 'CPM',               color: chartSeriesPalette.impressions,     yAxisId: 'cost',  format: formatCurrency },
  { key: 'cpc',                label: 'CPC',               color: chartSeriesPalette.costPerResult,   yAxisId: 'cost',  format: formatCurrency },
];

const GRANULARIDADES: { valor: Granularidade; rotulo: string }[] = [
  { valor: 'dia', rotulo: 'Dia' },
  { valor: 'semana', rotulo: 'Semana' },
  { valor: 'mes', rotulo: 'Mês' },
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
  /** O título muda com a granularidade; este é o nome do bloco. */
  titulo?: string;
  /** Quais linhas começam ligadas. A primeira é a fixa. */
  inicial?: string[];
}

export function DailyChart({ data, titulo = 'Métricas', inicial = ['spend'] }: DailyChartProps) {
  const [activeLines, setActiveLines] = useState<Set<string>>(new Set(inicial));
  const [granularidade, setGranularidade] = useState<Granularidade>('dia');

  const fixa = inicial[0];
  const serie = useMemo(() => agregarSerie(data as any, granularidade), [data, granularidade]);

  /*
   * Semana e mês só existem quando mudam alguma coisa.
   *
   * Num período de sete dias, "Mês" devolveria um ponto só — um gráfico de
   * um ponto é um número com eixos. Esconder a opção é melhor que oferecer
   * uma que estraga a tela.
   */
  const disponiveis = useMemo(() => {
    const p = pontosPorGranularidade(data as any);
    return GRANULARIDADES.filter((g) => g.valor === 'dia' || p[g.valor] >= 2);
  }, [data]);

  const toggle = (key: string) => {
    setActiveLines(prev => {
      const next = new Set(prev);
      if (key === fixa) return next;
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
        <h3 className="text-lg font-semibold">{titulo}</h3>

        {/* O seletor de granularidade. Num período de seis meses, 180
            pontos diários são um borrão em que nenhuma tendência aparece. */}
        {disponiveis.length > 1 && (
          <div className="mr-auto flex items-center gap-0.5 rounded-full bg-white/[0.04] p-0.5">
            {disponiveis.map((g) => (
              <button
                key={g.valor}
                onClick={() => setGranularidade(g.valor)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                  granularidade === g.valor
                    ? 'bg-white/10 text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {g.rotulo}
              </button>
            ))}
          </div>
        )}
        {LINES.map((l) => (
          <button
            key={l.key}
            onClick={() => toggle(l.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 border',
              activeLines.has(l.key)
                ? 'border-white/20 bg-white/10 text-foreground shadow-sm'
                : 'border-transparent bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]',
              l.key === fixa && 'cursor-default'
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
        <AreaChart data={serie}>
          <defs>
            {LINES.map((l) => (
              <linearGradient key={l.key} id={`gradient-${l.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={l.color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={l.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={chartSurface.grid} />
          <XAxis dataKey="date" tick={{ fill: chartSurface.axisTick, fontSize: chartSurface.axisFontSize }} axisLine={false} tickLine={false} />
          <YAxis
            yAxisId="currency"
            tick={{ fill: chartSurface.axisTick, fontSize: chartSurface.axisFontSize }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `R$${v}`}
          />
          {hasCountAxis && (
            <YAxis
              yAxisId="count"
              orientation="right"
              tick={{ fill: chartSurface.axisTick, fontSize: chartSurface.axisFontSize }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatNumber}
            />
          )}
          {hasCostAxis && (
            <YAxis yAxisId="cost" hide />
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
