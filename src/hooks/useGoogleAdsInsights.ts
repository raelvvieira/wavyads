import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MetaCampaign, MetaInsights, DailyMetric, TimeRange } from './useMetaInsights';

async function fetchGoogleInsights(action: string, clientId: string, timeRange: TimeRange) {
  const { data, error } = await supabase.functions.invoke('google-ads-fetch-insights', {
    body: { action, client_id: clientId, time_range: timeRange },
  });
  if (error) throw error;
  return data;
}

export function useGoogleAdsCampaigns(clientId: string | undefined, enabled: boolean, timeRange: TimeRange | undefined) {
  return useQuery({
    queryKey: ['google-campaigns', clientId, timeRange?.since, timeRange?.until],
    queryFn: async () => {
      const data = await fetchGoogleInsights('campaigns', clientId!, timeRange!);
      return data.campaigns as MetaCampaign[];
    },
    enabled: enabled && !!clientId && !!timeRange,
    staleTime: 5 * 60 * 1000,
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
  });
}
