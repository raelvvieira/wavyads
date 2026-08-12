import { describe, expect, it } from 'vitest';
import { buildArtworkSections } from './artworkSections';
import type { CreativeAsset, CreativeAssetGroup } from '../types/creative';

function asset(id: string, type: string, extra: Partial<CreativeAsset> = {}): CreativeAsset {
  return {
    id,
    type: type as CreativeAsset['type'],
    projectId: 'p',
    clientId: null,
    status: 'ready',
    url: 'u',
    thumbnailUrl: null,
    parentAssetId: null,
    rootAssetId: id,
    groupId: null,
    factorAxis: null,
    aspectRatio: '4:5',
    resolution: '4K',
    width: null,
    height: null,
    prompt: null,
    negativePrompt: null,
    model: null,
    errorMessage: null,
    filename: null,
    isClientIntelligence: false,
    metadata: {},
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...extra,
  };
}

function group(id: string, parentAssetId: string): CreativeAssetGroup {
  return { id, projectId: 'p', type: 'factor', parentAssetId, title: 'Fator Criativo', metadata: {}, createdAt: '' };
}

describe('buildArtworkSections', () => {
  it('separa originais, editadas e redimensionadas', () => {
    const sections = buildArtworkSections([
      asset('o1', 'original'),
      asset('e1', 'edited', { parentAssetId: 'o1' }),
      asset('r1', 'resize', { parentAssetId: 'o1' }),
    ]);
    expect(sections.originals.map((a) => a.id)).toEqual(['o1']);
    expect(sections.edited.map((a) => a.id)).toEqual(['e1']);
    expect(sections.resizes.map((a) => a.id)).toEqual(['r1']);
  });

  it('não funde lotes de Fator vindos de artes diferentes', () => {
    const sections = buildArtworkSections(
      [
        asset('o1', 'original'),
        asset('o2', 'original'),
        asset('f1', 'factor', { parentAssetId: 'o1', groupId: 'g1' }),
        asset('f2', 'factor', { parentAssetId: 'o1', groupId: 'g1' }),
        asset('f3', 'factor', { parentAssetId: 'o2', groupId: 'g2' }),
      ],
      [group('g1', 'o1'), group('g2', 'o2')],
    );
    expect(sections.factorGroups).toHaveLength(2);
    expect(sections.factorGroups[0].assets).toHaveLength(2);
    expect(sections.factorGroups[0].parentAssetId).toBe('o1');
    expect(sections.factorGroups[1].parentAssetId).toBe('o2');
  });

  it('agrupa pelo pai quando o lote não tem grupo (dados antigos)', () => {
    const sections = buildArtworkSections([
      asset('o1', 'original'),
      asset('f1', 'factor', { parentAssetId: 'o1' }),
      asset('f2', 'factor', { parentAssetId: 'o1' }),
    ]);
    expect(sections.factorGroups).toHaveLength(1);
    expect(sections.factorGroups[0].assets).toHaveLength(2);
  });

  it('não inventa um grupo comum para variações órfãs', () => {
    // Sem pai nem grupo, cada uma vira seu próprio bucket — o contrário faria
    // artes sem relação nenhuma aparecerem como um lote que nunca existiu.
    const sections = buildArtworkSections([asset('f1', 'factor'), asset('f2', 'factor')]);
    expect(sections.factorGroups).toHaveLength(2);
  });

  it('mantém no grupo certo as artes ainda em geração', () => {
    const sections = buildArtworkSections(
      [
        asset('o1', 'original'),
        asset('f1', 'factor', { parentAssetId: 'o1', groupId: 'g1', status: 'generating', url: null }),
      ],
      [group('g1', 'o1')],
    );
    expect(sections.factorGroups[0].assets[0].status).toBe('generating');
  });

  it('trata artes importadas como originais', () => {
    expect(buildArtworkSections([asset('i1', 'imported')]).originals).toHaveLength(1);
  });
});
