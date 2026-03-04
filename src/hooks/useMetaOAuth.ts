import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useGetMetaAuthUrl() {
  return useMutation({
    mutationFn: async ({ clientId, redirectUri }: { clientId: string; redirectUri: string }) => {
      const { data, error } = await supabase.functions.invoke('meta-oauth', {
        body: { action: 'auth-url', client_id: clientId, redirect_uri: redirectUri },
      });
      if (error) throw error;
      return data.auth_url as string;
    },
  });
}

export function useMetaCallback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ code, clientId, redirectUri }: { code: string; clientId: string; redirectUri: string }) => {
      const { data, error } = await supabase.functions.invoke('meta-oauth', {
        body: { action: 'callback', code, client_id: clientId, redirect_uri: redirectUri },
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

export function useSelectMetaAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clientId, adAccountId, adAccountName }: { clientId: string; adAccountId: string; adAccountName: string }) => {
      const { data, error } = await supabase.functions.invoke('meta-oauth', {
        body: { action: 'select-account', client_id: clientId, ad_account_id: adAccountId, ad_account_name: adAccountName },
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

export function useDisconnectMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string) => {
      const { data, error } = await supabase.functions.invoke('meta-oauth', {
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
