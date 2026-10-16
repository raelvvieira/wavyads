/**
 * Quem recebeu o dinheiro — por idade, plataforma e região.
 *
 * O painel mostrava o agregado e nada sobre QUEM. Estas são as perguntas
 * que um gestor responde de cabeça depois de olhar o Gerenciador, e que o
 * cliente não tem como responder sozinho: em que faixa etária a verba está
 * indo, em que plataforma, em que estado.
 *
 * O módulo é puro: ele ordena, calcula proporção e corta a cauda. Quem
 * busca é o hook; quem desenha é o card.
 */

export interface LinhaDeSegmento {
  chave: string;
  spend: number;
  impressions: number;
  clicks: number;
  results: number;
  cost_per_result: number;
  purchase_value: number;
}

export interface FatiaDeSegmento extends LinhaDeSegmento {
  /** Fatia do investimento do segmento, de 0 a 100. */
  percentual: number;
}

export interface SegmentoResumido {
  fatias: FatiaDeSegmento[];
  investimento: number;
  receita: number;
  resultados: number;
  /** Quantas linhas ficaram fora do corte. */
  ocultas: number;
}

/** Quantas linhas um card mostra antes de "Ver detalhes". */
export const LINHAS_VISIVEIS = 3;

function numero(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/**
 * Ordena por investimento e calcula a proporção.
 *
 * O corte é só da VISTA: os totais do cabeçalho continuam somando tudo, e
 * `ocultas` diz quantas sobraram. Um card que mostra três linhas e um total
 * que só soma essas três mente sobre o tamanho da conta.
 */
export function resumirSegmento(
  linhas: LinhaDeSegmento[] | null | undefined,
  limite: number = LINHAS_VISIVEIS,
): SegmentoResumido {
  const validas = (linhas ?? [])
    .filter((l) => l && numero(l.spend) > 0)
    .map((l) => ({
      chave: String(l.chave || 'Desconhecido'),
      spend: numero(l.spend),
      impressions: numero(l.impressions),
      clicks: numero(l.clicks),
      results: numero(l.results),
      cost_per_result: numero(l.cost_per_result),
      purchase_value: numero(l.purchase_value),
    }))
    .sort((a, b) => b.spend - a.spend);

  const investimento = validas.reduce((s, l) => s + l.spend, 0);
  const receita = validas.reduce((s, l) => s + l.purchase_value, 0);
  const resultados = validas.reduce((s, l) => s + l.results, 0);

  const fatias = validas.slice(0, limite).map((l) => ({
    ...l,
    percentual: investimento > 0 ? (l.spend / investimento) * 100 : 0,
  }));

  return { fatias, investimento, receita, resultados, ocultas: Math.max(0, validas.length - fatias.length) };
}

/** Os rótulos que a Meta devolve em inglês, ditos em português. */
const NOME_DA_PLATAFORMA: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  audience_network: 'Audience Network',
  messenger: 'Messenger',
  threads: 'Threads',
  unknown: 'Desconhecido',
};

export function rotuloDoSegmento(chave: string): string {
  const k = (chave || '').toLowerCase();
  if (NOME_DA_PLATAFORMA[k]) return NOME_DA_PLATAFORMA[k];
  /*
   * As posições vêm como `instagram_stories`, `facebook_reels`. O prefixo
   * da plataforma é ruído dentro de um card que já é sobre posição — e sem
   * tirá-lo, metade das linhas começa com a mesma palavra.
   */
  const semPrefixo = k.replace(/^(facebook|instagram|messenger|audience_network)_/, '');
  return semPrefixo
    .split('_')
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ') || 'Desconhecido';
}
