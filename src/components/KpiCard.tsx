import { useState, useRef, useEffect } from 'react';
import {
  DollarSign, Eye, MousePointer, Target, Users, BarChart3, TrendingUp,
  Zap, ShoppingCart, Repeat, Settings, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumber } from '@/lib/format';

export type MetricKey =
  | 'spend' | 'impressions' | 'reach' | 'clicks' | 'ctr' | 'cpm'
  | 'cpc' | 'leads' | 'cpl' | 'purchases' | 'cost_per_purchase' | 'roas' | 'frequency'
  | 'results' | 'cost_per_result' | 'purchase_value' | 'purchase_roas';

interface MetricDef {
  label: string;
  icon: typeof DollarSign;
  format: (v: number) => string;
  color: string;
  invertChange?: boolean; // true = lower is better (costs)
}

export const METRIC_DEFS: Record<MetricKey, MetricDef> = {
  spend:             { label: 'Total Gasto',     icon: DollarSign,   format: formatCurrency,            color: 'bg-status-active' },
  impressions:       { label: 'Impressões',      icon: Eye,          format: formatNumber,              color: 'bg-blue-500' },
  reach:             { label: 'Alcance',         icon: Users,        format: formatNumber,              color: 'bg-violet-500' },
  clicks:            { label: 'Cliques',         icon: MousePointer, format: formatNumber,              color: 'bg-cyan-500' },
  ctr:               { label: 'CTR',             icon: TrendingUp,   format: (v) => v.toFixed(2) + '%', color: 'bg-teal-500' },
  cpm:               { label: 'CPM',             icon: BarChart3,    format: formatCurrency,            color: 'bg-indigo-500', invertChange: true },
  cpc:               { label: 'CPC',             icon: Zap,          format: formatCurrency,            color: 'bg-sky-500', invertChange: true },
  leads:             { label: 'Leads',           icon: Target,       format: (v) => v.toString(),       color: 'bg-amber-500' },
  cpl:               { label: 'CPL',             icon: DollarSign,   format: formatCurrency,            color: 'bg-orange-500', invertChange: true },
  purchases:         { label: 'Compras',         icon: ShoppingCart,  format: (v) => v.toString(),       color: 'bg-pink-500' },
  cost_per_purchase: { label: 'Custo/Compra',    icon: ShoppingCart,  format: formatCurrency,            color: 'bg-rose-500', invertChange: true },
  roas:              { label: 'ROAS',            icon: TrendingUp,   format: (v) => v.toFixed(2) + 'x', color: 'bg-lime-500' },
  frequency:         { label: 'Frequência',      icon: Repeat,       format: (v) => v.toFixed(2),       color: 'bg-purple-500' },
  results:           { label: 'Resultados',      icon: Target,       format: (v) => v.toString(),       color: 'bg-teal-500' },
  cost_per_result:   { label: 'Custo/Resultado', icon: DollarSign,   format: formatCurrency,            color: 'bg-red-500', invertChange: true },
  purchase_value:    { label: 'Valor de Compras', icon: DollarSign,  format: formatCurrency,            color: 'bg-green-600' },
  purchase_roas:     { label: 'ROAS Compras',    icon: TrendingUp,   format: (v) => v.toFixed(2) + 'x', color: 'bg-lime-600' },
};

const ALL_KEYS = Object.keys(METRIC_DEFS) as MetricKey[];

/**
 * Quantos blocos cabem na tela.
 *
 * Eram sete. O benchmark mostra ONZE de uma vez, em duas linhas densas — e
 * a diferença não é estética: com sete, metade das perguntas do cliente
 * ("qual o CPM?", "o CTR caiu?") exige abrir um menu e trocar um card por
 * outro, perdendo o que estava ali. Doze cobre o conjunto inteiro que
 * importa num relance.
 */
export const TETO_DE_CARDS = 12;

/**
 * O padrão de hoje — as métricas que respondem sem precisar de clique.
 *
 * A ordem é a da leitura: primeiro o dinheiro (o que entrou, o que saiu, se
 * valeu), depois o volume (quantos resultados, a que custo), depois a
 * mecânica (impressões, cliques, CTR, CPM, CPC).
 */
