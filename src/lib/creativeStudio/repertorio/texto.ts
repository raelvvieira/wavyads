/** Minúsculo e sem acento: "Lançamento" e "lancamento" são o mesmo pedido. */
export function normalizar(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * A palavra (ou expressão) aparece INTEIRA no texto já normalizado.
 *
 * Sem a borda, "rosa" casaria com "prosa" e "ouro" com "tesouro" — e o
 * pedido ganharia uma cor que ninguém escreveu.
 */
export function contem(textoNormalizado: string, termo: string): boolean {
  const t = normalizar(termo).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${t}([^a-z0-9]|$)`).test(textoNormalizado);
}

/** Onde o termo aparece, para ordenar as cores na ordem em que foram ditas. */
export function posicao(textoNormalizado: string, termo: string): number {
  const t = normalizar(termo).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`(^|[^a-z0-9])${t}([^a-z0-9]|$)`).exec(textoNormalizado);
  return m ? m.index : -1;
}
