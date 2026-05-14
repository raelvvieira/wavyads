import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CheckCircle, XCircle, Loader2, Users, Calendar, Pencil, RefreshCw, Trash2, UserPlus, X, Mail, Scan, Eye, EyeOff } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/hooks/useClients';
import { useAddClientUser, useClientUsers } from '@/hooks/useClientUsers';
import { useGetMetaAuthUrl, useSelectMetaAccount } from '@/hooks/useMetaOAuth';
import { useGetGoogleAdsAuthUrl, useSelectGoogleAdsAccount } from '@/hooks/useGoogleAdsOAuth';
import { useAllClientPixels, useUpsertClientPixel } from '@/hooks/useClientPixels';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  const addClientUser = useAddClientUser();
  const getAuthUrl = useGetMetaAuthUrl();
  const selectAccount = useSelectMetaAccount();
  const getGoogleAuthUrl = useGetGoogleAdsAuthUrl();
  const { data: pixelMap } = useAllClientPixels();
  const upsertPixel = useUpsertClientPixel();

  // Fetch all client access emails
  const { data: accessEmails } = useQuery({
    queryKey: ['all-client-access-emails'],
    queryFn: async () => {
      const { data: clientUsers, error: cuError } = await supabase
        .from('client_users')
        .select('client_id, user_id');
      if (cuError) throw cuError;
      if (!clientUsers?.length) return {};

      const userIds = [...new Set(clientUsers.map(cu => cu.user_id))];
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);
      if (pError) throw pError;

      const profileMap = new Map(profiles?.map(p => [p.id, p.email]) || []);
      const result: Record<string, string[]> = {};
      for (const cu of clientUsers) {
        const email = profileMap.get(cu.user_id);
        if (email) {
          if (!result[cu.client_id]) result[cu.client_id] = [];
          result[cu.client_id].push(email);
        }
      }
      return result;
    },
  });
  const selectGoogleAccount = useSelectGoogleAdsAccount();

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

  // Add access state
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [accessClientId, setAccessClientId] = useState('');
  const [accessClientName, setAccessClientName] = useState('');
  const [accessName, setAccessName] = useState('');
  const [accessEmail, setAccessEmail] = useState('');

  // Meta sync state
  const [syncingClientId, setSyncingClientId] = useState<string | null>(null);
  const [pendingAccounts, setPendingAccounts] = useState<any[] | null>(null);
  const [pendingSyncClientId, setPendingSyncClientId] = useState<string | null>(null);

  // Google Ads sync state
  const [syncingGoogleClientId, setSyncingGoogleClientId] = useState<string | null>(null);
  const [pendingGoogleAccounts, setPendingGoogleAccounts] = useState<any[] | null>(null);
  const [pendingGoogleSyncClientId, setPendingGoogleSyncClientId] = useState<string | null>(null);

  // Pixel Meta modal state
  const [pixelDialogOpen, setPixelDialogOpen] = useState(false);
  const [pixelClientId, setPixelClientId] = useState('');
  const [pixelClientName, setPixelClientName] = useState('');
  const [pixelIdInput, setPixelIdInput] = useState('');
  const [pixelTokenInput, setPixelTokenInput] = useState('');
  const [pixelTokenVisible, setPixelTokenVisible] = useState(false);
  const [hasExistingToken, setHasExistingToken] = useState(false);

  const openPixelModal = (clientId: string, clientName: string) => {
    const existing = pixelMap?.get(clientId);
    setPixelClientId(clientId);
    setPixelClientName(clientName);
    setPixelIdInput(existing?.pixel_id || '');
    setPixelTokenInput('');
    setPixelTokenVisible(false);
    setHasExistingToken(!!existing?.access_token);
    setPixelDialogOpen(true);
  };

  const handleSavePixel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pixelIdInput.trim()) return;
    const tokenTrimmed = pixelTokenInput.trim();
    const accessToken =
      hasExistingToken && tokenTrimmed === '' ? undefined : tokenTrimmed;
    if (accessToken !== undefined && accessToken === '') return;

    upsertPixel.mutate(
      { clientId: pixelClientId, pixelId: pixelIdInput.trim(), accessToken },
      {
        onSuccess: () => {
          toast({ title: 'Pixel configurado com sucesso!' });
          setPixelDialogOpen(false);
        },
        onError: (err: any) =>
          toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
      },
    );
  };

  // Listen for popup message
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'META_OAUTH_CALLBACK' && event.data?.accounts) {
        setPendingAccounts(event.data.accounts);
        setSyncingClientId(null);
      }
      if (event.data?.type === 'GOOGLE_ADS_OAUTH_CALLBACK' && event.data?.accounts) {
        setPendingGoogleAccounts(event.data.accounts);
        setSyncingGoogleClientId(null);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Auto-select if single account; show picker if multiple
  useEffect(() => {
    if (pendingAccounts && pendingSyncClientId && pendingAccounts.length === 1) {
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
  }, [pendingAccounts, pendingSyncClientId, selectAccount]);

  // Google Ads auto-select if single account
  useEffect(() => {
    if (pendingGoogleAccounts && pendingGoogleSyncClientId && pendingGoogleAccounts.length === 1) {
      const acc = pendingGoogleAccounts[0];
      selectGoogleAccount.mutate(
        { clientId: pendingGoogleSyncClientId, customerId: acc.id, customerName: acc.name },
        {
          onSuccess: () => {
            toast({ title: 'Sincronizado!', description: `Conta Google ${acc.name} vinculada.` });
            setPendingGoogleAccounts(null);
            setPendingGoogleSyncClientId(null);
          },
          onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
        }
      );
    }
  }, [pendingGoogleAccounts, pendingGoogleSyncClientId, selectGoogleAccount]);

  const handlePickAccount = (acc: any) => {
    if (!pendingSyncClientId) return;
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
  };

  const handlePickGoogleAccount = (acc: any) => {
    if (!pendingGoogleSyncClientId) return;
    selectGoogleAccount.mutate(
      { clientId: pendingGoogleSyncClientId, customerId: acc.id, customerName: acc.name },
      {
        onSuccess: () => {
          toast({ title: 'Sincronizado!', description: `Conta Google ${acc.name} vinculada.` });
          setPendingGoogleAccounts(null);
          setPendingGoogleSyncClientId(null);
        },
        onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
      }
    );
  };

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

  const handleGoogleSync = useCallback((clientId: string) => {
    setSyncingGoogleClientId(clientId);
    setPendingGoogleSyncClientId(clientId);
    const redirectUri = `${window.location.origin}/auth/google-ads/callback`;
    getGoogleAuthUrl.mutate(
      { clientId, redirectUri },
      {
        onSuccess: (url) => {
          const popup = window.open(url, 'google-ads-oauth', 'width=600,height=700,scrollbars=yes');
          if (!popup) {
            toast({ title: 'Erro', description: 'Popup bloqueado. Permita popups para este site.', variant: 'destructive' });
            setSyncingGoogleClientId(null);
          }
        },
        onError: (err: any) => {
          toast({ title: 'Erro', description: err.message, variant: 'destructive' });
          setSyncingGoogleClientId(null);
        },
      }
    );
  }, [getGoogleAuthUrl]);

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

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="glass border-white/10 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar cliente "{deleteName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja apagar este cliente? Todos os dados de anúncios e o acesso do cliente serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteClient.isPending}
              onClick={() => {
                deleteClient.mutate(deleteId, {
                  onSuccess: () => {
                    toast({ title: 'Cliente apagado', description: 'Todos os dados foram removidos.' });
                    setDeleteDialogOpen(false);
                  },
                  onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
                });
              }}
            >
              {deleteClient.isPending ? 'Apagando...' : 'Apagar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                <div className="mb-4 pr-16">
                  <h3 className="font-semibold text-base">{client.name}</h3>
                  {client.email && (
                    <p className="text-xs text-muted-foreground mt-0.5">{client.email}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {client.is_synced ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-accent" />
                        <span className="text-xs text-accent font-medium">Meta ✓</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Meta ✗</span>
                      </>
                    )}
                    <span className="text-muted-foreground/30">|</span>
                    {(client as any).google_ads_synced ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-accent" />
                        <span className="text-xs text-accent font-medium">Google ✓</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Google ✗</span>
                      </>
                    )}
                    <span className="text-muted-foreground/30">|</span>
                    {pixelMap?.has(client.id) ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-accent" />
                        <span className="text-xs text-accent font-medium">Pixel ✓</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Pixel ✗</span>
                      </>
                    )}
                  </div>
                </div>

                {client.meta_ad_account_name && (
                  <p className="text-xs text-muted-foreground mb-1">
                    Meta: {client.meta_ad_account_name}
                  </p>
                )}
                {(client as any).google_ads_customer_name && (
                  <p className="text-xs text-muted-foreground mb-1">
                    Google: {(client as any).google_ads_customer_name}
                  </p>
                )}

                {client.last_sync_at && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Meta sync: {new Date(client.last_sync_at).toLocaleDateString('pt-BR')}
                  </div>
                )}
                {(client as any).google_ads_last_sync_at && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Google sync: {new Date((client as any).google_ads_last_sync_at).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </div>

              {/* Access emails */}
              {accessEmails?.[client.id]?.length ? (
                <div className="mt-2 flex items-start gap-1.5">
                  <Mail className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="space-y-0.5">
                    {accessEmails[client.id].map((email) => (
                      <p key={email} className="text-xs text-muted-foreground">{email}</p>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Sync buttons */}
              <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                {(
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openPixelModal(client.id, client.name);
                    }}
                    className="btn-glass w-full rounded-xl py-2.5 text-xs font-medium flex items-center justify-center gap-2"
                  >
                    <Scan className="h-3.5 w-3.5" />
                    Sincronizar Pixel Meta
                  </button>
                )}
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGoogleSync(client.id);
                  }}
                  disabled={syncingGoogleClientId === client.id}
                  className="btn-glass w-full rounded-xl py-2.5 text-xs font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {syncingGoogleClientId === client.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {(client as any).google_ads_synced ? 'Resincronizar Google' : 'Sincronizar Google'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAccessClientId(client.id);
                    setAccessClientName(client.name);
                    setAccessName('');
                    setAccessEmail('');
                    setAccessDialogOpen(true);
                  }}
                  className="btn-glass w-full rounded-xl py-2.5 text-xs font-medium flex items-center justify-center gap-2"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Adicionar Acesso
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Account Picker Dialog */}
      <Dialog open={!!pendingAccounts && pendingAccounts.length > 1} onOpenChange={(open) => {
        if (!open) {
          setPendingAccounts(null);
          setPendingSyncClientId(null);
        }
      }}>
        <DialogContent className="glass border-white/10 bg-card max-w-md">
          <DialogHeader>
            <DialogTitle>Escolha a conta de anúncios</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2 max-h-80 overflow-y-auto">
            {pendingAccounts?.map((acc: any) => (
              <button
                key={acc.id}
                onClick={() => handlePickAccount(acc)}
                disabled={selectAccount.isPending}
                className="w-full text-left glass rounded-xl p-4 hover:border-accent/50 hover:bg-white/5 transition-all disabled:opacity-50"
              >
                <p className="font-medium text-sm">{acc.name}</p>
                {acc.business_name && (
                  <p className="text-xs text-muted-foreground mt-0.5">{acc.business_name}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">ID: {acc.id}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Google Ads Account Picker Dialog */}
      <Dialog open={!!pendingGoogleAccounts && pendingGoogleAccounts.length > 1} onOpenChange={(open) => {
        if (!open) {
          setPendingGoogleAccounts(null);
          setPendingGoogleSyncClientId(null);
        }
      }}>
        <DialogContent className="glass border-white/10 bg-card max-w-md">
          <DialogHeader>
            <DialogTitle>Escolha a conta Google Ads</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2 max-h-80 overflow-y-auto">
            {pendingGoogleAccounts?.map((acc: any) => (
              <button
                key={acc.id}
                onClick={() => handlePickGoogleAccount(acc)}
                disabled={selectGoogleAccount.isPending}
                className="w-full text-left glass rounded-xl p-4 hover:border-accent/50 hover:bg-white/5 transition-all disabled:opacity-50"
              >
                <p className="font-medium text-sm">{acc.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">ID: {acc.id}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Access Dialog */}
      <Dialog open={accessDialogOpen} onOpenChange={setAccessDialogOpen}>
        <DialogContent className="glass border-white/10 bg-card">
          <DialogHeader>
            <DialogTitle>Adicionar Acesso — {accessClientName}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!accessName.trim() || !accessEmail.trim()) return;
              addClientUser.mutate(
                { clientId: accessClientId, name: accessName.trim(), email: accessEmail.trim() },
                {
                  onSuccess: (data: any) => {
                    toast({ title: 'Acesso concedido!', description: data?.message || 'O usuário receberá um email.' });
                    setAccessDialogOpen(false);
                  },
                  onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
                }
              );
            }}
            className="space-y-4 mt-4"
          >
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Nome *</label>
              <input
                value={accessName}
                onChange={(e) => setAccessName(e.target.value)}
                placeholder="Nome da pessoa"
                required
                className="glass-input w-full rounded-xl py-3 px-4 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Email *</label>
              <input
                value={accessEmail}
                onChange={(e) => setAccessEmail(e.target.value)}
                placeholder="email@exemplo.com"
                type="email"
                required
                className="glass-input w-full rounded-xl py-3 px-4 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Se o usuário ainda não tiver conta, receberá um convite para criar senha
              </p>
            </div>
            <button
              type="submit"
              disabled={addClientUser.isPending}
              className="btn-accent w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
            >
              {addClientUser.isPending ? 'Adicionando...' : 'Conceder Acesso'}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pixel Meta Dialog */}
      <Dialog open={pixelDialogOpen} onOpenChange={setPixelDialogOpen}>
        <DialogContent className="glass border-white/10 bg-card">
          <DialogHeader>
            <DialogTitle>Configurar Pixel Meta</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Insira os dados do Pixel para habilitar o envio de conversões offline
            </p>
          </DialogHeader>
          <form onSubmit={handleSavePixel} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">
                Pixel ID * <span className="text-xs">— {pixelClientName}</span>
              </label>
              <input
                value={pixelIdInput}
                onChange={(e) => setPixelIdInput(e.target.value)}
                placeholder="ex: 123456789012345"
                required
                className="glass-input w-full rounded-xl py-3 px-4 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">
                Access Token {hasExistingToken ? '' : '*'}
              </label>
              <div className="relative">
                <input
                  value={pixelTokenInput}
                  onChange={(e) => setPixelTokenInput(e.target.value)}
                  placeholder={hasExistingToken ? '••••••••' : 'EAABs...'}
                  type={pixelTokenVisible ? 'text' : 'password'}
                  required={!hasExistingToken}
                  className="glass-input w-full rounded-xl py-3 px-4 pr-12 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setPixelTokenVisible((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  title={pixelTokenVisible ? 'Ocultar' : 'Mostrar'}
                >
                  {pixelTokenVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {hasExistingToken && (
                <p className="text-xs text-muted-foreground">
                  Token já configurado — deixe em branco para manter o atual
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPixelDialogOpen(false)}
                className="btn-glass flex-1 rounded-xl py-3 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={upsertPixel.isPending}
                className="btn-accent flex-1 rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
              >
                {upsertPixel.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
