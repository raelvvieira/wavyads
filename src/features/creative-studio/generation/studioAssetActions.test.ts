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

/** Uma variação do Fator, no formato que a edge function devolve. */
function variacaoDoFator(): any {
  return {
    slot: 1, label: 'V1 — problema',
    strategy: {
      angle: 'problema', angleSubtype: 'sub', angleViability: 'valid',
      strategicThesis: 'tese', whySelected: 'x', recognition: 'y',
      beliefBefore: 'a', beliefAfter: 'b', reasonToBelieve: 'c',
    },
    audience: { persona: 'iniciante', awarenessLevel: 'consciente do problema', situation: 's' },
    execution: {
      dominantEmotion: 'frustração', offerFrame: 'transformação',
      argumentStructure: ['problema'], visualHookType: 'problema visualizado',
    },
    copy: { title: 'Título', cta: 'Fale conosco' },
    visualDirection: {
      dominantHook: 'h', mainSubject: 'm', composition: 'c', hierarchy: ['1'],
      mood: 'mo', relationshipToThesis: 'r',
      differencesFromOriginal: ['d'], differencesFromOtherVariations: ['e'],
    },
    validation: {
      supportedFactsUsed: ['f'], unsupportedClaims: [],
      changedDimensions: ['thesis'], scores: {}, qualityScore: 8.6,
    },
    promptCompleto: 'PROMPT DA VARIACAO',
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

    // A linha nasce primeiro, recebe o prompt definitivo depois da direção
    // de arte, e é a MESMA que fica pronta no fim. Uma linha só, três
    // escritas — não duas linhas.
    expect(deps.ordem).toEqual(['createAsset', 'updateAsset:-', 'updateAsset:ready']);
    expect(resultado.status).toBe('ready');
    expect(resultado.url).toBe('https://x/nova.png');
    expect(deps.linhas.size).toBe(1); // uma linha só, não duas
  });

  it('a direção de arte entra no prompt e fica gravada na linha', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });
    deps.directArt = vi.fn(async () => ({
      artDirection: { mainSubject: 'Dentista com escala de cor', composition: 'Clean, texto no topo', mood: 'higiênico' },
      copyBlocks: { titulo: 'Diga adeus', subtitulo: 'aos dentes amarelados' },
    }));

    const resultado = await createStudioAssetActions(deps).generate('clínica odontológica', '9:16', {
      copy: 'Diga adeus aos dentes amarelados',
    });

    const enviado = (deps.invoke as any).mock.calls[0][1];
    expect(enviado.prompt).toContain('[ART DIRECTION]\nMain subject: Dentista com escala de cor');
    // Papéis validados substituem o bloco literal — nunca convivem com ele,
    // ou a arte sairia com o texto duas vezes.
    expect(enviado.prompt).toContain('MAIN TITLE (dominant');
    expect(enviado.prompt).not.toContain('THE WORDS ARE FIXED');
    expect(resultado.metadata?.artDirection?.mainSubject).toBe('Dentista com escala de cor');
  });

  it('direção de arte fora do ar não impede a arte — ela sai pelo caminho literal', async () => {
    // O usuário pediu uma arte, não um relatório de indisponibilidade. Uma
    // IA caída aqui vira uma peça mais simples, nunca uma peça a menos.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });
    deps.directArt = vi.fn(async () => { throw new Error('modelo descontinuado'); });

    const resultado = await createStudioAssetActions(deps).generate('clínica', '9:16', {
      copy: 'Diga adeus aos dentes amarelados',
    });

    expect(resultado.status).toBe('ready');
    const enviado = (deps.invoke as any).mock.calls[0][1];
    expect(enviado.prompt).toContain('THE WORDS ARE FIXED');
    expect(enviado.prompt).not.toContain('[ART DIRECTION]');
  });

  it('referência ilegível não impede a arte, só a deixa sem design system', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });
    deps.analyzeReferences = vi.fn(async () => { throw new Error('provedor recusou a imagem'); });

    const resultado = await createStudioAssetActions(deps).generate('x', '9:16', {
      referenceImageUrls: ['https://x/ref.png'],
    });

    expect(resultado.status).toBe('ready');
    expect((deps.invoke as any).mock.calls[0][1].prompt).not.toContain('[DESIGN SYSTEM]');
  });

  it('o sistema visual lido das referências chega ao prompt e à linha', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });
    deps.analyzeReferences = vi.fn(async () => ({
      designSystemDoc: 'Layer 1 — Background: full-bleed warm photo',
      antiPadroes: ['NEVER use neon gradients'],
      mood: { adjetivos: ['sofisticado'], referencias: ['Kinfolk'], evita: ['clipart'] },
    }));

    const resultado = await createStudioAssetActions(deps).generate('x', '9:16', {
      referenceImageUrls: ['https://x/ref.png'],
    });

    const prompt = (deps.invoke as any).mock.calls[0][1].prompt;
    expect(prompt).toContain('[DESIGN SYSTEM]\nLayer 1 — Background: full-bleed warm photo');
    expect(prompt).toContain('- NEVER use neon gradients');
    expect(prompt).toContain('Feels like: Kinfolk.');
    expect(resultado.metadata?.designSystemDoc).toContain('full-bleed warm photo');
  });

  it('anuncia cada etapa antes de entrar nela', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });
    deps.analyzeReferences = vi.fn(async () => null);
    deps.directArt = vi.fn(async () => ({ artDirection: null, copyBlocks: null }));
    const estagios: string[] = [];

    await createStudioAssetActions(deps).generate('x', '9:16', {
      referenceImageUrls: ['https://x/ref.png'],
      onStage: (e) => estagios.push(e),
    });

    expect(estagios).toEqual(['reading-references', 'directing', 'generating']);
  });

  it('analyzeReferences recebe as REFERÊNCIAS, e nunca as fotos de produto', async () => {
    // O erro inverso do relatado, e igualmente presente: a foto da
    // embalagem do cliente era decodificada como se fosse a linguagem
    // visual a imitar — e ainda custava uma chamada de visão em toda
    // geração com produto anexado.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });
    deps.analyzeReferences = vi.fn(async () => null);

    await createStudioAssetActions(deps).generate('x', '4:5', {
      referenceImageUrls: ['https://x/ref-kitesurf.png'],
      productImageUrls: ['https://x/lata.png'],
    });

    expect(deps.analyzeReferences).toHaveBeenCalledWith(['https://x/ref-kitesurf.png']);
  });

  it('sem referência anexada, a leitura de estilo nem é chamada', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });
    deps.analyzeReferences = vi.fn(async () => null);

    await createStudioAssetActions(deps).generate('x', '4:5', {
      productImageUrls: ['https://x/lata.png'],
    });

    expect(deps.analyzeReferences).not.toHaveBeenCalled();
  });

  it('a referência NÃO viaja como imagem para o gerador', async () => {
    // A regressão de origem, no ponto em que ela sai do sistema. A garantia
    // é estrutural: não há canal por onde a referência chegue ao modelo.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });
    deps.analyzeReferences = vi.fn(async () => null);

    await createStudioAssetActions(deps).generate('x', '4:5', {
      referenceImageUrls: ['https://x/ref-kitesurf.png'],
      productImageUrls: ['https://x/lata.png'],
      logoImageUrl: 'https://x/logo-cliente.png',
    });

    const enviado = (deps.invoke as any).mock.calls.find((c: any[]) => c[0] === 'criativo-generate')[1];
    expect(enviado.productImages).toEqual(['https://x/lata.png']);
    expect(JSON.stringify(enviado)).not.toContain('ref-kitesurf');
  });

  it('hasReferences e hasProduct deixam de ser a mesma expressão', async () => {
    // Eram literalmente `produtos.length > 0` nas duas, então a direção de
    // arte nunca soube distinguir o que ia no quadro do que era só estilo.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });
    deps.analyzeReferences = vi.fn(async () => null);
    deps.directArt = vi.fn(async () => ({ artDirection: null, copyBlocks: null }));

    await createStudioAssetActions(deps).generate('x', '4:5', {
      referenceImageUrls: ['https://x/ref.png'],
    });
    expect(deps.directArt).toHaveBeenCalledWith(expect.objectContaining({
      hasReferences: true, hasProduct: false, hasAvatar: false,
    }));

    (deps.directArt as any).mockClear();
    await createStudioAssetActions(deps).generate('x', '4:5', {
      productImageUrls: ['https://x/lata.png'],
    });
    expect(deps.directArt).toHaveBeenCalledWith(expect.objectContaining({
      hasReferences: false, hasProduct: true, hasAvatar: false,
    }));
  });

  it('pessoa anexada acende hasAvatar — a direção de arte só pergunta se há humano', async () => {
    // Mapear pessoa para o booleano que a edge function já conhece é o que
    // dispensa um campo novo lá, e com ele um deploy.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });
    deps.directArt = vi.fn(async () => ({ artDirection: null, copyBlocks: null }));

    await createStudioAssetActions(deps).generate('x', '4:5', {
      personImageUrls: ['https://x/heiner.png'],
    });

    expect(deps.directArt).toHaveBeenCalledWith(expect.objectContaining({ hasAvatar: true }));
  });

  it('a pessoa entra no bloco de talento, e o objeto no de produto', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });

    await createStudioAssetActions(deps).generate('x', '4:5', {
      personImageUrls: ['https://x/heiner.png'],
      productImageUrls: ['https://x/prancha.png'],
    });

    const enviado = (deps.invoke as any).mock.calls[0][1];
    // A ordem é o contrato: talento na frente, produto na cauda.
    expect(enviado.productImages).toEqual(['https://x/heiner.png', 'https://x/prancha.png']);
    expect(enviado.prompt).toContain('The first 1 attached photograph(s) are the TALENT');
    expect(enviado.prompt).toContain('The last 1 attached photograph(s) are the PRODUCT');
  });

  it('o metadata da arte distingue os quatro grupos, nas duas gravações', async () => {
    // A gravação preliminar é a que sobrevive quando a aba fecha no meio do
    // pedido — se ela guardar a mistura, o retry a herda para sempre.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });
    deps.analyzeReferences = vi.fn(async () => null);

    const resultado = await createStudioAssetActions(deps).generate('x', '4:5', {
      referenceImageUrls: ['https://x/ref.png'],
      personImageUrls: ['https://x/heiner.png'],
      productImageUrls: ['https://x/prancha.png'],
      avatarImageUrls: ['https://x/avatar.png'],
      logoImageUrl: 'https://x/logo.png',
    });

    expect(resultado.metadata).toMatchObject({
      referenceImages: ['https://x/ref.png'],
      personImages: ['https://x/heiner.png'],
      productImages: ['https://x/prancha.png'],
      avatarImages: ['https://x/avatar.png'],
      logoImage: 'https://x/logo.png',
      designSystemFromReference: true,
    });
  });

  it('o retry devolve os três grupos na mesma ordem da geração', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });
    const arte = assetBase({
      status: 'failed', prompt: 'prompt salvo',
      metadata: {
        avatarImages: ['https://x/avatar.png'],
        personImages: ['https://x/heiner.png'],
        productImages: ['https://x/prancha.png'],
        referenceImages: ['https://x/ref.png'],
      },
    });
    deps.linhas.set(arte.id, arte);

    await createStudioAssetActions(deps).retry(arte);

    const enviado = (deps.invoke as any).mock.calls[0][1];
    expect(enviado.productImages).toEqual([
      'https://x/avatar.png', 'https://x/heiner.png', 'https://x/prancha.png',
    ]);
    // A referência não volta como imagem nem no retry.
    expect(JSON.stringify(enviado)).not.toContain('x/ref.png');
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
    expect(linha.metadata).toMatchObject({
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

describe('a linha guarda o que o prompt dela pressupõe', () => {
  it('resize guarda a arte de origem, e o retry dela reanexa', async () => {
    // Sem isto, "tentar novamente" num resize que falhou mandava um prompt
    // que abre com "the attached reference image IS the artwork" e NENHUMA
    // imagem anexada — o bug que o próprio reenquadramento tinha acabado
    // de corrigir, de volta pela porta dos fundos.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/q.png' }, error: null });
    const acoes = createStudioAssetActions(deps);

    const quadrada = await acoes.resize(assetBase({ prompt: 'p', aspectRatio: '9:16', url: 'https://x/origem.png' }));
    expect(quadrada.metadata?.sourceImage).toBe('https://x/origem.png');

    (deps.invoke as any).mockClear();
    await acoes.retry({ ...quadrada, status: 'failed' } as any);
    expect((deps.invoke as any).mock.calls[0][1].storyReference).toBe('https://x/origem.png');
  });

  it('edit herda os anexos da arte de origem, para o retry não os perder', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { editedImageUrl: 'https://x/e.png' }, error: null });
    const origem = assetBase({
      url: 'https://x/origem.png',
      metadata: { logoImage: 'https://x/logo.png', productImages: ['https://x/p.png'], avatarImages: ['https://x/ana.png'] },
    });

    const editada = await createStudioAssetActions(deps).edit(origem, 'mais contraste');

    expect(editada.metadata?.sourceImage).toBe('https://x/origem.png');
    expect(editada.metadata?.avatarImages).toEqual(['https://x/ana.png']);
  });

  it('retry devolve os avatares que a geração original mandou', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });
    const falhou = assetBase({
      status: 'failed', prompt: 'p',
      metadata: { avatarImages: ['https://x/ana.png'], productImages: ['https://x/prod.png'], logoImage: null },
    });

    await createStudioAssetActions(deps).retry(falhou);

    expect((deps.invoke as any).mock.calls[0][1].productImages)
      .toEqual(['https://x/ana.png', 'https://x/prod.png']);
  });
});

