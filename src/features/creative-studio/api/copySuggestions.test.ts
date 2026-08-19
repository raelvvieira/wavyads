import { describe, expect, it, vi, beforeEach } from 'vitest';

const invoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...a: any[]) => invoke(...a) } },
}));

const { suggestCopyVariations } = await import('./copySuggestions');

beforeEach(() => vi.clearAllMocks());

describe('suggestCopyVariations', () => {
  it('chama a edge function com o texto de referência e devolve as variações', async () => {
    invoke.mockResolvedValue({
      data: { suggestions: [{ angulo: 'Direto/Benefício', texto: 'Aproveite o desconto agora' }] },
      error: null,
    });

    const r = await suggestCopyVariations({ referenceCopy: 'Até 50% OFF', tema: 'promoção', language: 'pt-BR' });

    expect(invoke).toHaveBeenCalledWith('criativo-suggest-copy', {
      body: { referenceCopy: 'Até 50% OFF', tema: 'promoção', language: 'pt-BR' },
    });
    expect(r).toEqual([{ angulo: 'Direto/Benefício', texto: 'Aproveite o desconto agora' }]);
  });

  it('sem variações, lança erro', async () => {
    invoke.mockResolvedValue({ data: { suggestions: [] }, error: null });
    await expect(suggestCopyVariations({ referenceCopy: 'x' })).rejects.toThrow('IA não retornou variações');
  });

  it('erro da função vira mensagem legível', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'Edge Function returned a non-2xx status code' } });
    await expect(suggestCopyVariations({ referenceCopy: 'x' })).rejects.toThrow();
  });
});
