import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Search,
  Users,
  ChevronRight,
  Loader2,
  ArrowLeft,
  ExternalLink,
  Contact,
  Link2,
  Save,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useClients, useClient } from '@/hooks/useClients';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

const db = supabase as any;

// Lê a crm_url do cliente (a coluna não está nos tipos gerados, então query
// direta via cast). Mantida separada do useClient pra não mexer no hook comum.
function useClientCrmUrl(clientId: string | undefined) {
  const [crmUrl, setCrmUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const { data, error } = await db
        .from('clients')
        .select('crm_url')
        .eq('id', clientId)
        .maybeSingle();
      if (error) throw error;
      setCrmUrl(data?.crm_url ?? null);
    } catch {
      setCrmUrl(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  return { crmUrl, loading, reload, setCrmUrl };
}

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    // valida — new URL lança se for inválida
    // eslint-disable-next-line no-new
    new URL(withScheme);
    return withScheme;
  } catch {
    return null;
  }
}

// Painel do CRM de UM cliente: embute o EVO via iframe, com "abrir em nova aba"
// como fallback garantido (muitos apps bloqueiam iframe por X-Frame-Options).
function CrmClientView({ clientId }: { clientId: string }) {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const { data: client } = useClient(clientId);
  const { crmUrl, loading, reload } = useClientCrmUrl(clientId);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [iframeFailed, setIframeFailed] = useState(false);

  useEffect(() => {
    setIframeFailed(false);
  }, [crmUrl]);

  const saveUrl = async () => {
    const normalized = normalizeUrl(draft);
    if (draft.trim() && !normalized) {
      toast({ title: 'URL inválida', description: 'Confira o endereço do CRM.', variant: 'destructive' });
      return;
    }
    // Nunca deixar a crm_url apontar pro próprio domínio da Wavy — o iframe roda
    // com allow-same-origin/allow-scripts e, se fosse mesma origem, a página
    // embutida poderia ler o token de sessão do Supabase no localStorage.
    if (normalized) {
      try {
        if (new URL(normalized).host === window.location.host) {
          toast({ title: 'URL não permitida', description: 'O CRM não pode apontar para o próprio domínio da Wavy.', variant: 'destructive' });
          return;
        }
      } catch { /* normalizeUrl já validou; ignore */ }
    }
    setSaving(true);
    try {
      const { error } = await db.from('clients').update({ crm_url: normalized }).eq('id', clientId);
      if (error) throw error;
      toast({ title: 'CRM atualizado' });
      setEditing(false);
      await reload();
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const startEditing = () => {
    setDraft(crmUrl || '');
    setEditing(true);
  };

  return (
    <div className="flex h-full flex-col p-4 pt-20 lg:p-6 lg:pt-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Contact className="h-6 w-6 text-accent" />
            CRM {client?.name && <span className="font-normal text-muted-foreground">· {client.name}</span>}
          </h1>
          <p className="text-sm text-white/50">Gestão de leads e atendimento do cliente (EVO CRM).</p>
        </div>
        {isAdmin && (
          <Button variant="ghost" size="sm" className="rounded-full text-white/60" onClick={() => navigate('/crm')}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Trocar cliente
          </Button>
        )}
        {crmUrl && (
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => window.open(crmUrl, '_blank', 'noopener')}>
            <ExternalLink className="mr-1.5 h-4 w-4" /> Abrir em nova aba
          </Button>
        )}
        {isAdmin && crmUrl && !editing && (
          <Button variant="ghost" size="sm" className="rounded-full text-white/60" onClick={startEditing}>
            <Link2 className="mr-1.5 h-4 w-4" /> Editar URL
          </Button>
        )}
      </div>

      {(editing || (isAdmin && !crmUrl && !loading)) && (
        <GlassCard className="mb-4 p-4">
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-white/40">
            URL do CRM (EVO) deste cliente
          </label>
          <div className="flex flex-wrap gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="https://crm-cliente.seudominio.com"
              className="min-w-[240px] flex-1"
            />
            <Button onClick={saveUrl} disabled={saving} className="rounded-full bg-accent text-white hover:bg-accent/90">
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Salvar
            </Button>
            {editing && (
              <Button variant="ghost" className="rounded-full text-white/60" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            )}
          </div>
          <p className="mt-2 text-xs text-white/40">
            Aponte para a instância self-hosted do EVO CRM deste cliente. Só administradores configuram.
          </p>
        </GlassCard>
      )}

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : !crmUrl ? (
        !isAdmin && (
          <GlassCard className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center">
            <Contact className="h-8 w-8 text-white/30" />
            <p className="text-sm text-white/60">O CRM deste cliente ainda não foi configurado.</p>
            <p className="text-xs text-white/40">Fale com o time da Wavy para ativar.</p>
          </GlassCard>
        )
      ) : iframeFailed ? (
        <GlassCard className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
          <ExternalLink className="h-8 w-8 text-white/30" />
          <p className="text-sm text-white/70">Este CRM não permite abrir embutido aqui.</p>
          <Button className="rounded-full bg-accent text-white hover:bg-accent/90" onClick={() => window.open(crmUrl, '_blank', 'noopener')}>
            <ExternalLink className="mr-1.5 h-4 w-4" /> Abrir CRM em nova aba
          </Button>
        </GlassCard>
      ) : (
        <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
          <iframe
            key={crmUrl}
            src={crmUrl}
            title="CRM"
            className="h-full min-h-[70vh] w-full"
            onError={() => setIframeFailed(true)}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
}

// Índice: admin escolhe o cliente; cliente é redirecionado pro próprio CRM.
function CrmIndex() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useRole();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const [search, setSearch] = useState('');
  const [redirecting, setRedirecting] = useState(false);

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
        navigate(`/crm/${data.client_id}`, { replace: true });
      } else {
        setRedirecting(false);
      }
    })();
  }, [roleLoading, isAdmin, user, navigate]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = clients || [];
    if (!term) return list;
    return list.filter(
      (c) => c.name.toLowerCase().includes(term) || (c.email || '').toLowerCase().includes(term),
    );
  }, [clients, search]);

  if (roleLoading || (!isAdmin && redirecting)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6 pt-20 lg:pt-6">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6 pt-20 text-center lg:pt-6">
        <p className="text-sm text-white/60">Nenhum cliente vinculado à sua conta.</p>
      </div>
    );
  }

  return (
    <div className="p-4 pt-20 lg:p-6 lg:pt-6">
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Contact className="h-6 w-6 text-accent" /> CRM
        </h1>
        <p className="text-sm text-white/50">Escolha o cliente para abrir o CRM (EVO) dele.</p>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente..." className="pl-9" />
      </div>

      {clientsLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard className="p-10 text-center text-sm text-white/50">Nenhum cliente encontrado.</GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/crm/${c.id}`)}
              className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-left transition hover:border-white/25 hover:bg-white/[0.04]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white">{c.name}</p>
                {c.email && <p className="truncate text-xs text-white/40">{c.email}</p>}
              </div>
              <ChevronRight className="h-4 w-4 text-white/30 transition group-hover:text-white/60" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CrmPage() {
  const { clientId } = useParams();
  return clientId ? <CrmClientView clientId={clientId} /> : <CrmIndex />;
}
