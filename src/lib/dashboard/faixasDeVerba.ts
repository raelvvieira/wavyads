/**
 * Onde está a verba.
 *
 * O dashboard mostrava métricas; isto mostra uma decisão. É a diferença que
 * o benchmark apontou em uma frase: a plataforma concorrente "não mostra
 * mais métricas que o Gerenciador — ela transforma as métricas em
 * decisão".
 *
 * A pergunta que este módulo responde é uma só, e é a que o cliente faz
 * primeiro: **quanto do meu dinheiro está indo para o que funciona?**
 *
 * Nenhum dado novo. Gasto e custo por resultado já vêm por campanha na
 * resposta que a tela carrega hoje.
 */

/** O que a campanha merece que se faça com ela. */
export type Faixa = 'escalar' | 'manter' | 'observar' | 'revisar' | 'sem_retorno';

export const ROTULO_DA_FAIXA: Record<Faixa, string> = {
  escalar: 'Escalar',
  manter: 'Manter',
  observar: 'Observar',
  revisar: 'Revisar',
  sem_retorno: 'Sem retorno',
};

/** A ordem em que as faixas aparecem: do melhor para o pior, sempre. */
export const ORDEM_DAS_FAIXAS: Faixa[] = ['escalar', 'manter', 'observar', 'revisar', 'sem_retorno'];

export interface CampanhaParaFaixa {
  id: string;
  name: string;
  /** Opcional: quando presente, o detalhe lista as campanhas da faixa. */
  status?: { estado?: string } | null;
  spend: number;
  /** Quantos resultados a campanha trouxe — leads, compras, conversas. */
  results: number;
  /** Quanto custou cada um. */
  cost_per_result: number;
}

export interface FatiaDaVerba {
  faixa: Faixa;
  rotulo: string;
  campanhas: number;
  investimento: number;
  /** Fatia do investimento TOTAL, de 0 a 100. */
  percentual: number;
  resultados: number;
  /** O custo por resultado da faixa inteira. Zero quando não houve resultado. */
  custoPorResultado: number;
  /** Os nomes das campanhas desta faixa, da que mais gastou para a que menos. */
  nomes: string[];
}

/** Uma das frases do detalhe, com o tom que ela merece na tela. */
export interface FraseDaVerba {
  tom: 'bom' | 'atencao' | 'ruim';
  texto: string;
}

export interface MapaDaVerba {
  /**
   * A régua: o custo por resultado médio da conta no período.
   *
   * Comparar contra a própria conta, e não contra um número inventado,
   * evita o pior defeito possível num painel de cliente: um veredito que
   * depende de uma meta que ninguém configurou e que, por isso, estaria
   * errada para todo mundo. A régua é honesta e vale desde o primeiro uso —
   * uma meta definida por cliente é a evolução natural daqui.
   */
  referencia: number;
  total: number;
  /** Sempre as cinco faixas, na ordem, inclusive as vazias. */
  fatias: FatiaDaVerba[];
  /**
   * A frase que vale a pena ler. `null` quando não há o que dizer.
   *
   * Uma só, e sobre o que exige ação: um painel que descreve tudo em
   * parágrafos é um painel que ninguém lê.
   */
  frase: string | null;
  /**
   * As frases do DETALHE — até três, e só as que têm conteúdo.
   *
   * No card cabe uma; no detalhe, quem abriu já declarou que quer mais.
   * Mesmo ali elas são as mesmas três perguntas, nunca um relatório: o que
   * está indo bem, o que precisa de revisão, e o que não voltou.
   */
  frases: FraseDaVerba[];
}

/**
 * Em que faixa uma campanha cai.
 *
 * Gastar sem trazer nada é a única faixa que não é comparativa: ela não
 * depende de régua nenhuma, e é a que mais importa ver.
 */
export function faixaDaCampanha(c: CampanhaParaFaixa, referencia: number): Faixa {
  if (c.spend > 0 && c.results <= 0) return 'sem_retorno';
  if (!(referencia > 0) || !(c.cost_per_result > 0)) return 'observar';

  const razao = c.cost_per_result / referencia;
  if (razao <= 0.7) return 'escalar';
  if (razao <= 1) return 'manter';
  if (razao <= 1.4) return 'observar';
  return 'revisar';
}

