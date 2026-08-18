/**
 * Vocabulário das chaves de asset do Criativo Studio.
 *
 * A página identifica cada arte do quadro por uma string com formato próprio:
 *
 *   main:story          arte principal
 *   main:square         versão 1080 da principal
 *   f{i}:story          variação i do Fator Criativo (0..4)
 *   f{i}:square         versão 1080 daquela variação
 *   edit:{origem}#{n}   n-ésima edição de uma arte — a origem é outra chave
 *
 * Era um protocolo implícito: as chaves eram montadas por template string
 * espalhada pelo render e lidas por regex num lugar só, sem teste. Como
 * `edit:` aninha outra chave dentro de si, uma leitura ingênua quebra o
 * encadeamento de edições sucessivas.
 *
 * Este módulo é a fonte única. O canvas V2 depende dele para desenhar
 * linhagem, então o formato precisa ser explícito e testado antes.
 */

export type AssetAspect = 'story' | 'square';

export type AssetKeyRef =
  | { kind: 'main'; aspect: AssetAspect }
  | { kind: 'factor'; index: number; aspect: AssetAspect }
  | { kind: 'edit'; source: string; version: number };

export const mainKey = (aspect: AssetAspect): string => `main:${aspect}`;
export const factorKey = (index: number, aspect: AssetAspect): string => `f${index}:${aspect}`;
export const editKey = (sourceKey: string, version: number): string => `edit:${sourceKey}#${version}`;

/** Lê uma chave. Devolve null quando o formato não é reconhecido. */
export function parseAssetKey(key: string): AssetKeyRef | null {
  if (key === 'main:story' || key === 'main:square') {
    return { kind: 'main', aspect: key.slice(5) as AssetAspect };
  }

  // A edição vem primeiro: a origem dela pode ser qualquer outra chave,
  // inclusive outra edição. `#` separa pela ÚLTIMA ocorrência para que
  // 'edit:edit:main:story#0#1' resolva a versão 1 da versão 0.
  if (key.startsWith('edit:')) {
    const corte = key.lastIndexOf('#');
    if (corte <= 5) return null;
    const version = Number(key.slice(corte + 1));
    if (!Number.isInteger(version) || version < 0) return null;
    return { kind: 'edit', source: key.slice(5, corte), version };
  }

  const fator = key.match(/^f(\d+):(story|square)$/);
  if (fator) {
    return { kind: 'factor', index: Number(fator[1]), aspect: fator[2] as AssetAspect };
  }

  return null;
}

/** Origem imediata de uma chave editada — o elo da cadeia de edições. */
export function editSourceOf(key: string): string | null {
  const ref = parseAssetKey(key);
  return ref?.kind === 'edit' ? ref.source : null;
}

/**
 * Resolve o ID do asset que uma chave representa.
 *
 * É a âncora de linhagem: o valor devolvido vira `parent_asset_id` da
 * próxima transformação. Devolver null aqui produz arte órfã, então quem
 * chama precisa saber que null é uma resposta possível, não um acidente.
 */
export interface AssetIdSources {
  mainStoryAssetId: string | null;
  mainSquareAssetId: string | null;
  factorAssetIds: (string | null)[];
  factorSquareAssetIds: (string | null)[];
  editedVersions: Record<string, { assetId?: string | null }[]>;
}

export function resolveAssetId(key: string, sources: AssetIdSources): string | null {
  const ref = parseAssetKey(key);
  if (!ref) return null;

  if (ref.kind === 'main') {
    return (ref.aspect === 'square' ? sources.mainSquareAssetId : sources.mainStoryAssetId) ?? null;
  }

  if (ref.kind === 'factor') {
    const lista = ref.aspect === 'square' ? sources.factorSquareAssetIds : sources.factorAssetIds;
    return lista?.[ref.index] ?? null;
  }

  // Re-edição aponta para a versão editada, não para a arte que a originou —
  // é o que encadeia v1 → v2 → v3 em vez de achatar tudo na raiz.
  return sources.editedVersions[ref.source]?.[ref.version]?.assetId ?? null;
}
