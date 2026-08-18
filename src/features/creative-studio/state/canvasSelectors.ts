import type { CreativeAsset } from '../types/creative';
import { isArtwork } from './lineage';

/**
 * Seletores do canvas: o que aparece e o que pode ser feito.
 *
 * Puros de propósito. A regra de "quais ações valem para esta seleção" é o
 * tipo de coisa que, escrita direto no JSX, vira condição duplicada em três
 * lugares e diverge no quarto — e o sintoma é um botão que aparece e não
 * funciona.
 */

export interface AssetFilters {
  clientId?: string | null;
  types?: CreativeAsset['type'][];
  statuses?: CreativeAsset['status'][];
  aspectRatio?: string | null;
  /** Busca livre por prompt, nome de arquivo ou formato. */
  query?: string;
}

function matchesQuery(asset: CreativeAsset, query: string): boolean {
  const alvo = query.trim().toLowerCase();
  if (!alvo) return true;
  return [asset.prompt, asset.filename, asset.aspectRatio, asset.factorAxis]
    .some((campo) => !!campo && campo.toLowerCase().includes(alvo));
}

function matchesFilters(a: CreativeAsset, filtros: AssetFilters): boolean {
  if (filtros.clientId !== undefined && filtros.clientId !== null && a.clientId !== filtros.clientId) return false;
  if (filtros.types?.length && !filtros.types.includes(a.type)) return false;
  if (filtros.statuses?.length && !filtros.statuses.includes(a.status)) return false;
  if (filtros.aspectRatio && a.aspectRatio !== filtros.aspectRatio) return false;
  if (filtros.query && !matchesQuery(a, filtros.query)) return false;
  return true;
}

/**
 * O que o canvas desenha por padrão.
 *
 * Insumos (logo, produto, referência) ficam de fora: eles alimentam a
 * geração, não são resultado dela. Sem esse corte, o canvas de um projeto
 * com dez referências abre poluído.
 */
export function visibleCanvasAssets(assets: CreativeAsset[], filtros: AssetFilters = {}): CreativeAsset[] {
  return assets.filter((a) => isArtwork(a) && matchesFilters(a, filtros));
}

/**
 * O acervo de uma biblioteca escolhida a dedo.
 *
 * Aqui o insumo APARECE. O corte de `visibleCanvasAssets` existe para que o
 * canvas não abra poluído, não para tornar referência e produto
 * inalcançáveis — sem esta porta, abrir "Referências" mostraria zero e a
 * biblioteca pareceria vazia com sessenta itens dentro.
 */
export function libraryAssets(assets: CreativeAsset[], filtros: AssetFilters = {}): CreativeAsset[] {
  return assets.filter((a) => matchesFilters(a, filtros));
}

export type SelectionAction =
  | 'edit'
  | 'factor'
  | 'resize'
  | 'download'
  | 'preview'
  | 'save-as-template'
  | 'save-to-client-intelligence'
  | 'retry';

/**
 * Ações válidas para uma seleção.
 *
 * A regra central: só arte pronta aceita transformação. Oferecer "editar"
 * numa arte que ainda está gerando produz uma chamada com URL nula, e
 * oferecer numa que falhou produz uma edição do nada.
 */
export function availableActionsForSelection(selecionados: CreativeAsset[]): SelectionAction[] {
  if (selecionados.length === 0) return [];

  const todasProntas = selecionados.every((a) => a.status === 'ready' && !!a.url);
  const algumaFalhou = selecionados.some((a) => a.status === 'failed');

  if (selecionados.length > 1) {
    // Em lote só o que o backend sabe fazer em lote. Redimensionar e aplicar
    // Fator são um-a-um hoje; oferecer em massa prometeria o que não existe.
    return todasProntas ? ['download'] : [];
  }

  if (algumaFalhou) return ['retry'];
  if (!todasProntas) return [];

  const [asset] = selecionados;
  const acoes: SelectionAction[] = ['edit', 'factor', 'download', 'preview', 'save-as-template'];

  // Redimensionar só faz sentido saindo de um formato que não é quadrado —
  // o destino é sempre 1:1.
  if (asset.aspectRatio && asset.aspectRatio !== '1:1') acoes.push('resize');

  // Inteligência do cliente exige um cliente para guardar.
  if (asset.clientId) acoes.push('save-to-client-intelligence');

  return acoes;
}

/** Uma geração só pode partir se houver o que gerar e para onde. */
export function canGenerate(input: {
  prompt: string;
  hasCopy: boolean;
  busy: boolean;
}): boolean {
  if (input.busy) return false;
  // Prompt vazio E sem copy não descreve nada. Um dos dois basta: a copy
  // sozinha já define o criativo quando vem de template ou do Criativo Rápido.
  return input.prompt.trim().length > 0 || input.hasCopy;
}

export interface SelectionSummary {
  total: number;
  ready: number;
  generating: number;
  failed: number;
}

/** Contagem por status. É o que o dock usa para falar da seleção. */
export function summarizeSelection(selecionados: CreativeAsset[]): SelectionSummary {
  return {
    total: selecionados.length,
    ready: selecionados.filter((a) => a.status === 'ready').length,
    generating: selecionados.filter((a) => a.status === 'generating' || a.status === 'queued').length,
    failed: selecionados.filter((a) => a.status === 'failed').length,
  };
}
