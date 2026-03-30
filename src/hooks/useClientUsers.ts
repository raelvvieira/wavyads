import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClientUser {
  id: string;
  client_id: string;
  user_id: string;
  created_at: string;
}

export function useClientUsers(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client_users', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_users')
        .select('*')
        .eq('client_id', clientId!);
      if (error) throw error;
      return data as ClientUser[];
    },
    enabled: !!clientId,
  });
}

export function useAddClientUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { clientId: string; name: string; email: string }) => {
      const { data, error } = await supabase.functions.invoke('add-client-user', {
        body: { clientId: input.clientId, name: input.name, email: input.email },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['client_users', variables.clientId] });
    },
  });
}
