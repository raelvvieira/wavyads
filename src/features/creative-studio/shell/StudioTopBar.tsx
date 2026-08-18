import { ChevronDown, History, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StudioFilterChip {
  id: string;
  label: string;
}

interface StudioTopBarProps {
  projectName: string;
  clientName: string | null;
  query: string;
  onQueryChange: (value: string) => void;
  filters: StudioFilterChip[];
  onRemoveFilter: (id: string) => void;
  onOpenFilters: () => void;
  onOpenProjects: () => void;
  onOpenHistory: () => void;
  onNewProject: () => void;
}

/**
 * Barra contextual superior.
 *
 * Responde às três perguntas que a tela precisa responder sempre: em que
 * projeto estou, de que cliente ele é, e como saio daqui. Por isso o par
 * projeto/cliente é o gatilho de troca — e não um título decorativo com um
 * seletor escondido em outro canto.
 *
 * É ilha de vidro porque é controle, não conteúdo.
 */
export function StudioTopBar({
  projectName,
  clientName,
  query,
  onQueryChange,
  filters,
  onRemoveFilter,
  onOpenFilters,
  onOpenProjects,
  onOpenHistory,
  onNewProject,
}: StudioTopBarProps) {
  return (
    <header className="studio-topbar glass-island">
      <button
        type="button"
        onClick={onOpenProjects}
        className="group flex min-w-0 items-center gap-2.5 rounded-[14px] px-2.5 py-1.5 text-left transition-colors duration-200 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wavy-focus)]"
        aria-label="Trocar de projeto"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-white/92">{projectName}</span>
          <span className="block truncate text-[11px] text-white/50">
            {clientName ?? 'Sem cliente'}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-white/45 transition-transform duration-200 group-hover:translate-y-0.5" />
      </button>

      <div className="studio-topbar-search">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar artes, prompts, formatos…"
          aria-label="Buscar no Studio"
          className="glass-input h-9 w-full rounded-[var(--wavy-radius-pill)] pl-9 pr-3 text-[13px]"
        />
      </div>

      {/* Filtros ativos vivem ao lado da busca porque são a mesma pergunta:
          o que está sendo mostrado agora. Escondê-los atrás do popover faria
          o canvas parecer vazio sem explicar por quê. */}
      {filters.length > 0 && (
        <div className="hidden items-center gap-1.5 xl:flex">
          {filters.map((f) => (
            <span
              key={f.id}
              className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.06] py-1 pl-2.5 pr-1 text-[11px] text-white/78"
            >
              {f.label}
              <button
                type="button"
                onClick={() => onRemoveFilter(f.id)}
                aria-label={`Remover filtro ${f.label}`}
                className="rounded-full p-0.5 text-white/50 transition-colors duration-150 hover:bg-white/10 hover:text-white/90"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        <TopBarIcon label="Filtros" onClick={onOpenFilters} active={filters.length > 0}>
          <SlidersHorizontal className="h-4 w-4" />
        </TopBarIcon>
        <TopBarIcon label="Histórico de projetos" onClick={onOpenHistory}>
          <History className="h-4 w-4" />
        </TopBarIcon>
        <button
          type="button"
          onClick={onNewProject}
          className="btn-accent inline-flex h-9 items-center gap-1.5 rounded-[var(--wavy-radius-pill)] px-3.5 text-[13px] font-semibold"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo projeto</span>
        </button>
      </div>
    </header>
  );
}

function TopBarIcon({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wavy-focus)]',
        active
          ? 'border-white/20 bg-white/[0.10] text-white/92'
          : 'border-white/10 bg-white/[0.04] text-white/62 hover:bg-white/[0.08] hover:text-white/90',
      )}
    >
      {children}
    </button>
  );
}
