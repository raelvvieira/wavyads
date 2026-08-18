import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PREVIEW_ASSETS } from '@/features/creative-studio/shell/studioPreviewFixtures';
import type { CreativeAsset } from '@/features/creative-studio/types/creative';

const navigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<typeof import('react-router-dom')>('react-router-dom')),
  useNavigate: () => navigate,
}));

const listCreativeAssets = vi.fn();
const createCreativeAsset = vi.fn();
const updateCreativeAsset = vi.fn();
vi.mock('@/features/creative-studio/api/creativeAssets', () => ({
  listCreativeAssets: (...a: any[]) => listCreativeAssets(...a),
  createCreativeAsset: (...a: any[]) => createCreativeAsset(...a),
  updateCreativeAsset: (...a: any[]) => updateCreativeAsset(...a),
}));

const listRecentProjects = vi.fn();
const createProject = vi.fn();
vi.mock('@/features/creative-studio/api/projectRepository', () => ({
  listRecentProjects: (...a: any[]) => listRecentProjects(...a),
  createProject: (...a: any[]) => createProject(...a),
}));

const invoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...a: any[]) => invoke(...a) },
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u1' } } }) },
  },
}));

vi.mock('@/lib/aiUsageTracker', () => ({ recordAiUsage: vi.fn() }));

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ toast: (...a: any[]) => toast(...a) }));

import CriativoStudioV2Page from './CriativoStudioV2Page';

const PROJETO = {
  id: 'proj-1', title: 'Campanha de Verão', status: 'active',
  selected_aspect_ratio: '4:5', selected_resolution: '2K',
  thumbnail_url: null, updated_at: '2026-08-18T10:00:00.000Z',
};

// A amostra tem assets sem `projectId: 'proj-1'`; a página só mostra o
// acervo do projeto ativo. Reatribui para os testes verem cards de verdade.
const ASSETS_DO_PROJETO = PREVIEW_ASSETS.map((a) => ({ ...a, projectId: 'proj-1' }));

function montar() {
  return render(<MemoryRouter><CriativoStudioV2Page /></MemoryRouter>);
}

const cards = () => [...document.querySelectorAll('.studio-asset-surface')];
const prontos = () =>
  [...document.querySelectorAll('figure')].filter((f) => f.getAttribute('data-status') === 'ready');

