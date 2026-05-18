import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Rastreador de uso de IA do Criativo Studio.
 * Persiste em `ai_usage_events` (Supabase) — acumulado mensal compartilhado
 * entre todos os admins, calculado em fuso horário America/Sao_Paulo.
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

const currentMonthKeySP = () => {
  // YYYY-MM in America/Sao_Paulo
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  });
  const parts = fmt.formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  return `${y}-${m}`;
};

export async function recordAiUsage(type: AiUsageType, count = 1) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('ai_usage_events').insert({
      user_id: user?.id ?? null,
      usage_type: type,
      count,
      cost_usd: COST_USD[type] * count,
      tokens: TOKENS_EST[type] * count,
    } as any);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT));
    }
  } catch (e) {
    console.warn('recordAiUsage failed', e);
  }
}

export interface AiUsageSnapshot {
  costUsd: number;
  costBrl: number;
  tokens: number;
  totalCalls: number;
  monthLabel: string;
  loading: boolean;
}

const monthLabel = () =>
  new Date().toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

export function useAiUsage(): AiUsageSnapshot {
  const [snap, setSnap] = useState<AiUsageSnapshot>({
    costUsd: 0,
    costBrl: 0,
    tokens: 0,
    totalCalls: 0,
    monthLabel: monthLabel(),
    loading: true,
  });
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ai_usage_events')
        .select('count, cost_usd, tokens')
        .eq('month_key', currentMonthKeySP())
        .limit(10000);
      if (error) throw error;
      if (!mounted.current) return;
      let costUsd = 0;
      let tokens = 0;
      let totalCalls = 0;
      for (const row of (data || []) as Array<{ count: number; cost_usd: number; tokens: number }>) {
        costUsd += Number(row.cost_usd) || 0;
        tokens += Number(row.tokens) || 0;
        totalCalls += Number(row.count) || 0;
      }
      setSnap({
        costUsd,
        costBrl: costUsd * USD_TO_BRL,
        tokens,
        totalCalls,
        monthLabel: monthLabel(),
        loading: false,
      });
    } catch (e) {
      if (!mounted.current) return;
      setSnap((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh();
    const onChange = () => refresh();
    window.addEventListener(EVENT, onChange);
    const interval = window.setInterval(refresh, 60_000);
    return () => {
      mounted.current = false;
      window.removeEventListener(EVENT, onChange);
      window.clearInterval(interval);
    };
  }, [refresh]);

  return snap;
}
