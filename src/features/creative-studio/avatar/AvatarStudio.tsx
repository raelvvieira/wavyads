import { useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Plus, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AVATAR_PRESETS, type AvatarPreset } from '../constants/avatarPresets';
import { AVATAR_STYLE_LABELS, type AvatarPersona } from '../types/avatarPersona';
import type { CreativeAsset } from '../types/creative';
import { AvatarCustomizerDialog, personaVazia } from './AvatarCustomizerDialog';

interface AvatarStudioProps {
  /** Avatares já criados deste cliente — `type: 'avatar'`. */
  avatars: CreativeAsset[];
  busy?: boolean;
  onGenerate: (persona: AvatarPersona, referenceImages: string[]) => void;
}

/**
 * Avatar Studio.
 *
 * Ocupa a região central no lugar do canvas quando a biblioteca "Avatares"
 * está ativa — é a primeira entrada da ilha que abre uma TELA em vez de
 * filtrar o grid, e é o padrão que o UGC Studio vai seguir depois.
 *
 * Duas prateleiras: os presets, que são só valores iniciais do
 * customizador, e os avatares já gerados deste cliente. Clicar em qualquer
 * um dos dois abre o mesmo diálogo — a diferença é só o que vem preenchido.
 */
export function AvatarStudio({ avatars, busy = false, onGenerate }: AvatarStudioProps) {
  const [emEdicao, setEmEdicao] = useState<{ persona: AvatarPersona; titulo: string } | null>(null);

  // A primeira geração de um preset vira a capa dele: sem banco de imagens
  // próprio, é o jeito de o card deixar de ser um gradiente sem perder a
  // identidade do preset.
  const capaPorPreset = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const a of avatars) {
      const id = (a.metadata as any)?.persona?.presetId;
      const url = a.thumbnailUrl ?? a.url;
      if (id && url && a.status === 'ready' && !mapa.has(id)) mapa.set(id, url);
    }
    return mapa;
  }, [avatars]);

  const abrirPreset = (preset: AvatarPreset) =>
    setEmEdicao({ persona: preset.persona, titulo: `Personalizar ${preset.label}` });

  const abrirAvatar = (asset: CreativeAsset) => {
    const persona = (asset.metadata as any)?.persona as AvatarPersona | undefined;
    setEmEdicao({
      persona: persona ?? { ...personaVazia(), name: asset.filename ?? '' },
      titulo: `Personalizar ${persona?.name ?? asset.filename ?? 'avatar'}`,
    });
  };

  return (
    <section className="studio-avatar-region" aria-label="Avatar Studio">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white/92">Avatares</h2>
          <p className="text-[13px] text-white/50">
            Personas reutilizáveis — comece de uma pronta ou crie do zero
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEmEdicao({ persona: personaVazia(), titulo: 'Criar avatar' })}
          className="btn-accent inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold"
        >
          <Plus className="h-4 w-4" />
          Criar avatar
        </button>
      </header>

      <div>
        <p className="wavy-caps mb-2 text-[10px] font-semibold uppercase text-white/45">
          Personas prontas
        </p>
        <ul className="studio-avatar-grid">
          {AVATAR_PRESETS.map((preset) => (
            <li key={preset.id}>
              <button
                type="button"
                onClick={() => abrirPreset(preset)}
                aria-label={`Personalizar ${preset.label}`}
                className="studio-avatar-card group"
              >
                <span className="studio-avatar-card-art" style={capaPorPreset.has(preset.id) ? undefined : {
                  backgroundImage: `linear-gradient(150deg, ${preset.gradiente[0]}, ${preset.gradiente[1]})`,
                }}>
                  {capaPorPreset.has(preset.id) ? (
                    <img src={capaPorPreset.get(preset.id)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <UserRound className="h-7 w-7 text-white/35" />
                  )}
                </span>
                <span className="studio-avatar-card-body">
                  <span className="truncate text-[13px] font-semibold text-white/90">{preset.label}</span>
                  <span className="truncate text-[11px] text-white/50">{preset.descricao}</span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {preset.persona.styles.slice(0, 3).map((s) => (
                      <span key={s} className="rounded-full bg-white/[0.07] px-1.5 py-0.5 text-[9px] text-white/55">
                        {AVATAR_STYLE_LABELS[s]}
                      </span>
                    ))}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="wavy-caps mb-2 text-[10px] font-semibold uppercase text-white/45">
          Deste cliente
        </p>
        {avatars.length === 0 ? (
          <p className="rounded-[var(--wavy-radius-card)] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-[13px] text-white/45">
            Nenhum avatar ainda. Escolha uma persona pronta acima ou crie do zero.
          </p>
        ) : (
          <ul className="studio-avatar-grid">
            {avatars.map((asset) => {
              const persona = (asset.metadata as any)?.persona as AvatarPersona | undefined;
              const pronto = asset.status === 'ready' && !!asset.url;
              return (
                <li key={asset.id}>
                  <button
                    type="button"
                    onClick={() => abrirAvatar(asset)}
                    aria-label={`Personalizar ${persona?.name ?? asset.filename ?? 'avatar'}`}
                    className="studio-avatar-card group"
                    data-status={asset.status}
                  >
                    <span className={cn('studio-avatar-card-art', !pronto && 'bg-white/[0.04]')}>
                      {pronto ? (
                        <img src={asset.thumbnailUrl ?? asset.url ?? ''} alt="" className="h-full w-full object-cover" />
                      ) : asset.status === 'failed' ? (
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                      ) : (
                        <Loader2 className="h-5 w-5 animate-spin text-white/45" />
                      )}
                    </span>
                    <span className="studio-avatar-card-body">
                      <span className="truncate text-[13px] font-semibold text-white/90">
                        {persona?.name ?? asset.filename ?? 'Avatar'}
                      </span>
                      <span className="truncate text-[11px] text-white/50">
                        {asset.status === 'failed'
                          ? asset.errorMessage ?? 'A geração falhou.'
                          : persona
                            ? `${persona.ageRange} anos`
                            : 'Sem traços salvos'}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AvatarCustomizerDialog
        persona={emEdicao?.persona ?? null}
        titulo={emEdicao?.titulo ?? ''}
        busy={busy}
        onClose={() => setEmEdicao(null)}
        onGenerate={(persona, referencias) => {
          onGenerate(persona, referencias);
          setEmEdicao(null);
        }}
      />
    </section>
  );
}