describe('o card ocupa o lugar da arte antes de a arte existir', () => {
  it('avisa a linha em generating ANTES de ler referência e dirigir a arte', async () => {
    // Sem isto o canvas ficava vazio o pedido inteiro: as duas etapas de IA
    // levam segundos, e a arte aparecia do nada só no fim.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });
    const eventos: string[] = [];
    deps.analyzeReferences = vi.fn(async () => { eventos.push('analise'); return null; });
    deps.directArt = vi.fn(async () => {
      eventos.push('direcao');
      return { artDirection: null, copyBlocks: null };
    });

    await createStudioAssetActions(deps).generate('x', '9:16', {
      referenceImageUrls: ['https://x/ref.png'],
      onAssetCreated: (a) => eventos.push(`card:${a.status}`),
    });

    expect(eventos).toEqual(['card:generating', 'analise', 'direcao']);
  });

  it('o Fator anuncia as cinco linhas de uma vez, antes de qualquer imagem', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/v.png' }, error: null });
    let anunciadas: any[] = [];

    await createStudioAssetActions(deps).factorCriativo({
      base: assetBase({ prompt: 'p' }),
      variations: Array.from({ length: 5 }, (_, i) => variacaoFalsa(i + 1)),
      onSlotsCreated: (linhas) => { anunciadas = linhas; },
    });

    expect(anunciadas).toHaveLength(5);
    expect(anunciadas.every((a) => a.status === 'generating')).toBe(true);
  });

  it('editar e redimensionar também anunciam a linha nova', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { editedImageUrl: 'https://x/e.png' }, error: null });
    const acoes = createStudioAssetActions(deps);
    const vistos: string[] = [];

    await acoes.edit(assetBase({ url: 'https://x/o.png' }), 'mais contraste', (a) => vistos.push(a.type));
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/q.png' }, error: null });
    await acoes.resize(assetBase({ prompt: 'p', aspectRatio: '9:16', url: 'https://x/o.png' }), (a) => vistos.push(a.type));

    expect(vistos).toEqual(['edited', 'resize']);
  });
});

