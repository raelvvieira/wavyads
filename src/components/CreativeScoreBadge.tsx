import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { NotaDoCriativo } from '@/lib/dashboard/notaDoCriativo';

/**
 * A nota do criativo — e, no hover, a conta inteira.
 *
 * O benchmark descreve a nota da plataforma concorrente como "fórmula não
 * exposta". É aí que a gente fica melhor: uma nota que ninguém pode
 * conferir é uma nota em que ninguém confia na primeira vez que ela
 * discordar do faro do gestor.
 *
 * No card, só o número e uma palavra. A conta fica a um hover de distância
 * — disponível para quem questiona, invisível para quem só quer o ranking.
 */

const COR: Record<string, string> = {
  escalar: 'border-emerald-400/35 bg-emerald-400/10 text-emerald-300',
  manter: 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200/80',
  observar: 'border-amber-400/25 bg-amber-400/[0.08] text-amber-200',
  revisar: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  sem_retorno: 'border-red-500/30 bg-red-500/10 text-red-300',
};

export function CreativeScoreBadge({ nota }: { nota: NotaDoCriativo }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
            COR[nota.veredito],
          )}
        >
          <span className="metric-number">{nota.nota}</span>
          <span className="font-medium opacity-80">{nota.rotulo}</span>
          {/* Amostra pequena: a nota continua à vista, mas avisa de si. */}
          {nota.poucoDado && <span className="opacity-60" aria-label="poucos dados">·</span>}
        </span>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-[220px] text-xs">
        {nota.parciais.length > 0 ? (
          <>
            {nota.parciais.map((p) => (
              <p key={p.chave} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{p.rotulo}</span>
                <span className="metric-number">{p.nota} <span className="text-muted-foreground">× {p.peso}%</span></span>
              </p>
            ))}
            <p className="mt-1 border-t border-white/10 pt-1 text-muted-foreground">
              {nota.resultados} {nota.resultados === 1 ? 'resultado' : 'resultados'}
              {nota.poucoDado && ' — amostra pequena'}
            </p>
          </>
        ) : (
          <p className="text-muted-foreground">
            {nota.veredito === 'sem_retorno'
              ? 'Gastou e não trouxe resultado.'
              : 'Sem base de comparação no período.'}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
