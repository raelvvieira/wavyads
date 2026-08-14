/**
 * Mensagem de erro de uma Edge Function.
 *
 * O supabase-js lança `FunctionsHttpError` com a mensagem genérica
 * "Edge Function returned a non-2xx status code" e guarda a resposta real
 * em `context`. Sem ler o corpo, toda falha do servidor — email já
 * cadastrado, permissão, validação — chega ao usuário como a mesma frase
 * inútil, e quem está no suporte não tem por onde começar.
 */
export async function extractFunctionErrorMessage(error: unknown): Promise<string> {
  const context = (error as { context?: unknown })?.context;

  if (context && typeof (context as Response).json === 'function') {
    try {
      const body = await (context as Response).json();
      const message = body?.error || body?.detail || body?.message;
      if (typeof message === 'string' && message.trim()) return message;
    } catch {
      // Corpo não é JSON válido — cai na mensagem genérica abaixo.
    }
  }

  const fallback = (error as { message?: string })?.message;
  return fallback || 'Erro desconhecido';
}
