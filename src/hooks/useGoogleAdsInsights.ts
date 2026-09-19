import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { readFunctionError } from '@/lib/functionError';
import type { MetaCampaign, MetaInsights, DailyMetric, TimeRange } from './useMetaInsights';

/**
 * A porta única de entrada dos dados do Google.
 *
 * A ordem das duas checagens abaixo é o conserto de um bug que deixou um
 * cliente sem diagnóstico: era `if (error) throw error` ANTES de olhar
 * `data.error`. Como o supabase-js transforma qualquer resposta não-2xx num
 * `error` de mensagem fixa — "Edge Function returned a non-2xx status
 * code" — e a edge function devolve TODOS os seus erros com status HTTP, a
 * segunda linha nunca rodava. A explicação real chegava e era jogada fora,
 * e a tela mostrava uma frase em inglês que não diz nada.
 *
 * `readFunctionError` lê o corpo da resposta, que é onde a função escreve o
 * motivo e o código.
 */
export async function fetchGoogleInsights(action: string, clientId: string, timeRange: TimeRange) {
  const { data, error } = await supabase.functions.invoke('google-ads-fetch-insights', {
    body: { action, client_id: clientId, time_range: timeRange },
    // Sem isso, uma chamada que trava no lado do Google deixava a tela
    // "carregando" pra sempre (mesmo problema já corrigido no criativo-generate).
    timeout: 45_000,
  });

  if (error) {
    const { message, code } = await readFunctionError(error);
    throw comoErro(message, code);
  }
  // Um 200 com `{ error }` no corpo também existe — é como as ações de
  // OAuth respondem. Cobrir os dois evita depender do status HTTP.
  if ((data as any)?.error) {
    throw comoErro((data as any).error, (data as any).code ?? null);
  }
  return data;
}

/** Token revogado ganha nome próprio: é a única falha que pede reconectar. */
function comoErro(mensagem: string, code: string | null): Error {
  const e = new Error(mensagem);
  if (code === 'GOOGLE_TOKEN_INVALID') e.name = 'GoogleTokenInvalid';
  return e;
}

/**
 * Repetir uma chamada contra um token revogado é repetir o mesmo erro três
 * vezes e fazer o usuário esperar por isso. O lado Meta já tratava assim.
 */
export const googleQueryOptions = {
  retry: (failureCount: number, err: any) => {
    if (err?.name === 'GoogleTokenInvalid') return false;
    return failureCount < 1;
  },
};

export function useGoogleAdsCampaigns(clientId: string | undefined, enabled: boolean, timeRange: TimeRange | undefined) {
  return useQuery({
    queryKey: ['google-campaigns', clientId, timeRange?.since, timeRange?.until],
    queryFn: async () => {
      const data = await fetchGoogleInsights('campaigns', clientId!, timeRange!);
      return data.campaigns as MetaCampaign[];
    },
    enabled: enabled && !!clientId && !!timeRange,
    staleTime: 5 * 60 * 1000,
    ...googleQueryOptions,
  });
}

export function useGoogleAdsInsights(clientId: string | undefined, enabled: boolean, timeRange: TimeRange | undefined) {
  return useQuery({
    queryKey: ['google-insights', clientId, timeRange?.since, timeRange?.until],
    queryFn: async () => {
      const data = await fetchGoogleInsights('insights', clientId!, timeRange!);
      if (data.daily) {
        data.daily = data.daily.map((d: any) => {
          const results = d.results ?? d.conversions ?? 0;
          const spend = d.spend || 0;
          return {
            ...d,
            results,
            conversions: d.conversions ?? results,
            cost_per_purchase: 0,
            cost_per_result: results > 0 ? spend / results : 0,
          };
        });
      }
      return data as MetaInsights;
    },
    enabled: enabled && !!clientId && !!timeRange,
    staleTime: 5 * 60 * 1000,
    ...googleQueryOptions,
  });
}

export function useGoogleAdsInsightsPrevious(clientId: string | undefined, enabled: boolean, timeRange: TimeRange | undefined) {
  return useQuery({
    queryKey: ['google-insights-prev', clientId, timeRange?.since, timeRange?.until],
    queryFn: async () => {
      const data = await fetchGoogleInsights('insights_previous', clientId!, timeRange!);
      return data as MetaInsights;
    },
    enabled: enabled && !!clientId && !!timeRange,
    staleTime: 5 * 60 * 1000,
    ...googleQueryOptions,
  });
}

export interface GoogleAdsImpressionShareCampaign {
  id: string;
  name: string;
  impression_share: number;
  lost_to_budget: number;
  lost_to_rank: number;
}

export function useGoogleAdsImpressionShare(clientId: string | undefined, enabled: boolean, timeRange: TimeRange | undefined) {
  return useQuery({
    queryKey: ['google-impression-share', clientId, timeRange?.since, timeRange?.until],
    queryFn: async () => {
      const data = await fetchGoogleInsights('impression_share', clientId!, timeRange!);
      return (data.campaigns ?? []) as GoogleAdsImpressionShareCampaign[];
    },
    enabled: enabled && !!clientId && !!timeRange,
    staleTime: 5 * 60 * 1000,
    ...googleQueryOptions,
  });
}

export interface GoogleAdsDevice {
  device: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
}

export function useGoogleAdsDeviceBreakdown(clientId: string | undefined, enabled: boolean, timeRange: TimeRange | undefined) {
  return useQuery({
    queryKey: ['google-device-breakdown', clientId, timeRange?.since, timeRange?.until],
    queryFn: async () => {
      const data = await fetchGoogleInsights('device_breakdown', clientId!, timeRange!);
      return (data.devices ?? []) as GoogleAdsDevice[];
    },
    enabled: enabled && !!clientId && !!timeRange,
    staleTime: 5 * 60 * 1000,
    ...googleQueryOptions,
  });
}

export interface GoogleAdsConversionAction {
  action_name: string;
  conversions: number;
  conversions_value: number;
}

export function useGoogleAdsConversionBreakdown(clientId: string | undefined, enabled: boolean, timeRange: TimeRange | undefined) {
  return useQuery({
    queryKey: ['google-conversion-breakdown', clientId, timeRange?.since, timeRange?.until],
    queryFn: async () => {
      const data = await fetchGoogleInsights('conversion_breakdown', clientId!, timeRange!);
      return (data.actions ?? []) as GoogleAdsConversionAction[];
    },
    enabled: enabled && !!clientId && !!timeRange,
    staleTime: 5 * 60 * 1000,
    ...googleQueryOptions,
  });
}
