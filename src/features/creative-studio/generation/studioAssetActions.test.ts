import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createStudioAssetActions, type StudioAssetActionsDeps } from './studioAssetActions';
import type { CreativeAsset } from '../types/creative';

function assetBase(patch: Partial<CreativeAsset> = {}): CreativeAsset {
  return {
    id: 'a1', projectId: 'p1', clientId: 'c1', type: 'original', status: 'ready',
    url: 'https://x/a.png', thumbnailUrl: null, parentAssetId: null, rootAssetId: null,
    groupId: null, factorAxis: null, aspectRatio: '4:5', resolution: '2K', width: null, height: null,
    prompt: 'anúncio de verão', negativePrompt: null, model: 'gpt-image-2', errorMessage: null,
    filename: null, isClientIntelligence: false, metadata: {},
    createdAt: '2026-08-18T10:00:00.000Z', updatedAt: '2026-08-18T10:00:00.000Z',
    ...patch,
  };
}

/** Banco falso: guarda linhas por id e registra a ORDEM das operações. */
function fakeDeps(): StudioAssetActionsDeps & { linhas: Map<string, CreativeAsset>; ordem: string[] } {
  const linhas = new Map<string, CreativeAsset>();
  const ordem: string[] = [];
  let proximoId = 1;

  return {
    linhas,
    ordem,
    clientId: 'c1',
    ensureProjectId: vi.fn(async () => 'p1'),
    invoke: vi.fn(),
    extractErrorMessage: async (e: unknown) => (e as Error)?.message || 'erro',
    async createAsset(input) {
      ordem.push('createAsset');
      const asset = assetBase({ id: `novo-${proximoId++}`, ...input } as any);
      linhas.set(asset.id, asset);
      return asset;
    },
    async updateAsset(id, patch) {
      ordem.push(`updateAsset:${patch.status ?? '-'}`);
      const atual = linhas.get(id)!;
      const atualizado = { ...atual, ...patch } as CreativeAsset;
      linhas.set(id, atualizado);
      return atualizado;
    },
    recordUsage: vi.fn(),
  };
}

describe('generate', () => {
  it('grava a linha ANTES de chamar o provedor, e completa a MESMA linha depois', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/nova.png' }, error: null });

    const resultado = await createStudioAssetActions(deps).generate('lançamento de verão', '4:5');

    expect(deps.ordem).toEqual(['createAsset', 'updateAsset:ready']);
    expect(resultado.status).toBe('ready');
    expect(resultado.url).toBe('https://x/nova.png');
    expect(deps.linhas.size).toBe(1); // uma linha só, não duas
  });

  it('falha do provedor grava a MESMA linha como failed, com a mensagem real', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: null, error: new Error('formato recusado') });

    const resultado = await createStudioAssetActions(deps).generate('x', '9:16');

    expect(resultado.status).toBe('failed');
    expect(resultado.errorMessage).toBe('formato recusado');
    expect(deps.linhas.size).toBe(1);
  });

  it('erro dentro do corpo da resposta (sem lançar) também vira failed', async () => {
    // criativo-generate pode responder 200 com `{ error: "..." }` no corpo.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { error: 'sem crédito' }, error: null });

    const resultado = await createStudioAssetActions(deps).generate('x', '4:5');
    expect(resultado.status).toBe('failed');
    expect(resultado.errorMessage).toBe('sem crédito');
  });

  it('só registra uso de IA quando a geração termina em sucesso', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: null, error: new Error('falhou') });
    await createStudioAssetActions(deps).generate('x', '4:5');
    expect(deps.recordUsage).not.toHaveBeenCalled();
  });

  it('a linha nasce pelo projeto do contexto, sem precisar que o chamador passe', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'u' }, error: null });
    await createStudioAssetActions(deps).generate('x', '4:5');
    expect(deps.ensureProjectId).toHaveBeenCalledTimes(1);
  });

  it('logo e produtos anexados chegam ao corpo da chamada e ficam salvos na linha', async () => {
    // Salvar em `metadata` é o que permite o retry devolver os mesmos
    // anexos — o prompt só MENCIONA o logo, nunca guarda a URL.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'u' }, error: null });

    await createStudioAssetActions(deps).generate('x', '4:5', {
      logoImageUrl: 'https://x/logo.png',
      productImageUrls: ['https://x/p1.png'],
    });

    expect(deps.invoke).toHaveBeenCalledWith('criativo-generate', expect.objectContaining({
      logoImage: 'https://x/logo.png',
      productImages: ['https://x/p1.png'],
    }), expect.any(Number));
    const linha = [...deps.linhas.values()][0];
    expect(linha.metadata).toEqual({
      logoImage: 'https://x/logo.png',
      productImages: ['https://x/p1.png'],
      avatarImages: [],
    });
  });

  it('copy anexada renderiza literal — muda o prompt salvo na linha', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'u' }, error: null });

    await createStudioAssetActions(deps).generate('lançamento', '4:5', { copy: 'Só hoje: 50% OFF' });

    const linha = [...deps.linhas.values()][0];
    expect(linha.prompt).toContain('Só hoje: 50% OFF');
  });
});

