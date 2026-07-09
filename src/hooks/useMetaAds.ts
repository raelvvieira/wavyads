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
  image_url_hd?: string | null;
  video_id?: string | null;
  video_source_url?: string | null;
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
  purchases: number;
  purchase_value: number;
  purchase_roas: number;
}

export function useMetaAds(clientId: string | undefined, enabled: boolean, timeRange: TimeRange | undefined) {
  return useQuery({
    queryKey: ['meta-ads', clientId, timeRange?.since, timeRange?.until],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('meta-fetch-insights', {
        body: { action: 'ads', client_id: clientId!, time_range: timeRange },
      });
      if (data?.code === 'META_TOKEN_INVALID') {
        const e = new Error(data.error || 'Conexão com Meta expirou');
        e.name = 'MetaTokenInvalid';
        throw e;
      }
      if (error) throw error;
      return data.ads as MetaAd[];
    },
    enabled: enabled && !!clientId && !!timeRange,
    staleTime: 15 * 60 * 1000, // 15 minutos (antes: 5)
    gcTime: 30 * 60 * 1000, // 30 minutos
    retry: (failureCount, err: any) => err?.name !== 'MetaTokenInvalid' && failureCount < 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
