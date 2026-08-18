import { describe, expect, it } from 'vitest';
import type { CreativeAsset } from '../types/creative';
import {
  buildLineageForest,
  childrenByParentId,
  flattenLineage,
  generationGroups,
  isArtwork,
  lineageRoots,
  pathToRoot,
} from './lineage';

function asset(over: Partial<CreativeAsset> & { id: string }): CreativeAsset {
  return {
    projectId: 'p', clientId: null, type: 'original', status: 'ready',
    url: 'u', thumbnailUrl: null, parentAssetId: null, rootAssetId: null,
    groupId: null, factorAxis: null, aspectRatio: '4:5', resolution: '4K',
    width: null, height: null, prompt: null, negativePrompt: null, model: null,
    errorMessage: null, filename: null, isClientIntelligence: false,
    metadata: {}, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    ...over,
  } as CreativeAsset;
}

describe('isArtwork', () => {
  it('separa arte de insumo', () => {
    // O canvas desenha arte; logo, produto e referência são entrada.
    for (const t of ['original', 'factor', 'edited', 'resize', 'imported'] as const) {
      expect(isArtwork(asset({ id: 'x', type: t }))).toBe(true);
    }
    for (const t of ['reference', 'logo', 'product', 'avatar', 'template'] as const) {
      expect(isArtwork(asset({ id: 'x', type: t }))).toBe(false);
    }
  });
});

describe('lineageRoots', () => {
  it('trata sem pai como raiz', () => {
    const a = asset({ id: 'a' });
    const b = asset({ id: 'b', parentAssetId: 'a' });
    expect(lineageRoots([a, b]).map((x) => x.id)).toEqual(['a']);
  });

  it('trata pai ausente do conjunto como raiz', () => {
    // Sem isto, um asset cujo pai ficou fora da página de resultados
    // desapareceria do canvas em vez de aparecer solto.
    const orfao = asset({ id: 'b', parentAssetId: 'fora-do-conjunto' });
    expect(lineageRoots([orfao]).map((x) => x.id)).toEqual(['b']);
  });
});

describe('buildLineageForest', () => {
  const original = asset({ id: 'o', createdAt: '2026-01-01T00:00:00Z' });
  const edicao1 = asset({ id: 'e1', type: 'edited', parentAssetId: 'o', createdAt: '2026-01-02T00:00:00Z' });
  const edicao2 = asset({ id: 'e2', type: 'edited', parentAssetId: 'e1', createdAt: '2026-01-03T00:00:00Z' });
  const quadrado = asset({ id: 'sq', type: 'resize', parentAssetId: 'o', createdAt: '2026-01-04T00:00:00Z' });

  it('encadeia edição sobre edição', () => {
    const [raiz] = buildLineageForest([original, edicao1, edicao2]);
    expect(raiz.asset.id).toBe('o');
    expect(raiz.children[0].asset.id).toBe('e1');
    expect(raiz.children[0].children[0].asset.id).toBe('e2');
    expect(raiz.children[0].children[0].depth).toBe(2);
  });

  it('ordena irmãos do mais antigo para o mais novo', () => {
    // A leitura acompanha a ordem em que o trabalho aconteceu.
    const [raiz] = buildLineageForest([original, quadrado, edicao1]);
    expect(raiz.children.map((c) => c.asset.id)).toEqual(['e1', 'sq']);
  });

  it('não trava com ciclo no banco', () => {
    // Um pai apontando para descendente travaria a recursão. Dado
    // corrompido não pode pendurar a interface.
    const a = asset({ id: 'a', parentAssetId: 'b' });
    const b = asset({ id: 'b', parentAssetId: 'a' });
    expect(() => buildLineageForest([a, b])).not.toThrow();
  });

  it('lista vazia devolve floresta vazia', () => {
    expect(buildLineageForest([])).toEqual([]);
  });

  it('flatten segue ordem de leitura: pai antes dos descendentes', () => {
    const plano = flattenLineage(buildLineageForest([original, edicao1, edicao2, quadrado]));
    expect(plano.map((n) => n.asset.id)).toEqual(['o', 'e1', 'e2', 'sq']);
  });
});

describe('childrenByParentId', () => {
  it('indexa só quem tem pai', () => {
    const m = childrenByParentId([asset({ id: 'a' }), asset({ id: 'b', parentAssetId: 'a' })]);
    expect(m.get('a')!.map((x) => x.id)).toEqual(['b']);
    expect(m.has('b')).toBe(false);
  });
});

describe('generationGroups', () => {
  it('junta as cinco do Fator num lote', () => {
    const fator = Array.from({ length: 5 }, (_, i) =>
      asset({ id: `f${i}`, type: 'factor', groupId: 'g1', createdAt: `2026-01-0${i + 1}T00:00:00Z` }),
    );
    const grupos = generationGroups(fator);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].groupId).toBe('g1');
    expect(grupos[0].assets).toHaveLength(5);
  });

  it('arte avulsa vira lote de um', () => {
    // Assim o canvas desenha tudo com a mesma forma, em vez de ter um
    // caminho para lote e outro para arte solta.
    const grupos = generationGroups([asset({ id: 'a' }), asset({ id: 'b' })]);
    expect(grupos).toHaveLength(2);
    expect(grupos.every((g) => g.assets.length === 1 && g.groupId === null)).toBe(true);
  });

  it('lote mais recente primeiro', () => {
    const antigo = asset({ id: 'a', groupId: 'g1', createdAt: '2026-01-01T00:00:00Z' });
    const novo = asset({ id: 'b', groupId: 'g2', createdAt: '2026-02-01T00:00:00Z' });
    expect(generationGroups([antigo, novo]).map((g) => g.groupId)).toEqual(['g2', 'g1']);
  });

  it('dentro do lote, ordem cronológica', () => {
    const b = asset({ id: 'b', groupId: 'g', createdAt: '2026-01-02T00:00:00Z' });
    const a = asset({ id: 'a', groupId: 'g', createdAt: '2026-01-01T00:00:00Z' });
    expect(generationGroups([b, a])[0].assets.map((x) => x.id)).toEqual(['a', 'b']);
  });
});

describe('pathToRoot', () => {
  it('devolve o caminho da raiz até o asset', () => {
    const o = asset({ id: 'o' });
    const e1 = asset({ id: 'e1', parentAssetId: 'o' });
    const e2 = asset({ id: 'e2', parentAssetId: 'e1' });
    expect(pathToRoot('e2', [o, e1, e2]).map((a) => a.id)).toEqual(['o', 'e1', 'e2']);
  });

  it('para no pai ausente em vez de devolver vazio', () => {
    const orfao = asset({ id: 'x', parentAssetId: 'sumiu' });
    expect(pathToRoot('x', [orfao]).map((a) => a.id)).toEqual(['x']);
  });

  it('não entra em laço com ciclo', () => {
    const a = asset({ id: 'a', parentAssetId: 'b' });
    const b = asset({ id: 'b', parentAssetId: 'a' });
    expect(() => pathToRoot('a', [a, b])).not.toThrow();
  });

  it('id inexistente devolve vazio', () => {
    expect(pathToRoot('nada', [asset({ id: 'a' })])).toEqual([]);
  });
});
