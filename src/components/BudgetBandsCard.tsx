import { useMemo, useState } from 'react';
import { GlassCard } from './GlassCard';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { mapearVerba, type CampanhaParaFaixa, type Faixa } from '@/lib/dashboard/faixasDeVerba';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronDown } from 'lucide-react';
import { ORDEM_DAS_FAIXAS } from '@/lib/dashboard/faixasDeVerba';
import { unidadeDoResultado, pluralDoResultado } from '@/lib/dashboard/unidadeDoResultado';

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
  /**
   * O tipo de resultado da conta, cru, como a Meta devolve.
   *
   * O substantivo sai de `unidadeDoResultado`, e não do rótulo da tabela:
   * aquele é cabeçalho de coluna, plural e descritivo, e numa frase vira
   * "R$ 11,18 por conversas por mensagem iniciadas na média da conta".
   */
  resultType?: string | null;
}

export function BudgetBandsCard({ campaigns, resultType }: BudgetBandsCardProps) {
  const resultLabel = unidadeDoResultado(resultType);
  const mapa = useMemo(() => mapearVerba(campaigns), [campaigns]);
  const [aberto, setAberto] = useState(false);
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
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-foreground/[0.08]">
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
                {f.resultados > 0 && ` · ${f.resultados} ${pluralDoResultado(resultType, f.resultados)}`}
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Uma frase, e só quando há o que dizer. Um painel que descreve tudo
            em parágrafos é um painel que ninguém lê. */}
        {mapa.frase ? (
          <p className="text-sm font-medium text-foreground/90">{mapa.frase}</p>
        ) : <span />}
        {/* O gatilho é um botão com contorno, e não um link sublinhado de
            11px: ele some numa tela cheia, e quem não o vê não descobre que
            existe mais informação atrás dele.

            A cor vem de `border`/`foreground`, nunca de `white`: no tema
            claro uma borda branca sobre fundo branco é borda nenhuma — o
            botão voltaria a ser texto solto, que é exatamente o problema
            que ele veio resolver. */}
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/25 bg-foreground/[0.04] px-3 py-1 text-[11px] font-medium text-foreground/85 transition-colors hover:bg-foreground/[0.08] hover:text-foreground"
        >
          {aberto ? 'Ocultar detalhes' : 'Ver detalhes'}
          <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', aberto && 'rotate-180')} />
        </button>
      </div>

      {/* O detalhe abre AQUI, no próprio card.
          Um modal tira a pessoa do painel para mostrar o aprofundamento de
          um bloco dele — e ao fechar ela volta sem o contexto que tinha. */}
      {aberto && (
        <div className="animate-fade-in space-y-3 border-t border-border/15 pt-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 text-left font-medium">Faixa</th>
                  <th className="pb-2 text-right font-medium">Camp.</th>
                  <th className="pb-2 text-right font-medium">Invest.</th>
                  <th className="pb-2 text-right font-medium">% total</th>
                  <th className="pb-2 text-right font-medium">Result.</th>
                  <th className="pb-2 text-right font-medium">Custo</th>
                </tr>
              </thead>
              <tbody>
                {ORDEM_DAS_FAIXAS.map((faixa) => {
                  const f = mapa.fatias.find((x) => x.faixa === faixa)!;
                  return (
                    <tr key={faixa} className={cn('border-t border-border/10', f.campanhas === 0 && 'opacity-40')}>
                      <td className="py-2 pr-2">
                        <span className="flex items-center gap-1.5">
                          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', PONTO[faixa])} />
                          <span className="truncate">{f.rotulo}</span>
                        </span>
                        {/* Os nomes, e não só a contagem: "1 campanha sem
                            retorno" sem dizer qual não é acionável. */}
                        {f.nomes.length > 0 && (
                          <span className="mt-0.5 block truncate pl-3 text-[10px] text-muted-foreground">
                            {f.nomes.slice(0, 3).join(' · ')}
                            {f.nomes.length > 3 && ` · +${f.nomes.length - 3}`}
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right metric-number">{f.campanhas}</td>
                      <td className="py-2 text-right metric-number">{formatCurrency(f.investimento)}</td>
                      <td className="py-2 text-right metric-number">{f.percentual.toFixed(1)}%</td>
                      <td className="py-2 text-right metric-number">{f.resultados || '—'}</td>
                      <td className="py-2 text-right metric-number">
                        {f.custoPorResultado > 0 ? formatCurrency(f.custoPorResultado) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-1.5">
            {mapa.frases.map((f) => (
              <p
                key={f.texto}
                className={cn(
                  'rounded-lg border px-2.5 py-2 text-[11.5px] leading-relaxed',
                  f.tom === 'bom' && 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-700 dark:text-emerald-200/90',
                  f.tom === 'atencao' && 'border-amber-400/25 bg-amber-400/[0.07] text-amber-700 dark:text-amber-200/90',
                  f.tom === 'ruim' && 'border-red-500/25 bg-red-500/[0.08] text-red-700 dark:text-red-200/90',
                )}
              >
                {f.texto}
              </p>
            ))}
          </div>
        </div>
      )}
    </GlassCard>

  );
}
