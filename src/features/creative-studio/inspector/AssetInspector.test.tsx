import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AssetInspector } from './AssetInspector';
import type { CreativeAsset } from '../types/creative';

function asset(patch: Partial<CreativeAsset> & Pick<CreativeAsset, 'id' | 'status'>): CreativeAsset {
  return {
    projectId: 'p', clientId: null, type: 'original', url: null, thumbnailUrl: null,
    parentAssetId: null, rootAssetId: null, groupId: null, factorAxis: null,
    aspectRatio: '4:5', resolution: '2K', width: null, height: null,
    prompt: 'anúncio de verão', negativePrompt: null, model: 'gpt-image-2', errorMessage: null,
    filename: null, isClientIntelligence: false, metadata: {},
    createdAt: '2026-08-18T10:00:00.000Z', updatedAt: '2026-08-18T10:00:00.000Z',
    ...patch,
  };
}

function montar(selected: CreativeAsset[]) {
  return render(
    <AssetInspector selected={selected} allAssets={selected} onAction={vi.fn()} onClose={vi.fn()} />,
  );
}

const corpo = () => document.querySelector('.studio-side-panel-body') as HTMLElement;

/**
 * As ações vivem num menu, não empilhadas no rodapé.
 *
 * Eram nove botões de 34px que empurravam a arte para fora da vista, num
 * painel cujo propósito é justamente olhar a peça.
 */
const abrirAcoes = () => fireEvent.click(screen.getByRole('button', { name: 'Ações desta arte' }));

