import type { ArtDirection } from '@/features/creative-studio/api/artDirection';
import type { PromptCopyBlocks } from '@/features/creative-studio/lib/promptBuilder';
import type { CreativeAspectRatio } from '@/features/creative-studio/types/creative';
import type { CreativeContainer } from '@/lib/creativeGenome/types';

/**
 * O que o sistema entendeu, dito em voz alta antes de gastar uma geração.
 *
 * Toda essa informação já era produzida — a direção de arte roda em TODA
 * geração e é gravada no metadata, com um comentário no código dizendo que
 * serve "para o inspetor explicar por que a peça saiu como saiu". O
 * inspetor nunca leu. O usuário via um spinner mudo e uma imagem pronta.
 *
 * Mostrar isso ANTES muda o que se pode fazer a respeito: deixa de ser
 * explicação do passado e vira decisão. Se o sistema entendeu errado, dá
 * para corrigir com uma frase em vez de jogar fora uma arte.
 *
 * Este módulo é puro: ele não decide nada, só diz em português o que já foi
 * decidido. A decisão mora na direção de arte; aqui mora a leitura.
 */

export interface PropostaDeArte {
  /** O container escolhido, quando houve um. */
  formato: { nome: string; proporcao: string } | null;
  /** O que vai aparecer no quadro. Uma ou duas frases. */
  cena: string | null;
  /** A copy já repartida em papéis, na ordem em que aparece na peça. */
  copy: { papel: string; texto: string }[];
  /** O ângulo estratégico, e se ele já foi usado com este cliente. */
  angulo: { nome: string; inedito: boolean } | null;
  /** O que o sistema leu para chegar aqui. */
  leu: string[];
  /**
   * A proposta tem o suficiente para valer a pena mostrar?
   *
   * Uma proposta com cena nula, sem copy e sem container não diz nada que o
   * usuário não tenha acabado de escrever — e um painel que repete o pedido
   * de volta é pior que painel nenhum: ele cobra uma aprovação sem oferecer
   * informação.
   */
  vazia: boolean;
}

/** Os papéis na ordem em que compõem a peça, de cima para baixo. */
const ORDEM_DOS_PAPEIS: { chave: keyof PromptCopyBlocks; rotulo: string }[] = [
  { chave: 'label', rotulo: 'Etiqueta' },
  { chave: 'titulo', rotulo: 'Título' },
  { chave: 'subtitulo', rotulo: 'Subtítulo' },
  { chave: 'dados', rotulo: 'Dados' },
  { chave: 'cta', rotulo: 'Chamada' },
];

export interface EntradaDaProposta {
  container?: CreativeContainer | null;
  artDirection?: ArtDirection | null;
  copyBlocks?: PromptCopyBlocks | null;
  aspectRatio?: CreativeAspectRatio | null;
  angulo?: { nome: string; inedito: boolean } | null;
  /** Quantas referências o usuário anexou. */
  referencias?: number;
  /** Quantas artes aprovadas pela marca entraram na leitura. */
  aprovadas?: number;
  /** O sistema leu o dossiê da oferta deste cliente? */
  temDossie?: boolean;
}

function frase(v: string | null | undefined): string | null {
  const t = (v ?? '').trim();
  return t.length ? t : null;
}

/**
 * O que o sistema leu para chegar até aqui.
 *
 * Existe porque "o sistema leu tudo" é uma promessa que ninguém consegue
 * verificar. Listar as fontes transforma isso em algo conferível — e quando
 * a lista sai vazia, essa também é a resposta: o pedido foi mais pobre do
 * que podia ser, e dá para voltar e anexar algo.
 *
 * Exportada porque as peças e o pedido inteiro leem das MESMAS fontes: num
 * lote de duas, as referências foram lidas uma vez e valem para as duas.
 * Duas cópias desta lista divergiriam no dia em que uma fonte nova
 * aparecesse.
 */
