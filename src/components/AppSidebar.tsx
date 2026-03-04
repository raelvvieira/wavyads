import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import wavyLogo from '@/assets/wavy-logo.png';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/configuracoes', icon: Settings, label: 'Configurações' },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      <button
        className="fixed top-4 left-4 z-50 lg:hidden glass rounded-lg p-2"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-white/10 transition-transform duration-300',
          'bg-white/[0.03] backdrop-blur-xl',
          'lg:translate-x-0',
          collapsed ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-16 items-center gap-3 px-6 border-b border-white/10">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg btn-accent">
            <Zap className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">AdsPro</span>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to || (item.to === '/dashboard' && location.pathname.startsWith('/dashboard'));
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setCollapsed(false)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300',
                  isActive
                    ? 'bg-accent/20 border-l-2 border-l-accent text-white'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white/60 transition-all duration-300 hover:bg-destructive/10 hover:text-destructive">
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
