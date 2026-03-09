import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGoogleAdsCallback } from '@/hooks/useGoogleAdsOAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function GoogleAdsCallbackPage() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const clientId = searchParams.get('state');
  const googleCallback = useGoogleAdsCallback();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!code || !clientId) {
      setStatus('error');
      setErrorMsg('Parâmetros inválidos.');
      return;
    }

    const handleCallback = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setStatus('error');
        setErrorMsg('Sessão não encontrada nesta janela. Feche e tente conectar novamente.');
        return;
      }

      const redirectUri = `${window.location.origin}/auth/google-ads/callback`;
      googleCallback.mutate(
        { code, clientId, redirectUri, accessToken: session.access_token },
        {
          onSuccess: (data) => {
            setStatus('success');
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_ADS_OAUTH_CALLBACK', accounts: data.accounts || [] }, '*');
              setTimeout(() => window.close(), 1500);
            }
          },
          onError: async (err: any) => {
            setStatus('error');
            let msg = 'Erro ao conectar';
            try {
              if (err?.context && typeof err.context.text === 'function') {
                const raw = await err.context.text();
                if (raw) {
                  try { msg = JSON.parse(raw)?.error || raw; } catch { msg = raw; }
                }
              }
              if (msg === 'Erro ao conectar' && err?.message && !String(err.message).includes('non-2xx')) {
                msg = String(err.message);
              }
            } catch {
              if (err?.message) msg = String(err.message);
            }
            setErrorMsg(msg);
          },
        }
      );
    };

    handleCallback();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="glass rounded-2xl p-8 text-center max-w-sm animate-fade-in">
        {status === 'loading' && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-accent mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Conectando com Google Ads...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="h-10 w-10 text-accent mx-auto mb-4" />
            <p className="text-sm font-medium">Conectado com sucesso!</p>
            <p className="text-xs text-muted-foreground mt-1">Esta janela será fechada automaticamente.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
            <p className="text-sm font-medium">Erro ao conectar</p>
            <p className="text-xs text-muted-foreground mt-1">{errorMsg}</p>
            <button onClick={() => window.close()} className="text-xs text-accent mt-4 hover:underline">
              Fechar janela
            </button>
          </>
        )}
      </div>
    </div>
  );
}