describe('retry', () => {
  it('reaproveita a MESMA linha falhada — não cria uma segunda pendência', async () => {
    const deps = fakeDeps();
    const falhou = assetBase({ id: 'f1', status: 'failed', errorMessage: 'antes' });
    deps.linhas.set('f1', falhou);
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/ok.png' }, error: null });

    const resultado = await createStudioAssetActions(deps).retry(falhou);

    expect(deps.ordem.some((o) => o === 'createAsset')).toBe(false);
    expect(resultado.id).toBe('f1');
    expect(resultado.status).toBe('ready');
    expect(deps.linhas.size).toBe(1);
  });

  it('sem prompt salvo, recusa em vez de gerar algo não pedido', async () => {
    const deps = fakeDeps();
    const semPrompt = assetBase({ id: 'f2', status: 'failed', prompt: null });
    await expect(createStudioAssetActions(deps).retry(semPrompt)).rejects.toThrow(/prompt salvo/);
  });

  it('retentar devolve os mesmos anexos da geração original', async () => {
    const deps = fakeDeps();
    const falhouComAnexos = assetBase({
      id: 'f3', status: 'failed',
      metadata: { logoImage: 'https://x/logo.png', productImages: ['https://x/p1.png'] },
    });
    deps.linhas.set('f3', falhouComAnexos);
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/ok.png' }, error: null });

    await createStudioAssetActions(deps).retry(falhouComAnexos);

    expect(deps.invoke).toHaveBeenCalledWith('criativo-generate', expect.objectContaining({
      logoImage: 'https://x/logo.png',
      productImages: ['https://x/p1.png'],
    }), expect.any(Number));
  });
});

describe('edit', () => {
  it('cria uma FILHA da arte selecionada, sem destruir a original', async () => {
    const deps = fakeDeps();
    const original = assetBase({ id: 'orig' });
    deps.linhas.set('orig', original); // já existente no banco antes da edição
    (deps.invoke as any).mockResolvedValue({ data: { editedImageUrl: 'https://x/editada.png' }, error: null });

    const resultado = await createStudioAssetActions(deps).edit(original, 'deixa mais escuro');

    expect(resultado.id).not.toBe('orig');
    expect(resultado.type).toBe('edited');
    expect(resultado.parentAssetId).toBe('orig');
    expect(deps.linhas.has('orig')).toBe(true); // a original continua existindo
  });

  it('recusa editar arte sem URL — geraria a partir do nada', async () => {
    const deps = fakeDeps();
    const semUrl = assetBase({ id: 'g1', status: 'generating', url: null });
    await expect(createStudioAssetActions(deps).edit(semUrl, 'f')).rejects.toThrow(/imagem/);
    expect(deps.invoke).not.toHaveBeenCalled();
  });

  it('a edição malsucedida ainda registra a filha, como failed', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: null, error: new Error('timeout do provedor') });

    const resultado = await createStudioAssetActions(deps).edit(assetBase(), 'f');
    expect(resultado.status).toBe('failed');
    expect(resultado.errorMessage).toBe('timeout do provedor');
  });
});

describe('resize', () => {
  it('cria filha 1:1 mesmo partindo de um formato vertical', async () => {
    const deps = fakeDeps();
    const vertical = assetBase({ id: 'v1', aspectRatio: '9:16' });
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/quad.png' }, error: null });

    const resultado = await createStudioAssetActions(deps).resize(vertical);
    expect(resultado.type).toBe('resize');
    expect(resultado.parentAssetId).toBe('v1');
    expect(resultado.aspectRatio).toBe('1:1');
  });

  it('recusa redimensionar o que já é 1:1 — não é uma operação', async () => {
    const deps = fakeDeps();
    const quadrado = assetBase({ aspectRatio: '1:1' });
    await expect(createStudioAssetActions(deps).resize(quadrado)).rejects.toThrow(/já é 1:1/);
  });
});

