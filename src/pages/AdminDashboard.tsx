import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CheckCircle, XCircle, Loader2, Users, Calendar } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { useClients, useCreateClient } from '@/hooks/useClients';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    createClient.mutate(
      { name: newName.trim(), email: newEmail.trim() || undefined },
      {
        onSuccess: () => {
          toast({ title: 'Cliente adicionado!' });
          setDialogOpen(false);
          setNewName('');
          setNewEmail('');
        },
        onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
      }
    );
  };

  return (
    <div className="p-6 pt-20 lg:pt-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie seus clientes e sincronize com Meta Ads
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button className="btn-accent rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Cliente
            </button>
          </DialogTrigger>
          <DialogContent className="glass border-white/10 bg-card">
            <DialogHeader>
              <DialogTitle>Adicionar Cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Nome *</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nome do cliente"
                  required
                  className="glass-input w-full rounded-xl py-3 px-4 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Email *</label>
                <input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  type="email"
                  required
                  className="glass-input w-full rounded-xl py-3 px-4 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  O cliente receberá um email para criar sua senha
                </p>
              </div>
              <button
                type="submit"
                disabled={createClient.isPending}
                className="btn-accent w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
              >
                {createClient.isPending ? 'Criando...' : 'Adicionar Cliente'}
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <GlassCard key={i}><Skeleton className="h-32 bg-white/5" /></GlassCard>
          ))}
        </div>
      ) : !clients?.length ? (
        <GlassCard className="flex flex-col items-center justify-center py-16 animate-fade-in">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum cliente ainda</h3>
          <p className="text-sm text-muted-foreground mb-4">Adicione seu primeiro cliente para começar</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {clients.map((client) => (
            <GlassCard
              key={client.id}
              className="cursor-pointer transition-all duration-300 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5 animate-fade-in"
              onClick={() => navigate(`/dashboard/${client.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-base">{client.name}</h3>
                  {client.email && (
                    <p className="text-xs text-muted-foreground mt-0.5">{client.email}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {client.is_synced ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-accent" />
                      <span className="text-xs text-accent font-medium">Sincronizado</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Não sincronizado</span>
                    </>
                  )}
                </div>
              </div>

              {client.meta_ad_account_name && (
                <p className="text-xs text-muted-foreground mb-2">
                  Conta: {client.meta_ad_account_name}
                </p>
              )}

              {client.last_sync_at && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Último sync: {new Date(client.last_sync_at).toLocaleDateString('pt-BR')}
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
