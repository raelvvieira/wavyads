import type {
  CreativeArtworkSections,
  CreativeAsset,
  CreativeAssetGroup,
  FactorGroupView,
} from '../types/creative';

/**
 * Monta as seções do Canvas a partir da linhagem. Função pura e sem nenhuma
 * dependência de I/O — vive fora da camada de API justamente para poder ser
 * testada sem subir cliente de banco.
 *
 * É isto que substitui as listas paralelas (storyImage / factorImages /
 * editedVersions) que o fluxo clássico mantinha no state do React.
 */
export function buildArtworkSections(
  assets: CreativeAsset[],
  groups: CreativeAssetGroup[] = [],
): CreativeArtworkSections {
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const buckets = new Map<string, FactorGroupView>();

  for (const asset of assets) {
    if (asset.type !== 'factor') continue;
    // Lotes antigos não têm grupo: caem para a arte de origem, depois para a
    // raiz da árvore. Sem nenhum vínculo, a própria arte vira seu bucket — do
    // contrário todas as órfãs se fundiriam num grupo que nunca existiu.
    const key = asset.groupId ?? asset.parentAssetId ?? asset.rootAssetId ?? asset.id;
    let bucket = buckets.get(key);
    if (!bucket) {
      const group = asset.groupId ? groupById.get(asset.groupId) ?? null : null;
      bucket = {
        group,
        parentAssetId: group?.parentAssetId ?? asset.parentAssetId ?? null,
        assets: [],
      };
      buckets.set(key, bucket);
    }
    bucket.assets.push(asset);
  }

  return {
    originals: assets.filter((asset) => asset.type === 'original' || asset.type === 'imported'),
    factorGroups: Array.from(buckets.values()),
    edited: assets.filter((asset) => asset.type === 'edited'),
    resizes: assets.filter((asset) => asset.type === 'resize'),
  };
}
