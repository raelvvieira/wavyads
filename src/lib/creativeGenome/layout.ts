import type { CreativeContainer } from './types';

/**
 * Descrever a estrutura da peça em PROSA, não em JSON.
 *
 * O bloco [TEMPLATE STRUCTURE] serializava o layout com `JSON.stringify`.
 * Isso passa despercebido com `{"grid":"12col"}` — e vira um parágrafo de
 * chaves e aspas quando o layout é um container real, de 400 a 1448
 * caracteres de descrição mais blocos e regras.
 *
 * Dois problemas, e o segundo é concreto:
 *
 * O prompt já tem quinze blocos disputando atenção, e decodificar sintaxe
 * custa parte dela — exatamente a parte que deveria ir para a composição.
 *
 * E este modelo RENDERIZA texto solto que encontra no prompt. O bloco
 * [DO NOT INCLUDE] traz `garbled or fake-looking text` justamente porque
 * isso acontece. Um `{"grid":"12col"}` é candidato a aparecer desenhado na
 * arte.
 *
 * A retrocompatibilidade não é zelo: o caminho V1 passa `layout_structure`
 * cru da tabela e tem snapshot travado com aquele `{"grid":"12col"}`.
 * Qualquer coisa que esta função não reconheça volta ao `JSON.stringify`,
 * e a V1 sai byte-idêntica.
 */

/** Quantos itens de `blocos` e `fixo` entram. */
const TETO_DE_ITENS = 8;

/**
 * Orçamento de caracteres do bloco inteiro.
 *
 * Medido no catálogo real: a mediana é 1035 caracteres e só 3 dos 53
 * passam de 2000 — mas um chega a 4404, porque tem oito regras de `fixo` com
 * um parágrafo cada. Esse sozinho dobraria um prompt que hoje tem cerca de
 * 4000 caracteres e quinze blocos disputando atenção, e a conta a pagar
 * seria no fim, onde moram as proibições.
 *
 * O corte respeita a hierarquia: a descrição do layout nunca é cortada (é a
 * peça), os elementos vêm em seguida, e as regras de `fixo` entram enquanto
 * couberem. Cada regra entra INTEIRA ou não entra — truncar "exatamente
 * dois adesivos, um de conteúdo e um de ação" ao meio produziria uma
 * instrução que diz outra coisa.
 */
const TETO_DE_CHARS = 2200;

/** Os itens que cabem no que sobrou, cada um inteiro. */
function cabemEm(itens: string[], orcamento: number): string[] {
  const dentro: string[] = [];
  let usado = 0;
  for (const item of itens) {
    const custo = item.length + 3; // "- " e a quebra de linha
    if (usado + custo > orcamento) break;
    dentro.push(item);
    usado += custo;
  }
  return dentro;
}

function pareceContainer(v: unknown): v is CreativeContainer {
  return !!v && typeof v === 'object' && typeof (v as any).descricao_layout === 'string';
}

export function describeLayoutStructure(layout: unknown): string {
  if (typeof layout === 'string') return layout.trim();

  if (Array.isArray(layout)) {
    return layout.filter(Boolean).map((l) => `- ${String(l).trim()}`).join('\n');
  }

  if (pareceContainer(layout)) {
    const descricao = layout.descricao_layout.trim();
    const partes: string[] = [descricao];
    let orcamento = TETO_DE_CHARS - descricao.length;

    if (layout.blocos?.length) {
      const blocos = cabemEm(layout.blocos.slice(0, TETO_DE_ITENS), Math.max(0, orcamento * 0.4));
      if (blocos.length) {
        const texto = `Elements, in order:\n${blocos.map((b) => `- ${b}`).join('\n')}`;
        partes.push(texto);
        orcamento -= texto.length;
      }
    }

    /*
     * `fixo` é o que mata o formato se mudar — "exatamente dois adesivos",
     * "split 50/50 encostado, sem borda". Entra como regra dura, e não como
     * sugestão, porque é literalmente a definição da peça.
     *
     * `trocavel` fica DE FORA de propósito: é instrução para quem adapta a
     * peça, não para quem a desenha. O modelo já recebe o briefing dizendo
     * o que a peça é; dizer também "a foto pode mudar" convida a inventar
     * uma foto em vez de usar a que foi anexada.
     */
    if (layout.fixo?.length) {
      const fixo = cabemEm(layout.fixo.slice(0, TETO_DE_ITENS), Math.max(0, orcamento));
      if (fixo.length) {
        partes.push(
          `NON-NEGOTIABLE — changing any of these stops being this format:\n${
            fixo.map((f) => `- ${f}`).join('\n')
          }`,
        );
      }
    }

    return partes.join('\n\n');
  }

  if (layout && typeof layout === 'object') {
    const l = layout as Record<string, unknown>;
    const linhas: string[] = [];
    if (typeof l.descricao === 'string' && l.descricao.trim()) linhas.push(l.descricao.trim());
    if (Array.isArray(l.regioes)) {
      for (const r of l.regioes as { papel?: string; onde?: string }[]) {
        if (r?.papel && r?.onde) linhas.push(`- ${String(r.papel).toUpperCase()}: ${r.onde}`);
      }
    }
    if (linhas.length) return linhas.join('\n');
  }

  // O caminho da V1, intocado.
  return JSON.stringify(layout || {});
}

/** O container, no formato que `buildCreativePrompt` espera. */
export function containerComoTemplate(c: CreativeContainer) {
  return {
    name: c.nome_pt,
    category: c.topologia ?? null,
    layoutStructure: c,
  };
}
