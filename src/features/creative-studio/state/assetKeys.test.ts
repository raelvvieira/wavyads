import { describe, expect, it } from 'vitest';
import {
  editKey,
  editSourceOf,
  factorKey,
  mainKey,
  parseAssetKey,
  resolveAssetId,
  type AssetIdSources,
} from './assetKeys';

const vazio: AssetIdSources = {
  mainStoryAssetId: null,
  mainSquareAssetId: null,
  factorAssetIds: [null, null, null, null, null],
  factorSquareAssetIds: [null, null, null, null, null],
  editedVersions: {},
};

describe('construção de chaves', () => {
  it('produz o formato que a página já usa', () => {
    // Os literais aqui são os que estão espalhados pelo render hoje. Se o
    // formato mudar sem migração, projetos salvos deixam de resolver.
    expect(mainKey('story')).toBe('main:story');
    expect(mainKey('square')).toBe('main:square');
    expect(factorKey(2, 'square')).toBe('f2:square');
    expect(editKey('main:story', 0)).toBe('edit:main:story#0');
  });
});

describe('parseAssetKey', () => {
  it('lê arte principal', () => {
    expect(parseAssetKey('main:story')).toEqual({ kind: 'main', aspect: 'story' });
    expect(parseAssetKey('main:square')).toEqual({ kind: 'main', aspect: 'square' });
  });

  it('lê variação do Fator', () => {
    expect(parseAssetKey('f0:story')).toEqual({ kind: 'factor', index: 0, aspect: 'story' });
    expect(parseAssetKey('f4:square')).toEqual({ kind: 'factor', index: 4, aspect: 'square' });
  });

  it('lê edição', () => {
    expect(parseAssetKey('edit:main:story#0')).toEqual({
      kind: 'edit', source: 'main:story', version: 0,
    });
  });

  it('encadeia edição de edição', () => {
    // É o caso que uma leitura ingênua quebra: cortar no PRIMEIRO `#` daria
    // origem errada e achataria a cadeia na raiz, perdendo v2 → v3.
    expect(parseAssetKey('edit:edit:main:story#0#1')).toEqual({
      kind: 'edit', source: 'edit:main:story#0', version: 1,
    });
    expect(editSourceOf('edit:edit:main:story#0#1')).toBe('edit:main:story#0');
  });

  it('recusa formato desconhecido', () => {
    for (const k of ['', 'main', 'main:wide', 'fx:story', 'edit:main:story', 'edit:#1', 'edit:x#-1']) {
      expect(parseAssetKey(k)).toBeNull();
    }
  });

  it('editSourceOf só responde para edição', () => {
    expect(editSourceOf('main:story')).toBeNull();
    expect(editSourceOf('f1:story')).toBeNull();
  });
});

describe('resolveAssetId', () => {
  const fontes: AssetIdSources = {
    mainStoryAssetId: 'A',
    mainSquareAssetId: 'B',
    factorAssetIds: ['f0', 'f1', null, null, null],
    factorSquareAssetIds: [null, 'fs1', null, null, null],
    editedVersions: {
      'main:story': [{ assetId: 'e0' }, { assetId: 'e1' }],
      'f1:story': [{ assetId: 'fe0' }],
    },
  };

  it('resolve principal e Fator', () => {
    expect(resolveAssetId('main:story', fontes)).toBe('A');
    expect(resolveAssetId('main:square', fontes)).toBe('B');
    expect(resolveAssetId('f1:story', fontes)).toBe('f1');
    expect(resolveAssetId('f1:square', fontes)).toBe('fs1');
  });

  it('resolve a versão editada, não a origem', () => {
    // O parent da próxima edição tem que ser a versão editada — é o que
    // encadeia v1 → v2 em vez de pendurar tudo na arte original.
    expect(resolveAssetId('edit:main:story#0', fontes)).toBe('e0');
    expect(resolveAssetId('edit:main:story#1', fontes)).toBe('e1');
    expect(resolveAssetId('edit:f1:story#0', fontes)).toBe('fe0');
  });

  it('devolve null quando não há âncora — e isso vira arte órfã', () => {
    // Documentado de propósito: null aqui produz parent_asset_id nulo. Era
    // o que acontecia com TODO projeto restaurado antes da correção.
    expect(resolveAssetId('main:story', vazio)).toBeNull();
    expect(resolveAssetId('f2:story', fontes)).toBeNull();
    expect(resolveAssetId('edit:main:story#9', fontes)).toBeNull();
    expect(resolveAssetId('chave-invalida', fontes)).toBeNull();
  });

  it('não estoura com índice fora do array', () => {
    expect(resolveAssetId('f9:story', fontes)).toBeNull();
    expect(() => resolveAssetId('f9:square', vazio)).not.toThrow();
  });
});
