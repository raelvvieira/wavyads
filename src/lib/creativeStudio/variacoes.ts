/**
 * O brief que a LEITURA recebe quando o pedido tem mais de uma peça.
 *
 * Pedir duas peças e receber duas tentativas da mesma ideia é escolher
 * entre dois acabamentos. O que se quer ao pedir duas é escolher entre dois
 * caminhos — e para isso a segunda leitura precisa saber o que a primeira
 * propôs.
 *
 * O enriquecimento vive aqui, no cliente, porque a alternativa seria a edge
 * function devolver N direções de uma vez — e ela precisa de deploy manual.
 * Este caminho funciona hoje.
 *
 * O brief da GERAÇÃO continua sendo o original, e isso não é detalhe: o
 * brief vira `businessContext` e abre o prompt da imagem. Uma frase como
 * "esta é a peça 2 de 2" ali seria texto solto dentro do prompt — candidato
 * a ser desenhado na arte, que é exatamente o que o bloco
 * [DO NOT INCLUDE] já tenta impedir.
 */

export function briefDaVariacao(
  brief: string,
  /** 1-based: é o número que aparece para o usuário. */
  indice: number,
  total: number,
  /** O que as peças anteriores já propuseram, uma frase cada. */
  jaPropostas: string[] = [],
): string {
  /*
   * Uma peça só devolve o brief INTOCADO.
   *
   * É a garantia de que o pedido normal — a esmagadora maioria — continua
   * byte-idêntico ao de antes desta mudança. Nenhuma arte que já saía boa
   * passa a ser lida de um jeito diferente por causa de um recurso que não
   * foi usado.
   */
  if (total <= 1) return brief;

  const limpas = jaPropostas.map((p) => p.trim()).filter(Boolean);
  const linhas = [
    brief.trim(),
    '',
    `Esta é a peça ${indice} de ${total} do mesmo pedido.`,
  ];

  if (limpas.length) {
    linhas.push('As peças já propostas para este pedido foram:');
    for (const p of limpas) linhas.push(`- ${p}`);
    linhas.push(
      'Proponha uma abordagem visual DIFERENTE destas — outra cena, outro '
      + 'enquadramento, outro jeito de contar a mesma oferta. Não repita o '
      + 'que já foi proposto.',
    );
  } else {
    linhas.push(
      'Escolha uma abordagem visual definida, que deixe espaço para as '
      + 'outras peças serem diferentes desta.',
    );
  }

  return linhas.join('\n');
}

/** A frase curta que descreve uma peça já proposta, para a próxima evitar. */
export function resumoDaPeca(artDirection: { mainSubject?: string; composition?: string } | null): string | null {
  const sujeito = (artDirection?.mainSubject ?? '').trim();
  const composicao = (artDirection?.composition ?? '').trim();
  const frase = [sujeito, composicao].filter(Boolean).join(' ');
  return frase || null;
}
