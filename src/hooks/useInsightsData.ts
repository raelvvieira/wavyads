import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClients } from './useClients';
import { useRole } from './useRole';
import { runIntelligenceEngine, type ClientInsightsData } from '@/lib/intelligenceEngine';
import { format, subDays, startOfDay } from 'date-fns';

function fmt(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

async function fetchForClient(clientId: string, action: string, timeRange?: { since: string; until: string }) {
  const body: any = { client_id: clientId, action };
  if (timeRange) body.time_range = timeRange;
  const { data, error } = await supabase.functions.invoke('meta-fetch-insights', { body });
  if (error) throw error;
  return data;
}

export function useInsightsData() {
  const { data: clients } = useClients();
  const { isAdmin } = useRole();

  const syncedClients = (clients || []).filter(c => c.is_synced);

  return useQuery({
    queryKey: ['insights-engine-v2', syncedClients.map(c => c.id).join(',')],
    queryFn: async () => {
      const today = startOfDay(new Date());
      const current7d = { since: fmt(subDays(today, 6)), until: fmt(today) };
      const previous7d = { since: fmt(subDays(today, 13)), until: fmt(subDays(today, 7)) };
      const last21d = { since: fmt(subDays(today, 20)), until: fmt(today) };

      const results = await Promise.allSettled(
        syncedClients.map(async (client) => {
          const [campCurrent, campPrevious, insCurrent, insPrevious, daily21, adsCurrent] = await Promise.allSettled([
            fetchForClient(client.id, 'campaigns', current7d),
            fetchForClient(client.id, 'campaigns', previous7d),
            fetchForClient(client.id, 'insights', current7d),
            fetchForClient(client.id, 'insights', previous7d),
            fetchForClient(client.id, 'insights', last21d),
            fetchForClient(client.id, 'ads', current7d),
          ]);

          return {
            client: { id: client.id, name: client.name },
            campaignsCurrent: campCurrent.status === 'fulfilled' ? (campCurrent.value?.campaigns || []) : [],
            campaignsPrevious: campPrevious.status === 'fulfilled' ? (campPrevious.value?.campaigns || []) : [],
            insightsCurrent: insCurrent.status === 'fulfilled' ? insCurrent.value : null,
            insightsPrevious: insPrevious.status === 'fulfilled' ? insPrevious.value : null,
            dailyHistory: daily21.status === 'fulfilled' ? (daily21.value?.daily || []) : [],
            adsCurrent: adsCurrent.status === 'fulfilled' ? (adsCurrent.value?.ads || []) : [],
          } as ClientInsightsData;
        })
      );

      const clientsData: ClientInsightsData[] = [];
      for (const result of results) {
        if (result.status === 'fulfilled') {
          clientsData.push(result.value);
        }
      }

      return runIntelligenceEngine(clientsData);
    },
    enabled: isAdmin && syncedClients.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