describe('AssetInspector — visualização em tamanho completo', () => {
  it('clicar na imagem abre o diálogo com a arte inteira', () => {
    const pronta = asset({ id: 'a1', status: 'ready', url: 'https://x/a.png' });
    montar([pronta]);

    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ver arte em tamanho completo' }));

    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toBeTruthy();
    // A mesma URL, sem recorte — ao contrário da miniatura do card, que usa
    // thumbnailUrl quando existe.
    expect(dialogo.querySelector('img')?.getAttribute('src')).toBe('https://x/a.png');
  });

  it('Escape fecha o diálogo', () => {
    const pronta = asset({ id: 'a1', status: 'ready', url: 'https://x/a.png' });
    montar([pronta]);
    fireEvent.click(screen.getByRole('button', { name: 'Ver arte em tamanho completo' }));
    expect(screen.getByRole('dialog')).toBeTruthy();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('arte ainda gerando não tem o que abrir — sem botão, sem diálogo', () => {
    const gerando = asset({ id: 'g1', status: 'generating', url: null });
    montar([gerando]);
    expect(screen.queryByRole('button', { name: 'Ver arte em tamanho completo' })).toBeNull();
  });

  it('arte que falhou também não abre — não há imagem para mostrar', () => {
    const falhou = asset({ id: 'f1', status: 'failed', url: null, errorMessage: 'erro' });
    montar([falhou]);
    expect(screen.queryByRole('button', { name: 'Ver arte em tamanho completo' })).toBeNull();
  });

  it('a arte cabe inteira: o botão não encolhe e a imagem não é recortada', () => {
    // O corpo do inspetor é um flex column e a imagem é o único item alto e
    // encolhível dele. Sem `shrink-0`, o flex espremia a imagem para caber
    // fatos/linhagem/prompt, e o `object-cover` transformava a altura que
    // sobrava em recorte — a arte virava uma faixa fina. jsdom não calcula
    // flex, então o que dá para travar aqui são as duas classes: elas são o
    // motivo de a arte aparecer inteira, e removê-las traz o recorte de volta.
    const pronta = asset({ id: 'a1', status: 'ready', url: 'https://x/a.png' });
    montar([pronta]);

    const botao = screen.getByRole('button', { name: 'Ver arte em tamanho completo' });
    expect(botao.className).toContain('shrink-0');

    const img = botao.querySelector('img')!;
    expect(img.className).toContain('h-auto');
    expect(img.className).not.toContain('object-cover');
  });

  it('seleção múltipla não mostra imagem nem botão de ampliar', () => {
    const duas = [
      asset({ id: 'a1', status: 'ready', url: 'https://x/a.png' }),
      asset({ id: 'a2', status: 'ready', url: 'https://x/b.png' }),
    ];
    montar(duas);
    expect(screen.queryByRole('button', { name: 'Ver arte em tamanho completo' })).toBeNull();
  });
});

// Mais de 60 caracteres: o título do cabeçalho (`tituloDoAsset`) trunca em
// 60, então um prompt longo garante que o texto do CORPO só existe depois
// de abrir a seção — sem isso `getByText` acha o título e o corpo juntos.
const PROMPT_LONGO_VERAO =
  'Anúncio de lançamento da coleção de verão, modelo em ambiente externo ao pôr do sol, tipografia editorial';
const PROMPT_LONGO_INVERNO =
  'Anúncio de lançamento da coleção de inverno, cenário urbano à noite, tipografia geométrica moderna';

describe('AssetInspector — prompt e troca de seleção', () => {
  it('o prompt nasce fechado', () => {
    const pronta = asset({ id: 'a1', status: 'ready', url: 'https://x/a.png', prompt: PROMPT_LONGO_VERAO });
    montar([pronta]);
    expect(screen.getByRole('button', { name: /Prompt/i }).getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText(PROMPT_LONGO_VERAO)).toBeNull();
  });

  it('clicar abre o prompt e mostra o texto completo', () => {
    const pronta = asset({ id: 'a1', status: 'ready', url: 'https://x/a.png', prompt: PROMPT_LONGO_VERAO });
    montar([pronta]);
    fireEvent.click(screen.getByRole('button', { name: /Prompt/i }));
    expect(screen.getByText(PROMPT_LONGO_VERAO)).toBeTruthy();
  });

  it('trocar de arte selecionada fecha o prompt que estava aberto', () => {
    // Sem isso o prompt aberto de UMA arte continuava aberto ao trocar
    // para outra — estado local vazando de uma seleção para a próxima.
    const a1 = asset({ id: 'a1', status: 'ready', url: 'https://x/a.png', prompt: PROMPT_LONGO_VERAO });
    const a2 = asset({ id: 'a2', status: 'ready', url: 'https://x/b.png', prompt: PROMPT_LONGO_INVERNO });
    const { rerender } = montar([a1]);

    fireEvent.click(screen.getByRole('button', { name: /Prompt/i }));
    expect(screen.getByText(PROMPT_LONGO_VERAO)).toBeTruthy();

    rerender(<AssetInspector selected={[a2]} allAssets={[a1, a2]} onAction={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Prompt/i }).getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText(PROMPT_LONGO_INVERNO)).toBeNull();
  });

  it('trocar de arte selecionada reseta o scroll do corpo', () => {
    // A imagem "sumia" porque o painel é o MESMO nó DOM entre seleções —
    // sem resetar o scroll, a imagem da arte nova (primeiro item) ficava
    // escondida na posição de rolagem deixada pela arte anterior.
    const a1 = asset({ id: 'a1', status: 'ready', url: 'https://x/a.png' });
    const a2 = asset({ id: 'a2', status: 'ready', url: 'https://x/b.png' });
    const { rerender } = montar([a1]);

    Object.defineProperty(corpo(), 'scrollTop', { value: 400, writable: true });
    expect(corpo().scrollTop).toBe(400);

    rerender(<AssetInspector selected={[a2]} allAssets={[a1, a2]} onAction={vi.fn()} onClose={vi.fn()} />);

    expect(corpo().scrollTop).toBe(0);
  });
});

describe('AssetInspector — rodapé de ações', () => {
  it('mostra "Usar como referência" e "Apagar arte" para uma arte pronta, e dispara a ação certa', () => {
    const onAction = vi.fn();
    const pronta = asset({ id: 'a1', status: 'ready', url: 'https://x/a.png' });
    render(<AssetInspector selected={[pronta]} allAssets={[pronta]} onAction={onAction} onClose={vi.fn()} />);

    abrirAcoes();
    fireEvent.click(screen.getByRole('button', { name: 'Usar como referência' }));
    expect(onAction).toHaveBeenCalledWith('use-as-reference', [pronta]);

    abrirAcoes();
    fireEvent.click(screen.getByRole('button', { name: 'Apagar arte' }));
    expect(onAction).toHaveBeenCalledWith('delete', [pronta]);
  });

  it('arte que falhou oferece apagar, mas não usar como referência', () => {
    const falhou = asset({ id: 'f1', status: 'failed', url: null, errorMessage: 'erro' });
    render(<AssetInspector selected={[falhou]} allAssets={[falhou]} onAction={vi.fn()} onClose={vi.fn()} />);

    abrirAcoes();
    expect(screen.getByRole('button', { name: 'Apagar arte' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Usar como referência' })).toBeNull();
  });
});
