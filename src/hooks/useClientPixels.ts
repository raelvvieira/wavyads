import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ClientPixel {
  client_id: string;
  pixel_id: string;
  access_token: string;
}

export function useAllClientPixels() {
  return useQuery({
    queryKey: ['client-pixels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_pixels')
        .select('client_id, pixel_id, access_token');
      if (error) throw error;
      const map = new Map<string, ClientPixel>();
      (data || []).forEach((row) => map.set(row.client_id, row as ClientPixel));
      return map;
    },
    staleTime: 60_000,
  });
}

export function useUpsertClientPixel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      clientId: string;
      pixelId: string;
      accessToken?: string; // when undefined, only pixel_id is updated
    }) => {
      const { clientId, pixelId, accessToken } = params;

      if (accessToken === undefined) {
        // Keep existing token: update pixel_id only.
        const { error } = await supabase
          .from('client_pixels')
          .update({ pixel_id: pixelId })
          .eq('client_id', clientId);
        if (error) throw error;
        return;
      }

      const { error } = await supabase
        .from('client_pixels')
        .upsert(
          { client_id: clientId, pixel_id: pixelId, access_token: accessToken },
          { onConflict: 'client_id' },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-pixels'] });
    },
  });
}
