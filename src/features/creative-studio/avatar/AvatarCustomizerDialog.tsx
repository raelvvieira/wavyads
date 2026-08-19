import { useEffect, useState } from 'react';
import { Loader2, UserRound } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ImageDropzone } from '@/components/criativo/ImageDropzone';
import { cn } from '@/lib/utils';
import {
  AVATAR_AGE_RANGES,
  AVATAR_EYE_COLORS,
  AVATAR_EYE_LABELS,
  AVATAR_EYE_SWATCH,
  AVATAR_GENDERS,
  AVATAR_GENDER_LABELS,
  AVATAR_HAIR_COLORS,
  AVATAR_HAIR_LABELS,
  AVATAR_HAIR_SWATCH,
  AVATAR_STYLES,
  AVATAR_STYLE_LABELS,
  handleFromName,
  type AvatarPersona,
  type AvatarStyle,
} from '../types/avatarPersona';

/** Persona em branco — o "criar do zero". */
export function personaVazia(): AvatarPersona {
  return {
    name: '',
    gender: 'female',
    ageRange: '25-30',
    styles: [],
    hairColor: 'dark-brown',
    eyeColor: 'brown',
    details: '',
    presetId: null,
  };
}

interface AvatarCustomizerDialogProps {
  /** `null` fecha o diálogo. A persona inicial define o que aparece nos campos. */
  persona: AvatarPersona | null;
  /** Título do cabeçalho — "Criar avatar" ou "Personalizar <preset>". */
  titulo: string;
  busy?: boolean;
  onClose: () => void;
  onGenerate: (persona: AvatarPersona, referenceImages: string[]) => void;
}

/**
 * Customizador da persona.
 *
 * Cada traço é um vocabulário fechado porque o prompt de retrato é montado
 * a partir dele — campo livre em cada um viraria prompt imprevisível. O que
 * escapa do vocabulário cabe em "Detalhes adicionais", que existe
 * justamente para isso.
 *
 * A `key` no conteúdo faz o formulário renascer a cada persona: sem isso,
 * abrir um preset depois de outro manteria os traços do anterior nos
 * campos que o novo não sobrescreve.
 */
