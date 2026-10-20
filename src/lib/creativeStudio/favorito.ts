import type { CreativeAsset } from '@/features/creative-studio/types/creative';

/**
 * O favorito anexado ao pedido.
 *
 * Um favorito é uma arte SUA, salva de propósito. Anexá-lo é dizer "faz no
 * estilo desta" — e isso é diferente, em três pontos concretos, de anexar
 * uma referência.
 *
 * **Não custa uma leitura de visão.** A referência é uma imagem que
 * `analyzeReferences` precisa decodificar para virar texto. O favorito já
 * guarda esse texto: o `designSystemDoc` e os anti-padrões que a arte
 * recebeu quando nasceu ficaram gravados com ela. Reler a imagem para
 * chegar a um documento PARECIDO com o que já está no banco seria pagar
 * uma chamada de visão para perder fidelidade.
 *
 * **Não dispara a cláusula anti-cópia.** `designSystemFromReference` liga a
 * proibição de reproduzir a marca, o rosto e as palavras da peça de origem
 * — que existe porque uma referência é arte de terceiros. Emiti-la sobre um
 * favorito proibiria a arte de usar a marca do próprio cliente, que é
 * exatamente o que o favorito foi salvo para repetir.
 *
 * **Traz o formato junto.** A arte favorita nasceu com um container; a nova
 * herda o mesmo, a menos que o pedido nomeie outro ou você escolha à mão.
 *
 * O que ele NÃO traz é a cena e a copy. `artDirection` fica de fora de
 * propósito: herdá-la produziria a mesma foto com texto novo, quando o que
 * se pediu foi o mesmo ESTILO para um assunto novo.
 */

export interface LeituraDoFavorito {
  /** O sistema visual gravado com a arte. */
  designSystemDoc: string | null;
  antiPadroes: string[] | null;
  /**
   * Sempre `false`.
   *
   * Não é um campo que varia: é a declaração de que este documento NÃO veio
   * de terceiros. Existe explícito para viajar como `referenceReading` sem
   * que ninguém precise lembrar de desligar a cláusula no caminho.
   */
  designSystemFromReference: false;
  mood: null;
  /** O formato da arte favorita, quando ela tinha um. */
  containerId: string | null;
  /** Como chamá-lo na proposta. */
  nome: string;
}

function textoOuNulo(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null;
}

function listaOuNulo(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const limpa = v.filter((x): x is string => typeof x === 'string' && !!x.trim());
  return limpa.length ? limpa : null;
}

/**
 * Lê o favorito, ou devolve `null` quando não há o que aproveitar.
 *
 * Uma arte salva antes de o sistema visual existir — ou gerada pelo caminho
 * literal, sem referência nenhuma — não guarda documento algum. Anexá-la
 * não quebra nada, mas também não acrescenta: devolver `null` aqui é o que
 * faz o pedido seguir pelo caminho normal em vez de carregar um estilo
 * vazio e uma promessa que a proposta não pode cumprir.
 */
export function lerFavorito(asset: CreativeAsset | null | undefined): LeituraDoFavorito | null {
  if (!asset) return null;
  const m = (asset.metadata ?? {}) as Record<string, unknown>;

  const doc = textoOuNulo(m.designSystemDoc);
  const anti = listaOuNulo(m.antiPadroes);
  const containerId = textoOuNulo(m.containerId);

  if (!doc && !anti && !containerId) return null;

  return {
    designSystemDoc: doc,
    antiPadroes: anti,
    designSystemFromReference: false,
    // O mood do favorito não é gravado hoje. Devolver `null` explícito é
    // melhor que omitir o campo: `referenceReading` é um `Pick` completo, e
    // um campo ausente ali faria a leitura das referências rodar de novo.
    mood: null,
    containerId,
    nome: asset.filename?.trim() || 'favorito',
  };
}

/**
 * O favorito manda no estilo, e diz quando passou por cima de algo.
 *
 * Com um favorito e referências anexados ao mesmo pedido, há dois sistemas
 * visuais disputando a mesma arte. Misturá-los produz uma terceira coisa
 * que não é nenhum dos dois; escolher em silêncio deixa a pessoa achando
 * que as referências entraram.
 *
 * O favorito vence porque é a arte aprovada do próprio cliente, e porque
 * carrega o documento exato que a produziu — contra uma leitura nova, feita
 * agora, de uma imagem de fora.
 */
export function avisoDasReferenciasIgnoradas(
  favorito: LeituraDoFavorito | null,
  quantasReferencias: number,
): string | null {
  if (!favorito?.designSystemDoc || quantasReferencias === 0) return null;
  return quantasReferencias === 1
    ? `o favorito «${favorito.nome}» manda no estilo — a referência anexada não foi lida`
    : `o favorito «${favorito.nome}» manda no estilo — as ${quantasReferencias} referências anexadas não foram lidas`;
}
