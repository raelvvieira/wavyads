import { useQuery } from '@tanstack/react-query';
import { fetchGoogleInsights } from './useGoogleAdsInsights';
import type { TimeRange } from './useMetaInsights';

export interface GoogleAdsKeyword {
  id: string;
  text: string;
  match_type: string;
  campaign_name: string;
  ad_group_name: string;
  quality_score: number | null;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  conversions_value: number;
  ctr: number;
  cpc: number;
  cost_per_conversion: number;
}

export interface GoogleAdsSearchTerm {
  term: string;
  status: 'none' | 'added' | 'excluded';
  campaign_name: string;
  ad_group_name: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  conversions_value: number;
}

interface TruncatedListResponse<T> {
  items: T[];
  truncated: boolean;
  total: number;
}

export function useGoogleAdsKeywords(clientId: string | undefined, enabled: boolean, timeRange: TimeRange | undefined) {
  return useQuery({
    queryKey: ['google-keywords', clientId, timeRange?.since, timeRange?.until],
    queryFn: async (): Promise<TruncatedListResponse<GoogleAdsKeyword>> => {
      const data = await fetchGoogleInsights('keywords', clientId!, timeRange!);
      return { items: data.keywords ?? [], truncated: !!data.truncated, total: data.total ?? 0 };
    },
    enabled: enabled && !!clientId && !!timeRange,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGoogleAdsSearchTerms(clientId: string | undefined, enabled: boolean, timeRange: TimeRange | undefined) {
  return useQuery({
    queryKey: ['google-search-terms', clientId, timeRange?.since, timeRange?.until],
    queryFn: async (): Promise<TruncatedListResponse<GoogleAdsSearchTerm>> => {
      const data = await fetchGoogleInsights('search_terms', clientId!, timeRange!);
      return { items: data.search_terms ?? [], truncated: !!data.truncated, total: data.total ?? 0 };
    },
    enabled: enabled && !!clientId && !!timeRange,
    staleTime: 5 * 60 * 1000,
  });
}
