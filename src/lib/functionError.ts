/**
 * Mensagem de erro de uma Edge Function.
 *
 * O supabase-js lança `FunctionsHttpError` com a mensagem genérica
 * "Edge Function returned a non-2xx status code" e guarda a resposta real
 * em `context`. Sem ler o corpo, toda falha do servidor — email já
 * cadastrado, permissão, validação — chega ao usuário como a mesma frase
 * inútil, e quem está no suporte não tem por onde começar.
 */
export interface FunctionErrorBody {
  message: string;
  /**
   * O código estruturado que a função devolveu, quando devolveu — por
   * exemplo `GOOGLE_TOKEN_INVALID`. É o que permite tratar "precisa
   * reconectar" de forma diferente de "deu ruim no meio do caminho".
   */
  code: string | null;
}

/**
 * Lê o corpo do erro de uma Edge Function: mensagem E código.
 *
 * Existe porque a mensagem sozinha não basta para decidir o que fazer. Duas
 * falhas com textos parecidos pedem reações opostas — uma quer retry, a
 * outra quer um botão de reconectar — e essa diferença só está no código.
 */
export async function readFunctionError(error: unknown): Promise<FunctionErrorBody> {
  const context = (error as { context?: unknown })?.context;

  if (context && typeof (context as Response).json === 'function') {
    try {
      const body = await (context as Response).json();
      const message = body?.error || body?.detail || body?.message;
      const code = typeof body?.code === 'string' ? body.code : null;
      if (typeof message === 'string' && message.trim()) return { message, code };
      if (code) return { message: (error as { message?: string })?.message || 'Erro desconhecido', code };
    } catch {
      // Corpo não é JSON válido — cai na mensagem genérica abaixo.
    }
  }

  const fallback = (error as { message?: string })?.message;
  return { message: fallback || 'Erro desconhecido', code: null };
}

export async function extractFunctionErrorMessage(error: unknown): Promise<string> {
  return (await readFunctionError(error)).message;
}
