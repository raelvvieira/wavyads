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
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  roas: number;
  daily: DailyMetric[];
  // Legacy compat
  daily_spend?: { date: string; value: number }[];
}

async function fetchInsights(action: string, clientId: string, datePreset: string) {
  const { data, error } = await supabase.functions.invoke('meta-fetch-insights', {
    body: { action, client_id: clientId, date_preset: datePreset },
  });
  if (error) throw error;
  return data;
}

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
      // Build legacy daily_spend for backward compat
      if (data.daily && !data.daily_spend) {
        data.daily_spend = data.daily.map((d: DailyMetric) => ({ date: d.date, value: d.spend }));
      }
      return data as MetaInsights;
    },
    enabled: enabled && !!clientId,
    staleTime: 5 * 60 * 1000,
  });
}
