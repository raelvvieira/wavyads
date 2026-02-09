import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { mockClients, formatCurrency } from '@/data/mock';
import { Client } from '@/types';

export default function ClientsPage() {
  const [clients, setClients] = useState(mockClients);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '' });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newClient: Client = {
      id: String(Date.now()),
      ...form,
      totalSpend: 0,
      activeCampaigns: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setClients([...clients, newClient]);
    setForm({ name: '', company: '', email: '', phone: '' });
    setModalOpen(false);
  };

  return (
    <div className="p-6 pt-20 lg:pt-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="btn-orange flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" />
          Novo Cliente
        </button>
      </div>

      <GlassCard className="animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-white/60 font-medium">Nome</th>
                <th className="text-left py-3 px-4 text-white/60 font-medium">Empresa</th>
                <th className="text-left py-3 px-4 text-white/60 font-medium hidden md:table-cell">Email</th>
                <th className="text-right py-3 px-4 text-white/60 font-medium">Total Gasto</th>
                <th className="text-right py-3 px-4 text-white/60 font-medium">Campanhas</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                  <td className="py-3 px-4 font-medium">{c.name}</td>
                  <td className="py-3 px-4 text-white/70">{c.company}</td>
                  <td className="py-3 px-4 text-white/50 hidden md:table-cell">{c.email}</td>
                  <td className="py-3 px-4 text-right metric-number">{formatCurrency(c.totalSpend)}</td>
                  <td className="py-3 px-4 text-right">{c.activeCampaigns}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in">
          <div className="glass w-full max-w-md rounded-2xl p-8 relative">
            <button onClick={() => setModalOpen(false)} className="absolute top-4 right-4 text-white/40 hover:text-white">
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-semibold mb-6">Novo Cliente</h2>
            <form onSubmit={handleSave} className="space-y-4">
              {(['name', 'company', 'email', 'phone'] as const).map((field) => (
                <div key={field} className="space-y-1.5">
                  <label className="text-sm text-white/60 capitalize">
                    {field === 'name' ? 'Nome' : field === 'company' ? 'Empresa' : field === 'email' ? 'Email' : 'Telefone'}
                  </label>
                  <input
                    value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    className="glass-input w-full rounded-xl py-3 px-4 text-sm"
                    required
                  />
                </div>
              ))}
              <button type="submit" className="btn-orange w-full rounded-xl py-3 text-sm font-semibold mt-2">
                Salvar Cliente
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
