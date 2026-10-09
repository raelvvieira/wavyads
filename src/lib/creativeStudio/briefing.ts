import type { CreativeAsset } from '@/features/creative-studio/types/creative';

/**
 * O briefing da peça — o texto que descreve o ANÚNCIO, não a operação.
 *
 * `asset.prompt` quase sempre serve. A exceção é o reenquadramento: ele
 * grava na linha o texto que mandou reenquadrar, que começa com
 * `[REFRAME — THIS IS NOT A NEW ARTWORK]` e `[FRAMING OVERRIDE — THIS RENDER
 * IS 1:1]`. Esse texto PRECISA ficar em `prompt`, porque é ele que o
 * "tentar novamente" reenvia.
 *
 * O problema é quem lê `prompt` esperando um briefing: o Fator Criativo
 * manda esse campo ao estrategista como "a peça aprovada". Rodar o Fator
 * sobre um reenquadramento fazia as cinco teses nascerem de um boilerplate
 * de recorte — e não da oferta.
 *
 * Daí os dois campos: `prompt` é o que foi enviado ao gerador, e
 * `promptDeOrigem` é o briefing que a peça herda. Quando não há herança, os
 * dois são a mesma coisa.
 */
export function briefingDaArte(asset: Pick<CreativeAsset, 'prompt' | 'metadata'> | null | undefined): string {
  if (!asset) return '';
  const herdado = (asset.metadata as any)?.promptDeOrigem;
  if (typeof herdado === 'string' && herdado.trim()) return herdado;
  return asset.prompt ?? '';
}
