import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import wavyLogo from '@/assets/wavy-logo.png';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasExistingSession, setHasExistingSession] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const tokenHash = searchParams.get('token_hash');
  const emailFromLink = searchParams.get('email');

  useEffect(() => {
    // Check if Supabase already delivered a session (legacy hash-fragment flow
    // from "esqueci minha senha"). In that case we skip verifyOtp on submit.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setHasExistingSession(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setHasExistingSession(true);
      }
    });

    return () => subscription.unsubscribe();
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

    try {
      // If we don't already have a session, consume the token NOW (on submit),
      // not on page load. This prevents email link scanners (Outlook Safe Links,
      // Gmail preview, antivírus) from burning the one-time token before the
      // user actually clicks.
      if (!hasExistingSession) {
        if (!tokenHash) {
          toast({
            title: 'Link inválido',
            description: 'Solicite um novo link de acesso.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        });

        if (verifyError) {
          console.error('verifyOtp error:', verifyError);
          toast({
            title: 'Link expirado ou inválido',
            description: 'Use "Esqueci minha senha" no login para receber um novo link.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        toast({
          title: 'Erro ao definir senha',
          description: updateError.message,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      toast({ title: 'Senha definida! Redirecionando...' });
      navigate('/dashboard');
    } catch (err) {
      console.error('reset-password submit error:', err);
      toast({
        title: 'Erro inesperado',
        description: 'Tente novamente em instantes.',
        variant: 'destructive',
      });
      setLoading(false);
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

          <form onSubmit={handleSubmit} className="space-y-5">
            {emailFromLink && (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={emailFromLink}
                    readOnly
                    className="glass-input w-full rounded-xl py-3 pl-10 pr-4 text-sm opacity-70 cursor-not-allowed"
                  />
                </div>
              </div>
            )}

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
              {loading ? 'Salvando...' : 'Definir senha e entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
