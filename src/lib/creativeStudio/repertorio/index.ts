import { containerPorId } from '@/lib/creativeGenome/catalog';
import { blocoDoPedidoDeEstilo, lerPedidoDeEstilo, resumoDoPedidoDeEstilo } from './temas';
import { lerOcasiao } from './ocasioes';
import { blocoDeQualidade, containersDoNicho, lerNicho, naoIncluirDoNicho } from './qualidade';

/**
 * O repertório: o que o Studio já sabe sobre um pedido antes de qualquer IA.
 *
 * Junta quatro leituras puras do texto e dos anexos:
 *
 * - **cor e tema** pedidos por escrito, que passam a vencer o documento de
 *   estilo ("inspirado no anexo, mas em verde");
 * - **ocasião** (evento, oferta, lançamento...), com o roteiro do que a peça
 *   precisa conter e de como usar as fotos anexadas;
 * - **nicho** (odontologia, estética, saúde), com as regras de qualidade e
 *   os limites que a Meta e o conselho profissional cobram;
 * - o **container** que serve a tudo isso, quando o pedido não nomeou um.
 *
 * Tudo vira texto plano, porque viaja dentro da leitura aprovada e fica
 * gravado com a arte.
 */

export interface ContextoDoRepertorio {
  brief: string;
  aspectRatio: string | null | undefined;
  pessoas: number;
  produtos: number;
  temReferencia: boolean;
  /** Texto extra para reconhecer o nicho: nome do cliente, estilo anexado. */
  contexto?: string | null;
}

export interface RepertorioDoPedido {
  /** Blocos prontos para o prompt, na ordem em que entram. */
  blocos: string[];
  /** Linhas a mais para o [DO NOT INCLUDE]. */
  naoIncluir: string[];
  /** O container que o repertório sugere, e por quê. */
  container: { id: string; motivo: string } | null;
  /** O que foi entendido, em português, para a proposta. */
  leu: string[];
  /** O que a peça pede e não veio. */
  faltas: string[];
}

/**
 * Um número estável a partir do texto.
 *
 * É o que faz dois pedidos diferentes do mesmo nicho saírem com layouts
 * diferentes — e o MESMO pedido sair sempre com o mesmo, que é o que
 * permite reler a proposta sem ela trocar de formato sozinha.
 */
function semente(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Dos containers candidatos, o que cabe: proporção certa e o que a peça
 * pede no quadro foi anexado. A rotação só acontece entre os que cabem.
 */
function escolherDaLista(
  ids: string[],
  ctx: ContextoDoRepertorio,
  girar: boolean,
): string | null {
  const ratio = (ctx.aspectRatio ?? '').trim();
  const cabem = ids
    .map((id) => containerPorId(id))
    .filter((c): c is NonNullable<typeof c> => !!c)
    .filter((c) => !ratio || c.proporcao === ratio)
    .filter((c) => (!c.tem_rosto || ctx.pessoas > 0) && (!c.tem_produto || ctx.produtos > 0));
  if (cabem.length === 0) return null;
  return girar ? cabem[semente(ctx.brief) % cabem.length].id : cabem[0].id;
}

export function montarRepertorio(ctx: ContextoDoRepertorio): RepertorioDoPedido {
  const pedido = lerPedidoDeEstilo(ctx.brief);
  const ocasiao = lerOcasiao(ctx.brief);
  const nicho = lerNicho(ctx.brief) ?? lerNicho(ctx.contexto);
  const daOcasiao = { brief: ctx.brief, pessoas: ctx.pessoas, produtos: ctx.produtos, temReferencia: ctx.temReferencia };

  const blocos: string[] = [];
  const leu: string[] = [];

  const blocoDoPedido = blocoDoPedidoDeEstilo(pedido);
  if (blocoDoPedido) {
    blocos.push(blocoDoPedido);
    leu.push(`o seu pedido de estilo — ${resumoDoPedidoDeEstilo(pedido)} — e ele manda nas cores`);
  }
  if (ocasiao) {
    blocos.push(`[CREATIVE PLAYBOOK — ${ocasiao.nome.toUpperCase()}]\n${ocasiao.roteiro(daOcasiao)}`);
    leu.push(`que é uma peça de ${ocasiao.nome}`);
  }
  blocos.push(blocoDeQualidade(nicho));
  if (nicho) leu.push(`as regras de ${nicho.nome}`);

  /*
   * O container: primeiro o da ocasião (o mais típico que couber), depois o
   * do nicho (girando, para dois pedidos parecidos não saírem iguais).
   */
  let container: RepertorioDoPedido['container'] = null;
  const comONicho = !!(ocasiao?.aceitaONicho && nicho);
  const daOcasiaoId = ocasiao
    ? escolherDaLista([...ocasiao.containers(daOcasiao), ...(comONicho ? containersDoNicho(nicho, ctx) : [])], ctx, comONicho)
    : null;
  if (daOcasiaoId) {
    container = { id: daOcasiaoId, motivo: `é o formato típico de ${ocasiao!.nome}` };
  } else {
    const doNichoId = escolherDaLista(containersDoNicho(nicho, ctx), ctx, true);
    if (doNichoId) container = { id: doNichoId, motivo: `é um dos layouts aprovados de ${nicho!.nome}` };
  }

  return {
    blocos,
    naoIncluir: naoIncluirDoNicho(nicho),
    container,
    leu,
    faltas: ocasiao?.faltas?.(daOcasiao) ?? [],
  };
}
