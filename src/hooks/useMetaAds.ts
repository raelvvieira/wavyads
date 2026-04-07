import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TimeRange } from '@/hooks/useMetaInsights';

export interface MetaAd {
  id: string;
  name: string;
  status: string;
  campaign_id: string;
  campaign_name: string;
  thumbnail_url?: string | null;
  image_url?: string | null;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  results: number;
  cost_per_result: number;
  result_type: string;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  video_3s_views: number;
  video_thruplay: number;
  hook_rate: number;
  hold_rate: number;
}

export function useMetaAds(clientId: string | undefined, enabled: boolean, timeRange: TimeRange | undefined) {
  return useQuery({
    queryKey: ['meta-ads', clientId, timeRange?.since, timeRange?.until],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('meta-fetch-insights', {
        body: { action: 'ads', client_id: clientId!, time_range: timeRange },
      });
      if (error) throw error;
      return data.ads as MetaAd[];
    },
    enabled: enabled && !!clientId && !!timeRange,
    staleTime: 5 * 60 * 1000,
  });
}
