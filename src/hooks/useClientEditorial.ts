import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ClientEditorial, VisualAnalysis } from '@/types/criativo';

export function useClientEditorial(clientId: string | null) {
  return useQuery({
    queryKey: ['client_editorial', clientId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('client_editorials')
        .select('*')
        .eq('client_id', clientId!)
        .maybeSingle();
      if (error) throw error;
      return data as ClientEditorial | null;
    },
    enabled: !!clientId,
  });
}

export function useSaveClientEditorial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      clientId,
      designSystemDoc,
      visualAnalysis,
    }: {
      clientId: string;
      designSystemDoc: string;
      visualAnalysis: VisualAnalysis;
    }) => {
      const { error } = await (supabase as any)
        .from('client_editorials')
        .upsert(
          {
            client_id: clientId,
            design_system_doc: designSystemDoc,
            visual_analysis: visualAnalysis,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'client_id' },
        );
      if (error) throw error;
    },
    onSuccess: (_, { clientId }) => {
      qc.invalidateQueries({ queryKey: ['client_editorial', clientId] });
    },
  });
}
