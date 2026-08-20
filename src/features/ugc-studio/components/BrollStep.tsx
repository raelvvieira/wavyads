import { useState } from 'react';
import { Check, Info, Loader2, Sparkles, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BROLL_ANGLES, BROLL_DURATION_RANGE, UGC_RESOLUTIONS,
  estimatedCredits, type UgcResolution,
} from '../types/ugc';

export interface BrollSubmit {
  angleIds: string[];
  durationSeconds: number;
  resolution: UgcResolution;
  audio: boolean;
}

interface BrollStepProps {
  productImageUrl: string | null;
  onUploadProductImage: (dataUrl: string) => void;
  busy?: boolean;
  onBack: () => void;
  onGenerate: (v: BrollSubmit) => void;
}

/**
 * Etapa 3: os clipes de produto.
 *
 * Multi-seleção de ângulos, diferente do avatar, onde cada segmento é gerado
 * sozinho. A razão é econômica: um clipe de B-roll custa uma fração de um
 * clipe de avatar falando, e a montagem final precisa de vários — pedir um
 * de cada vez seria oito idas e voltas para o material mais barato do fluxo.
 *
 * A duração aqui é um slider, e não os chips do avatar, porque não há fala
 * para orçar: o tempo é escolha de ritmo, não restrição de conteúdo.
 */
export function BrollStep({ productImageUrl, onUploadProductImage, busy = false, onBack, onGenerate }: BrollStepProps) {
  const [selecionados, setSelecionados] = useState<string[]>([BROLL_ANGLES[0].id]);
  const [duracao, setDuracao] = useState(5);
  const [resolucao, setResolucao] = useState<UgcResolution>('1080p');
  const [audio, setAudio] = useState(true);
  const [arrastando, setArrastando] = useState(false);

  const alternar = (id: string) =>
    setSelecionados((atual) => atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]);

  const custo = Math.round(selecionados.length * estimatedCredits('broll', duracao, resolucao) * 10) / 10;

  function lerArquivo(file: File | undefined | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onUploadProductImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <section className="ugc-step" aria-label="B-Roll">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white/92">B-Roll</h2>
          <p className="text-[13px] text-white/50">Clipes de produto para cobrir a fala</p>
        </div>
        <p className="flex max-w-[380px] items-start gap-2 rounded-[var(--wavy-radius-card)] border border-[var(--wavy-info-border,rgba(80,140,255,0.35))] bg-[rgba(80,140,255,0.08)] p-3 text-[11px] leading-relaxed text-white/72">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/60" />
          <span>
            Gere quantos precisar. Como regra, um clipe a cada 5-8s de anúncio. Misturar ângulos é o
            que evita a repetição visual.
          </span>
        </p>
      </header>

      <label
        onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastando(false); lerArquivo(e.dataTransfer.files?.[0]); }}
        data-dragging={arrastando}
        className="ugc-dropzone ugc-dropzone-wide"
      >
        <input type="file" accept="image/*" className="sr-only" aria-label="Imagem do produto" onChange={(e) => lerArquivo(e.target.files?.[0])} />
        {productImageUrl ? (
          <div className="flex items-center gap-3">
            <img src={productImageUrl} alt="Produto" className="h-14 w-14 rounded-lg object-cover" />
            <span className="text-[12px] text-white/55">Trocar imagem do produto</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Upload className="h-5 w-5 text-white/45" />
            <span className="text-[12px] text-white/55">
              Imagem do produto — funciona melhor com produtos sem texto
            </span>
          </div>
        )}
      </label>

      <div>
        <p className="wavy-caps mb-2 text-[10px] font-semibold uppercase text-white/45">Ângulo de câmera</p>
        <div className="ugc-angle-grid">
          {BROLL_ANGLES.map((a) => {
            const ativo = selecionados.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => alternar(a.id)}
                aria-pressed={ativo}
                data-active={ativo}
                className="ugc-angle-card"
                style={{ background: `linear-gradient(150deg, ${a.gradient[0]}, ${a.gradient[1]})` }}
              >
                <span className="ugc-angle-check" aria-hidden>{ativo && <Check className="h-3 w-3" strokeWidth={3} />}</span>
                <span className="ugc-angle-label">{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="ugc-duracao" className="text-[12px] text-white/60">Duração</label>
          <span className="metric-number text-[12px] text-white/80">{duracao}s</span>
        </div>
        <input
          id="ugc-duracao"
          type="range"
          min={BROLL_DURATION_RANGE.min}
          max={BROLL_DURATION_RANGE.max}
          step={BROLL_DURATION_RANGE.step}
          value={duracao}
          onChange={(e) => setDuracao(Number(e.target.value))}
          className="ugc-slider"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {UGC_RESOLUTIONS.map((r) => (
            <button key={r} type="button" onClick={() => setResolucao(r)} data-active={resolucao === r} className="ugc-chip">
              {r}
            </button>
          ))}
          <button type="button" onClick={() => setAudio((v) => !v)} data-active={audio} className="ugc-chip">
            {audio ? 'Com áudio' : 'Sem áudio'}
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={onBack} className="btn-glass flex-1 rounded-xl py-2.5 text-sm font-medium">
          Voltar ao avatar
        </button>
        <button
          type="button"
          onClick={() => onGenerate({ angleIds: selecionados, durationSeconds: duracao, resolution: resolucao, audio })}
          disabled={busy || selecionados.length === 0}
          className={cn(
            'btn-accent inline-flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold',
            'disabled:cursor-not-allowed disabled:opacity-40',
          )}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Gerar {selecionados.length} {selecionados.length === 1 ? 'clipe' : 'clipes'}
          <span className="metric-number text-[12px] font-normal opacity-70">~{custo} créditos</span>
        </button>
      </div>
    </section>
  );
}
