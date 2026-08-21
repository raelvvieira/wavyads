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
  // O painel só alarga quando há sugestões na tela. Deixá-lo largo o tempo
  // todo desperdiçaria espaço nos outros quatro modos de anexo, que são
  // grades de miniatura e cabem bem em 288px.
  const [copyExpandido, setCopyExpandido] = useState(false);

  const fechar = () => {
    setOpen(false);
    setStep('lista');
    setCopyExpandido(false);
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
        if (!proximo) { setStep('lista'); setCopyExpandido(false); }
      }}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          'glass border-white/10 p-0 transition-[width] duration-200',
          // Copy precisa de mais largura que uma grade de miniaturas: uma
          // copy de anúncio tem título, subtítulo e CTA, e a 288px isso vira
          // reticências. Com sugestões abertas, abre a segunda coluna.
          step === 'copy' ? (copyExpandido ? 'w-[620px]' : 'w-[380px]') : 'w-72',
        )}
      >
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
            onVoltar={() => { setStep('lista'); setCopyExpandido(false); }}
            onAnexar={anexar}
            onNovoUpload={onNewLibraryUpload}
            onSugestoesAbertas={setCopyExpandido}
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
  onSugestoesAbertas,
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
  onSugestoesAbertas: (aberto: boolean) => void;
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
  if (kind === 'copy') return <PainelCopy copyBank={copyBank} onVoltar={onVoltar} onAnexar={onAnexar} onSugestoesAbertas={onSugestoesAbertas} />;
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
  onSugestoesAbertas,
}: {
  copyBank: CopyBankEntry[];
  onVoltar: () => void;
  onAnexar: (attachment: Omit<DockAttachment, 'id'>) => void;
  onSugestoesAbertas: (aberto: boolean) => void;
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
    onSugestoesAbertas(false);
    setErroSugestao(null);
  };

  // Variar a partir da copy SELECIONADA ou do texto DIGITADO.
  //
  // Antes só a seleção valia, e o botão ficava apagado até você clicar numa
  // entrada da lista — indistinguível de um botão quebrado, que foi
  // exatamente como o recurso foi reportado. As duas são partidas legítimas:
  // quem colou um texto quer variações dele tanto quanto quem reaproveita
  // uma copy antiga.
  const referencia = selecionada?.copyText ?? texto.trim();
  const podeSugerir = referencia.length > 0 && !sugerindo;

  const sugerirVariacoes = async () => {
    if (!referencia) return;
    setSugerindo(true);
    setErroSugestao(null);
    try {
      const variacoes = await suggestCopyVariations({
        referenceCopy: referencia,
        tema: selecionada?.tema ?? null,
        language: 'pt-BR',
      });
      setSugestoes(variacoes);
      onSugestoesAbertas(true);
    } catch (e: any) {
      setErroSugestao(e?.message ?? 'Não consegui sugerir variações agora.');
    } finally {
      setSugerindo(false);
    }
  };

  return (
    <div>
      <VoltarHeader titulo="Anexar copy" onVoltar={onVoltar} />
      <div className={cn('p-2.5', sugestoes && 'flex gap-3')}>
      <div className={cn('space-y-2', sugestoes && 'min-w-0 flex-1')}>
        {copyBank.length > 0 && (
          <div>
            <p className="wavy-caps mb-1 text-[10px] font-semibold uppercase text-white/45">
              Já usadas com este cliente
            </p>
            <div className="max-h-52 space-y-1 overflow-y-auto">
              {copyBank.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => escolherSalva(entry)}
                  className={cn(
                    'block w-full rounded-[var(--wavy-radius-control)] border px-2.5 py-2 text-left text-[12px] leading-relaxed line-clamp-3 transition-colors duration-150',
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
              disabled={!podeSugerir}
              className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-white/70 transition-colors duration-150 hover:text-white/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sugerindo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Sugerir variações
            </button>
            {!podeSugerir && !sugerindo && (
              <p className="mt-1 text-[11px] text-white/40">
                Escolha uma copy acima ou escreva um texto abaixo para variar.
              </p>
            )}
            {erroSugestao && <p className="mt-1 text-[11px] text-destructive">{erroSugestao}</p>}
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

      {/* A coluna das alternativas. Antes elas entravam numa grade de duas
          colunas dentro dos 288px do painel, com `line-clamp-3` — ou seja,
          quatro copies cortadas lado a lado, que é o mesmo problema de
          leitura que a lista de usadas já tinha. Aqui cada uma tem largura
          para ser lida inteira. */}
      {sugestoes && (
        <div className="min-w-0 flex-1 border-l border-white/10 pl-3">
          <p className="wavy-caps mb-1.5 text-[10px] font-semibold uppercase text-white/45">
            Alternativas
          </p>
          <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {sugestoes.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setTexto(s.texto)}
                className="block w-full rounded-[var(--wavy-radius-control)] border border-white/8 bg-white/[0.03] p-2.5 text-left transition-colors duration-150 hover:border-white/20"
              >
                <span className="wavy-caps block text-[9px] font-semibold uppercase text-white/40">{s.angulo}</span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-white/72">{s.texto}</span>
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-white/35">Clique para usar — o texto vai para o campo ao lado.</p>
        </div>
      )}
      </div>
    </div>
  );
}