export const DEFAULT_CARDS: MetricKey[] = [
  'spend', 'purchase_value', 'purchase_roas', 'results', 'cost_per_result',
  'purchases', 'impressions', 'clicks', 'ctr', 'cpm', 'cpc', 'reach',
];

/**
 * O padrão ANTERIOR, guardado de propósito.
 *
 * As escolhas de card ficam salvas por usuário. Quem nunca abriu o menu tem
 * gravada exatamente esta lista — e tratá-la como "escolha do usuário"
 * deixaria quem nunca customizou preso aos sete cards para sempre,
 * justamente quem mais ganha com os doze. Uma lista idêntica ao padrão
 * antigo é a assinatura de quem nunca escolheu nada.
 */
const PADRAO_ANTIGO: MetricKey[] = [
  'spend', 'impressions', 'clicks', 'results', 'cost_per_result', 'purchases', 'purchase_value',
];

function eOPadraoAntigo(lista: MetricKey[]): boolean {
  return lista.length === PADRAO_ANTIGO.length && lista.every((k, i) => k === PADRAO_ANTIGO[i]);
}

export function normalizeCards(input: unknown): MetricKey[] {
  if (!Array.isArray(input)) return DEFAULT_CARDS;
  const valid = input.filter((k): k is MetricKey => typeof k === 'string' && k in METRIC_DEFS);
  if (valid.length === 0) return DEFAULT_CARDS;
  if (eOPadraoAntigo(valid)) return DEFAULT_CARDS;
  return valid.slice(0, TETO_DE_CARDS);
}

interface KpiCardProps {
  metricKey: MetricKey;
  value: number;
  previousValue?: number;
  onChangeMetric: (newKey: MetricKey) => void;
}

export function KpiCard({ metricKey, value, previousValue, onChangeMetric }: KpiCardProps) {
  const def = METRIC_DEFS[metricKey];
  const Icon = def.icon;
  const [open, setOpen] = useState(false);
  const [fade, setFade] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Calculate % change
  const changePercent = previousValue != null && previousValue > 0
    ? ((value - previousValue) / previousValue) * 100
    : null;

  const isPositive = changePercent != null
    ? def.invertChange ? changePercent < 0 : changePercent > 0
    : null;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (key: MetricKey) => {
    if (key === metricKey) { setOpen(false); return; }
    setFade(true);
    setTimeout(() => {
      onChangeMetric(key);
      setFade(false);
      setOpen(false);
    }, 200);
  };

  return (
    <div ref={ref} className="relative group">
      {/* Denso de propósito: o ícone entra na linha do rótulo e a variação
          vira texto, não pílula. O que saiu daqui — o chip colorido de 36px
          e o acolchoamento — custava a altura de uma segunda fileira de
          blocos, que vale mais que a decoração. */}
      <GlassCard hover className="animate-fade-in overflow-hidden p-2.5 sm:p-3">
        <div className={cn('transition-opacity duration-200', fade && 'opacity-0')}>
          <div className="flex items-start justify-between gap-1.5">
            <p className="flex min-w-0 items-center gap-1.5 text-[9.5px] uppercase tracking-wider text-muted-foreground font-medium leading-tight">
              <Icon className="h-3 w-3 shrink-0 opacity-70" />
              <span className="truncate">{def.label}</span>
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
              className="-mr-0.5 -mt-0.5 shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground opacity-0 group-hover:opacity-100"
              aria-label="Mudar métrica"
            >
              <Settings className="h-3 w-3" />
            </button>
          </div>

          <p className="mt-1 text-lg sm:text-xl font-bold metric-number tabular-nums leading-tight break-words">
            {def.format(value)}
          </p>

          {changePercent != null && (
            <span
              className={cn(
                'mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-semibold',
                isPositive ? 'text-status-active' : 'text-red-400',
              )}
            >
              {isPositive ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
              {Math.abs(changePercent).toFixed(1)}%
            </span>
          )}
        </div>
        <div className={cn('absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl', def.color)} />
      </GlassCard>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 glass rounded-xl p-2 min-w-[180px] max-h-[280px] overflow-y-auto animate-fade-in">
          {ALL_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              className={cn(
                'w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center gap-2',
                key === metricKey ? 'bg-accent/20 text-accent' : 'hover:bg-white/5 text-muted-foreground hover:text-foreground'
              )}
            >
              {METRIC_DEFS[key].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
