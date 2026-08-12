import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type WorkspaceSection = 'artworks' | 'conversation' | 'references' | 'assets' | 'templates';
export type WorkspaceViewMode = 'grid' | 'focus';

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
    activeSection,
    setActiveSection,
  }), [projectId, setProjectId, selectedAssetIds, selectAsset, clearSelection, viewMode, activeSection]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceState {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace precisa estar dentro de CreativeWorkspaceProvider');
  return context;
}
