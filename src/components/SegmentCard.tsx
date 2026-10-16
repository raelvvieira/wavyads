import { useMemo, useState } from 'react';
import { GlassCard } from './GlassCard';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumber } from '@/lib/format';
import { resumirSegmento, rotuloDoSegmento, type LinhaDeSegmento } from '@/lib/dashboard/segmentos';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * Para onde a verba foi, dentro de um recorte.
 *
 * Três destes lado a lado — idade, plataforma, região — respondem a
 * pergunta que o painel nunca respondeu: não quanto foi gasto, mas com
 * QUEM. É o bloco que o benchmark tem e nós não tínhamos, e o que o cliente
 * pediu por nome.
 *
 * Minimalista pela mesma régua dos outros: barra, número, proporção. O
 * resto — a lista inteira, custo por resultado, receita por linha — fica
 * atrás de "Ver detalhes", para quem tiver a pergunta seguinte.
 */

interface SegmentCardProps {
  titulo: string;
  subtitulo: string;
  linhas: LinhaDeSegmento[] | undefined;
  /** O que a campanha entrega: lead, compra, conversa. */
  resultLabel?: string;
  /** Um segundo recorte do mesmo card — "Plataforma" × "Posição". */
  alternativa?: { rotulo: string; linhas: LinhaDeSegmento[] | undefined };
  carregando?: boolean;
}

export function SegmentCard({
  titulo, subtitulo, linhas, resultLabel = 'resultado', alternativa, carregando,
}: SegmentCardProps) {
  const [verAlternativa, setVerAlternativa] = useState(false);
  const [aberto, setAberto] = useState(false);

  const ativas = verAlternativa ? alternativa?.linhas : linhas;
  const resumo = useMemo(() => resumirSegmento(ativas), [ativas]);
  const completo = useMemo(() => resumirSegmento(ativas, 50), [ativas]);

  if (carregando) {
    return <GlassCard className="h-[180px] animate-pulse bg-white/[0.02]"><span className="sr-only">Carregando segmentação</span></GlassCard>;
  }
  /* Card vazio com título promete informação e entrega moldura. */
  if (resumo.fatias.length === 0) return null;

  return (
    <>
      <GlassCard className="animate-fade-in space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{titulo}</h4>
            <p className="text-xs text-foreground/70">{verAlternativa ? alternativa!.rotulo : subtitulo}</p>
          </div>
          {alternativa && (
            <button
              type="button"
              onClick={() => setVerAlternativa((v) => !v)}
              className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            >
              {verAlternativa ? subtitulo : alternativa.rotulo}
            </button>
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
            onClick={() => setAberto(true)}
            className="text-[11px] text-foreground/70 underline underline-offset-2 transition-colors hover:text-foreground"
          >
            Ver detalhes
          </button>
        )}
      </GlassCard>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">
              {titulo} · {verAlternativa ? alternativa!.rotulo : subtitulo}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2.5 overflow-y-auto pr-1">
            {completo.fatias.map((f) => (
              <div key={f.chave} className="space-y-1 border-b border-white/5 pb-2 last:border-0">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate text-foreground/90">{rotuloDoSegmento(f.chave)}</span>
                  <span className="metric-number text-muted-foreground">
                    {formatCurrency(f.spend)} · {f.percentual.toFixed(1)}%
                  </span>
                </div>
                <div className="flex gap-3 text-[10px] text-muted-foreground">
                  <span>{formatNumber(f.impressions)} impressões</span>
                  {f.results > 0 && (
                    <span>
                      {f.results} {resultLabel}
                      {f.results === 1 ? '' : 's'} · {formatCurrency(f.cost_per_result)} cada
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
        </DialogContent>
      </Dialog>
    </>
  );
}
