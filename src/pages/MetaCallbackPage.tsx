import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMetaCallback } from '@/hooks/useMetaOAuth';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function MetaCallbackPage() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const clientId = searchParams.get('state');
  const metaCallback = useMetaCallback();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!code || !clientId) {
      setStatus('error');
      setErrorMsg('Parâmetros inválidos.');
      return;
    }

    const redirectUri = `${window.location.origin}/auth/meta/callback`;
    metaCallback.mutate(
      { code, clientId, redirectUri },
      {
        onSuccess: (data) => {
          setStatus('success');
          // Send accounts to parent window
          if (window.opener) {
            window.opener.postMessage({ type: 'META_OAUTH_CALLBACK', accounts: data.accounts || [] }, '*');
            setTimeout(() => window.close(), 1500);
          }
        },
        onError: (err: any) => {
          setStatus('error');
          setErrorMsg(err.message || 'Erro ao conectar');
        },
      }
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="glass rounded-2xl p-8 text-center max-w-sm animate-fade-in">
        {status === 'loading' && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-accent mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Conectando com Meta...</p>
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
