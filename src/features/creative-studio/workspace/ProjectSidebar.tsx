import { Image, Layers, Loader2, MessageSquare, Plus, Shapes, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreativeProjectSummary } from '../api/creativeProjects';
import type { WorkspaceSection } from '../store/workspaceStore';

// A navegação interna troca o conteúdo do CENTRO, não do Inspector — essa
// distinção é o que evita o painel virar um amontoado de modos como no fluxo
// clássico. Só "Artes" está ligada nesta etapa; as demais entram nas próximas.
const NAV_ITEMS: { id: WorkspaceSection; label: string; icon: typeof Image; ready: boolean }[] = [
  { id: 'artworks', label: 'Artes', icon: Image, ready: true },
  { id: 'conversation', label: 'Conversa', icon: MessageSquare, ready: false },
  { id: 'references', label: 'Referências', icon: Shapes, ready: false },
  { id: 'assets', label: 'Assets', icon: Layers, ready: false },
  { id: 'templates', label: 'Templates', icon: Sparkles, ready: false },
];

interface ProjectSidebarProps {
  projects: CreativeProjectSummary[];
  isLoading: boolean;
  activeProjectId: string | null;
  onSelectProject: (id: string) => void;
  activeSection: WorkspaceSection;
  onSelectSection: (section: WorkspaceSection) => void;
  artworkCount: number;
  onCreateNew: () => void;
}

export function ProjectSidebar({
  projects,
  isLoading,
  activeProjectId,
  onSelectProject,
  activeSection,
  onSelectSection,
  artworkCount,
  onCreateNew,
}: ProjectSidebarProps) {
  return (
    <aside className="flex h-full flex-col border-r border-[var(--studio-border)] bg-[var(--studio-surface-1)]">
      <div className="p-3">
        <button
          type="button"
          onClick={onCreateNew}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--studio-accent)] px-3 py-2 text-[11px] font-semibold text-white transition hover:brightness-110"
        >
          <Plus className="h-3.5 w-3.5" /> Criar
        </button>
      </div>

      <nav className="space-y-0.5 px-2 pb-3">
        {NAV_ITEMS.map((item) => {
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              disabled={!item.ready}
              onClick={() => onSelectSection(item.id)}
              title={item.ready ? undefined : 'Chega numa próxima etapa'}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] transition-colors',
                active
                  ? 'bg-[var(--studio-surface-3)] text-[var(--studio-text)]'
                  : 'text-[var(--studio-text-secondary)] hover:bg-white/[0.03]',
                !item.ready && 'cursor-not-allowed opacity-35 hover:bg-transparent',
              )}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.id === 'artworks' && artworkCount > 0 && (
                <span className="text-[10px] tabular-nums text-[var(--studio-text-tertiary)]">{artworkCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-[var(--studio-border)] px-2 py-3">
        <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--studio-text-tertiary)]">
          Projetos
        </p>

        {isLoading ? (
          <div className="flex items-center gap-2 px-1 py-2 text-[11px] text-[var(--studio-text-tertiary)]">
            <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
          </div>
        ) : projects.length === 0 ? (
          <p className="px-1 text-[11px] leading-relaxed text-[var(--studio-text-tertiary)]">
            Nenhum projeto ainda. Crie um pelo fluxo clássico e ele aparece aqui.
          </p>
        ) : (
          <div className="space-y-0.5">
            {projects.map((project) => {
              const active = project.id === activeProjectId;
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => onSelectProject(project.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors',
                    active
                      ? 'bg-[var(--studio-surface-3)] text-[var(--studio-text)]'
                      : 'text-[var(--studio-text-secondary)] hover:bg-white/[0.03]',
                  )}
                >
                  <span className="h-7 w-7 shrink-0 overflow-hidden rounded bg-[var(--studio-surface-3)]">
                    {project.thumbnailUrl && (
                      <img src={project.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] leading-tight">{project.title}</span>
                    <span className="block truncate text-[10px] text-[var(--studio-text-tertiary)]">
                      {new Date(project.updatedAt).toLocaleDateString('pt-BR')}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
