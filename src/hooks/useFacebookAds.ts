import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface FacebookCredentials {
  id: string;
  access_token: string;
  ad_account_id: string;
  is_valid: boolean;
  ad_account_name: string | null;
  token_expires_at: string | null;
}

export interface FacebookCampaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'ended';
  spend: number;
  budget: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
}

export interface FacebookInsights {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  daily_spend: { date: string; value: number }[];
}

async function callEdgeFunction(action: string, params?: Record<string, string>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Não autenticado');

  const searchParams = new URLSearchParams({ action, ...params });
  const { data, error } = await supabase.functions.invoke('facebook-ads', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: { action, ...params },
  });

  if (error) throw error;
  return data;
}

export function useCredentials() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['facebook-credentials', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facebook_credentials')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as FacebookCredentials | null;
    },
    enabled: !!user,
  });
}

export function useSaveCredentials() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accessToken, adAccountId }: { accessToken: string; adAccountId: string }) => {
      const { data: existing } = await supabase
        .from('facebook_credentials')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('facebook_credentials')
          .update({ access_token: accessToken, ad_account_id: adAccountId, is_valid: false })
          .eq('user_id', user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('facebook_credentials')
          .insert({ user_id: user!.id, access_token: accessToken, ad_account_id: adAccountId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facebook-credentials'] });
    },
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: async () => {
      return callEdgeFunction('test');
    },
  });
}

export function useFacebookCampaigns(enabled: boolean) {
  return useQuery({
    queryKey: ['facebook-campaigns'],
    queryFn: async () => {
      const data = await callEdgeFunction('campaigns');
      return data.campaigns as FacebookCampaign[];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFacebookInsights(enabled: boolean, datePreset: string = 'last_30d') {
  return useQuery({
    queryKey: ['facebook-insights', datePreset],
    queryFn: async () => {
      const data = await callEdgeFunction('insights', { date_preset: datePreset });
      return data as FacebookInsights;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
