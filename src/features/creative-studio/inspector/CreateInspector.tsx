import { useState } from 'react';
import { ImageIcon, Loader2, Plus, Wand2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ASPECT_CONFIG } from '../constants/formats';
import type { ClientOption } from '../api/creativeProjects';
import type { CreativeAspectRatio, CreativeResolution } from '../types/creative';

export interface CreateFormValues {
  businessContext: string;
  copyText: string;
  designSystemDoc: string;
  aspectRatio: CreativeAspectRatio;
  resolution: CreativeResolution;
  clientId: string | null;
  productImages: string[];
  logoImage: string | null;
}

const RESOLUTIONS: { id: CreativeResolution; label: string }[] = [
  { id: '1K', label: '1K' },
  { id: '2K', label: '2K' },
  { id: '4K', label: '4K' },
];

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] text-[var(--studio-text-tertiary)]">{label}</p>
      {children}
      {hint && <p className="mt-1 text-[10px] leading-relaxed text-[var(--studio-text-tertiary)]">{hint}</p>}
    </div>
  );
}

const inputClass = cn(
  'w-full rounded-lg border border-[var(--studio-border)] bg-[var(--studio-surface-2)] p-2.5 text-[12px] text-[var(--studio-text)]',
  'placeholder:text-[var(--studio-text-tertiary)] focus:border-[var(--studio-accent)] focus:outline-none disabled:opacity-40',
);

async function filesToDataUrls(files: FileList): Promise<string[]> {
  const images = Array.from(files).filter((file) => file.type.startsWith('image/'));
  return Promise.all(images.map((file) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Falha ao ler a imagem'));
    reader.readAsDataURL(file);
  })));
}

