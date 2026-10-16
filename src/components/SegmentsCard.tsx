import { useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumber } from '@/lib/format';
import { resumirSegmento, rotuloDoSegmento, type LinhaDeSegmento } from '@/lib/dashboard/segmentos';
import { unidadeDoResultado, pluralDoResultado } from '@/lib/dashboard/unidadeDoResultado';

/**
 * Para onde a verba foi — idade, posicionamento e região, num card só.
 *
 * Eram três cards lado a lado, como no benchmark. Um carrossel troca
 * largura por profundidade: cada recorte ganha a linha inteira, as barras
 * ficam legíveis e o bloco para de competir por espaço com a tabela de
 * campanhas. São três respostas para a MESMA pergunta — "com quem o
 * dinheiro foi gasto" —, e perguntas iguais cabem no mesmo lugar.
 *
 * O detalhe abre no próprio card, não num modal: um modal tira a pessoa do
 * painel para mostrar o aprofundamento de um bloco dele, e ao fechar ela
 * volta sem o contexto que tinha.
 */

export interface VistaDeSegmento {
  chave: string;
  titulo: string;
  subtitulo: string;
  linhas: LinhaDeSegmento[] | undefined;
  /** Um segundo recorte da mesma vista — "Plataforma" × "Posição". */
  alternativa?: { rotulo: string; linhas: LinhaDeSegmento[] | undefined };
}

interface SegmentsCardProps {
  vistas: VistaDeSegmento[];
  resultType?: string | null;
  carregando?: boolean;
}

export function SegmentsCard({ vistas, resultType, carregando }: SegmentsCardProps) {
  const [indice, setIndice] = useState(0);
  const [verAlternativa, setVerAlternativa] = useState(false);
  const [aberto, setAberto] = useState(false);
  const unidade = unidadeDoResultado(resultType);

  /* Só as vistas com dado entram no carrossel: navegar até um slide vazio
     é prometer informação e entregar moldura. */
  const comDado = useMemo(
    () => vistas.filter((v) => (v.linhas ?? []).some((l) => l?.spend > 0)),
    [vistas],
  );
  const vista = comDado[Math.min(indice, Math.max(0, comDado.length - 1))];

  const ativas = verAlternativa ? vista?.alternativa?.linhas : vista?.linhas;
  const resumo = useMemo(() => resumirSegmento(ativas), [ativas]);
  const completo = useMemo(() => resumirSegmento(ativas, 50), [ativas]);

  if (carregando) {
    return (
      <GlassCard className="h-[200px] animate-pulse bg-white/[0.02]">
        <span className="sr-only">Carregando segmentação</span>
      </GlassCard>
    );
  }
  if (!vista || resumo.fatias.length === 0) return null;

  const ir = (passo: number) => {
    setIndice((i) => (i + passo + comDado.length) % comDado.length);
    setVerAlternativa(false);
  };

  return (
    <GlassCard className="animate-fade-in space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-semibold">{vista.titulo}</h3>
          <p className="text-[11px] text-muted-foreground">
            {verAlternativa ? vista.alternativa!.rotulo : vista.subtitulo}
          </p>
        </div>

        {vista.alternativa && (
          <button
            type="button"
            onClick={() => setVerAlternativa((v) => !v)}
            className="rounded-full border border-white/15 px-2.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            {verAlternativa ? vista.subtitulo : vista.alternativa.rotulo}
          </button>
        )}

        {comDado.length > 1 && (
          <div className="ml-auto flex items-center gap-1">
            {/* Os pontos dizem quantos recortes existem — sem eles, o
                carrossel esconde que há mais a ver. */}
            <span className="mr-1 flex items-center gap-1">
              {comDado.map((v, i) => (
                <button
                  key={v.chave}
                  type="button"
                  onClick={() => { setIndice(i); setVerAlternativa(false); }}
                  aria-label={v.titulo}
                  aria-current={i === indice}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === indice ? 'w-4 bg-foreground/70' : 'w-1.5 bg-foreground/25 hover:bg-foreground/40',
                  )}
                />
              ))}
            </span>
            <button
              type="button" onClick={() => ir(-1)} aria-label="Recorte anterior"
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button" onClick={() => ir(1)} aria-label="Próximo recorte"
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-4 text-[11px]">
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
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
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
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-foreground/85 transition-colors hover:bg-white/[0.08] hover:text-foreground"
        >
          {aberto ? 'Ocultar detalhes' : `Ver todos os ${resumo.fatias.length + resumo.ocultas}`}
          <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', aberto && 'rotate-180')} />
        </button>
      )}

      {aberto && (
        <div className="animate-fade-in space-y-2.5 border-t border-white/10 pt-3">
          <div className="max-h-[260px] space-y-2.5 overflow-y-auto pr-1">
            {completo.fatias.map((f) => (
              <div key={f.chave} className="space-y-1 border-b border-white/5 pb-2 last:border-0">
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
