import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Grid2x2, LayoutPanelLeft, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createCreativeProject, listClients, listCreativeProjects } from '../api/creativeProjects';
import { FocusView, WorkspaceCanvas } from '../canvas/WorkspaceCanvas';
import { buildAssetLabels, labelFor } from '../lib/assetLabels';
import { CreativeInspector } from '../inspector/CreativeInspector';
import { CreateInspector, type CreateFormValues } from '../inspector/CreateInspector';
import { useCreativeActions } from '../hooks/useCreativeActions';
import { useCreativeAssets } from '../hooks/useCreativeAssets';
import { useWorkspace } from '../store/workspaceStore';
import { sanitizeFileName } from '../api/storage';
import { ProjectSidebar } from './ProjectSidebar';
import { WorkspaceComposer } from './WorkspaceComposer';
import { ReferencesPanel } from '../references/ReferencesPanel';
import { useCreativeReferences } from '../hooks/useCreativeReferences';
import { useToast } from '@/hooks/use-toast';
import type { CreativeAspectRatio, CreativeAsset, CreativeResolution } from '../types/creative';

async function downloadAsset(asset: CreativeAsset, label: string) {
  if (!asset.url) return;
  const name = `${sanitizeFileName(label)}-${asset.id.slice(0, 8)}.png`;
  try {
    const blob = await (await fetch(asset.url)).blob();
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  } catch {
    window.open(asset.url, '_blank');
  }
}

