import { useState } from 'react';
import { GlassCard } from './GlassCard';
import { cn } from '@/lib/utils';
import { formatNumber, formatCurrency } from '@/data/mock';
import { ArrowDown, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FunnelStage {
  label: string;
  value: number;
  costLabel?: string;
  costValue?: number;
}

type BottomStageOption =
  | 'leads'
  | 'results'
  | 'purchases'
  | 'add_to_cart'
  | 'initiate_checkout'
  | 'view_content';

const STAGE_OPTIONS: { value: BottomStageOption; label: string }[] = [
  { value: 'leads', label: 'Leads' },
  { value: 'results', label: 'Resultados' },
  { value: 'purchases', label: 'Compras' },
  { value: 'view_content', label: 'Visualizar Conteúdo' },
  { value: 'add_to_cart', label: 'Adicionar ao Carrinho' },
  { value: 'initiate_checkout', label: 'Iniciar Checkout' },
];

interface ConversionFunnelProps {
  reach: number;
  impressions: number;
  clicks: number;
  leads: number;
  purchases: number;
  results?: number;
  addToCart?: number;
  initiateCheckout?: number;
  viewContent?: number;
  cpm: number;
  cpc: number;
  cpl: number;
  costPerPurchase: number;
  costPerResult?: number;
  costPerAddToCart?: number;
  costPerInitiateCheckout?: number;
  costPerViewContent?: number;
}

// Green gradient from dark (top) to light (bottom) — 6 stages
const STAGE_GREENS = [
  { bg: 'rgba(26,205,138,0.06)', border: 'rgba(26,205,138,0.30)' },
  { bg: 'rgba(26,205,138,0.10)', border: 'rgba(26,205,138,0.38)' },
  { bg: 'rgba(26,205,138,0.14)', border: 'rgba(26,205,138,0.46)' },
  { bg: 'rgba(26,205,138,0.18)', border: 'rgba(26,205,138,0.55)' },
  { bg: 'rgba(26,205,138,0.22)', border: 'rgba(26,205,138,0.65)' },
  { bg: 'rgba(26,205,138,0.27)', border: 'rgba(26,205,138,0.75)' },
];

function getStoredStage(key: string, fallback: BottomStageOption): BottomStageOption {
  try {
    const v = localStorage.getItem(key);
    if (v && STAGE_OPTIONS.some(o => o.value === v)) return v as BottomStageOption;
  } catch {}
  return fallback;
}

export function ConversionFunnel({
  reach,
  impressions,
  clicks,
  leads,
  purchases,
  results = 0,
  addToCart = 0,
  initiateCheckout = 0,
  viewContent = 0,
  cpm,
  cpc,
  cpl,
  costPerPurchase,
  costPerResult = 0,
  costPerAddToCart = 0,
  costPerInitiateCheckout = 0,
  costPerViewContent = 0,
}: ConversionFunnelProps) {
  const [stage4, setStage4] = useState<BottomStageOption>(() => getStoredStage('funnel_stage4', 'view_content'));
  const [stage5, setStage5] = useState<BottomStageOption>(() => getStoredStage('funnel_stage5', 'leads'));
  const [stage6, setStage6] = useState<BottomStageOption>(() => getStoredStage('funnel_stage6', 'purchases'));

  const stageData: Record<BottomStageOption, { label: string; value: number; costLabel: string; costValue: number }> = {
    leads: { label: 'Leads', value: leads, costLabel: 'CPL', costValue: cpl },
    results: { label: 'Resultados', value: results, costLabel: 'Custo/Resultado', costValue: costPerResult },
    purchases: { label: 'Compras', value: purchases, costLabel: 'Custo/Compra', costValue: costPerPurchase },
    add_to_cart: { label: 'Adicionar ao Carrinho', value: addToCart, costLabel: 'Custo/ATC', costValue: costPerAddToCart },
    initiate_checkout: { label: 'Iniciar Checkout', value: initiateCheckout, costLabel: 'Custo/IC', costValue: costPerInitiateCheckout },
    view_content: { label: 'Visualizar Conteúdo', value: viewContent, costLabel: 'Custo/View', costValue: costPerViewContent },
  };

  const s4 = stageData[stage4];
  const s5 = stageData[stage5];
  const s6 = stageData[stage6];

  const stages: FunnelStage[] = [
    { label: 'Impressões', value: impressions, costLabel: 'CPM', costValue: cpm },
    { label: 'Alcance', value: reach },
    { label: 'Cliques', value: clicks, costLabel: 'CPC', costValue: cpc },
    { label: s4.label, value: s4.value, costLabel: s4.costLabel, costValue: s4.costValue },
    { label: s5.label, value: s5.value, costLabel: s5.costLabel, costValue: s5.costValue },
    { label: s6.label, value: s6.value, costLabel: s6.costLabel, costValue: s6.costValue },
  ];

  const maxValue = Math.max(...stages.map(s => s.value), 1);

  const prevValues = [impressions, reach, clicks, s4.value, s5.value, s6.value];
  const rates = prevValues.map((_, i) => {
    if (i === 0) return null;
    const prev = prevValues[i - 1];
    const curr = prevValues[i];
    return prev > 0 && curr > 0 ? (curr / prev) * 100 : null;
  });

  const handleSetStage = (pos: 4 | 5 | 6, val: BottomStageOption) => {
    if (pos === 4) {
      setStage4(val);
      localStorage.setItem('funnel_stage4', val);
    } else if (pos === 5) {
      setStage5(val);
      localStorage.setItem('funnel_stage5', val);
    } else {
      setStage6(val);
      localStorage.setItem('funnel_stage6', val);
    }
  };

  const renderStageSelector = (pos: 4 | 5 | 6, current: BottomStageOption) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
          {stageData[current].label}
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-[180px]">
        {STAGE_OPTIONS.map(opt => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => handleSetStage(pos, opt.value)}
            className={cn(current === opt.value && 'bg-accent/20')}
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <GlassCard className="animate-fade-in">
      <h3 className="text-lg font-semibold mb-6">Funil de Conversão</h3>

      <div className="flex flex-col items-center gap-1">
        {stages.map((stage, i) => {
          const widthPercent = Math.max(20, (stage.value / maxValue) * 100);
          const rate = rates[i];
          const green = STAGE_GREENS[i];
          const isCustomizable = i === 3 || i === 4 || i === 5;
          const pos: 4 | 5 | 6 = i === 3 ? 4 : i === 4 ? 5 : 6;
          const currentStage = i === 3 ? stage4 : i === 4 ? stage5 : stage6;

          return (
            <div key={`${stage.label}-${i}`} className="w-full flex flex-col items-center">
              {i > 0 && rate !== null && (
                <div className="flex items-center gap-2 py-1.5">
                  <ArrowDown className="h-4 w-4 text-emerald-400/60" />
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    {rate.toFixed(1)}%
                  </span>
                </div>
              )}

              <div
                className="relative rounded-xl py-3 px-4 text-center transition-all duration-300 border-l-4"
                style={{
                  width: `${widthPercent}%`,
                  minWidth: '160px',
                  background: green.bg,
                  borderLeftColor: green.border,
                }}
              >
                {isCustomizable
                  ? renderStageSelector(pos, currentStage)
                  : <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{stage.label}</p>
                }
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
          <span className="text-foreground font-semibold">{formatNumber(s4.value)}</span> {s4.label.toLowerCase()} →{' '}
          <span className="text-foreground font-semibold">{formatNumber(s5.value)}</span> {s5.label.toLowerCase()} →{' '}
          <span className="text-foreground font-semibold">{formatNumber(s6.value)}</span> {s6.label.toLowerCase()}
        </div>
      )}
    </GlassCard>
  );
}