function variacaoFalsa(slot: number) {
  return {
    slot, label: `V${slot}`,
    strategy: { angle: 'problem', angleSubtype: 's', strategicThesis: 't' },
    audience: { persona: 'p', awarenessLevel: 'a' },
    execution: { dominantEmotion: 'e' },
    copy: { title: 'T', cta: 'C' },
    visualDirection: { mainSubject: 'S', composition: 'C', mood: 'm' },
    validation: { changedDimensions: ['thesis'], qualityScore: 9 },
  } as any;
}

describe('interpret — a leitura separada da geração', () => {
  it('lê e devolve, sem gravar linha nem chamar o provedor', async () => {
    // É a razão de o passo existir: a leitura custa segundos e nada de
    // dinheiro; a geração custa os dois. Parar entre as duas é o que torna
    // possível corrigir antes de gastar.
    const deps = fakeDeps();
    deps.analyzeReferences = vi.fn(async () => ({
      designSystemDoc: '## Paleta\nAzul petróleo',
      antiPadroes: ['nada de gradiente arco-íris'],
      mood: { adjetivos: ['sóbrio'], referencias: [], evita: [] },
    }) as any);
    deps.directArt = vi.fn(async () => ({
      artDirection: { mainSubject: 'Vitrine da loja', composition: 'Frontal, luz dura', mood: 'urbano' },
      copyBlocks: null,
    }));

    const leitura = await createStudioAssetActions(deps).interpret('liquidação', '1:1', {
      referenceImageUrls: ['https://x/ref.png'],
    });

    expect(leitura.artDirection?.mainSubject).toBe('Vitrine da loja');
    expect(leitura.designSystemDoc).toContain('Azul petróleo');
    expect(leitura.designSystemFromReference).toBe(true);
    expect(deps.ordem).toEqual([]); // nenhuma linha no banco
    expect(deps.invoke).not.toHaveBeenCalled(); // nenhuma imagem gerada
  });

  it('IA fora do ar devolve leitura vazia, não exceção', async () => {
    // Quem chama é a tela. Um throw aqui travaria o Enter em vez de deixar
    // o usuário seguir sem a camada extra.
    const deps = fakeDeps();
    deps.directArt = vi.fn(async () => { throw new Error('modelo descontinuado'); });
    deps.analyzeReferences = vi.fn(async () => { throw new Error('visão indisponível'); });

    const leitura = await createStudioAssetActions(deps).interpret('qualquer coisa', '4:5', {
      referenceImageUrls: ['https://x/ref.png'],
    });

    expect(leitura.artDirection).toBeNull();
    expect(leitura.designSystemDoc).toBeNull();
    // A referência EXISTIU, mesmo não tendo sido lida: a cláusula que proíbe
    // reproduzir a marca de origem continua devida.
    expect(leitura.designSystemFromReference).toBe(true);
  });

  it('a leitura aprovada não é refeita na geração', async () => {
    // Reler chamaria duas IAs de novo para possivelmente chegar a outra
    // interpretação — e gerar uma arte que não é a que o usuário aprovou.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });
    deps.directArt = vi.fn(async () => ({ artDirection: null, copyBlocks: null }));
    deps.analyzeReferences = vi.fn(async () => null);

    const acoes = createStudioAssetActions(deps);
    const leitura = await acoes.interpret('vitrine', '1:1', { referenceImageUrls: ['https://x/r.png'] });
    expect(deps.directArt).toHaveBeenCalledTimes(1);

    const arte = await acoes.generate('vitrine', '1:1', {
      referenceImageUrls: ['https://x/r.png'],
      interpretation: {
        ...leitura,
        artDirection: { mainSubject: 'O que foi aprovado', composition: 'Como foi aprovado', mood: '' },
      },
    });

    expect(deps.directArt).toHaveBeenCalledTimes(1); // nenhuma segunda leitura
    expect(deps.analyzeReferences).toHaveBeenCalledTimes(1);
    // E o que viaja é o aprovado, não uma releitura.
    expect(arte.metadata?.artDirection?.mainSubject).toBe('O que foi aprovado');
    expect((deps.invoke as any).mock.calls[0][1].prompt).toContain('O que foi aprovado');
  });

  it('sem leitura pronta, gerar continua lendo sozinho', async () => {
    // O caminho de hoje não pode depender da proposta: um fluxo que pule a
    // aprovação (ou uma tela que não a mostre) ainda tem direito à camada.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });
    deps.directArt = vi.fn(async () => ({
      artDirection: { mainSubject: 'Lido na hora', composition: 'direto', mood: '' },
      copyBlocks: null,
    }));

    await createStudioAssetActions(deps).generate('promoção', '4:5');

    expect(deps.directArt).toHaveBeenCalledTimes(1);
    expect((deps.invoke as any).mock.calls[0][1].prompt).toContain('Lido na hora');
  });
});

