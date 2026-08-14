import { describe, expect, it, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { THEME_STORAGE_KEY, useTheme } from './useTheme';

// jsdom não implementa matchMedia. O stub deixa alternar a preferência do
// sistema e disparar a mudança, que é o comportamento em questão.
function mockSystem(prefersLight: boolean) {
  const listeners = new Set<() => void>();
  const mq = {
    matches: prefersLight,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  };
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mq));
  return {
    change(next: boolean) {
      mq.matches = next;
      act(() => listeners.forEach((fn) => fn()));
    },
  };
}

const stamped = () => document.documentElement.getAttribute('data-theme');

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.unstubAllGlobals();
  });

  it('sem escolha salva, segue o sistema', () => {
    mockSystem(true);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
    expect(stamped()).toBe('light');
  });

  it('cai no escuro quando o sistema não pede claro', () => {
    mockSystem(false);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    expect(stamped()).toBe('dark');
  });

  it('alterna entre os dois e persiste', () => {
    mockSystem(false);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');

    act(() => result.current.toggle());
    expect(result.current.theme).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

    act(() => result.current.toggle());
    expect(result.current.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('a escolha explícita desliga o sistema', () => {
    // Enquanto ninguém escolheu, o app anoitece junto com o aparelho.
    // Depois da primeira escolha, não — quem apertou "claro" quer claro.
    const sys = mockSystem(true);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');

    sys.change(false);
    expect(stamped()).toBe('dark');

    act(() => result.current.setPreference('light'));
    sys.change(false);
    expect(stamped()).toBe('light');
  });

  it('não quebra quando o localStorage está bloqueado', () => {
    // Navegação privativa pode lançar em setItem. Perder a memória da escolha
    // é aceitável; não abrir o app não é.
    mockSystem(false);
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const { result } = renderHook(() => useTheme());
    expect(() => act(() => result.current.toggle())).not.toThrow();
    expect(stamped()).toBe('light');
    setItem.mockRestore();
  });

  it('ignora valor inválido guardado e volta a seguir o sistema', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'roxo');
    const sys = mockSystem(false);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');

    sys.change(true);
    expect(stamped()).toBe('light');
  });
});
