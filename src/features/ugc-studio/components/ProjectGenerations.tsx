import { ArrowRight, Download, Film, Loader2, Mic, RefreshCw } from 'lucide-react';
import type { UgcClip } from '../types/ugc';
import { brollAngle, UGC_SEGMENT_LABELS } from '../types/ugc';

interface ProjectGenerationsProps {
  clips: UgcClip[];
  onGoToStep: (step: 'avatar' | 'broll') => void;
  onRetry: (clip: UgcClip) => void;
}

/**
 * Todo o material do projeto, pronto para baixar.
 *
 * Esta é a saída do produto — não há montagem aqui, e é de propósito: o
 * UGC Studio entrega matéria-prima com identidade travada (mesma pessoa,
 * mesmo produto), e a edição acontece onde o usuário já edita.
 *
 * As duas gavetas ficam separadas porque servem a papéis distintos na
 * montagem: o avatar carrega a voz, o B-roll cobre a imagem. Misturá-los
 * numa grade só obrigaria o usuário a reclassificar tudo na hora de cortar.
 */
export function ProjectGenerations({ clips, onGoToStep, onRetry }: ProjectGenerationsProps) {
  const avatar = clips.filter((c) => c.kind === 'avatar');
  const broll = clips.filter((c) => c.kind === 'broll');

  return (
    <section className="ugc-step" aria-label="Gerações do projeto">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white/92">Gerações do projeto</h2>
          <p className="text-[13px] text-white/50">Todo o material deste fluxo, para baixar</p>
        </div>
      </header>

      <Gaveta
        titulo="Clipes de avatar"
        icone={Mic}
        clips={avatar}
        vazio="Nenhum clipe de avatar ainda"
        dica="Gere as partes na etapa do avatar falando."
        onIr={() => onGoToStep('avatar')}
        onRetry={onRetry}
        rotulo={(c) => (c.segment ? UGC_SEGMENT_LABELS[c.segment] : 'Clipe')}
      />

      <Gaveta
        titulo="Clipes de B-roll"
        icone={Film}
        clips={broll}
        vazio="Nenhum clipe de B-roll ainda"
        dica="Gere clipes de produto na etapa do B-Roll."
        onIr={() => onGoToStep('broll')}
        onRetry={onRetry}
        rotulo={(c) => brollAngle(c.anglePreset)?.label ?? 'Clipe'}
      />
    </section>
  );
}

function Gaveta({
  titulo, icone: Icone, clips, vazio, dica, onIr, onRetry, rotulo,
}: {
  titulo: string;
  icone: typeof Mic;
  clips: UgcClip[];
  vazio: string;
  dica: string;
  onIr: () => void;
  onRetry: (clip: UgcClip) => void;
  rotulo: (clip: UgcClip) => string;
}) {
  const prontos = clips.filter((c) => c.status === 'ready').length;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="wavy-caps text-[10px] font-semibold uppercase text-white/45">{titulo}</p>
        <span className="metric-number text-[11px] text-white/45">{prontos} pronto{prontos === 1 ? '' : 's'}</span>
      </div>

      {clips.length === 0 ? (
        <div className="ugc-empty">
          <Icone className="h-6 w-6 text-white/25" />
          <p className="text-[13px] font-medium text-white/70">{vazio}</p>
          <p className="text-[12px] text-white/45">{dica}</p>
          <button type="button" onClick={onIr} className="btn-glass mt-1 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium">
            Gerar <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <ul className="ugc-clip-grid">
          {clips.map((c) => (
            <li key={c.id} className="ugc-clip-card" data-status={c.status}>
              {c.status === 'ready' && c.url ? (
                <video src={c.url} controls playsInline className="w-full rounded-t-[var(--wavy-radius-card)]" />
              ) : c.status === 'failed' ? (
                <div className="ugc-clip-state">
                  <p className="line-clamp-3 text-[11px] leading-snug text-white/60">
                    {c.errorMessage ?? 'A geração falhou.'}
                  </p>
                  <button type="button" onClick={() => onRetry(c)} className="ugc-row-action">
                    <RefreshCw className="h-3.5 w-3.5" /> Tentar de novo
                  </button>
                </div>
              ) : (
                <div className="ugc-clip-state">
                  <Loader2 className="h-5 w-5 animate-spin text-white/45" />
                  <span className="text-[11px] text-white/50">Gerando</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                <span className="truncate text-[11px] font-medium text-white/78">{rotulo(c)}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="metric-number text-[10px] text-white/45">{c.durationSeconds}s</span>
                  {c.status === 'ready' && c.url && (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={`Baixar ${rotulo(c)}`}
                      className="rounded-full p-1 text-white/55 hover:bg-white/[0.08] hover:text-white/90"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
