import type { CreativeAsset } from '../types/creative';
import type { CanvasViewMode } from '../types/studioUi';
import { buildLineageForest, flattenLineage, generationGroups } from './lineage';

/**
 * Como o canvas divide as artes em seções.
 *
 * Mora aqui, e não no JSX, porque a regra tem dois casos que erram calados:
 * um lote de cinco não pode ser lido como cinco artes soltas, e trinta artes
 * avulsas não podem virar trinta cabeçalhos. A primeira versão fazia as
 * duas coisas — cada geração solta ganhava uma seção com divisor, e o
 * título era o prompt em caixa alta, que num prompt de sessenta caracteres
 * vira um bloco cinza gritado.
 */

export interface CanvasItem {
  asset: CreativeAsset;
  /** Distância até a raiz. Sempre 0 no modo grade. */
  depth: number;
}

export interface CanvasSection {
  key: string;
  /** Rótulo curto, em caixa alta na tela. Nunca o prompt. */
  title: string;
  /** Contagem ou data. Complementa o título sem competir com ele. */
  meta: string;
  /** Linha em caixa normal, quando há prompt que ajude a identificar. */
  hint?: string;
  items: CanvasItem[];
}

const TIPO_LOTE: Record<string, string> = {
  original: 'Geração',
  factor: 'Fator Criativo',
  edited: 'Edição',
  resize: 'Redimensionamento',
  imported: 'Importadas',
};

function rotuloDoLote(assets: CreativeAsset[]): string {
  const tipos = new Set(assets.map((a) => a.type));
  if (tipos.size === 1) return TIPO_LOTE[assets[0].type] ?? 'Lote';
  return 'Lote misto';
}

function diaDe(iso: string): string {
  return iso.slice(0, 10);
}

function dataLonga(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
}

function dataCurta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function plural(n: number): string {
  return `${n} arte${n === 1 ? '' : 's'}`;
}

/**
 * Modo grade.
 *
 * Lote com `groupId` vira uma seção — as cinco do Fator nasceram juntas e
 * lidas separadas não contam a mesma história. Arte avulsa cai no balde do
 * DIA em que nasceu, em vez de virar seção de uma linha só.
 */
function secoesEmGrade(assets: CreativeAsset[]): CanvasSection[] {
  const lotes: CanvasSection[] = [];
  const porDia = new Map<string, CreativeAsset[]>();

  for (const grupo of generationGroups(assets)) {
    if (grupo.groupId && grupo.assets.length > 1) {
      lotes.push({
        key: grupo.key,
        title: rotuloDoLote(grupo.assets),
        meta: `${grupo.assets.length} · ${dataCurta(grupo.assets[0].createdAt)}`,
        items: grupo.assets.map((asset) => ({ asset, depth: 0 })),
      });
      continue;
    }
    for (const asset of grupo.assets) {
      const dia = diaDe(asset.createdAt);
      const lista = porDia.get(dia);
      if (lista) lista.push(asset);
      else porDia.set(dia, [asset]);
    }
  }

  const diarias: CanvasSection[] = [...porDia.entries()].map(([dia, lista]) => {
    const ordenados = lista.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      key: `dia:${dia}`,
      title: dataLonga(ordenados[0].createdAt),
      meta: plural(ordenados.length),
      items: ordenados.map((asset) => ({ asset, depth: 0 })),
    };
  });

  // Uma ordem só para os dois tipos de seção: o trabalho mais recente em
  // cima, venha ele de um lote ou de uma arte solta.
  return [...lotes, ...diarias].sort((a, b) =>
    maisRecente(b).localeCompare(maisRecente(a)),
  );
}

function maisRecente(secao: CanvasSection): string {
  return secao.items.reduce((max, i) => (i.asset.createdAt > max ? i.asset.createdAt : max), '');
}

/** Modo linhagem: uma seção por raiz, com o recuo mostrando a distância. */
function secoesEmLinhagem(assets: CreativeAsset[]): CanvasSection[] {
  return buildLineageForest(assets)
    .map((raiz) => {
      const items = flattenLineage([raiz]).map((n) => ({ asset: n.asset, depth: n.depth }));
      return {
        key: raiz.asset.id,
        title: TIPO_LOTE[raiz.asset.type] ?? 'Origem',
        // Sem `hint`: o prompt de geração inteiro (com os blocos
        // [INTRODUCTION]/[SAFE ZONE]...) virava um parágrafo pesando sobre
        // o cabeçalho da seção. `meta` (contagem + data) já identifica a
        // árvore o suficiente para navegar a linhagem.
        meta: `${plural(items.length)} · ${dataCurta(raiz.asset.createdAt)}`,
        items,
      };
    })
    .sort((a, b) => maisRecente(b).localeCompare(maisRecente(a)));
}

export function canvasSections(assets: CreativeAsset[], mode: CanvasViewMode): CanvasSection[] {
  return mode === 'lineage' ? secoesEmLinhagem(assets) : secoesEmGrade(assets);
}
