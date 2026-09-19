import { describe, expect, it, vi, beforeEach } from 'vitest';

const invoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...a: any[]) => invoke(...a) } },
}));

const { fetchGoogleInsights, googleQueryOptions } = await import('./useGoogleAdsInsights');

/** Imita o FunctionsHttpError do supabase-js: mensagem genérica + corpo real. */
const GENERICA = 'Edge Function returned a non-2xx status code';
function respostaDeErro(body: unknown) {
  return {
    data: null,
    error: { message: GENERICA, context: { json: async () => body } as unknown as Response },
  };
}

beforeEach(() => vi.clearAllMocks());

describe('fetchGoogleInsights', () => {
  it('mostra o motivo real, e NUNCA a frase genérica do supabase-js', async () => {
    // O relato que originou isto: o dashboard dizia "Não consegui carregar
    // os dados do Google Ads — Edge Function returned a non-2xx status
    // code", e ninguém tinha como saber o que havia acontecido.
    //
    // A causa era a ordem: `if (error) throw error` vinha ANTES de olhar
    // `data.error`. Como a edge function devolve todos os seus erros com
    // status HTTP, o supabase-js sempre preenchia `error` com a frase fixa,
    // e a explicação real — que chegava no corpo — era descartada.
    invoke.mockResolvedValue(respostaDeErro({
      error: 'Cliente não sincronizado com Google Ads',
    }));

    await expect(fetchGoogleInsights('campaigns', 'c1', { since: '2026-09-01', until: '2026-09-19' }))
      .rejects.toThrow('Cliente não sincronizado com Google Ads');

    await expect(fetchGoogleInsights('campaigns', 'c1', { since: '2026-09-01', until: '2026-09-19' }))
      .rejects.not.toThrow(GENERICA);
  });

  it('token revogado ganha nome próprio — é a única falha que pede reconectar', async () => {
    invoke.mockResolvedValue(respostaDeErro({
      error: 'A autorização do Google Ads foi revogada. Reconecte a conta.',
      code: 'GOOGLE_TOKEN_INVALID',
    }));

    await expect(fetchGoogleInsights('insights', 'c1', { since: '2026-09-01', until: '2026-09-19' }))
      .rejects.toMatchObject({
        name: 'GoogleTokenInvalid',
        message: 'A autorização do Google Ads foi revogada. Reconecte a conta.',
      });
  });

  it('erro sem código continua sendo um erro comum, e não um pedido de reconexão', async () => {
    // Nem toda falha é token morto. Marcar tudo como "reconecte" mandaria o
    // usuário refazer o OAuth por causa de uma instabilidade passageira.
    invoke.mockResolvedValue(respostaDeErro({ error: 'Formato de data inválido' }));

    await expect(fetchGoogleInsights('insights', 'c1', { since: 'x', until: 'y' }))
      .rejects.toMatchObject({ name: 'Error', message: 'Formato de data inválido' });
  });

  it('também lê o erro quando ele vem num 200 com corpo de erro', async () => {
    // É assim que as ações de OAuth respondem. Cobrir os dois formatos evita
    // depender do status HTTP para achar a mensagem.
    invoke.mockResolvedValue({ data: { error: 'Sem acesso a este cliente' }, error: null });

    await expect(fetchGoogleInsights('campaigns', 'c1', { since: '2026-09-01', until: '2026-09-19' }))
      .rejects.toThrow('Sem acesso a este cliente');
  });

  it('sucesso devolve os dados intactos', async () => {
    invoke.mockResolvedValue({ data: { campaigns: [{ id: '1' }] }, error: null });
    const data = await fetchGoogleInsights('campaigns', 'c1', { since: '2026-09-01', until: '2026-09-19' });
    expect(data).toEqual({ campaigns: [{ id: '1' }] });
  });
});

describe('googleQueryOptions', () => {
  it('não repete a chamada contra um token revogado', () => {
    // Repetir é repetir o mesmo erro três vezes e fazer o usuário esperar
    // por isso. Nada vai mudar até alguém reconectar.
    const err = Object.assign(new Error('revogada'), { name: 'GoogleTokenInvalid' });
    expect(googleQueryOptions.retry(0, err)).toBe(false);
  });

  it('erro comum ainda ganha uma segunda chance', () => {
    const err = new Error('instabilidade');
    expect(googleQueryOptions.retry(0, err)).toBe(true);
    expect(googleQueryOptions.retry(1, err)).toBe(false);
  });
});
