import { useState } from 'react';
import { AlertTriangle, Loader2, Sparkles, Upload } from 'lucide-react';
import { UGC_SEGMENTS, UGC_SEGMENT_HINTS, UGC_SEGMENT_LABELS, countWords, emptyScript, wordBudget, type UgcScript } from '../types/ugc';
import { cn } from '@/lib/utils';

interface ScriptWriterStepProps {
  script: UgcScript | null;
  productDescription: string;
  onProductDescriptionChange: (v: string) => void;
  productImageUrl: string | null;
  onUploadProductImage: (dataUrl: string) => void;
  durationSeconds: number;
  busy?: boolean;
  erro?: string | null;
  onGenerate: () => void;
  onScriptChange: (script: UgcScript) => void;
  onNext: () => void;
}

/**
 * Etapa 1: o roteiro.
 *
 * A IA escreve os quatro segmentos, mas o resultado chega EDITÁVEL. Roteiro
 * é a única peça do fluxo em que o usuário costuma ter opinião forte — ele
 * conhece o cliente e sabe o que não pode ser dito — e um texto que só dá
 * para aceitar ou regerar transformaria uma correção de duas palavras num
 * novo ciclo inteiro.
 */
export function ScriptWriterStep({
  script, productDescription, onProductDescriptionChange, productImageUrl,
  onUploadProductImage, durationSeconds, busy = false, erro = null,
  onGenerate, onScriptChange, onNext,
}: ScriptWriterStepProps) {
  const [arrastando, setArrastando] = useState(false);
  const atual = script ?? emptyScript();
  const orcamento = wordBudget(durationSeconds);

  function lerArquivo(file: File | undefined | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onUploadProductImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <section className="ugc-step" aria-label="Roteiro">
      <header>
        <h2 className="text-base font-semibold text-white/92">Roteiro</h2>
        <p className="text-[13px] text-white/50">
          A IA escreve em quatro partes, no tom de quem grava com o celular na mão
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <textarea
          value={productDescription}
          onChange={(e) => onProductDescriptionChange(e.target.value)}
          placeholder="Descreva o produto ou do que é o anúncio…"
          aria-label="Descrição do produto"
          rows={5}
          className="ugc-field resize-none"
        />

        <label
          onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => { e.preventDefault(); setArrastando(false); lerArquivo(e.dataTransfer.files?.[0]); }}
          data-dragging={arrastando}
          className="ugc-dropzone md:w-[260px]"
        >
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Imagem do produto"
            onChange={(e) => lerArquivo(e.target.files?.[0])}
          />
          {productImageUrl ? (
            <img src={productImageUrl} alt="Produto" className="max-h-[120px] rounded-lg object-contain" />
          ) : (
            <>
              <Upload className="h-5 w-5 text-white/45" />
              <span className="text-[12px] text-white/55">Imagem do produto</span>
              <span className="text-[11px] text-white/35">opcional — ajuda a IA a entender a oferta</span>
            </>
          )}
        </label>
      </div>

      {erro && (
        <p className="flex items-start gap-2 rounded-[var(--wavy-radius-card)] border border-destructive/30 bg-destructive/10 p-3 text-xs leading-relaxed text-white/78">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
          {erro}
        </p>
      )}

      <button
        type="button"
        onClick={onGenerate}
        disabled={busy || !productDescription.trim()}
        className="btn-accent inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {busy ? 'Escrevendo…' : script ? 'Escrever de novo' : 'Escrever roteiro'}
      </button>

      {script && (
        <>
          <div className="space-y-3">
            {UGC_SEGMENTS.map((seg) => {
              const palavras = countWords(atual[seg]);
              // O orçamento não é enfeite: texto curto demais faz o gerador
              // preencher o silêncio com balbucio, e longo demais corta a
              // fala no meio. Por isso o excesso é sinalizado, não bloqueado.
              const excedeu = palavras > orcamento;
              return (
                <div key={seg} className="ugc-segment-edit">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] font-medium text-white/85">{UGC_SEGMENT_LABELS[seg]}</span>
                    <span className={cn('metric-number text-[11px]', excedeu ? 'text-destructive' : 'text-white/40')}>
                      {palavras} / ~{orcamento} palavras
                    </span>
                  </div>
                  <p className="text-[11px] leading-snug text-white/40">{UGC_SEGMENT_HINTS[seg]}</p>
                  <textarea
                    value={atual[seg]}
                    onChange={(e) => onScriptChange({ ...atual, [seg]: e.target.value })}
                    aria-label={UGC_SEGMENT_LABELS[seg]}
                    rows={2}
                    className="ugc-field resize-none text-[13px]"
                  />
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onNext}
            className="btn-glass inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium"
          >
            Seguir para o avatar falando
          </button>
        </>
      )}
    </section>
  );
}