describe('generateAvatar', () => {
  const persona = {
    name: 'Fashion Model',
    gender: 'female' as const,
    ageRange: '25-30' as const,
    styles: ['luxury' as const],
    hairColor: 'dark-brown' as const,
    eyeColor: 'brown' as const,
    details: 'cachos brilhantes',
    presetId: 'fashion-model',
  };

  it('grava um asset de avatar com os traços no metadata, antes de chamar o provedor', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/avatar.png' }, error: null });

    const resultado = await createStudioAssetActions(deps).generateAvatar(persona);

    expect(deps.ordem).toEqual(['createAsset', 'updateAsset:ready']);
    expect(resultado.type).toBe('avatar');
    expect(resultado.status).toBe('ready');
    expect(resultado.url).toBe('https://x/avatar.png');
    // Os traços sobrevivem: é o que permite reabrir e regerar depois.
    expect((resultado.metadata as any).persona).toEqual(persona);
  });

  it('manda o prompt de retrato, não o de anúncio — sem safe zone', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/avatar.png' }, error: null });

    await createStudioAssetActions(deps).generateAvatar(persona);

    const body = (deps.invoke as any).mock.calls[0][1];
    expect(body.prompt).toContain('[SUBJECT]');
    expect(body.prompt).toContain('[PHOTOGRAPHIC TREATMENT]');
    expect(body.prompt).not.toContain('[SAFE ZONE]');
    expect(body.formatRatio).toBe('4:5');
  });

  it('fotos de referência viajam no canal de imagem do backend', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/avatar.png' }, error: null });

    await createStudioAssetActions(deps).generateAvatar(persona, ['https://x/ref1.png', 'https://x/ref2.png']);

    const body = (deps.invoke as any).mock.calls[0][1];
    expect(body.productImages).toEqual(['https://x/ref1.png', 'https://x/ref2.png']);
    expect(body.prompt).toContain('[REFERENCE PHOTOS]');
  });

  it('falha do provedor marca a mesma linha como failed', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: null, error: new Error('rosto recusado') });

    const resultado = await createStudioAssetActions(deps).generateAvatar(persona);

    expect(resultado.status).toBe('failed');
    expect(resultado.errorMessage).toBe('rosto recusado');
    expect(deps.linhas.size).toBe(1);
  });
});

