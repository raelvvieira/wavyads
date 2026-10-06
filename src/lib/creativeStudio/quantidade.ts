/**
 * Quantas peças o pedido está pedindo.
 *
 * "quero 2 criativos de clareamento" saía com uma arte só: o "2" era texto
 * solto dentro do brief, e nada no sistema lia quantidade. Existia um
 * `quantity` em `capabilities.ts`, mas só como rótulo da cápsula do dock —
 * a página nunca o passava e ele não chegava à geração.
 *
 * Este módulo é puro e mora no cliente de propósito: ler um número não
 * precisa de IA, e o que não precisa de IA não deveria depender de um
 * deploy de edge function para funcionar.
 */

/**
 * O teto de peças por pedido.
 *
 * Cada peça é uma leitura e uma geração — custa tempo e dinheiro. Um "crie
 * 50 artes" digitado sem pensar não pode virar 50 chamadas ao provedor, e
 * quem de fato quer 50 consegue pedir em levas. O número lido antes do corte
 * viaja junto (`pedido`), para a proposta poder dizer que cortou em vez de
 * entregar 4 calada.
 */
export const TETO_DE_PECAS = 4;

export interface QuantidadePedida {
  /** O que vai ser gerado — já com o teto aplicado, nunca menor que 1. */
  n: number;
  /** O que foi lido no texto, antes do teto. */
  pedido: number;
  /** O pedaço do texto que produziu o número, nas palavras do usuário. */
  trecho: string | null;
}

/**
 * As palavras que significam "uma peça de saída".
 *
 * `foto` fica DE FORA de propósito: no vocabulário deste produto, foto é o
 * que se ANEXA (foto do produto, foto da pessoa), não o que sai. "manda 2
 * fotos do produto" é uma instrução sobre o anexo, não um pedido de duas
 * artes.
 */
const PALAVRAS_DE_PECA = new Set([
  'criativo', 'criativos', 'criativa', 'criativas',
  'arte', 'artes',
  'variacao', 'variacoes',
  'versao', 'versoes',
  'peca', 'pecas',
  'opcao', 'opcoes',
  'alternativa', 'alternativas',
  'imagem', 'imagens',
  'anuncio', 'anuncios',
  'post', 'posts',
  'story', 'stories',
  'banner', 'banners',
]);

const NUMERAIS: Record<string, number> = {
  um: 1, uma: 1,
  dois: 2, duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
};

/** Quantas palavras podem separar o número da palavra de peça. */
const DISTANCIA_MAXIMA = 2;

function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function comoNumero(token: string): number | null {
  if (/^\d{1,2}$/.test(token)) return Number(token);
  const porExtenso = NUMERAIS[token];
  return porExtenso ?? null;
}

/**
 * Lê a quantidade pedida no texto.
 *
 * A regra que sustenta tudo: **o número só conta quando vem colado numa
 * palavra que significa peça**. É isso que faz "arte para os 3 produtos"
 * continuar valendo uma arte — o "3" está preso a "produtos", que é sobre o
 * assunto da peça, não sobre quantas peças existem.
 *
 * Sem essa regra, todo número que aparecesse no brief ("desconto de 3
 * meses", "até 5 parcelas") viraria uma arte a mais, e o usuário pagaria por
 * gerações que não pediu.
 *
 * Nunca lança. Texto vazio, lixo ou `null` devolvem uma peça.
 */
export function lerQuantidade(brief: unknown): QuantidadePedida {
  const texto = typeof brief === 'string' ? brief : '';
  const originais = texto.match(/[\p{L}\p{N}]+/gu) ?? [];
  const normalizados = originais.map((t) => semAcento(t.toLowerCase()));

  for (let i = 0; i < normalizados.length; i++) {
    const quanto = comoNumero(normalizados[i]);
    if (quanto === null) continue;

    for (let j = i + 1; j <= i + 1 + DISTANCIA_MAXIMA && j < normalizados.length; j++) {
      // Outro número no caminho encerra a busca: em "2 de 3 formatos" o
      // segundo número manda, e deixar o primeiro alcançar "formatos"
      // passando por cima dele leria a frase ao contrário.
      if (comoNumero(normalizados[j]) !== null) break;
      if (!PALAVRAS_DE_PECA.has(normalizados[j])) continue;

      const pedido = quanto;
      return {
        // Zero peça não é um pedido, é um engano de digitação — e gerar
        // nada em silêncio seria pior que gerar uma.
        n: Math.min(Math.max(pedido, 1), TETO_DE_PECAS),
        pedido,
        trecho: originais.slice(i, j + 1).join(' '),
      };
    }
  }

  return { n: 1, pedido: 1, trecho: null };
}
