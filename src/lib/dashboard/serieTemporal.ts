/**
 * A série do gráfico, em dia, semana ou mês.
 *
 * O painel tinha um gráfico diário e só. Num período de seis meses isso são
 * 180 pontos espremidos — um borrão em que nenhuma tendência aparece. O
 * benchmark resolve com um seletor de granularidade, e é o que falta aqui.
 *
 * O módulo é puro, e existe separado por um motivo específico: **métrica
 * derivada não se soma nem se tira média**. CTR da semana não é a média dos
 * sete CTRs diários — é a soma dos cliques dividida pela soma das
 * impressões. Um dia com 3 impressões e 1 clique tem CTR de 33%, e deixá-lo
 * puxar a média da semana inventaria uma semana que não existiu.
 */

export type Granularidade = 'dia' | 'semana' | 'mes';

export interface PontoDiario {
  date: string;
  /** ISO (yyyy-mm-dd) — é o que permite agrupar. */
  date_raw?: string;
  spend?: number;
  impressions?: number;
  clicks?: number;
  leads?: number;
  purchases?: number;
  results?: number;
  conversions?: number;
}

export interface PontoDaSerie {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  purchases: number;
  results: number;
  conversions: number;
  /** Derivadas — recalculadas a partir das somas do balde, nunca mediadas. */
  ctr: number;
  cpm: number;
  cpc: number;
  cost_per_result: number;
  cost_per_purchase: number;
}

const ADITIVAS = ['spend', 'impressions', 'clicks', 'leads', 'purchases', 'results', 'conversions'] as const;

function numero(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/** Segunda-feira da semana de uma data ISO. */
function inicioDaSemana(iso: string): Date | null {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  // `getUTCDay()` devolve 0 no domingo; a semana começa na segunda.
  const desloca = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - desloca);
  return d;
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function rotuloDaSemana(d: Date): string {
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function rotuloDoMes(iso: string): string {
  const [ano, mes] = iso.split('-');
  const i = Number(mes) - 1;
  return `${MESES[i] ?? mes}/${(ano ?? '').slice(2)}`;
}

function derivar(soma: Record<string, number>): PontoDaSerie {
  const spend = soma.spend ?? 0;
  const impressions = soma.impressions ?? 0;
  const clicks = soma.clicks ?? 0;
  const results = soma.results ?? 0;
  const purchases = soma.purchases ?? 0;
  return {
    date: '',
    spend,
    impressions,
    clicks,
    leads: soma.leads ?? 0,
    purchases,
    results,
    conversions: soma.conversions ?? 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cost_per_result: results > 0 ? spend / results : 0,
    cost_per_purchase: purchases > 0 ? spend / purchases : 0,
  };
}

/**
 * Agrupa a série diária.
 *
 * Sem `date_raw` não há como saber a que semana ou mês um ponto pertence —
 * o rótulo do eixo é "dd/mm", sem ano. Nesse caso a série volta como diária
 * em vez de inventar baldes: errar o agrupamento em silêncio seria pior que
 * não agrupar.
 */
export function agregarSerie(
  diaria: PontoDiario[] | null | undefined,
  granularidade: Granularidade,
): PontoDaSerie[] {
  const pontos = (diaria ?? []).filter(Boolean);
  if (pontos.length === 0) return [];

  const comoDiaria = () => pontos.map((p) => ({ ...derivar(p as any), date: p.date }));
  if (granularidade === 'dia') return comoDiaria();
  if (pontos.some((p) => !p.date_raw)) return comoDiaria();

  const baldes = new Map<string, { rotulo: string; soma: Record<string, number> }>();
  for (const p of pontos) {
    const iso = p.date_raw!;
    let chave: string;
    let rotulo: string;

    if (granularidade === 'semana') {
      const inicio = inicioDaSemana(iso);
      if (!inicio) return comoDiaria();
      chave = inicio.toISOString().slice(0, 10);
      rotulo = rotuloDaSemana(inicio);
    } else {
      chave = iso.slice(0, 7);
      rotulo = rotuloDoMes(iso);
    }

    const balde = baldes.get(chave) ?? { rotulo, soma: {} };
    for (const k of ADITIVAS) balde.soma[k] = (balde.soma[k] ?? 0) + numero((p as any)[k]);
    baldes.set(chave, balde);
  }

  return [...baldes.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, b]) => ({ ...derivar(b.soma), date: b.rotulo }));
}

/** Quantos pontos a série teria em cada granularidade — para desabilitar o que não faz sentido. */
export function pontosPorGranularidade(diaria: PontoDiario[] | null | undefined): Record<Granularidade, number> {
  return {
    dia: agregarSerie(diaria, 'dia').length,
    semana: agregarSerie(diaria, 'semana').length,
    mes: agregarSerie(diaria, 'mes').length,
  };
}
