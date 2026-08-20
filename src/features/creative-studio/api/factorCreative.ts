import { supabase } from '@/integrations/supabase/client';
import { extractFunctionErrorMessage } from '@/lib/functionError';
import type {
  FactorCreativeOutput,
  OfferIntelligence,
  OriginalDiagnosis,
  StrategicAngleId,
} from '../types/factorCreative';

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
  return data as AnalyzeOfferResult;
}

export interface GenerateFactorInput {
  originalPrompt: string;
  copy?: Record<string, unknown> | null;
  offerIntelligence: OfferIntelligence;
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
      offerIntelligence: input.offerIntelligence,
      brandVoice: input.brandVoice ?? { language: input.language ?? 'pt-BR' },
      mode: input.mode,
      selectedAngles: input.selectedAngles ?? [],
      aspect: input.aspect,
      aspectRatio: input.aspectRatio,
      safeZoneBlock: input.safeZoneBlock,
      language: input.language ?? 'pt-BR',
    },
    // Escreve 5 teses num modelo de raciocínio: é a chamada mais lenta do
    // fluxo e a que mais precisa de teto.
    timeout: 120_000,
  } as any);

  if (error) throw new Error(await extractFunctionErrorMessage(error));
  if ((data as any)?.error) throw new Error((data as any).error);

  const saida = data as FactorCreativeOutput;
  if (!Array.isArray(saida?.variations) || saida.variations.length !== 5) {
    throw new Error('O Fator Criativo não devolveu as 5 variações.');
  }
  return saida;
}
