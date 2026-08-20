import { Check, UserRound } from 'lucide-react';
import type { CreativeAsset } from '@/features/creative-studio/types/creative';

interface AvatarPickerProps {
  avatars: CreativeAsset[];
  selectedId: string | null;
  onSelect: (assetId: string) => void;
  projectTitle: string;
}

/**
 * Escolha do avatar do projeto.
 *
 * Uma vez só, e vale para todos os clipes — é o que faz os quatro segmentos
 * parecerem a mesma pessoa. Trocar depois não regenera o que já existe, e
 * por isso a escolha aparece antes das etapas, não misturada a elas.
 *
 * A lista sai do Avatar Studio do Criativo Studio: as personas já criadas
 * para aquele cliente. Não há biblioteca de pessoas pré-gravadas — o que a
 * marca usa aqui é a mesma persona que ela usa nas artes estáticas.
 */
export function AvatarPicker({ avatars, selectedId, onSelect, projectTitle }: AvatarPickerProps) {
  const prontos = avatars.filter((a) => a.status === 'ready' && a.url);

  return (
    <section className="ugc-step" aria-label="Escolher avatar">
      <header className="text-center">
        <h2 className="text-base font-semibold text-white/92">Escolha o avatar</h2>
        <p className="text-[13px] text-white/50">
          Esta pessoa vai aparecer em todos os clipes de <span className="text-white/75">{projectTitle}</span>
        </p>
      </header>

      {prontos.length === 0 ? (
        <div className="ugc-empty">
          <UserRound className="h-6 w-6 text-white/25" />
          <p className="text-[13px] font-medium text-white/70">Nenhum avatar disponível</p>
          <p className="max-w-[380px] text-[12px] leading-relaxed text-white/45">
            Os avatares vêm do Avatar Studio, dentro do Criativo Studio. Crie uma persona lá e ela
            aparece aqui.
          </p>
        </div>
      ) : (
        <ul className="ugc-avatar-grid">
          {prontos.map((a) => {
            const nome = (a.metadata as any)?.persona?.name ?? a.filename ?? 'Avatar';
            const ativo = selectedId === a.id;
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => onSelect(a.id)}
                  aria-pressed={ativo}
                  data-active={ativo}
                  className="ugc-avatar-card"
                >
                  <img src={a.thumbnailUrl ?? a.url ?? ''} alt="" className="h-full w-full object-cover" />
                  <span className="ugc-angle-check" aria-hidden>{ativo && <Check className="h-3 w-3" strokeWidth={3} />}</span>
                  <span className="ugc-avatar-name">{nome}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
