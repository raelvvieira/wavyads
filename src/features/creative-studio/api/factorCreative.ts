import { supabase } from '@/integrations/supabase/client';
import { extractFunctionErrorMessage } from '@/lib/functionError';
import {
  emptyOfferIntelligence,
  type FactorCreativeOutput,
  type OfferIntelligence,
  type OriginalDiagnosis,
  type StrategicAngleId,
} from '../types/factorCreative';

/** Versão do motor que este cliente sabe ler. Ver `ENGINE_VERSION` na função. */
const ENGINE_VERSION = 'factor-v2';

const MOTOR_DESATUALIZADO =
  'A função criativo-fator em produção está desatualizada — ela respondeu no formato antigo. '
  + 'É preciso reimplantar a edge function para o Fator Criativo funcionar.';

/**
 * Fator Criativo V2 — os dois estágios.
 *
 * `analyzeOffer` lê o criativo aprovado e devolve o briefing INFERIDO, que
 * o usuário revisa antes de gerar. `generateFactorVariations` recebe o
 * briefing já revisado e devolve as 5 variações.
 *
 * A separação existe porque a spec proíbe inventar prova: a IA propõe o
 * que dá para inferir com honestidade, e o que é fato verificável só entra
 * se uma pessoa colocar.
 */

export interface AnalyzeOfferInput {
  originalPrompt: string;
  copy?: Record<string, unknown> | null;
  businessContext?: string | null;
  clientName?: string | null;
  language?: string;
}

export interface AnalyzeOfferResult {
  offerIntelligence: OfferIntelligence;
  originalDiagnosis: OriginalDiagnosis | null;
}

export async function analyzeOffer(input: AnalyzeOfferInput): Promise<AnalyzeOfferResult> {
  const { data, error } = await supabase.functions.invoke('criativo-fator', {
    body: {
      action: 'analyze',
      originalPrompt: input.originalPrompt,
      copy: input.copy ?? null,
      businessContext: input.businessContext ?? null,
      clientName: input.clientName ?? null,
      language: input.language ?? 'pt-BR',
    },
    // Leitura, não raciocínio longo — mas ainda é uma chamada de modelo.
    timeout: 60_000,
  } as any);

  if (error) throw new Error(await extractFunctionErrorMessage(error));
  if ((data as any)?.error) throw new Error((data as any).error);

  // Normalizar, não confiar. Um briefing parcial (o modelo omitindo listas)
  // passava direto para o formulário e quebrava no render em
  // `briefing.offerDescription.trim()` — e sem ErrorBoundary global isso é
  // tela branca, não um campo vazio.
  const bruto = (data as any)?.offerIntelligence;
  return {
    offerIntelligence: { ...emptyOfferIntelligence(), ...(bruto && typeof bruto === 'object' ? bruto : {}) },
    originalDiagnosis: (data as any)?.originalDiagnosis ?? null,
  };
}

export interface GenerateFactorInput {
  originalPrompt: string;
  copy?: Record<string, unknown> | null;
  /** Ausente no caminho rápido: a própria função deduz a oferta da arte. */
  offerIntelligence?: OfferIntelligence | null;
  brandVoice?: { language: string; tone?: string[]; forbiddenExpressions?: string[] } | null;
  mode: 'automatic' | 'strategic';
  selectedAngles?: StrategicAngleId[];
  aspect: 'story' | 'square';
  aspectRatio: string;
  safeZoneBlock: string;
  language?: string;
}

export async function generateFactorVariations(
  input: GenerateFactorInput,
): Promise<FactorCreativeOutput> {
  const { data, error } = await supabase.functions.invoke('criativo-fator', {
    body: {
      action: 'generate',
      originalPrompt: input.originalPrompt,
      copy: input.copy ?? null,
      offerIntelligence: input.offerIntelligence ?? null,
      brandVoice: input.brandVoice ?? { language: input.language ?? 'pt-BR' },
      mode: input.mode,
      selectedAngles: input.selectedAngles ?? [],
      aspect: input.aspect,
      aspectRatio: input.aspectRatio,
      safeZoneBlock: input.safeZoneBlock,
      language: input.language ?? 'pt-BR',
    },
    // Margem, não plano: com o schema enxuto a chamada fica na casa dos
    // segundos, mas um modelo de raciocínio tem cauda longa e estourar o
    // teto joga fora tudo que ele já escreveu.
    timeout: 180_000,
  } as any);

  if (error) throw new Error(await extractFunctionErrorMessage(error));
  if ((data as any)?.error) throw new Error((data as any).error);

  const saida = data as FactorCreativeOutput;
  if (!Array.isArray(saida?.variations) || saida.variations.length !== 5) {
    throw new Error('O Fator Criativo não devolveu as 5 variações.');
  }

  // Handshake de versão. A função V1 aceita este mesmo corpo (ela só exige
  // `originalPrompt` e `aspect`, que vão aí), responde 200 e devolve cinco
  // variações no formato dela — sem `strategy`. Sem esta checagem o erro só
  // aparecia lá adiante, como `Cannot read properties of undefined`.
  if ((saida as any).engineVersion !== ENGINE_VERSION || !saida.variations[0]?.strategy) {
    throw new Error(MOTOR_DESATUALIZADO);
  }
  return saida;
}
