import { useMemo } from 'react';
import { GlassCard } from './GlassCard';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { mapearVerba, type CampanhaParaFaixa, type Faixa } from '@/lib/dashboard/faixasDeVerba';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Onde está a verba — em uma barra e uma frase.
 *
 * O painel já dizia quanto foi gasto, quantos leads vieram e quanto custou
 * cada um. O que ele não dizia é o que fazer com isso. Este bloco responde
 * a pergunta que o cliente faz primeiro: **quanto do meu dinheiro está indo
 * para o que funciona?**
 *
 * Minimalismo aqui não é estilo, é leitura: uma barra de 10px lida em meio
 * segundo vale mais que cinco números que exigem comparação mental. O
 * detalhe fica no hover, para quem quiser; quem só passa os olhos leva a
 * cor e a frase.
 */

const COR: Record<Faixa, string> = {
  escalar: 'bg-emerald-400',
  manter: 'bg-emerald-400/45',
  observar: 'bg-amber-400/70',
  revisar: 'bg-orange-500/80',
  sem_retorno: 'bg-red-500/85',
};

const PONTO: Record<Faixa, string> = {
  escalar: 'bg-emerald-400',
  manter: 'bg-emerald-400/45',
  observar: 'bg-amber-400/70',
  revisar: 'bg-orange-500/80',
  sem_retorno: 'bg-red-500/85',
};

interface BudgetBandsCardProps {
  campaigns: CampanhaParaFaixa[];
  /** Como o cliente chama o que a campanha entrega: lead, compra, conversa. */
  resultLabel?: string;
}

export function BudgetBandsCard({ campaigns, resultLabel = 'resultado' }: BudgetBandsCardProps) {
  const mapa = useMemo(() => mapearVerba(campaigns), [campaigns]);
  if (mapa.total <= 0) return null;

  const comVerba = mapa.fatias.filter((f) => f.investimento > 0);

  return (
    <GlassCard className="animate-fade-in space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-base sm:text-lg font-semibold">Onde está a verba</h3>
        {/* A régua, em letra miúda: um veredito sem dizer contra o quê é
            um veredito que ninguém pode conferir. */}
        <span className="text-[10px] text-muted-foreground">
          {formatCurrency(mapa.referencia)} por {resultLabel} na média da conta
        </span>
      </div>

      {/* A barra. Sem eixo, sem grade, sem rótulo dentro — a proporção É a
          informação, e qualquer coisa a mais disputa com ela. */}
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        {comVerba.map((f) => (
          <Tooltip key={f.faixa}>
            <TooltipTrigger asChild>
              <div
                className={cn('h-full transition-opacity hover:opacity-80', COR[f.faixa])}
                style={{ width: `${f.percentual}%` }}
                aria-label={`${f.rotulo}: ${Math.round(f.percentual)}%`}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p className="font-medium">{f.rotulo} · {Math.round(f.percentual)}%</p>
              <p className="text-muted-foreground">
                {formatCurrency(f.investimento)} · {f.campanhas} {f.campanhas === 1 ? 'campanha' : 'campanhas'}
                {f.resultados > 0 && ` · ${f.resultados} ${resultLabel}${f.resultados === 1 ? '' : 's'}`}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
        {comVerba.map((f) => (
          <span key={f.faixa} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={cn('h-1.5 w-1.5 rounded-full', PONTO[f.faixa])} />
            {f.rotulo}
            <span className="metric-number text-foreground/80">{Math.round(f.percentual)}%</span>
          </span>
        ))}
      </div>

      {/* Uma frase, e só quando há o que dizer. Um painel que descreve tudo
          em parágrafos é um painel que ninguém lê. */}
      {mapa.frase && (
        <p className="text-sm font-medium text-foreground/90">{mapa.frase}</p>
      )}
    </GlassCard>
  );
}