describe('a leitura de referências reaproveitada entre peças', () => {
  it('com a leitura em mãos, as referências não são decodificadas de novo', () => {
    // Num pedido de duas peças, `interpret` roda duas vezes. Sem reaproveitar,
    // as MESMAS referências custariam duas chamadas de visão para chegar ao
    // mesmo documento de estilo.
    const deps = fakeDeps();
    deps.analyzeReferences = vi.fn(async () => ({ designSystemDoc: 'x', antiPadroes: [], mood: null }) as any);
    deps.directArt = vi.fn(async () => ({ artDirection: null, copyBlocks: null }));

    return createStudioAssetActions(deps).interpret('peça 2', '1:1', {
      referenceImageUrls: ['https://x/r.png'],
      referenceReading: {
        designSystemDoc: '## Paleta\nAzul petróleo',
        antiPadroes: ['nada de arco-íris'],
        mood: null,
        designSystemFromReference: true,
      },
    }).then((leitura) => {
      expect(deps.analyzeReferences).not.toHaveBeenCalled();
      expect(leitura.designSystemDoc).toContain('Azul petróleo');
      expect(leitura.designSystemFromReference).toBe(true);
      // E o estilo reaproveitado chega à direção de arte da segunda peça.
      expect((deps.directArt as any).mock.calls[0][0].designSystemDoc).toContain('Azul petróleo');
    });
  });

  it('sem leitura em mãos, continua lendo as referências como antes', async () => {
    const deps = fakeDeps();
    deps.analyzeReferences = vi.fn(async () => ({
      designSystemDoc: 'lido na hora', antiPadroes: null, mood: null,
    }) as any);

    const leitura = await createStudioAssetActions(deps).interpret('peça 1', '1:1', {
      referenceImageUrls: ['https://x/r.png'],
    });

    expect(deps.analyzeReferences).toHaveBeenCalledTimes(1);
    expect(leitura.designSystemDoc).toBe('lido na hora');
  });
})

