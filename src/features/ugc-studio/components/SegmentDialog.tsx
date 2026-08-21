import { useEffect, useState } from 'react';
import { Lightbulb, Loader2, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AVATAR_DURATIONS, UGC_RESOLUTIONS, UGC_SEGMENT_LABELS,
  countWords, estimatedCredits, wordBudget,
  type UgcResolution, type UgcSegment,
} from '../types/ugc';

export interface SegmentSubmit {
  speech: string;
  durationSeconds: number;
  resolution: UgcResolution;
}

interface SegmentDialogProps {
  segment: UgcSegment | null;
  /** Fala que veio do roteiro — o diálogo abre com ela pronta. */
  initialSpeech?: string;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (v: SegmentSubmit) => void;
}

/**
 * Configura e gera UM segmento do avatar falando.
 *
 * O contador de palavras é o coração desta tela. O vídeo é gerado com
 * duração FIXA, então a fala precisa caber no tempo: texto curto demais
 * deixa silêncio que o modelo preenche com balbucio, e longo demais faz a
 * frase ser cortada no meio. Trocar a duração recalcula o orçamento na
 * hora — é o que permite ao usuário decidir entre encurtar o texto e
 * comprar mais segundos.
 */
export function SegmentDialog({ segment, initialSpeech = '', busy = false, onClose, onSubmit }: SegmentDialogProps) {
  const [fala, setFala] = useState(initialSpeech);
  const [duracao, setDuracao] = useState<number>(8);
  const [resolucao, setResolucao] = useState<UgcResolution>('1080p');

  // Reabrir o diálogo em outro segmento tem que trazer a fala DAQUELE
  // segmento; sem isto o texto do anterior vazava para o novo.
  useEffect(() => { setFala(initialSpeech); }, [initialSpeech, segment]);

  if (!segment) return null;

  const orcamento = wordBudget(duracao);
  const palavras = countWords(fala);
  const excedeu = palavras > orcamento;
  const creditos = estimatedCredits('avatar', duracao, resolucao);

  return (
    <div className="ugc-dialog-backdrop" role="dialog" aria-modal="true" aria-label={`Gerar ${UGC_SEGMENT_LABELS[segment]}`}>
      <div className="ugc-dialog">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="ugc-segment-badge" data-segment={segment}>{UGC_SEGMENT_LABELS[segment]}</span>
            <h2 className="text-sm font-semibold text-white/92">Gerar segmento</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-1.5 text-white/50 hover:bg-white/[0.08] hover:text-white/90">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-2">
          <label htmlFor="ugc-fala" className="text-[13px] text-white/70">O que a pessoa fala?</label>
          <textarea
            id="ugc-fala"
            value={fala}
            onChange={(e) => setFala(e.target.value)}
            rows={4}
            className="ugc-field resize-none"
          />
          <div className="flex items-baseline justify-between">
            <span className={cn('metric-number text-[11px]', excedeu ? 'text-destructive' : 'text-white/45')}>
              {palavras} / ~{orcamento} palavras
            </span>
            <span className="metric-number text-[11px] text-white/45">para {duracao}s</span>
          </div>
        </div>

        <p className="flex items-start gap-2 rounded-[var(--wavy-radius-card)] border border-white/10 bg-white/[0.04] p-3 text-[11px] leading-relaxed text-white/62">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/50" />
          Preencha o tempo com fala. Curto demais e a IA completa o silêncio com balbucio; longo
          demais e a frase é cortada no meio.
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          {AVATAR_DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDuracao(d)}
              data-active={duracao === d}
              className="ugc-chip"
            >
              {d}s
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-white/10" aria-hidden />
          {UGC_RESOLUTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setResolucao(r)}
              data-active={resolucao === r}
              className="ugc-chip"
            >
              {r}
            </button>
          ))}
        </div>

        <footer className="space-y-1.5">
          <button
            type="button"
            onClick={() => onSubmit({ speech: fala, durationSeconds: duracao, resolution: resolucao })}
            disabled={busy || !fala.trim()}
            className="btn-accent inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Gerar avatar falando
            <span className="metric-number text-[12px] font-normal opacity-70">~{creditos} créditos</span>
          </button>
          <p className="text-center text-[11px] text-white/40">
            O resultado varia — pode ser preciso gerar de novo para a tomada certa.
          </p>
        </footer>
      </div>
    </div>
  );
}
