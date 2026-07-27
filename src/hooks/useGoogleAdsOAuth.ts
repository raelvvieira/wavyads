import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useGetGoogleAdsAuthUrl() {
  return useMutation({
    mutationFn: async ({ clientId, redirectUri }: { clientId: string; redirectUri: string }) => {
      const { data, error } = await supabase.functions.invoke('google-ads-oauth', {
        body: { action: 'auth-url', client_id: clientId, redirect_uri: redirectUri },
      });
      if (error) throw error;
      return data.auth_url as string;
    },
  });
}

export function useGoogleAdsCallback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ code, clientId, redirectUri, accessToken }: { code: string; clientId: string; redirectUri: string; accessToken?: string }) => {
      const { data, error } = await supabase.functions.invoke('google-ads-oauth', {
        body: { action: 'callback', code, client_id: clientId, redirect_uri: redirectUri },
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      if (error) throw error;
      return data as { success: boolean; accounts: any[] };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['client'] });
    },
  });
}

export function useSelectGoogleAdsAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, customerId, customerName, loginCustomerId }: { clientId: string; customerId: string; customerName: string; loginCustomerId?: string }) => {
      const { data, error } = await supabase.functions.invoke('google-ads-oauth', {
        body: { action: 'select-account', client_id: clientId, customer_id: customerId, customer_name: customerName, login_customer_id: loginCustomerId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['client'] });
    },
  });
}

export function useListGoogleAdsAccounts() {
  return useMutation({
    mutationFn: async (clientId: string) => {
      const { data, error } = await supabase.functions.invoke('google-ads-oauth', {
        body: { action: 'list-accounts', client_id: clientId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return (data?.accounts || []) as { id: string; name: string; manager?: boolean; loginCustomerId?: string }[];
    },
  });
}

export function useSetGoogleAdsAccountManual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, customerId }: { clientId: string; customerId: string }) => {
      const { data, error } = await supabase.functions.invoke('google-ads-oauth', {
        body: { action: 'set-account-manual', client_id: clientId, customer_id: customerId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { success: boolean; account: { id: string; name: string } };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['client'] });
    },
  });
}

export function useDisconnectGoogleAds() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string) => {
      const { data, error } = await supabase.functions.invoke('google-ads-oauth', {
        body: { action: 'disconnect', client_id: clientId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['client'] });
    },
  });
}
