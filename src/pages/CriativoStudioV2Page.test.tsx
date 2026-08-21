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
const deleteCreativeAsset = vi.fn();
const createAssetGroup = vi.fn();
vi.mock('@/features/creative-studio/api/creativeAssets', () => ({
  listCreativeAssets: (...a: any[]) => listCreativeAssets(...a),
  createCreativeAsset: (...a: any[]) => createCreativeAsset(...a),
  updateCreativeAsset: (...a: any[]) => updateCreativeAsset(...a),
  deleteCreativeAsset: (...a: any[]) => deleteCreativeAsset(...a),
  createAssetGroup: (...a: any[]) => createAssetGroup(...a),
}));

const listRecentProjects = vi.fn();
const createProject = vi.fn();
const updateProjectFormat = vi.fn();
vi.mock('@/features/creative-studio/api/projectRepository', () => ({
  listRecentProjects: (...a: any[]) => listRecentProjects(...a),
  createProject: (...a: any[]) => createProject(...a),
  updateProjectFormat: (...a: any[]) => updateProjectFormat(...a),
}));

const invoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...a: any[]) => invoke(...a) },
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u1' } } }) },
  },
}));

vi.mock('@/lib/aiUsageTracker', () => ({ recordAiUsage: vi.fn() }));

const uploadDataUrlToCreativeStorage = vi.fn();
vi.mock('@/features/creative-studio/api/storageUpload', () => ({
  uploadDataUrlToCreativeStorage: (...a: any[]) => uploadDataUrlToCreativeStorage(...a),
}));

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ toast: (...a: any[]) => toast(...a) }));

const useClients = vi.fn();
vi.mock('@/hooks/useClients', () => ({ useClients: (...a: any[]) => useClients(...a) }));

const analyzeOffer = vi.fn();
const generateFactorVariations = vi.fn();
vi.mock('@/features/creative-studio/api/factorCreative', () => ({
  analyzeOffer: (...a: any[]) => analyzeOffer(...a),
  generateFactorVariations: (...a: any[]) => generateFactorVariations(...a),
}));

const listCopyBank = vi.fn();
const saveCopyToBank = vi.fn();
vi.mock('@/features/creative-studio/api/copyBank', () => ({
  listCopyBank: (...a: any[]) => listCopyBank(...a),
  saveCopyToBank: (...a: any[]) => saveCopyToBank(...a),
}));

import CriativoStudioV2Page from './CriativoStudioV2Page';

const PROJETO = {
  id: 'proj-1', title: 'Campanha de Verão', status: 'active',
  selected_aspect_ratio: '4:5', selected_resolution: '2K',
  thumbnail_url: null, updated_at: '2026-08-18T10:00:00.000Z',
};

