import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();

  // Redirect if already logged in
  if (user) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await signUp(email, password, name);
      setLoading(false);
      if (error) {
        toast({ title: 'Erro ao criar conta', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Conta criada!', description: 'Verifique seu email para confirmar o cadastro.' });
      }
    } else {
      const { error } = await signIn(email, password);
      setLoading(false);
      if (error) {
        toast({ title: 'Erro ao entrar', description: error.message, variant: 'destructive' });
      } else {
        navigate('/dashboard');
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(26,205,138,0.08)_0%,_transparent_70%)]" />

      <div className="relative z-10 w-full max-w-md px-6 animate-fade-in">
        <div className="glass rounded-2xl p-8 space-y-8">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl btn-orange orange-glow">
              <Zap className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">AdsPro</h1>
            <p className="text-sm text-white/60">
              {isSignUp ? 'Crie sua conta para começar' : 'Gerencie seus anúncios com inteligência'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div className="space-y-2">
                <label className="text-sm text-white/60">Nome</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="glass-input w-full rounded-xl py-3 pl-10 pr-4 text-sm"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm text-white/60">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
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
              <label className="text-sm text-white/60">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
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
              className="btn-orange w-full rounded-xl py-3 text-sm font-semibold transition-all duration-300 disabled:opacity-50"
            >
              {loading ? 'Carregando...' : isSignUp ? 'Criar Conta' : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-sm text-white/40">
            {isSignUp ? 'Já tem uma conta?' : 'Não tem uma conta?'}{' '}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-white/60 hover:text-white transition-colors"
            >
              {isSignUp ? 'Entrar' : 'Criar conta'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
