import { useState, type ReactElement } from 'react';
import { BadgeCheck, ChevronLeft, ChevronRight, FileUp, Images, Type } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { ImageDropzone } from '@/components/criativo/ImageDropzone';
import { uploadDataUrlToCreativeStorage } from '../api/storageUpload';
import type { CreativeAsset } from '../types/creative';
import type { DockAttachment, DockAttachmentKind } from '../types/studioUi';

interface AttachMenuProps {
  /** Já filtrado por `type: 'reference'` — o menu não decide o que é referência. */
  referenceLibrary: CreativeAsset[];
  onAttach: (attachment: DockAttachment) => void;
  /** O botão de clipe do dock — o Popover precisa envolver o elemento real. */
  children: ReactElement;
}

const OPCOES: { kind: DockAttachmentKind; label: string; icon: typeof Images }[] = [
  { kind: 'reference', label: 'Anexar referência', icon: Images },
  { kind: 'logo', label: 'Anexar logo', icon: BadgeCheck },
  { kind: 'copy', label: 'Anexar copy', icon: Type },
  { kind: 'file', label: 'Anexar arquivos', icon: FileUp },
];

/**
 * Menu de anexos do Command Dock.
 *
 * Duas telas dentro do mesmo popover: a lista de opções, e um sub-painel
 * por opção escolhida. Por isso é `Popover` controlado — e não
 * `DropdownMenu`, que fecha no primeiro clique — e não `dois popovers
 * separados`, porque abrir logo em cima de referência fecharia o de anexos.
 */