function ImagePicker({
  images,
  onChange,
  max,
  label,
  disabled,
}: {
  images: string[];
  onChange: (next: string[]) => void;
  max: number;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {images.map((image, index) => (
        <div key={index} className="relative h-14 w-14 overflow-hidden rounded-lg border border-[var(--studio-border)]">
          <img src={image} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(images.filter((_, i) => i !== index))}
            className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white hover:bg-black"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      ))}
      {images.length < max && (
        <label
          className={cn(
            'flex h-14 w-14 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-[var(--studio-border)] text-[var(--studio-text-tertiary)] transition-colors',
            'hover:border-[var(--studio-border-hover)] hover:text-[var(--studio-text-secondary)]',
            disabled && 'pointer-events-none opacity-40',
          )}
          title={label}
        >
          <Plus className="h-3.5 w-3.5" />
          <ImageIcon className="h-3 w-3" />
          <input
            type="file"
            accept="image/*"
            multiple={max > 1}
            className="hidden"
            disabled={disabled}
            onChange={async (event) => {
              if (!event.target.files) return;
              const added = await filesToDataUrls(event.target.files);
              onChange([...images, ...added].slice(0, max));
              event.target.value = '';
            }}
          />
        </label>
      )}
    </div>
  );
}

interface CreateInspectorProps {
  clients: ClientOption[];
  defaults: { aspectRatio: CreativeAspectRatio; resolution: CreativeResolution; clientId: string | null };
  busy: boolean;
  /** De onde vem a direção visual que será aplicada se o campo abaixo ficar vazio. */
  designSystemSource: 'project' | 'client' | 'none';
  onOpenReferences: () => void;
  onGenerate: (values: CreateFormValues) => void;
}

export function CreateInspector({
  clients,
  defaults,
  busy,
  designSystemSource,
  onOpenReferences,
  onGenerate,
}: CreateInspectorProps) {
  const [businessContext, setBusinessContext] = useState('');
  const [copyText, setCopyText] = useState('');
  const [designSystemDoc, setDesignSystemDoc] = useState('');
  const [aspectRatio, setAspectRatio] = useState<CreativeAspectRatio>(defaults.aspectRatio);
  const [resolution, setResolution] = useState<CreativeResolution>(defaults.resolution);
  const [clientId, setClientId] = useState<string | null>(defaults.clientId);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [logoImages, setLogoImages] = useState<string[]>([]);

  const canGenerate = businessContext.trim().length > 0 && !busy;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--studio-text-secondary)]">
          Criar
        </h3>
        <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--studio-text-tertiary)]">
          Descreva o negócio e a arte. Depois de gerada, selecione-a no quadro para editar, variar
          ou redimensionar — nada é sobrescrito.
        </p>
      </div>

      <Field label="O que estamos anunciando?">
        <textarea
          value={businessContext}
          onChange={(event) => setBusinessContext(event.target.value)}
          rows={3}
          disabled={busy}
          placeholder="Ex.: clínica de estética premium, Botox Day, foco em naturalidade"
          className={cn(inputClass, 'resize-none')}
        />
      </Field>

      <Field
        label="Copy da arte (opcional)"
        hint="Se preenchida, o texto é renderizado exatamente como escrito — nada é inventado além dele."
      >
        <textarea
          value={copyText}
          onChange={(event) => setCopyText(event.target.value)}
          rows={3}
          disabled={busy}
          placeholder="Título, subtítulo, CTA..."
          className={cn(inputClass, 'resize-none')}
        />
      </Field>

      <div className="rounded-xl border border-[var(--studio-border)] bg-[var(--studio-surface-2)] p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-[var(--studio-text-secondary)]">
            {designSystemSource === 'project' && '✓ Direção visual do projeto'}
            {designSystemSource === 'client' && '✓ Identidade do cliente'}
            {designSystemSource === 'none' && 'Sem direção visual'}
          </span>
          <button
            type="button"
            onClick={onOpenReferences}
            className="shrink-0 text-[11px] text-[var(--studio-accent)] underline underline-offset-2 hover:brightness-125"
          >
            {designSystemSource === 'none' ? 'Definir' : 'Ver'}
          </button>
        </div>
        <p className="mt-1 text-[10px] leading-relaxed text-[var(--studio-text-tertiary)]">
          {designSystemSource === 'none'
            ? 'Envie referências para a IA extrair paleta, tipografia e composição — é o que mais muda a qualidade.'
            : 'Aplicada automaticamente. O campo abaixo sobrescreve só desta vez.'}
        </p>
      </div>

      <Field
        label="Sobrescrever direção visual (opcional)"
        hint="Preenchido, substitui a direção visual acima apenas nesta geração."
      >
        <textarea
          value={designSystemDoc}
          onChange={(event) => setDesignSystemDoc(event.target.value)}
          rows={3}
          disabled={busy}
          placeholder="Ex.: fundo escuro, tipografia grotesk pesada, acento âmbar, foto real com luz lateral"
          className={cn(inputClass, 'resize-none')}
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Formato">
          <select
            value={aspectRatio}
            onChange={(event) => setAspectRatio(event.target.value as CreativeAspectRatio)}
            disabled={busy}
            className={inputClass}
          >
            {(Object.keys(ASPECT_CONFIG) as CreativeAspectRatio[]).map((ratio) => (
              <option key={ratio} value={ratio}>{ratio} · {ASPECT_CONFIG[ratio].title}</option>
            ))}
          </select>
        </Field>
        <Field label="Resolução">
          <select
            value={resolution}
            onChange={(event) => setResolution(event.target.value as CreativeResolution)}
            disabled={busy}
            className={inputClass}
          >
            {RESOLUTIONS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Cliente (opcional)" hint="Necessário para depois salvar a arte na inteligência dele.">
        <select
          value={clientId ?? ''}
          onChange={(event) => setClientId(event.target.value || null)}
          disabled={busy}
          className={inputClass}
        >
          <option value="">Sem cliente</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>{client.name}</option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Logo">
          <ImagePicker images={logoImages} onChange={setLogoImages} max={1} label="Enviar logo" disabled={busy} />
        </Field>
        <Field label="Produto / pessoa">
          <ImagePicker images={productImages} onChange={setProductImages} max={4} label="Enviar imagens" disabled={busy} />
        </Field>
      </div>

      <button
        type="button"
        onClick={() => onGenerate({
          businessContext,
          copyText,
          designSystemDoc,
          aspectRatio,
          resolution,
          clientId,
          productImages,
          logoImage: logoImages[0] ?? null,
        })}
        disabled={!canGenerate}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--studio-accent)] px-3 py-2.5 text-[11px] font-semibold text-white transition',
          'hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40',
        )}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
        {busy ? 'Gerando arte...' : `Gerar arte ${aspectRatio} em ${resolution}`}
      </button>
    </div>
  );
}
