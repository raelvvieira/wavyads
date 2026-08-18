import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { extractFunctionErrorMessage } from '@/lib/functionError';

export interface ClientUser {
  id: string;
  client_id: string;
  user_id: string;
  created_at: string;
}

export interface ClientAccessPerson {
  /** `client_users.id` — chave do vínculo, não da pessoa (a mesma pessoa
   * pode ter uma linha por cliente). */
  id: string;
  user_id: string;
  client_id: string;
  name: string | null;
  email: string | null;
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

/**
 * Quem tem acesso a UM cliente, com nome e email já resolvidos.
 *
 * `client_users` não guarda nome/email — só o vínculo — então busca as
 * linhas e junta com `profiles` em duas idas, como o resto do arquivo já
 * faz para a lista agregada de todos os clientes.
 */
export function useClientAccessList(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-access-list', clientId],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('client_users')
        .select('id, user_id, client_id, created_at')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (!rows?.length) return [] as ClientAccessPerson[];

      const userIds = [...new Set(rows.map((r) => r.user_id))];
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);
      if (pError) throw pError;

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
      return rows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        client_id: r.client_id,
        created_at: r.created_at,
        name: profileMap.get(r.user_id)?.name ?? null,
        email: profileMap.get(r.user_id)?.email ?? null,
      })) satisfies ClientAccessPerson[];
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
      // O erro cru traz só "Edge Function returned a non-2xx status code";
      // o motivo de verdade está no corpo da resposta.
      if (error) throw new Error(await extractFunctionErrorMessage(error));
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['client_users', variables.clientId] });
      qc.invalidateQueries({ queryKey: ['client-access-list', variables.clientId] });
      qc.invalidateQueries({ queryKey: ['all-client-access-emails'] });
    },
  });
}

/** Remove o vínculo de UMA pessoa com UM cliente — não apaga a conta dela. */
export function useRemoveClientUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { clientId: string; userId: string }) => {
      const { data, error } = await supabase.functions.invoke('remove-client-user', {
        body: { clientId: input.clientId, userId: input.userId },
      });
      if (error) throw new Error(await extractFunctionErrorMessage(error));
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['client_users', variables.clientId] });
      qc.invalidateQueries({ queryKey: ['client-access-list', variables.clientId] });
      qc.invalidateQueries({ queryKey: ['all-client-access-emails'] });
    },
  });
}
