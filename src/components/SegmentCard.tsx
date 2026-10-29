import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumber } from '@/lib/format';
import { resumirSegmento, rotuloDoSegmento, type LinhaDeSegmento } from '@/lib/dashboard/segmentos';
import { unidadeDoResultado, pluralDoResultado } from '@/lib/dashboard/unidadeDoResultado';

/**
 * Para onde a verba foi, num recorte — idade, posicionamento ou região.
 *
 * Um card por recorte, e não um carrossel com os três. O carrossel foi
 * tentado: ele dava a linha inteira a cada recorte e deixava as barras mais
 * largas, mas escondia dois terços da informação atrás de uma seta. Ver os
 * três de uma vez é o que permite notar que a faixa que mais consome verba
 * é também a que aparece pouco numa plataforma — e isso é a leitura que o
 * bloco existe para dar.
 *
 * Nada aqui é pintado com `white`: o painel tem tema claro, e uma borda
 * branca sobre fundo branco é borda nenhuma. Contornos e trilhos saem de
 * `border`/`foreground`, que viram o seu oposto quando o tema vira.
 *
 * O detalhe abre no próprio card, não num modal: um modal tira a pessoa do
 * painel para mostrar o aprofundamento de um bloco dele, e ao fechar ela
 * volta sem o contexto que tinha.
 */

interface SegmentCardProps {
  titulo: string;
  subtitulo: string;
  linhas: LinhaDeSegmento[] | undefined;
  /** Um segundo recorte da mesma vista — "Plataforma" × "Posição". */
  alternativa?: { rotulo: string; linhas: LinhaDeSegmento[] | undefined };
  resultType?: string | null;
  carregando?: boolean;
}

export function SegmentCard({
  titulo, subtitulo, linhas, alternativa, resultType, carregando,
}: SegmentCardProps) {
  const [verAlternativa, setVerAlternativa] = useState(false);
  const [aberto, setAberto] = useState(false);
  const unidade = unidadeDoResultado(resultType);

  const ativas = verAlternativa ? alternativa?.linhas : linhas;
  const resumo = useMemo(() => resumirSegmento(ativas), [ativas]);
  const completo = useMemo(() => resumirSegmento(ativas, 50), [ativas]);

  if (carregando) {
    return (
      <GlassCard className="h-[200px] animate-pulse bg-foreground/[0.03]">
        <span className="sr-only">Carregando segmentação</span>
      </GlassCard>
    );
  }
  /* Card vazio com título promete informação e entrega moldura — e numa
     fileira de três, o buraco ainda desalinha os vizinhos. */
  if (resumo.fatias.length === 0) return null;

  return (
    <GlassCard className="animate-fade-in space-y-3">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-semibold">{titulo}</h3>
          <p className="text-[11px] text-muted-foreground">
            {verAlternativa ? alternativa!.rotulo : subtitulo}
          </p>
        </div>

        {alternativa && (
          <button
            type="button"
            onClick={() => setVerAlternativa((v) => !v)}
            className="ml-auto shrink-0 rounded-full border border-border/25 px-2.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
          >
            {verAlternativa ? subtitulo : alternativa.rotulo}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
        <span className="text-muted-foreground">
          Invest. <span className="metric-number text-foreground/90">{formatCurrency(resumo.investimento)}</span>
        </span>
        {resumo.receita > 0 && (
          <span className="text-muted-foreground">
            Receita <span className="metric-number text-foreground/90">{formatCurrency(resumo.receita)}</span>
          </span>
        )}
      </div>

      <div className="space-y-2">
        {resumo.fatias.map((f) => (
          <div key={f.chave} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate text-foreground/90">{rotuloDoSegmento(f.chave)}</span>
              <span className="metric-number shrink-0 text-muted-foreground">{formatCurrency(f.spend)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-foreground/[0.08]">
                <div className="h-full rounded-full bg-emerald-400/70" style={{ width: `${f.percentual}%` }} />
              </div>
              <span className="metric-number w-10 shrink-0 text-right text-[10px] text-muted-foreground">
                {f.percentual.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {resumo.ocultas > 0 && (
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/25 bg-foreground/[0.04] px-3 py-1 text-[11px] font-medium text-foreground/85 transition-colors hover:bg-foreground/[0.08] hover:text-foreground"
        >
          {aberto ? 'Ocultar detalhes' : `Ver todos os ${resumo.fatias.length + resumo.ocultas}`}
          <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', aberto && 'rotate-180')} />
        </button>
      )}

      {aberto && (
        <div className="animate-fade-in space-y-2.5 border-t border-border/15 pt-3">
          <div className="max-h-[260px] space-y-2.5 overflow-y-auto pr-1">
            {completo.fatias.map((f) => (
              <div key={f.chave} className="space-y-1 border-b border-border/10 pb-2 last:border-0">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate text-foreground/90">{rotuloDoSegmento(f.chave)}</span>
                  <span className="metric-number text-muted-foreground">
                    {formatCurrency(f.spend)} · {f.percentual.toFixed(1)}%
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-3 text-[10px] text-muted-foreground">
                  <span>{formatNumber(f.impressions)} impressões</span>
                  {f.results > 0 && (
                    <span>
                      {f.results} {pluralDoResultado(resultType, f.results)} ·{' '}
                      {formatCurrency(f.cost_per_result)} por {unidade}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {/* A mesma ressalva que o benchmark carrega — e que evita o
              chamado de "os números não batem com a tabela". */}
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            A segmentação é calculada pela Meta no nível da conta. Os cards de campanha usam o
            nível de campanha e podem divergir.
          </p>
        </div>
      )}
    </GlassCard>
  );
}
