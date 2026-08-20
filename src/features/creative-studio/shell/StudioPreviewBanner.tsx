interface StudioPreviewBannerProps {
  onOpenCurrent: () => void;
}

/**
 * Aviso de prévia.
 *
 * A tela age sobre o acervo de verdade, mas ainda é a versão nova. O aviso
 * existe para nomear isso e oferecer a volta — e a frase precisa listar só
 * o que de fato funciona: um aviso que fica desatualizado ensina o usuário
 * a não confiar no que a tela diz sobre si mesma.
 */
export function StudioPreviewBanner({ onOpenCurrent }: StudioPreviewBannerProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[var(--wavy-radius-card)] border border-white/10 bg-white/[0.04] px-3.5 py-2.5">
      <span className="wavy-caps rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase text-white/70">
        Prévia
      </span>
      <p className="text-xs text-white/62">
        Studio V2 com o acervo real. Gerar, editar, redimensionar e o Fator Criativo já funcionam aqui.
      </p>
      <button
        type="button"
        onClick={onOpenCurrent}
        className="btn-glass ml-auto h-7 rounded-full px-3 text-[11px] font-medium"
      >
        Abrir o Studio atual
      </button>
    </div>
  );
}
