import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Download, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { extractFunctionErrorMessage } from '@/lib/functionError';
import { listCreativeAssets } from '@/features/creative-studio/api/creativeAssets';
import { uploadDataUrlToCreativeStorage } from '@/features/creative-studio/api/storageUpload';
import type { CreativeAsset } from '@/features/creative-studio/types/creative';
import {
  createUgcClip, getUgcProject, listUgcClips, updateUgcClip, updateUgcProject,
} from '@/features/ugc-studio/api/ugcRepository';
import { writeUgcScript } from '@/features/ugc-studio/api/ugcScript';
import { createUgcActions } from '@/features/ugc-studio/generation/ugcActions';
import { AvatarPicker } from '@/features/ugc-studio/components/AvatarPicker';
import { BrollStep, type BrollSubmit } from '@/features/ugc-studio/components/BrollStep';
import { ProjectGenerations } from '@/features/ugc-studio/components/ProjectGenerations';
import { ScriptWriterStep } from '@/features/ugc-studio/components/ScriptWriterStep';
import { SegmentDialog, type SegmentSubmit } from '@/features/ugc-studio/components/SegmentDialog';
import { TalkingAvatarStep } from '@/features/ugc-studio/components/TalkingAvatarStep';
import { UgcStepTabs, type UgcStep } from '@/features/ugc-studio/components/UgcStepTabs';
import type { UgcClip, UgcProject, UgcScript, UgcSegment } from '@/features/ugc-studio/types/ugc';

/**
 * A oficina de um projeto UGC.
 *
 * Três etapas e uma vista de saída. O que amarra tudo é o projeto: o avatar
 * escolhido, a imagem do produto e o roteiro valem para todos os clipes, e é
 * por isso que eles moram aqui e não dentro de cada etapa.
 */
