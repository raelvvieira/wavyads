import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { NavigationIsland } from './NavigationIsland';
import { ThemeToggle } from './ThemeToggle';

/**
 * Shell do app.
 *
 * A tela é contínua e a navegação flutua sobre ela. O afastamento do
 * conteúdo acompanha o estado da ilha via `data-nav-expanded` — o CSS lê o
 * atributo e ajusta o padding, então a largura não fica presa a um valor
 * fixo que colidiria quando o menu abre.
 */
export function DashboardLayout() {
  const [navExpanded, setNavExpanded] = useState(false);

  return (
    <div
      className="wavy-shell relative min-h-screen bg-background"
      data-nav-expanded={navExpanded}
    >
      <NavigationIsland onExpandedChange={setNavExpanded} />
      {/* Canto superior direito, na linha das ações da página. O shell reserva
          a faixa (`--wavy-page-utility-gap`) para que nenhuma página passe por
          baixo dele — inclusive as que ainda não existem. */}
      <div className="wavy-theme-anchor">
        <ThemeToggle />
      </div>
      {/* z-10 mantém o conteúdo acima do brilho ambiente da tela. */}
      <div className="wavy-app-content relative z-10 min-h-screen">
        <Outlet />
      </div>
    </div>
  );
}
