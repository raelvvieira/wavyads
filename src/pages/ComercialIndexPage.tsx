import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, ChevronRight, Loader2 } from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { useAuth } from '@/hooks/useAuth';
import { useClients } from '@/hooks/useClients';
import { supabase } from '@/integrations/supabase/client';
import { GlassCard } from '@/components/GlassCard';

export default function ComercialIndexPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useRole();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const [search, setSearch] = useState('');
  const [redirecting, setRedirecting] = useState(false);

  // Non-admin: redirect to their own client page
  useEffect(() => {
    if (roleLoading || isAdmin || !user) return;
    setRedirecting(true);
    (async () => {
      const { data } = await supabase
        .from('client_users')
        .select('client_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (data?.client_id) {
        navigate(`/comercial/${data.client_id}`, { replace: true });
      } else {
        setRedirecting(false);
      }
    })();
  }, [roleLoading, isAdmin, user, navigate]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = clients || [];
    if (!term) return list;
    return list.filter(c =>
      c.name.toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term),
    );
  }, [clients, search]);

  if (roleLoading || (!isAdmin && redirecting)) {
    return (
      <div className="p-6 pt-20 lg:pt-6 flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 pt-20 lg:pt-6">
        <GlassCard>
          <p className="text-sm text-muted-foreground">
            Nenhum cliente vinculado à sua conta.
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="p-6 pt-20 lg:pt-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Comercial</h1>
        <p className="text-sm text-muted-foreground">
          Selecione um cliente para visualizar seus leads e compradores.
        </p>
      </div>

      <GlassCard>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente…"
            className="glass-input w-full rounded-xl py-2.5 pl-10 pr-4 text-sm"
          />
        </div>
      </GlassCard>

      {clientsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard>
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum cliente encontrado.
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <button
              key={c.id}
              onClick={() => navigate(`/comercial/${c.id}`)}
              className="text-left group"
            >
              <GlassCard className="h-full transition-all duration-300 group-hover:border-accent/40 group-hover:bg-white/[0.04]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.email || 'Sem e-mail'}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                </div>
                <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-wider">
                  <span className={c.is_synced ? 'text-accent' : 'text-muted-foreground'}>
                    Meta {c.is_synced ? '✓' : '—'}
                  </span>
                  <span className="text-white/20">·</span>
                  <span className={c.google_ads_synced ? 'text-accent' : 'text-muted-foreground'}>
                    Google {c.google_ads_synced ? '✓' : '—'}
                  </span>
                </div>
              </GlassCard>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
