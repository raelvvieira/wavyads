import { describe, expect, it, vi, beforeEach } from 'vitest';

const invoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...a: any[]) => invoke(...a) } },
}));

const { analyzeOffer, generateFactorVariations } = await import('./factorCreative');

const CINCO = Array.from({ length: 5 }, (_, i) => ({ slot: i + 1 }));

beforeEach(() => vi.clearAllMocks());

describe('analyzeOffer', () => {
  it('manda action "analyze" e devolve o briefing inferido', async () => {
    invoke.mockResolvedValue({
      data: {
        offerIntelligence: { productName: 'Película', proofs: [] },
        originalDiagnosis: { originalAngle: 'problem' },
      },
      error: null,
    });

    const r = await analyzeOffer({ originalPrompt: 'PROMPT', clientName: 'Caio Películas' });

    expect(invoke).toHaveBeenCalledWith('criativo-fator', expect.objectContaining({
      body: expect.objectContaining({ action: 'analyze', originalPrompt: 'PROMPT', clientName: 'Caio Películas' }),
    }));
    expect(r.offerIntelligence.productName).toBe('Película');
  });

  it('erro da função vira mensagem legível', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'non-2xx' } });
    await expect(analyzeOffer({ originalPrompt: 'x' })).rejects.toThrow();
  });
});

describe('generateFactorVariations', () => {
  const base = {
    originalPrompt: 'PROMPT',
    offerIntelligence: { productName: 'p' } as any,
    aspect: 'story' as const,
    aspectRatio: '4:5',
    safeZoneBlock: '[SAFE ZONE] ...',
  };

  it('manda action "generate" com o briefing revisado e o modo', async () => {
    invoke.mockResolvedValue({ data: { variations: CINCO }, error: null });

    await generateFactorVariations({ ...base, mode: 'strategic', selectedAngles: ['proof', 'ease'] as any });

    expect(invoke).toHaveBeenCalledWith('criativo-fator', expect.objectContaining({
      body: expect.objectContaining({
        action: 'generate', mode: 'strategic', selectedAngles: ['proof', 'ease'],
        safeZoneBlock: '[SAFE ZONE] ...',
      }),
    }));
  });

  it('recusa resposta que não tenha exatamente 5 variações', async () => {
    // Cinco slots é o contrato: quatro deixaria um card vazio no lote.
    invoke.mockResolvedValue({ data: { variations: CINCO.slice(0, 3) }, error: null });
    await expect(generateFactorVariations({ ...base, mode: 'automatic' }))
      .rejects.toThrow('5 variações');
  });

  it('propaga o erro de negócio devolvido no corpo', async () => {
    invoke.mockResolvedValue({ data: { error: 'Limite de uso da IA atingido.' }, error: null });
    await expect(generateFactorVariations({ ...base, mode: 'automatic' }))
      .rejects.toThrow('Limite de uso da IA atingido.');
  });
});
