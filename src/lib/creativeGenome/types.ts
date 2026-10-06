import type { CreativeAspectRatio } from '@/features/creative-studio/types/creative';

/**
 * Um genoma de criativo: o sistema visual que uma peça veste.
 *
 * A qualidade de um criativo não vem do briefing — vem de um sistema de
 * design decidido por alguém que sabe o que está fazendo, e escrito com
 * precisão suficiente para um modelo de imagem executar. "Elegante" não é
 * executável; "ivory #F5F1EA, serifada de alto contraste em peso Light,
 * mínimo 35% de espaço negativo" é.
 *
 * O vocabulário aqui é DELIBERADAMENTE o mesmo de `criativo-analyze-refs`
 * (as 8 dimensões) e o mesmo que `buildGenerationRequest` já aceita. Um
 * genoma não precisa de tradutor para chegar ao prompt: ele já fala a
 * língua que o prompt lê.
 *
 * Dois eixos que não se confundem, e é o erro mais fácil de cometer aqui:
 *
 * - O SISTEMA VISUAL (`designSystemDoc`, `antiPadroes`, `mood`) diz como a
 *   peça é tratada — paleta, tipografia, camadas, luz.
 * - O CONTAINER (`container`) diz onde cada coisa mora no quadro.
 *
 * Eles são ortogonais: uma referência anexada pelo usuário pode substituir
 * o primeiro e ainda assim conviver com o segundo.
 */

/** Idêntico ao `mood` do analyze-refs e ao do `ReferenceAnalysis`. */
export interface GenomeMood {
  adjetivos: string[];
  referencias: string[];
  evita: string[];
}

/**
 * As 8 dimensões, como o `criativo-analyze-refs` as extrai.
 *
 * Tudo opcional: é ornamento útil para a interface e para quem edita, não
 * o que vai ao prompt. Quem vai ao prompt é o `designSystemDoc`.
 */
export interface GenomeVisualAnalysis {
  composicao?: { formato?: string; estrutura?: string; hierarquia?: string; silencio?: string };
  fotografia?: { tipo?: string; luz?: string; tratamento?: string; integracao?: string };
  paleta?: { dominante?: string; secundaria?: string; acento?: string; saturacao?: string; hexes?: string[] };
  tipografia?: { familiaA?: string; familiaB?: string; contraste?: string; alinhamento?: string };
  camadas?: string[];
  hierarquiaVisual?: string;
  espaco?: string;
  mood?: GenomeMood;
}

/** Os papéis que um container sabe posicionar. */
export type PapelDeRegiao =
  | 'headline' | 'subhead' | 'dados' | 'cta' | 'logo' | 'imagem' | 'silencio';

/**
 * O container: onde cada coisa mora no quadro.
 *
 * `descricao` é PROSA, não JSON. O modelo de imagem lê prosa; JSON cru
 * gasta atenção decodificando chaves e aspas — e este modelo renderiza
 * texto solto que encontra no prompt, o que faz de um `{"grid":"12col"}`
 * candidato a aparecer desenhado na arte.
 *
 * REGRA DURA: as posições se medem contra a CAIXA SEGURA, nunca contra o
 * frame inteiro. Um container que diga "texto nos 30% inferiores" entra em
 * contradição direta com o bloco [SAFE ZONE], que declara aquela faixa como
 * fundo vazio. Duas instruções brigando no mesmo prompt produzem arte
 * tímida — o modelo obedece as duas pela metade.
 */
export interface GenomeContainer {
  descricao: string;
  regioes?: { papel: PapelDeRegiao; onde: string }[];
  /** O formato em que esta peça nasceu. Default e sinal para o pré-filtro. */
  formatoNativo?: CreativeAspectRatio;
  /** Onde ela ainda funciona. Vazio = qualquer um. */
  formatosOk?: CreativeAspectRatio[];
}

export interface GenomeCopyRules {
  maxPalavrasTitulo?: number;
  maxLinhas?: number;
  exigeCta?: boolean;
  proibeCta?: boolean;
  /** Ex.: "imperativo curto", "uma frase só, sem ponto final". */
  tom?: string[];
}

