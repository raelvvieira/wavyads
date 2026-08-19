import { useState, type ReactElement } from 'react';
import { BadgeCheck, Boxes, ChevronLeft, ChevronRight, Images, Loader2, Sparkles, Type, UserRound } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { ImageDropzone } from '@/components/criativo/ImageDropzone';
import { cn } from '@/lib/utils';
import { uploadDataUrlToCreativeStorage } from '../api/storageUpload';
import type { CopyBankEntry } from '../api/copyBank';
import { suggestCopyVariations, type CopyVariation } from '../api/copySuggestions';
import type { CreativeAsset } from '../types/creative';
import type { DockAttachment, DockAttachmentKind } from '../types/studioUi';

interface AttachMenuProps {
  /** Já filtrado por `type: 'reference'` — o menu não decide o que é referência. */
  referenceLibrary: CreativeAsset[];
  /** Idem, por `type: 'logo'`/`'product'` — logo/produto já salvos deste cliente. */
  logoLibrary: CreativeAsset[];
  productLibrary: CreativeAsset[];
  /** Avatares já gerados deste cliente. */
  avatarLibrary: CreativeAsset[];
  /** Copies já usadas por este cliente, mais recente primeiro. */
  copyBank: CopyBankEntry[];
  onAttach: (attachment: DockAttachment) => void;
  /** Upload NOVO de logo/produto — além de virar anexo desta vez, some
   * pra biblioteca do cliente reutilizar depois. */
  onNewLibraryUpload: (kind: 'logo' | 'product', url: string) => void;
  /** O botão de clipe do dock — o Popover precisa envolver o elemento real. */
  children: ReactElement;
}

const OPCOES: { kind: DockAttachmentKind; label: string; icon: typeof Images }[] = [
  { kind: 'reference', label: 'Anexar referência', icon: Images },
  { kind: 'logo', label: 'Anexar logo', icon: BadgeCheck },
  { kind: 'copy', label: 'Anexar copy', icon: Type },
  // Mesmo ícone da biblioteca "Produtos" — mesmo conceito, mesmo símbolo.
  { kind: 'product', label: 'Anexar produto', icon: Boxes },
  // Mesmo ícone da biblioteca "Avatares" — mesmo conceito, mesmo símbolo.
  { kind: 'avatar', label: 'Anexar avatar', icon: UserRound },
];

/**
 * Menu de anexos do Command Dock.
 *
 * Duas telas dentro do mesmo popover: a lista de opções, e um sub-painel
 * por opção escolhida. Por isso é `Popover` controlado — e não
 * `DropdownMenu`, que fecha no primeiro clique — e não `dois popovers
 * separados`, porque abrir logo em cima de referência fecharia o de anexos.
 */
