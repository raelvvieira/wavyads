import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CreativeStudioShell, type CreativeStudioShellProps } from './CreativeStudioShell';
import { PREVIEW_ASSETS, PREVIEW_LIBRARIES } from './studioPreviewFixtures';
import { visibleCanvasAssets } from '../state/canvasSelectors';

const visiveis = visibleCanvasAssets(PREVIEW_ASSETS);

function montar(patch: Partial<CreativeStudioShellProps> = {}) {
  const onAssetAction = vi.fn();
  const onSubmitCommand = vi.fn();
  const props: CreativeStudioShellProps = {
    clientName: 'Boutique Aurora',
    clientId: 'c1',
    clients: [{ id: 'c1', name: 'Boutique Aurora' }],
    onClientChange: vi.fn(),
    assets: visiveis,
    allAssets: PREVIEW_ASSETS,
    libraries: PREVIEW_LIBRARIES,
    activeLibrary: 'all',
    onSelectLibrary: vi.fn(),
    query: '',
    onQueryChange: vi.fn(),
    filters: [],
    onRemoveFilter: vi.fn(),
    onClearFilters: vi.fn(),
    onOpenFilters: vi.fn(),
    onOpenHistory: vi.fn(),
    onNewProject: vi.fn(),
    command: '',
    onCommandChange: vi.fn(),
    onSubmitCommand,
    busy: false,
    hasCopy: false,
    ratio: '4:5',
    resolution: '2K',
    modelId: 'gpt-image-2',
    attachments: [],
    onRemoveAttachment: vi.fn(),
    onAttach: vi.fn(),
    onRatioChange: vi.fn(),
    onResolutionChange: vi.fn(),
    onModelChange: vi.fn(),
    referenceLibrary: [],
    onAssetAction,
    ...patch,
  };
  return { ...render(<CreativeStudioShell {...props} />), onAssetAction, onSubmitCommand };
}

const cards = () => [...document.querySelectorAll('.studio-asset-surface')] as HTMLElement[];
/** Só as prontas. A ordem do canvas põe as recentes primeiro, e as recentes
 *  da amostra são justamente a que falhou e a que está gerando. */
const cardsProntos = () =>
  [...document.querySelectorAll('figure')]
    .filter((f) => f.getAttribute('data-status') === 'ready')
    .map((f) => f.querySelector('.studio-asset-surface') as HTMLElement);

describe('CreativeStudioShell', () => {
  it('desenha só arte: insumo do usuário não entra no canvas', () => {
    // A referência que o cliente subiu alimenta a geração, não é resultado
    // dela. Sem esse corte o canvas de um projeto com dez referências abre
    // poluído antes de existir qualquer arte.
    montar();
    expect(PREVIEW_ASSETS.some((a) => a.type === 'reference')).toBe(true);
    expect(cards()).toHaveLength(visiveis.length);
  });

  it('selecionar uma arte abre o inspetor', () => {
    montar();
    expect(screen.queryByRole('complementary', { name: /inspetor/i })).toBeNull();

    fireEvent.click(cards()[0]);

    expect(screen.getByRole('complementary', { name: /inspetor/i })).toBeTruthy();
  });

  it('clicar de novo na mesma arte limpa a seleção', () => {
    // Sem isso não há como voltar a "nada selecionado" senão caçando um vão
    // no canvas — e num canvas cheio esse vão não existe.
    montar();
    fireEvent.click(cards()[0]);
    fireEvent.click(cards()[0]);

    expect(screen.queryByRole('complementary', { name: /inspetor/i })).toBeNull();
  });

  it('o comando muda de pergunta conforme a seleção', () => {
    montar();
    expect(screen.getByPlaceholderText('O que você quer criar?')).toBeTruthy();

    fireEvent.click(cards()[0]);
    expect(screen.getByPlaceholderText('O que você quer alterar nesta arte?')).toBeTruthy();

    fireEvent.click(cards()[1], { metaKey: true });
    expect(screen.getByPlaceholderText('O que você quer fazer com as 2 artes selecionadas?')).toBeTruthy();
  });

  it('o envio carrega os IDs selecionados, não só o texto', () => {
    // A seleção precisa viajar explicitamente: inferir o alvo pelo texto é
    // como "deixa mais escuro" acaba gerando arte nova em vez de editar.
    const { onSubmitCommand } = montar({ command: 'deixa mais escuro' });
    fireEvent.click(cards()[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Gerar' }));

    expect(onSubmitCommand).toHaveBeenCalledTimes(1);
    expect(onSubmitCommand.mock.calls[0][0]).toHaveLength(1);
  });

  it('não deixa gerar sem prompt nem copy', () => {
    const { onSubmitCommand } = montar({ command: '   ' });
    fireEvent.click(screen.getByRole('button', { name: 'Gerar' }));
    expect(onSubmitCommand).not.toHaveBeenCalled();
  });

  it('arte que falhou continua no canvas e só oferece retentar', () => {
    montar();
    const falhou = [...document.querySelectorAll('figure')].find(
      (f) => f.getAttribute('data-status') === 'failed',
    )!;

    expect(falhou).toBeTruthy();
    expect(falhou.textContent).toContain('recusou o formato');
    const rotulos = [...falhou.querySelectorAll('.studio-asset-action')].map((b) =>
      b.getAttribute('aria-label'),
    );
    expect(rotulos).toEqual(['Tentar novamente']);
  });

  it('arte gerando não oferece transformação', () => {
    // Editar uma arte sem URL produz uma chamada com URL nula.
    montar();
    const gerando = [...document.querySelectorAll('figure')].find(
      (f) => f.getAttribute('data-status') === 'generating',
    )!;
    expect(gerando.querySelectorAll('.studio-asset-action')).toHaveLength(0);
  });

  it('quadrado não oferece redimensionar', () => {
    // O destino do resize é sempre 1:1, então partir de 1:1 não é operação.
    montar();
    const quadrado = [...document.querySelectorAll('figure')].find((f) =>
      f.textContent?.includes('1:1'),
    )!;
    const rotulos = [...quadrado.querySelectorAll('.studio-asset-action')].map((b) =>
      b.getAttribute('aria-label'),
    );
    expect(rotulos).not.toContain('Redimensionar');
  });

  it('em lote só oferece o que o backend faz em lote', () => {
    montar();
    fireEvent.click(cardsProntos()[0]);
    fireEvent.click(cardsProntos()[1], { metaKey: true });

    const painel = screen.getByRole('complementary', { name: /inspetor/i });
    const acoes = [...painel.querySelectorAll('.studio-inspector-action')].map((b) => b.textContent);
    expect(acoes).toEqual(['Baixar']);
  });

  it('alterna grade e linhagem', () => {
    montar();
    const linhagem = screen.getByRole('button', { name: 'Linhagem' });
    expect(linhagem.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(linhagem);
    expect(linhagem.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Grade' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('canvas vazio por filtro fala de filtro, não de projeto novo', () => {
    montar({ assets: [], query: 'inexistente' });
    expect(screen.getByText(/Nenhuma arte com esses filtros/i)).toBeTruthy();
  });

  it('canvas vazio de verdade convida a criar', () => {
    montar({ assets: [] });
    expect(screen.getByText(/O canvas está vazio/i)).toBeTruthy();
  });

  it('erro de carregamento não vira canvas vazio', () => {
    // São coisas diferentes: "não há arte" e "não consegui buscar" pedem
    // ações opostas do usuário.
    montar({ assets: [], error: 'Falha de rede' });
    expect(screen.getByText(/Falha de rede/)).toBeTruthy();
    expect(screen.queryByText(/O canvas está vazio/i)).toBeNull();
  });
});
