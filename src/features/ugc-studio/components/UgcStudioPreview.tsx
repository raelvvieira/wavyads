import { useState } from 'react';
import type { CreativeAsset } from '@/features/creative-studio/types/creative';
import type { UgcClip, UgcScript } from '../types/ugc';
import { AvatarPicker } from './AvatarPicker';
import { BrollStep } from './BrollStep';
import { ProjectGenerations } from './ProjectGenerations';
import { ScriptWriterStep } from './ScriptWriterStep';
import { SegmentDialog } from './SegmentDialog';
import { TalkingAvatarStep } from './TalkingAvatarStep';
import { UgcStepTabs, type UgcStep } from './UgcStepTabs';

/**
 * Bancada visual do UGC Studio.
 *
 * Renderiza os componentes REAIS com dados de exemplo — nada aqui é uma
 * versão de mentira da tela. O que muda é a origem dos dados, e é por isso
 * que ela roda sem sessão: os componentes recebem tudo por props.
 *
 * Serve para fotografar as telas nos dois temas antes de o banco existir.
 */

const AVATAR_FALSO = {
  id: 'av-1', type: 'avatar', status: 'ready',
  url: 'https://placehold.co/600x800/2b2b31/ffffff?text=Ana',
  thumbnailUrl: null, filename: 'Ana Editorial',
  metadata: { persona: { name: 'Ana Editorial' } },
} as unknown as CreativeAsset;

const ROTEIRO: UgcScript = {
  hook: 'Meu vizinho via tudo dentro da minha sala.',
  body_1: 'Eu fechava a cortina de tarde e ficava no escuro pra ter privacidade.',
  body_2: 'Coloquei película e agora entra luz o dia todo — e ninguém vê pra dentro.',
  cta: 'Chama no link pra ver como fica na sua janela.',
};

function clipe(patch: Partial<UgcClip>): UgcClip {
  return {
    id: Math.random().toString(36).slice(2), projectId: 'p1', kind: 'avatar',
    segment: 'hook', anglePreset: null, speech: null, durationSeconds: 8,
    resolution: '1080p', audio: true, status: 'ready', url: null, thumbnailUrl: null,
    errorMessage: null, prompt: 'P', model: 'veo-3.1', metadata: {},
    createdAt: '2026-08-21T10:00:00.000Z', updatedAt: '2026-08-21T10:00:00.000Z',
    ...patch,
  } as UgcClip;
}

const CLIPES: UgcClip[] = [
  clipe({ segment: 'hook', status: 'ready' }),
  clipe({ segment: 'body_1', status: 'generating' }),
  clipe({ segment: 'cta', status: 'failed', errorMessage: 'O provedor recusou a duração de 8s neste modelo.' }),
  clipe({ kind: 'broll', segment: null, anglePreset: 'hand_hold', durationSeconds: 5 }),
  clipe({ kind: 'broll', segment: null, anglePreset: 'night_moody', durationSeconds: 5, status: 'generating' }),
];

const PROJETOS_FALSOS = [
  { id: '1', title: 'Campanha de verão', updatedAt: '2026-08-20T10:00:00.000Z' },
  { id: '2', title: 'Lançamento película', updatedAt: '2026-08-19T10:00:00.000Z' },
  { id: '3', title: 'Black Friday', updatedAt: '2026-08-18T10:00:00.000Z' },
];

export function UgcStudioPreview() {
  const [etapa, setEtapa] = useState<UgcStep>('script');
  const [vista, setVista] = useState<'galeria' | 'wizard' | 'avatar' | 'geracoes'>('galeria');
  const [segmento, setSegmento] = useState<any>(null);
  const [script, setScript] = useState<UgcScript | null>(ROTEIRO);
  const [descricao, setDescricao] = useState('Película de controle solar para janelas residenciais');

  return (
    <div className={vista === 'galeria' ? 'ugc-page' : 'ugc-page ugc-page-narrow'}>
      <div className="ugc-view-toggle self-start">
        {(['galeria', 'wizard', 'avatar', 'geracoes'] as const).map((v) => (
          <button key={v} type="button" onClick={() => setVista(v)} data-active={vista === v} className="ugc-view-btn">
            {v === 'galeria' ? 'Projetos' : v === 'wizard' ? 'Etapas' : v === 'avatar' ? 'Escolher avatar' : 'Gerações'}
          </button>
        ))}
      </div>

      {vista === 'galeria' && (
        <>
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-white/92">UGC Studio</h1>
              <p className="text-[13px] text-white/50">
                Clipes de avatar falando e de produto, com a mesma pessoa do começo ao fim
              </p>
            </div>
            <span className="btn-accent inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold">
              + Novo projeto
            </span>
          </header>
          <ul className="ugc-project-grid">
            {PROJETOS_FALSOS.map((p) => (
              <li key={p.id}>
                <span className="ugc-project-card block">
                  <span className="ugc-project-thumb" aria-hidden />
                  <span className="block truncate text-[13px] font-medium text-white/88">{p.title}</span>
                  <span className="block text-[11px] text-white/45">20 de ago.</span>
                </span>
              </li>
            ))}
            <li>
              <span className="ugc-project-new">
                <span className="text-[12px] font-medium">+ Novo projeto</span>
              </span>
            </li>
          </ul>
        </>
      )}

      {vista === 'avatar' && (
        <AvatarPicker
          avatars={[AVATAR_FALSO, { ...AVATAR_FALSO, id: 'av-2', filename: 'Bruno' } as CreativeAsset]}
          selectedId="av-1"
          projectTitle="Campanha de verão"
          onSelect={() => {}}
        />
      )}

      {vista === 'geracoes' && (
        <ProjectGenerations clips={CLIPES} onGoToStep={() => setVista('wizard')} onRetry={() => {}} />
      )}

      {vista === 'wizard' && (
        <>
          <UgcStepTabs current={etapa} onChange={setEtapa} counts={{ avatar: 1, broll: 2 }} />

          {etapa === 'script' && (
            <ScriptWriterStep
              script={script}
              productDescription={descricao}
              onProductDescriptionChange={setDescricao}
              productImageUrl={null}
              onUploadProductImage={() => {}}
              durationSeconds={8}
              onGenerate={() => setScript(ROTEIRO)}
              onScriptChange={setScript}
              onNext={() => setEtapa('avatar')}
            />
          )}

          {etapa === 'avatar' && (
            <TalkingAvatarStep
              avatarName="Ana Editorial"
              avatarImageUrl={AVATAR_FALSO.url}
              script={ROTEIRO}
              clips={CLIPES.filter((c) => c.kind === 'avatar')}
              onOpenSegment={setSegmento}
              onRetry={() => {}}
              onBack={() => setEtapa('script')}
              onNext={() => setEtapa('broll')}
            />
          )}

          {etapa === 'broll' && (
            <BrollStep
              productImageUrl={null}
              onUploadProductImage={() => {}}
              onBack={() => setEtapa('avatar')}
              onGenerate={() => {}}
            />
          )}
        </>
      )}

      <SegmentDialog
        segment={segmento}
        initialSpeech={segmento ? ROTEIRO[segmento as keyof UgcScript] : ''}
        onClose={() => setSegmento(null)}
        onSubmit={() => setSegmento(null)}
      />
    </div>
  );
}
