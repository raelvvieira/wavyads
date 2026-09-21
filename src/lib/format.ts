/**
 * Os dois formatadores da interface.
 *
 * Viviam em `src/data/mock.ts`, ao lado de campanhas e clientes fictícios —
 * e dez componentes importavam daquele arquivo. Um mock com consumidores
 * reais é um convite: alguém precisa de um fallback, encontra dados prontos
 * ali, e a tela passa a exibir números inventados sem avisar. Foi
 * exatamente o que aconteceu no dashboard do cliente.
 *
 * Os mocks morreram; os formatadores mudaram de casa para que o nome do
 * arquivo pare de ser um convite.
 */

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
  if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K';
  return value.toString();
}
