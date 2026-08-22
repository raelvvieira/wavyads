import type { CreativeAsset } from '../types/creative';

/**
 * Quantas artes foram geradas com um insumo.
 *
 * Serve à confirmação de apagar: "esta referência foi usada em 3 artes" é
 * uma frase que muda a decisão, e "tem certeza?" sozinho não é. Sem ela, o
 * usuário só descobre o efeito colateral depois — ao tentar gerar de novo
 * a partir de uma arte cujo anexo já não existe.
 *
 * O dado já está na tela: cada geração grava as URLs dos insumos no
 * `metadata` da arte (ver `studioAssetActions.ts`, na criação da linha).
 * Nenhuma consulta ao banco é necessária, o que também significa que a
 * contagem é do que está carregado — ela pode subestimar em acervos
 * grandes, e é por isso que a frase da confirmação diz "usada em N artes"
 * em vez de prometer ser o total do banco.
 */

/** Onde uma URL de insumo pode estar gravada numa arte. */
function urlsDeInsumo(asset: CreativeAsset): string[] {
  const meta = asset.metadata as any;
  if (!meta) return [];
  const produtos = Array.isArray(meta.productImages) ? meta.productImages : [];
  const avatares = Array.isArray(meta.avatarImages) ? meta.avatarImages : [];
  return [...produtos, ...avatares, meta.logoImage].filter(
    (valor): valor is string => typeof valor === 'string' && valor.length > 0,
  );
}

export function countAssetUsage(assets: CreativeAsset[], url: string | null | undefined): number {
  const alvo = (url ?? '').trim();
  if (!alvo) return 0;
  // Uma arte que usa o mesmo insumo em dois campos conta uma vez só: a
  // pergunta é "quantas artes perdem o anexo", não "quantas referências há".
  return assets.filter((a) => urlsDeInsumo(a).includes(alvo)).length;
}

/** A frase que a confirmação mostra. Vazia quando o insumo nunca foi usado. */
export function usageSentence(total: number): string {
  if (total <= 0) return '';
  const artes = total === 1 ? '1 arte' : `${total} artes`;
  const pronome = total === 1 ? 'Ela continua' : 'Elas continuam';
  return `Foi usada em ${artes}. ${pronome} existindo, mas "tentar novamente" nelas perde o anexo.`;
}