describe('o sistema visual sobrevive à cadeia de artes derivadas', () => {

  const COM_MARCA = {
    logoImage: 'https://x/logo.png',
    productImages: ['https://x/prod.png'],
    designSystemDoc: '## Paleta\nCreme e dourado',
    antiPadroes: ['nada de neon'],
    designSystemFromReference: true,
    artDirection: { mainSubject: 'Dois sorrisos', composition: 'Split', mood: 'claro' },
    copyBlocks: { titulo: 'Limpeza + Clareamento' },
  };

  it('editar não apaga mais a paleta e a tipografia da marca', async () => {
    // Era aqui que o Fator sobre uma Edição passava a ler
    // `designSystemDoc: null` — e o montador, que só emite [DESIGN SYSTEM]
    // com o documento preenchido, não punha nada no lugar.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { editedImageUrl: 'https://x/e.png' }, error: null });
    const base = assetBase({ id: 'mae', url: 'https://x/m.png', metadata: COM_MARCA as any });

    await createStudioAssetActions(deps).edit(base, 'tira o fundo');

    const filha = [...deps.linhas.values()].find((l) => l.type === 'edited')!;
    expect(filha.metadata?.designSystemDoc).toContain('Creme e dourado');
    expect(filha.metadata?.antiPadroes).toEqual(['nada de neon']);
    expect(filha.metadata?.designSystemFromReference).toBe(true);
    expect(filha.metadata?.artDirection?.mainSubject).toBe('Dois sorrisos');
    expect(filha.metadata?.logoImage).toBe('https://x/logo.png');
  });

  it('reenquadrar também — era o metadata mais pobre do sistema', async () => {
    // `metadata: { sourceImage }` apagava de uma vez a logo, o produto, o
    // sistema visual e a direção de arte.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/r.png' }, error: null });
    const base = assetBase({ id: 'mae', aspectRatio: '9:16', url: 'https://x/m.png', prompt: 'anúncio de clareamento', metadata: COM_MARCA as any });

    await createStudioAssetActions(deps).resize(base);

    const filha = [...deps.linhas.values()].find((l) => l.type === 'resize')!;
    expect(filha.metadata?.logoImage).toBe('https://x/logo.png');
    expect(filha.metadata?.designSystemDoc).toContain('Creme e dourado');
    // E o briefing fica guardado à parte do texto de recorte, que precisa
    // continuar em `prompt` para o "tentar novamente" funcionar.
    expect(filha.prompt).toContain('REFRAME');
    expect(filha.metadata?.promptDeOrigem).toBe('anúncio de clareamento');
  });

  it('o Fator sobe a linhagem quando a arte-base chega pobre', async () => {
    // Os escritores foram corrigidos, mas as artes JÁ GRAVADAS pobres
    // continuam no acervo — são elas que estão no canvas de quem usa agora.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });
    const avo = assetBase({ id: 'avo', metadata: COM_MARCA as any, prompt: 'anúncio de clareamento' });
    deps.getAsset = vi.fn(async (id: string) => (id === 'avo' ? avo : null));

    const pobre = assetBase({
      id: 'pobre', parentAssetId: 'avo', url: 'https://x/p.png',
      prompt: '[REFRAME — THIS IS NOT A NEW ARTWORK]', metadata: { sourceImage: 'https://x/m.png' },
    });

    await createStudioAssetActions(deps).factorCriativo({
      base: pobre,
      variations: [variacaoDoFator()],
    });

    const enviado = (deps.invoke as any).mock.calls[0][1];
    expect(enviado.prompt).toContain('Creme e dourado');
    expect(enviado.logoImage).toBe('https://x/logo.png');
    // E a imagem da peça escolhida vai anexada, não a do avô.
    expect(enviado.aspectReference).toBe('https://x/p.png');
  });

  it('o que a base TEM vence o ancestral — herdar não é desfazer a edição', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });
    const avo = assetBase({ id: 'avo', metadata: { ...COM_MARCA, logoImage: 'https://x/antiga.png' } as any });
    deps.getAsset = vi.fn(async () => avo);

    const base = assetBase({
      id: 'base', parentAssetId: 'avo', url: 'https://x/b.png',
      metadata: { logoImage: 'https://x/nova.png' },
    });

    await createStudioAssetActions(deps).factorCriativo({ base, variations: [variacaoDoFator()] });

    const enviado = (deps.invoke as any).mock.calls[0][1];
    expect(enviado.logoImage).toBe('https://x/nova.png');
    expect(enviado.prompt).toContain('Creme e dourado'); // o que faltava, herdou
  });

  it('sem `getAsset`, o Fator segue com o que a base tiver', async () => {
    // A herança é uma camada a mais, nunca um pré-requisito: uma consulta
    // indisponível não pode impedir a arte.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });
    const base = assetBase({ id: 'base', parentAssetId: 'avo', url: 'https://x/b.png', metadata: {} });

    const artes = await createStudioAssetActions(deps).factorCriativo({
      base, variations: [variacaoDoFator()],
    });
    expect(artes).toHaveLength(1);
  });

  it('consulta que falha no meio da subida não derruba a geração', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });
    deps.getAsset = vi.fn(async () => { throw new Error('banco fora do ar'); });
    const base = assetBase({ id: 'base', parentAssetId: 'avo', url: 'https://x/b.png', metadata: {} });

    const artes = await createStudioAssetActions(deps).factorCriativo({
      base, variations: [variacaoDoFator()],
    });
    expect(artes).toHaveLength(1);
    expect(artes[0].status).toBe('ready');
  });
});

