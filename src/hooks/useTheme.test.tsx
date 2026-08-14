import { describe, expect, it, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { resolveTheme, THEME_STORAGE_KEY, useTheme } from './useTheme';

// jsdom não implementa matchMedia. O stub deixa alternar a preferência do
// "sistema" e disparar a mudança, que é o comportamento em questão.
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

const stampedTheme = () => document.documentElement.getAttribute('data-theme');

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.unstubAllGlobals();
  });

  it('sem escolha salva, segue o sistema', () => {
    mockSystem(true);
    const { result } = renderHook(() => useTheme());
    expect(result.current.preference).toBe('system');
    expect(result.current.resolved).toBe('light');
    expect(stampedTheme()).toBe('light');
  });

  it('cai no escuro quando o sistema não pede claro', () => {
    mockSystem(false);
    const { result } = renderHook(() => useTheme());
    expect(result.current.resolved).toBe('dark');
    expect(stampedTheme()).toBe('dark');
  });

  it('a escolha explícita vence o sistema e é persistida', () => {
    mockSystem(true);
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setPreference('dark'));
    expect(result.current.resolved).toBe('dark');
    expect(stampedTheme()).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('"sistema" acompanha o aparelho mudando; "claro" não', () => {
    // É por isto que existem três opções e não um interruptor: quem está em
    // sistema quer que anoiteça junto, quem escolheu claro não quer.
    const sys = mockSystem(true);
    const { result } = renderHook(() => useTheme());
    expect(result.current.resolved).toBe('light');

    sys.change(false);
    expect(stampedTheme()).toBe('dark');

    act(() => result.current.setPreference('light'));
    sys.change(false);
    expect(stampedTheme()).toBe('light');
  });

  it('não quebra quando o localStorage está bloqueado', () => {
    // Navegação privativa pode lançar em setItem. Perder a memória da escolha
    // é aceitável; não abrir o app não é.
    mockSystem(false);
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const { result } = renderHook(() => useTheme());
    expect(() => act(() => result.current.setPreference('light'))).not.toThrow();
    expect(stampedTheme()).toBe('light');
    setItem.mockRestore();
  });

  it('ignora valor inválido guardado', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'roxo');
    mockSystem(false);
    const { result } = renderHook(() => useTheme());
    expect(result.current.preference).toBe('system');
  });
});

describe('resolveTheme', () => {
  it('devolve a escolha explícita sem consultar o sistema', () => {
    mockSystem(true);
    expect(resolveTheme('dark')).toBe('dark');
    expect(resolveTheme('light')).toBe('light');
  });
});
