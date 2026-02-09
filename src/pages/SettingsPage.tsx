import { useState } from 'react';
import { GlassCard } from '@/components/GlassCard';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'notificacoes', label: 'Notificações' },
  { id: 'integracao', label: 'Integração' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('perfil');

  return (
    <div className="p-6 pt-20 lg:pt-6 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>

      {/* Tabs */}
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
            {[
              { label: 'Nome', placeholder: 'Seu nome', defaultValue: 'Admin' },
              { label: 'Email', placeholder: 'seu@email.com', defaultValue: 'admin@adspro.com' },
              { label: 'Empresa', placeholder: 'Nome da empresa', defaultValue: 'AdsPro Agency' },
            ].map((field) => (
              <div key={field.label} className="space-y-1.5">
                <label className="text-sm text-white/60">{field.label}</label>
                <input
                  defaultValue={field.defaultValue}
                  placeholder={field.placeholder}
                  className="glass-input w-full rounded-xl py-3 px-4 text-sm"
                />
              </div>
            ))}
            <button className="btn-orange rounded-xl px-6 py-3 text-sm font-semibold mt-2">
              Salvar Alterações
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
          <h2 className="text-lg font-semibold mb-6">API do Facebook</h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm text-white/60">Access Token</label>
              <input
                type="password"
                defaultValue="EAABsbCS..."
                className="glass-input w-full rounded-xl py-3 px-4 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-white/60">App ID</label>
              <input
                defaultValue="123456789"
                className="glass-input w-full rounded-xl py-3 px-4 text-sm"
              />
            </div>
            <button className="btn-orange rounded-xl px-6 py-3 text-sm font-semibold mt-2">
              Salvar Integração
            </button>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
