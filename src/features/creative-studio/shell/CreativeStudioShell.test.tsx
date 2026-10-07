import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CreativeStudioShell, type CreativeStudioShellProps } from './CreativeStudioShell';
import { PREVIEW_ASSETS, PREVIEW_LIBRARIES } from './studioPreviewFixtures';
import { visibleCanvasAssets } from '../state/canvasSelectors';
import { SEM_FILTROS_AVANCADOS } from '../state/advancedFilters';

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
    advancedFilters: SEM_FILTROS_AVANCADOS,
    onAdvancedFiltersChange: vi.fn(),
    availableRatios: ['9:16', '1:1'],
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
    logoLibrary: [],
    productLibrary: [],
    copyBank: [],
    onNewLibraryUpload: vi.fn(),
    avatarLibrary: [],
    onGenerateAvatar: vi.fn(),
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

  it('arte que falhou continua no canvas e só oferece retentar ou apagar', () => {
    montar();
    const falhou = [...document.querySelectorAll('figure')].find(
      (f) => f.getAttribute('data-status') === 'failed',
    )!;

    expect(falhou).toBeTruthy();
    expect(falhou.textContent).toContain('recusou o formato');
    const rotulos = [...falhou.querySelectorAll('.studio-asset-action')].map((b) =>
      b.getAttribute('aria-label'),
    );
    expect(rotulos).toEqual(['Tentar novamente', 'Apagar arte']);
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

    fireEvent.click(screen.getByRole('button', { name: 'Ações desta arte' }));
    const acoes = [...document.querySelectorAll('.studio-inspector-action')].map((b) => b.textContent);
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
  it('o botão de gerar diz em que etapa a arte está, não só "gerando"', () => {
    // Ler as referências e dirigir a arte acontecem ANTES do gerador. Sem
    // nomear a etapa, a tela fica parada por segundos dizendo "gerando" —
    // e quem não vê progresso clica de novo.
    montar({ busy: true, stage: 'reading-references' });
    expect(screen.getByRole('button', { name: 'Lendo as referências…' })).toBeTruthy();
  });

  it('sem etapa informada, o botão ocupado continua dizendo que está gerando', () => {
    montar({ busy: true });
    expect(screen.getByRole('button', { name: 'Gerando…' })).toBeTruthy();
  });
});

describe('o painel da proposta', () => {
  const PECA = {
    formato: { nome: 'Antes e depois', proporcao: '1:1' },
    cena: 'Dois registros do mesmo sorriso.',
    copy: [{ papel: 'Título', texto: 'Dá pra resolver.' }],
    angulo: { nome: 'demonstração', inedito: true },
    leu: [],
    vazia: false,
  };
  const PROPOSTA = {
    pecas: [PECA],
    cliente: null,
    quantidade: { n: 1, pedido: 1 },
    leu: ['2 referências anexadas'],
    vazia: false,
  };

  it('abre sozinho quando a proposta chega — ninguém vai procurá-la', () => {
    // `sidePanel === 'copilot'` existia como tipo e como botão no dock, e
    // não tinha ramo que o renderizasse: a condição do painel exigia
    // seleção, e a proposta fala de uma arte que ainda NÃO existe.
    montar({ proposal: PROPOSTA as any });
    expect(screen.getByLabelText('Proposta de arte')).toBeTruthy();
    expect(screen.getByText('Dois registros do mesmo sorriso.')).toBeTruthy();
    // E sem nada selecionado, que era exatamente o que travava o ramo.
    expect(document.querySelector('[aria-label="Inspetor da seleção"]')).toBeNull();
  });

  it('sem proposta, o painel não aparece nem com o botão do dock', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: /proposta no painel lateral/ }));
    expect(screen.queryByLabelText('Proposta de arte')).toBeNull();
    // E o botão diz por que não faz nada, em vez de ignorar o clique calado.
    expect(screen.getByRole('button', { name: /proposta no painel lateral/ }))
      .toHaveProperty('disabled', true);
  });

  it('aprovar, ajustar e fechar chegam a quem decide', () => {
    const onApproveProposal = vi.fn();
    const onAdjustProposal = vi.fn();
    const onDiscardProposal = vi.fn();
    montar({ proposal: PROPOSTA as any, onApproveProposal, onAdjustProposal, onDiscardProposal });

    fireEvent.click(screen.getByRole('button', { name: /Gerar assim/ }));
    expect(onApproveProposal).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Ajustar o pedido/ }));
    expect(onAdjustProposal).toHaveBeenCalled();
    // Ajustar fecha o painel: o estado em que o usuário quer ficar depois de
    // discordar é digitando, não olhando a discordância.
    expect(screen.queryByLabelText('Proposta de arte')).toBeNull();
  });

  it('clicar numa arte abre o inspetor, e o dock traz a proposta de volta', () => {
    // O painel direito é um só, e clicar numa arte é um pedido explícito
    // para olhar aquela arte. A proposta não se perde: o botão do dock
    // existe justamente para ela, e segue aceso enquanto ela não foi
    // decidida.
    montar({ proposal: PROPOSTA as any });
    fireEvent.click(cards()[0]);
    expect(screen.getByLabelText('Inspetor da seleção')).toBeTruthy();
    expect(screen.queryByLabelText('Proposta de arte')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /proposta no painel lateral/ }));
    expect(screen.getByLabelText('Proposta de arte')).toBeTruthy();
    expect(screen.queryByLabelText('Inspetor da seleção')).toBeNull();
  });

  it('gerando, o sim não é aceito duas vezes', () => {
    montar({ proposal: PROPOSTA as any, busy: true });
    const painel = screen.getByLabelText('Proposta de arte');
    const sim = [...painel.querySelectorAll('button')].find((b) => /Gerando/.test(b.textContent ?? ''))!;
    expect(sim.disabled).toBe(true);
  });

  it('um lote diz quantas peças, e o botão promete as duas', () => {
    // O número é informação sobre o GASTO: duas peças são duas gerações.
    montar({ proposal: {
      ...PROPOSTA,
      pecas: [PECA, { ...PECA, cena: 'A vitrine inteira de longe.' }],
      quantidade: { n: 2, pedido: 2 },
    } as any });
    expect(screen.getByText('2 peças')).toBeTruthy();
    expect(screen.getByText('Peça 1 de 2')).toBeTruthy();
    expect(screen.getByText('A vitrine inteira de longe.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Gerar as 2/ })).toBeTruthy();
  });

  it('o teto cortado aparece na tela, em vez de entregar menos calado', () => {
    montar({ proposal: {
      ...PROPOSTA, pecas: [PECA, PECA, PECA, PECA], quantidade: { n: 4, pedido: 10 },
    } as any });
    expect(screen.getByText(/Você pediu 10/)).toBeTruthy();
  });

  it('o cliente reconhecido no texto aparece antes de gerar', () => {
    // O sistema mexeu numa escolha que o usuário não fez à mão.
    montar({ proposal: {
      ...PROPOSTA, cliente: { nome: 'Dra Mariane', doTexto: true },
    } as any });
    expect(screen.getByText('Dra Mariane')).toBeTruthy();
    expect(screen.getByText(/reconheci no seu pedido/)).toBeTruthy();
  });
});
