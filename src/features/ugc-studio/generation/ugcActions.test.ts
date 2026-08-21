import { describe, expect, it, vi } from 'vitest';
import { createUgcActions, type UgcActionDeps } from './ugcActions';
import type { UgcClip } from '../types/ugc';

function clipBase(patch: Partial<UgcClip> = {}): UgcClip {
  return {
    id: 'c1', projectId: 'p1', kind: 'avatar', segment: 'hook', anglePreset: null,
    speech: 'oi', durationSeconds: 8, resolution: '1080p', audio: true,
    status: 'generating', url: null, thumbnailUrl: null, errorMessage: null,
    prompt: 'PROMPT', model: null, metadata: {},
    createdAt: '2026-08-21T10:00:00.000Z', updatedAt: '2026-08-21T10:00:00.000Z',
    ...patch,
  };
}

/** Banco falso que guarda linhas por id e registra a ORDEM das operações. */
function fakeDeps(): UgcActionDeps & { linhas: Map<string, UgcClip>; ordem: string[] } {
  const linhas = new Map<string, UgcClip>();
  const ordem: string[] = [];
  let proximo = 1;

  return {
    linhas,
    ordem,
    invoke: vi.fn(),
    extractErrorMessage: async (e: unknown) => (e as Error)?.message || 'erro',
    async createClip(input) {
      ordem.push('createClip');
      const clip = clipBase({ id: `novo-${proximo++}`, ...input } as any);
      linhas.set(clip.id, clip);
      return clip;
    },
    async updateClip(id, patch) {
      ordem.push(`updateClip:${patch.status ?? '-'}`);
      const atual = linhas.get(id)!;
      const atualizado = { ...atual, ...patch } as UgcClip;
      linhas.set(id, atualizado);
      return atualizado;
    },
  };
}

describe('generateAvatarClip', () => {
  it('grava a linha ANTES de chamar o provedor, e completa a MESMA linha depois', async () => {
    // Uma geração é uma linha. Criar outra no retorno é como o usuário passa
    // a ver duas versões do mesmo pedido e perde a referência do que pediu.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { videoUrl: 'https://x/v.mp4', model: 'veo-3.1' }, error: null });

    const clip = await createUgcActions(deps).generateAvatarClip({
      projectId: 'p1', segment: 'hook', speech: 'oi gente',
      durationSeconds: 8, resolution: '1080p', avatarImageUrl: 'https://x/rosto.png',
    });

    expect(deps.ordem).toEqual(['createClip', 'updateClip:ready']);
    expect(deps.linhas.size).toBe(1);
    expect(clip.status).toBe('ready');
    expect(clip.url).toBe('https://x/v.mp4');
  });

  it('o retrato do avatar viaja como primeiro quadro', async () => {
    // É o que mantém a mesma pessoa nos quatro segmentos: a identidade vem
    // da imagem, não da descrição.
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { videoUrl: 'u' }, error: null });

    await createUgcActions(deps).generateAvatarClip({
      projectId: 'p1', segment: 'cta', speech: 'clica no link',
      durationSeconds: 6, resolution: '720p', avatarImageUrl: 'https://x/rosto.png',
    });

    expect(deps.invoke).toHaveBeenCalledWith(
      'ugc-generate-video',
      expect.objectContaining({ imageUrl: 'https://x/rosto.png', durationSeconds: 6, aspectRatio: '9:16' }),
      expect.any(Number),
    );
  });

  it('a fala entra no prompt, literal', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { videoUrl: 'u' }, error: null });

    await createUgcActions(deps).generateAvatarClip({
      projectId: 'p1', segment: 'hook', speech: 'meu vizinho via tudo',
      durationSeconds: 8, resolution: '1080p', avatarImageUrl: null,
    });

    const linha = [...deps.linhas.values()][0];
    expect(linha.prompt).toContain('meu vizinho via tudo');
    // A proibição de texto na tela é o que impede legenda queimada no clipe.
    expect(linha.prompt).toContain('Do not render any text');
  });

  it('falha do provedor grava a MESMA linha como failed, com a mensagem real', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: null, error: new Error('modelo indisponível') });

    const clip = await createUgcActions(deps).generateAvatarClip({
      projectId: 'p1', segment: 'hook', speech: 'oi',
      durationSeconds: 8, resolution: '1080p', avatarImageUrl: null,
    });

    expect(clip.status).toBe('failed');
    expect(clip.errorMessage).toBe('modelo indisponível');
    expect(deps.linhas.size).toBe(1);
  });

  it('erro dentro do corpo da resposta também vira failed', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { error: 'sem crédito' }, error: null });

    const clip = await createUgcActions(deps).generateAvatarClip({
      projectId: 'p1', segment: 'hook', speech: 'oi',
      durationSeconds: 8, resolution: '1080p', avatarImageUrl: null,
    });
    expect(clip.status).toBe('failed');
    expect(clip.errorMessage).toBe('sem crédito');
  });
});

