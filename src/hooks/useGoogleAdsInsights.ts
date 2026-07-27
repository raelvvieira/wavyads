import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MetaCampaign, MetaInsights, DailyMetric, TimeRange } from './useMetaInsights';

export async function fetchGoogleInsights(action: string, clientId: string, timeRange: TimeRange) {
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
  });
}