export function CreativeWorkspace() {
  const navigate = useNavigate();
  const {
    projectId,
    setProjectId,
    selectedAssetIds,
    selectedAssetId,
    selectAsset,
    viewMode,
    setViewMode,
    activeSection,
    setActiveSection,
  } = useWorkspace();

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: ['creative-projects'],
    queryFn: () => listCreativeProjects(),
    staleTime: 60 * 1000,
  });

  const clientsQuery = useQuery({
    queryKey: ['creative-studio-clients'],
    queryFn: listClients,
    staleTime: 5 * 60 * 1000,
  });

  const projects = projectsQuery.data ?? [];
  const { assets, sections, isLoading } = useCreativeAssets(projectId ?? undefined);
  const actions = useCreativeActions(projectId ?? undefined);

  // Abrir o workspace sem projeto deixaria o canvas vazio sem motivo aparente.
  useEffect(() => {
    if (!projectId && projects.length > 0) setProjectId(projects[0].id);
  }, [projectId, projects, setProjectId]);

  const assetsById = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);
  const labels = useMemo(() => buildAssetLabels(assets), [assets]);
  const download = useCallback((asset: CreativeAsset) => downloadAsset(asset, labelFor(labels, asset)), [labels]);
  const selectedAsset = selectedAssetId ? assetsById.get(selectedAssetId) ?? null : null;
  const selectedAssets = useMemo(
    () => selectedAssetIds.map((id) => assetsById.get(id)).filter(Boolean) as CreativeAsset[],
    [selectedAssetIds, assetsById],
  );

  const activeProject = projects.find((project) => project.id === projectId) ?? null;
  const references = useCreativeReferences(projectId ?? undefined, activeProject?.clientId ?? null);

  // Ordem de navegação do modo foco: a mesma que o Canvas desenha.
  const orderedAssets = useMemo(() => [
    ...sections.originals,
    ...sections.factorGroups.flatMap((group) => group.assets),
    ...sections.edited,
    ...sections.resizes,
  ], [sections]);

  const focusIndex = selectedAsset ? orderedAssets.findIndex((asset) => asset.id === selectedAsset.id) : -1;

  const stepFocus = useCallback((delta: number) => {
    if (orderedAssets.length === 0) return;
    const base = focusIndex < 0 ? 0 : focusIndex;
    const next = (base + delta + orderedAssets.length) % orderedAssets.length;
    selectAsset(orderedAssets[next].id);
  }, [focusIndex, orderedAssets, selectAsset]);

  const openFocus = useCallback((asset: CreativeAsset) => {
    selectAsset(asset.id);
    setViewMode('focus');
  }, [selectAsset, setViewMode]);

  const openClassic = useCallback(() => navigate('/criativo-studio'), [navigate]);

  const createProject = useCallback(async (values?: Partial<CreateFormValues>) => {
    try {
      const title = values?.businessContext?.trim().slice(0, 60) || 'Novo criativo';
      const project = await createCreativeProject({
        title,
        clientId: values?.clientId ?? null,
        aspectRatio: values?.aspectRatio ?? '4:5',
        resolution: values?.resolution ?? '4K',
      });
      await queryClient.invalidateQueries({ queryKey: ['creative-projects'] });
      setProjectId(project.id);
      return project.id;
    } catch (e: any) {
      toast({ title: 'Erro ao criar projeto', description: e?.message || 'Erro', variant: 'destructive' });
      return null;
    }
  }, [queryClient, setProjectId, toast]);

  // Gerar sem projeto aberto cria um na hora, em vez de barrar o usuário: o
  // projeto é um detalhe de organização, não um pré-requisito de fluxo.
  const generate = useCallback(async (values: CreateFormValues) => {
    const targetProjectId = projectId ?? await createProject(values);
    if (!targetProjectId) return;
    await actions.create({
      projectId: targetProjectId,
      clientId: values.clientId,
      aspectRatio: values.aspectRatio,
      resolution: values.resolution,
      businessContext: values.businessContext,
      copyText: values.copyText,
      // O que o usuário escreveu no painel tem prioridade; sem isso, entra a
      // direção visual do projeto (ou a identidade do cliente).
      designSystemDoc: values.designSystemDoc.trim() || references.designSystem.designSystemDoc,
      productImages: values.productImages,
      logoImage: values.logoImage,
    });
  }, [projectId, createProject, actions, references.designSystem.designSystemDoc]);

  return (
    <div className="h-[100dvh] bg-[var(--studio-bg)] text-[var(--studio-text)] [--studio-bg:#09090B] [--studio-surface-1:#0F0F11] [--studio-surface-2:#141416] [--studio-surface-3:#19191C] [--studio-border:rgba(255,255,255,.08)] [--studio-border-hover:rgba(255,255,255,.15)] [--studio-text:rgba(255,255,255,.94)] [--studio-text-secondary:rgba(255,255,255,.62)] [--studio-text-tertiary:rgba(255,255,255,.38)] [--studio-accent:#EC4899]">
      <div className="grid h-full grid-cols-1 lg:grid-cols-[196px_minmax(0,1fr)_336px] xl:grid-cols-[212px_minmax(0,1fr)_376px]">
        <div className="hidden lg:block">
          <ProjectSidebar
            projects={projects}
            isLoading={projectsQuery.isLoading}
            activeProjectId={projectId}
            onSelectProject={setProjectId}
            activeSection={activeSection}
            onSelectSection={setActiveSection}
            artworkCount={assets.length}
            referenceCount={references.projectReferences.length}
            onCreateNew={() => { selectAsset(null); createProject(); }}
          />
        </div>

        <main className="flex min-h-0 min-w-0 flex-col">
          <header className="flex items-center gap-3 border-b border-[var(--studio-border)] px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--studio-text-tertiary)]">
                Criativo Studio
              </p>
              <h1 className="truncate text-sm font-medium text-[var(--studio-text)]">
                {activeProject?.title || 'Nenhum projeto selecionado'}
              </h1>
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-[var(--studio-border)] p-0.5">
              {([['grid', Grid2x2], ['focus', LayoutPanelLeft]] as const).map(([mode, Icon]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  title={mode === 'grid' ? 'Quadro' : 'Foco'}
                  className={cn(
                    'rounded-md p-1.5 transition-colors',
                    viewMode === mode
                      ? 'bg-[var(--studio-surface-3)] text-[var(--studio-text)]'
                      : 'text-[var(--studio-text-tertiary)] hover:text-[var(--studio-text-secondary)]',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={openClassic}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--studio-border)] px-2.5 py-1.5 text-[11px] text-[var(--studio-text-secondary)] transition-colors hover:border-[var(--studio-border-hover)] hover:text-[var(--studio-text)]"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Fluxo clássico
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6" onClick={(event) => {
            // Clicar no vazio limpa a seleção — o Inspector volta para "Criar".
            if (event.target === event.currentTarget) selectAsset(null);
          }}>
            {activeSection === 'references' ? (
              <ReferencesPanel
                projectReferences={references.projectReferences}
                clientReferences={references.clientReferences}
                designSystem={references.designSystem}
                busy={references.busy}
                hasClient={!!activeProject?.clientId}
                onUpload={references.upload}
                onRemove={references.remove}
                onAnalyze={references.analyze}
                onSaveManualDoc={references.saveManualDoc}
              />
            ) : viewMode === 'focus' && selectedAsset ? (
              <FocusView
                asset={selectedAsset}
                label={labelFor(labels, selectedAsset)}
                index={focusIndex < 0 ? 0 : focusIndex}
                total={orderedAssets.length}
                onPrev={() => stepFocus(-1)}
                onNext={() => stepFocus(1)}
                onClose={() => setViewMode('grid')}
              />
            ) : (
              <WorkspaceCanvas
                sections={sections}
                assetsById={assetsById}
                labels={labels}
                isLoading={isLoading && !!projectId}
                selectedAssetIds={selectedAssetIds}
                onSelect={(asset, options) => selectAsset(asset.id, options)}
                onOpenFocus={openFocus}
                onDownload={download}
              />
            )}
          </div>

          <WorkspaceComposer
            selectedAssets={selectedAssets}
            busy={actions.isRunning}
            onCreate={(description) => generate({
              businessContext: description,
              copyText: '',
              designSystemDoc: '',
              aspectRatio: (activeProject?.aspectRatio as CreativeAspectRatio) || '4:5',
              resolution: (activeProject?.resolution as CreativeResolution) || '4K',
              clientId: activeProject?.clientId ?? null,
              productImages: [],
              logoImage: null,
            })}
            onEdit={(feedback) => selectedAsset && actions.edit(selectedAsset, feedback)}
          />
        </main>

        <div className="hidden lg:block">
          <CreativeInspector
            asset={selectedAsset}
            label={selectedAsset ? labelFor(labels, selectedAsset) : undefined}
            parent={selectedAsset?.parentAssetId ? assetsById.get(selectedAsset.parentAssetId) ?? null : null}
            parentLabel={selectedAsset?.parentAssetId ? labelFor(labels, assetsById.get(selectedAsset.parentAssetId)) : null}
            runningAction={actions.runningAction}
            onEdit={(feedback) => selectedAsset && actions.edit(selectedAsset, feedback)}
            onResize={() => selectedAsset && actions.resize(selectedAsset)}
            onFactor={() => selectedAsset && actions.factor(selectedAsset)}
            onDownload={() => selectedAsset && download(selectedAsset)}
            onOpenFocus={() => selectedAsset && openFocus(selectedAsset)}
            onSaveToIntelligence={() => selectedAsset && actions.saveToClientIntelligence(selectedAsset)}
            onRetry={() => selectedAsset && actions.retry(selectedAsset)}
            createPanel={(
              <CreateInspector
                clients={clientsQuery.data ?? []}
                defaults={{
                  aspectRatio: (activeProject?.aspectRatio as CreativeAspectRatio) || '4:5',
                  resolution: (activeProject?.resolution as CreativeResolution) || '4K',
                  clientId: activeProject?.clientId ?? null,
                }}
                busy={actions.isRunning}
                designSystemSource={references.designSystem.source}
                onOpenReferences={() => { selectAsset(null); setActiveSection('references'); }}
                onGenerate={generate}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
}