export function AttachMenu({ referenceLibrary, onAttach, children }: AttachMenuProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'lista' | DockAttachmentKind>('lista');

  const fechar = () => {
    setOpen(false);
    setStep('lista');
  };

  const anexar = (attachment: Omit<DockAttachment, 'id'>) => {
    onAttach({ id: crypto.randomUUID(), ...attachment });
    fechar();
  };

  return (
    <Popover
      open={open}
      onOpenChange={(proximo) => {
        setOpen(proximo);
        if (!proximo) setStep('lista');
      }}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="glass w-72 border-white/10 p-0">
        {step === 'lista' ? (
          <ul className="p-1.5">
            {OPCOES.map(({ kind, label, icon: Icon }) => (
              <li key={kind}>
                <button
                  type="button"
                  onClick={() => setStep(kind)}
                  className="flex w-full items-center gap-2.5 rounded-[var(--wavy-radius-control)] px-2.5 py-2 text-left text-[13px] font-medium text-white/82 transition-colors duration-150 hover:bg-white/[0.07]"
                >
                  <Icon className="h-4 w-4 shrink-0 text-white/55" />
                  {label}
                  <ChevronRight className="ml-auto h-3.5 w-3.5 text-white/30" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <SubPainel
            kind={step}
            referenceLibrary={referenceLibrary}
            onVoltar={() => setStep('lista')}
            onAnexar={anexar}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

function VoltarHeader({ titulo, onVoltar }: { titulo: string; onVoltar: () => void }) {
  return (
    <div className="flex items-center gap-1.5 border-b border-white/10 px-2 py-2">
      <button
        type="button"
        onClick={onVoltar}
        aria-label="Voltar"
        className="rounded-full p-1 text-white/55 transition-colors duration-150 hover:bg-white/[0.08] hover:text-white/90"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <p className="text-[12px] font-semibold text-white/85">{titulo}</p>
    </div>
  );
}

function SubPainel({
  kind,
  referenceLibrary,
  onVoltar,
  onAnexar,
}: {
  kind: DockAttachmentKind;
  referenceLibrary: CreativeAsset[];
  onVoltar: () => void;
  onAnexar: (attachment: Omit<DockAttachment, 'id'>) => void;
}) {
  if (kind === 'reference') return <PainelReferencia referenceLibrary={referenceLibrary} onVoltar={onVoltar} onAnexar={onAnexar} />;
  if (kind === 'logo') return <PainelUpload titulo="Anexar logo" maxImages={1} texto="Solte, clique ou cole o logo" kind="logo" onVoltar={onVoltar} onAnexar={onAnexar} />;
  if (kind === 'copy') return <PainelCopy onVoltar={onVoltar} onAnexar={onAnexar} />;
  return <PainelUpload titulo="Anexar arquivos" maxImages={6} texto="Solte, clique ou cole imagens" kind="file" onVoltar={onVoltar} onAnexar={onAnexar} />;
}

function PainelReferencia({
  referenceLibrary,
  onVoltar,
  onAnexar,
}: {
  referenceLibrary: CreativeAsset[];
  onVoltar: () => void;
  onAnexar: (attachment: Omit<DockAttachment, 'id'>) => void;
}) {
  return (
    <div>
      <VoltarHeader titulo="Anexar referência" onVoltar={onVoltar} />
      <div className="max-h-64 overflow-y-auto p-2.5">
        {referenceLibrary.length === 0 ? (
          <p className="px-1 py-3 text-center text-[12px] text-white/45">Nenhuma referência salva ainda.</p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {referenceLibrary.map((ref) => (
              <button
                key={ref.id}
                type="button"
                onClick={() => ref.url && onAnexar({
                  kind: 'reference',
                  label: ref.filename ?? 'Referência',
                  thumbnailUrl: ref.thumbnailUrl ?? ref.url,
                  value: ref.url,
                })}
                disabled={!ref.url}
                aria-label={`Anexar ${ref.filename ?? 'referência'}`}
                className="aspect-square overflow-hidden rounded-[var(--wavy-radius-control)] border border-white/10 transition-[border-color] duration-150 hover:border-white/25 disabled:opacity-40"
              >
                {ref.url && <img src={ref.thumbnailUrl ?? ref.url} alt="" className="h-full w-full object-cover" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PainelUpload({
  titulo,
  maxImages,
  texto,
  kind,
  onVoltar,
  onAnexar,
}: {
  titulo: string;
  maxImages: number;
  texto: string;
  kind: 'logo' | 'file';
  onVoltar: () => void;
  onAnexar: (attachment: Omit<DockAttachment, 'id'>) => void;
}) {
  const [enviando, setEnviando] = useState(false);

  // `ImageDropzone` entrega data URLs, nunca `File` — sobe cada uma assim
  // que aparece e anexa. `images` fica sempre vazio de propósito: o
  // dropzone é só o gatilho de seleção, o anexo já sai no dock.
  const handleChange = async (dataUrls: string[]) => {
    if (dataUrls.length === 0) return;
    setEnviando(true);
    try {
      for (const dataUrl of dataUrls) {
        const path = `attachments/${kind}/${crypto.randomUUID()}.png`;
        const url = await uploadDataUrlToCreativeStorage({ dataUrl, path });
        onAnexar({ kind, label: kind === 'logo' ? 'Logo' : 'Arquivo', thumbnailUrl: url, value: url });
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div>
      <VoltarHeader titulo={titulo} onVoltar={onVoltar} />
      <div className="p-2.5">
        <ImageDropzone images={[]} onChange={handleChange} label={enviando ? 'Enviando…' : texto} maxImages={maxImages} />
      </div>
    </div>
  );
}

function PainelCopy({
  onVoltar,
  onAnexar,
}: {
  onVoltar: () => void;
  onAnexar: (attachment: Omit<DockAttachment, 'id'>) => void;
}) {
  const [texto, setTexto] = useState('');

  return (
    <div>
      <VoltarHeader titulo="Anexar copy" onVoltar={onVoltar} />
      <div className="space-y-2 p-2.5">
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Cole o texto final — título, subtítulo, CTA…"
          rows={4}
          className="resize-none text-[13px]"
          autoFocus
        />
        <button
          type="button"
          disabled={!texto.trim()}
          onClick={() => onAnexar({ kind: 'copy', label: `Copy: ${texto.trim().slice(0, 28)}${texto.trim().length > 28 ? '…' : ''}`, value: texto.trim() })}
          className="btn-accent h-8 w-full rounded-[var(--wavy-radius-control)] text-[12px] font-semibold disabled:cursor-not-allowed disabled:opacity-40"
        >
          Anexar
        </button>
      </div>
    </div>
  );
}
