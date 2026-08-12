import { supabase } from '@/integrations/supabase/client';
import { createAssetGroup, createCreativeAsset, updateCreativeAsset } from './creativeAssets';
import { buildAssetFileName, extractFunctionErrorMessage, uploadDataUrlToAssetStorage } from './storage';
import { ASPECT_CONFIG } from '../constants/formats';
import {
  normalizeFactorAxis,
  type ArtworkAssetType,
  type BackendAspect,
  type CreativeAsset,
  type CreativeAspectRatio,
  type FactorAxis,
} from '../types/creative';

const DEFAULT_MODEL = 'gemini-3.1-flash-image-preview';
const GENERATION_TIMEOUT_MS = 90_000;

export function backendAspectOf(asset: Pick<CreativeAsset, 'aspectRatio'>): BackendAspect {
  const ratio = asset.aspectRatio as CreativeAspectRatio | null;
  if (ratio && ASPECT_CONFIG[ratio]) return ASPECT_CONFIG[ratio].backendAspect;
  return 'story';
}

/**
 * Toda derivação segue o mesmo ciclo: o asset é criado ANTES da imagem, com
 * status 'generating'. Assim o Canvas já mostra o card no lugar certo da
 * árvore enquanto a geração acontece, e um erro vira um card 'failed' com o
 * motivo — em vez de sumir e virar um toast que o usuário perde.
 */
