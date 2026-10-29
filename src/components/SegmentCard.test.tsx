import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SegmentCard } from './SegmentCard';

const l = (chave: string, spend: number) => ({
  chave, spend, impressions: 1000, clicks: 50, results: 10,
  cost_per_result: spend / 10, purchase_value: spend * 3,
});

const montar = (props: any = {}) =>
  render(<SegmentCard titulo="Idade" subtitulo="Distribuição do investimento" {...props} />);

describe('SegmentCard', () => {
  it('mostra as maiores primeiro, com a proporção do TOTAL', () => {
    montar({ linhas: [l('25-34', 200), l('35-44', 800)] });
    expect(screen.getByText('35-44')).toBeTruthy();
    expect(screen.getByText('80.0%')).toBeTruthy();
  });

  it('segmento sem dado não ocupa espaço nenhum', () => {
    // Card vazio com título promete informação e entrega moldura — e numa
    // fileira de três, o buraco ainda desalinha os vizinhos.
    const { container } = montar({ linhas: [] });
    expect(container.innerHTML).toBe('');
  });

  it('"Ver todos" só aparece quando há o que ver a mais', () => {
    const { unmount } = montar({ linhas: [l('a', 100), l('b', 50)] });
    expect(screen.queryByText(/Ver todos/)).toBeNull();
    unmount();

    montar({ linhas: [l('a', 100), l('b', 50), l('c', 30), l('d', 10)] });
    expect(screen.getByText('Ver todos os 4')).toBeTruthy();
  });

  it('o detalhe abre DENTRO do card, não num pop-up, e fecha pelo mesmo botão', () => {
    // Um modal tira a pessoa do painel para aprofundar um bloco dele, e ao
    // fechar ela volta sem o contexto que tinha.
    montar({ linhas: [l('a', 100), l('b', 50), l('c', 30), l('d', 10)] });
    fireEvent.click(screen.getByText('Ver todos os 4'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText(/nível da conta/)).toBeTruthy();

    fireEvent.click(screen.getByText('Ocultar detalhes'));
    expect(screen.queryByText(/nível da conta/)).toBeNull();
  });

  it('o segundo recorte troca o conteúdo sem trocar o card', () => {
    // Plataforma × Posição são a mesma pergunta em dois níveis; dois cards
    // para isso gastariam metade da fileira.
    montar({
      linhas: [l('instagram', 1000)],
      alternativa: { rotulo: 'Posição', linhas: [l('instagram_stories', 1000)] },
    });
    expect(screen.getByText('Instagram')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Posição' }));
    expect(screen.getByText('Stories')).toBeTruthy();
    expect(screen.queryByText('Instagram')).toBeNull();
  });

  it('a frase do detalhe usa a unidade do cliente, no plural certo', () => {
    // O rótulo da tabela é cabeçalho de coluna — "Visualizações da página
    // de destino" não cabe dentro de uma frase.
    montar({
      linhas: [l('a', 100), l('b', 50), l('c', 30), l('d', 10)],
      resultType: 'video_view',
    });
    fireEvent.click(screen.getByText('Ver todos os 4'));
    expect(screen.getAllByText(/visualizações/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/por visualização/).length).toBeGreaterThan(0);
  });

  it('carregando ocupa o lugar, para a fileira não pular quando chegar', () => {
    const { container } = montar({ linhas: undefined, carregando: true });
    expect(container.innerHTML).not.toBe('');
    expect(screen.getByText('Carregando segmentação')).toBeTruthy();
  });

  it('nenhum contorno do card é pintado de branco', () => {
    // O painel tem tema claro. Uma borda `white/15` sobre fundo branco é
    // borda nenhuma: o gatilho "Ver todos" voltaria a ser texto solto e os
    // trilhos das barras sumiriam.
    const { container } = montar({ linhas: [l('a', 100), l('b', 50), l('c', 30), l('d', 10)] });
    fireEvent.click(screen.getByText('Ver todos os 4'));
    const brancos = [...container.querySelectorAll('[class]')]
      .map((e) => e.getAttribute('class') ?? '')
      .filter((c) => /(border|bg)-white\//.test(c));
    expect(brancos).toEqual([]);
  });
});
