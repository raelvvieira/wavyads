/**
 * Em que estado o card de criativos deve aparecer.
 *
 * Existe como função pura porque a regra é pequena e o custo de errá-la é
 * alto: o card ficou sumido para o cliente sem ninguém saber por quê. A
 * causa era um `: null` no fim de um ternário — erro da consulta, consulta
 * desabilitada e lista vazia produziam exatamente a mesma tela: nada.
 *
 * Três coisas diferentes pedem três respostas diferentes:
 *
 * - Ainda carregando → esqueleto. O cliente vê que algo vem vindo.
 * - Falhou → mensagem com o motivo. Um erro que não aparece é um erro que
 *   ninguém conserta; foi assim que este ficou meses invisível.
 * - Vazio → o card, dizendo que não há criativos no período. "Não há" e
 *   "não carregou" são coisas distintas, e o cliente precisa saber qual.
 *
 * O token inválido do Meta é a única exceção: ele já tem um aviso próprio
 * no topo da tela, com o botão de reconectar. Repetir aqui daria dois
 * alarmes para o mesmo problema.
 */

export type CreativesCardState =
  | { kind: 'carregando' }
  | { kind: 'erro'; mensagem: string }
  | { kind: 'lista' }
  /** O aviso de reconectar já está no topo; aqui o card se cala. */
  | { kind: 'oculto' };

export interface CreativesCardInput {
  carregando: boolean;
  erro: unknown;
  /** `undefined` quando a consulta nem chegou a resolver. */
  anuncios: unknown[] | undefined;
  /** O banner de reconexão já está na tela. */
  tokenInvalido: boolean;
}

export function creativesCardState(input: CreativesCardInput): CreativesCardState {
  if (input.tokenInvalido) return { kind: 'oculto' };
  if (input.carregando) return { kind: 'carregando' };

  if (input.erro) {
    const mensagem = (input.erro as any)?.message;
    return {
      kind: 'erro',
      // Sem mensagem legível ainda é melhor dizer que falhou do que não
      // dizer nada — o silêncio é justamente o que precisamos eliminar.
      mensagem: typeof mensagem === 'string' && mensagem.trim()
        ? mensagem
        : 'Não foi possível carregar os criativos.',
    };
  }

  // Lista vazia também rende card: a galeria tem estado próprio de "nenhum
  // criativo encontrado", e mostrá-lo é o que distingue "não há" de "não
  // carregou".
  return { kind: 'lista' };
}
