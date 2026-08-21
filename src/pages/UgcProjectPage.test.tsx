import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const navigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<typeof import('react-router-dom')>('react-router-dom')),
  useNavigate: () => navigate,
  useParams: () => ({ id: 'proj-1' }),
}));

const getUgcProject = vi.fn();
const listUgcClips = vi.fn();
const updateUgcProject = vi.fn();
const createUgcClip = vi.fn();
const updateUgcClip = vi.fn();
vi.mock('@/features/ugc-studio/api/ugcRepository', () => ({
  getUgcProject: (...a: any[]) => getUgcProject(...a),
  listUgcClips: (...a: any[]) => listUgcClips(...a),
  updateUgcProject: (...a: any[]) => updateUgcProject(...a),
  createUgcClip: (...a: any[]) => createUgcClip(...a),
  updateUgcClip: (...a: any[]) => updateUgcClip(...a),
}));

const writeUgcScript = vi.fn();
vi.mock('@/features/ugc-studio/api/ugcScript', () => ({
  writeUgcScript: (...a: any[]) => writeUgcScript(...a),
}));

const listCreativeAssets = vi.fn();
vi.mock('@/features/creative-studio/api/creativeAssets', () => ({
  listCreativeAssets: (...a: any[]) => listCreativeAssets(...a),
}));

vi.mock('@/features/creative-studio/api/storageUpload', () => ({
  uploadDataUrlToCreativeStorage: vi.fn(async () => 'https://x/produto.png'),
}));

const invoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...a: any[]) => invoke(...a) } },
}));

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ toast: (...a: any[]) => toast(...a) }));

import UgcProjectPage from './UgcProjectPage';

const AVATAR = {
  id: 'av-1', type: 'avatar', status: 'ready', url: 'https://x/ana.png', thumbnailUrl: null,
  metadata: { persona: { name: 'Ana Editorial' } }, filename: 'Ana Editorial',
};

const PROJETO = {
  id: 'proj-1', clientId: 'c1', title: 'Campanha de verão', avatarAssetId: 'av-1',
  tier: 'standard', productImageUrl: null, script: null, status: 'draft',
  createdAt: '2026-08-21T10:00:00.000Z', updatedAt: '2026-08-21T10:00:00.000Z',
};

const ROTEIRO = { hook: 'gancho', body_1: 'corpo um', body_2: 'corpo dois', cta: 'chamada' };

function montar() {
  return render(<MemoryRouter><UgcProjectPage /></MemoryRouter>);
}

