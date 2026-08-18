interface StudioPreviewBannerProps {
  onOpenCurrent: () => void;
}

/**
 * Aviso de prévia.
 *
 * A tela mostra dados de verdade e não age sobre eles. Sem dizer isso na
 * cara, o usuário lê o silêncio dos botões como defeito — e a conclusão
 * dele seria que o Studio quebrou, não que esta versão ainda não liga.
 */
export function StudioPreviewBanner({ onOpenCurrent }: StudioPreviewBannerProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[var(--wavy-radius-card)] border border-white/10 bg-white/[0.04] px-3.5 py-2.5">
      <span className="wavy-caps rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase text-white/70">
        Prévia
      </span>
      <p className="text-xs text-white/62">
        Studio V2 em leitura: seu acervo real no layout novo. Gerar e transformar seguem no Studio atual.
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
