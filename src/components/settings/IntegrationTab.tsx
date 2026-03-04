import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/GlassCard';
import { useCredentials } from '@/hooks/useFacebookAds';
import { useGetAuthUrl, useAdAccounts, useSelectAccount, useDisconnectFacebook } from '@/hooks/useFacebookOAuth';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Loader2, LogOut, ExternalLink } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export function IntegrationTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: creds, isLoading: credsLoading } = useCredentials();
  const getAuthUrl = useGetAuthUrl();
  const selectAccount = useSelectAccount();
  const disconnect = useDisconnectFacebook();

  // Determine state: disconnected | selecting | connected
  const hasToken = !!creds?.access_token && creds.access_token !== '';
  const hasAccount = !!creds?.ad_account_id && creds.ad_account_id !== '';
  const isConnected = hasToken && hasAccount && creds?.is_valid;
  const needsAccountSelection = hasToken && !isConnected;

  const { data: accounts, isLoading: accountsLoading } = useAdAccounts(needsAccountSelection);

  // Show toast when redirected from OAuth
  useEffect(() => {
    if (searchParams.get('fb_connected') === '1') {
      toast({ title: 'Facebook conectado!', description: 'Agora selecione uma conta de anúncios.' });
      searchParams.delete('fb_connected');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  const handleConnect = async () => {
    const redirectUri = `${window.location.origin}/auth/facebook/callback`;
    getAuthUrl.mutate(redirectUri, {
      onSuccess: (url) => {
        window.location.href = url;
      },
      onError: (err: any) => {
        toast({ title: 'Erro', description: err.message, variant: 'destructive' });
      },
    });
  };

  const handleSelectAccount = (account: { id: string; name: string }) => {
    selectAccount.mutate(
      { adAccountId: account.id, adAccountName: account.name },
      {
        onSuccess: () => toast({ title: 'Conta conectada!', description: account.name }),
        onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
      }
    );
  };

  const handleDisconnect = () => {
    disconnect.mutate(undefined, {
      onSuccess: () => toast({ title: 'Facebook desconectado' }),
      onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
    });
  };

  if (credsLoading) {
    return (
      <GlassCard className="max-w-2xl animate-fade-in">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </GlassCard>
    );
  }

  // STATE: Connected
  if (isConnected) {
    return (
      <GlassCard className="max-w-2xl animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Facebook Ads</h2>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-green-400">Conectado</span>
          </div>
        </div>

        <div className="glass rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{creds?.ad_account_name || creds?.ad_account_id}</p>
              <p className="text-xs text-muted-foreground">
                ID: {creds?.ad_account_id}
              </p>
              {creds?.token_expires_at && (
                <p className="text-xs text-muted-foreground">
                  Token expira em: {new Date(creds.token_expires_at).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
            <button
              onClick={handleDisconnect}
              disabled={disconnect.isPending}
              className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 transition-colors"
            >
              {disconnect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Desconectar
            </button>
          </div>
        </div>
      </GlassCard>
    );
  }

  // STATE: Account selection
  if (needsAccountSelection) {
    return (
      <GlassCard className="max-w-2xl animate-fade-in">
        <h2 className="text-lg font-semibold mb-2">Selecione uma Conta de Anúncios</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Escolha a conta de anúncios que deseja conectar ao dashboard.
        </p>

        {accountsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Carregando contas...</span>
          </div>
        ) : accounts && accounts.length > 0 ? (
          <div className="space-y-2">
            {accounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => handleSelectAccount({ id: acc.id, name: acc.name })}
                disabled={selectAccount.isPending}
                className="w-full glass rounded-xl p-4 text-left hover:border-primary/50 transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="text-sm font-medium">{acc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    ID: {acc.account_id}
                    {acc.business_name && ` · ${acc.business_name}`}
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <XCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma conta de anúncios encontrada.</p>
            <button onClick={handleDisconnect} className="text-sm text-primary mt-2 hover:underline">
              Tentar novamente
            </button>
          </div>
        )}
      </GlassCard>
    );
  }

  // STATE: Disconnected
  return (
    <GlassCard className="max-w-2xl animate-fade-in">
      <h2 className="text-lg font-semibold mb-2">Facebook Ads</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Conecte sua conta do Facebook para importar dados de campanhas automaticamente.
      </p>

      <button
        onClick={handleConnect}
        disabled={getAuthUrl.isPending}
        className="btn-orange rounded-xl px-6 py-3 text-sm font-semibold flex items-center gap-3 disabled:opacity-50"
      >
        {getAuthUrl.isPending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        )}
        Conectar com Facebook
      </button>
    </GlassCard>
  );
}
