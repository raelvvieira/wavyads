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

async function fetchInsights(action: string, clientId: string, datePreset: string) {
  const { data, error } = await supabase.functions.invoke('meta-fetch-insights', {
    body: { action, client_id: clientId, date_preset: datePreset },
  });
  if (error) throw error;
  return data;
}

// Map period presets to their "previous" equivalents
const PREVIOUS_PRESET: Record<string, string> = {
  last_7d: 'last_14d',    // we'll slice the first half
  last_30d: 'last_60d',
  last_90d: 'last_180d',
};

export function useMetaCampaigns(clientId: string | undefined, enabled: boolean, datePreset = 'last_30d') {
  return useQuery({
    queryKey: ['meta-campaigns', clientId, datePreset],
    queryFn: async () => {
      const data = await fetchInsights('campaigns', clientId!, datePreset);
      return data.campaigns as MetaCampaign[];
    },
    enabled: enabled && !!clientId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMetaInsights(clientId: string | undefined, enabled: boolean, datePreset = 'last_30d') {
  return useQuery({
    queryKey: ['meta-insights', clientId, datePreset],
    queryFn: async () => {
      const data = await fetchInsights('insights', clientId!, datePreset);
      if (data.daily && !data.daily_spend) {
        data.daily_spend = data.daily.map((d: DailyMetric) => ({ date: d.date, value: d.spend }));
      }
      // Compute conversions (leads + purchases) for daily if not present
      if (data.daily) {
        data.daily = data.daily.map((d: any) => ({
          ...d,
          results: d.results ?? ((d.leads || 0) + (d.purchases || 0)),
          conversions: d.conversions ?? ((d.leads || 0) + (d.purchases || 0)),
        }));
      }
      // Compute aggregate conversions & cost_per_conversion
      if (data.conversions == null) {
        data.conversions = (data.leads || 0) + (data.purchases || 0);
      }
      if (data.cost_per_conversion == null) {
        data.cost_per_conversion = data.conversions > 0 ? (data.spend || 0) / data.conversions : 0;
      }
      return data as MetaInsights;
    },
    enabled: enabled && !!clientId,
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch previous period for comparison
export function useMetaInsightsPrevious(clientId: string | undefined, enabled: boolean, datePreset = 'last_30d') {
  // Meta API supports these presets for previous period comparison
  const previousPresetMap: Record<string, string> = {
    last_7d: 'last_7d',
    last_30d: 'last_30d',
    last_90d: 'last_90d',
  };

  // We fetch the same preset but with "previous" action
  return useQuery({
    queryKey: ['meta-insights-prev', clientId, datePreset],
    queryFn: async () => {
      // Use the Meta API's date_preset for the previous period
      // We send a custom action to the edge function
      const data = await fetchInsights('insights_previous', clientId!, datePreset);
      return data as MetaInsights;
    },
    enabled: enabled && !!clientId,
    staleTime: 5 * 60 * 1000,
  });
}
