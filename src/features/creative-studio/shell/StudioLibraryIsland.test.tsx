import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { StudioLibraryIsland } from './StudioLibraryIsland';
import { PREVIEW_LIBRARIES } from './studioPreviewFixtures';

// Duas armadilhas de uma vez. jsdom não implementa PointerEvent, então
// `fireEvent.pointerEnter(el, { pointerType })` entrega tipo vazio e a regra
// mouse/toque não é exercitada. E React sintetiza `onPointerEnter` a partir
// de `pointerover` delegado na raiz — disparar um `pointerenter` cru não
// chega ao componente. Por isso o evento é montado à mão como over/out.
function ponteiro(el: Element, tipo: 'entra' | 'sai', pointerType: string) {
  const ev: any = new Event(tipo === 'entra' ? 'pointerover' : 'pointerout', {
    bubbles: true,
    cancelable: true,
  });
  ev.pointerType = pointerType;
  if (tipo === 'sai') ev.relatedTarget = document.body;
  fireEvent(el, ev);
}

function montar(onExpandedChange = vi.fn()) {
  render(
    <StudioLibraryIsland
      entries={PREVIEW_LIBRARIES}
      activeId="all"
      onSelect={vi.fn()}
      onExpandedChange={onExpandedChange}
    />,
  );
  return { ilha: document.querySelector('.studio-library-island')!, onExpandedChange };
}

const expandida = (ilha: Element) => ilha.getAttribute('data-expanded') === 'true';

describe('StudioLibraryIsland', () => {
  it('o clique é o caminho garantido de expandir', () => {
    // Teclado e toque não têm hover: rótulo alcançável só pelo ponteiro é
    // rótulo que parte dos usuários nunca lê.
    const { ilha } = montar();
    expect(expandida(ilha)).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Expandir bibliotecas' }));
    expect(expandida(ilha)).toBe(true);
  });

  it('o hover de mouse expande e o de toque não', () => {
    // No toque, `pointerenter` chega junto com o toque no destino — sem a
    // guarda, a ilha pisca aberta a cada toque.
    const { ilha } = montar();

    ponteiro(ilha, 'entra', 'mouse');
    expect(expandida(ilha)).toBe(true);
    ponteiro(ilha, 'sai', 'mouse');
    expect(expandida(ilha)).toBe(false);

    ponteiro(ilha, 'entra', 'touch');
    expect(expandida(ilha)).toBe(false);
  });

  it('ambiente sem tipo de ponteiro ainda expande', () => {
    // A guarda testa `!== 'touch'` e não `=== 'mouse'` de propósito: a
    // segunda falha fechada onde o tipo não é informado, e caneta paira.
    const { ilha } = montar();
    ponteiro(ilha, 'entra', '');
    expect(expandida(ilha)).toBe(true);
  });

  it('o foco por teclado revela os rótulos como o hover', () => {
    const { ilha } = montar();
    act(() => (screen.getByRole('button', { name: /Todas as criações/ }) as HTMLElement).focus());
    expect(expandida(ilha)).toBe(true);
  });

  it('Escape limpa TODOS os estados abertos, não só o fixado', () => {
    // Limpar só o fixado faz a tecla parecer quebrada: a ilha continua
    // aberta pelo ponteiro e nada visível acontece.
    const { ilha } = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Expandir bibliotecas' }));
    ponteiro(ilha, 'entra', 'mouse');

    fireEvent.keyDown(ilha, { key: 'Escape' });
    expect(expandida(ilha)).toBe(false);
  });

  it('avisa o shell a cada mudança de largura visível', () => {
    // É esse aviso que empurra o canvas. Sem ele o menu aberto cobre a
    // primeira coluna de artes.
    const { ilha, onExpandedChange } = montar();
    onExpandedChange.mockClear();

    ponteiro(ilha, 'entra', 'mouse');
    expect(onExpandedChange).toHaveBeenLastCalledWith(true);

    ponteiro(ilha, 'sai', 'mouse');
    expect(onExpandedChange).toHaveBeenLastCalledWith(false);
  });

  it('tooltip só enquanto o rótulo está escondido', () => {
    const { ilha } = montar();
    const item = screen.getByRole('button', { name: /Todas as criações/ });
    expect(item.getAttribute('title')).toBe('Todas as criações');

    fireEvent.click(screen.getByRole('button', { name: 'Expandir bibliotecas' }));
    expect(item.getAttribute('title')).toBeNull();
  });

  it('marca a biblioteca corrente', () => {
    montar();
    expect(screen.getByRole('button', { name: /Todas as criações/ }).getAttribute('aria-current')).toBe('true');
    expect(screen.getByRole('button', { name: /Aprovados/ }).getAttribute('aria-current')).toBeNull();
  });
});
