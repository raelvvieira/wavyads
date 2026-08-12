import { useEffect, useState } from 'react';
import { BrainCircuit, Check, ImagePlus, Loader2, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EffectiveDesignSystem } from '../api/creativeReferences';
import type { CreativeAsset } from '../types/creative';

async function filesToDataUrls(files: FileList): Promise<string[]> {
  const images = Array.from(files).filter((file) => file.type.startsWith('image/'));
  return Promise.all(images.map((file) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Falha ao ler a imagem'));
    reader.readAsDataURL(file);
  })));
}

function Chip({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'accent' | 'danger' }) {
  return (
    <span className={cn(
      'rounded-full px-2 py-0.5 text-[10px]',
      tone === 'accent' && 'bg-[var(--studio-accent)]/15 text-[var(--studio-accent)]',
      tone === 'danger' && 'border border-destructive/30 bg-destructive/10 text-destructive',
      tone === 'neutral' && 'bg-white/[0.06] text-[var(--studio-text-secondary)]',
    )}>
      {children}
    </span>
  );
}

interface ReferencesPanelProps {
  projectReferences: CreativeAsset[];
  clientReferences: CreativeAsset[];
  designSystem: EffectiveDesignSystem;
  busy: 'upload' | 'analyze' | null;
  hasClient: boolean;
  onUpload: (dataUrls: string[]) => void;
  onRemove: (assetId: string) => void;
  onAnalyze: (options: { alsoSaveToClient: boolean }) => void;
  onSaveManualDoc: (doc: string) => void;
}

export function ReferencesPanel({
  projectReferences,
  clientReferences,
  designSystem,
  busy,
  hasClient,
  onUpload,
  onRemove,
  onAnalyze,
  onSaveManualDoc,
}: ReferencesPanelProps) {
  const [doc, setDoc] = useState(designSystem.designSystemDoc);
  const [alsoSaveToClient, setAlsoSaveToClient] = useState(false);
  const analysis = designSystem.analysis;

  // A análise chega de forma assíncrona; sem isso o textarea ficaria com o
  // documento antigo depois de analisar.
  useEffect(() => { setDoc(designSystem.designSystemDoc); }, [designSystem.designSystemDoc]);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-baseline gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--studio-text-secondary)]">
            Referências deste projeto
          </h3>
          <span className="text-[11px] text-[var(--studio-text-tertiary)]">{projectReferences.length}</span>
        </div>

        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(140px,100%),1fr))]">
          {projectReferences.map((reference) => (
            <div key={reference.id} className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--studio-border)]">
              {reference.url && <img src={reference.url} alt="" loading="lazy" className="h-full w-full object-cover" />}
              <button
                type="button"
                onClick={() => onRemove(reference.id)}
                title="Remover"
                className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white opacity-0 transition-opacity hover:bg-black group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          <label
            className={cn(
              'flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--studio-border)] text-[var(--studio-text-tertiary)] transition-colors',
              'hover:border-[var(--studio-border-hover)] hover:text-[var(--studio-text-secondary)]',
              busy === 'upload' && 'pointer-events-none opacity-50',
            )}
          >
            {busy === 'upload' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            <span className="text-[10px]">Enviar</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async (event) => {
                if (!event.target.files) return;
                onUpload(await filesToDataUrls(event.target.files));
                event.target.value = '';
              }}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy !== null || projectReferences.length === 0}
            onClick={() => onAnalyze({ alsoSaveToClient })}
            className={cn(
              'flex items-center gap-2 rounded-lg bg-[var(--studio-accent)] px-3.5 py-2 text-[11px] font-semibold text-white transition',
              'hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40',
            )}
          >
            {busy === 'analyze' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {busy === 'analyze' ? 'Analisando...' : 'Extrair direção visual'}
          </button>

          {hasClient && (
            <label className="flex cursor-pointer items-center gap-2 text-[11px] text-[var(--studio-text-secondary)]">
              <input
                type="checkbox"
                checked={alsoSaveToClient}
                onChange={(event) => setAlsoSaveToClient(event.target.checked)}
                className="h-3.5 w-3.5 accent-[var(--studio-accent)]"
              />
              Salvar também como identidade do cliente
            </label>
          )}
        </div>
      </section>

      {clientReferences.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--studio-text-secondary)]">
              Base do cliente
            </h3>
            <span className="text-[11px] text-[var(--studio-text-tertiary)]">{clientReferences.length}</span>
            <span className="text-[11px] text-[var(--studio-text-tertiary)]">· de outros projetos</span>
          </div>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(120px,100%),1fr))]">
            {clientReferences.map((reference) => (
              <div key={reference.id} className="aspect-square overflow-hidden rounded-xl border border-[var(--studio-border)] opacity-70">
                {reference.url && <img src={reference.url} alt="" loading="lazy" className="h-full w-full object-cover" />}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--studio-text-secondary)]">
            Direção visual
          </h3>
          {designSystem.source === 'project' && <Chip tone="accent"><Check className="mr-1 inline h-2.5 w-2.5" />deste projeto</Chip>}
          {designSystem.source === 'client' && <Chip tone="accent"><BrainCircuit className="mr-1 inline h-2.5 w-2.5" />identidade do cliente</Chip>}
          {designSystem.source === 'none' && <Chip>ainda não definida</Chip>}
        </div>

        {analysis && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--studio-border)] bg-[var(--studio-surface-2)] p-3">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-[var(--studio-text-tertiary)]">Paleta</p>
              <div className="flex flex-wrap gap-1.5">
                {(analysis.paleta?.hexes ?? []).map((hex) => (
                  <span key={hex} className="flex items-center gap-1 rounded-full border border-[var(--studio-border)] px-2 py-0.5 text-[10px] text-[var(--studio-text-secondary)]">
                    <span className="h-2.5 w-2.5 rounded-full border border-white/20" style={{ background: hex }} />
                    {hex}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-[var(--studio-border)] bg-[var(--studio-surface-2)] p-3">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-[var(--studio-text-tertiary)]">Mood</p>
              <div className="flex flex-wrap gap-1.5">
                {(analysis.mood?.adjetivos ?? []).map((item) => <Chip key={item} tone="accent">{item}</Chip>)}
                {(analysis.mood?.evita ?? []).map((item) => <Chip key={item} tone="danger">evita: {item}</Chip>)}
              </div>
            </div>
          </div>
        )}

        <textarea
          value={doc}
          onChange={(event) => setDoc(event.target.value)}
          rows={10}
          placeholder="Paleta, tipografia, composição, tratamento fotográfico, o que evitar..."
          className={cn(
            'w-full resize-y rounded-xl border border-[var(--studio-border)] bg-[var(--studio-surface-2)] p-3 font-mono text-[11px] leading-relaxed text-[var(--studio-text)]',
            'placeholder:text-[var(--studio-text-tertiary)] focus:border-[var(--studio-accent)] focus:outline-none',
          )}
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSaveManualDoc(doc)}
            disabled={doc === designSystem.designSystemDoc}
            className={cn(
              'rounded-lg border border-[var(--studio-border)] bg-[var(--studio-surface-2)] px-3 py-2 text-[11px] text-[var(--studio-text-secondary)] transition-colors',
              'hover:border-[var(--studio-border-hover)] hover:text-[var(--studio-text)] disabled:cursor-not-allowed disabled:opacity-40',
            )}
          >
            Salvar direção visual
          </button>
          <p className="text-[10px] text-[var(--studio-text-tertiary)]">
            Aplicada automaticamente em toda arte nova deste projeto.
          </p>
        </div>
      </section>
    </div>
  );
}
