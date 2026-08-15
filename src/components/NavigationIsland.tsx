import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Sparkles,
  Users,
  Wand2,
  PlayCircle,
  Zap,
  Contact,
  PanelLeftOpen,
  PanelLeftClose,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAiUsage } from '@/lib/aiUsageTracker';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/ThemeToggle';
import wavyLogo from '@/assets/wavy-logo.png';

type NavItem = {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
};

/**
 * Ilha de navegação WAVY.
 *
 * O que a distingue de uma barra lateral é a separação espacial: ela flutua
 * a `--wavy-shell-gutter` das bordas, sobre uma tela contínua, em vez de
 * formar uma parede colada no viewport. As posições vivem no CSS
 * (`.wavy-nav-island`) porque quem precisa saber a geometria é o shell —
 * o conteúdo se afasta pela mesma variável.
 *
 * No desktop tem dois estados, recolhido (72px) e expandido (248px),
 * alternados por clique. No mobile a ilha desce para o rodapé com os
 * destinos primários; os secundários vão para uma folha.
 *
 * Rotas, permissões e ações são exatamente as mesmas de antes — o que muda
 * é a forma.
 */
export function NavigationIsland({ onExpandedChange }: { onExpandedChange?: (expanded: boolean) => void }) {
  // `expanded` é o estado fixado pelo botão; `previewing` é a espiada do
  // ponteiro. Os dois abrem a ilha e afastam o conteúdo do mesmo jeito — nada
  // da página pode ficar atrás do menu. A diferença é só a permanência: a
  // espiada volta quando o mouse sai, o fixado só volta no clique.
  const [expanded, setExpanded] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const showLabels = expanded || previewing;

  const islandRef = useRef<HTMLElement>(null);
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

  const clientItems: NavItem[] = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/comercial', icon: Users, label: 'Comercial' },
    { to: '/crm', icon: Contact, label: 'CRM' },
  ];

  const adminItems: NavItem[] = [
    { to: '/google-ads-ai', icon: Sparkles, label: 'Google Ads I.A' },
    { to: '/criativo-studio', icon: Wand2, label: 'Criativo Studio' },
    { to: '/social-midia-studio', icon: PlayCircle, label: 'Social Mídia Studio' },
    { to: '/configuracoes', icon: Settings, label: 'Configurações' },
  ];

  const visibleAdminItems = isAdmin ? adminItems : [];
  const allItems = [...clientItems, ...visibleAdminItems];

  // No rodapé cabem poucos destinos com alvo de toque decente. Os primeiros
  // quatro ficam à mão; o resto vai para a folha "Mais".
  const mobilePrimary = allItems.slice(0, 4);
  const mobileSecondary = allItems.slice(4);

  const isItemActive = (to: string) =>
    location.pathname === to || (to === '/dashboard' && location.pathname.startsWith('/dashboard'));

  // O shell afasta o conteúdo sempre que a ilha estiver larga — inclusive na
  // espiada. Antes só o estado fixado avisava, e a ilha aberta pelo mouse
  // passava por cima do conteúdo, escondendo o que estivesse embaixo.
  // Notificar por efeito, e não dentro do updater do useState, porque o
  // updater pode ser reexecutado.
  useEffect(() => {
    onExpandedChange?.(showLabels);
  }, [showLabels, onExpandedChange]);

  // Escape recolhe quando o foco está dentro da navegação — saída previsível
  // para quem navega por teclado e abriu o menu sem querer.
  useEffect(() => {
    if (!showLabels) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const active = document.activeElement;
      if (!(active instanceof Node) || !islandRef.current?.contains(active)) return;
      // Fecha os dois: recolher só o fixado deixaria a ilha aberta pela
      // espiada, e o Escape não teria surtido efeito visível.
      setExpanded(false);
      setPreviewing(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showLabels]);

  const renderItem = (item: NavItem) => {
    const active = isItemActive(item.to);
    const link = (
      <NavLink
        to={item.to}
        aria-current={active ? 'page' : undefined}
        data-active={active}
        className={cn(
          'wavy-nav-item group relative flex h-12 w-full items-center overflow-hidden rounded-[14px]',
          'text-sm font-medium transition-[background-color,color] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]',
          active
            // Cápsula de alto contraste com um traço da marca. Preencher a
            // linha inteira com o gradiente reservaria para a navegação a
            // ênfase que pertence à ação primária da página.
            ? 'bg-[var(--wavy-nav-active-bg)] text-white shadow-[var(--wavy-nav-active-shadow)]'
            : 'text-white/65 hover:bg-white/[0.06] hover:text-white'
        )}
      >
        {/* Trilho ativo: continuidade espacial sem repintar a linha toda. */}
        <span
          aria-hidden="true"
          className={cn(
            'absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full',
            'bg-[image:var(--wavy-gradient)] transition-opacity duration-200',
            active ? 'opacity-100' : 'opacity-0'
          )}
        />
        {/* Âncora de largura fixa: o ícone não anda quando a ilha abre. */}
        <span className="flex w-[52px] min-w-[52px] items-center justify-center">
          <item.icon className="h-5 w-5" />
        </span>
        <span className="wavy-nav-label pr-3">{item.label}</span>
      </NavLink>
    );

    // Tooltip só faz sentido recolhido. Com a espiada do ponteiro o rótulo já
    // está na tela, e mostrar os dois ao mesmo tempo é ruído.
    return showLabels ? (
      <div key={item.to}>{link}</div>
    ) : (
      <Tooltip key={item.to} delayDuration={200}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  };

  const usageBlock = isAdmin ? (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
      <div className="wavy-caps flex items-center gap-1.5 text-[9px] font-medium text-white/45">
        <Zap className="h-3 w-3 text-accent" />
        Uso de I.A · {usage.monthLabel}
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className="metric-number text-sm font-semibold text-white">{fmtBrl(usage.costBrl)}</span>
        <span className="metric-number text-[10px] text-white/50">{fmtTokens(usage.tokens)} tok</span>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* ---------- Desktop: ilha lateral ---------- */}
      <aside
        ref={islandRef}
        data-expanded={showLabels}
        aria-label="Navegação principal"
        className="wavy-nav-island hidden lg:flex"
        // Toque não espia: lá o `pointerenter` chega junto com o toque e a ilha
        // abriria sozinha ao tocar num destino. O teste é por exclusão, e não
        // por `=== 'mouse'`, porque caneta também paira — e porque um ambiente
        // sem PointerEvent reporta o tipo vazio, e ali o certo é se comportar
        // como mouse em vez de perder o hover inteiro.
        onPointerEnter={(e) => {
          if (e.pointerType !== 'touch') setPreviewing(true);
        }}
        // Sair sempre fecha, qualquer que seja o ponteiro: um `enter` sem o
        // `leave` correspondente deixaria a ilha presa aberta.
        onPointerLeave={() => setPreviewing(false)}
        // Tabular para dentro da ilha revela os rótulos pelo mesmo caminho:
        // quem navega por teclado não depende de hover para ler o menu.
        onFocus={() => setPreviewing(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPreviewing(false);
        }}
      >
        <div className="flex h-12 items-center">
          <span className="flex w-[52px] min-w-[52px] items-center justify-center">
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-[10px] bg-[var(--wavy-brand-chip)]">
              <img src={wavyLogo} alt="WAVY" className="h-7 w-7 object-contain" />
            </span>
          </span>
          <span className="wavy-nav-label wavy-title text-base font-semibold">WAVY Dash</span>
        </div>

        {/* min-h-0 é o que deixa a lista encolher e rolar dentro do flex; sem
            ele, muitos destinos empurrariam as utilidades para fora da ilha. */}
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden" aria-label="Seções">
          {clientItems.map(renderItem)}

          {visibleAdminItems.length > 0 && (
            <>
              <div className="mt-3 mb-1 border-t border-white/10 pt-3">
                {/* Recolhido o micro-rótulo não cabe; o divisor sozinho já
                    comunica a separação dos grupos. */}
                <span className="wavy-nav-label wavy-caps block px-4 text-[10px] font-medium text-white/40">
                  Gestão WAVY
                </span>
              </div>
              {visibleAdminItems.map(renderItem)}
            </>
          )}
        </nav>

        {/* Utilidades. Expandir e sair não são destinos, então ficam num
            grupo próprio abaixo do divisor — antes o botão de expandir ficava
            acima da lista e era lido como se fosse mais um item de menu. */}
        <div className="mt-auto space-y-1 border-t border-white/10 pt-2">
          {showLabels && usageBlock}

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Recolher menu de navegação' : 'Expandir menu de navegação'}
            className="flex h-11 w-full items-center rounded-[14px] text-white/50 transition-colors duration-200 hover:bg-white/[0.06] hover:text-white"
          >
            <span className="flex w-[52px] min-w-[52px] items-center justify-center">
              {expanded ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
            </span>
            <span className="wavy-nav-label text-xs">Recolher</span>
          </button>

          {showLabels ? (
            <button
              onClick={handleLogout}
              className="flex h-12 w-full items-center rounded-[14px] text-sm font-medium text-white/60 transition-colors duration-200 hover:bg-destructive/10 hover:text-destructive"
            >
              <span className="flex w-[52px] min-w-[52px] items-center justify-center">
                <LogOut className="h-5 w-5" />
              </span>
              <span className="wavy-nav-label">Sair</span>
            </button>
          ) : (
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  aria-label="Sair"
                  className="flex h-12 w-full items-center rounded-[14px] text-white/60 transition-colors duration-200 hover:bg-destructive/10 hover:text-destructive"
                >
                  <span className="flex w-[52px] min-w-[52px] items-center justify-center">
                    <LogOut className="h-5 w-5" />
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                Sair
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>

      {/* ---------- Mobile: ilha inferior ---------- */}
      <nav
        aria-label="Navegação principal"
        className="wavy-nav-island flex lg:hidden"
      >
        {mobilePrimary.map((item) => {
          const active = isItemActive(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              data-active={active}
              className={cn(
                // min-w-0 é o que permite o truncate funcionar dentro do flex:
                // com admin são 5 destinos em 360px, e sem isso "COMERCIAL"
                // empurra os vizinhos em vez de cortar.
                'wavy-nav-item flex h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[14px] px-1',
                'transition-colors duration-200',
                active
                  ? 'bg-[var(--wavy-nav-active-bg)] text-white'
                  : 'text-white/60'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="wavy-caps w-full truncate text-center text-[9px] font-medium">
                {item.label.split(' ')[0]}
              </span>
            </NavLink>
          );
        })}

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              aria-label="Mais destinos"
              className="flex h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[14px] px-1 text-white/60 transition-colors duration-200"
            >
              <MoreHorizontal className="h-5 w-5 shrink-0" />
              <span className="wavy-caps w-full truncate text-center text-[9px] font-medium">Mais</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="border-white/10 bg-[var(--wavy-surface)]">
            <SheetHeader>
              <SheetTitle className="wavy-title text-left">Navegação</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-1">
              {mobileSecondary.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  aria-current={isItemActive(item.to) ? 'page' : undefined}
                  className={cn(
                    'flex min-h-[44px] items-center gap-3 rounded-[14px] px-4 text-sm font-medium',
                    'transition-colors duration-200',
                    isItemActive(item.to)
                      ? 'bg-[var(--wavy-nav-active-bg)] text-white'
                      : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              ))}

              {usageBlock}

              {/* No desktop este controle vive no canto superior direito da
                  página; no mobile aquele canto é estreito demais para
                  reservar espaço, então ele fica aqui. */}
              <div className="flex items-center justify-between rounded-[14px] px-4 py-2">
                <span className="text-sm font-medium text-white/70">Tema</span>
                <ThemeToggle />
              </div>

              <button
                onClick={handleLogout}
                className="flex min-h-[44px] w-full items-center gap-3 rounded-[14px] px-4 text-sm font-medium text-white/60 transition-colors duration-200 hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-5 w-5" />
                Sair
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </>
  );
}
