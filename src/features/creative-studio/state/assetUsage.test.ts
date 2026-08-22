import { describe, expect, it } from 'vitest';
import { countAssetUsage, usageSentence } from './assetUsage';
import type { CreativeAsset } from '../types/creative';

function arte(metadata: Record<string, unknown>, id = Math.random().toString(36).slice(2)): CreativeAsset {
  return {
    id, projectId: 'p1', clientId: 'c1', type: 'original', status: 'ready',
    url: 'https://x/arte.png', thumbnailUrl: null, parentAssetId: null, rootAssetId: null,
    groupId: null, factorAxis: null, aspectRatio: '9:16', resolution: '2K', width: null, height: null,
    prompt: null, negativePrompt: null, model: null, errorMessage: null,
    filename: null, isClientIntelligence: false, metadata,
    createdAt: '2026-08-22T10:00:00.000Z', updatedAt: '2026-08-22T10:00:00.000Z',
  } as CreativeAsset;
}

const LOGO = 'https://x/logo.png';
const REF = 'https://x/ref.png';

describe('countAssetUsage', () => {
  it('conta a arte que anexou o insumo como produto ou referência', () => {
    const acervo = [arte({ productImages: [REF] }), arte({ productImages: ['https://x/outra.png'] })];
    expect(countAssetUsage(acervo, REF)).toBe(1);
  });

  it('conta também o logo, que viaja num campo próprio', () => {
    expect(countAssetUsage([arte({ logoImage: LOGO })], LOGO)).toBe(1);
  });

  it('conta o avatar, que tem o terceiro campo', () => {
    expect(countAssetUsage([arte({ avatarImages: ['https://x/ana.png'] })], 'https://x/ana.png')).toBe(1);
  });

  it('a mesma arte com o insumo em dois campos conta uma vez', () => {
    // A pergunta é quantas ARTES perdem o anexo, não quantas menções existem.
    const acervo = [arte({ productImages: [LOGO], logoImage: LOGO })];
    expect(countAssetUsage(acervo, LOGO)).toBe(1);
  });

  it('zero quando o insumo nunca foi usado, sem quebrar em metadata vazio', () => {
    expect(countAssetUsage([arte({}), arte({ productImages: [] })], REF)).toBe(0);
  });

  it('URL vazia ou nula não casa com nada', () => {
    const acervo = [arte({ productImages: [REF] })];
    expect(countAssetUsage(acervo, '')).toBe(0);
    expect(countAssetUsage(acervo, null)).toBe(0);
  });

  it('ignora metadata malformado em vez de derrubar a confirmação', () => {
    // Um `productImages` que veio como string do banco antigo não pode
    // impedir o usuário de apagar uma referência.
    const acervo = [arte({ productImages: 'não é lista', logoImage: 42 } as any)];
    expect(countAssetUsage(acervo, REF)).toBe(0);
  });
});

describe('usageSentence', () => {
  it('não diz nada quando o insumo nunca foi usado', () => {
    expect(usageSentence(0)).toBe('');
  });

  it('concorda no singular e no plural', () => {
    expect(usageSentence(1)).toContain('Foi usada em 1 arte. Ela continua');
    expect(usageSentence(3)).toContain('Foi usada em 3 artes. Elas continuam');
  });
});
