import { supabase } from '@/integrations/supabase/client';
import { extractFunctionErrorMessage } from '@/lib/functionError';

export interface ReferenceAnalysis {
  /** Documento técnico em inglês — camadas, opacidade, hex, tipografia. */
  designSystemDoc: string;
  /** Regras "NEVER ..." específicas do estilo lido. */
  antiPadroes: string[];
  mood: { adjetivos: string[]; referencias: string[]; evita: string[] } | null;
}

/**
 * O sistema visual que o V2 tinha e não usava.
 *
 * `criativo-analyze-refs` já existia e já era chamada pelo Studio V1: lê as
 * imagens de referência e escreve um documento técnico com camadas,
 * opacidade, blur, hex, tipografia e posição — exatamente o que o modelo de
 * imagem precisa ler para reproduzir um DNA visual. O V2 aceitava anexar
 * referência e nunca chamava a função, então o bloco `[DESIGN SYSTEM]` do
 * prompt saía vazio em toda arte gerada.
 *
 * O cache existe porque a análise é cara e o conjunto de referências muda
 * pouco: o usuário costuma anexar as mesmas imagens em várias gerações
 * seguidas, e cobrar uma leitura de IA a cada clique seria pagar de novo
 * pela mesma resposta.
 */
const cache = new Map<string, ReferenceAnalysis>();

/** A identidade do conjunto, não da ordem em que foi anexado. */
function chave(urls: string[]): string {
  return [...urls].sort().join('|');
}

export async function analyzeReferences(urls: string[]): Promise<ReferenceAnalysis | null> {
  const limpas = urls.filter(Boolean);
  if (limpas.length === 0) return null;

  const k = chave(limpas);
  const guardado = cache.get(k);
  if (guardado) return guardado;

  const { data, error } = await supabase.functions.invoke('criativo-analyze-refs', {
    body: { images: limpas },
  });

  if (error) throw new Error(await extractFunctionErrorMessage(error));
  if ((data as any)?.error) throw new Error((data as any).error);

  const bruta = data as any;
  const analise: ReferenceAnalysis = {
    designSystemDoc: String(bruta?.designSystemDoc ?? '').trim(),
    antiPadroes: Array.isArray(bruta?.antiPadroes) ? bruta.antiPadroes.filter(Boolean) : [],
    mood: bruta?.mood
      ? {
          adjetivos: Array.isArray(bruta.mood.adjetivos) ? bruta.mood.adjetivos.filter(Boolean) : [],
          referencias: Array.isArray(bruta.mood.referencias) ? bruta.mood.referencias.filter(Boolean) : [],
          evita: Array.isArray(bruta.mood.evita) ? bruta.mood.evita.filter(Boolean) : [],
        }
      : null,
  };

  // Uma análise sem documento não vale um lugar no cache: se a próxima
  // tentativa puder dar certo, guardar o vazio impediria a segunda chance.
  if (analise.designSystemDoc) cache.set(k, analise);
  return analise;
}

/** Só para os testes — o cache é de módulo e sobreviveria entre eles. */
export function __limparCacheDeAnalise() {
  cache.clear();
}
