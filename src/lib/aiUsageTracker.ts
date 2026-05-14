import { useEffect, useState, useCallback } from 'react';

/**
 * Rastreador de uso de IA do Criativo Studio.
 * Persiste em localStorage por mês (YYYY-MM) e emite eventos para a UI atualizar.
 *
 * Custos estimados (USD):
 *  - text-flash         (Gemini 2.5/3 Flash via Lovable AI)        => $0.001
 *  - image-openai-low   (gpt-image-2, low quality, 1024)           => $0.011
 *  - image-openai-medium(gpt-image-2, medium quality, 1024)        => $0.042
 *  - image-openai-high  (gpt-image-2, high quality, 1024)          => $0.167
 */

export type AiUsageType =
  | 'text-flash'
  | 'image-openai-low'
  | 'image-openai-medium'
  | 'image-openai-high'
  | 'image-gemini-flash'
  | 'image-gemini-flash-2'
  | 'image-gemini-pro';

const COST_USD: Record<AiUsageType, number> = {
  'text-flash': 0.001,
  'image-openai-low': 0.011,
  'image-openai-medium': 0.042,
  'image-openai-high': 0.167,
  'image-gemini-flash': 0.039,
  'image-gemini-flash-2': 0.039,
  'image-gemini-pro': 0.134,
};

const TOKENS_EST: Record<AiUsageType, number> = {
  'text-flash': 1500,
  'image-openai-low': 272,
  'image-openai-medium': 1056,
  'image-openai-high': 4160,
  'image-gemini-flash': 1290,
  'image-gemini-flash-2': 1290,
  'image-gemini-pro': 2048,
};

const USD_TO_BRL = 5.5;
const EVENT = 'ai-usage-changed';

interface MonthlyUsage {
  calls: Record<AiUsageType, number>;
  tokens: number;
  costUsd: number;
}

const empty = (): MonthlyUsage => ({
  calls: {
    'text-flash': 0,
    'image-openai-low': 0,
    'image-openai-medium': 0,
    'image-openai-high': 0,
    'image-gemini-flash': 0,
    'image-gemini-flash-2': 0,
    'image-gemini-pro': 0,
  },
  tokens: 0,
  costUsd: 0,
});

const monthKey = (d = new Date()) =>
  `ai-usage:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const cleanupOldMonths = () => {
  const current = monthKey();
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('ai-usage:') && k !== current) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
};

const read = (): MonthlyUsage => {
  if (typeof window === 'undefined') return empty();
  try {
    cleanupOldMonths();
    const raw = localStorage.getItem(monthKey());
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    return { ...empty(), ...parsed, calls: { ...empty().calls, ...(parsed.calls || {}) } };
  } catch {
    return empty();
  }
};

const write = (u: MonthlyUsage) => {
  try {
    localStorage.setItem(monthKey(), JSON.stringify(u));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    // ignore quota
  }
};

export function recordAiUsage(type: AiUsageType, count = 1) {
  const cur = read();
  cur.calls[type] = (cur.calls[type] || 0) + count;
  cur.tokens += TOKENS_EST[type] * count;
  cur.costUsd += COST_USD[type] * count;
  write(cur);
}

export function resetAiUsage() {
  write(empty());
}

export interface AiUsageSnapshot extends MonthlyUsage {
  costBrl: number;
  totalCalls: number;
  monthLabel: string;
}

export function useAiUsage(): AiUsageSnapshot & { reset: () => void } {
  const compute = useCallback((): AiUsageSnapshot => {
    const u = read();
    const totalCalls = (Object.values(u.calls) as number[]).reduce((a, b) => a + b, 0);
    return {
      ...u,
      costBrl: u.costUsd * USD_TO_BRL,
      totalCalls,
      monthLabel: new Date().toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
    };
  }, []);

  const [snap, setSnap] = useState<AiUsageSnapshot>(compute);

  useEffect(() => {
    const refresh = () => setSnap(compute());
    window.addEventListener(EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [compute]);

  return { ...snap, reset: () => { resetAiUsage(); setSnap(compute()); } };
}
