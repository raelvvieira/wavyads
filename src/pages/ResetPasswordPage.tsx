import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import wavyLogo from '@/assets/wavy-logo.png';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    let resolved = false;

    const resolve = () => {
      if (!resolved) {
        resolved = true;
        setSessionReady(true);
      }
    };

    // Method 1: token_hash in query params (direct link bypassing Supabase redirect)
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type');

    if (tokenHash && type === 'recovery') {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
        .then(({ error }) => {
          if (error) {
            console.error('verifyOtp error:', error);
            setError('Link inválido ou expirado. Solicite um novo link de recuperação.');
          } else {
            resolve();
          }
        });
    }

    // Method 2: Listen for auth state change (from Supabase redirect flow or hash fragment)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        resolve();
      }
    });

    // Method 3: Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) resolve();
    });

    // Timeout fallback
    const timeout = setTimeout(() => {
      if (!resolved && !sessionReady) {
        setError('Link inválido ou expirado. Solicite um novo link de recuperação.');
      }
    }, 15000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: 'As senhas não coincidem', variant: 'destructive' });
      return;
    }

    if (password.length < 6) {
      toast({ title: 'A senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({ title: 'Erro ao definir senha', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Senha definida com sucesso!' });
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(26,205,138,0.08)_0%,_transparent_70%)]" />

      <div className="relative z-10 w-full max-w-md px-6 animate-fade-in">
        <div className="glass rounded-2xl p-8 space-y-8">
          <div className="flex flex-col items-center gap-3">
            <img src={wavyLogo} alt="WAVY" className="h-14 w-14 rounded-2xl object-contain" />
            <h1 className="text-2xl font-semibold tracking-tight">WAVY Dash</h1>
            <p className="text-sm text-muted-foreground text-center">
              Defina uma senha para acessar seu dashboard
            </p>
          </div>

          {error ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <p className="text-sm text-destructive text-center">{error}</p>
              <button
                onClick={() => navigate('/login')}
                className="btn-accent rounded-xl py-3 px-6 text-sm font-semibold transition-all duration-300"
              >
                Voltar ao login
              </button>
            </div>
          ) : !sessionReady ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Verificando link...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Nova senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="glass-input w-full rounded-xl py-3 pl-10 pr-4 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Confirmar senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="glass-input w-full rounded-xl py-3 pl-10 pr-4 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-accent w-full rounded-xl py-3 text-sm font-semibold transition-all duration-300 disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Definir senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