async function runDerivation({
  projectId,
  parentAsset,
  type,
  fileBaseName,
  aspectRatio,
  prompt,
  factorAxis,
  groupId,
  metadata,
  invoke,
  onPlaceholder,
}: {
  projectId: string;
  parentAsset: CreativeAsset | null;
  type: ArtworkAssetType;
  fileBaseName: string;
  aspectRatio: string | null;
  prompt: string | null;
  factorAxis?: FactorAxis | null;
  groupId?: string | null;
  metadata?: Record<string, any>;
  invoke: () => Promise<string>;
  /** Chamado assim que o card 'generating' existe, para o Canvas já mostrá-lo. */
  onPlaceholder?: () => void;
}): Promise<CreativeAsset> {
  const placeholder = await createCreativeAsset({
    projectId,
    type,
    status: 'generating',
    parentAssetId: parentAsset?.id ?? null,
    groupId: groupId ?? null,
    factorAxis: factorAxis ?? null,
    aspectRatio,
    resolution: parentAsset?.resolution ?? null,
    prompt,
    model: parentAsset?.model ?? DEFAULT_MODEL,
    clientId: parentAsset?.clientId ?? null,
    metadata: metadata ?? {},
  });
  onPlaceholder?.();

  try {
    const rawUrl = await invoke();
    const { url } = await uploadDataUrlToAssetStorage({
      dataUrl: rawUrl,
      path: `${projectId}/${type}/${buildAssetFileName(fileBaseName)}`,
    });
    return await updateCreativeAsset(placeholder.id, { url, thumbnailUrl: url, status: 'ready' });
  } catch (error: any) {
    const message = error?.message || 'Falha na geração';
    // Best-effort: se nem marcar como falha der certo, o erro original é o que
    // importa para quem chamou.
    try {
      await updateCreativeAsset(placeholder.id, { status: 'failed', errorMessage: message });
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
}

async function invokeImageFunction(
  name: string,
  body: Record<string, any>,
  resultKey: 'imageUrl' | 'editedImageUrl',
): Promise<string> {
  const { data, error } = await supabase.functions.invoke(name, { body, timeout: GENERATION_TIMEOUT_MS });
  if (error) throw new Error(await extractFunctionErrorMessage(error));
  if ((data as any)?.error) throw new Error((data as any).error);
  const url = (data as any)?.[resultKey];
  if (!url) throw new Error('A geração não devolveu imagem');
  return url as string;
}

/** Editar cria uma arte filha — a original nunca é sobrescrita. */
export async function editAsset({
  asset,
  feedback,
  language = 'pt-BR',
  onPlaceholder,
}: {
  asset: CreativeAsset;
  feedback: string;
  language?: string;
  onPlaceholder?: () => void;
}): Promise<CreativeAsset> {
  if (!asset.projectId) throw new Error('Arte sem projeto associado');
  if (!asset.url) throw new Error('Arte ainda não tem imagem para editar');

  const aspect = backendAspectOf(asset);
  return runDerivation({
    projectId: asset.projectId,
    parentAsset: asset,
    type: 'edited',
    fileBaseName: `criativo-edit-${asset.id.slice(0, 8)}`,
    aspectRatio: asset.aspectRatio,
    prompt: asset.prompt,
    metadata: { feedback, source_asset_id: asset.id },
    onPlaceholder,
    // A edge function aceita URL http(s) direto, então a signed URL do asset
    // serve como entrada sem precisar converter para base64 no navegador.
    invoke: () => invokeImageFunction(
      'criativo-edit-image',
      { originalImage: asset.url, userFeedback: feedback, originalPrompt: asset.prompt || '', aspect, language },
      'editedImageUrl',
    ),
  });
}

/** Versão 1080x1080 a partir de uma arte existente. */
export async function resizeAssetToSquare({
  asset,
  onPlaceholder,
}: {
  asset: CreativeAsset;
  onPlaceholder?: () => void;
}): Promise<CreativeAsset> {
  if (!asset.projectId) throw new Error('Arte sem projeto associado');
  if (!asset.prompt) throw new Error('Arte sem prompt registrado — não dá para recriar em 1:1');

  return runDerivation({
    projectId: asset.projectId,
    parentAsset: asset,
    type: 'resize',
    fileBaseName: `criativo-square-${asset.id.slice(0, 8)}`,
    aspectRatio: '1:1',
    prompt: asset.prompt,
    factorAxis: asset.factorAxis,
    metadata: { source_asset_id: asset.id, square: true },
    onPlaceholder,
    invoke: () => invokeImageFunction(
      'criativo-generate',
      {
        prompt: asset.prompt,
        aspectRatio: 'square',
        model: asset.model || DEFAULT_MODEL,
        isVariation: asset.type === 'factor',
        storyReference: asset.url,
      },
      'imageUrl',
    ),
  });
}

export interface FactorVariationPayload {
  eixo: string;
  nome: string;
  estrategia?: { mudanca: string; paraQuem: string };
  copy?: Record<string, any>;
  descricaoVisual?: Record<string, any>;
  promptCompleto: string;
}

export interface ApplyFactorResult {
  groupId: string | null;
  assets: CreativeAsset[];
  failures: { eixo: string; message: string }[];
}

/**
 * Gera as 5 variações estratégicas a partir de uma arte. Cada variação é um
 * asset independente ligado ao pai e ao grupo, então uma falha isolada não
 * derruba as outras — dá para regerar só aquela depois.
 */
export async function applyCreativeFactor({
  asset,
  language = 'pt-BR',
  businessContext = '',
  onPlaceholder,
}: {
  asset: CreativeAsset;
  language?: string;
  businessContext?: string;
  onPlaceholder?: () => void;
}): Promise<ApplyFactorResult> {
  if (!asset.projectId) throw new Error('Arte sem projeto associado');
  const projectId = asset.projectId;
  const aspect = backendAspectOf(asset);

  const { data, error } = await supabase.functions.invoke('criativo-fator', {
    body: {
      originalPrompt: asset.prompt || '',
      copy: asset.metadata?.copy ?? null,
      businessContext,
      language,
      aspect,
    },
    timeout: GENERATION_TIMEOUT_MS,
  });
  if (error) throw new Error(await extractFunctionErrorMessage(error));
  if ((data as any)?.error) throw new Error((data as any).error);

  const variations = ((data as any)?.variations ?? []) as FactorVariationPayload[];
  if (variations.length === 0) throw new Error('O Fator Criativo não devolveu variações');

  // O grupo dá título e origem à seção no Canvas. Se falhar, as variações ainda
  // nascem ligadas ao pai — perder o agrupamento não justifica abortar tudo.
  let groupId: string | null = null;
  try {
    const group = await createAssetGroup({
      projectId,
      type: 'factor',
      parentAssetId: asset.id,
      title: 'Fator Criativo',
      metadata: { aspect, axes: variations.map((v) => v.eixo) },
    });
    groupId = group.id;
  } catch {
    groupId = null;
  }

  const failures: ApplyFactorResult['failures'] = [];
  const results = await Promise.all(
    variations.map(async (variation, index) => {
      try {
        return await runDerivation({
          projectId,
          parentAsset: asset,
          type: 'factor',
          groupId,
          factorAxis: normalizeFactorAxis(variation.eixo),
          fileBaseName: `criativo-fator-${index + 1}-${variation.eixo || 'variacao'}`,
          aspectRatio: asset.aspectRatio,
          prompt: variation.promptCompleto,
          metadata: {
            eixo: variation.eixo,
            nome: variation.nome,
            variation_index: index,
            copy: variation.copy,
            descricaoVisual: variation.descricaoVisual,
            estrategia: variation.estrategia,
          },
          onPlaceholder,
          invoke: () => invokeImageFunction(
            'criativo-generate',
            {
              prompt: variation.promptCompleto,
              aspectRatio: aspect,
              model: asset.model || DEFAULT_MODEL,
              isVariation: true,
              storyReference: aspect === 'square' ? asset.url : null,
            },
            'imageUrl',
          ),
        });
      } catch (e: any) {
        failures.push({ eixo: variation.eixo, message: e?.message || 'Erro' });
        return null;
      }
    }),
  );

  return { groupId, assets: results.filter(Boolean) as CreativeAsset[], failures };
}
