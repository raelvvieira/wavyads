import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { NavigationIsland } from './NavigationIsland';

// A ilha é chrome de navegação: não deve depender de rede para renderizar.
// Os stubs deixam o teste falar sobre marcação e estado, não sobre Supabase.
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ signOut: vi.fn() }) }));
vi.mock('@/hooks/useRole', () => ({ useRole: () => ({ isAdmin: true }) }));
vi.mock('@/lib/aiUsageTracker', () => ({
  useAiUsage: () => ({ monthLabel: 'ago/26', costBrl: 12.5, tokens: 1234 }),
}));

// O app monta o TooltipProvider na raiz (App.tsx); os tooltips da ilha
// dependem dele. O teste reproduz a mesma árvore.
function Shell({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <TooltipProvider>{children}</TooltipProvider>
    </MemoryRouter>
  );
}

function renderAt(path: string) {
  return render(
    <Shell path={path}>
      <NavigationIsland />
    </Shell>
  );
}

// jsdom não implementa PointerEvent, então `fireEvent.pointerOver(el, {
// pointerType })` entrega o tipo vazio. Montar o evento à mão é o que permite
// testar a distinção mouse/toque, que é justamente a regra em questão.
function pointer(el: Element, type: 'pointerover' | 'pointerout', pointerType: string) {
  const ev: any = new Event(type, { bubbles: true, cancelable: true });
  ev.pointerType = pointerType;
  if (type === 'pointerout') ev.relatedTarget = document.body;
  fireEvent(el, ev);
}

// Há duas ilhas montadas ao mesmo tempo (a lateral do desktop e a inferior do
// mobile); qual aparece é decisão de CSS. O teste olha a do desktop.
const desktopIsland = () => document.querySelector('aside[data-expanded]')!;
const within = (label: string) =>
  [...desktopIsland().querySelectorAll('a')].find((a) => a.textContent?.includes(label))!;

describe('NavigationIsland', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marca só a rota atual como página corrente', () => {
    renderAt('/crm');
    expect(within('CRM').getAttribute('aria-current')).toBe('page');
    expect(within('Comercial').getAttribute('aria-current')).toBeNull();
  });

  it('trata as sub-rotas do dashboard como o mesmo destino', () => {
    // /dashboard/:clientId precisa continuar acendendo "Dashboard", senão
    // abrir um cliente apaga a indicação de onde o usuário está.
    renderAt('/dashboard/abc-123');
    expect(within('Dashboard').getAttribute('aria-current')).toBe('page');
  });

  it('nasce recolhida e alterna com o botão, refletindo em aria-expanded', () => {
    renderAt('/dashboard');
    const island = desktopIsland();
    expect(island.getAttribute('data-expanded')).toBe('false');

    const toggle = screen.getAllByRole('button', { name: /expandir menu/i })[0];
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(toggle);
    expect(desktopIsland().getAttribute('data-expanded')).toBe('true');
    expect(
      screen.getAllByRole('button', { name: /recolher menu/i })[0].getAttribute('aria-expanded')
    ).toBe('true');
  });

  it('recolhe com Escape quando o foco está dentro da ilha', () => {
    renderAt('/dashboard');
    const toggle = screen.getAllByRole('button', { name: /expandir menu/i })[0];
    fireEvent.click(toggle);
    expect(desktopIsland().getAttribute('data-expanded')).toBe('true');

    // O foco precisa ser real: o handler de Escape checa document.activeElement.
    // Envolvido em act porque focar dispara o onFocus da ilha, que muda estado.
    act(() => toggle.focus());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(desktopIsland().getAttribute('data-expanded')).toBe('false');
  });

  it('espia com o mouse: abre a ilha sem empurrar o conteúdo', () => {
    // A espiada mostra os rótulos por cima da página. Se ela avisasse o shell,
    // o dashboard inteiro reflowaria toda vez que o mouse encostasse no menu.
    const onExpandedChange = vi.fn();
    render(
      <Shell path="/dashboard">
        <NavigationIsland onExpandedChange={onExpandedChange} />
      </Shell>
    );
    const island = document.querySelector('aside[data-expanded]')!;
    expect(island.getAttribute('data-expanded')).toBe('false');

    // pointerOver/pointerOut, e não pointerEnter/Leave: enter e leave não
    // borbulham, e o React sintetiza os dois a partir de over/out na raiz.
    pointer(island, 'pointerover', 'mouse');
    expect(island.getAttribute('data-expanded')).toBe('true');
    expect(onExpandedChange).toHaveBeenLastCalledWith(false);

    pointer(island, 'pointerout', 'mouse');
    expect(island.getAttribute('data-expanded')).toBe('false');
  });

  it('não espia por toque', () => {
    // Em toque o pointerenter chega junto com o toque no destino; abrir aí
    // faria a ilha piscar aberta a cada toque.
    renderAt('/dashboard');
    const island = desktopIsland();
    pointer(island, 'pointerover', 'touch');
    expect(island.getAttribute('data-expanded')).toBe('false');
  });

  it('a espiada não desfaz o menu fixado ao sair o mouse', () => {
    renderAt('/dashboard');
    const island = desktopIsland();
    fireEvent.click(screen.getAllByRole('button', { name: /expandir menu/i })[0]);
    expect(island.getAttribute('data-expanded')).toBe('true');

    pointer(island, 'pointerover', 'mouse');
    pointer(island, 'pointerout', 'mouse');
    expect(desktopIsland().getAttribute('data-expanded')).toBe('true');
  });

  it('avisa o shell a cada mudança, para o conteúdo se afastar junto', () => {
    const onExpandedChange = vi.fn();
    render(
      <Shell path="/dashboard">
        <NavigationIsland onExpandedChange={onExpandedChange} />
      </Shell>
    );
    expect(onExpandedChange).toHaveBeenLastCalledWith(false);

    fireEvent.click(screen.getAllByRole('button', { name: /expandir menu/i })[0]);
    expect(onExpandedChange).toHaveBeenLastCalledWith(true);
  });

  it('mostra os itens de gestão para admin', () => {
    // Contraparte do teste abaixo: sem esta asserção, "não encontrei o link"
    // passaria mesmo que a ilha inteira tivesse deixado de renderizar.
    renderAt('/dashboard');
    expect(desktopIsland().querySelector('a[href="/criativo-studio"]')).not.toBeNull();
  });

  it('esconde os itens de gestão de quem não é admin', async () => {
    vi.doMock('@/hooks/useRole', () => ({ useRole: () => ({ isAdmin: false }) }));
    vi.resetModules();
    const { NavigationIsland: ClientIsland } = await import('./NavigationIsland');
    const { container } = render(
      <Shell path="/dashboard">
        <ClientIsland />
      </Shell>
    );
    const island = container.querySelector('aside[data-expanded]')!;
    expect(island.querySelector('a[href="/dashboard"]')).not.toBeNull();
    expect(island.querySelector('a[href="/criativo-studio"]')).toBeNull();
  });
});
