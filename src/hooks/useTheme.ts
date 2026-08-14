import { useCallback, useEffect, useState } from 'react';

export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'wavy-theme';

/**
 * Tema da interface: claro ou escuro.
 *
 * O controle é binário. Enquanto ninguém escolheu nada, o app acompanha a
 * preferência do sistema — inclusive se ela mudar durante o uso. A partir da
 * primeira escolha explícita, o sistema deixa de mandar: quem apertou "claro"
 * não quer que anoiteça sozinho.
 *
 * O atributo vive no <html>. Um script inline no index.html o estampa antes
 * da primeira pintura para não haver piscada.
 */

function readStored(): ResolvedTheme | null {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    // localStorage bloqueado (navegação privativa, cookies negados) não é
    // motivo para o app não abrir — só significa não lembrar a escolha.
  }
  return null;
}

function systemTheme(): ResolvedTheme {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

/** Estampa o tema. O CSS só conhece 'light' e 'dark'. */
export function applyTheme(theme: ResolvedTheme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function useTheme() {
  const [stored, setStored] = useState<ResolvedTheme | null>(readStored);
  const [theme, setTheme] = useState<ResolvedTheme>(() => readStored() ?? systemTheme());

  useEffect(() => {
    const next = stored ?? systemTheme();
    setTheme(next);
    applyTheme(next);
  }, [stored]);

  // Sem escolha explícita, seguir o aparelho em tempo real.
  useEffect(() => {
    if (stored) return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => {
      const next = systemTheme();
      setTheme(next);
      applyTheme(next);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [stored]);

  // Duas abas abertas não deveriam discordar sobre o tema.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) setStored(readStored());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setPreference = useCallback((next: ResolvedTheme) => {
    setStored(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Sem persistência a escolha vale só para esta sessão.
    }
  }, []);

  const toggle = useCallback(() => {
    setPreference((stored ?? systemTheme()) === 'light' ? 'dark' : 'light');
  }, [stored, setPreference]);

  return { theme, setPreference, toggle };
}