describe('generateBrollBatch', () => {
  it('falha de UM ângulo não derruba os outros', async () => {
    const deps = fakeDeps();
    let n = 0;
    (deps.invoke as any).mockImplementation(async () => {
      n += 1;
      if (n === 2) return { data: null, error: new Error('provedor recusou') };
      return { data: { videoUrl: `https://x/v${n}.mp4` }, error: null };
    });

    const clips = await createUgcActions(deps).generateBrollBatch({
      projectId: 'p1',
      angleIds: ['hand_hold', 'table_flat_lay', 'slow_rotate'],
      durationSeconds: 5, resolution: '1080p', audio: true, productImageUrl: 'https://x/p.png',
    });

    expect(clips.filter((c) => c.status === 'ready')).toHaveLength(2);
    expect(clips.filter((c) => c.status === 'failed')).toHaveLength(1);
  });

  it('cada ângulo vira um clipe com o preset gravado', async () => {
    const deps = fakeDeps();
    (deps.invoke as any).mockResolvedValue({ data: { videoUrl: 'u' }, error: null });

    await createUgcActions(deps).generateBrollBatch({
      projectId: 'p1', angleIds: ['unbox_reveal', 'night_moody'],
      durationSeconds: 5, resolution: '1080p', audio: false, productImageUrl: null,
    });

    const presets = [...deps.linhas.values()].map((c) => c.anglePreset);
    expect(presets).toEqual(['unbox_reveal', 'night_moody']);
    expect([...deps.linhas.values()].every((c) => c.kind === 'broll')).toBe(true);
  });
});

describe('retry', () => {
  it('reaproveita a MESMA linha e devolve os mesmos insumos', async () => {
    // Sem reenviar a imagem original, o retry geraria outra coisa com o
    // mesmo texto.
    const deps = fakeDeps();
    const falhou = clipBase({
      id: 'f1', status: 'failed', errorMessage: 'antes',
      metadata: { avatarImageUrl: 'https://x/rosto.png' },
    });
    deps.linhas.set('f1', falhou);
    (deps.invoke as any).mockResolvedValue({ data: { videoUrl: 'https://x/ok.mp4' }, error: null });

    const clip = await createUgcActions(deps).retry(falhou);

    expect(deps.ordem.some((o) => o === 'createClip')).toBe(false);
    expect(clip.id).toBe('f1');
    expect(clip.status).toBe('ready');
    expect(deps.invoke).toHaveBeenCalledWith(
      'ugc-generate-video',
      expect.objectContaining({ imageUrl: 'https://x/rosto.png' }),
      expect.any(Number),
    );
  });

  it('sem prompt salvo, recusa em vez de gerar algo não pedido', async () => {
    const deps = fakeDeps();
    await expect(createUgcActions(deps).retry(clipBase({ prompt: null })))
      .rejects.toThrow(/prompt salvo/);
  });
});