export interface GenomeRegras {
  /** Para que serve. Entra no prompt do seletor. */
  intendedFor: string[];
  /**
   * Quando NÃO usar. É VETO, não desempate — um genoma cujo "evitar quando"
   * descreve o briefing sai da lista, por melhor que o resumo soe.
   */
  avoidWhen: string[];
  /** Aceleram o pré-filtro determinístico, sem IA. */
  palavrasChave?: string[];
  nichos?: string[];
  formatos?: CreativeAspectRatio[];
}

export interface CreativeGenome {
  // ---------------- obrigatório ----------------
  /** Slug estável. É este valor que a IA devolve ao escolher. */
  id: string;
  nome: string;
  /**
   * Uma a duas frases. É SÓ ISTO que viaja no prompt do seletor — todos os
   * resumos da shortlist entram numa mensagem só, então o teto é duro.
   */
  resumo: string;
  /**
   * O CONTAINER — e é ele o núcleo, não a paleta.
   *
   * "Cartaz", "story", "post-it" são tipos de PEÇA. Um cartaz é um cartaz
   * para a clínica e para a oficina mecânica; o que muda entre as duas é a
   * cor, e a cor vem da marca ou da referência anexada — não daqui. É
   * justamente por ser agnóstico de marca que o container ADAPTA.
   */
  container: GenomeContainer;
  regras: GenomeRegras;

  // ---------------- opcional ----------------
  /**
   * Linguagem visual, quando este genoma TIVER uma.
   *
   * Opcional de propósito, e o caso comum é ausente. Um post-it tem papel
   * amarelo e sombra projetada — isso é sistema visual e mora aqui. Um
   * "cartaz" é uma regra de composição que serve a qualquer paleta, e não
   * deve opinar sobre cor. Exigir este campo rejeitaria metade dos
   * containers reais.
   */
  designSystemDoc?: string;
  /** "NEVER X — because Y". Vão para o [DO NOT INCLUDE]. */
  antiPadroes?: string[];
  mood?: GenomeMood | null;
  /**
   * O que o container exige da COPY.
   *
   * Alimenta o passo que reparte a copy em papéis, NÃO o prompt de imagem —
   * um teto de palavras seria instrução sobre um texto que o modelo de
   * imagem não escreve. Um post-it com headline de 40 palavras não é um
   * post-it.
   */
  copyRules?: GenomeCopyRules | null;
  visualAnalysis?: GenomeVisualAnalysis | null;
  tags?: string[];
  previewUrl?: string | null;
  /** Desempate determinístico no pré-filtro. Maior ganha. */
  prioridade?: number;
  /**
   * O documento foi escrito lendo arte de TERCEIROS?
   *
   * Default `true`, e não é zelo excessivo: `mood.referencias` dos estilos
   * que já existem contém "Kinfolk, The Row, Aesop, Monocle", e o bloco
   * [MOOD] emite isso como `Feels like: …`. A cláusula que proíbe
   * reproduzir a marca de origem só liga com esta bandeira — um genoma
   * escolhido automaticamente, sem referência anexada, mandaria esses nomes
   * ao gerador com a guarda desligada. É o mesmo buraco que já fez uma arte
   * sair com a logo de um terceiro.
   */
  terceiros?: boolean;
  origem: 'builtin' | 'banco' | 'importado';
}

/** O que viaja no prompt do seletor. Nada além disto. */
export interface GenomeDigest {
  id: string;
  nome: string;
  resumo: string;
  intendedFor: string[];
  avoidWhen: string[];
}

export function digestOf(g: CreativeGenome): GenomeDigest {
  return {
    id: g.id,
    nome: g.nome,
    resumo: g.resumo,
    intendedFor: g.regras.intendedFor,
    avoidWhen: g.regras.avoidWhen,
  };
}

/** Preserva o tipo literal, como `defineTemplate` já faz no módulo social. */
export function defineGenome<const T extends CreativeGenome>(g: T): T {
  return g;
}

/** Teto do resumo: todos os da shortlist entram num prompt só. */
export const TETO_RESUMO = 320;
/** Teto de anti-padrões: o [DO NOT INCLUDE] já concatena quatro fontes. */
export const TETO_ANTI_PADROES = 9;
