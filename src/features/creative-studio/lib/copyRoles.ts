import type { PromptCopyBlocks } from './promptBuilder';

/**
 * A garantia de que os papéis tipográficos não reescrevem a copy.
 *
 * O bloco `[TEXT BLOCKS]` no modo `ai` é o que faz a arte sair em camadas:
 * cada linha ganha tamanho, peso, caixa e cor próprios, e é dali que vem o
 * botão pill e o label em caixa alta. Mas ele nasceu para copy que a IA
 * escreveu — usá-lo com a copy do usuário significa deixar um modelo
 * decidir onde cada pedaço entra.
 *
 * Decidir ONDE é o que queremos. Decidir O QUÊ, não: o usuário escreveu
 * aquele texto e pediu explicitamente que ele não mudasse. A instrução no
 * prompt do modelo diz isso, mas instrução é promessa — e promessa de
 * modelo falha em silêncio, com uma palavra trocada que ninguém percebe
 * até a arte estar pronta.
 *
 * Por isso a regra é verificada aqui, em código: os papéis só são usados se
 * a concatenação deles reproduzir o texto original. Se não reproduzir, eles
 * são descartados inteiros e o caminho literal assume. Meio caminho — usar
 * os papéis "quase certos" — seria pior que não usar nenhum, porque a
 * diferença apareceria na arte sem aparecer em lugar nenhum antes.
 */

/** A ordem em que os papéis são lidos na arte, de cima para baixo. */
const ORDEM_DOS_PAPEIS: (keyof PromptCopyBlocks)[] = ['label', 'titulo', 'subtitulo', 'dados', 'cta'];

/**
 * Reduz o texto ao que precisa sobreviver à distribuição em papéis.
 *
 * Espaço e quebra de linha somem porque distribuir é exatamente mexer
 * neles: o que era uma linha vira título e subtítulo, e a quebra entre eles
 * é a distribuição acontecendo, não o texto mudando. Caixa e acento ficam,
 * porque trocar "Conheça" por "conheça" já é reescrever a palavra — e a
 * caixa alta do label é decisão de estilo tipográfico, não de texto: o
 * prompt pede `uppercase` como tratamento, sem precisar que o modelo mande
 * a palavra em maiúscula.
 */
function normalizar(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim();
}

/** Os papéis preenchidos, na ordem de leitura. */
export function joinRoles(roles: PromptCopyBlocks): string {
  return ORDEM_DOS_PAPEIS
    .map((papel) => (roles[papel] ?? '').trim())
    .filter((valor) => valor.length > 0)
    .join(' ');
}

/**
 * Os papéis distribuem o texto recebido, sem acrescentar nem perder nada?
 *
 * Um `false` aqui não é erro do usuário nem motivo para interromper a
 * geração — é só o sinal de que a distribuição não pode ser confiada e a
 * arte sai pelo caminho literal.
 */
export function rolesArePartitionOf(roles: PromptCopyBlocks | null | undefined, texto: string): boolean {
  if (!roles) return false;
  const original = normalizar(texto);
  if (!original) return false;
  // Sem título não há hierarquia nenhuma para descrever, e o bloco `ai`
  // ficaria com o campo dominante vazio — que é a única linha que ele
  // realmente precisa ter.
  if (!roles.titulo?.trim()) return false;
  return normalizar(joinRoles(roles)) === original;
}
