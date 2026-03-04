import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useExchangeCode } from '@/hooks/useFacebookOAuth';
import { Loader2 } from 'lucide-react';

export default function FacebookCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const exchangeCode = useExchangeCode();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error_description') || searchParams.get('error');

    if (errorParam) {
      setError(errorParam);
      setTimeout(() => navigate('/configuracoes'), 3000);
      return;
    }

    if (!code) {
      setError('Código de autorização não encontrado');
      setTimeout(() => navigate('/configuracoes'), 3000);
      return;
    }

    const redirectUri = `${window.location.origin}/auth/facebook/callback`;

    exchangeCode.mutate(
      { code, redirectUri },
      {
        onSuccess: () => {
          navigate('/configuracoes?fb_connected=1');
        },
        onError: (err: any) => {
          setError(err.message || 'Erro ao conectar com Facebook');
          setTimeout(() => navigate('/configuracoes'), 3000);
        },
      }
    );
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="glass rounded-2xl p-8 max-w-md w-full text-center space-y-4">
        {error ? (
          <>
            <p className="text-destructive font-medium">{error}</p>
            <p className="text-sm text-muted-foreground">Redirecionando...</p>
          </>
        ) : (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-foreground font-medium">Conectando com Facebook...</p>
            <p className="text-sm text-muted-foreground">Aguarde enquanto finalizamos a autorização.</p>
          </>
        )}
      </div>
    </div>
  );
}