export default function UgcProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [projeto, setProjeto] = useState<UgcProject | null>(null);
  const [clips, setClips] = useState<UgcClip[]>([]);
  const [avatares, setAvatares] = useState<CreativeAsset[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [etapa, setEtapa] = useState<UgcStep>('script');
  const [verGeracoes, setVerGeracoes] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [escrevendo, setEscrevendo] = useState(false);
  const [erroRoteiro, setErroRoteiro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [segmentoAberto, setSegmentoAberto] = useState<UgcSegment | null>(null);

  const acoes = useMemo(() => createUgcActions({
    createClip: (input) => createUgcClip(input),
    updateClip: (clipId, patch) => updateUgcClip(clipId, patch),
    invoke: (fn, body, timeoutMs) => supabase.functions.invoke(fn, { body, timeout: timeoutMs } as any),
    extractErrorMessage: extractFunctionErrorMessage,
  }), []);

  const carregar = useCallback(async () => {
    if (!id) return;
    try {
      const [p, cs] = await Promise.all([getUgcProject(id), listUgcClips(id)]);
      setProjeto(p);
      setClips(cs);
      setErro(null);
      // Os avatares vêm do Criativo Studio: são as personas já criadas para
      // aquele cliente, não uma biblioteca separada.
      // Limite explícito: sem ele cai no default de 300, e um seletor de
      // avatar não precisa de trezentos.
      setAvatares(await listCreativeAssets({ clientId: p.clientId ?? null, types: ['avatar'], limit: 60 }));
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao carregar o projeto.');
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => { void carregar(); }, [carregar]);

  const upsertClip = useCallback((clip: UgcClip) => {
    setClips((atual) => {
      const i = atual.findIndex((c) => c.id === clip.id);
      if (i === -1) return [...atual, clip];
      const copia = [...atual];
      copia[i] = clip;
      return copia;
    });
  }, []);

  const avatarSelecionado = avatares.find((a) => a.id === projeto?.avatarAssetId) ?? null;
  const avatarUrl = avatarSelecionado?.url ?? null;
  const avatarNome = (avatarSelecionado?.metadata as any)?.persona?.name ?? avatarSelecionado?.filename ?? null;

  const salvarProjeto = useCallback(async (patch: Partial<UgcProject>) => {
    if (!projeto) return;
    // Otimista: a tela responde na hora e o banco confirma depois. Esperar o
    // ida-e-volta para pintar um chip selecionado faz a interface parecer
    // travada em cada clique.
    setProjeto({ ...projeto, ...patch } as UgcProject);
    try {
      await updateUgcProject(projeto.id, patch as any);
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e?.message, variant: 'destructive' });
      void carregar();
    }
  }, [projeto, carregar]);

  const subirImagemProduto = useCallback(async (dataUrl: string) => {
    if (!projeto) return;
    try {
      const url = await uploadDataUrlToCreativeStorage({
        dataUrl,
        path: `ugc/produtos/${crypto.randomUUID()}.png`,
      });
      await salvarProjeto({ productImageUrl: url });
    } catch (e: any) {
      toast({ title: 'Erro ao subir a imagem', description: e?.message, variant: 'destructive' });
    }
  }, [projeto, salvarProjeto]);

  const escreverRoteiro = useCallback(async () => {
    if (!projeto || escrevendo) return;
    setEscrevendo(true);
    setErroRoteiro(null);
    try {
      const { script } = await writeUgcScript({
        productDescription: descricao,
        durationSeconds: 8,
      });
      await salvarProjeto({ script });
    } catch (e: any) {
      setErroRoteiro(e?.message ?? 'Não consegui escrever o roteiro.');
    } finally {
      setEscrevendo(false);
    }
  }, [projeto, descricao, escrevendo, salvarProjeto]);

  const gerarSegmento = useCallback(async (entrada: SegmentSubmit) => {
    if (!projeto || !segmentoAberto || busy) return;
    const segmento = segmentoAberto;
    setSegmentoAberto(null);
    setBusy(true);
    toast({ title: 'Gerando o clipe…', description: 'Vídeo leva alguns minutos.' });
    try {
      const clipe = await acoes.generateAvatarClip({
        projectId: projeto.id,
        segment: segmento,
        speech: entrada.speech,
        durationSeconds: entrada.durationSeconds,
        resolution: entrada.resolution,
        avatarImageUrl: avatarUrl,
        productImageUrl: projeto.productImageUrl,
      });
      upsertClip(clipe);
      toast({
        title: clipe.status === 'ready' ? 'Clipe pronto' : 'A geração falhou',
        description: clipe.status === 'ready' ? undefined : clipe.errorMessage ?? undefined,
        variant: clipe.status === 'ready' ? undefined : 'destructive',
      });
    } catch (e: any) {
      toast({ title: 'Erro no clipe', description: e?.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }, [projeto, segmentoAberto, busy, acoes, avatarUrl, upsertClip]);

  const gerarBroll = useCallback(async (entrada: BrollSubmit) => {
    if (!projeto || busy) return;
    setBusy(true);
    toast({ title: `Gerando ${entrada.angleIds.length} clipe(s) de produto…` });
    try {
      const gerados = await acoes.generateBrollBatch({
        projectId: projeto.id,
        angleIds: entrada.angleIds,
        durationSeconds: entrada.durationSeconds,
        resolution: entrada.resolution,
        audio: entrada.audio,
        productImageUrl: projeto.productImageUrl,
        productDescription: descricao || null,
        onClipDone: upsertClip,
      });
      const prontos = gerados.filter((c) => c.status === 'ready').length;
      toast({
        title: prontos === 0
          ? 'Nenhum clipe foi gerado'
          : prontos === gerados.length ? 'Clipes prontos' : `${prontos} de ${gerados.length} prontos`,
        description: prontos === 0 ? gerados[0]?.errorMessage ?? undefined : undefined,
        variant: prontos === 0 ? 'destructive' : undefined,
      });
    } catch (e: any) {
      toast({ title: 'Erro no B-Roll', description: e?.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }, [projeto, busy, acoes, descricao, upsertClip]);

  const retentar = useCallback(async (clipe: UgcClip) => {
    upsertClip({ ...clipe, status: 'generating', errorMessage: null });
    try {
      upsertClip(await acoes.retry(clipe));
    } catch (e: any) {
      upsertClip({ ...clipe, status: 'failed', errorMessage: e?.message ?? 'Erro desconhecido' });
    }
  }, [acoes, upsertClip]);

  if (carregando) {
    return <div className="ugc-page ugc-page-narrow"><div className="ugc-empty"><Loader2 className="h-5 w-5 animate-spin text-white/45" /></div></div>;
  }

  if (erro || !projeto) {
    return (
      <div className="ugc-page ugc-page-narrow">
        <button type="button" onClick={() => navigate('/ugc-studio')} className="btn-glass inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px]">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </button>
        <p className="flex items-start gap-2 rounded-[var(--wavy-radius-card)] border border-destructive/30 bg-destructive/10 p-3 text-xs leading-relaxed text-white/78">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
          {erro ?? 'Projeto não encontrado.'}
        </p>
      </div>
    );
  }

  const contagens = {
    avatar: clips.filter((c) => c.kind === 'avatar' && c.status === 'ready').length,
    broll: clips.filter((c) => c.kind === 'broll' && c.status === 'ready').length,
  };

  return (
    <div className="ugc-page ugc-page-narrow">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={() => navigate('/ugc-studio')} aria-label="Voltar aos projetos" className="rounded-full p-1.5 text-white/50 hover:bg-white/[0.08] hover:text-white/90">
            <ArrowLeft className="h-4 w-4" />
          </button>
          {avatarUrl && <img src={avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-white/92">{projeto.title}</h1>
            <p className="text-[11px] text-white/45">
              {clips.length} clipe{clips.length === 1 ? '' : 's'}
              {avatarNome ? ` · ${avatarNome}` : ''}
            </p>
          </div>
        </div>

        <div className="ugc-view-toggle">
          <button type="button" onClick={() => setVerGeracoes(false)} data-active={!verGeracoes} className="ugc-view-btn">
            Geração
          </button>
          <button type="button" onClick={() => setVerGeracoes(true)} data-active={verGeracoes} className="ugc-view-btn">
            <Download className="h-3.5 w-3.5" /> Gerações do projeto
          </button>
        </div>
      </header>

      {!projeto.avatarAssetId ? (
        <AvatarPicker
          avatars={avatares}
          selectedId={projeto.avatarAssetId}
          projectTitle={projeto.title}
          onSelect={(assetId) => void salvarProjeto({ avatarAssetId: assetId })}
        />
      ) : verGeracoes ? (
        <ProjectGenerations
          clips={clips}
          onRetry={retentar}
          onGoToStep={(s) => { setVerGeracoes(false); setEtapa(s); }}
        />
      ) : (
        <>
          <UgcStepTabs current={etapa} onChange={setEtapa} counts={contagens} />

          {etapa === 'script' && (
            <ScriptWriterStep
              script={projeto.script}
              productDescription={descricao}
              onProductDescriptionChange={setDescricao}
              productImageUrl={projeto.productImageUrl}
              onUploadProductImage={(d) => void subirImagemProduto(d)}
              durationSeconds={8}
              busy={escrevendo}
              erro={erroRoteiro}
              onGenerate={() => void escreverRoteiro()}
              onScriptChange={(s: UgcScript) => void salvarProjeto({ script: s })}
              onNext={() => setEtapa('avatar')}
            />
          )}

          {etapa === 'avatar' && (
            <TalkingAvatarStep
              avatarName={avatarNome}
              avatarImageUrl={avatarUrl}
              script={projeto.script}
              clips={clips.filter((c) => c.kind === 'avatar')}
              onOpenSegment={setSegmentoAberto}
              onRetry={retentar}
              onBack={() => setEtapa('script')}
              onNext={() => setEtapa('broll')}
            />
          )}

          {etapa === 'broll' && (
            <BrollStep
              productImageUrl={projeto.productImageUrl}
              onUploadProductImage={(d) => void subirImagemProduto(d)}
              busy={busy}
              onBack={() => setEtapa('avatar')}
              onGenerate={(v) => void gerarBroll(v)}
            />
          )}
        </>
      )}

      <SegmentDialog
        segment={segmentoAberto}
        initialSpeech={segmentoAberto ? projeto.script?.[segmentoAberto] ?? '' : ''}
        busy={busy}
        onClose={() => setSegmentoAberto(null)}
        onSubmit={(v) => void gerarSegmento(v)}
      />
    </div>
  );
}