describe('UgcProjectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUgcProject.mockResolvedValue(PROJETO);
    listUgcClips.mockResolvedValue([]);
    listCreativeAssets.mockResolvedValue([AVATAR]);
    updateUgcProject.mockImplementation(async (_id: string, patch: any) => ({ ...PROJETO, ...patch }));
    createUgcClip.mockImplementation(async (input: any) => ({
      id: `clip-${input.segment ?? input.anglePreset}`, ...input,
      url: null, thumbnailUrl: null, errorMessage: null, model: null,
      metadata: input.metadata ?? {}, status: 'generating',
      createdAt: '2026-08-21T11:00:00.000Z', updatedAt: '2026-08-21T11:00:00.000Z',
    }));
    updateUgcClip.mockImplementation(async (id: string, patch: any) => ({
      id, projectId: 'proj-1', kind: 'avatar', segment: 'hook', anglePreset: null,
      speech: null, durationSeconds: 8, resolution: '1080p', audio: true,
      metadata: {}, prompt: 'P', createdAt: 'x', updatedAt: 'x',
      url: null, thumbnailUrl: null, errorMessage: null, model: null,
      ...patch,
    }));
    invoke.mockResolvedValue({ data: { videoUrl: 'https://x/clip.mp4' }, error: null });
    writeUgcScript.mockResolvedValue({ script: ROTEIRO, wordBudget: 22 });
  });

  it('abre na etapa do roteiro, com o avatar já travado no cabeçalho', async () => {
    montar();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Campanha de verão' })).toBeTruthy());
    expect(screen.getByText(/Ana Editorial/)).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Roteiro' })).toBeTruthy();
  });

  it('sem avatar escolhido, a escolha vem ANTES das etapas', async () => {
    // O avatar vale para todos os clipes; deixar gerar antes de escolher
    // produziria segmentos com pessoas diferentes no mesmo anúncio.
    getUgcProject.mockResolvedValue({ ...PROJETO, avatarAssetId: null });
    montar();
    await waitFor(() => expect(screen.getByRole('region', { name: 'Escolher avatar' })).toBeTruthy());
    expect(screen.queryByRole('region', { name: 'Roteiro' })).toBeNull();
  });

  it('escrever o roteiro preenche os quatro segmentos, editáveis', async () => {
    montar();
    await waitFor(() => expect(screen.getByLabelText('Descrição do produto')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Descrição do produto'), {
      target: { value: 'película de controle solar' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Escrever roteiro/ }));
    });

    expect(writeUgcScript).toHaveBeenCalledWith(expect.objectContaining({
      productDescription: 'película de controle solar',
    }));
    // Editável, não texto fixo: roteiro é onde o usuário mais tem opinião.
    await waitFor(() => expect(screen.getByDisplayValue('gancho')).toBeTruthy());
    expect(screen.getByDisplayValue('chamada')).toBeTruthy();
  });

  it('gerar um segmento cria a linha e completa a MESMA linha', async () => {
    getUgcProject.mockResolvedValue({ ...PROJETO, script: ROTEIRO });
    montar();
    await waitFor(() => expect(screen.getByRole('region', { name: 'Roteiro' })).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /Avatar falando/ }));
    await waitFor(() => expect(screen.getByRole('region', { name: 'Avatar falando' })).toBeTruthy());

    // A fala do roteiro chega pronta no diálogo do segmento.
    fireEvent.click(screen.getAllByRole('button', { name: /^Gerar$/ })[0]);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    expect(screen.getByDisplayValue('gancho')).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Gerar avatar falando/ }));
    });

    expect(createUgcClip).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'avatar', segment: 'hook', status: 'generating',
    }));
    expect(updateUgcClip).toHaveBeenCalledWith('clip-hook', expect.objectContaining({ status: 'ready' }));
  });

  it('o B-Roll gera vários ângulos de uma vez', async () => {
    // Multi-seleção aqui, e um por vez no avatar: o clipe de produto é o
    // material mais barato e o que a montagem mais consome.
    montar();
    await waitFor(() => expect(screen.getByRole('region', { name: 'Roteiro' })).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /B-Roll/ }));
    await waitFor(() => expect(screen.getByRole('region', { name: 'B-Roll' })).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Mesa de cima' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Gerar 2 clipes/ }));
    });

    expect(createUgcClip).toHaveBeenCalledTimes(2);
    expect(createUgcClip).toHaveBeenCalledWith(expect.objectContaining({ kind: 'broll', anglePreset: 'hand_hold' }));
    expect(createUgcClip).toHaveBeenCalledWith(expect.objectContaining({ kind: 'broll', anglePreset: 'table_flat_lay' }));
  });

  it('"Gerações do projeto" separa as duas gavetas, cada uma com seu vazio', async () => {
    montar();
    await waitFor(() => expect(screen.getByRole('region', { name: 'Roteiro' })).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /Gerações do projeto/ }));
    await waitFor(() => expect(screen.getByRole('region', { name: 'Gerações do projeto' })).toBeTruthy());

    expect(screen.getByText('Nenhum clipe de avatar ainda')).toBeTruthy();
    expect(screen.getByText('Nenhum clipe de B-roll ainda')).toBeTruthy();
  });

  it('clipe que falhou continua na tela, com o erro e o retentar', async () => {
    // Sumir com o que falhou é como o usuário perde a referência do que
    // pediu e repete o pedido do zero.
    listUgcClips.mockResolvedValue([{
      id: 'c-falho', projectId: 'proj-1', kind: 'avatar', segment: 'hook', anglePreset: null,
      speech: 'oi', durationSeconds: 8, resolution: '1080p', audio: true,
      status: 'failed', url: null, thumbnailUrl: null, errorMessage: 'provedor recusou',
      prompt: 'P', model: null, metadata: {}, createdAt: 'x', updatedAt: 'x',
    }]);
    getUgcProject.mockResolvedValue({ ...PROJETO, script: ROTEIRO });

    montar();
    await waitFor(() => expect(screen.getByRole('region', { name: 'Roteiro' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /Avatar falando/ }));

    await waitFor(() => expect(screen.getByText('provedor recusou')).toBeTruthy());
    expect(screen.getByRole('button', { name: /Tentar de novo/ })).toBeTruthy();
  });

  it('erro de migração ausente aparece na cara, não como erro cru do banco', async () => {
    getUgcProject.mockRejectedValue(new Error('As tabelas do UGC Studio não existem neste banco.'));
    montar();
    await waitFor(() => expect(screen.getByText(/tabelas do UGC Studio não existem/)).toBeTruthy());
  });
});
