import { supabase } from '@/integrations/supabase/client';
import { extractFunctionErrorMessage } from '@/lib/functionError';

export interface CopyVariation {
  angulo: string;
  texto: string;
}

/**
 * 4 variações novas a partir de uma copy de referência — mesma edge
 * function que o "Criativo Rápido" (página antiga) já usa
 * (`criativo-suggest-copy`, ramo `referenceCopy`). A função é stateless
 * por chamada: não recebe `clientId`, só o texto de referência em si.
 */
export async function suggestCopyVariations(input: {
  referenceCopy: string;
  tema?: string | null;
  language?: string;
}): Promise<CopyVariation[]> {
  const { data, error } = await supabase.functions.invoke('criativo-suggest-copy', {
    body: { referenceCopy: input.referenceCopy, tema: input.tema, language: input.language },
  });
  if (error) throw new Error(await extractFunctionErrorMessage(error));
  if (data?.error) throw new Error(data.error);

  const suggestions = (data?.suggestions ?? []) as CopyVariation[];
  if (!suggestions.length) throw new Error('IA não retornou variações');
  return suggestions;
}
