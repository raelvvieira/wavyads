import type { UgcClip, UgcClipKind, UgcResolution, UgcSegment } from '../types/ugc';
import { buildAvatarClipPrompt, buildBrollClipPrompt } from './ugcPromptBuilder';

/**
 * Orquestração da geração de clipes.
 *
 * Mesma forma do `studioAssetActions` do Criativo Studio, e pelo mesmo
 * motivo: as dependências entram por parâmetro para que a regra possa ser
 * testada sem montar página nem tocar em Supabase.
 *
 * A invariante que essa forma protege é uma só, e ela vale mais que
 * qualquer outra coisa aqui: **uma geração é UMA linha**. A linha nasce
 * `generating` antes de o provedor ser chamado e a MESMA linha vira `ready`
 * ou `failed`. Criar uma segunda linha no retorno é como o usuário passa a
 * ver duas versões do mesmo pedido e perde a referência do que pediu.
 */

export interface UgcActionDeps {
  createClip: (input: {
    projectId: string;
    kind: UgcClipKind;
    segment?: UgcSegment | null;
    anglePreset?: string | null;
    speech?: string | null;
    durationSeconds: number;
    resolution: UgcResolution;
    audio?: boolean;
    status?: 'generating';
    prompt?: string | null;
    metadata?: Record<string, any>;
  }) => Promise<UgcClip>;
  updateClip: (id: string, patch: Partial<UgcClip>) => Promise<UgcClip>;
  invoke: (fn: string, body: unknown, timeoutMs: number) => Promise<{ data: any; error: any }>;
  extractErrorMessage: (e: unknown) => Promise<string>;
}

/** Vídeo leva minutos; a função de borda faz polling longo por dentro. */
const TIMEOUT_VIDEO_MS = 8 * 60 * 1000;

/**
 * Chama o provedor e fecha a linha, em qualquer desfecho.
 *
 * Nunca rejeita — devolve a linha `failed` com a mensagem real. Quem chama
 * decide o que mostrar, e um clipe que falhou continua no lugar dele com o
 * erro à vista, em vez de sumir da tela.
 */
async function rodarGeracao(
  deps: UgcActionDeps,
  linha: UgcClip,
  corpo: Record<string, unknown>,
): Promise<UgcClip> {
  try {
    const { data, error } = await deps.invoke('ugc-generate-video', corpo, TIMEOUT_VIDEO_MS);
    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    const url = data?.videoUrl;
    if (!url) throw new Error('O provedor não devolveu o vídeo.');

    return await deps.updateClip(linha.id, {
      status: 'ready',
      url,
      model: data?.model ?? null,
    });
  } catch (e) {
    return await deps.updateClip(linha.id, {
      status: 'failed',
      errorMessage: await deps.extractErrorMessage(e),
    });
  }
}

export function createUgcActions(deps: UgcActionDeps) {
  return {
    /** Um segmento do avatar falando. */
    async generateAvatarClip(input: {
      projectId: string;
      segment: UgcSegment;
      speech: string;
      durationSeconds: number;
      resolution: UgcResolution;
      /** Retrato do avatar travado no projeto: vira o primeiro quadro. */
      avatarImageUrl: string | null;
      productImageUrl?: string | null;
      multipleAngles?: boolean;
    }): Promise<UgcClip> {
      const prompt = buildAvatarClipPrompt({
        speech: input.speech,
        segment: input.segment,
        durationSeconds: input.durationSeconds,
        hasProductImage: !!input.productImageUrl,
      });

      const linha = await deps.createClip({
        projectId: input.projectId,
        kind: 'avatar',
        segment: input.segment,
        speech: input.speech,
        durationSeconds: input.durationSeconds,
        resolution: input.resolution,
        audio: true,
        status: 'generating',
        prompt,
        metadata: {
          avatarImageUrl: input.avatarImageUrl,
          productImageUrl: input.productImageUrl ?? null,
          multipleAngles: !!input.multipleAngles,
        },
      });

      return rodarGeracao(deps, linha, {
        prompt,
        imageUrl: input.avatarImageUrl,
        durationSeconds: input.durationSeconds,
        resolution: input.resolution,
        audio: true,
        aspectRatio: '9:16',
      });
    },

    /** Um clipe de produto. */
    async generateBrollClip(input: {
      projectId: string;
      angleId: string;
      durationSeconds: number;
      resolution: UgcResolution;
      audio: boolean;
      productImageUrl: string | null;
      productDescription?: string | null;
    }): Promise<UgcClip> {
      const prompt = buildBrollClipPrompt({
        angleId: input.angleId,
        durationSeconds: input.durationSeconds,
        productDescription: input.productDescription ?? null,
      });

      const linha = await deps.createClip({
        projectId: input.projectId,
        kind: 'broll',
        anglePreset: input.angleId,
        durationSeconds: input.durationSeconds,
        resolution: input.resolution,
        audio: input.audio,
        status: 'generating',
        prompt,
        metadata: { productImageUrl: input.productImageUrl ?? null },
      });

      return rodarGeracao(deps, linha, {
        prompt,
        imageUrl: input.productImageUrl,
        durationSeconds: input.durationSeconds,
        resolution: input.resolution,
        audio: input.audio,
        aspectRatio: '9:16',
      });
    },

    /**
     * Vários ângulos de B-roll de uma vez.
     *
     * Falha ISOLADA por clipe: um ângulo recusado não derruba os outros, e o
     * card dele fica `failed` com o erro real. `rodarGeracao` já não rejeita,
     * então o `Promise.all` aqui é seguro por construção.
     */
    async generateBrollBatch(input: {
      projectId: string;
      angleIds: string[];
      durationSeconds: number;
      resolution: UgcResolution;
      audio: boolean;
      productImageUrl: string | null;
      productDescription?: string | null;
      onClipDone?: (clip: UgcClip) => void;
    }): Promise<UgcClip[]> {
      const acoes = createUgcActions(deps);
      return Promise.all(input.angleIds.map(async (angleId) => {
        const pronto = await acoes.generateBrollClip({
          projectId: input.projectId,
          angleId,
          durationSeconds: input.durationSeconds,
          resolution: input.resolution,
          audio: input.audio,
          productImageUrl: input.productImageUrl,
          productDescription: input.productDescription,
        });
        input.onClipDone?.(pronto);
        return pronto;
      }));
    },

    async retry(clip: UgcClip): Promise<UgcClip> {
      if (!clip.prompt) throw new Error('Este clipe não tem prompt salvo — não dá para retentar.');
      const emAndamento = await deps.updateClip(clip.id, { status: 'generating', errorMessage: null });
      return rodarGeracao(deps, emAndamento, {
        prompt: clip.prompt,
        // O retry devolve exatamente os mesmos insumos: sem isto ele geraria
        // outra coisa com o mesmo texto.
        imageUrl: clip.metadata?.avatarImageUrl ?? clip.metadata?.productImageUrl ?? null,
        durationSeconds: clip.durationSeconds,
        resolution: clip.resolution,
        audio: clip.audio,
        aspectRatio: '9:16',
      });
    },
  };
}

export type UgcActions = ReturnType<typeof createUgcActions>;
