import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CheckCircle, XCircle, Loader2, Users, Calendar, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/hooks/useClients';
import { useGetMetaAuthUrl, useSelectMetaAccount } from '@/hooks/useMetaOAuth';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const getAuthUrl = useGetMetaAuthUrl();
  const selectAccount = useSelectMetaAccount();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState('');
  const [deleteName, setDeleteName] = useState('');

  // Meta sync state
  const [syncingClientId, setSyncingClientId] = useState<string | null>(null);
  const [pendingAccounts, setPendingAccounts] = useState<any[] | null>(null);
  const [pendingSyncClientId, setPendingSyncClientId] = useState<string | null>(null);

  // Listen for popup message
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'META_OAUTH_CALLBACK' && event.data?.accounts) {
        setPendingAccounts(event.data.accounts);
        setSyncingClientId(null);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Auto-select if single account
  useEffect(() => {
    if (pendingAccounts && pendingSyncClientId) {
      if (pendingAccounts.length === 1) {
        const acc = pendingAccounts[0];
        selectAccount.mutate(
          { clientId: pendingSyncClientId, adAccountId: acc.id, adAccountName: acc.name },
          {
            onSuccess: () => {
              toast({ title: 'Sincronizado!', description: `Conta ${acc.name} vinculada.` });
              setPendingAccounts(null);
              setPendingSyncClientId(null);
            },
            onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
          }
        );
      }
      // If multiple accounts, for now just pick the first (could show a picker)
      if (pendingAccounts.length > 1) {
        const acc = pendingAccounts[0];
        selectAccount.mutate(
          { clientId: pendingSyncClientId, adAccountId: acc.id, adAccountName: acc.name },
          {
            onSuccess: () => {
              toast({ title: 'Sincronizado!', description: `Conta ${acc.name} vinculada.` });
              setPendingAccounts(null);
              setPendingSyncClientId(null);
            },
            onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
          }
        );
      }
    }
  }, [pendingAccounts, pendingSyncClientId, selectAccount]);

  const handleSync = useCallback((clientId: string) => {
    setSyncingClientId(clientId);
    setPendingSyncClientId(clientId);
    const redirectUri = `${window.location.origin}/auth/meta/callback`;
    getAuthUrl.mutate(
      { clientId, redirectUri },
      {
        onSuccess: (url) => {
          const popup = window.open(url, 'meta-oauth', 'width=600,height=700,scrollbars=yes');
          if (!popup) {
            toast({ title: 'Erro', description: 'Popup bloqueado. Permita popups para este site.', variant: 'destructive' });
            setSyncingClientId(null);
          }
        },
        onError: (err: any) => {
          toast({ title: 'Erro', description: err.message, variant: 'destructive' });
          setSyncingClientId(null);
        },
      }
    );
  }, [getAuthUrl]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    createClient.mutate(
      { name: newName.trim(), email: newEmail.trim() },
      {
        onSuccess: (data: any) => {
          toast({ title: 'Convite enviado!', description: data?.message || 'O cliente receberá um email para criar sua senha.' });
          setDialogOpen(false);
          setNewName('');
          setNewEmail('');
        },
        onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
      }
    );
  };

  const openEdit = (client: { id: string; name: string; email: string | null }) => {
    setEditId(client.id);
    setEditName(client.name);
    setEditEmail(client.email || '');
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    updateClient.mutate(
      { id: editId, name: editName.trim(), email: editEmail.trim() },
      {
        onSuccess: () => {
          toast({ title: 'Atualizado!', description: 'Dados do cliente atualizados.' });
          setEditDialogOpen(false);
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="glass border-white/10 bg-card">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Nome *</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nome do cliente"
                required
                className="glass-input w-full rounded-xl py-3 px-4 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Email</label>
              <input
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="email@exemplo.com"
                type="email"
                className="glass-input w-full rounded-xl py-3 px-4 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={updateClient.isPending}
              className="btn-accent w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
            >
              {updateClient.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </form>
        </DialogContent>
      </Dialog>

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
              className="relative transition-all duration-300 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5 animate-fade-in"
            >
              {/* Action buttons */}
              <div className="absolute top-4 right-4 flex items-center gap-1 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(client);
                  }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
                  title="Editar cliente"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteId(client.id);
                    setDeleteName(client.name);
                    setDeleteDialogOpen(true);
                  }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-white/10 transition-colors"
                  title="Apagar cliente"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div
                className="cursor-pointer"
                onClick={() => navigate(`/dashboard/${client.id}`)}
              >
                <div className="flex items-start justify-between mb-4 pr-8">
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
              </div>

              {/* Re-sync button */}
              <div className="mt-4 pt-3 border-t border-white/10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSync(client.id);
                  }}
                  disabled={syncingClientId === client.id}
                  className="btn-glass w-full rounded-xl py-2.5 text-xs font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {syncingClientId === client.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {client.is_synced ? 'Resincronizar Meta' : 'Sincronizar Meta'}
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
