import { describe, expect, it } from 'vitest';
import type { CreativeAsset } from '../types/creative';
import {
  availableActionsForSelection,
  canGenerate,
  summarizeSelection,
  visibleCanvasAssets,
} from './canvasSelectors';

function asset(over: Partial<CreativeAsset> & { id: string }): CreativeAsset {
  return {
    projectId: 'p', clientId: null, type: 'original', status: 'ready',
    url: 'https://x/a.png', thumbnailUrl: null, parentAssetId: null, rootAssetId: null,
    groupId: null, factorAxis: null, aspectRatio: '4:5', resolution: '4K',
    width: null, height: null, prompt: null, negativePrompt: null, model: null,
    errorMessage: null, filename: null, isClientIntelligence: false,
    metadata: {}, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    ...over,
  } as CreativeAsset;
}

describe('visibleCanvasAssets', () => {
  it('esconde insumos', () => {
    // Um projeto com dez referências abriria o canvas poluído: elas
    // alimentam a geração, não são resultado dela.
    const lista = [
      asset({ id: 'arte', type: 'original' }),
      asset({ id: 'ref', type: 'reference' }),
      asset({ id: 'logo', type: 'logo' }),
    ];
    expect(visibleCanvasAssets(lista).map((a) => a.id)).toEqual(['arte']);
  });

  it('filtra por cliente, tipo, status e formato', () => {
    const lista = [
      asset({ id: 'a', clientId: 'c1', type: 'original', aspectRatio: '4:5' }),
      asset({ id: 'b', clientId: 'c2', type: 'factor', aspectRatio: '1:1' }),
      asset({ id: 'c', clientId: 'c1', type: 'factor', status: 'failed', aspectRatio: '4:5' }),
    ];
    expect(visibleCanvasAssets(lista, { clientId: 'c1' }).map((a) => a.id)).toEqual(['a', 'c']);
    expect(visibleCanvasAssets(lista, { types: ['factor'] }).map((a) => a.id)).toEqual(['b', 'c']);
    expect(visibleCanvasAssets(lista, { statuses: ['failed'] }).map((a) => a.id)).toEqual(['c']);
    expect(visibleCanvasAssets(lista, { aspectRatio: '1:1' }).map((a) => a.id)).toEqual(['b']);
  });

  it('clientId nulo não filtra nada', () => {
    // "Todos os clientes" é diferente de "clientes sem cliente".
    const lista = [asset({ id: 'a', clientId: 'c1' }), asset({ id: 'b', clientId: null })];
    expect(visibleCanvasAssets(lista, { clientId: null })).toHaveLength(2);
  });

  it('busca em prompt, arquivo, formato e eixo', () => {
    const lista = [
      asset({ id: 'a', prompt: 'Anúncio de verão' }),
      asset({ id: 'b', filename: 'campanha-inverno.png' }),
      asset({ id: 'c', factorAxis: 'persona' }),
    ];
    expect(visibleCanvasAssets(lista, { query: 'verão' }).map((a) => a.id)).toEqual(['a']);
    expect(visibleCanvasAssets(lista, { query: 'INVERNO' }).map((a) => a.id)).toEqual(['b']);
    expect(visibleCanvasAssets(lista, { query: 'persona' }).map((a) => a.id)).toEqual(['c']);
  });

  it('busca vazia ou só espaço não filtra', () => {
    const lista = [asset({ id: 'a' })];
    expect(visibleCanvasAssets(lista, { query: '   ' })).toHaveLength(1);
  });
});

describe('availableActionsForSelection', () => {
  it('sem seleção, nenhuma ação', () => {
    expect(availableActionsForSelection([])).toEqual([]);
  });

  it('arte pronta aceita transformação', () => {
    const acoes = availableActionsForSelection([asset({ id: 'a' })]);
    expect(acoes).toContain('edit');
    expect(acoes).toContain('factor');
    expect(acoes).toContain('download');
  });

  it('arte gerando não aceita nada', () => {
    // Oferecer "editar" numa arte que ainda está gerando produz chamada com
    // URL nula.
    expect(availableActionsForSelection([asset({ id: 'a', status: 'generating', url: null })])).toEqual([]);
  });

  it('arte falhada só oferece nova tentativa', () => {
    expect(availableActionsForSelection([asset({ id: 'a', status: 'failed' })])).toEqual(['retry']);
  });

  it('quadrado não oferece redimensionar', () => {
    // O destino do resize é sempre 1:1; partir de 1:1 não faz sentido.
    expect(availableActionsForSelection([asset({ id: 'a', aspectRatio: '1:1' })])).not.toContain('resize');
    expect(availableActionsForSelection([asset({ id: 'a', aspectRatio: '9:16' })])).toContain('resize');
  });

  it('inteligência do cliente exige cliente', () => {
    expect(availableActionsForSelection([asset({ id: 'a', clientId: null })]))
      .not.toContain('save-to-client-intelligence');
    expect(availableActionsForSelection([asset({ id: 'a', clientId: 'c1' })]))
      .toContain('save-to-client-intelligence');
  });

  it('em lote, só o que o backend faz em lote', () => {
    // Redimensionar e aplicar Fator são um-a-um hoje. Oferecer em massa
    // prometeria o que não existe.
    const lote = [asset({ id: 'a' }), asset({ id: 'b' })];
    expect(availableActionsForSelection(lote)).toEqual(['download']);
  });

  it('lote com item não pronto não oferece nada', () => {
    const lote = [asset({ id: 'a' }), asset({ id: 'b', status: 'generating', url: null })];
    expect(availableActionsForSelection(lote)).toEqual([]);
  });

  it('arte pronta sem URL não conta como pronta', () => {
    // Status e URL podem divergir se a persistência falhar depois do
    // provedor responder.
    expect(availableActionsForSelection([asset({ id: 'a', status: 'ready', url: null })])).toEqual([]);
  });
});

describe('canGenerate', () => {
  it('exige prompt ou copy', () => {
    expect(canGenerate({ prompt: '', hasCopy: false, busy: false })).toBe(false);
    expect(canGenerate({ prompt: '   ', hasCopy: false, busy: false })).toBe(false);
    expect(canGenerate({ prompt: 'algo', hasCopy: false, busy: false })).toBe(true);
    // Copy sozinha basta: é o caso do template e do Criativo Rápido.
    expect(canGenerate({ prompt: '', hasCopy: true, busy: false })).toBe(true);
  });

  it('ocupado bloqueia', () => {
    expect(canGenerate({ prompt: 'algo', hasCopy: true, busy: true })).toBe(false);
  });
});

describe('summarizeSelection', () => {
  it('conta por status, com fila junto de gerando', () => {
    const s = summarizeSelection([
      asset({ id: 'a', status: 'ready' }),
      asset({ id: 'b', status: 'generating' }),
      asset({ id: 'c', status: 'queued' }),
      asset({ id: 'd', status: 'failed' }),
    ]);
    expect(s).toEqual({ total: 4, ready: 1, generating: 2, failed: 1 });
  });
});
