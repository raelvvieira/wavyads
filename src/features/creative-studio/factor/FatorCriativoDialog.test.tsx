import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FatorCriativoDialog } from './FatorCriativoDialog';
import { emptyOfferIntelligence, type OfferIntelligence } from '../types/factorCreative';

function briefingInferido(patch: Partial<OfferIntelligence> = {}): OfferIntelligence {
  return {
    ...emptyOfferIntelligence(),
    productName: 'Películas Arquitetônicas',
    category: 'Serviço residencial',
    offerDescription: 'Instalação de película de controle solar em janelas',
    audience: ['moradores de casa térrea'],
    pains: ['vizinho enxerga dentro de casa'],
    ...patch,
  };
}

function montar(props: Partial<React.ComponentProps<typeof FatorCriativoDialog>> = {}) {
  const onSubmit = vi.fn();
  const onClose = vi.fn();
  render(
    <FatorCriativoDialog
      open
      briefing={briefingInferido()}
      analisando={false}
      onClose={onClose}
      onSubmit={onSubmit}
      {...props}
    />,
  );
  return { onSubmit, onClose };
}

describe('FatorCriativoDialog', () => {
  it('enquanto analisa, avisa que está lendo a oferta em vez de mostrar campos vazios', () => {
    montar({ analisando: true, briefing: null });
    expect(screen.getByText(/Lendo a oferta/)).toBeTruthy();
    expect(screen.queryByPlaceholderText(/Nome do produto/)).toBeNull();
  });

  it('o briefing inferido chega editável, não como texto fixo', () => {
    montar();
    expect(screen.getByDisplayValue('Películas Arquitetônicas')).toBeTruthy();
    expect(screen.getByDisplayValue(/Instalação de película/)).toBeTruthy();
    // As listas viram chips removíveis.
    expect(screen.getByRole('button', { name: 'Remover vizinho enxerga dentro de casa' })).toBeTruthy();
  });

  it('provas nascem vazias, com o aviso de que nada é inventado', () => {
    // A spec proíbe inferir número, depoimento ou case — prova só entra se
    // uma pessoa colocar.
    montar();
    expect(screen.getByText(/o sistema não inventa número, depoimento/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Remover .*%/ })).toBeNull();
  });

  it('dá para adicionar uma prova real, e ela vai marcada como aprovada', () => {
    const { onSubmit } = montar();
    fireEvent.change(screen.getByLabelText('Provas'), { target: { value: '+400 janelas instaladas em 2025' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar em Provas' }));
    fireEvent.click(screen.getByRole('button', { name: /Gerar 5 variações/ }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      offerIntelligence: expect.objectContaining({
        proofs: [expect.objectContaining({ content: '+400 janelas instaladas em 2025', approvedForAds: true })],
      }),
    }));
  });

  it('modo automático é o padrão e não pede escolha de ângulo', () => {
    montar();
    expect(screen.getByRole('button', { name: 'Automático' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Problema' })).toBeNull();
  });

  it('modo "escolher" revela os 12 ângulos e numera a ordem', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Escolher' }));

    expect(screen.getByRole('button', { name: 'Problema' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Bastidores' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Prova' }));
    fireEvent.click(screen.getByRole('button', { name: 'Facilidade' }));
    // O número mostra a ordem em que as variações vão sair.
    expect(screen.getByRole('button', { name: '1 Prova' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '2 Facilidade' })).toBeTruthy();
  });

  it('escolher trava em 5 — não há sexto slot onde caber', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Escolher' }));
    ['Problema', 'Mecanismo', 'Prova', 'Contraste', 'Objeção'].forEach((rotulo) => {
      fireEvent.click(screen.getByRole('button', { name: rotulo }));
    });
    expect(screen.getByRole('button', { name: 'Identidade' })).toBeDisabled();
  });

  it('sem descrever a oferta, não deixa gerar', () => {
    montar({ briefing: emptyOfferIntelligence() });
    expect(screen.getByRole('button', { name: /Gerar 5 variações/ })).toBeDisabled();
  });

  it('falha na análise mostra o motivo e ainda deixa preencher à mão', () => {
    montar({ briefing: null, erroAnalise: 'IA fora do ar' });
    expect(screen.getByText(/IA fora do ar/)).toBeTruthy();
    expect(screen.getByPlaceholderText(/Nome do produto/)).toBeTruthy();
  });

  it('gerando: o botão avisa e trava', () => {
    montar({ busy: true });
    expect(screen.getByRole('button', { name: /Gerando/ })).toBeDisabled();
  });
});