function dinheiro(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export function mapearVerba(campanhas: CampanhaParaFaixa[]): MapaDaVerba {
  const comGasto = campanhas.filter((c) => c.spend > 0);
  const total = comGasto.reduce((s, c) => s + c.spend, 0);

  /*
   * A régua é o custo por resultado da CONTA, não a média das campanhas.
   *
   * Média de médias distorce: uma campanha de R$ 20 com CPL de R$ 200
   * pesaria o mesmo que uma de R$ 20.000 com CPL de R$ 30. Dividir o gasto
   * total pelos resultados totais é o número que o cliente teria calculado
   * na mão.
   */
  const resultadosTotais = comGasto.reduce((s, c) => s + Math.max(0, c.results), 0);
  const referencia = resultadosTotais > 0 ? total / resultadosTotais : 0;

  const vazia = (faixa: Faixa): FatiaDaVerba => ({
    faixa, rotulo: ROTULO_DA_FAIXA[faixa], campanhas: 0, investimento: 0,
    percentual: 0, resultados: 0, custoPorResultado: 0, nomes: [],
  });
  const porFaixa = new Map<Faixa, FatiaDaVerba>(ORDEM_DAS_FAIXAS.map((f) => [f, vazia(f)]));

  for (const c of [...comGasto].sort((a, b) => b.spend - a.spend)) {
    const fatia = porFaixa.get(faixaDaCampanha(c, referencia))!;
    fatia.campanhas += 1;
    fatia.investimento += c.spend;
    fatia.resultados += Math.max(0, c.results);
    fatia.nomes.push(c.name);
  }

  const fatias = ORDEM_DAS_FAIXAS.map((f) => {
    const fatia = porFaixa.get(f)!;
    return {
      ...fatia,
      percentual: total > 0 ? (fatia.investimento / total) * 100 : 0,
      // O custo da FAIXA, recalculado da soma — média de médias distorceria
      // aqui pelo mesmo motivo que distorce na régua.
      custoPorResultado: fatia.resultados > 0 ? fatia.investimento / fatia.resultados : 0,
    };
  });

  return {
    referencia, total, fatias,
    frase: montarFrase(fatias, total),
    frases: montarFrases(fatias, total),
  };
}

/**
 * A única frase do bloco.
 *
 * Ela fala do que exige ação, nesta ordem: dinheiro gastado sem retorno
 * nenhum vence qualquer outra notícia, porque é o único caso em que a conta
 * é certa — não é "está caro", é "não voltou nada". Depois vem a
 * concentração no que precisa de revisão. Se nada disso existe, a notícia é
 * boa e cabe em meia linha.
 */
function montarFrase(fatias: FatiaDaVerba[], total: number): string | null {
  if (total <= 0) return null;
  const achar = (f: Faixa) => fatias.find((x) => x.faixa === f)!;

  const semRetorno = achar('sem_retorno');
  if (semRetorno.investimento > 0) {
    const quantas = semRetorno.campanhas === 1 ? '1 campanha' : `${semRetorno.campanhas} campanhas`;
    return `${dinheiro(semRetorno.investimento)} em ${quantas} sem nenhum resultado.`;
  }

  const revisar = achar('revisar');
  if (revisar.percentual >= 20) {
    return `${Math.round(revisar.percentual)}% da verba está em campanhas para revisar.`;
  }

  const bem = achar('escalar').percentual + achar('manter').percentual;
  if (bem >= 50) return `${Math.round(bem)}% da verba está no que performa acima da média.`;
  return null;
}

/**
 * As três frases do detalhe.
 *
 * Mesmas perguntas da frase única do card, abertas: o que está indo bem, o
 * que precisa de revisão, e o que não voltou — esta última com os nomes,
 * porque "uma campanha sem retorno" sem dizer qual não é acionável.
 */
function montarFrases(fatias: FatiaDaVerba[], total: number): FraseDaVerba[] {
  if (total <= 0) return [];
  const achar = (f: Faixa) => fatias.find((x) => x.faixa === f)!;
  const pct = (v: number) => `${Math.round(v)}%`;
  const saida: FraseDaVerba[] = [];

  const bem = achar('escalar').investimento + achar('manter').investimento;
  if (bem > 0) {
    saida.push({
      tom: 'bom',
      texto: `${pct((bem / total) * 100)} da verba está no que performa na média ou melhor (${dinheiro(bem)}).`,
    });
  }

  const revisar = achar('revisar');
  if (revisar.investimento > 0) {
    saida.push({
      tom: 'atencao',
      texto: `${pct(revisar.percentual)} está em campanhas acima do custo médio (${dinheiro(revisar.investimento)}).`,
    });
  }

  const semRetorno = achar('sem_retorno');
  if (semRetorno.investimento > 0) {
    const quantas = semRetorno.campanhas === 1 ? '1 campanha' : `${semRetorno.campanhas} campanhas`;
    saida.push({
      tom: 'ruim',
      texto: `${quantas} sem nenhum resultado — ${dinheiro(semRetorno.investimento)} investidos sem retorno.`,
    });
  }

  return saida;
}
