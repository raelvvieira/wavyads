import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
  Users,
  Wand2,
  PlayCircle,
  Zap,
  Contact,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAiUsage } from '@/lib/aiUsageTracker';
import wavyLogo from '@/assets/wavy-logo.png';

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin } = useRole();
  const usage = useAiUsage();

  const fmtTokens = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : String(n);
  const fmtBrl = (n: number) =>
    n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const clientItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', show: true },
    { to: '/comercial', icon: Users, label: 'Comercial', show: true },
    { to: '/crm', icon: Contact, label: 'CRM', show: true },
  ];

  const adminItems = [
    { to: '/google-ads-ai', icon: Sparkles, label: 'Google Ads I.A', show: isAdmin },
    { to: '/criativo-studio', icon: Wand2, label: 'Criativo Studio', show: isAdmin },
    { to: '/social-midia-studio', icon: PlayCircle, label: 'Social Mídia Studio', show: isAdmin },
    { to: '/configuracoes', icon: Settings, label: 'Configurações', show: isAdmin },
  ];

  const renderItem = (item: { to: string; icon: typeof LayoutDashboard; label: string }) => {
    const isActive = location.pathname === item.to || (item.to === '/dashboard' && location.pathname.startsWith('/dashboard'));
    return (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={() => setCollapsed(false)}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'flex min-h-[44px] items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium',
          'transition-[background-color,color] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]',
          isActive
            // Pílula sólida da marca: estado ativo tem que ser inequívoco,
            // e o gradiente WAVY é ênfase — cabe exatamente aqui.
            ? 'bg-[image:var(--wavy-gradient)] text-white shadow-[0_6px_18px_rgba(244,91,32,0.30)]'
            : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
        )}
      >
        <item.icon className="h-5 w-5" />
        {item.label}
      </NavLink>
    );
  };

  const visibleAdminItems = adminItems.filter((i) => i.show);

  return (
    <>
      {!collapsed && (
        <button
          className="fixed top-4 left-4 z-50 lg:hidden glass-island flex h-11 w-11 items-center justify-center rounded-xl"
          onClick={() => setCollapsed(true)}
          aria-label="Abrir menu de navegação"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-white/10',
          'transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]',
          'bg-[var(--wavy-surface)] lg:bg-[var(--wavy-glass)] lg:backdrop-blur-xl lg:backdrop-saturate-125',
          'lg:translate-x-0',
          collapsed ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-16 items-center gap-3 px-6 border-b border-white/10">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-[var(--wavy-surface-elevated)]">
            <img src={wavyLogo} alt="WAVY" className="h-7 w-7 object-contain" />
          </div>
          <span className="text-lg font-semibold tracking-tight">WAVY Dash</span>
          <button
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-xl text-white/60 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Fechar menu de navegação"
            onClick={() => setCollapsed(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {clientItems.filter((i) => i.show).map(renderItem)}

          {visibleAdminItems.length > 0 && (
            <>
              <div className="pt-4 pb-2 px-4">
                <div className="border-t border-white/10 mb-3" />
                <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
                  Gestão WAVY
                </span>
              </div>
              {visibleAdminItems.map(renderItem)}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-3">
          {isAdmin && (
            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
              <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-white/40 font-medium">
                <Zap className="h-3 w-3 text-accent" />
                Uso de I.A · {usage.monthLabel}
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-white tabular-nums">
                  {fmtBrl(usage.costBrl)}
                </span>
                <span className="text-[10px] text-white/50 tabular-nums">
                  {fmtTokens(usage.tokens)} tok
                </span>
              </div>
            </div>
          )}

          <button onClick={handleLogout} className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white/60 transition-colors duration-200 hover:bg-destructive/10 hover:text-destructive">
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
