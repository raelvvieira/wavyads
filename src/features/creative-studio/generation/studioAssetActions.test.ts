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
    expect(linha.metadata).toEqual({ logoImage: 'https://x/logo.png', productImages: ['https://x/p1.png'] });
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
