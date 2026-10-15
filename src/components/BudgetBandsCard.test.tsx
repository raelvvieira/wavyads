import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BudgetBandsCard } from './BudgetBandsCard';

const campanha = (p: any = {}) => ({
  id: 'a', name: 'A', spend: 1000, results: 20, cost_per_result: 50, ...p,
});

const montar = (campaigns: any[], resultLabel?: string) =>
  render(
    <TooltipProvider>
      <BudgetBandsCard campaigns={campaigns} resultLabel={resultLabel} />
    </TooltipProvider>,
  );

const barras = () => [...document.querySelectorAll('[aria-label]')]
  .filter((e) => /%$/.test(e.getAttribute('aria-label') ?? ''));

describe('BudgetBandsCard', () => {
  it('a barra existe e suas larguras somam a verba inteira', () => {
    // A proporção É a informação: se as larguras não fecham 100%, a barra
    // mente sobre onde o dinheiro está.
    montar([
      campanha({ id: '1', spend: 700, results: 28, cost_per_result: 25 }),
      campanha({ id: '2', spend: 300, results: 3, cost_per_result: 100 }),
    ]);
    const larguras = barras().map((e) => parseFloat((e as HTMLElement).style.width));
    expect(larguras.length).toBeGreaterThan(1);
    expect(Math.round(larguras.reduce((s, w) => s + w, 0))).toBe(100);
  });

  it('a régua aparece em letra miúda — veredito sem referência ninguém confere', () => {
    montar([campanha({ spend: 1000, results: 20, cost_per_result: 50 })], 'lead');
    expect(screen.getByText(/por lead na média da conta/)).toBeTruthy();
  });

  it('o rótulo do resultado é o do cliente, não "resultado" para todo mundo', () => {
    montar([campanha()], 'compra');
    expect(screen.getByText(/por compra na média da conta/)).toBeTruthy();
  });

  it('a frase aponta o dinheiro que não voltou', () => {
    montar([
      campanha({ id: '1', spend: 5000, results: 200, cost_per_result: 25 }),
      campanha({ id: '2', spend: 222, results: 0 }),
    ]);
    expect(screen.getByText(/sem nenhum resultado/)).toBeTruthy();
  });

  it('sem verba no período, o bloco não ocupa espaço nenhum', () => {
    // Um card vazio com título é pior que card nenhum: ele promete
    // informação e entrega moldura.
    const { container } = montar([campanha({ spend: 0, results: 0 })]);
    expect(container.innerHTML).toBe('');
  });

  it('faixa sem verba não vira um segmento invisível na barra', () => {
    // Segmentos de largura zero quebram o arredondamento e põem alvos de
    // hover onde não há nada para ver.
    montar([campanha({ spend: 1000, results: 40, cost_per_result: 25 })]);
    expect(barras().every((e) => parseFloat((e as HTMLElement).style.width) > 0)).toBe(true);
  });
});
