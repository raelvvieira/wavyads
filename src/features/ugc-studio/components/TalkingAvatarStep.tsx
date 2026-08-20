import { AlertTriangle, ArrowRight, Info, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UGC_SEGMENTS, UGC_SEGMENT_LABELS, type UgcClip, type UgcScript, type UgcSegment } from '../types/ugc';

interface TalkingAvatarStepProps {
  avatarName: string | null;
  avatarImageUrl: string | null;
  script: UgcScript | null;
  clips: UgcClip[];
  onOpenSegment: (segment: UgcSegment) => void;
  onRetry: (clip: UgcClip) => void;
  onBack: () => void;
  onNext: () => void;
}

/**
 * Etapa 2: os quatro segmentos do avatar falando.
 *
 * Todos opcionais e em qualquer ordem — é assim porque cada segmento vira um
 * clipe independente na montagem final, e obrigar os quatro forçaria o
 * usuário a pagar por material que ele talvez não use. O contador no canto
 * existe justamente para tornar visível o que ainda falta sem transformar
 * isso em bloqueio.
 */
export function TalkingAvatarStep({
  avatarName, avatarImageUrl, script, clips, onOpenSegment, onRetry, onBack, onNext,
}: TalkingAvatarStepProps) {
  const porSegmento = new Map<UgcSegment, UgcClip>();
  for (const c of clips) {
    if (c.segment && (!porSegmento.has(c.segment) || c.status === 'ready')) porSegmento.set(c.segment, c);
  }
  const prontos = UGC_SEGMENTS.filter((s) => porSegmento.get(s)?.status === 'ready').length;

  return (
    <section className="ugc-step" aria-label="Avatar falando">
      <header>
        <h2 className="text-base font-semibold text-white/92">Avatar falando</h2>
        <p className="text-[13px] text-white/50">Cada parte vira um clipe próprio</p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex items-center gap-3 rounded-[var(--wavy-radius-card)] border border-white/10 bg-white/[0.03] p-3">
          {avatarImageUrl
            ? <img src={avatarImageUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
            : <span className="h-11 w-11 shrink-0 rounded-full bg-white/10" aria-hidden />}
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-white/88">{avatarName ?? 'Sem avatar'}</p>
            <p className="text-[11px] text-white/45">Travado para este projeto</p>
          </div>
        </div>

        {/* O aviso existe porque a expectativa errada aqui custa caro: quem
            acha que está gerando só a voz pede os quatro segmentos e paga
            quatro vídeos sem saber. */}
        <p className="flex items-start gap-2 rounded-[var(--wavy-radius-card)] border border-[var(--wavy-info-border,rgba(80,140,255,0.35))] bg-[rgba(80,140,255,0.08)] p-3 text-[11px] leading-relaxed text-white/72">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/60" />
          {/* O texto vai num span só: sem ele, o `flex` do parágrafo faz de
              cada nó de texto um item e a frase quebra em colunas. */}
          <span>
            Você está gerando <strong className="font-semibold">vídeo</strong>, não só áudio. Cada
            segmento é um clipe. Na montagem, a maior parte costuma ficar sob o B-roll — e só a voz
            atravessa o anúncio.
          </span>
        </p>
      </div>

      <div className="flex items-baseline justify-between">
        <p className="text-[12px] text-white/55">Clique em uma parte para configurar e gerar — todas opcionais</p>
        <span className="metric-number text-[11px] text-white/45">{prontos} de 4 prontos</span>
      </div>

      <ul className="space-y-2">
        {UGC_SEGMENTS.map((seg) => {
          const clipe = porSegmento.get(seg);
          const fala = script?.[seg]?.trim();
          const gerando = clipe?.status === 'generating' || clipe?.status === 'queued';
          const falhou = clipe?.status === 'failed';
          return (
            <li key={seg}>
              <div className="ugc-segment-row" data-status={clipe?.status ?? 'empty'}>
                <span className="ugc-segment-badge" data-segment={seg}>{UGC_SEGMENT_LABELS[seg]}</span>

                <span className="min-w-0 flex-1 truncate text-[12px] text-white/62">
                  {falhou
                    ? <span className="text-white/60">{clipe?.errorMessage ?? 'A geração falhou.'}</span>
                    : fala || <span className="text-white/35">(vazio — escreva no roteiro ou aqui)</span>}
                </span>

                {clipe?.status === 'ready' && (
                  <span className="metric-number shrink-0 text-[11px] text-white/45">{clipe.durationSeconds}s</span>
                )}

                {gerando ? (
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] text-white/55">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Gerando
                  </span>
                ) : falhou ? (
                  <button type="button" onClick={() => onRetry(clipe!)} className="ugc-row-action">
                    <RefreshCw className="h-3.5 w-3.5" /> Tentar de novo
                  </button>
                ) : (
                  <button type="button" onClick={() => onOpenSegment(seg)} className="ugc-row-action">
                    {clipe?.status === 'ready' ? 'Gerar outra' : 'Gerar'}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {clipe?.status === 'ready' && clipe.url && (
                <video src={clipe.url} controls playsInline className={cn('mt-1.5 w-full max-w-[220px] rounded-[var(--wavy-radius-card)] border border-white/10')} />
              )}
            </li>
          );
        })}
      </ul>

      {!script && (
        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-white/45">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Sem roteiro, cada segmento começa em branco. Dá para escrever a fala direto no diálogo.
        </p>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={onBack} className="btn-glass flex-1 rounded-xl py-2.5 text-sm font-medium">
          Voltar ao roteiro
        </button>
        <button type="button" onClick={onNext} className="btn-accent flex-1 rounded-xl py-2.5 text-sm font-semibold">
          Seguir para o B-Roll
        </button>
      </div>
    </section>
  );
}