export function AvatarCustomizerDialog({
  persona,
  titulo,
  busy = false,
  onClose,
  onGenerate,
}: AvatarCustomizerDialogProps) {
  return (
    <Dialog open={!!persona} onOpenChange={(aberto) => { if (!aberto) onClose(); }}>
      <DialogContent className="glass max-h-[86vh] overflow-y-auto border-white/10 bg-card sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            Defina a identidade e o visual da persona
          </DialogDescription>
        </DialogHeader>
        {persona && (
          <Formulario
            key={persona.presetId ?? 'novo'}
            inicial={persona}
            busy={busy}
            onGenerate={onGenerate}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Formulario({
  inicial,
  busy,
  onGenerate,
}: {
  inicial: AvatarPersona;
  busy: boolean;
  onGenerate: (persona: AvatarPersona, referenceImages: string[]) => void;
}) {
  const [persona, setPersona] = useState<AvatarPersona>(inicial);
  const [referencias, setReferencias] = useState<string[]>([]);

  // Trocar de preset com o diálogo já aberto precisa repovoar os campos —
  // a `key` do chamador cobre a troca de preset, isto cobre o resto.
  useEffect(() => { setPersona(inicial); }, [inicial]);

  const alterar = <K extends keyof AvatarPersona>(campo: K, valor: AvatarPersona[K]) =>
    setPersona((p) => ({ ...p, [campo]: valor }));

  const alternarEstilo = (estilo: AvatarStyle) =>
    setPersona((p) => ({
      ...p,
      styles: p.styles.includes(estilo)
        ? p.styles.filter((s) => s !== estilo)
        : [...p.styles, estilo],
    }));

  const podeGerar = persona.name.trim().length > 0 && !busy;

  return (
    <div className="mt-2 space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Rotulo>Nome</Rotulo>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={persona.name}
              onChange={(e) => alterar('name', e.target.value)}
              placeholder="Nome da persona"
              className="glass-input w-full rounded-xl py-2.5 pl-9 pr-4 text-sm"
            />
          </div>
          {/* Derivado, nunca digitado: dois campos para a mesma identidade
              divergem no primeiro rename. */}
          {persona.name.trim() && (
            <p className="text-xs text-accent">{handleFromName(persona.name)}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Rotulo>Gênero</Rotulo>
          <div className="flex flex-wrap gap-1.5">
            {AVATAR_GENDERS.map((g) => (
              <Chip key={g} ativo={persona.gender === g} onClick={() => alterar('gender', g)}>
                {AVATAR_GENDER_LABELS[g]}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <Secao titulo="Faixa etária">
        {AVATAR_AGE_RANGES.map((faixa) => (
          <Chip key={faixa} ativo={persona.ageRange === faixa} onClick={() => alterar('ageRange', faixa)}>
            {faixa}
          </Chip>
        ))}
      </Secao>

      <Secao titulo="Estilo & Estética">
        {AVATAR_STYLES.map((estilo) => (
          <Chip
            key={estilo}
            ativo={persona.styles.includes(estilo)}
            onClick={() => alternarEstilo(estilo)}
            marcavel
          >
            {AVATAR_STYLE_LABELS[estilo]}
          </Chip>
        ))}
      </Secao>

      <Secao titulo="Cor do cabelo">
        {AVATAR_HAIR_COLORS.map((cor) => (
          <Chip
            key={cor}
            ativo={persona.hairColor === cor}
            onClick={() => alterar('hairColor', cor)}
            amostra={AVATAR_HAIR_SWATCH[cor]}
          >
            {AVATAR_HAIR_LABELS[cor]}
          </Chip>
        ))}
      </Secao>

      <Secao titulo="Cor dos olhos">
        {AVATAR_EYE_COLORS.map((cor) => (
          <Chip
            key={cor}
            ativo={persona.eyeColor === cor}
            onClick={() => alterar('eyeColor', cor)}
            amostra={AVATAR_EYE_SWATCH[cor]}
          >
            {AVATAR_EYE_LABELS[cor]}
          </Chip>
        ))}
      </Secao>

      <div className="space-y-1.5">
        <Rotulo>Detalhes adicionais</Rotulo>
        <Textarea
          value={persona.details}
          onChange={(e) => alterar('details', e.target.value)}
          placeholder="Traços, guarda-roupa, cenário, expressão — o que o vocabulário acima não cobre"
          rows={3}
          className="resize-none text-[13px]"
        />
      </div>

      <div className="space-y-1.5">
        <Rotulo>Fotos de referência</Rotulo>
        <ImageDropzone
          images={referencias}
          onChange={setReferencias}
          maxImages={8}
          label="Solte, clique ou cole fotos de uma pessoa real"
        />
        <p className="text-xs text-muted-foreground">
          Opcional. Com referência, o retrato preserva o rosto enviado.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4">
        <span className="text-xs text-muted-foreground">
          {podeGerar ? 'Pronto para gerar' : 'Dê um nome à persona'}
        </span>
        <button
          type="button"
          disabled={!podeGerar}
          onClick={() => onGenerate(persona, referencias)}
          className="btn-accent inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? 'Gerando…' : 'Gerar avatar'}
        </button>
      </div>
    </div>
  );
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return <label className="text-sm text-muted-foreground">{children}</label>;
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Rotulo>{titulo}</Rotulo>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  ativo,
  onClick,
  children,
  amostra,
  marcavel = false,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
  /** Bolinha de cor à esquerda, para cabelo e olhos. */
  amostra?: string;
  /** Quadradinho de seleção — sinaliza que a escolha acumula. */
  marcavel?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors duration-150',
        ativo
          ? 'border-accent/60 bg-accent/15 text-white/92'
          : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25 hover:text-white/85',
      )}
    >
      {marcavel && (
        <span
          aria-hidden
          className={cn(
            'grid h-3 w-3 shrink-0 place-items-center rounded-[3px] border text-[8px] leading-none',
            ativo ? 'border-accent bg-accent text-white' : 'border-white/25',
          )}
        >
          {ativo ? '✓' : ''}
        </span>
      )}
      {amostra && (
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/20"
          style={{ backgroundColor: amostra }}
        />
      )}
      {children}
    </button>
  );
}