describe('toda chamada ao provedor declara um teto de espera', () => {
  // Esta garantia era protegida por um teste de caracterização que lia o
  // código-fonte da V1 — "toda chamada de geração, edição e Fator declara
  // timeout". Com a V1 removida, aquele arquivo saiu junto, e esta era a
  // única das 16 afirmações dele sem equivalente de comportamento na V2.
  //
  // O dano que evita: uma chamada sem teto deixa o card em `generating`
  // para sempre quando o provedor engasga. Não falha, não volta, não dá
  // erro — fica girando, e o usuário recarrega a página achando que
  // travou.
  const TETO = 90_000;

  it('gerar, editar, redimensionar, retentar e o Fator — nenhum sem teto', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({
      data: { imageUrl: 'https://x/n.png', editedImageUrl: 'https://x/e.png' }, error: null,
    });
    const acoes = createStudioAssetActions(deps);
    const base = assetBase({ id: 'b', url: 'https://x/b.png', aspectRatio: '9:16', prompt: 'p' });

    await acoes.generate('arte', '9:16');
    await acoes.edit(base, 'muda o fundo');
    await acoes.resize(base);
    await acoes.retry(assetBase({ id: 'r', status: 'failed', prompt: 'p' }));
    await acoes.factorCriativo({ base, variations: [variacaoDoFator()] });

    const chamadas = (deps.invoke as any).mock.calls;
    expect(chamadas.length).toBeGreaterThanOrEqual(5);
    for (const [nome, , timeout] of chamadas) {
      expect(timeout, `${nome} sem teto de espera`).toBe(TETO);
    }
  });
});

describe('a imagem vira arquivo antes de ser gravada na linha', () => {
  const BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANS';

  it('arte devolvida embutida é convertida em arquivo', async () => {
    // Gravar o base64 na coluna `url` guarda a imagem inteira dentro do
    // banco — e a listagem anula esse campo de propósito, porque trezentas
    // linhas assim seriam megabytes de JSON por abertura de tela. A arte
    // existe e some da tela ao mesmo tempo: um card branco que nunca
    // carrega, por mais que se espere.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: BASE64 }, error: null });
    deps.persistImage = vi.fn(async () => 'https://storage/arquivo.png');

    const arte = await createStudioAssetActions(deps).generate('anúncio', '9:16');

    expect(deps.persistImage).toHaveBeenCalledWith(BASE64, expect.any(String));
    expect(arte.url).toBe('https://storage/arquivo.png');
    expect(arte.thumbnailUrl).toBe('https://storage/arquivo.png');
  });

  it('a edição também', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { editedImageUrl: BASE64 }, error: null });
    deps.persistImage = vi.fn(async () => 'https://storage/editada.png');

    const arte = await createStudioAssetActions(deps).edit(
      assetBase({ url: 'https://x/a.png' }), 'tira o fundo',
    );
    expect(arte.url).toBe('https://storage/editada.png');
  });

  it('URL normal passa direto — nada a converter', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/ja-e-arquivo.png' }, error: null });
    deps.persistImage = vi.fn(async () => 'NÃO DEVERIA');

    const arte = await createStudioAssetActions(deps).generate('anúncio', '9:16');
    expect(deps.persistImage).not.toHaveBeenCalled();
    expect(arte.url).toBe('https://x/ja-e-arquivo.png');
  });

  it('conversão que falha NÃO custa a arte', async () => {
    // Uma imagem que precisa de um clique para aparecer é muito melhor que
    // uma geração perdida depois de paga.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: BASE64 }, error: null });
    deps.persistImage = vi.fn(async () => { throw new Error('bucket recusou'); });

    const arte = await createStudioAssetActions(deps).generate('anúncio', '9:16');
    expect(arte.status).toBe('ready');
    expect(arte.url).toBe(BASE64);
  });

  it('sem a conversão ligada, o comportamento é o de antes', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: BASE64 }, error: null });

    const arte = await createStudioAssetActions(deps).generate('anúncio', '9:16');
    expect(arte.url).toBe(BASE64);
  });
});

