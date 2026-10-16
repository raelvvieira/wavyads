import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BudgetBandsCard } from './BudgetBandsCard';

const campanha = (p: any = {}) => ({
  id: 'a', name: 'A', spend: 1000, results: 20, cost_per_result: 50, ...p,
});

const montar = (campaigns: any[], resultType?: string) =>
  render(
    <TooltipProvider>
      <BudgetBandsCard campaigns={campaigns} resultType={resultType} />
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
    montar([campanha()], 'purchase');
    expect(screen.getByText(/por compra na média da conta/)).toBeTruthy();
  });

  it('a frase aponta o dinheiro que não voltou', () => {
    montar([
      campanha({ id: '1', spend: 5000, results: 200, cost_per_result: 25 }),
      campanha({ id: '2', spend: 222, results: 0 }),
    ]);
    // Uma só no card: o detalhe está fechado.
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

describe('o detalhe das faixas', () => {
  const abrir = (campanhas: any[]) => {
    montar(campanhas);
    fireEvent.click(screen.getByText('Ver detalhes'));
  };

  it('a tabela mostra as cinco faixas, inclusive as vazias', () => {
    // Uma tabela que esconde as faixas zeradas muda de altura a cada
    // período, e o olho perde a referência de onde olhar.
    abrir([campanha({ spend: 1000, results: 40, cost_per_result: 25 })]);
    for (const r of ['Escalar', 'Manter', 'Observar', 'Revisar', 'Sem retorno']) {
      expect(screen.getAllByText(r).length).toBeGreaterThan(0);
    }
  });

  it('diz QUAIS campanhas estão sem retorno, não só quantas', () => {
    // "1 campanha sem retorno" sem dizer qual não é acionável.
    abrir([
      campanha({ id: '1', name: 'BOA', spend: 900, results: 36, cost_per_result: 25 }),
      campanha({ id: '2', name: 'se_conv_tp_view', spend: 222, results: 0 }),
    ]);
    expect(screen.getByText(/se_conv_tp_view/)).toBeTruthy();
  });

  it('as três frases abrem o que o card resume em uma', () => {
    abrir([
      campanha({ id: '1', name: 'A', spend: 600, results: 24, cost_per_result: 25 }),
      campanha({ id: '2', name: 'B', spend: 300, results: 3, cost_per_result: 100 }),
      campanha({ id: '3', name: 'C', spend: 100, results: 0 }),
    ]);
    expect(screen.getByText(/performa na média ou melhor/)).toBeTruthy();
    expect(screen.getByText(/acima do custo médio/)).toBeTruthy();
    // Duas: a frase do card e a do detalhe. As duas devem existir.
    expect(screen.getAllByText(/sem nenhum resultado/).length).toBe(2);
  });

  it('o detalhe abre DENTRO do card, não num pop-up, e fecha pelo mesmo botão', () => {
    // Um modal tira a pessoa do painel para aprofundar um bloco dele, e ao
    // fechar ela volta sem o contexto que tinha. E um botão que só abre
    // deixa o card inchado sem saída.
    montar([campanha({ spend: 1000, results: 40, cost_per_result: 25 })]);
    const botao = screen.getByText('Ver detalhes');
    fireEvent.click(botao);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('Ocultar detalhes')).toBeTruthy();

    fireEvent.click(screen.getByText('Ocultar detalhes'));
    expect(screen.queryByText('Escalar')).toBeNull();
    expect(screen.getByText('Ver detalhes')).toBeTruthy();
  });

  it('o custo da faixa é o da faixa inteira, não a média das campanhas', () => {
    // Média de médias distorce aqui pelo mesmo motivo que distorce na régua.
    abrir([
      campanha({ id: '1', name: 'A', spend: 900, results: 36, cost_per_result: 25 }),
      campanha({ id: '2', name: 'B', spend: 100, results: 4, cost_per_result: 25 }),
    ]);
    // 1000 / 40 = R$ 25,00 na faixa inteira.
    expect(screen.getAllByText(/R\$\s?25,00/).length).toBeGreaterThan(0);
  });
});
