import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type WorkspaceSection = 'artworks' | 'conversation' | 'references' | 'assets' | 'templates';
export type WorkspaceViewMode = 'grid' | 'focus';

/**
 * 'gallery' mostra todas as artes através de projetos (filtráveis por
 * cliente); 'project' mostra a árvore de um projeto só. São visões diferentes
 * dos mesmos dados, não telas separadas.
 */
export type WorkspaceScope = 'gallery' | 'project';

interface WorkspaceState {
  projectId: string | null;
  setProjectId: (id: string | null) => void;

  /** Seleção é múltipla desde já — a primeira versão só usa uma, mas as ações
   *  em lote (baixar 5, gerar 1080 de todas) não vão exigir remodelar nada. */
  selectedAssetIds: string[];
  selectedAssetId: string | null;
  selectAsset: (id: string | null, options?: { toggle?: boolean }) => void;
  clearSelection: () => void;

  viewMode: WorkspaceViewMode;
  setViewMode: (mode: WorkspaceViewMode) => void;

  scope: WorkspaceScope;
  setScope: (scope: WorkspaceScope) => void;

  /** Filtro da galeria. Null = todos os clientes. */
  clientFilter: string | null;
  setClientFilter: (clientId: string | null) => void;

  activeSection: WorkspaceSection;
  setActiveSection: (section: WorkspaceSection) => void;
}

const WorkspaceContext = createContext<WorkspaceState | null>(null);

export function CreativeWorkspaceProvider({
  children,
  initialProjectId = null,
}: {
  children: ReactNode;
  initialProjectId?: string | null;
}) {
  const [projectId, setProjectIdState] = useState<string | null>(initialProjectId);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<WorkspaceViewMode>('grid');
  const [activeSection, setActiveSection] = useState<WorkspaceSection>('artworks');
  // Abre na galeria: a pergunta do dia a dia é "o que já fizemos?", e só
  // depois se entra num projeto específico.
  const [scope, setScope] = useState<WorkspaceScope>(initialProjectId ? 'project' : 'gallery');
  const [clientFilter, setClientFilter] = useState<string | null>(null);

  const selectAsset = useCallback((id: string | null, options?: { toggle?: boolean }) => {
    if (!id) {
      setSelectedAssetIds([]);
      return;
    }
    setSelectedAssetIds((prev) => {
      if (!options?.toggle) return [id];
      return prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedAssetIds([]), []);

  // Trocar de projeto sem limpar a seleção deixaria o Inspector apontando para
  // uma arte que não está mais no Canvas.
  const setProjectId = useCallback((id: string | null) => {
    setProjectIdState(id);
    setSelectedAssetIds([]);
    setViewMode('grid');
    // Escolher um projeto é justamente pedir para entrar nele.
    if (id) setScope('project');
  }, []);

  const value = useMemo<WorkspaceState>(() => ({
    projectId,
    setProjectId,
    selectedAssetIds,
    selectedAssetId: selectedAssetIds[0] ?? null,
    selectAsset,
    clearSelection,
    viewMode,
    setViewMode,
    scope,
    setScope,
    clientFilter,
    setClientFilter,
    activeSection,
    setActiveSection,
  }), [projectId, setProjectId, selectedAssetIds, selectAsset, clearSelection, viewMode, scope, clientFilter, activeSection]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceState {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace precisa estar dentro de CreativeWorkspaceProvider');
  return context;
}
