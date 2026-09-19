import { describe, expect, it } from 'vitest';
import { extractFunctionErrorMessage, readFunctionError } from './functionError';

/** Imita o FunctionsHttpError do supabase-js: mensagem genérica + corpo real. */
function httpError(body: unknown, message = 'Edge Function returned a non-2xx status code') {
  return {
    message,
    context: { json: async () => body } as unknown as Response,
  };
}

describe('extractFunctionErrorMessage', () => {
  it('lê o motivo real do corpo em vez da mensagem genérica', async () => {
    // É este o caso que deixava o usuário sem informação nenhuma na tela.
    const erro = httpError({ error: 'Este usuário já tem acesso a este dashboard' });
    expect(await extractFunctionErrorMessage(erro)).toBe('Este usuário já tem acesso a este dashboard');
  });

  it('aceita as outras chaves que as functions usam', async () => {
    expect(await extractFunctionErrorMessage(httpError({ detail: 'detalhe' }))).toBe('detalhe');
    expect(await extractFunctionErrorMessage(httpError({ message: 'mensagem' }))).toBe('mensagem');
  });

  it('mantém a mensagem original quando o corpo não é JSON', async () => {
    const erro = {
      message: 'Failed to fetch',
      context: { json: async () => { throw new SyntaxError('não é JSON'); } } as unknown as Response,
    };
    expect(await extractFunctionErrorMessage(erro)).toBe('Failed to fetch');
  });

  it('ignora corpo sem motivo aproveitável', async () => {
    // `{ error: '' }` não é informação; cair para a genérica é melhor que
    // mostrar uma caixa de erro vazia.
    expect(await extractFunctionErrorMessage(httpError({ error: '   ' }, 'genérica'))).toBe('genérica');
    expect(await extractFunctionErrorMessage(httpError({ outra: 'coisa' }, 'genérica'))).toBe('genérica');
  });

  it('não quebra com erro sem context nem message', async () => {
    expect(await extractFunctionErrorMessage({})).toBe('Erro desconhecido');
    expect(await extractFunctionErrorMessage(null)).toBe('Erro desconhecido');
  });
});

describe('readFunctionError', () => {
  it('traz o código junto da mensagem', async () => {
    // A mensagem sozinha não decide nada: "reconecte a conta" e "deu ruim
    // no meio" pedem reações opostas, e a diferença só está no código.
    const erro = httpError({
      error: 'A autorização do Google Ads foi revogada. Reconecte a conta.',
      code: 'GOOGLE_TOKEN_INVALID',
    });
    expect(await readFunctionError(erro)).toEqual({
      message: 'A autorização do Google Ads foi revogada. Reconecte a conta.',
      code: 'GOOGLE_TOKEN_INVALID',
    });
  });

  it('código sem mensagem aproveitável ainda chega', async () => {
    const erro = httpError({ error: '  ', code: 'GOOGLE_TOKEN_INVALID' }, 'genérica');
    expect(await readFunctionError(erro)).toEqual({ message: 'genérica', code: 'GOOGLE_TOKEN_INVALID' });
  });

  it('sem código, devolve null — e não inventa um', async () => {
    expect(await readFunctionError(httpError({ error: 'qualquer coisa' }))).toEqual({
      message: 'qualquer coisa', code: null,
    });
    expect(await readFunctionError({})).toEqual({ message: 'Erro desconhecido', code: null });
  });
});
