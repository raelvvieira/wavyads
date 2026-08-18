import { describe, expect, it } from 'vitest';
import { readProjectSnapshot } from './projectSnapshot';
import {
  STUDIO_SNAPSHOT_VERSION,
  fromSnapshotV2,
  isSnapshotV2,
  toSnapshotV2,
} from './snapshotV2';

const antigo = {
  projectTitle: 'Campanha',
  initialPrompt: 'anúncio de verão',
  businessContext: 'loja de praia',
  selectedClientId: 'c1',
  selectedTemplateId: 't1',
  selectedAspectRatio: '9:16',
  selectedResolution: '2K',
  model: 'm1',
  language: 'en',
  preserveFaces: false,
  conversationMessages: [{ id: '1', role: 'user', content: 'oi' }],
  currentStage: 'result',
  step: 3,
  copySource: 'original',
  copyApproved: true,
  rawCopy: 'texto',
  copyVariations: [{ titulo: 'a' }],
  selectedVariationIdx: 0,
  storyImage: 'https://x/s.png',
  squareImage: null,
  mainStoryAssetId: 'a1',
  mainSquareAssetId: null,
  factorAssetIds: ['f0', null, null, null, null],
  factorSquareAssetIds: [null, null, null, null, null],
  factorImages: ['https://x/f0.png'],
  factorSquareImages: [null, null, null, null, null],
  factorVariations: [{ eixo: 'hook' }],
  factorErrors: [],
  editedVersions: { 'main:story': [{ url: 'u', assetId: 'e0' }] },
};

describe('isSnapshotV2', () => {
  it('reconhece pela versão', () => {
    expect(isSnapshotV2({ schemaVersion: 2 })).toBe(true);
    expect(isSnapshotV2(antigo)).toBe(false);
    expect(isSnapshotV2(null)).toBe(false);
    expect(isSnapshotV2('texto')).toBe(false);
  });
});

describe('toSnapshotV2', () => {
  it('agrupa por domínio e marca a versão', () => {
    const v2 = toSnapshotV2(antigo);
    expect(v2.schemaVersion).toBe(STUDIO_SNAPSHOT_VERSION);
    expect(v2.project.title).toBe('Campanha');
    expect(v2.generation.language).toBe('en');
    expect(v2.conversation.stage).toBe('result');
    expect(v2.copy.approved).toBe(true);
    expect(v2.artwork.mainStoryAssetId).toBe('a1');
  });

  it('preserva as âncoras de linhagem', () => {
    // Perdê-las na conversão produziria arte órfã na próxima edição — o
    // mesmo defeito que já custou uma correção.
    const v2 = toSnapshotV2(antigo);
    expect(v2.artwork.factorAssetIds).toEqual(['f0', null, null, null, null]);
    expect(v2.artwork.editedVersions['main:story']).toHaveLength(1);
  });

  it('guarda campo desconhecido em legacy em vez de descartar', () => {
    // Conversão que perde campo em silêncio é pior que nenhuma conversão:
    // o dado some sem deixar rastro.
    const v2 = toSnapshotV2({ ...antigo, campoDeOutraEpoca: 'valor', outro: 42 });
    expect(v2.legacy).toEqual({ campoDeOutraEpoca: 'valor', outro: 42 });
  });

  it('não cria legacy vazio', () => {
    expect(toSnapshotV2(antigo).legacy).toBeUndefined();
  });

  it('já convertido volta igual, sem reconverter', () => {
    const v2 = toSnapshotV2(antigo);
    expect(toSnapshotV2(v2 as any)).toBe(v2);
  });

  it('converte snapshot vazio sem quebrar', () => {
    const v2 = toSnapshotV2({});
    expect(v2.schemaVersion).toBe(2);
    expect(v2.project.title).toBe('Novo criativo');
    expect(v2.artwork.factorAssetIds).toHaveLength(5);
  });

  it('tolera null', () => {
    expect(() => toSnapshotV2(null)).not.toThrow();
  });
});

describe('fromSnapshotV2', () => {
  it('a volta preserva o que a página antiga lê', () => {
    // Rollback que exige migração de dados não é rollback: desligar a flag
    // precisa devolver projetos legíveis para a tela atual.
    const plano = fromSnapshotV2(toSnapshotV2(antigo));
    const original = readProjectSnapshot(antigo);
    const voltado = readProjectSnapshot(plano);
    expect(voltado).toEqual(original);
  });

  it('devolve os campos desconhecidos junto', () => {
    const plano = fromSnapshotV2(toSnapshotV2({ ...antigo, campoDeOutraEpoca: 'valor' }));
    expect(plano.campoDeOutraEpoca).toBe('valor');
  });

  it('legacy não sobrescreve campo conhecido', () => {
    // O espalhamento de legacy vem primeiro justamente para que um campo
    // mapeado sempre vença um homônimo vindo do passado.
    const v2 = toSnapshotV2(antigo);
    const adulterado = { ...v2, legacy: { projectTitle: 'valor antigo' } };
    expect(fromSnapshotV2(adulterado).projectTitle).toBe('Campanha');
  });
});
