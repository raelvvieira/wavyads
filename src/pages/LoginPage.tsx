import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import wavyLogo from '@/assets/wavy-logo.png';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const navigate = useNavigate();
  const { signIn, user } = useAuth();

  if (user) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast({ title: 'Erro ao entrar', description: error.message, variant: 'destructive' });
    } else {
      navigate('/dashboard');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: 'Digite seu email', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Email enviado!', description: 'Verifique sua caixa de entrada para redefinir sua senha.' });
      setForgotMode(false);
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
            <p className="text-sm text-muted-foreground">
              {forgotMode ? 'Recupere o acesso à sua conta' : 'Gerencie seus anúncios com inteligência'}
            </p>
          </div>

          {forgotMode ? (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="glass-input w-full rounded-xl py-3 pl-10 pr-4 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-accent w-full rounded-xl py-3 text-sm font-semibold transition-all duration-300 disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>

              <p className="text-center text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setForgotMode(false)}
                  className="text-foreground/60 hover:text-foreground transition-colors"
                >
                  Voltar ao login
                </button>
              </p>
            </form>
          ) : (
            <>
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                      className="glass-input w-full rounded-xl py-3 pl-10 pr-4 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Senha</label>
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

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-accent w-full rounded-xl py-3 text-sm font-semibold transition-all duration-300 disabled:opacity-50"
                >
                  {loading ? 'Carregando...' : 'Entrar'}
                </button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                <button
                  onClick={() => setForgotMode(true)}
                  className="text-foreground/60 hover:text-foreground transition-colors"
                >
                  Esqueci minha senha
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
