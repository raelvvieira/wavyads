import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AdAccount {
  id: string;
  account_id: string;
  name: string;
  status: number;
  business_name: string | null;
}

async function callOAuthFunction(action: string, params?: Record<string, string>) {
  const { data, error } = await supabase.functions.invoke('facebook-oauth', {
    body: { action, ...params },
  });
  if (error) throw error;
  return data;
}

export function useGetAuthUrl() {
  return useMutation({
    mutationFn: async (redirectUri: string) => {
      const { data, error } = await supabase.functions.invoke('facebook-oauth', {
        body: { action: 'auth-url', redirect_uri: redirectUri },
      });
      if (error) throw error;
      return data.auth_url as string;
    },
  });
}

export function useExchangeCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ code, redirectUri }: { code: string; redirectUri: string }) => {
      return callOAuthFunction('callback', { code, redirect_uri: redirectUri });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facebook-credentials'] });
    },
  });
}

export function useAdAccounts(enabled: boolean) {
  return useQuery({
    queryKey: ['facebook-ad-accounts'],
    queryFn: async () => {
      const data = await callOAuthFunction('accounts');
      return data.accounts as AdAccount[];
    },
    enabled,
  });
}

export function useSelectAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ adAccountId, adAccountName }: { adAccountId: string; adAccountName: string }) => {
      return callOAuthFunction('select-account', { ad_account_id: adAccountId, ad_account_name: adAccountName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facebook-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['facebook-ad-accounts'] });
    },
  });
}

export function useDisconnectFacebook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return callOAuthFunction('disconnect');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facebook-credentials'] });
    },
  });
}
