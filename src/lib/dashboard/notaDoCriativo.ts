/**
 * A nota do criativo — e os pesos à mostra.
 *
 * O benchmark descreve o IDC da plataforma concorrente como "nota 0–100 por
 * anúncio, fórmula NÃO exposta". A nota resolve um problema real: um
 * ranking único que o cliente leigo entende sem cruzar cinco colunas.
 * Esconder a conta cria outro — uma nota que ninguém pode contestar é uma
 * nota em que ninguém confia, e a primeira vez que ela discordar do faro do
 * gestor, ela perde.
 *
 * Aqui a fórmula é pública: três notas parciais, pesos declarados, e o
 * número de resultados que sustenta tudo. A tela mostra isso no detalhe.
 *
 * Nenhum dado novo: custo por resultado, CTR, hook e hold já chegam por
 * anúncio na resposta que a galeria carrega hoje.
 */

export type Veredito = 'escalar' | 'manter' | 'observar' | 'revisar' | 'sem_retorno';

export const ROTULO_DO_VEREDITO: Record<Veredito, string> = {
  escalar: 'Escalar',
  manter: 'Manter',
  observar: 'Observar',
  revisar: 'Revisar',
  sem_retorno: 'Parar',
};

/**
 * Os pesos. Exportados porque a tela os MOSTRA — eles são parte da
 * resposta, não um detalhe de implementação.
 *
 * Eficiência pesa mais que o resto somado: um criativo que prende a
 * atenção e custa o dobro continua sendo um criativo caro. Retenção só
 * existe em vídeo, e quando não existe o peso dela é redistribuído entre as
 * outras duas na proporção em que já estão — uma imagem não pode ser punida
 * por não ter métrica de vídeo.
 */
export const PESOS = { eficiencia: 55, atracao: 25, retencao: 20 } as const;

/** Abaixo disso, a amostra é pequena demais para a nota afirmar algo. */
export const RESULTADOS_PARA_CONFIANCA = 10;

export interface AnuncioParaNota {
  spend: number;
  results: number;
  cost_per_result: number;
  ctr: number;
  /** Retenção nos 3 primeiros segundos. Zero em imagem. */
  hook_rate?: number;
  /** Quantos dos que ficaram 3s chegaram ao fim. Zero em imagem. */
  hold_rate?: number;
}

/** As médias da conta, contra as quais cada anúncio é medido. */
export interface ReferenciaDaConta {
  custoPorResultado: number;
  ctr: number;
  holdRate: number;
}

export interface ParcialDaNota {
  chave: 'eficiencia' | 'atracao' | 'retencao';
  rotulo: string;
  nota: number;
  peso: number;
}

export interface NotaDoCriativo {
  /** 0 a 100. */
  nota: number;
  veredito: Veredito;
  rotulo: string;
  parciais: ParcialDaNota[];
  /** Quantos resultados sustentam a nota. */
  resultados: number;
  /**
   * A amostra ainda é pequena.
   *
   * A nota continua sendo mostrada — esconder seria pior —, mas puxada para
   * o meio e marcada. Um criativo com dois resultados liderando o ranking
   * faz o cliente escalar ruído.
   */
  poucoDado: boolean;
}

const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const finito = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/**
 * Quanto menor, melhor: metade da média vale 100, a média vale 50, uma vez
 * e meia vale 0.
 */
function notaDeCusto(valor: number, referencia: number): number | null {
  if (!(referencia > 0) || !(valor > 0)) return null;
  return limitar(1.5 - valor / referencia, 0, 1) * 100;
}

/** Quanto maior, melhor — a mesma régua, espelhada. */
function notaDeTaxa(valor: number, referencia: number): number | null {
  if (!(referencia > 0) || !(valor > 0)) return null;
  return limitar(valor / referencia - 0.5, 0, 1) * 100;
}

