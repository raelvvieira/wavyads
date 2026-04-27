import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MetaCampaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'ended';
  spend: number;
  budget: number;
  impressions: number;
  reach: number;
  clicks: number;
  leads: number;
  cpl: number;
  purchases: number;
  cost_per_purchase: number;
  purchase_value: number;
  purchase_roas: number;
  results: number;
  cost_per_result: number;
  result_type?: string;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
}

export interface DailyMetric {
  date: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  leads: number;
  purchases: number;
  results: number;
  conversions: number;
  cost_per_purchase: number;
  cost_per_result: number;
}

export interface MetaInsights {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  leads: number;
  cpl: number;
  purchases: number;
  cost_per_purchase: number;
  results: number;
  cost_per_result: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  roas: number;
  cost_per_conversion: number;
  daily: DailyMetric[];
  daily_spend?: { date: string; value: number }[];
}

export interface TimeRange {
  since: string; // YYYY-MM-DD
  until: string; // YYYY-MM-DD
}

async function fetchInsights(action: string, clientId: string, timeRange: TimeRange) {
  const { data, error } = await supabase.functions.invoke('meta-fetch-insights', {
    body: { action, client_id: clientId, time_range: timeRange },
  });
  if (error) throw error;
  return data;
}

export function useMetaCampaigns(clientId: string | undefined, enabled: boolean, timeRange: TimeRange | undefined) {
  return useQuery({
    queryKey: ['meta-campaigns', clientId, timeRange?.since, timeRange?.until],
    queryFn: async () => {
      const data = await fetchInsights('campaigns', clientId!, timeRange!);
      return data.campaigns as MetaCampaign[];
    },
    enabled: enabled && !!clientId && !!timeRange,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMetaInsights(clientId: string | undefined, enabled: boolean, timeRange: TimeRange | undefined) {
  return useQuery({
    queryKey: ['meta-insights', clientId, timeRange?.since, timeRange?.until],
    queryFn: async () => {
      const data = await fetchInsights('insights', clientId!, timeRange!);
      if (data.daily && !data.daily_spend) {
        data.daily_spend = data.daily.map((d: DailyMetric) => ({ date: d.date, value: d.spend }));
      }
      if (data.daily) {
        data.daily = data.daily.map((d: any) => {
          const results = d.results ?? ((d.leads || 0) + (d.purchases || 0));
          const conversions = d.conversions ?? ((d.leads || 0) + (d.purchases || 0));
          const purchases = d.purchases || 0;
          const spend = d.spend || 0;
          return {
            ...d,
            results,
            conversions,
            cost_per_purchase: purchases > 0 ? spend / purchases : 0,
            cost_per_result: results > 0 ? spend / results : 0,
          };
        });
      }
      if (data.conversions == null) {
        data.conversions = (data.leads || 0) + (data.purchases || 0);
      }
      if (data.cost_per_conversion == null) {
        data.cost_per_conversion = data.conversions > 0 ? (data.spend || 0) / data.conversions : 0;
      }
      return data as MetaInsights;
    },
    enabled: enabled && !!clientId && !!timeRange,
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch previous period for comparison
export function useMetaInsightsPrevious(clientId: string | undefined, enabled: boolean, timeRange: TimeRange | undefined) {
  return useQuery({
    queryKey: ['meta-insights-prev', clientId, timeRange?.since, timeRange?.until],
    queryFn: async () => {
      const data = await fetchInsights('insights_previous', clientId!, timeRange!);
      return data as MetaInsights;
    },
    enabled: enabled && !!clientId && !!timeRange,
    staleTime: 5 * 60 * 1000,
  });
}
