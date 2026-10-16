import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SegmentsCard } from './SegmentsCard';

const l = (chave: string, spend: number) => ({
  chave, spend, impressions: 1000, clicks: 50, results: 10,
  cost_per_result: spend / 10, purchase_value: spend * 3,
});

const idade = { chave: 'idade', titulo: 'Idade', subtitulo: 'Distribuição do investimento' };
const regioes = { chave: 'regioes', titulo: 'Regiões', subtitulo: 'Top 10 por investimento' };

const montar = (vistas: any[], props: any = {}) =>
  render(<SegmentsCard vistas={vistas} {...props} />);

describe('SegmentsCard', () => {
  it('mostra as maiores primeiro, com a proporção do TOTAL', () => {
    montar([{ ...idade, linhas: [l('25-34', 200), l('35-44', 800)] }]);
    expect(screen.getByText('35-44')).toBeTruthy();
    expect(screen.getByText('80.0%')).toBeTruthy();
  });

  it('a seta troca o recorte sem sair do card', () => {
    // É a promessa do carrossel: três respostas para a mesma pergunta no
    // mesmo lugar. Se a seta não trocar o conteúdo, são três cards com
    // enfeite.
    montar([
      { ...idade, linhas: [l('25-34', 1000)] },
      { ...regioes, linhas: [l('Bahia', 1000)] },
    ]);
    expect(screen.getByText('25-34')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Próximo recorte' }));
    expect(screen.getByText('Bahia')).toBeTruthy();
    expect(screen.queryByText('25-34')).toBeNull();
    expect(screen.getByText('Regiões')).toBeTruthy();
  });

  it('o ponto leva direto ao recorte, e diz em qual você está', () => {
    montar([
      { ...idade, linhas: [l('25-34', 1000)] },
      { ...regioes, linhas: [l('Bahia', 1000)] },
    ]);
    const ponto = screen.getByRole('button', { name: 'Regiões' });
    expect(screen.getByRole('button', { name: 'Idade' }).getAttribute('aria-current')).toBe('true');

    fireEvent.click(ponto);
    expect(screen.getByText('Bahia')).toBeTruthy();
    expect(ponto.getAttribute('aria-current')).toBe('true');
  });

  it('vista sem dado não vira um slide vazio no meio do caminho', () => {
    // Navegar até uma moldura é prometer informação e não entregar nada.
    montar([
      { ...idade, linhas: [l('25-34', 1000)] },
      { chave: 'posicionamento', titulo: 'Posicionamento', subtitulo: 'Plataforma', linhas: [] },
      { ...regioes, linhas: [l('Bahia', 500)] },
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Próximo recorte' }));
    expect(screen.getByText('Regiões')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Posicionamento' })).toBeNull();
  });

  it('com uma vista só, não há carrossel para navegar', () => {
    montar([{ ...idade, linhas: [l('25-34', 1000)] }]);
    expect(screen.queryByRole('button', { name: 'Próximo recorte' })).toBeNull();
  });

  it('nenhuma vista com dado não ocupa espaço nenhum', () => {
    const { container } = montar([{ ...idade, linhas: [] }, { ...regioes, linhas: undefined }]);
    expect(container.innerHTML).toBe('');
  });

  it('o detalhe abre DENTRO do card, não num pop-up', () => {
    // Um modal tira a pessoa do painel para aprofundar um bloco dele, e ao
    // fechar ela volta sem o contexto que tinha.
    montar([{ ...idade, linhas: [l('a', 100), l('b', 50), l('c', 30), l('d', 10)] }]);
    fireEvent.click(screen.getByText('Ver todos os 4'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText(/nível da conta/)).toBeTruthy();
    expect(screen.getByText('Ocultar detalhes')).toBeTruthy();
  });

  it('"Ver todos" só aparece quando há o que ver a mais', () => {
    montar([{ ...idade, linhas: [l('a', 100), l('b', 50)] }]);
    expect(screen.queryByText(/Ver todos/)).toBeNull();
  });

  it('trocar de recorte fecha o segundo nível junto', () => {
    // O sub-recorte "Posição" não existe em "Idade": deixá-lo ligado
    // mostraria o rótulo de um card no conteúdo de outro.
    montar([
      {
        chave: 'posicionamento', titulo: 'Posicionamento', subtitulo: 'Plataforma',
        linhas: [l('instagram', 1000)],
        alternativa: { rotulo: 'Posição', linhas: [l('instagram_stories', 1000)] },
      },
      { ...idade, linhas: [l('25-34', 1000)] },
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Posição' }));
    expect(screen.getByText('Stories')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Próximo recorte' }));
    fireEvent.click(screen.getByRole('button', { name: 'Recorte anterior' }));
    expect(screen.getByText('Instagram')).toBeTruthy();
    expect(screen.queryByText('Stories')).toBeNull();
  });

  it('a frase do detalhe usa a unidade do cliente, no plural certo', () => {
    montar(
      [{ ...idade, linhas: [l('a', 100), l('b', 50), l('c', 30), l('d', 10)] }],
      { resultType: 'video_view' },
    );
    fireEvent.click(screen.getByText('Ver todos os 4'));
    expect(screen.getAllByText(/visualizações/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/por visualização/).length).toBeGreaterThan(0);
  });

  it('carregando ocupa o lugar, para a tela não pular quando chegar', () => {
    const { container } = montar([{ ...idade, linhas: undefined }], { carregando: true });
    expect(container.innerHTML).not.toBe('');
    expect(screen.getByText('Carregando segmentação')).toBeTruthy();
  });
});
