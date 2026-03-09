import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ClientRecord {
  id: string;
  name: string;
  email: string | null;
  meta_ad_account_id: string | null;
  meta_ad_account_name: string | null;
  token_expires_at: string | null;
  is_synced: boolean;
  last_sync_at: string | null;
  google_ads_synced: boolean;
  google_ads_customer_id: string | null;
  google_ads_customer_name: string | null;
  google_ads_last_sync_at: string | null;
  google_ads_token_expires_at: string | null;
  user_id: string | null;
  created_at: string;
}

export function useClients() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id,name,email,meta_ad_account_id,meta_ad_account_name,is_synced,last_sync_at,token_expires_at,google_ads_synced,google_ads_customer_id,google_ads_customer_name,google_ads_last_sync_at,google_ads_token_expires_at,created_at,user_id')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ClientRecord[];
    },
    enabled: !!user,
  });
}

export function useClient(clientId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id,name,email,meta_ad_account_id,meta_ad_account_name,is_synced,last_sync_at,token_expires_at,google_ads_synced,google_ads_customer_id,google_ads_customer_name,google_ads_last_sync_at,google_ads_token_expires_at,created_at,user_id')
        .eq('id', clientId!)
        .maybeSingle();
      if (error) throw error;
      return data as ClientRecord | null;
    },
    enabled: !!user && !!clientId,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; email: string }) => {
      const { data, error } = await supabase.functions.invoke('invite-client', {
        body: { name: input.name, email: input.email },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, email }: { id: string; name: string; email: string }) => {
      const { error } = await supabase
        .from('clients')
        .update({ name, email })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['client'] });
    },
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string) => {
      const { data, error } = await supabase.functions.invoke('delete-client', {
        body: { clientId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
}