/** As médias da conta no período, ponderadas pelo que cada anúncio moveu. */
export function referenciaDaConta(anuncios: AnuncioParaNota[]): ReferenciaDaConta {
  const gasto = anuncios.reduce((s, a) => s + finito(a.spend), 0);
  const resultados = anuncios.reduce((s, a) => s + Math.max(0, finito(a.results)), 0);

  /*
   * CTR e hold entram como média simples dos anúncios que os têm, e não
   * ponderada pelo gasto: a pergunta aqui é "este criativo prende mais
   * atenção que os outros criativos desta conta?", e nela cada peça vale
   * uma, independente da verba que recebeu.
   */
  const comCtr = anuncios.map((a) => finito(a.ctr)).filter((v) => v > 0);
  const comHold = anuncios.map((a) => finito(a.hold_rate)).filter((v) => v > 0);
  const media = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0);

  return {
    custoPorResultado: resultados > 0 ? gasto / resultados : 0,
    ctr: media(comCtr),
    holdRate: media(comHold),
  };
}

function vereditoDa(nota: number): Veredito {
  if (nota >= 75) return 'escalar';
  if (nota >= 55) return 'manter';
  if (nota >= 35) return 'observar';
  return 'revisar';
}

export function notaDoCriativo(a: AnuncioParaNota, ref: ReferenciaDaConta): NotaDoCriativo {
  const resultados = Math.max(0, finito(a.results));

  /*
   * Gastou e não trouxe nada: não há nota a calcular.
   *
   * É o mesmo princípio das faixas de verba — não é "ficou caro", é "não
   * voltou". Uma nota baixa sugeriria que existe um número a melhorar;
   * zero diz o que é.
   */
  if (finito(a.spend) > 0 && resultados === 0) {
    return {
      nota: 0, veredito: 'sem_retorno', rotulo: ROTULO_DO_VEREDITO.sem_retorno,
      parciais: [], resultados: 0, poucoDado: false,
    };
  }

  const brutas: { chave: ParcialDaNota['chave']; rotulo: string; nota: number | null; peso: number }[] = [
    { chave: 'eficiencia', rotulo: 'Custo', nota: notaDeCusto(finito(a.cost_per_result), ref.custoPorResultado), peso: PESOS.eficiencia },
    { chave: 'atracao', rotulo: 'CTR', nota: notaDeTaxa(finito(a.ctr), ref.ctr), peso: PESOS.atracao },
    { chave: 'retencao', rotulo: 'Retenção', nota: notaDeTaxa(finito(a.hold_rate), ref.holdRate), peso: PESOS.retencao },
  ];

  const validas = brutas.filter((p): p is typeof p & { nota: number } => p.nota !== null);
  if (validas.length === 0) {
    return {
      nota: 50, veredito: 'observar', rotulo: ROTULO_DO_VEREDITO.observar,
      parciais: [], resultados, poucoDado: true,
    };
  }

  // O peso da parcial ausente é redistribuído entre as presentes, na
  // proporção em que já estão.
  const somaDosPesos = validas.reduce((s, p) => s + p.peso, 0);
  const bruta = validas.reduce((s, p) => s + p.nota * (p.peso / somaDosPesos), 0);

  /*
   * Amostra pequena puxa a nota para o meio.
   *
   * Sem isto, um criativo com dois resultados baratos lidera o ranking e o
   * cliente escala ruído. A nota não desaparece — ela fica menos confiante,
   * que é a verdade.
   */
  const confianca = limitar(resultados / RESULTADOS_PARA_CONFIANCA, 0, 1);
  const nota = Math.round(50 + (bruta - 50) * confianca);

  return {
    nota,
    veredito: vereditoDa(nota),
    rotulo: ROTULO_DO_VEREDITO[vereditoDa(nota)],
    parciais: validas.map((p) => ({
      chave: p.chave, rotulo: p.rotulo, nota: Math.round(p.nota),
      peso: Math.round((p.peso / somaDosPesos) * 100),
    })),
    resultados,
    poucoDado: confianca < 1,
  };
}

export interface ResumoDasNotas {
  media: number;
  escalar: number;
  parar: number;
  total: number;
}

/** O resumo do topo: a média e os dois extremos que pedem ação. */
export function resumoDasNotas(notas: NotaDoCriativo[]): ResumoDasNotas {
  if (notas.length === 0) return { media: 0, escalar: 0, parar: 0, total: 0 };
  const soma = notas.reduce((s, n) => s + n.nota, 0);
  return {
    media: Math.round(soma / notas.length),
    escalar: notas.filter((n) => n.veredito === 'escalar').length,
    parar: notas.filter((n) => n.veredito === 'sem_retorno' || n.veredito === 'revisar').length,
    total: notas.length,
  };
}