export function AttachMenu({
  referenceLibrary,
  logoLibrary,
  productLibrary,
  avatarLibrary,
  copyBank,
  onAttach,
  onNewLibraryUpload,
  children,
}: AttachMenuProps) {
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
            logoLibrary={logoLibrary}
            productLibrary={productLibrary}
            avatarLibrary={avatarLibrary}
            copyBank={copyBank}
            onVoltar={() => setStep('lista')}
            onAnexar={anexar}
            onNovoUpload={onNewLibraryUpload}
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
  logoLibrary,
  productLibrary,
  avatarLibrary,
  copyBank,
  onVoltar,
  onAnexar,
  onNovoUpload,
}: {
  kind: DockAttachmentKind;
  referenceLibrary: CreativeAsset[];
  logoLibrary: CreativeAsset[];
  productLibrary: CreativeAsset[];
  avatarLibrary: CreativeAsset[];
  copyBank: CopyBankEntry[];
  onVoltar: () => void;
  onAnexar: (attachment: Omit<DockAttachment, 'id'>) => void;
  onNovoUpload: (kind: 'logo' | 'product', url: string) => void;
}) {
  if (kind === 'reference') return <PainelReferencia referenceLibrary={referenceLibrary} onVoltar={onVoltar} onAnexar={onAnexar} />;
  if (kind === 'logo') {
    return (
      <PainelBiblioteca
        titulo="Anexar logo" maxImages={1} texto="Solte, clique ou cole o logo" kind="logo"
        library={logoLibrary} onVoltar={onVoltar} onAnexar={onAnexar} onNovoUpload={onNovoUpload}
      />
    );
  }
  if (kind === 'copy') return <PainelCopy copyBank={copyBank} onVoltar={onVoltar} onAnexar={onAnexar} />;
  if (kind === 'avatar') return <PainelAvatar library={avatarLibrary} onVoltar={onVoltar} onAnexar={onAnexar} />;
  return (
    <PainelBiblioteca
      titulo="Anexar produto" maxImages={6} texto="Solte, clique ou cole imagens do produto" kind="product"
      library={productLibrary} onVoltar={onVoltar} onAnexar={onAnexar} onNovoUpload={onNovoUpload}
    />
  );
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

/**
 * Logo e produto compartilham a mesma mecânica: uma grade do que já foi
 * salvo para este cliente (clique anexa na hora, igual referência), e um
 * upload embaixo pra adicionar um novo — que também vira reutilizável,
 * via `onNovoUpload`.
 */
function PainelBiblioteca({
  titulo,
  maxImages,
  texto,
  kind,
  library,
  onVoltar,
  onAnexar,
  onNovoUpload,
}: {
  titulo: string;
  maxImages: number;
  texto: string;
  kind: 'logo' | 'product';
  library: CreativeAsset[];
  onVoltar: () => void;
  onAnexar: (attachment: Omit<DockAttachment, 'id'>) => void;
  onNovoUpload: (kind: 'logo' | 'product', url: string) => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const rotuloPadrao = kind === 'logo' ? 'Logo' : 'Produto';

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
        onAnexar({ kind, label: rotuloPadrao, thumbnailUrl: url, value: url });
        onNovoUpload(kind, url);
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div>
      <VoltarHeader titulo={titulo} onVoltar={onVoltar} />
      {library.length > 0 && (
        <div className="max-h-40 overflow-y-auto p-2.5 pb-0">
          <div className="grid grid-cols-3 gap-1.5">
            {library.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => item.url && onAnexar({
                  kind,
                  label: item.filename ?? rotuloPadrao,
                  thumbnailUrl: item.thumbnailUrl ?? item.url,
                  value: item.url,
                })}
                disabled={!item.url}
                aria-label={`Anexar ${item.filename ?? (kind === 'logo' ? 'logo salvo' : 'produto salvo')}`}
                className="aspect-square overflow-hidden rounded-[var(--wavy-radius-control)] border border-white/10 transition-[border-color] duration-150 hover:border-white/25 disabled:opacity-40"
              >
                {item.url && <img src={item.thumbnailUrl ?? item.url} alt="" className="h-full w-full object-cover" />}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="p-2.5">
        <ImageDropzone images={[]} onChange={handleChange} label={enviando ? 'Enviando…' : texto} maxImages={maxImages} />
      </div>
    </div>
  );
}

/**
 * Avatar não tem upload: ele NASCE gerado no Avatar Studio, a partir de
 * traços. Um dropzone aqui criaria um segundo caminho para o mesmo conceito
 * — e o de cá não guardaria persona nenhuma.
 */
function PainelAvatar({
  library,
  onVoltar,
  onAnexar,
}: {
  library: CreativeAsset[];
  onVoltar: () => void;
  onAnexar: (attachment: Omit<DockAttachment, 'id'>) => void;
}) {
  const prontos = library.filter((a) => a.status === 'ready' && !!a.url);
  return (
    <div>
      <VoltarHeader titulo="Anexar avatar" onVoltar={onVoltar} />
      <div className="max-h-64 overflow-y-auto p-2.5">
        {prontos.length === 0 ? (
          <p className="px-1 py-3 text-center text-[12px] text-white/45">
            Nenhum avatar ainda. Crie um na biblioteca "Avatares".
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {prontos.map((item) => {
              const nome = (item.metadata as any)?.persona?.name ?? item.filename ?? 'Avatar';
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => item.url && onAnexar({
                    kind: 'avatar',
                    label: nome,
                    thumbnailUrl: item.thumbnailUrl ?? item.url,
                    value: item.url,
                  })}
                  aria-label={`Anexar ${nome}`}
                  className="aspect-square overflow-hidden rounded-[var(--wavy-radius-control)] border border-white/10 transition-[border-color] duration-150 hover:border-white/25"
                >
                  <img src={item.thumbnailUrl ?? item.url ?? ''} alt="" className="h-full w-full object-cover" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PainelCopy({
  copyBank,
  onVoltar,
  onAnexar,
}: {
  copyBank: CopyBankEntry[];
  onVoltar: () => void;
  onAnexar: (attachment: Omit<DockAttachment, 'id'>) => void;
}) {
  const [texto, setTexto] = useState('');
  const [selecionada, setSelecionada] = useState<CopyBankEntry | null>(null);
  const [sugestoes, setSugestoes] = useState<CopyVariation[] | null>(null);
  const [sugerindo, setSugerindo] = useState(false);
  const [erroSugestao, setErroSugestao] = useState<string | null>(null);

  const escolherSalva = (entry: CopyBankEntry) => {
    setSelecionada(entry);
    setTexto(entry.copyText);
    setSugestoes(null);
    setErroSugestao(null);
  };

  const sugerirVariacoes = async () => {
    if (!selecionada) return;
    setSugerindo(true);
    setErroSugestao(null);
    try {
      const variacoes = await suggestCopyVariations({
        referenceCopy: selecionada.copyText,
        tema: selecionada.tema,
        language: 'pt-BR',
      });
      setSugestoes(variacoes);
    } catch (e: any) {
      setErroSugestao(e?.message ?? 'Não consegui sugerir variações agora.');
    } finally {
      setSugerindo(false);
    }
  };

  return (
    <div>
      <VoltarHeader titulo="Anexar copy" onVoltar={onVoltar} />
      <div className="space-y-2 p-2.5">
        {copyBank.length > 0 && (
          <div>
            <p className="wavy-caps mb-1 text-[10px] font-semibold uppercase text-white/45">
              Já usadas com este cliente
            </p>
            <div className="max-h-28 space-y-1 overflow-y-auto">
              {copyBank.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => escolherSalva(entry)}
                  className={cn(
                    'block w-full rounded-[var(--wavy-radius-control)] border px-2 py-1.5 text-left text-[12px] leading-snug line-clamp-2 transition-colors duration-150',
                    selecionada?.id === entry.id
                      ? 'border-accent/50 bg-accent/10 text-white/90'
                      : 'border-white/8 bg-white/[0.03] text-white/68 hover:border-white/20',
                  )}
                >
                  {entry.copyText}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={sugerirVariacoes}
              disabled={!selecionada || sugerindo}
              className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-white/70 transition-colors duration-150 hover:text-white/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sugerindo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Sugerir variações
            </button>
            {erroSugestao && <p className="mt-1 text-[11px] text-destructive">{erroSugestao}</p>}
            {sugestoes && (
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {sugestoes.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setTexto(s.texto)}
                    className="rounded-[var(--wavy-radius-control)] border border-white/8 bg-white/[0.03] p-2 text-left text-[11px] leading-snug text-white/68 transition-colors duration-150 hover:border-white/20"
                  >
                    <span className="wavy-caps block text-[9px] font-semibold uppercase text-white/40">{s.angulo}</span>
                    <span className="line-clamp-3">{s.texto}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Cole o texto final — título, subtítulo, CTA…"
          rows={4}
          className="resize-none text-[13px]"
          autoFocus={copyBank.length === 0}
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
