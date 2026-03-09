import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/GlassCard';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { UserPlus, Shield, Loader2 } from 'lucide-react';

const tabs = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'notificacoes', label: 'Notificações' },
  { id: 'acessos', label: 'Acessos' },
];

interface AdminUser {
  user_id: string;
  name: string | null;
  email: string | null;
  created_at: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('perfil');
  const { user } = useAuth();
  const { isAdmin } = useRole();

  // Profile state
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileCompany, setProfileCompany] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Acessos state
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(({ data }) => {
        if (data) {
          setProfileName(data.name || '');
          setProfileEmail(data.email || '');
          setProfileCompany(data.company || '');
        }
      });
    }
  }, [user]);

  // Fetch admin list
  useEffect(() => {
    if (isAdmin && activeTab === 'acessos') {
      fetchAdmins();
    }
  }, [isAdmin, activeTab]);

  const fetchAdmins = async () => {
    setAdminsLoading(true);
    const { data: roles, error } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (error || !roles) {
      setAdminsLoading(false);
      return;
    }

    const userIds = roles.map(r => r.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email, created_at')
      .in('id', userIds);

    setAdmins(
      (profiles || []).map(p => ({
        user_id: p.id,
        name: p.name,
        email: p.email,
        created_at: p.created_at,
      }))
    );
    setAdminsLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setProfileLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ name: profileName, email: profileEmail, company: profileCompany })
      .eq('id', user.id);
    setProfileLoading(false);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else toast({ title: 'Perfil salvo!' });
  };

  const handleInviteAdmin = async () => {
    if (!inviteName || !inviteEmail) {
      toast({ title: 'Erro', description: 'Nome e email são obrigatórios', variant: 'destructive' });
      return;
    }
    setInviteLoading(true);
    const { data, error } = await supabase.functions.invoke('invite-admin', {
      body: { name: inviteName, email: inviteEmail },
    });
    setInviteLoading(false);

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }

    if (data?.error) {
      toast({ title: 'Erro', description: data.error, variant: 'destructive' });
      return;
    }

    toast({ title: 'Convite enviado!', description: `${inviteName} receberá um email com instruções de acesso.` });
    setInviteName('');
    setInviteEmail('');
    fetchAdmins();
  };

  // Filter tabs: only show "Acessos" for admins
  const visibleTabs = isAdmin ? tabs : tabs.filter(t => t.id !== 'acessos');

  return (
    <div className="p-6 pt-20 lg:pt-6 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>

      <div className="flex gap-1 glass rounded-xl p-1 w-fit">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-300',
              activeTab === tab.id ? 'btn-accent' : 'text-white/60 hover:text-white'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'perfil' && (
        <GlassCard className="max-w-2xl animate-fade-in">
          <h2 className="text-lg font-semibold mb-6">Informações do Perfil</h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm text-white/60">Nome</label>
              <input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Seu nome" className="glass-input w-full rounded-xl py-3 px-4 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-white/60">Email</label>
              <input value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} placeholder="seu@email.com" className="glass-input w-full rounded-xl py-3 px-4 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-white/60">Empresa</label>
              <input value={profileCompany} onChange={(e) => setProfileCompany(e.target.value)} placeholder="Nome da empresa" className="glass-input w-full rounded-xl py-3 px-4 text-sm" />
            </div>
            <button onClick={handleSaveProfile} disabled={profileLoading} className="btn-accent rounded-xl px-6 py-3 text-sm font-semibold mt-2 disabled:opacity-50">
              {profileLoading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </GlassCard>
      )}

      {activeTab === 'notificacoes' && (
        <GlassCard className="max-w-2xl animate-fade-in">
          <h2 className="text-lg font-semibold mb-6">Preferências de Notificação</h2>
          <div className="space-y-5">
            {[
              { label: 'Relatórios diários por email', desc: 'Receba um resumo diário das métricas' },
              { label: 'Alertas de orçamento', desc: 'Notificação quando atingir 80% do orçamento' },
              { label: 'Campanhas pausadas', desc: 'Alerta quando uma campanha for pausada automaticamente' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-white/40">{item.desc}</p>
                </div>
                <label className="relative inline-flex cursor-pointer">
                  <input type="checkbox" defaultChecked={i === 0} className="sr-only peer" />
                  <div className="w-11 h-6 rounded-full glass peer-checked:bg-accent transition-colors peer-focus:ring-2 peer-focus:ring-accent/30 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {activeTab === 'acessos' && isAdmin && (
        <div className="space-y-6 max-w-2xl animate-fade-in">
          {/* Invite Form */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-6">
              <UserPlus className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold">Convidar Administrador</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm text-white/60">Nome</label>
                <input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Nome do administrador"
                  className="glass-input w-full rounded-xl py-3 px-4 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-white/60">Email</label>
                <input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  type="email"
                  className="glass-input w-full rounded-xl py-3 px-4 text-sm"
                />
              </div>
              <button
                onClick={handleInviteAdmin}
                disabled={inviteLoading}
                className="btn-accent rounded-xl px-6 py-3 text-sm font-semibold mt-2 disabled:opacity-50 flex items-center gap-2"
              >
                {inviteLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Convidar Admin
                  </>
                )}
              </button>
            </div>
          </GlassCard>

          {/* Admin List */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold">Administradores</h2>
            </div>
            {adminsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-white/40" />
              </div>
            ) : admins.length === 0 ? (
              <p className="text-sm text-white/40 py-4">Nenhum administrador encontrado.</p>
            ) : (
              <div className="space-y-3">
                {admins.map((admin) => (
                  <div
                    key={admin.user_id}
                    className="flex items-center justify-between py-3 px-4 rounded-xl glass"
                  >
                    <div>
                      <p className="text-sm font-medium">{admin.name || 'Sem nome'}</p>
                      <p className="text-xs text-white/40">{admin.email}</p>
                    </div>
                    <span className="text-xs text-white/30">
                      {new Date(admin.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
}
