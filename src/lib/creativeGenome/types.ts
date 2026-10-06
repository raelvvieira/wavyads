import type { CreativeAspectRatio } from '@/features/creative-studio/types/creative';

/**
 * Um CONTAINER: a especificação de uma peça.
 *
 * "Antes e depois", "nota do iPhone", "manchete editorial", "cartela de
 * brinquedo" — cada um é um formato de anúncio com regras próprias de
 * composição, de copy e de produção. Não é paleta: um "antes e depois" é um
 * antes e depois para a clínica e para o pet shop. O que muda entre as duas
 * é a foto e a cor, e isso vem da marca — não daqui. É por ser agnóstico de
 * marca que o container ADAPTA.
 *
 * O formato espelha o `containers.json` de origem campo a campo. Traduzir
 * nomes seria criar um dialeto: quando o arquivo evoluir, a atualização
 * seria uma rodada de renomeação em vez de uma troca de arquivo.
 *
 * Dois campos carregam o coração da coisa:
 *
 * `fixo` é o que NÃO pode mudar — mudar mata o formato. Vai para o prompt
 * como regra dura.
 *
 * `trocavel` é o que a marca e o briefing preenchem. É literalmente a lista
 * do que adaptar, escrita por quem desenhou a peça.
 */

export type Funil = 'topo' | 'meio' | 'fundo';
export type Densidade = 'baixa' | 'media' | 'alta';
export type PresencaCta = 'obrigatorio' | 'opcional' | 'proibido';
export type NivelRisco = 'baixo' | 'medio' | 'alto';
export type Confianca = 'alta' | 'media' | 'baixa';

export interface CorrecaoAuditoria {
  campo: string;
  motivo: string;
}

export interface CreativeContainer {
  // ---------- identidade ----------
  id: string;
  nome_pt: string;
  nome_original?: string;
  /** O que a peça IMITA (adesivo de story, nota do iPhone, artigo científico). */
  mimica_de?: string;

  // ---------- o layout ----------
  /** Prosa minuciosa: o que está no quadro e onde. Vai ao [TEMPLATE STRUCTURE]. */
  descricao_layout: string;
  /** Os elementos, na ordem em que compõem a peça. */
  blocos: string[];
  topologia?: string;

  // ---------- o que adapta e o que não ----------
  /** Muda isto e deixa de ser este formato. Regra dura no prompt. */
  fixo: string[];
  /** O que a marca e o briefing preenchem. A lista do que adaptar. */
  trocavel: string[];
  /** Quantos pontos de variação a peça tem. */
  numero_de_slots_variaveis?: number;

  // ---------- pré-requisitos de produção ----------
  /**
   * O que a peça EXIGE para existir — duas fotos reais do mesmo sujeito,
   * autorização de uso de imagem, um coletivo legível ao fundo.
   *
   * É o sinal mais forte do pré-filtro: um container que exige foto de
   * cobertura não serve a quem não tem foto nenhuma anexada.
   */
  exige?: string[];
  origem_do_ativo?: string;
  spec_de_producao?: unknown;

  // ---------- sinais estruturados (o pré-filtro vive deles) ----------
  proporcao: string;
  midia?: string;
  funil: Funil[];
  densidade_texto: Densidade;
  presenca_de_cta: PresencaCta;
  tem_rosto: boolean;
  tem_produto: boolean;
  /** Que tipo de prova a peça carrega: social, autoridade, demonstração… */
  prova_embutida?: string;

  // ---------- copy ----------
  /** Tetos e proibições de texto. Vai ao passo que reparte a copy. */
  regra_de_copy?: string[];
  limite_de_texto_por_bloco?: string;
  /** Quem fala na peça. Depoimento de terceiro não cabe em toda peça. */
  voz?: string;
  /**
   * Ângulos estratégicos que este container NÃO comporta.
   *
   * Conversa direto com os 12 ângulos do Fator Criativo: um formato de um
   * quadro só não comporta "antes e depois"; um que proíbe preço na arte não
   * comporta ângulo ancorado em escassez.
   */
  angulos_vedados?: string[];

  // ---------- compliance ----------
  /** Risco de a Meta reprovar a peça. */
  risco_de_reprovacao?: NivelRisco;
  risco_motivo?: string;

  // ---------- procedência ----------
  camada?: string;
  confianca?: Confianca;
  exemplo_nicho?: string;
  exemplo_copy?: string;
  exemplo_paleta?: string;
  evidencia?: string;
  frames?: string[];
  aliases?: string[];
  correcoes_auditoria?: CorrecaoAuditoria[];
  mercado?: string;
  fonte?: string;
  pendencias?: unknown;

  /** De onde esta entrada veio. Não vem do arquivo. */
  origem: 'arquivo' | 'banco' | 'importado';
}

/** O que viaja no prompt do seletor. Nada além disto — o resto é peso. */
export interface ContainerDigest {
  id: string;
  nome: string;
  resumo: string;
  proporcao: string;
  funil: Funil[];
  exige: string[];
  temRosto: boolean;
  temProduto: boolean;
  cta: PresencaCta;
}

export function digestOf(c: CreativeContainer, tetoResumo = TETO_RESUMO): ContainerDigest {
  const resumo = c.descricao_layout.length <= tetoResumo
    ? c.descricao_layout
    : `${c.descricao_layout.slice(0, tetoResumo - 1).trimEnd()}…`;
  return {
    id: c.id,
    nome: c.nome_pt,
    resumo,
    proporcao: c.proporcao,
    funil: c.funil,
    exige: c.exige ?? [],
    temRosto: c.tem_rosto,
    temProduto: c.tem_produto,
    cta: c.presenca_de_cta,
  };
}

/**
 * Teto do resumo no prompt do seletor.
 *
 * Todos os resumos da shortlist entram numa mensagem só. Com 5 containers a
 * 320 chars são 1,6k — cabe. Sem teto, um `descricao_layout` de 1448 chars
 * (o maior do catálogo) sozinho já estouraria o orçamento.
 */
export const TETO_RESUMO = 320;

/** Converte a `proporcao` do arquivo para o tipo que o Studio usa. */
export function comoAspectRatio(p: string | null | undefined): CreativeAspectRatio | null {
  const limpo = (p ?? '').trim();
  const conhecidos = ['1:1', '4:5', '9:16', '16:9'];
  return conhecidos.includes(limpo) ? (limpo as CreativeAspectRatio) : null;
}
