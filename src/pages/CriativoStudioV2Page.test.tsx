import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PREVIEW_ASSETS } from '@/features/creative-studio/shell/studioPreviewFixtures';

const navigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<typeof import('react-router-dom')>('react-router-dom')),
  useNavigate: () => navigate,
}));

const listCreativeAssets = vi.fn();
const listRecentProjects = vi.fn();
vi.mock('@/features/creative-studio/api/creativeAssets', () => ({
  listCreativeAssets: (...a: any[]) => listCreativeAssets(...a),
}));
vi.mock('@/features/creative-studio/api/projectRepository', () => ({
  listRecentProjects: (...a: any[]) => listRecentProjects(...a),
}));

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ toast: (...a: any[]) => toast(...a) }));

import CriativoStudioV2Page from './CriativoStudioV2Page';

const PROJETO = {
  id: 'proj-1', title: 'Campanha de Verão', status: 'active',
  selected_aspect_ratio: '4:5', selected_resolution: '2K',
  thumbnail_url: null, updated_at: '2026-08-18T10:00:00.000Z',
};

function montar() {
  return render(<MemoryRouter><CriativoStudioV2Page /></MemoryRouter>);
}

const cards = () => [...document.querySelectorAll('.studio-asset-surface')];

describe('CriativoStudioV2Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listCreativeAssets.mockResolvedValue(PREVIEW_ASSETS);
    listRecentProjects.mockResolvedValue([PROJETO]);
  });

  it('desenha o acervo real do projeto mais recente', async () => {
    montar();
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));
    expect(screen.getByText('Campanha de Verão')).toBeTruthy();
  });

  it('diz na cara que é prévia em leitura', async () => {
    // Sem o aviso, o silêncio dos botões é lido como defeito: a conclusão
    // do usuário seria que o Studio quebrou, não que a versão não liga.
    montar();
    await waitFor(() => expect(screen.getByText('Prévia')).toBeTruthy());
    expect(screen.getByText(/Gerar e transformar seguem no Studio atual/)).toBeTruthy();
  });

  it('a biblioteca de referências mostra insumo, que o canvas esconde', async () => {
    montar();
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));

    const naGrade = cards().length;
    fireEvent.click(screen.getByRole('button', { name: /Referências/ }));

    // A referência existe na amostra e não aparecia no canvas.
    await waitFor(() => expect(cards()).toHaveLength(1));
    expect(naGrade).toBeGreaterThan(1);
  });

  it('gerar avisa em vez de tentar', async () => {
    // Ligar meia geração produziria o pior dos mundos: um botão que responde
    // e não conclui.
    montar();
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));

    fireEvent.change(screen.getByPlaceholderText('O que você quer criar?'), {
      target: { value: 'um anúncio de verão' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gerar' }));

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Ainda não ligado nesta versão' }),
    );
  });

  it('baixar funciona de verdade, porque é leitura pura', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    montar();
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));

    const pronto = [...document.querySelectorAll('figure')]
      .find((f) => f.getAttribute('data-status') === 'ready')!;
    fireEvent.click(pronto.querySelector('.studio-asset-surface')!);

    // "Baixar" existe duas vezes de propósito: na ação rápida do card e no
    // inspetor. O teste fala do inspetor.
    const painel = screen.getByRole('complementary', { name: /inspetor/i });
    fireEvent.click([...painel.querySelectorAll('.studio-inspector-action')]
      .find((b) => b.textContent === 'Baixar')!);

    expect(open).toHaveBeenCalledTimes(1);
    expect(toast).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it('falha de leitura vira erro na tela, não canvas vazio', async () => {
    listCreativeAssets.mockRejectedValue(new Error('RLS negou a consulta'));
    montar();
    await waitFor(() => expect(screen.getByText(/RLS negou a consulta/)).toBeTruthy());
    expect(screen.queryByText(/O canvas está vazio/)).toBeNull();
  });

  it('leva de volta ao Studio atual', async () => {
    montar();
    await waitFor(() => expect(screen.getByText('Prévia')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Abrir o Studio atual' }));
    expect(navigate).toHaveBeenCalledWith('/criativo-studio');
  });
});
