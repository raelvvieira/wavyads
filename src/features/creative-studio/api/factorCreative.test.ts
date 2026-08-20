import { describe, expect, it, vi, beforeEach } from 'vitest';

const invoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...a: any[]) => invoke(...a) } },
}));

const { analyzeOffer, generateFactorVariations } = await import('./factorCreative');

// Toda resposta de sucesso carrega o carimbo do motor E `strategy` em cada
// variação — é o que distingue a V2 da função antiga, que devolve 200 com
// cinco variações no formato dela.
const CINCO = Array.from({ length: 5 }, (_, i) => ({ slot: i + 1, strategy: { angle: 'problem' } }));
const OK = { engineVersion: 'factor-v2', variations: CINCO };

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
    invoke.mockResolvedValue({ data: OK, error: null });

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
    invoke.mockResolvedValue({ data: { ...OK, variations: CINCO.slice(0, 3) }, error: null });
    await expect(generateFactorVariations({ ...base, mode: 'automatic' }))
      .rejects.toThrow('5 variações');
  });

  it('propaga o erro de negócio devolvido no corpo', async () => {
    invoke.mockResolvedValue({ data: { error: 'Limite de uso da IA atingido.' }, error: null });
    await expect(generateFactorVariations({ ...base, mode: 'automatic' }))
      .rejects.toThrow('Limite de uso da IA atingido.');
  });

  it('recusa a resposta da função ANTIGA em vez de quebrar lá na frente', async () => {
    // A V1 aceita este mesmo corpo (ela só exige `originalPrompt` e
    // `aspect`, que vão aí), responde 200 e devolve cinco variações sem
    // `strategy`. Sem o handshake, o erro só aparecia na gravação, como
    // "Cannot read properties of undefined (reading 'angle')" — dois minutos
    // depois e ilegível.
    invoke.mockResolvedValue({
      data: { variations: Array.from({ length: 5 }, (_, i) => ({ slot: i + 1, axis: 'emotional' })) },
      error: null,
    });
    await expect(generateFactorVariations({ ...base, mode: 'automatic' }))
      .rejects.toThrow(/desatualizada/);
  });

  it('sem briefing, manda offerIntelligence nulo — a função deduz a oferta', async () => {
    // É o caminho de um clique: o usuário não preenche nada.
    invoke.mockResolvedValue({ data: OK, error: null });
    await generateFactorVariations({ ...base, offerIntelligence: null, mode: 'automatic' });

    expect(invoke).toHaveBeenCalledWith('criativo-fator', expect.objectContaining({
      body: expect.objectContaining({ action: 'generate', offerIntelligence: null }),
    }));
  });
});

describe('analyzeOffer — resposta parcial', () => {
  it('briefing incompleto é normalizado, não vaza para a tela', async () => {
    // Sem isto, um briefing sem `offerDescription` quebrava o render em
    // `briefing.offerDescription.trim()` — e como não há ErrorBoundary
    // global, o resultado era tela branca, não um campo vazio.
    invoke.mockResolvedValue({ data: { offerIntelligence: { proofs: [] } }, error: null });

    const r = await analyzeOffer({ originalPrompt: 'x' });
    expect(r.offerIntelligence.offerDescription).toBe('');
    expect(r.offerIntelligence.audience).toEqual([]);
  });
});
