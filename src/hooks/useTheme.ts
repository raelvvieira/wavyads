import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'wavy-theme';

/**
 * Preferência de tema.
 *
 * Três valores, não dois: "sistema" é uma escolha legítima e diferente de
 * "claro" — quem está em sistema acompanha o aparelho quando ele vira à
 * noite, quem escolheu claro não vira nunca.
 *
 * O atributo vive no <html> e é estampado por um script inline no
 * index.html antes da primeira pintura. Este hook cuida do resto: reage à
 * troca do sistema enquanto a preferência for 'system', persiste a escolha
 * e sincroniza entre abas.
 */

function readStored(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    // localStorage bloqueado (navegação privativa, cookies negados) não é
    // motivo para o app não abrir — só significa não lembrar a escolha.
  }
  return 'system';
}

function systemTheme(): ResolvedTheme {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === 'system' ? systemTheme() : preference;
}

/** Estampa o tema resolvido. O CSS só conhece 'light' e 'dark'. */
export function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.setAttribute('data-theme', resolved);
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStored);
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(readStored()));

  useEffect(() => {
    const next = resolveTheme(preference);
    setResolved(next);
    applyTheme(next);
  }, [preference]);

  // Enquanto a preferência for 'system', seguir o aparelho em tempo real.
  useEffect(() => {
    if (preference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => {
      const next = systemTheme();
      setResolved(next);
      applyTheme(next);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  // Duas abas abertas não deveriam discordar sobre o tema.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) setPreferenceState(readStored());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Sem persistência a escolha vale só para esta sessão.
    }
  }, []);

  return { preference, resolved, setPreference };
}
