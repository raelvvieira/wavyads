import { useState, useRef, useEffect } from 'react';
import {
  DollarSign, Eye, MousePointer, Target, Users, BarChart3, TrendingUp,
  Zap, ShoppingCart, Repeat, Settings,
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumber } from '@/data/mock';

export type MetricKey =
  | 'spend' | 'impressions' | 'reach' | 'clicks' | 'ctr' | 'cpm'
  | 'cpc' | 'leads' | 'cpl' | 'purchases' | 'cost_per_purchase' | 'roas' | 'frequency';

interface MetricDef {
  label: string;
  icon: typeof DollarSign;
  format: (v: number) => string;
  color: string; // tailwind border-b color
}

export const METRIC_DEFS: Record<MetricKey, MetricDef> = {
  spend:             { label: 'Total Gasto',     icon: DollarSign,   format: formatCurrency,            color: 'bg-emerald-500' },
  impressions:       { label: 'Impressões',      icon: Eye,          format: formatNumber,              color: 'bg-blue-500' },
  reach:             { label: 'Alcance',         icon: Users,        format: formatNumber,              color: 'bg-violet-500' },
  clicks:            { label: 'Cliques',         icon: MousePointer, format: formatNumber,              color: 'bg-cyan-500' },
  ctr:               { label: 'CTR',             icon: TrendingUp,   format: (v) => v.toFixed(2) + '%', color: 'bg-teal-500' },
  cpm:               { label: 'CPM',             icon: BarChart3,    format: formatCurrency,            color: 'bg-indigo-500' },
  cpc:               { label: 'CPC',             icon: Zap,          format: formatCurrency,            color: 'bg-sky-500' },
  leads:             { label: 'Leads',           icon: Target,       format: (v) => v.toString(),       color: 'bg-amber-500' },
  cpl:               { label: 'CPL',             icon: DollarSign,   format: formatCurrency,            color: 'bg-orange-500' },
  purchases:         { label: 'Compras',         icon: ShoppingCart,  format: (v) => v.toString(),       color: 'bg-pink-500' },
  cost_per_purchase: { label: 'Custo/Compra',    icon: ShoppingCart,  format: formatCurrency,            color: 'bg-rose-500' },
  roas:              { label: 'ROAS',            icon: TrendingUp,   format: (v) => v.toFixed(2) + 'x', color: 'bg-lime-500' },
  frequency:         { label: 'Frequência',      icon: Repeat,       format: (v) => v.toFixed(2),       color: 'bg-purple-500' },
};

const ALL_KEYS = Object.keys(METRIC_DEFS) as MetricKey[];

const STORAGE_KEY = 'wavy-kpi-cards';

export function getDefaultCards(): MetricKey[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return ['spend', 'impressions', 'clicks', 'cpl', 'leads', 'purchases'];
}

export function saveCards(cards: MetricKey[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

interface KpiCardProps {
  metricKey: MetricKey;
  value: number;
  onChangeMetric: (newKey: MetricKey) => void;
}

export function KpiCard({ metricKey, value, onChangeMetric }: KpiCardProps) {
  const def = METRIC_DEFS[metricKey];
  const Icon = def.icon;
  const [open, setOpen] = useState(false);
  const [fade, setFade] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
    <div ref={ref} className="relative">
      <GlassCard hover className="animate-fade-in overflow-hidden">
        <div className={cn('transition-opacity duration-200', fade && 'opacity-0')}>
          <div className="flex items-start justify-between">
            <div className="space-y-1.5 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{def.label}</p>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight metric-number truncate">{def.format(value)}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl btn-accent">
                <Icon className="h-5 w-5" />
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
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
