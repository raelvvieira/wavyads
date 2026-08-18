import type { CreativeAsset } from '../types/creative';

/**
 * Seletores de linhagem para o canvas.
 *
 * Toda transformação — Fator, edição, resize — cria um asset novo ligado ao
 * anterior por `parent_asset_id`. O canvas precisa dessa árvore para desenhar
 * evolução em vez de uma pilha achatada de imagens.
 *
 * Funções puras de propósito: a árvore é a parte fácil de errar e a difícil
 * de perceber que errou, porque um pai perdido não quebra a tela — só some
 * do agrupamento.
 */

export interface LineageNode {
  asset: CreativeAsset;
  children: LineageNode[];
  /** Distância até a raiz. A raiz é 0. */
  depth: number;
}

/** Só o que o canvas desenha. Insumos ficam de fora. */
const TIPOS_DE_ARTE = new Set(['original', 'factor', 'edited', 'resize', 'imported']);

export function isArtwork(asset: CreativeAsset): boolean {
  return TIPOS_DE_ARTE.has(asset.type);
}

/** Índice de filhos por pai. Assets sem pai não entram. */
export function childrenByParentId(assets: CreativeAsset[]): Map<string, CreativeAsset[]> {
  const mapa = new Map<string, CreativeAsset[]>();
  for (const a of assets) {
    if (!a.parentAssetId) continue;
    const lista = mapa.get(a.parentAssetId);
    if (lista) lista.push(a);
    else mapa.set(a.parentAssetId, [a]);
  }
  return mapa;
}

/**
 * Raízes da árvore.
 *
 * Raiz é quem não tem pai — ou quem tem um pai que não está no conjunto
 * carregado. O segundo caso importa: sem ele, um asset cujo pai ficou fora
 * da página de resultados desapareceria do canvas em vez de aparecer solto.
 */
export function lineageRoots(assets: CreativeAsset[]): CreativeAsset[] {
  const presentes = new Set(assets.map((a) => a.id));
  return assets.filter((a) => !a.parentAssetId || !presentes.has(a.parentAssetId));
}

/**
 * Monta as árvores. Ordena irmãos do mais antigo para o mais novo, para que
 * a leitura acompanhe a ordem em que o trabalho aconteceu.
 *
 * O ciclo é tratado: um pai que aponte para um descendente travaria a
 * recursão, e um dado corrompido no banco não pode pendurar a interface.
 */
export function buildLineageForest(assets: CreativeAsset[]): LineageNode[] {
  const filhos = childrenByParentId(assets);
  const porData = (a: CreativeAsset, b: CreativeAsset) => a.createdAt.localeCompare(b.createdAt);

  const montar = (asset: CreativeAsset, depth: number, visitados: Set<string>): LineageNode => {
    if (visitados.has(asset.id)) return { asset, children: [], depth };
    const proximos = new Set(visitados).add(asset.id);
    return {
      asset,
      depth,
      children: (filhos.get(asset.id) ?? [])
        .slice()
        .sort(porData)
        .map((f) => montar(f, depth + 1, proximos)),
    };
  };

  return lineageRoots(assets).slice().sort(porData).map((r) => montar(r, 0, new Set()));
}

/** Achata uma árvore na ordem de leitura: pai, depois seus descendentes. */
export function flattenLineage(nodes: LineageNode[]): LineageNode[] {
  return nodes.flatMap((n) => [n, ...flattenLineage(n.children)]);
}

export interface GenerationGroup {
  /** `groupId` do lote, ou a chave sintética de quem não pertence a nenhum. */
  key: string;
  groupId: string | null;
  assets: CreativeAsset[];
}

/**
 * Agrupa por lote de geração.
 *
 * `creative_asset_groups` junta as cinco do Fator. Arte avulsa não tem grupo
 * e vira um lote de um — assim o canvas desenha tudo com a mesma forma, em
 * vez de ter um caminho para lote e outro para arte solta.
 *
 * Ordena do lote mais recente para o mais antigo: no canvas, o trabalho de
 * agora fica em cima.
 */
export function generationGroups(assets: CreativeAsset[]): GenerationGroup[] {
  const grupos = new Map<string, GenerationGroup>();

  for (const a of assets) {
    const key = a.groupId ?? `solo:${a.id}`;
    const existente = grupos.get(key);
    if (existente) existente.assets.push(a);
    else grupos.set(key, { key, groupId: a.groupId ?? null, assets: [a] });
  }

  const maisRecente = (g: GenerationGroup) =>
    g.assets.reduce((max, a) => (a.createdAt > max ? a.createdAt : max), '');

  return [...grupos.values()]
    .map((g) => ({ ...g, assets: g.assets.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)) }))
    .sort((a, b) => maisRecente(b).localeCompare(maisRecente(a)));
}

/** Caminho da raiz até o asset. Útil para explicar "de onde isto veio". */
export function pathToRoot(assetId: string, assets: CreativeAsset[]): CreativeAsset[] {
  const porId = new Map(assets.map((a) => [a.id, a]));
  const caminho: CreativeAsset[] = [];
  const visitados = new Set<string>();

  let atual = porId.get(assetId);
  while (atual && !visitados.has(atual.id)) {
    visitados.add(atual.id);
    caminho.unshift(atual);
    atual = atual.parentAssetId ? porId.get(atual.parentAssetId) : undefined;
  }
  return caminho;
}
