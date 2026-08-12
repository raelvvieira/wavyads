import { describe, expect, it } from 'vitest';
import { buildAssetLabels } from './assetLabels';
import type { CreativeAsset } from '../types/creative';

function asset(id: string, type: string, createdAt: string, extra: Partial<CreativeAsset> = {}): CreativeAsset {
  return {
    id,
    type: type as CreativeAsset['type'],
    createdAt,
    projectId: 'p',
    clientId: null,
    status: 'ready',
    url: 'u',
    thumbnailUrl: null,
    parentAssetId: null,
    rootAssetId: id,
    groupId: null,
    factorAxis: null,
    aspectRatio: null,
    resolution: null,
    width: null,
    height: null,
    prompt: null,
    negativePrompt: null,
    model: null,
    errorMessage: null,
    filename: null,
    isClientIntelligence: false,
    metadata: {},
    updatedAt: createdAt,
    ...extra,
  };
}

describe('buildAssetLabels', () => {
  it('numera por ordem de criação, não pela ordem do array', () => {
    const labels = buildAssetLabels([
      asset('b', 'original', '2026-01-02'),
      asset('a', 'original', '2026-01-01'),
    ]);
    expect(labels.get('a')).toBe('Arte 01');
    expect(labels.get('b')).toBe('Arte 02');
  });

  it('não renomeia artes antigas quando uma nova é gerada', () => {
    // Rótulo instável quebraria a referência "baseado em Arte 01" do Canvas.
    const labels = buildAssetLabels([
      asset('b', 'original', '2026-01-02'),
      asset('a', 'original', '2026-01-01'),
      asset('c', 'original', '2026-02-01'),
    ]);
    expect(labels.get('a')).toBe('Arte 01');
    expect(labels.get('b')).toBe('Arte 02');
    expect(labels.get('c')).toBe('Arte 03');
  });

  it('prioriza o nome dado pela IA sobre o eixo do Fator', () => {
    const labels = buildAssetLabels([
      asset('f1', 'factor', '2026-01-01', { factorAxis: 'emotional' }),
      asset('f2', 'factor', '2026-01-02', { metadata: { nome: 'Medo de perder' } }),
      asset('f3', 'factor', '2026-01-03'),
    ]);
    expect(labels.get('f1')).toBe('Emocional');
    expect(labels.get('f2')).toBe('Medo de perder');
    expect(labels.get('f3')).toBe('Variação 01');
  });

  it('numera edições e redimensionadas', () => {
    const labels = buildAssetLabels([
      asset('e1', 'edited', '2026-01-01'),
      asset('r1', 'resize', '2026-01-02'),
    ]);
    expect(labels.get('e1')).toBe('Edição 01');
    expect(labels.get('r1')).toBe('1080 · 01');
  });
});
