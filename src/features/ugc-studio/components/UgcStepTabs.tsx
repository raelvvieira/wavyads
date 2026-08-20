import { Film, Mic, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

export const UGC_STEPS = ['script', 'avatar', 'broll'] as const;
export type UgcStep = (typeof UGC_STEPS)[number];

const SPEC: Record<UgcStep, { label: string; icon: typeof Pencil }> = {
  script: { label: 'Roteiro', icon: Pencil },
  avatar: { label: 'Avatar falando', icon: Mic },
  broll: { label: 'B-Roll', icon: Film },
};

interface UgcStepTabsProps {
  current: UgcStep;
  onChange: (step: UgcStep) => void;
  /** Quantos clipes cada etapa já produziu — o número é o progresso real. */
  counts?: Partial<Record<UgcStep, number>>;
}

/**
 * As três etapas, sempre todas alcançáveis.
 *
 * Não é um wizard que tranca: dá para pular direto ao B-roll sem roteiro
 * nenhum, porque as etapas produzem materiais independentes e o usuário
 * pode já saber o que quer. Trancar aqui só criaria uma sequência
 * obrigatória que o próprio produto não exige — os quatro segmentos do
 * avatar já nascem opcionais.
 */
export function UgcStepTabs({ current, onChange, counts = {} }: UgcStepTabsProps) {
  return (
    <nav className="ugc-step-tabs" aria-label="Etapas do projeto">
      {UGC_STEPS.map((step, i) => {
        const { label, icon: Icon } = SPEC[step];
        const ativo = current === step;
        const feito = (counts[step] ?? 0) > 0;
        return (
          <button
            key={step}
            type="button"
            onClick={() => onChange(step)}
            aria-current={ativo ? 'step' : undefined}
            data-active={ativo}
            className="ugc-step-tab"
          >
            <span className={cn('ugc-step-number', feito && 'ugc-step-number-done')}>{i + 1}</span>
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
            {feito && <span className="metric-number text-[11px] text-white/45">{counts[step]}</span>}
          </button>
        );
      })}
    </nav>
  );
}