describe('factorCriativo', () => {
  function variacao(slot: number, angle: string): any {
    return {
      slot, label: `V${slot} — ${angle}`,
      strategy: {
        angle, angleSubtype: 'sub', angleViability: 'valid',
        strategicThesis: `tese ${slot}`, whySelected: 'x', recognition: 'y',
        beliefBefore: 'a', beliefAfter: 'b', reasonToBelieve: 'c',
      },
      audience: { persona: 'iniciante', awarenessLevel: 'consciente do problema', situation: 's' },
      execution: {
        dominantEmotion: 'frustração', offerFrame: 'transformação',
        argumentStructure: ['problema', 'causa'], visualHookType: 'problema visualizado',
      },
      copy: { title: `Título ${slot}`, cta: 'Fale conosco' },
      visualDirection: {
        dominantHook: 'h', mainSubject: 'm', composition: 'c', hierarchy: ['1'],
        mood: 'mo', relationshipToThesis: 'r',
        differencesFromOriginal: ['d'], differencesFromOtherVariations: ['e'],
      },
      validation: {
        supportedFactsUsed: ['f'], unsupportedClaims: [],
        changedDimensions: ['thesis', 'message', 'visual'],
        scores: {}, qualityScore: 8.6,
      },
      promptCompleto: `PROMPT DA VARIACAO ${slot}`,
    };
  }

  const CINCO = ['problem', 'mechanism', 'proof', 'contrast', 'identity'].map((a, i) => variacao(i + 1, a));

  function depsComGrupo() {
    const deps = fakeDeps();
    (deps as any).createGroup = vi.fn(async () => ({ id: 'grupo-1' }));
    return deps;
  }

  it('cria as 5 linhas antes de gerar qualquer imagem, agrupadas e ligadas à base', async () => {
    const deps = depsComGrupo();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/v.png' }, error: null });
    const base = assetBase({ id: 'base-1', aspectRatio: '4:5' });

    const linhas = await createStudioAssetActions(deps).factorCriativo({ base, variations: CINCO });

    expect(linhas).toHaveLength(5);
    expect(deps.linhas.size).toBe(5);
    // As 5 criações vêm ANTES da primeira atualização: é o que faz o lote
    // inteiro aparecer no canvas de uma vez.
    expect(deps.ordem.slice(0, 5)).toEqual(Array(5).fill('createAsset'));
    const primeira = [...deps.linhas.values()][0];
    expect(primeira.type).toBe('factor');
    expect(primeira.parentAssetId).toBe('base-1');
    expect(primeira.groupId).toBe('grupo-1');
  });

  it('grava o ângulo em strategic_angle e deixa factor_axis NULO', async () => {
    // `factor_axis` tem um CHECK que só conhece os cinco eixos da V1.
    // Gravar um ângulo V2 ali derrubava os CINCO inserts de uma vez (23514)
    // em qualquer banco onde a migração da V2 ainda não tivesse rodado.
    const deps = depsComGrupo();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/v.png' }, error: null });

    await createStudioAssetActions(deps).factorCriativo({ base: assetBase({ id: 'b' }), variations: CINCO });

    const linhas = [...deps.linhas.values()];
    expect(linhas.map((l: any) => l.strategicAngle)).toEqual(
      ['problem', 'mechanism', 'proof', 'contrast', 'identity'],
    );
    expect(linhas.map((l: any) => l.factorAxis)).toEqual([null, null, null, null, null]);
    expect((linhas[0] as any).qualityScore).toBe(8.6);
    expect((linhas[0] as any).generationVersion).toBe('factor-v2');
  });

  it('a estratégia também vai em metadata — é o que sobrevive sem a migração', async () => {
    // As colunas dedicadas podem não existir; `metadata` é jsonb e sempre
    // existe. É de lá que o rótulo do card sai quando o banco está atrasado.
    const deps = depsComGrupo();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/v.png' }, error: null });

    await createStudioAssetActions(deps).factorCriativo({ base: assetBase({ id: 'b' }), variations: CINCO });

    const linha: any = [...deps.linhas.values()][0];
    expect(linha.metadata.strategy.angle).toBe('problem');
    expect(linha.metadata.copy.title).toBe('Título 1');
  });

  it('o prompt sai do montador do Studio, com a safe zone UMA vez só', async () => {
    // O motor não escreve mais o prompt — ele devolve tese, copy e direção
    // visual, e o prompt é montado aqui pelo mesmo `buildCreativePrompt` da
    // geração normal. Antes o bloco de safe zone entrava duas vezes: o
    // modelo copiava um para dentro do `promptCompleto` e o cliente
    // reanexava outro, inflando todo prompt.
    const deps = depsComGrupo();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/v.png' }, error: null });

    await createStudioAssetActions(deps).factorCriativo({ base: assetBase({ id: 'b' }), variations: CINCO });

    const linha = [...deps.linhas.values()][0];
    expect(linha.prompt.match(/\[SAFE ZONE\]/g)).toHaveLength(1);
    // A tese e a copy da variação chegaram ao prompt.
    expect(linha.prompt).toContain('tese 1');
    expect(linha.prompt).toContain('Título 1');
  });

  it('falha de UM slot não derruba os outros quatro', async () => {
    const deps = depsComGrupo();
    let n = 0;
    (deps.invoke as any).mockImplementation(async () => {
      n += 1;
      if (n === 3) return { data: null, error: new Error('provedor recusou') };
      return { data: { imageUrl: `https://x/v${n}.png` }, error: null };
    });

    const linhas = await createStudioAssetActions(deps).factorCriativo({
      base: assetBase({ id: 'b' }), variations: CINCO,
    });

    expect(linhas.filter((l) => l.status === 'ready')).toHaveLength(4);
    const falhou = linhas.filter((l) => l.status === 'failed');
    expect(falhou).toHaveLength(1);
    expect(falhou[0].errorMessage).toBe('provedor recusou');
  });

  it('avisa slot a slot, para o canvas resolver cada card na hora', async () => {
    const deps = depsComGrupo();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/v.png' }, error: null });
    const onSlotDone = vi.fn();

    await createStudioAssetActions(deps).factorCriativo({
      base: assetBase({ id: 'b' }), variations: CINCO, onSlotDone,
    });

    expect(onSlotDone).toHaveBeenCalledTimes(5);
  });

  it('sem grupo (falha ao criar), as 5 ainda são geradas', async () => {
    const deps = fakeDeps(); // sem createGroup
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/v.png' }, error: null });

    const linhas = await createStudioAssetActions(deps).factorCriativo({
      base: assetBase({ id: 'b' }), variations: CINCO,
    });

    expect(linhas).toHaveLength(5);
    expect([...deps.linhas.values()][0].groupId).toBeNull();
  });
});