// Nenhum projeto vem pré-selecionado ao carregar (ver "desenha TODO o
// acervo..." abaixo) — o canvas não filtra mais por `projectId` até que
// uma geração de fato crie/reuse um. `projectId: 'proj-1'` aqui só serve
// para os testes de editar/retentar, que operam sobre uma arte específica.
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
    updateProjectFormat.mockResolvedValue(undefined);
    // Só entra em jogo quando uma geração de fato precisa de um projeto —
    // nenhum teste depende do id em si, exceto quando sobrescrito localmente.
    createProject.mockResolvedValue({ id: 'proj-1', title: 'Novo projeto' });
    createAssetGroup.mockResolvedValue({ id: 'grupo-fator' });
    listCopyBank.mockResolvedValue([]);
    analyzeOffer.mockResolvedValue({
      offerIntelligence: {
        productName: 'Películas', category: 'serviço', offerDescription: 'Instalação de película',
        audience: [], customerSituations: [], pains: [], desires: [], objections: [],
        differentiators: [], proofs: [], callToAction: 'Fale conosco', prohibitedClaims: [],
      },
      originalDiagnosis: null,
    });
    saveCopyToBank.mockResolvedValue(null);
    useClients.mockReturnValue({ data: [{ id: 'c1', name: 'Boutique Aurora' }, { id: 'c2', name: 'Loja do João' }] });
  });

  it('desenha TODO o acervo ao carregar — nenhum projeto vem pré-selecionado', async () => {
    // Regressão: um projeto auto-selecionado no carregamento prendia o
    // canvas a UM projeto (chip "Só este projeto") mesmo com "Todos
    // Clientes" — o padrão — escondendo o resto do acervo na primeira tela.
    listCreativeAssets.mockResolvedValue(ASSETS_DO_PROJETO);
    montar();
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));
    expect(screen.queryByText('Só este projeto')).toBeNull();
  });

  it('a faixa anuncia versão nova, não prévia', async () => {
    // Esta tela deixou de ser prévia quando virou a rota principal do
    // Criativo Studio. Uma faixa que continua dizendo "PRÉVIA" ensina o
    // usuário a não confiar no que a tela afirma sobre si mesma — foi assim
    // que ela já chegou a dizer que o Fator Criativo "segue no Studio atual"
    // depois de ele funcionar aqui.
    montar();
    await waitFor(() => expect(screen.getByText('Novo')).toBeTruthy());
    expect(screen.queryByText('Prévia')).toBeNull();
    expect(screen.getByText(/A anterior continua disponível/)).toBeTruthy();
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
      body: expect.objectContaining({ formatRatio: '9:16' }),
    }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Arte gerada' })));
  });

  it('anexar copy pelo menu do clipe chega literal ao prompt da geração', async () => {
    // Ponta a ponta: AttachMenu → onAttach → estado da página →
    // handleSubmitCommand → actions.generate → buildGenerationRequest.
    createCreativeAsset.mockResolvedValue({
      id: 'nova', projectId: 'proj-1', clientId: null, type: 'original', status: 'generating',
      url: null, thumbnailUrl: null, parentAssetId: null, rootAssetId: null, groupId: null,
      factorAxis: null, aspectRatio: '4:5', resolution: '2K', width: null, height: null,
      prompt: 'p', negativePrompt: null, model: 'gpt-image-2', errorMessage: null, filename: null,
      isClientIntelligence: false, metadata: {},
      createdAt: '2026-08-18T12:00:00.000Z', updatedAt: '2026-08-18T12:00:00.000Z',
    } satisfies CreativeAsset);
    invoke.mockResolvedValue({ data: { imageUrl: 'https://x/nova.png' }, error: null });
    updateCreativeAsset.mockImplementation(async (id: string, patch: any) => ({ id, ...patch }));

    montar();
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole('button', { name: 'Anexar referência, logo, copy, produto ou avatar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Anexar copy' }));
    fireEvent.change(screen.getByPlaceholderText(/Cole o texto final/), {
      target: { value: 'Até 50% OFF — só hoje' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Anexar' }));

    // A copy anexada basta — o Gerar libera mesmo com o dock vazio.
    const botaoGerar = screen.getByRole('button', { name: 'Gerar' });
    expect(botaoGerar).not.toBeDisabled();
    await act(async () => { fireEvent.click(botaoGerar); });

    const chamada = invoke.mock.calls.find((c) => c[0] === 'criativo-generate')!;
    expect(chamada[1].body.prompt).toContain('Até 50% OFF — só hoje');

    // Consumido: não sobra no dock depois do envio.
    await waitFor(() => expect(screen.queryByText(/Até 50% OFF/)).toBeNull());
  });

  it('anexar produto pelo menu do clipe entra em productImageUrls na geração', async () => {
    // Mesmo canal que "referência" já alimentava — só reforça que renomear
    // 'file' para 'product' não quebrou o fio até `buildGenerationRequest`.
    createCreativeAsset.mockResolvedValue({
      id: 'nova', projectId: 'proj-1', clientId: null, type: 'original', status: 'generating',
      url: null, thumbnailUrl: null, parentAssetId: null, rootAssetId: null, groupId: null,
      factorAxis: null, aspectRatio: '4:5', resolution: '2K', width: null, height: null,
      prompt: 'p', negativePrompt: null, model: 'gpt-image-2', errorMessage: null, filename: null,
      isClientIntelligence: false, metadata: {},
      createdAt: '2026-08-18T12:00:00.000Z', updatedAt: '2026-08-18T12:00:00.000Z',
    } satisfies CreativeAsset);
    invoke.mockResolvedValue({ data: { imageUrl: 'https://x/nova.png' }, error: null });
    updateCreativeAsset.mockImplementation(async (id: string, patch: any) => ({ id, ...patch }));
    uploadDataUrlToCreativeStorage.mockResolvedValue('https://x/produto-enviado.png');

    montar();
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole('button', { name: 'Anexar referência, logo, copy, produto ou avatar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Anexar produto' }));

    const arquivo = new File(['conteudo'], 'produto.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { files: [arquivo] } });
    });
    // O upload anexa direto (sem passo de confirmação) — o chip "Produto"
    // no dock é o sinal de que o anexo chegou.
    await waitFor(() => expect(screen.getByText('Produto')).toBeTruthy());

    fireEvent.change(screen.getByPlaceholderText('O que você quer criar?'), {
      target: { value: 'lançamento de verão' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Gerar' }));
    });

    const chamada = invoke.mock.calls.find((c) => c[0] === 'criativo-generate')!;
    expect(chamada[1].body.productImages).toContain('https://x/produto-enviado.png');
  });

  it('trocar o formato no popover de geração muda o próximo pedido e persiste no projeto', async () => {
    createCreativeAsset.mockResolvedValue({
      id: 'nova', projectId: 'proj-1', clientId: null, type: 'original', status: 'generating',
      url: null, thumbnailUrl: null, parentAssetId: null, rootAssetId: null, groupId: null,
      factorAxis: null, aspectRatio: '4:5', resolution: '2K', width: null, height: null,
      prompt: 'p', negativePrompt: null, model: 'gpt-image-2', errorMessage: null, filename: null,
      isClientIntelligence: false, metadata: {},
      createdAt: '2026-08-18T12:00:00.000Z', updatedAt: '2026-08-18T12:00:00.000Z',
    } satisfies CreativeAsset);
    invoke.mockResolvedValue({ data: { imageUrl: 'https://x/nova.png' }, error: null });
    updateCreativeAsset.mockImplementation(async (id: string, patch: any) => ({ id, ...patch }));

    montar();
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));

    // Sem projeto pré-selecionado, persistir formato exige um projeto de
    // verdade primeiro — a própria geração cria um via `ensureProjectId`.
    fireEvent.change(screen.getByPlaceholderText('O que você quer criar?'), { target: { value: 'lançamento' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Gerar' }));
    });
    expect(createProject).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir configurações de geração' }));
    // 4:5, e não 9:16: este último virou o padrão do dock, e clicar no que
    // já está ativo não provaria que a troca funciona.
    fireEvent.click(screen.getByRole('button', { name: '4:5' }));

    expect(updateProjectFormat).toHaveBeenCalledWith('proj-1', { aspectRatio: '4:5', resolution: '4K' });

    fireEvent.change(screen.getByPlaceholderText('O que você quer criar?'), { target: { value: 'story' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Gerar' }));
    });

    const chamada = invoke.mock.calls.filter((c) => c[0] === 'criativo-generate').at(-1)!;
    expect(chamada[1].body.formatRatio).toBe('4:5');
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

  it('a faixa dá a saída para a versão antiga', async () => {
    // `/criativo-studio` agora é ESTA tela. A antiga mudou de endereço, e
    // mandar o botão para a raiz recarregaria a própria página.
    montar();
    await waitFor(() => expect(screen.getByText('Novo')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Abrir versão antiga' }));
    expect(navigate).toHaveBeenCalledWith('/criativo-studio/v1');
  });

  it('selecionar um cliente filtra o canvas e as contagens da ilha ao que é dele', async () => {
    // Toda a amostra é do cliente 'cli-1' — uma arte passa a ser de outro,
    // e selecionar 'cli-1' precisa escondê-la do canvas e da contagem.
    useClients.mockReturnValue({ data: [
      { id: 'cli-1', name: 'Boutique Aurora' },
      { id: 'cli-2', name: 'Loja do João' },
    ] });
    const misto = ASSETS_DO_PROJETO.map((a, i) => (i === 0 ? { ...a, clientId: 'cli-2' } : a));
    listCreativeAssets.mockResolvedValue(misto);
    const totalMisto = misto.length;

    montar();
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));
    expect(cards().length).toBeLessThan(totalMisto + 1); // sanity: canvas != acervo bruto (insumo já é cortado)
    const totalAntes = cards().length;

    fireEvent.click(screen.getByRole('button', { name: 'Filtrar por cliente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Boutique Aurora' }));

    await waitFor(() => expect(cards().length).toBeLessThan(totalAntes));
    // O nome aparece duas vezes agora (trigger + chip de filtro) — o que
    // importa aqui é que o filtro é removível, não onde o texto está.
    expect(screen.getByRole('button', { name: 'Remover filtro Boutique Aurora' })).toBeTruthy();
  });

  it('gerar depois de escolher um cliente grava o clientId no asset criado', async () => {
    useClients.mockReturnValue({ data: [{ id: 'cli-9', name: 'Studio Nômade' }] });
    createCreativeAsset.mockResolvedValue({
      id: 'nova', projectId: 'proj-1', clientId: 'cli-9', type: 'original', status: 'generating',
      url: null, thumbnailUrl: null, parentAssetId: null, rootAssetId: null, groupId: null,
      factorAxis: null, aspectRatio: '4:5', resolution: '2K', width: null, height: null,
      prompt: 'p', negativePrompt: null, model: 'gpt-image-2', errorMessage: null, filename: null,
      isClientIntelligence: false, metadata: {},
      createdAt: '2026-08-18T12:00:00.000Z', updatedAt: '2026-08-18T12:00:00.000Z',
    } satisfies CreativeAsset);
    invoke.mockResolvedValue({ data: { imageUrl: 'https://x/nova.png' }, error: null });
    updateCreativeAsset.mockImplementation(async (id: string, patch: any) => ({ id, ...patch }));

    montar();
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole('button', { name: 'Filtrar por cliente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Studio Nômade' }));

    fireEvent.change(screen.getByPlaceholderText('O que você quer criar?'), { target: { value: 'x' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Gerar' }));
    });

    expect(createCreativeAsset).toHaveBeenCalledWith(expect.objectContaining({ clientId: 'cli-9' }));
  });

  it('trocar de cliente zera o filtro "Só este projeto" — não fica preso a um projeto de outro cliente', async () => {
    useClients.mockReturnValue({ data: [{ id: 'cli-1', name: 'Boutique Aurora' }] });
    createCreativeAsset.mockResolvedValue({
      id: 'nova', projectId: 'proj-1', clientId: null, type: 'original', status: 'generating',
      url: null, thumbnailUrl: null, parentAssetId: null, rootAssetId: null, groupId: null,
      factorAxis: null, aspectRatio: '4:5', resolution: '2K', width: null, height: null,
      prompt: 'p', negativePrompt: null, model: 'gpt-image-2', errorMessage: null, filename: null,
      isClientIntelligence: false, metadata: {},
      createdAt: '2026-08-18T12:00:00.000Z', updatedAt: '2026-08-18T12:00:00.000Z',
    } satisfies CreativeAsset);
    invoke.mockResolvedValue({ data: { imageUrl: 'https://x/nova.png' }, error: null });
    updateCreativeAsset.mockImplementation(async (id: string, patch: any) => ({ id, ...patch }));

    montar();
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));

    // Gerar sem projeto ainda ativo cria um — só a partir daí o chip existe.
    fireEvent.change(screen.getByPlaceholderText('O que você quer criar?'), { target: { value: 'x' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Gerar' }));
    });
    await waitFor(() => expect(screen.getByText('Só este projeto')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Filtrar por cliente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Boutique Aurora' }));

    await waitFor(() => expect(screen.queryByText('Só este projeto')).toBeNull());
  });

  it('Filtros e Histórico avisam sobre si mesmos, não sobre o Fator Criativo', async () => {
    // O aviso genérico citava "Fator Criativo" para qualquer gatilho não
    // ligado — inclusive estes dois, que não têm nada a ver com ele.
    montar();
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole('button', { name: 'Filtros' }));
    expect(toast).toHaveBeenLastCalledWith(expect.objectContaining({
      description: expect.stringContaining('Filtros avançados'),
    }));
    expect(toast).not.toHaveBeenLastCalledWith(expect.objectContaining({
      description: expect.stringContaining('Fator Criativo'),
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Histórico de projetos' }));
    expect(toast).toHaveBeenLastCalledWith(expect.objectContaining({
      description: expect.stringContaining('Histórico de projetos'),
    }));
  });

  const variacaoFator = (slot: number, angle: string) => ({
    slot, label: `V${slot}`,
    strategy: { angle, angleSubtype: 's', strategicThesis: `t${slot}` },
    audience: { persona: 'p', awarenessLevel: 'n' },
    execution: { dominantEmotion: 'e' },
    copy: { title: `T${slot}`, cta: 'CTA' },
    visualDirection: { mainSubject: 'm', composition: 'c', mood: 'mo' },
    validation: { changedDimensions: ['thesis', 'message', 'visual'], qualityScore: 8.5 },
  });

  function prepararFator() {
    generateFactorVariations.mockResolvedValue({
      engineVersion: 'factor-v2',
      originalDiagnosis: null,
      strategySummary: {},
      variations: ['problem', 'mechanism', 'proof', 'contrast', 'ease'].map((a, i) => variacaoFator(i + 1, a)),
    });
    createCreativeAsset.mockImplementation(async (input: any) => ({
      id: `fator-${input.strategicAngle}`, ...input, status: 'generating',
      url: null, thumbnailUrl: null, rootAssetId: null, metadata: input.metadata ?? {},
      createdAt: '2026-08-20T12:00:00.000Z', updatedAt: '2026-08-20T12:00:00.000Z',
    }));
    invoke.mockResolvedValue({ data: { imageUrl: 'https://x/fator.png' }, error: null });
    updateCreativeAsset.mockImplementation(async (id: string, patch: any) => ({ id, ...patch }));
  }

  async function acionarNoInspetor(rotulo: string) {
    fireEvent.click(prontos()[0].querySelector('.studio-asset-surface')!);
    const painel = screen.getByRole('complementary', { name: /inspetor/i });
    await act(async () => {
      fireEvent.click([...painel.querySelectorAll('.studio-inspector-action')].find((b) => b.textContent === rotulo)!);
    });
  }

  it('Fator Criativo gera DIRETO — um clique, sem formulário no caminho', async () => {
    // O formulário era um pedágio: exigia a descrição da oferta preenchida à
    // mão antes de liberar o botão, e quando a leitura automática falhava o
    // usuário ficava sem saída. Agora o clique gera, e a própria função
    // deduz a oferta da arte.
    prepararFator();
    montar();
    await waitFor(() => expect(prontos().length).toBeGreaterThan(0));

    await acionarNoInspetor('Fator Criativo');

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(analyzeOffer).not.toHaveBeenCalled();
    expect(generateFactorVariations).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'automatic', offerIntelligence: null,
    }));
    expect(createCreativeAsset).toHaveBeenCalledTimes(5);
    expect(createCreativeAsset).toHaveBeenCalledWith(expect.objectContaining({
      type: 'factor', strategicAngle: 'problem', generationVersion: 'factor-v2',
    }));
  });

  it('"com briefing" continua abrindo o formulário e lendo a oferta', async () => {
    // O caminho de exceção: informar prova real ou fixar ângulos.
    prepararFator();
    montar();
    await waitFor(() => expect(prontos().length).toBeGreaterThan(0));

    await acionarNoInspetor('Fator Criativo com briefing');

    expect(analyzeOffer).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    expect(screen.getByDisplayValue('Instalação de película')).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Gerar 5 variações/ }));
    });
    expect(generateFactorVariations).toHaveBeenCalledTimes(1);
    expect(createCreativeAsset).toHaveBeenCalledTimes(5);
  });

  it('quando as 5 falham, o toast NÃO diz que ficou pronto', async () => {
    // `runGeneration` nunca rejeita — ela grava `failed` na linha. Sem
    // contar as prontas, cinco cards vermelhos vinham com um toast verde
    // dizendo "Fator Criativo pronto".
    prepararFator();
    invoke.mockResolvedValue({ data: null, error: new Error('provedor recusou') });
    montar();
    await waitFor(() => expect(prontos().length).toBeGreaterThan(0));

    await acionarNoInspetor('Fator Criativo');

    expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Fator Criativo pronto' }));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Nenhuma das 5 variações foi gerada', variant: 'destructive',
    }));
  });

  it('usar como referência: a arte selecionada vira anexo no dock', async () => {
    montar();
    await waitFor(() => expect(prontos().length).toBeGreaterThan(0));
    const antes = document.querySelectorAll('.studio-dock-chip').length;

    fireEvent.click(prontos()[0].querySelector('.studio-asset-surface')!);
    const painel = screen.getByRole('complementary', { name: /inspetor/i });
    fireEvent.click([...painel.querySelectorAll('.studio-inspector-action')].find((b) => b.textContent === 'Usar como referência')!);

    expect(document.querySelectorAll('.studio-dock-chip')).toHaveLength(antes + 1);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Adicionada como referência' }));
  });

  it('apagar arte: abre a confirmação sem apagar nada ainda, cancelar mantém o card', async () => {
    montar();
    await waitFor(() => expect(prontos().length).toBeGreaterThan(0));
    const totalAntes = cards().length;

    fireEvent.click(prontos()[0].querySelector('.studio-asset-surface')!);
    const painel = screen.getByRole('complementary', { name: /inspetor/i });
    fireEvent.click([...painel.querySelectorAll('.studio-inspector-action')].find((b) => b.textContent === 'Apagar arte')!);

    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(deleteCreativeAsset).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(deleteCreativeAsset).not.toHaveBeenCalled();
    expect(cards()).toHaveLength(totalAntes);
  });

  it('apagar arte: confirmar chama deleteCreativeAsset e o card some (e fecha o inspetor)', async () => {
    deleteCreativeAsset.mockResolvedValue(undefined);
    montar();
    await waitFor(() => expect(prontos().length).toBeGreaterThan(0));
    const totalAntes = cards().length;

    fireEvent.click(prontos()[0].querySelector('.studio-asset-surface')!);
    const painel = screen.getByRole('complementary', { name: /inspetor/i });
    fireEvent.click([...painel.querySelectorAll('.studio-inspector-action')].find((b) => b.textContent === 'Apagar arte')!);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Apagar' }));
    });

    expect(deleteCreativeAsset).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(cards()).toHaveLength(totalAntes - 1));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Arte apagada' }));
    // A seleção é derivada do array de assets — some o asset, some o
    // inspetor, sem nenhum reset de seleção manual.
    expect(screen.queryByRole('complementary', { name: /inspetor/i })).toBeNull();
  });

  it('apagar arte: erro do banco mostra toast destrutivo e mantém o card', async () => {
    deleteCreativeAsset.mockRejectedValue(new Error('RLS negou a exclusão'));
    montar();
    await waitFor(() => expect(prontos().length).toBeGreaterThan(0));
    const totalAntes = cards().length;

    fireEvent.click(prontos()[0].querySelector('.studio-asset-surface')!);
    const painel = screen.getByRole('complementary', { name: /inspetor/i });
    fireEvent.click([...painel.querySelectorAll('.studio-inspector-action')].find((b) => b.textContent === 'Apagar arte')!);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Apagar' }));
    });

    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Erro ao apagar', variant: 'destructive' }));
    expect(cards()).toHaveLength(totalAntes);
  });

  it('subir um produto novo pelo menu também o salva como asset reutilizável do cliente', async () => {
    useClients.mockReturnValue({ data: [{ id: 'cli-9', name: 'Studio Nômade' }] });
    uploadDataUrlToCreativeStorage.mockResolvedValue('https://x/produto-enviado.png');
    createCreativeAsset.mockResolvedValue({
      id: 'prod-novo', projectId: 'proj-1', clientId: 'cli-9', type: 'product', status: 'ready',
      url: 'https://x/produto-enviado.png', thumbnailUrl: 'https://x/produto-enviado.png',
      parentAssetId: null, rootAssetId: null, groupId: null,
      factorAxis: null, aspectRatio: null, resolution: null, width: null, height: null,
      prompt: null, negativePrompt: null, model: null, errorMessage: null, filename: null,
      isClientIntelligence: false, metadata: {},
      createdAt: '2026-08-19T12:00:00.000Z', updatedAt: '2026-08-19T12:00:00.000Z',
    } satisfies CreativeAsset);

    montar();
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar por cliente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Studio Nômade' }));

    fireEvent.click(screen.getByRole('button', { name: 'Anexar referência, logo, copy, produto ou avatar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Anexar produto' }));
    const arquivo = new File(['conteudo'], 'produto.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { files: [arquivo] } });
    });

    await waitFor(() => expect(createCreativeAsset).toHaveBeenCalledWith(expect.objectContaining({
      type: 'product', clientId: 'cli-9', url: 'https://x/produto-enviado.png', status: 'ready',
    })));
  });

  it('gerar com copy anexada registra a copy no histórico do cliente', async () => {
    useClients.mockReturnValue({ data: [{ id: 'cli-9', name: 'Studio Nômade' }] });
    createCreativeAsset.mockResolvedValue({
      id: 'nova', projectId: 'proj-1', clientId: 'cli-9', type: 'original', status: 'generating',
      url: null, thumbnailUrl: null, parentAssetId: null, rootAssetId: null, groupId: null,
      factorAxis: null, aspectRatio: '4:5', resolution: '2K', width: null, height: null,
      prompt: 'p', negativePrompt: null, model: 'gpt-image-2', errorMessage: null, filename: null,
      isClientIntelligence: false, metadata: {},
      createdAt: '2026-08-18T12:00:00.000Z', updatedAt: '2026-08-18T12:00:00.000Z',
    } satisfies CreativeAsset);
    invoke.mockResolvedValue({ data: { imageUrl: 'https://x/nova.png' }, error: null });
    updateCreativeAsset.mockImplementation(async (id: string, patch: any) => ({ id, status: 'ready', ...patch }));

    montar();
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar por cliente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Studio Nômade' }));

    fireEvent.click(screen.getByRole('button', { name: 'Anexar referência, logo, copy, produto ou avatar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Anexar copy' }));
    fireEvent.change(screen.getByPlaceholderText(/Cole o texto final/), {
      target: { value: 'Até 50% OFF — só hoje' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Anexar' }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Gerar' }));
    });

    await waitFor(() => expect(saveCopyToBank).toHaveBeenCalledWith(expect.objectContaining({
      clientId: 'cli-9', copyText: 'Até 50% OFF — só hoje',
    })));
  });

  it('a biblioteca "Avatares" abre o Avatar Studio no lugar do canvas', async () => {
    // Primeira entrada da ilha que abre uma TELA em vez de filtrar o grid —
    // o dock some junto, porque ele cria anúncio, não persona.
    montar();
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole('button', { name: /Avatares/ }));

    expect(screen.getByRole('region', { name: 'Avatar Studio' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Personalizar Fashion Model' })).toBeTruthy();
    expect(screen.queryByPlaceholderText('O que você quer criar?')).toBeNull();
  });

  it('gerar avatar cria um asset do tipo avatar com a persona no metadata', async () => {
    createCreativeAsset.mockResolvedValue({
      id: 'av-novo', projectId: 'proj-1', clientId: null, type: 'avatar', status: 'generating',
      url: null, thumbnailUrl: null, parentAssetId: null, rootAssetId: null, groupId: null,
      factorAxis: null, aspectRatio: '4:5', resolution: '2K', width: null, height: null,
      prompt: 'p', negativePrompt: null, model: 'gpt-image-2', errorMessage: null, filename: 'Fitness Bro',
      isClientIntelligence: false, metadata: {},
      createdAt: '2026-08-19T12:00:00.000Z', updatedAt: '2026-08-19T12:00:00.000Z',
    } satisfies CreativeAsset);
    invoke.mockResolvedValue({ data: { imageUrl: 'https://x/avatar.png' }, error: null });
    updateCreativeAsset.mockImplementation(async (id: string, patch: any) => ({ id, ...patch }));

    montar();
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: /Avatares/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Personalizar Fitness Bro' }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Gerar avatar/ }));
    });

    expect(createCreativeAsset).toHaveBeenCalledWith(expect.objectContaining({
      type: 'avatar',
      metadata: expect.objectContaining({
        persona: expect.objectContaining({ name: 'Fitness Bro', presetId: 'fitness-bro' }),
      }),
    }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Avatar pronto' })));
  });

  it('não existe mais um botão de trocar de projeto — o seletor de cliente ocupou o lugar dele', async () => {
    montar();
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));
    expect(screen.queryByRole('button', { name: 'Trocar de projeto' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Filtrar por cliente' })).toBeTruthy();
  });
});
