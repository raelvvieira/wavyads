import type { CreativeAsset, CreativeAspectRatio, CreativeResolution } from '../types/creative';
import { IMAGE_GENERATION_MODEL, IMAGE_EDIT_MODEL } from './capabilities';
import {
  buildAvatarRequest,
  buildEditRequest,
  buildGenerationRequest,
  buildResizeRequest,
  buildRetryRequest,
} from './generationRequests';
import type { AvatarPersona } from '../types/avatarPersona';

/**
 * Orquestra gerar/editar/redimensionar/retentar contra as edge functions
 * reais, gravando o ciclo `generating` → `ready`/`failed` no banco.
 *
 * Todo acesso externo entra por dependência injetada — nenhum import de
 * Supabase aqui. É o que permite testar a orquestração inteira (a ordem das
 * chamadas, o que grava antes e depois, o que acontece quando o provedor
 * falha) sem rede e sem mock de módulo.
 */
export interface StudioAssetActionsDeps {
  ensureProjectId(): Promise<string>;
  clientId: string | null;
  invoke(name: string, body: unknown, timeoutMs: number): Promise<{ data: any; error: unknown }>;
  extractErrorMessage(error: unknown): Promise<string>;
  // `any` de propósito: aceita tanto `CreateCreativeAssetInput`/
  // `UpdateCreativeAssetInput` reais quanto os objetos soltos que os testes
  // usam para simular o banco, sem duplicar os dois tipos aqui.
  createAsset(input: any): Promise<CreativeAsset>;
  updateAsset(id: string, patch: any): Promise<CreativeAsset>;
  recordUsage(usageKey: string): void;
}

export interface GenerationOptions {
  resolution?: CreativeResolution;
  /** Default `IMAGE_GENERATION_MODEL.id` — parametrizável para a Fase 7. */
  modelId?: string;
  /** Texto final anexado via "Anexar copy" — renderizado verbatim. */
  copy?: string | null;
  logoImageUrl?: string | null;
  productImageUrls?: string[];
  /** Avatares anexados — entram como talento do anúncio. */
  avatarImageUrls?: string[];
}

export interface StudioAssetActions {
  generate(brief: string, aspectRatio: CreativeAspectRatio, options?: GenerationOptions): Promise<CreativeAsset>;
  /** Retrato de uma persona — vira asset `avatar`, reutilizável depois. */
  generateAvatar(persona: AvatarPersona, referenceImageUrls?: string[]): Promise<CreativeAsset>;
  retry(asset: CreativeAsset): Promise<CreativeAsset>;
  edit(asset: CreativeAsset, feedback: string): Promise<CreativeAsset>;
  resize(asset: CreativeAsset): Promise<CreativeAsset>;
}

/**
 * Fecha uma chamada de geração: grava a linha ANTES de chamar o provedor
 * (para o card aparecer "gerando" de verdade), chama, e grava o resultado
 * na MESMA linha — sucesso ou falha.
 *
 * A linha nascer antes da resposta é o que distingue isto de só inserir no
 * fim: uma falha a meio do caminho não desaparece muda, ela chega ao card.
 */
async function runGeneration(
  deps: StudioAssetActionsDeps,
  row: CreativeAsset,
  body: unknown,
): Promise<CreativeAsset> {
  try {
    const { data, error } = await deps.invoke('criativo-generate', body, 90_000);
    if (error) throw new Error(await deps.extractErrorMessage(error));
    const apiError = (data as any)?.error;
    if (apiError) throw new Error(apiError);
    const url = (data as any).imageUrl as string;
    deps.recordUsage(IMAGE_GENERATION_MODEL.usageKey);
    return await deps.updateAsset(row.id, { status: 'ready', url, thumbnailUrl: url });
  } catch (e: any) {
    return await deps.updateAsset(row.id, { status: 'failed', errorMessage: e?.message || 'Erro desconhecido' });
  }
}

