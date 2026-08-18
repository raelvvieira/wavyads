/**
 * Feature flags do Criativo Studio.
 *
 * A reformulação para o canvas V2 é grande demais para entrar de uma vez. A
 * flag existe para que o shell novo possa ser construído e testado em
 * produção sem substituir o fluxo atual, e para que o rollback seja uma troca
 * de valor — não um revert de código.
 *
 * Ordem de precedência, da mais forte para a mais fraca:
 *   1. `?studioV2=on|off` na URL — para abrir um link já no modo desejado
 *   2. `localStorage['wavy-studio-v2']` — escolha que persiste no aparelho
 *   3. `VITE_STUDIO_CANVAS_V2` no build — padrão do ambiente
 *
 * O padrão é DESLIGADO. Enquanto a V2 não cumprir os critérios de aceite, quem
 * não pediu explicitamente continua no fluxo que funciona.
 */

export const STUDIO_V2_STORAGE_KEY = 'wavy-studio-v2';
const URL_PARAM = 'studioV2';

function fromUrl(search: string): boolean | null {
  try {
    const v = new URLSearchParams(search).get(URL_PARAM);
    if (v === 'on' || v === '1' || v === 'true') return true;
    if (v === 'off' || v === '0' || v === 'false') return false;
  } catch {
    // URL malformada não deve derrubar a página.
  }
  return null;
}

function fromStorage(): boolean | null {
  try {
    const v = localStorage.getItem(STUDIO_V2_STORAGE_KEY);
    if (v === 'on') return true;
    if (v === 'off') return false;
  } catch {
    // Armazenamento bloqueado (navegação privativa) — segue para o padrão.
  }
  return null;
}

function fromEnv(): boolean {
  return String(import.meta.env?.VITE_STUDIO_CANVAS_V2 ?? '').toLowerCase() === 'true';
}

/** Resolve a flag na ordem documentada acima. */
export function isCreativeStudioCanvasV2(
  search: string = typeof window !== 'undefined' ? window.location.search : '',
): boolean {
  const url = fromUrl(search);
  if (url !== null) return url;

  const stored = fromStorage();
  if (stored !== null) return stored;

  return fromEnv();
}

/** Fixa a escolha no aparelho. `null` volta ao padrão do ambiente. */
export function setCreativeStudioCanvasV2(enabled: boolean | null): void {
  try {
    if (enabled === null) localStorage.removeItem(STUDIO_V2_STORAGE_KEY);
    else localStorage.setItem(STUDIO_V2_STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // Sem persistência, a escolha vale só para esta sessão.
  }
}
