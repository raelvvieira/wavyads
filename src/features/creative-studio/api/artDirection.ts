import { supabase } from '@/integrations/supabase/client';
import { extractFunctionErrorMessage } from '@/lib/functionError';
import { rolesArePartitionOf } from '../lib/copyRoles';
import type { PromptCopyBlocks } from '../lib/promptBuilder';

/** Versão do motor que este cliente sabe ler. Ver `ENGINE_VERSION` na função. */
const ENGINE_VERSION = 'art-direction-v1';

const MOTOR_DESATUALIZADO =
  'A função criativo-art-direction em produção está desatualizada — ela respondeu no formato antigo. '
  + 'É preciso reimplantar a edge function.';

export interface ArtDirection {
  mainSubject: string;
  composition: string;
  mood: string;
}

export interface ArtDirectionResult {
  artDirection: ArtDirection | null;
  /**
   * Já validado: só vem preenchido quando os papéis reproduzem a copy do
   * usuário palavra por palavra. Ver `copyRoles.ts`.
   */
  copyBlocks: PromptCopyBlocks | null;
}

export interface ArtDirectionInput {
  brief: string;
  copy?: string | null;
  clientName?: string | null;
  language?: string;
  aspectRatio?: string | null;
  designSystemDoc?: string | null;
  hasReferences?: boolean;
  hasProduct?: boolean;
  hasAvatar?: boolean;
  hasLogo?: boolean;
}

/**
 * O passo que faltava na geração normal.
 *
 * O Fator Criativo sempre teve uma direção visual escrita por um modelo de
 * raciocínio antes da imagem; a geração normal ia direto para o gerador com
 * o que o usuário tivesse digitado — às vezes nada. Comparando os dois
 * prompts do mesmo criativo, era essa a diferença que aparecia na arte.
 *
 * Devolve também a repartição da copy em papéis tipográficos, e ela passa
 * por `rolesArePartitionOf` antes de sair daqui: se o modelo tiver mexido
 * numa palavra, os papéis são descartados inteiros e quem chama segue pelo
 * caminho literal. A promessa "sem texto novo" é verificada, não confiada.
 */
export async function directArt(input: ArtDirectionInput): Promise<ArtDirectionResult> {
  const { data, error } = await supabase.functions.invoke('criativo-art-direction', {
    body: {
      brief: input.brief,
      copy: input.copy ?? null,
      clientName: input.clientName ?? null,
      language: input.language ?? 'pt-BR',
      aspectRatio: input.aspectRatio ?? null,
      designSystemDoc: input.designSystemDoc ?? null,
      hasReferences: !!input.hasReferences,
      hasProduct: !!input.hasProduct,
      hasAvatar: !!input.hasAvatar,
      hasLogo: !!input.hasLogo,
    },
  });

  if (error) throw new Error(await extractFunctionErrorMessage(error));
  if ((data as any)?.error) throw new Error((data as any).error);
  if ((data as any)?.engineVersion !== ENGINE_VERSION) throw new Error(MOTOR_DESATUALIZADO);

  const bruta = (data as any)?.visualDirection ?? {};
  const mainSubject = String(bruta.mainSubject ?? '').trim();
  const composition = String(bruta.composition ?? '').trim();
  const mood = String(bruta.mood ?? '').trim();

  const papeis = (data as any)?.copyRoles ?? null;
  const blocks: PromptCopyBlocks | null = papeis
    ? {
        label: papeis.label ?? undefined,
        titulo: papeis.title ?? undefined,
        subtitulo: papeis.subtitle ?? undefined,
        dados: papeis.data ?? undefined,
        cta: papeis.cta ?? undefined,
      }
    : null;

  const copyOriginal = (input.copy ?? '').trim();
  const papeisValem = !!blocks && !!copyOriginal && rolesArePartitionOf(blocks, copyOriginal);

  return {
    // Direção sem sujeito nem composição não acrescenta nada ao prompt — e
    // um bloco [ART DIRECTION] com uma linha só é ruído com cabeçalho.
    artDirection: mainSubject || composition ? { mainSubject, composition, mood } : null,
    copyBlocks: papeisValem ? blocks : null,
  };
}