describe('o formato da peça — o container', () => {
  const prompt = (deps: any) => (deps.invoke as any).mock.calls[0][1].prompt as string;

  it('o pedido que nomeia o formato leva o layout ao prompt', async () => {
    // O cano existia dos dois lados desde a fase 2 — catálogo de um lado,
    // bloco [TEMPLATE STRUCTURE] do outro — e nenhuma arte passava por ele:
    // o único lugar que preenchia `template` era a bancada, em DEV.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });

    const r = await createStudioAssetActions(deps).generate('quero um antes e depois', '1:1');

    expect(prompt(deps)).toContain('[TEMPLATE STRUCTURE]');
    expect(prompt(deps)).toContain('Template name: Antes e depois');
    expect(r.metadata?.containerId).toBe('antes_depois');
  });

  it('o que o container declara INEGOCIÁVEL entra como regra dura', async () => {
    // `fixo` é o que mata o formato se mudar. Passar o nome da peça sem as
    // regras dela seria dizer "faça um antes e depois" e deixar o modelo
    // inventar o que isso significa.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });

    await createStudioAssetActions(deps).generate('quero um antes e depois', '1:1');

    expect(prompt(deps)).toContain('NON-NEGOTIABLE');
  });

  it('pedido genérico não ganha formato nenhum, e o prompt sai como sempre saiu', async () => {
    // Container errado é pior que container nenhum: o layout entra como
    // regra dura e a pessoa recebe uma peça que não pediu.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });

    const r = await createStudioAssetActions(deps).generate('criativo de clareamento', '4:5');

    expect(prompt(deps)).not.toContain('[TEMPLATE STRUCTURE]');
    expect(r.metadata?.containerId).toBeNull();
  });

  it('o formato escolhido À MÃO vence o que o texto sugere', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });

    const r = await createStudioAssetActions(deps)
      .generate('quero um antes e depois', '1:1', { containerId: 'censurado' });

    expect(prompt(deps)).toContain('Template name: Censurado');
    expect(r.metadata?.containerId).toBe('censurado');
  });

  it('recusar o formato é possível — `null` explícito desliga a escolha', async () => {
    // Sem a distinção entre `null` e ausente, recusar o formato proposto
    // seria impossível: a escolha automática o traria de volta no pedido
    // seguinte, e o botão de desmarcar não faria nada.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });

    const r = await createStudioAssetActions(deps)
      .generate('quero um antes e depois', '1:1', { containerId: null });

    expect(prompt(deps)).not.toContain('[TEMPLATE STRUCTURE]');
    expect(r.metadata?.containerId).toBeNull();
  });

  it('a leitura devolve o formato, para a proposta mostrar antes de gastar', async () => {
    const deps = fakeDeps();
    const leitura = await createStudioAssetActions(deps).interpret('quero um antes e depois', '1:1');
    expect(leitura.formato?.container?.id).toBe('antes_depois');
    expect(leitura.formato?.listaCurta.length).toBeGreaterThan(0);
  });

  it('a leitura aprovada não é refeita — o formato dela é o que gera', async () => {
    // Reler aqui geraria uma arte que não é a que foi aprovada na tela.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });
    const acoes = createStudioAssetActions(deps);
    const leitura = await acoes.interpret('quero um antes e depois', '1:1');

    await acoes.generate('texto completamente diferente agora', '1:1', { interpretation: leitura });

    expect(prompt(deps)).toContain('Template name: Antes e depois');
  });
});

describe('o formato atravessa as artes derivadas', () => {
  it('o Fator mantém o formato da arte-base nas cinco', async () => {
    // As variações são da mesma campanha: o que varia entre elas é a TESE,
    // não a peça. Deixá-las sem o formato faria o lote divergir
    // exatamente no que deveria preservar.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/v.png' }, error: null });
    const base = assetBase({ id: 'base', aspectRatio: '1:1', metadata: { containerId: 'antes_depois' } });

    const linhas = await createStudioAssetActions(deps).factorCriativo({
      base,
      variations: [variacaoDoFator()],
    });

    expect(linhas[0].metadata?.containerId).toBe('antes_depois');
    const enviado = (deps.invoke as any).mock.calls[0][1];
    expect(enviado.prompt).toContain('Template name: Antes e depois');
  });

  it('editar uma arte não é pedir outra peça — o formato desce pelo ancestral', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/v.png' }, error: null });
    const avo = assetBase({ id: 'avo', aspectRatio: '1:1', metadata: { containerId: 'antes_depois' } });
    deps.getAsset = vi.fn(async (id: string) => (id === 'avo' ? avo : null));
    const filha = assetBase({ id: 'filha', aspectRatio: '1:1', parentAssetId: 'avo', metadata: {} });

    const linhas = await createStudioAssetActions(deps).factorCriativo({
      base: filha,
      variations: [variacaoDoFator()],
    });

    expect(linhas[0].metadata?.containerId).toBe('antes_depois');
  });

  it('base sem formato não inventa um', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/v.png' }, error: null });

    const linhas = await createStudioAssetActions(deps).factorCriativo({
      base: assetBase({ id: 'base', aspectRatio: '1:1' }),
      variations: [variacaoDoFator()],
    });

    expect(linhas[0].metadata?.containerId).toBeNull();
    expect((deps.invoke as any).mock.calls[0][1].prompt).not.toContain('[TEMPLATE STRUCTURE]');
  });
});

