import { lerQuantidade } from './quantidade';

/**
 * O que o pedido quer: criar algo novo ou alterar o que já existe.
 *
 * Hoje essa decisão não vem do texto. Vem de `selectedIds.length` — ou
 * seja, de um clique de mouse no canvas. Quem escreveu "quero mais 2
 * criativos" com uma arte selecionada recebeu uma EDIÇÃO dessa arte: o
 * texto inteiro virou `metadata.feedback`, a quantidade nunca foi lida e os
 * anexos nunca entraram no pedido.
 *
 * A decisão precisa acontecer ANTES da direção de arte, que só roda no
 * caminho de criar — então ela não pode sair de lá. E `criativo-art-direction`,
 * a candidata natural a decidir isso com IA, depende de um deploy manual que
 * ainda não aconteceu. Um módulo puro vale desde o build, e quando o deploy
 * vier a IA pode confirmar a leitura com este aqui de rede.
 */

export type Intencao = 'criar' | 'editar' | 'indefinida';

export interface LeituraDaIntencao {
  intencao: Intencao;
  /** O pedaço do texto que decidiu — a proposta mostra. */
  trecho: string | null;
}

/**
 * Verbos que SÓ fazem sentido sobre algo que já existe.
 *
 * Não dá para "tirar o fundo" de uma arte que ainda não foi feita. É essa
 * impossibilidade que os torna o sinal mais específico do texto, e por isso
 * eles têm precedência sobre a quantidade: em "troca o fundo nas 2 artes" o
 * "2 artes" conta as alvo, não as que vão nascer.
 */
const VERBOS_DE_EDICAO = [
  'muda', 'mudar', 'mude', 'mudanca',
  'troca', 'trocar', 'troque',
  'tira', 'tirar', 'tire',
  'remove', 'remover', 'remova',
  'apaga', 'apagar', 'apague',
  'aumenta', 'aumentar', 'aumente',
  'diminui', 'diminuir', 'diminua',
  'substitui', 'substituir', 'substitua',
  'corrige', 'corrigir', 'corrija',
  'arruma', 'arrumar', 'arrume',
  'ajusta', 'ajustar', 'ajuste',
  'melhora', 'melhorar', 'melhore',
  'inverte', 'inverter', 'inverta',
  'deixa', 'deixe',
  'edita', 'editar', 'edite',
];

/**
 * Marcas de pedido novo.
 *
 * Mais fracas que as de edição de propósito: "faz" cabe em "faz uma arte" e
 * em "faz o título maior". Por isso elas só decidem depois que nenhum verbo
 * de edição apareceu.
 */
const MARCAS_DE_CRIACAO = [
  'quero', 'queria', 'preciso', 'precisava', 'gostaria',
  'cria', 'criar', 'crie',
  'faz', 'fazer', 'faca',
  'gera', 'gerar', 'gere',
  'monta', 'montar', 'monte',
  'manda', 'mandar', 'mande',
  'novo', 'nova', 'novos', 'novas',
  'outro', 'outra', 'outros', 'outras',
];

function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function acha(normalizados: string[], originais: string[], lista: string[]): string | null {
  for (let i = 0; i < normalizados.length; i++) {
    if (lista.includes(normalizados[i])) return originais[i];
  }
  return null;
}

/**
 * Lê o verbo do pedido.
 *
 * A ordem das três perguntas é a parte que importa:
 *
 * 1. **Verbo de edição?** É o sinal mais específico — esses verbos não
 *    conseguem significar "crie do zero".
 * 2. **Quantidade com palavra de peça?** Nomear uma saída contável ("2
 *    criativos") é pedir produção, mesmo sem verbo nenhum.
 * 3. **Marca de criação?** As mais fracas, por último.
 *
 * Nada disso decide sozinho: sem seleção no canvas não há o que editar, e o
 * pedido é sempre de criação. A leitura só pesa quando há uma arte
 * selecionada — e aí a proposta mostra o que foi entendido antes de gastar.
 */
export function lerIntencao(brief: unknown): LeituraDaIntencao {
  const texto = typeof brief === 'string' ? brief : '';
  const originais = texto.match(/[\p{L}\p{N}]+/gu) ?? [];
  const normalizados = originais.map((t) => semAcento(t.toLowerCase()));

  const edicao = acha(normalizados, originais, VERBOS_DE_EDICAO);
  if (edicao) return { intencao: 'editar', trecho: edicao };

  const quantidade = lerQuantidade(texto);
  if (quantidade.trecho) return { intencao: 'criar', trecho: quantidade.trecho };

  const criacao = acha(normalizados, originais, MARCAS_DE_CRIACAO);
  if (criacao) return { intencao: 'criar', trecho: criacao };

  return { intencao: 'indefinida', trecho: null };
}

/** O que o pedido vai fazer, já cruzando o texto com o que está selecionado. */
export type Rota = 'criar' | 'editar';

export interface Roteamento {
  rota: Rota;
  /** A leitura do texto, para a proposta poder explicar. */
  leitura: LeituraDaIntencao;
  /**
   * O texto pediu coisa nova, mas havia uma arte selecionada.
   *
   * A proposta precisa dizer isso: o sistema acabou de ignorar uma escolha
   * que o usuário fez com o mouse, e ele tem direito de saber antes de
   * gastar — ainda mais porque pode ter sido a seleção que ele esqueceu.
   */
  ignorouSelecao: boolean;
}

export function rotearPedido(brief: unknown, temSelecao: boolean): Roteamento {
  const leitura = lerIntencao(brief);

  // Sem seleção não há o que editar. O texto pode dizer "muda o fundo"; não
  // existe fundo nenhum para mudar, e recusar o pedido seria pior que gerar.
  if (!temSelecao) return { rota: 'criar', leitura, ignorouSelecao: false };

  if (leitura.intencao === 'criar') {
    return { rota: 'criar', leitura, ignorouSelecao: true };
  }

  /*
   * Com seleção, o indefinido edita.
   *
   * É o comportamento de hoje, e editar não destrói nada: sai uma arte
   * filha, com a original intacta ao lado. O que muda é que agora o dock
   * diz isso com o campo preenchido, em vez de só no `placeholder` — que
   * some no primeiro caractere digitado.
   */
  return { rota: 'editar', leitura, ignorouSelecao: false };
}

/**
 * O que o Enter vai fazer, em uma frase, para o dock mostrar.
 *
 * O único aviso de modo que existia era o `placeholder` — e ele some no
 * primeiro caractere digitado, justamente quando o pedido ganha forma e a
 * consequência passa a importar. Esta frase aparece COM o campo cheio.
 */
export function descreverEnter(brief: string, temSelecao: boolean): string {
  const { rota } = rotearPedido(brief, temSelecao);
  if (rota === 'editar') return 'Enter altera a arte selecionada';
  const { n } = lerQuantidade(brief);
  return n > 1 ? `Enter cria ${n} peças novas` : 'Enter cria uma arte nova';
}