describe('CriativoStudioV2Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listCreativeAssets.mockResolvedValue(ASSETS_DO_PROJETO);
    listRecentProjects.mockResolvedValue([PROJETO]);
  });

  it('desenha o acervo real do projeto mais recente', async () => {
    montar();
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));
    expect(screen.getByText('Campanha de Verão')).toBeTruthy();
  });

  it('diz na cara que é prévia, mas nomeia o que já funciona', async () => {
    montar();
    await waitFor(() => expect(screen.getByText('Prévia')).toBeTruthy());
    expect(screen.getByText(/Gerar, editar e redimensionar já funcionam aqui/)).toBeTruthy();
  });

  it('a biblioteca de referências mostra insumo, que o canvas esconde', async () => {
    montar();
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));
    const naGrade = cards().length;
    fireEvent.click(screen.getByRole('button', { name: /Referências/ }));
    await waitFor(() => expect(cards()).toHaveLength(1));
    expect(naGrade).toBeGreaterThan(1);
  });

  it('gerar sem seleção cria a arte e a mostra pronta', async () => {
    createCreativeAsset.mockResolvedValue({
      id: 'nova', projectId: 'proj-1', clientId: null, type: 'original', status: 'generating',
      url: null, thumbnailUrl: null, parentAssetId: null, rootAssetId: null, groupId: null,
      factorAxis: null, aspectRatio: '4:5', resolution: '2K', width: null, height: null,
      prompt: 'p', negativePrompt: null, model: 'gpt-image-2', errorMessage: null, filename: null,
      isClientIntelligence: false, metadata: {},
      createdAt: '2026-08-18T12:00:00.000Z', updatedAt: '2026-08-18T12:00:00.000Z',
    } satisfies CreativeAsset);
    invoke.mockResolvedValue({ data: { imageUrl: 'https://x/nova.png' }, error: null });
    updateCreativeAsset.mockImplementation(async (id: string, patch: any) => ({
      ...(await createCreativeAsset.mock.results[0].value), id, ...patch,
    }));

    montar();
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));

    fireEvent.change(screen.getByPlaceholderText('O que você quer criar?'), {
      target: { value: 'lançamento de verão' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Gerar' }));
    });

    expect(createCreativeAsset).toHaveBeenCalledWith(expect.objectContaining({ type: 'original', status: 'generating' }));
    expect(invoke).toHaveBeenCalledWith('criativo-generate', expect.objectContaining({
      body: expect.objectContaining({ formatRatio: '4:5' }),
    }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Arte gerada' })));
  });

  it('gerar sem projeto ainda existente cria o projeto primeiro', async () => {
    listRecentProjects.mockResolvedValue([]);
    createProject.mockResolvedValue({ id: 'proj-novo', title: 'Novo projeto' });
    createCreativeAsset.mockResolvedValue({
      id: 'nova', projectId: 'proj-novo', clientId: null, type: 'original', status: 'generating',
      url: null, thumbnailUrl: null, parentAssetId: null, rootAssetId: null, groupId: null,
      factorAxis: null, aspectRatio: '4:5', resolution: '2K', width: null, height: null,
      prompt: 'p', negativePrompt: null, model: 'gpt-image-2', errorMessage: null, filename: null,
      isClientIntelligence: false, metadata: {},
      createdAt: '2026-08-18T12:00:00.000Z', updatedAt: '2026-08-18T12:00:00.000Z',
    } satisfies CreativeAsset);
    invoke.mockResolvedValue({ data: { imageUrl: 'https://x/nova.png' }, error: null });
    updateCreativeAsset.mockImplementation(async (id: string, patch: any) => ({ id, ...patch }));

    montar();
    await waitFor(() => expect(listCreativeAssets).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText('O que você quer criar?'), { target: { value: 'x' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Gerar' }));
    });

    expect(createProject).toHaveBeenCalledTimes(1);
    expect(createCreativeAsset).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'proj-novo' }));
  });

  it('geração com erro do provedor marca a arte como falha, sem travar o dock', async () => {
    createCreativeAsset.mockResolvedValue({
      id: 'nova', projectId: 'proj-1', clientId: null, type: 'original', status: 'generating',
      url: null, thumbnailUrl: null, parentAssetId: null, rootAssetId: null, groupId: null,
      factorAxis: null, aspectRatio: '4:5', resolution: '2K', width: null, height: null,
      prompt: 'p', negativePrompt: null, model: 'gpt-image-2', errorMessage: null, filename: null,
      isClientIntelligence: false, metadata: {},
      createdAt: '2026-08-18T12:00:00.000Z', updatedAt: '2026-08-18T12:00:00.000Z',
    } satisfies CreativeAsset);
    invoke.mockResolvedValue({ data: null, error: new Error('formato recusado') });
    updateCreativeAsset.mockImplementation(async (id: string, patch: any) => ({ id, status: 'failed', ...patch }));

    montar();
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));

    fireEvent.change(screen.getByPlaceholderText('O que você quer criar?'), { target: { value: 'x' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Gerar' }));
    });

    await waitFor(() => expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Erro ao gerar', variant: 'destructive' }),
    ));
    // O dock volta a aceitar comando — não fica presa em "busy".
    expect(screen.getByRole('button', { name: 'Gerar' })).toBeTruthy();
  });

  it('editar com uma arte selecionada chama criativo-edit-image, não criativo-generate', async () => {
    updateCreativeAsset.mockImplementation(async (id: string, patch: any) => ({ id, ...patch }));
    createCreativeAsset.mockResolvedValue({
      id: 'filha', projectId: 'proj-1', clientId: null, type: 'edited', status: 'generating',
      url: null, thumbnailUrl: null, parentAssetId: 'a1', rootAssetId: 'a1', groupId: null,
      factorAxis: null, aspectRatio: '4:5', resolution: '2K', width: null, height: null,
      prompt: null, negativePrompt: null, model: 'gemini-3.1-flash-image-preview', errorMessage: null,
      filename: null, isClientIntelligence: false, metadata: {},
      createdAt: '2026-08-18T12:00:00.000Z', updatedAt: '2026-08-18T12:00:00.000Z',
    } satisfies CreativeAsset);
    invoke.mockResolvedValue({ data: { editedImageUrl: 'https://x/editada.png' }, error: null });

    montar();
    await waitFor(() => expect(prontos().length).toBeGreaterThan(0));
    fireEvent.click(prontos()[0].querySelector('.studio-asset-surface')!);

    fireEvent.change(screen.getByPlaceholderText('O que você quer alterar nesta arte?'), {
      target: { value: 'deixa mais escuro' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Gerar' }));
    });

    expect(invoke).toHaveBeenCalledWith('criativo-edit-image', expect.anything());
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Edição aplicada' })));
  });

  it('retentar uma arte que falhou chama o provedor de novo, sem duplicar o card', async () => {
    // A amostra tem uma falha sem prompt salvo (simula uma linha antiga) —
    // esta arte precisa de um prompt de verdade para exercitar o caminho de
    // rede em vez da recusa de "sem prompt salvo".
    const original = ASSETS_DO_PROJETO.find((a) => a.status === 'failed')!;
    const comFalha = { ...original, prompt: 'anúncio recusado pelo provedor' };
    listCreativeAssets.mockResolvedValue(ASSETS_DO_PROJETO.map((a) => (a.id === comFalha.id ? comFalha : a)));
    updateCreativeAsset.mockImplementation(async (id: string, patch: any) => ({ ...comFalha, id, ...patch }));
    invoke.mockResolvedValue({ data: { imageUrl: 'https://x/ok.png' }, error: null });

    montar();
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));
    const totalAntes = cards().length;

    const cardFalhou = [...document.querySelectorAll('figure')].find((f) => f.getAttribute('data-status') === 'failed')!;
    await act(async () => {
      fireEvent.click(cardFalhou.querySelector<HTMLButtonElement>('.studio-asset-action[aria-label="Tentar novamente"]')!);
    });

    expect(invoke).toHaveBeenCalledWith('criativo-generate', expect.anything());
    expect(createCreativeAsset).not.toHaveBeenCalled();
    await waitFor(() => expect(cards()).toHaveLength(totalAntes));
  });

  it('baixar funciona de verdade, porque é leitura pura', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    montar();
    await waitFor(() => expect(prontos().length).toBeGreaterThan(0));

    fireEvent.click(prontos()[0].querySelector('.studio-asset-surface')!);
    const painel = screen.getByRole('complementary', { name: /inspetor/i });
    fireEvent.click([...painel.querySelectorAll('.studio-inspector-action')].find((b) => b.textContent === 'Baixar')!);

    expect(open).toHaveBeenCalledTimes(1);
    expect(invoke).not.toHaveBeenCalled();
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
