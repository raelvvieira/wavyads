import { describe, expect, it } from 'vitest';
import type { CreativeAsset } from '../types/creative';
import { canvasSections } from './canvasSections';

function asset(patch: Partial<CreativeAsset> & Pick<CreativeAsset, 'id' | 'type'>): CreativeAsset {
  return {
    projectId: 'p', clientId: 'c', status: 'ready', url: 'u', thumbnailUrl: null,
    parentAssetId: null, rootAssetId: null, groupId: null, factorAxis: null,
    aspectRatio: '4:5', resolution: null, width: null, height: null,
    prompt: null, negativePrompt: null, model: null, errorMessage: null,
    filename: null, isClientIntelligence: false, metadata: {},
    createdAt: '2026-08-18T10:00:00.000Z', updatedAt: '2026-08-18T10:00:00.000Z',
    ...patch,
  };
}

describe('canvasSections — modo grade', () => {
  it('junta um lote de cinco numa seção só, rotulada pelo tipo', () => {
    const lote = ['a', 'b', 'c', 'd', 'e'].map((id) =>
      asset({ id, type: 'factor', groupId: 'g1' }),
    );

    const [secao] = canvasSections(lote, 'grid');

    expect(secao.title).toBe('Fator Criativo');
    expect(secao.items).toHaveLength(5);
    expect(secao.meta).toContain('5');
  });

  it('agrupa artes avulsas pelo DIA em vez de dar uma seção a cada uma', () => {
    // O sintoma que isto evita: trinta gerações soltas viravam trinta
    // cabeçalhos com divisor, e o canvas ficava mais régua que arte.
    const soltas = [
      asset({ id: '1', type: 'original', createdAt: '2026-08-18T09:00:00.000Z' }),
      asset({ id: '2', type: 'edited', createdAt: '2026-08-18T15:00:00.000Z' }),
      asset({ id: '3', type: 'original', createdAt: '2026-08-17T11:00:00.000Z' }),
    ];

    const secoes = canvasSections(soltas, 'grid');

    expect(secoes).toHaveLength(2);
    expect(secoes[0].items.map((i) => i.asset.id)).toEqual(['2', '1']);
    expect(secoes[1].items.map((i) => i.asset.id)).toEqual(['3']);
  });

  it('nunca usa o prompt como título — ele grita em caixa alta', () => {
    const longo = 'Anúncio de lançamento da coleção de verão com modelo ao pôr do sol';
    const secoes = canvasSections([asset({ id: '1', type: 'original', prompt: longo })], 'grid');

    expect(secoes[0].title).not.toContain('Anúncio');
    expect(secoes[0].hint).toBeUndefined();
  });

  it('grupo de UM não vira seção de lote: cai no balde do dia', () => {
    // `groupId` com um item só acontece quando quatro das cinco do Fator
    // falharam. Dar a ele uma seção própria repetiria o ruído que o balde
    // por dia existe para evitar.
    const secoes = canvasSections(
      [asset({ id: '1', type: 'factor', groupId: 'g1' })],
      'grid',
    );

    expect(secoes).toHaveLength(1);
    expect(secoes[0].key).toMatch(/^dia:/);
  });

  it('ordena lote e balde na mesma régua: o mais recente em cima', () => {
    const assets = [
      asset({ id: 'velha', type: 'original', createdAt: '2026-08-10T10:00:00.000Z' }),
      asset({ id: 'l1', type: 'factor', groupId: 'g', createdAt: '2026-08-19T10:00:00.000Z' }),
      asset({ id: 'l2', type: 'factor', groupId: 'g', createdAt: '2026-08-19T10:01:00.000Z' }),
    ];

    const secoes = canvasSections(assets, 'grid');

    expect(secoes[0].key).toBe('g');
    expect(secoes[1].items[0].asset.id).toBe('velha');
  });

  it('lote com tipos diferentes não mente sobre o que é', () => {
    const misto = [
      asset({ id: '1', type: 'factor', groupId: 'g' }),
      asset({ id: '2', type: 'edited', groupId: 'g' }),
    ];

    expect(canvasSections(misto, 'grid')[0].title).toBe('Lote misto');
  });
});

describe('canvasSections — modo linhagem', () => {
  it('uma seção por raiz, com a profundidade de cada descendente', () => {
    const assets = [
      asset({ id: 'raiz', type: 'original', createdAt: '2026-08-18T09:00:00.000Z' }),
      asset({ id: 'filho', type: 'edited', parentAssetId: 'raiz', createdAt: '2026-08-18T09:10:00.000Z' }),
      asset({ id: 'neto', type: 'resize', parentAssetId: 'filho', createdAt: '2026-08-18T09:20:00.000Z' }),
    ];

    const [secao] = canvasSections(assets, 'lineage');

    expect(secao.items.map((i) => [i.asset.id, i.depth])).toEqual([
      ['raiz', 0], ['filho', 1], ['neto', 2],
    ]);
  });

  it('não carrega o prompt como dica — vira um parágrafo pesando no cabeçalho', () => {
    // O prompt de geração completo (com [INTRODUCTION]/[SAFE ZONE]...) já
    // apareceu assim numa seção de linhagem, e é o que este teste trava.
    const [secao] = canvasSections(
      [asset({ id: 'r', type: 'original', prompt: '[INTRODUCTION] Create a 9:16 vertical Instagram Story...' })],
      'lineage',
    );

    expect(secao.title).toBe('Geração');
    expect(secao.hint).toBeUndefined();
  });

  it('conta a árvore inteira, não só a raiz', () => {
    const assets = [
      asset({ id: 'r', type: 'original' }),
      ...['a', 'b', 'c'].map((id) => asset({ id, type: 'factor', parentAssetId: 'r' })),
    ];

    expect(canvasSections(assets, 'lineage')[0].meta).toContain('4 artes');
  });

  it('singular quando é uma só', () => {
    expect(canvasSections([asset({ id: 'r', type: 'original' })], 'lineage')[0].meta)
      .toContain('1 arte ');
  });
});

describe('canvasSections — vazio', () => {
  it('não inventa seção quando não há arte', () => {
    expect(canvasSections([], 'grid')).toEqual([]);
    expect(canvasSections([], 'lineage')).toEqual([]);
  });
});
