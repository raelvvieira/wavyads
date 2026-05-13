import { useEffect, useState, useCallback } from 'react';

/**
 * Rastreador de uso de IA do Criativo Studio.
 * Persiste em localStorage por mês (YYYY-MM) e emite eventos para a UI atualizar.
 *
 * Custos estimados (USD), baseados em preços públicos do Google AI + margem ~20% do Lovable AI Gateway:
 *  - text-flash    (Gemini 2.5/3 Flash, ~1.5k tokens média)        => $0.001
 *  - image-nano-2  (Gemini 3.1 Flash Image — Nano Banana 2)        => $0.024
 *  - image-nano-pro(Gemini 3 Pro Image — Nano Banana Pro 1024px)   => $0.144
 *
 * Tokens são estimativas (imagem conta como ~1290 "tokens" equivalentes).
 */

export type AiUsageType = 'text-flash' | 'image-nano-2' | 'image-nano-pro';

const COST_USD: Record<AiUsageType, number> = {
  'text-flash': 0.001,
  'image-nano-2': 0.024,
  'image-nano-pro': 0.144,
};

const TOKENS_EST: Record<AiUsageType, number> = {
  'text-flash': 1500,
  'image-nano-2': 1290,
  'image-nano-pro': 1290,
};

const USD_TO_BRL = 5.5;
const EVENT = 'ai-usage-changed';

interface MonthlyUsage {
  calls: Record<AiUsageType, number>;
  tokens: number;
  costUsd: number;
}

const empty = (): MonthlyUsage => ({
  calls: { 'text-flash': 0, 'image-nano-2': 0, 'image-nano-pro': 0 },
  tokens: 0,
  costUsd: 0,
});

const monthKey = (d = new Date()) =>
  `ai-usage:${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

const read = (): MonthlyUsage => {
  if (typeof window === 'undefined') return empty();
  try {
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
    return {
      ...u,
      costBrl: u.costUsd * USD_TO_BRL,
      totalCalls: u.calls['text-flash'] + u.calls['image-nano-2'] + u.calls['image-nano-pro'],
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
