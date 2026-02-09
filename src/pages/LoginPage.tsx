import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
      {/* Radial gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,107,53,0.08)_0%,_transparent_70%)]" />

      <div className="relative z-10 w-full max-w-md px-6 animate-fade-in">
        <div className="glass rounded-2xl p-8 space-y-8">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl btn-orange orange-glow">
              <Zap className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">AdsPro</h1>
            <p className="text-sm text-white/60">Gerencie seus anúncios com inteligência</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm text-white/60">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
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
                  className="glass-input w-full rounded-xl py-3 pl-10 pr-4 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-orange w-full rounded-xl py-3 text-sm font-semibold transition-all duration-300"
            >
              Entrar
            </button>
          </form>

          <p className="text-center text-sm text-white/40">
            Não tem uma conta?{' '}
            <button className="text-white/60 hover:text-white transition-colors">
              Criar conta
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
