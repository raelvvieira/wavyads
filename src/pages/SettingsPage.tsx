import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/GlassCard';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { IntegrationTab } from '@/components/settings/IntegrationTab';

const tabs = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'notificacoes', label: 'Notificações' },
  { id: 'integracao', label: 'Integração' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('perfil');
  const { user } = useAuth();

  // Profile state
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileCompany, setProfileCompany] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);


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

  const handleSaveIntegration = async () => {
    if (!accessToken || !adAccountId) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    saveCredentials.mutate(
      { accessToken, adAccountId },
      {
        onSuccess: () => toast({ title: 'Credenciais salvas!' }),
        onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
      }
    );
  };

  const handleTestConnection = () => {
    testConnection.mutate(undefined, {
      onSuccess: (data: any) => {
        if (data.success) {
          toast({ title: 'Conexão OK!', description: `Conta: ${data.account_name}` });
        } else {
          toast({ title: 'Falha na conexão', description: data.error, variant: 'destructive' });
        }
      },
      onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
    });
  };

  return (
    <div className="p-6 pt-20 lg:pt-6 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>

      <div className="flex gap-1 glass rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-300',
              activeTab === tab.id ? 'btn-orange' : 'text-white/60 hover:text-white'
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
            <button onClick={handleSaveProfile} disabled={profileLoading} className="btn-orange rounded-xl px-6 py-3 text-sm font-semibold mt-2 disabled:opacity-50">
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
                  <div className="w-11 h-6 rounded-full glass peer-checked:bg-orange transition-colors peer-focus:ring-2 peer-focus:ring-orange/30 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {activeTab === 'integracao' && (
        <GlassCard className="max-w-2xl animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">API do Facebook Ads</h2>
            {creds && (
              <div className="flex items-center gap-2 text-sm">
                {creds.is_valid ? (
                  <><CheckCircle className="h-4 w-4 text-green-400" /><span className="text-green-400">Conectado</span></>
                ) : (
                  <><XCircle className="h-4 w-4 text-red-400" /><span className="text-red-400">Desconectado</span></>
                )}
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm text-white/60">Access Token</label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Cole seu Access Token aqui"
                className="glass-input w-full rounded-xl py-3 px-4 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-white/60">Ad Account ID</label>
              <input
                value={adAccountId}
                onChange={(e) => setAdAccountId(e.target.value)}
                placeholder="act_XXXXXXXXX"
                className="glass-input w-full rounded-xl py-3 px-4 text-sm"
              />
            </div>
            <div className="flex gap-3 mt-2">
              <button
                onClick={handleTestConnection}
                disabled={testConnection.isPending || !accessToken || !adAccountId}
                className="glass rounded-xl px-6 py-3 text-sm font-semibold border border-white/10 hover:border-orange/50 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {testConnection.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Testar Conexão
              </button>
              <button
                onClick={handleSaveIntegration}
                disabled={saveCredentials.isPending}
                className="btn-orange rounded-xl px-6 py-3 text-sm font-semibold disabled:opacity-50"
              >
                {saveCredentials.isPending ? 'Salvando...' : 'Salvar Integração'}
              </button>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
