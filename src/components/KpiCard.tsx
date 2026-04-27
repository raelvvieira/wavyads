import { useState, useRef, useEffect } from 'react';
import {
  DollarSign, Eye, MousePointer, Target, Users, BarChart3, TrendingUp,
  Zap, ShoppingCart, Repeat, Settings, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumber } from '@/data/mock';

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
  spend:             { label: 'Total Gasto',     icon: DollarSign,   format: formatCurrency,            color: 'bg-emerald-500' },
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

function storageKey(clientId?: string) {
  return clientId ? `wavy-kpi-cards-${clientId}` : 'wavy-kpi-cards';
}

const DEFAULT_CARDS: MetricKey[] = ['spend', 'impressions', 'clicks', 'results', 'cost_per_result', 'purchases', 'purchase_value'];

export function getDefaultCards(clientId?: string): MetricKey[] {
  try {
    const saved = localStorage.getItem(storageKey(clientId));
    if (saved) {
      const arr = JSON.parse(saved) as MetricKey[];
      // Backfill to 7 cards for users with older saved layouts
      if (Array.isArray(arr) && arr.length < 7) {
        const missing = DEFAULT_CARDS.filter(k => !arr.includes(k));
        return [...arr, ...missing].slice(0, 7);
      }
      return arr.slice(0, 7);
    }
  } catch {}
  return DEFAULT_CARDS;
}

export function saveCards(cards: MetricKey[], clientId?: string) {
  localStorage.setItem(storageKey(clientId), JSON.stringify(cards));
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
      <GlassCard hover className="animate-fade-in overflow-hidden p-3 sm:p-4 xl:p-5">
        <div className={cn('transition-opacity duration-200', fade && 'opacity-0')}>
          <div className="flex items-center sm:items-start justify-between gap-2">
            <div className="space-y-1 sm:space-y-1.5 min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium leading-tight line-clamp-2 sm:min-h-[24px]">{def.label}</p>
              <p className="text-base sm:text-lg md:text-xl lg:text-xl xl:text-xl 2xl:text-2xl font-bold tracking-tight metric-number tabular-nums leading-tight break-words">{def.format(value)}</p>
              {changePercent != null && (
                <div
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border',
                    isPositive
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  )}
                >
                  {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(changePercent).toFixed(1)}%
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <div className="flex h-8 w-8 xl:h-9 xl:w-9 items-center justify-center rounded-xl btn-accent">
                <Icon className="h-4 w-4 xl:h-[18px] xl:w-[18px]" />
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors opacity-60 sm:opacity-0 group-hover:opacity-100 xl:opacity-100"
                aria-label="Mudar métrica"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
        <div className={cn('absolute bottom-0 left-0 right-0 h-1 rounded-b-xl', def.color)} />
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