export function createStudioAssetActions(deps: StudioAssetActionsDeps): StudioAssetActions {
  return {
    async generate(brief, aspectRatio, options = {}) {
      const { prompt, body } = buildGenerationRequest({
        brief,
        aspectRatio,
        resolution: options.resolution,
        modelId: options.modelId,
        copy: options.copy,
        logoImageUrl: options.logoImageUrl,
        productImageUrls: options.productImageUrls,
        avatarImageUrls: options.avatarImageUrls,
      });
      const projectId = await deps.ensureProjectId();
      const row = await deps.createAsset({
        projectId,
        clientId: deps.clientId,
        type: 'original',
        status: 'generating',
        aspectRatio,
        resolution: options.resolution ?? '2K',
        prompt,
        model: options.modelId ?? IMAGE_GENERATION_MODEL.id,
        // As URLs dos anexos não sobrevivem no PROMPT — ele só MENCIONA
        // logo/produto ("a brand logo is provided..."). Guardar aqui é o
        // que permite o retry devolver os mesmos anexos.
        metadata: {
          logoImage: options.logoImageUrl ?? null,
          productImages: options.productImageUrls ?? [],
          avatarImages: options.avatarImageUrls ?? [],
        },
      });
      return runGeneration(deps, row, body);
    },

    async generateAvatar(persona, referenceImageUrls = []) {
      const { prompt, body } = buildAvatarRequest({ persona, referenceImageUrls });
      const projectId = await deps.ensureProjectId();
      const row = await deps.createAsset({
        projectId,
        clientId: deps.clientId,
        type: 'avatar',
        status: 'generating',
        aspectRatio: '4:5',
        resolution: '2K',
        prompt,
        model: IMAGE_GENERATION_MODEL.id,
        filename: persona.name,
        // Os traços ficam guardados, não só o prompt: é o que permite
        // reabrir o customizador com o que foi escolhido e regerar a
        // persona depois, em vez de só olhar o retrato pronto.
        metadata: { persona, referenceImages: referenceImageUrls },
      });
      return runGeneration(deps, row, body);
    },

    async retry(asset) {
      // Mesma linha, não uma nova: a arte que falhou não deixou artefato
      // nenhum, então tentar de novo é completar o que já existe, não criar
      // outra pendência ao lado dela.
      const { body } = buildRetryRequest({
        prompt: asset.prompt,
        aspectRatio: asset.aspectRatio,
        logoImage: asset.metadata?.logoImage ?? null,
        productImages: asset.metadata?.productImages ?? [],
      });
      const retomada = await deps.updateAsset(asset.id, { status: 'generating', errorMessage: null });
      return runGeneration(deps, retomada, body);
    },

    async edit(asset, feedback) {
      if (!asset.url) throw new Error('Esta arte ainda não tem imagem para editar.');
      const ratio = (asset.aspectRatio as CreativeAspectRatio) || '4:5';
      const { body } = buildEditRequest({
        imageUrl: asset.url,
        feedback,
        originalPrompt: asset.prompt ?? '',
        aspectRatio: ratio,
      });
      const projectId = await deps.ensureProjectId();
      const row = await deps.createAsset({
        projectId,
        clientId: deps.clientId,
        type: 'edited',
        status: 'generating',
        parentAssetId: asset.id,
        aspectRatio: ratio,
        resolution: asset.resolution,
        prompt: asset.prompt,
        model: IMAGE_EDIT_MODEL.id,
        metadata: { feedback },
      });
      try {
        const { data, error } = await deps.invoke('criativo-edit-image', body, 90_000);
        if (error) throw new Error(await deps.extractErrorMessage(error));
        const apiError = (data as any)?.error;
        if (apiError) throw new Error(apiError);
        const url = (data as any).editedImageUrl as string;
        deps.recordUsage(IMAGE_EDIT_MODEL.usageKey);
        return await deps.updateAsset(row.id, { status: 'ready', url, thumbnailUrl: url });
      } catch (e: any) {
        return await deps.updateAsset(row.id, { status: 'failed', errorMessage: e?.message || 'Erro desconhecido' });
      }
    },

    async resize(asset) {
      if (!asset.prompt) throw new Error('Esta arte não tem prompt salvo para redimensionar.');
      if (asset.aspectRatio === '1:1') throw new Error('Esta arte já é 1:1.');
      const { prompt, body } = buildResizeRequest({ originalPrompt: asset.prompt });
      const projectId = await deps.ensureProjectId();
      const row = await deps.createAsset({
        projectId,
        clientId: deps.clientId,
        type: 'resize',
        status: 'generating',
        parentAssetId: asset.id,
        aspectRatio: '1:1',
        resolution: asset.resolution,
        prompt,
        model: IMAGE_GENERATION_MODEL.id,
      });
      return runGeneration(deps, row, body);
    },
  };
}