describe('a troca de formato depois da leitura aprovada', () => {
  it('o formato escolhido no painel vence a leitura já feita', async () => {
    // O buraco que o teste de página encontrou: a precedência valia só
    // dentro da leitura, e com a proposta ligada a leitura não roda de
    // novo. Trocar o formato no painel não mudava nada — o painel dizia
    // uma coisa e o gerador fazia outra.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });
    const acoes = createStudioAssetActions(deps);
    const leitura = await acoes.interpret('quero um antes e depois', '1:1');

    const r = await acoes.generate('quero um antes e depois', '1:1', {
      interpretation: leitura,
      containerId: 'censurado',
    });

    expect((deps.invoke as any).mock.calls[0][1].prompt).toContain('Template name: Censurado');
    expect(r.metadata?.containerId).toBe('censurado');
  });

  it('recusar o formato depois de aprovar a leitura também funciona', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });
    const acoes = createStudioAssetActions(deps);
    const leitura = await acoes.interpret('quero um antes e depois', '1:1');

    const r = await acoes.generate('quero um antes e depois', '1:1', {
      interpretation: leitura,
      containerId: null,
    });

    expect((deps.invoke as any).mock.calls[0][1].prompt).not.toContain('[TEMPLATE STRUCTURE]');
    expect(r.metadata?.containerId).toBeNull();
  });
});

describe('o favorito anexado empresta estilo e formato', () => {
  const prompt = (deps: any) => (deps.invoke as any).mock.calls[0][1].prompt as string;
  /** O que o dock monta quando você anexa um favorito. */
  const doFavorito = {
    referenceReading: {
      designSystemDoc: '## Palette\nOff-white #F4F0E8, accent #C08457.',
      antiPadroes: ['NEVER use cold blue clinical lighting'],
      mood: null,
      designSystemFromReference: false,
    },
    containerSugerido: 'antes_depois',
  };

  it('o sistema visual dele entra sem custar uma leitura de visão', async () => {
    // Reler a imagem chegaria a um documento PARECIDO com o que já está
    // gravado na linha — pagando uma chamada de visão para perder
    // fidelidade.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });
    deps.analyzeReferences = vi.fn();

    await createStudioAssetActions(deps).generate('clareamento', '1:1', doFavorito);

    expect(deps.analyzeReferences).not.toHaveBeenCalled();
    expect(prompt(deps)).toContain('Off-white #F4F0E8');
  });

  it('NÃO dispara a cláusula que proíbe reproduzir a marca de origem', async () => {
    // Essa cláusula existe porque uma referência é arte de TERCEIROS.
    // Emiti-la sobre um favorito proibiria a arte de usar a marca do
    // próprio cliente — que é o que o favorito foi salvo para repetir.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });

    await createStudioAssetActions(deps).generate('clareamento', '1:1', doFavorito);

    // A cláusula tem duas partes, e nenhuma pode aparecer: o bloco
    // [STYLE REFERENCE] e a linha dele em [DO NOT INCLUDE].
    expect(prompt(deps)).not.toContain('[STYLE REFERENCE — DESCRIPTION ONLY');
    expect(prompt(deps)).not.toContain('produced by a THIRD PARTY');
    expect(prompt(deps)).not.toMatch(/Any brand name, wordmark, logo, slogan, headline or person that appears in the style description/);
  });

  it('empresta o formato quando o pedido não nomeia nenhum', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });

    const r = await createStudioAssetActions(deps).generate('clareamento', '1:1', doFavorito);

    expect(prompt(deps)).toContain('Template name: Antes e depois');
    expect(r.metadata?.containerId).toBe('antes_depois');
  });

  it('mas o TEXTO manda: um formato citado vence o do favorito', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });

    const r = await createStudioAssetActions(deps)
      .generate('quero um criativo censurado', '1:1', doFavorito);

    expect(r.metadata?.containerId).toBe('censurado');
  });

  it('e a escolha à mão vence os dois', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });

    const r = await createStudioAssetActions(deps)
      .generate('quero um criativo censurado', '1:1', { ...doFavorito, containerId: null });

    expect(r.metadata?.containerId).toBeNull();
  });

  it('favorito de outra proporção não impõe o formato dele', async () => {
    // A porteira continua valendo: um favorito 1:1 num pedido 9:16
    // emprestaria uma peça que o próprio container declara não ser aquela
    // proporção.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { imageUrl: 'https://x/n.png' }, error: null });

    const r = await createStudioAssetActions(deps).generate('clareamento', '9:16', doFavorito);

    expect(r.metadata?.containerId).toBeNull();
    // O estilo dele continua valendo — é a proporção que não bate, não a marca.
    expect(prompt(deps)).toContain('Off-white #F4F0E8');
  });
});
