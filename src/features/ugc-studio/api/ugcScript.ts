import { supabase } from '@/integrations/supabase/client';
import { extractFunctionErrorMessage } from '@/lib/functionError';
import { UGC_SEGMENTS, type UgcScript } from '../types/ugc';

export interface WriteScriptInput {
  productDescription: string;
  clientName?: string | null;
  durationSeconds: number;
  language?: string;
}

export interface WriteScriptResult {
  script: UgcScript;
  wordBudget: number;
}

/**
 * Escreve os quatro segmentos do roteiro.
 *
 * Devolver um roteiro pela metade seria pior que falhar: a tela mostraria
 * dois segmentos preenchidos e dois vazios, e o usuário não teria como saber
 * se o modelo desistiu ou se ele mesmo esqueceu de algo. A função de borda
 * já confere, e esta camada confere de novo — o custo é um `filter`, e o
 * benefício é que nenhuma das duas pontas precisa confiar na outra.
 */
export async function writeUgcScript(input: WriteScriptInput): Promise<WriteScriptResult> {
  const { data, error } = await supabase.functions.invoke('ugc-script', {
    body: {
      productDescription: input.productDescription,
      clientName: input.clientName ?? null,
      durationSeconds: input.durationSeconds,
      language: input.language ?? 'pt-BR',
    },
    timeout: 90_000,
  } as any);

  if (error) throw new Error(await extractFunctionErrorMessage(error));
  if ((data as any)?.error) throw new Error((data as any).error);

  const roteiro = (data as any)?.script;
  const faltando = UGC_SEGMENTS.filter((s) => !String(roteiro?.[s] ?? '').trim());
  if (faltando.length) {
    throw new Error('O roteiro voltou incompleto. Tente de novo ou escreva os segmentos à mão.');
  }

  return { script: roteiro as UgcScript, wordBudget: Number((data as any)?.wordBudget) || 0 };
}
