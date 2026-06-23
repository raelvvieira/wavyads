import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface DashboardPrefs {
  kpiCards?: string[];
  preset?: string;
  customRange?: { from?: string; to?: string };
  platform?: 'meta' | 'google';
  funnelStages?: { s4?: string; s5?: string; s6?: string };
}

const LEGACY_PREFS_KEY = (clientId: string) => `wavy-dash-prefs-${clientId}`;
const LEGACY_KPI_KEY = (clientId: string) => `wavy-kpi-cards-${clientId}`;
const LEGACY_FUNNEL_KEYS = ['funnel_stage4', 'funnel_stage5', 'funnel_stage6'] as const;

function readLegacy(clientId: string): DashboardPrefs {
  const out: DashboardPrefs = {};
  try {
    const raw = localStorage.getItem(LEGACY_PREFS_KEY(clientId));
    if (raw) {
      const p = JSON.parse(raw);
      if (p.preset) out.preset = p.preset;
      if (p.platform) out.platform = p.platform;
    }
  } catch {}
  try {
    const raw = localStorage.getItem(LEGACY_KPI_KEY(clientId));
    if (raw) out.kpiCards = JSON.parse(raw);
  } catch {}
  try {
    const s4 = localStorage.getItem(LEGACY_FUNNEL_KEYS[0]);
    const s5 = localStorage.getItem(LEGACY_FUNNEL_KEYS[1]);
    const s6 = localStorage.getItem(LEGACY_FUNNEL_KEYS[2]);
    if (s4 || s5 || s6) out.funnelStages = { s4: s4 || undefined, s5: s5 || undefined, s6: s6 || undefined };
  } catch {}
  return out;
}

export function useDashboardPrefs(clientId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const queryKey = ['dashboard-prefs', userId, clientId];

  const enabled = !!userId && !!clientId;

  const query = useQuery({
    queryKey,
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<DashboardPrefs> => {
      const { data, error } = await supabase
        .from('user_dashboard_prefs')
        .select('prefs')
        .eq('user_id', userId!)
        .eq('client_id', clientId!)
        .maybeSingle();
      if (error) throw error;

      if (data?.prefs) return data.prefs as DashboardPrefs;

      // Migration suave: copia do localStorage se ainda não existir registro no banco
      const legacy = readLegacy(clientId!);
      if (Object.keys(legacy).length > 0) {
        await supabase
          .from('user_dashboard_prefs')
          .upsert(
            { user_id: userId!, client_id: clientId!, prefs: legacy as any },
            { onConflict: 'user_id,client_id' }
          );
        return legacy;
      }
      return {};
    },
  });

  // Debounced server save
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<DashboardPrefs | null>(null);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const update = useCallback((patch: Partial<DashboardPrefs>) => {
    if (!enabled) return;
    const current = (queryClient.getQueryData<DashboardPrefs>(queryKey)) || {};
    const next: DashboardPrefs = { ...current, ...patch };
    queryClient.setQueryData(queryKey, next);
    pending.current = next;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const toSave = pending.current;
      pending.current = null;
      if (!toSave) return;
      await supabase
        .from('user_dashboard_prefs')
        .upsert(
          { user_id: userId!, client_id: clientId!, prefs: toSave as any },
          { onConflict: 'user_id,client_id' }
        );
    }, 500);
  }, [enabled, queryClient, queryKey, userId, clientId]);

  return {
    prefs: query.data || {},
    isLoaded: enabled ? query.isSuccess : true,
    update,
  };
}
