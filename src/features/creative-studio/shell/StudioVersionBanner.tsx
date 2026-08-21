interface StudioVersionBannerProps {
  onOpenLegacy: () => void;
}

/**
 * Aviso de versão.
 *
 * Nasceu como aviso de PRÉVIA, quando a V2 convivia com a antiga e era
 * preciso dizer que aquilo ainda não era o Studio. Agora é — e manter o
 * texto de prévia faria a faixa mentir sobre a própria tela em que está.
 *
 * O componente também mudou de nome junto com o conteúdo. Um
 * `StudioPreviewBanner` que não anuncia prévia nenhuma é o tipo de deriva
 * que faz o próximo leitor confiar no rótulo errado — foi por não notar
 * isso a tempo que a frase anterior chegou a afirmar que o Fator Criativo
 * "ainda segue no Studio atual" depois de ele já funcionar aqui.
 *
 * A faixa continua existindo por um motivo só: a troca de versão é abrupta
 * para quem já tinha o fluxo antigo na memória muscular, e oferecer a volta
 * num lugar previsível custa menos que descobrir depois que alguém ficou
 * travado sem saída.
 */
export function StudioVersionBanner({ onOpenLegacy }: StudioVersionBannerProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[var(--wavy-radius-card)] border border-white/10 bg-white/[0.04] px-3.5 py-2.5">
      <span className="wavy-caps rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase text-white/70">
        Novo
      </span>
      <p className="text-xs text-white/62">
        Esta é a nova versão do Criativo Studio. A anterior continua disponível caso você precise dela.
      </p>
      <button
        type="button"
        onClick={onOpenLegacy}
        className="btn-glass ml-auto h-7 rounded-full px-3 text-[11px] font-medium"
      >
        Abrir versão antiga
      </button>
    </div>
  );
}
