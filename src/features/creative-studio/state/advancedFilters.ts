import type { CreativeAsset, CreativeAspectRatio } from '../types/creative';
import type { AssetFilters } from './canvasSelectors';

/**
 * Vocabulário dos filtros avançados do topo.
 *
 * Fica aqui, e não dentro do popover, porque três lugares precisam
 * concordar sobre a mesma escolha: o menu que a oferece, o canvas que a
 * aplica e o chip que a mostra. Com a lista escrita no JSX, o rótulo do
 * chip e o rótulo do menu divergem na primeira mudança — e o sintoma é um
 * chip dizendo "Gerando" enquanto o canvas mostra artes prontas.
 *
 * Só entra aqui filtro que `matchesFilters` já sabe aplicar. Oferecer uma
 * opção sem dado por trás é exatamente o que estes botões faziam antes.
 */

export type StudioStatusFilter = 'ready' | 'generating' | 'failed';

export interface StudioAdvancedFilters {
  aspectRatio: CreativeAspectRatio | null;
  status: StudioStatusFilter | null;
}

export const SEM_FILTROS_AVANCADOS: StudioAdvancedFilters = { aspectRatio: null, status: null };

export const STATUS_FILTER_OPTIONS: {
  id: StudioStatusFilter;
  label: string;
  statuses: CreativeAsset['status'][];
}[] = [
  { id: 'ready', label: 'Prontas', statuses: ['ready'] },
  // 'queued' e 'generating' são a mesma coisa para quem olha a tela: ainda
  // não chegou. Separar em duas opções ofereceria uma distinção que só
  // existe do lado do provedor.
  { id: 'generating', label: 'Gerando', statuses: ['queued', 'generating'] },
  { id: 'failed', label: 'Com falha', statuses: ['failed'] },
];

/** Ordem de exibição — a mesma do dock, para não reaprender a lista. */
const ORDEM_FORMATOS: CreativeAspectRatio[] = ['9:16', '4:5', '1:1', '16:9', '4:3', '3:4', '2:3', '3:2', '21:9'];

/**
 * Formatos que o menu oferece.
 *
 * Derivado do acervo em vista, não da lista completa de formatos possíveis:
 * escolher "21:9" num acervo sem nenhum 21:9 esvazia o canvas e não explica
 * por quê.
 */
export function availableAspectRatios(assets: CreativeAsset[]): CreativeAspectRatio[] {
  const presentes = new Set(assets.map((a) => a.aspectRatio).filter(Boolean) as string[]);
  return ORDEM_FORMATOS.filter((r) => presentes.has(r));
}

/** Traduz a escolha do menu para o que os seletores do canvas entendem. */
export function toAssetFilters(filtros: StudioAdvancedFilters): AssetFilters {
  const grupo = STATUS_FILTER_OPTIONS.find((o) => o.id === filtros.status);
  return {
    ...(filtros.aspectRatio ? { aspectRatio: filtros.aspectRatio } : {}),
    ...(grupo ? { statuses: grupo.statuses } : {}),
  };
}

/**
 * Os chips que a barra mostra ao lado da busca.
 *
 * Cada filtro ativo vira um chip removível — é o que impede o canvas de
 * ficar vazio sem explicação depois de uma escolha esquecida dentro do
 * popover.
 */
export function advancedFilterChips(filtros: StudioAdvancedFilters): { id: string; label: string }[] {
  const chips: { id: string; label: string }[] = [];
  if (filtros.aspectRatio) chips.push({ id: 'formato', label: filtros.aspectRatio });
  const grupo = STATUS_FILTER_OPTIONS.find((o) => o.id === filtros.status);
  if (grupo) chips.push({ id: 'status', label: grupo.label });
  return chips;
}

export function hasAdvancedFilters(filtros: StudioAdvancedFilters): boolean {
  return !!filtros.aspectRatio || !!filtros.status;
}
