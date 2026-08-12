/**
 * Tema único dos gráficos no padrão WAVY.
 *
 * Cor de série é DADO, não marca: pintar tudo de laranja destruiria a
 * distinção entre métricas. O que o padrão pede aqui é uma paleta categórica
 * acessível e um tratamento consistente de eixo, grade e tooltip — vindos dos
 * mesmos tokens do resto do produto.
 */

/** Superfícies e traços do gráfico, alinhados aos tokens WAVY. */
export const chartSurface = {
  grid: 'rgba(255,255,255,0.06)',
  axisTick: 'rgba(255,255,255,0.55)',
  axisFontSize: 11,
  tooltipBackground: 'var(--wavy-surface-elevated)',
  tooltipBorder: 'var(--wavy-border)',
} as const;

/**
 * Paleta categórica. Matizes escolhidos para se distinguirem entre si e do
 * laranja da marca — antes, o âmbar de "Leads" ficava a poucos graus do
 * #FF831E e passava a leitura de "isto é uma ação", não "isto é uma série".
 */
export const chartSeriesPalette = {
  spend: '#22C55E',
  clicks: '#06B6D4',
  impressions: '#3B82F6',
  leads: '#EAB308',
  purchases: '#D946EF',
  results: '#14B8A6',
  costPerResult: '#A855F7',
  costPerPurchase: '#F43F5E',
} as const;

/** Duração de animação do gráfico no padrão WAVY. */
export const CHART_ANIMATION_MS = 500;