export function listarFontes(e: EntradaDaProposta): string[] {
  const leu: string[] = [];
  if (e.referencias) {
    leu.push(e.referencias === 1 ? '1 referência anexada' : `${e.referencias} referências anexadas`);
  }
  if (e.aprovadas) {
    leu.push(e.aprovadas === 1
      ? '1 arte aprovada deste cliente'
      : `${e.aprovadas} artes aprovadas deste cliente`);
  }
  if (e.temDossie) leu.push('o dossiê da oferta');
  if (e.container) leu.push(`${e.container.nome_pt}, do catálogo de formatos`);
  return leu;
}

export function montarProposta(e: EntradaDaProposta): PropostaDeArte {
  const container = e.container ?? null;

  /*
   * A cena é o `mainSubject` mais a composição, quando as duas existem.
   *
   * Juntar com ponto e espaço, e não com quebra de linha: são duas frases
   * sobre a mesma imagem, e separá-las visualmente faria parecer que são
   * duas decisões independentes — quando a composição é justamente como o
   * sujeito aparece.
   */
  const sujeito = frase(e.artDirection?.mainSubject);
  const composicao = frase(e.artDirection?.composition);
  const cena = [sujeito, composicao].filter(Boolean).join(' ') || null;

  const copy = e.copyBlocks
    ? ORDEM_DOS_PAPEIS
        .map(({ chave, rotulo }) => ({ papel: rotulo, texto: frase(e.copyBlocks?.[chave]) }))
        .filter((p): p is { papel: string; texto: string } => !!p.texto)
    : [];

  const leu = listarFontes(e);

  const formato = container
    ? { nome: container.nome_pt, proporcao: e.aspectRatio ?? container.proporcao }
    : null;

  return {
    formato,
    cena,
    copy,
    angulo: e.angulo ?? null,
    leu,
    vazia: !formato && !cena && copy.length === 0,
  };
}

/**
 * A proposta do PEDIDO inteiro — uma peça ou várias.
 *
 * A peça (`PropostaDeArte`) descreve uma arte; o pedido descreve o que vai
 * acontecer quando o usuário disser sim. São coisas diferentes assim que a
 * quantidade deixa de ser sempre 1: o cliente e as fontes lidas valem para
 * o lote, e quantas peças saem é informação sobre o GASTO, não sobre
 * nenhuma arte em particular.
 */
export interface PropostaDoPedido {
  pecas: PropostaDeArte[];
  /**
   * O cliente desta arte, e se o sistema o reconheceu no texto do pedido.
   *
   * `doTexto: true` é o caso que precisa de confirmação: o sistema mudou
   * uma escolha que o usuário não fez à mão, e errar o dono manda a arte
   * para a biblioteca do cliente errado.
   */
  cliente: { nome: string; doTexto: boolean } | null;
  /** Quantas peças saem, e quantas foram pedidas antes do teto. */
  quantidade: { n: number; pedido: number };
  /** As fontes lidas — do pedido, não de cada peça. */
  leu: string[];
  vazia: boolean;
}

export interface EntradaDoPedido extends Omit<EntradaDaProposta, 'artDirection' | 'copyBlocks'> {
  pecas: EntradaDaProposta[];
  cliente?: { nome: string; doTexto: boolean } | null;
  quantidade?: { n: number; pedido: number };
}

export function montarPropostaDoPedido(e: EntradaDoPedido): PropostaDoPedido {
  const pecas = e.pecas.map((p) => montarProposta({ ...p, aspectRatio: p.aspectRatio ?? e.aspectRatio }));
  const quantidade = e.quantidade ?? { n: pecas.length || 1, pedido: pecas.length || 1 };
  const cliente = e.cliente ?? null;

  return {
    pecas,
    cliente,
    quantidade,
    leu: listarFontes(e),
    /*
     * Quando vale a pena parar e pedir um sim.
     *
     * Peças magras bastariam para não mostrar nada — mas duas coisas valem
     * confirmação mesmo sem cena nem copy: um lote, porque está prestes a
     * gastar mais de uma geração; e um cliente lido do texto, porque o
     * sistema mexeu numa escolha que o usuário não fez.
     */
    vazia: pecas.every((p) => p.vazia) && quantidade.n <= 1 && !cliente?.doTexto,
  };
}
