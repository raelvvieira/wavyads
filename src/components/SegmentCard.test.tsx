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
    // Card vazio com título promete informação e entrega moldura.
    const { container } = montar({ linhas: [] });
    expect(container.innerHTML).toBe('');
  });

  it('"Ver detalhes" só aparece quando há o que ver a mais', () => {
    const { unmount } = montar({ linhas: [l('a', 100), l('b', 50)] });
    expect(screen.queryByText('Ver detalhes')).toBeNull();
    unmount();

    montar({ linhas: [l('a', 100), l('b', 50), l('c', 30), l('d', 10)] });
    expect(screen.getByText('Ver detalhes')).toBeTruthy();
  });

  it('o detalhe traz a ressalva que evita o chamado de "não bate com a tabela"', () => {
    montar({ linhas: [l('a', 100), l('b', 50), l('c', 30), l('d', 10)] });
    fireEvent.click(screen.getByText('Ver detalhes'));
    expect(screen.getByText(/nível da conta/)).toBeTruthy();
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

  it('carregando ocupa o lugar, para a fileira não pular quando chegar', () => {
    const { container } = montar({ linhas: undefined, carregando: true });
    expect(container.innerHTML).not.toBe('');
    expect(screen.getByText('Carregando segmentação')).toBeTruthy();
  });
});
