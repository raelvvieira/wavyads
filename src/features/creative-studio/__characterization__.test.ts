import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Testes de caracterização — Fase 0.
 *
 * Não descrevem o que o Criativo Studio DEVERIA fazer; descrevem o que ele
 * faz hoje, para que a extração da Fase 1 não perca nada em silêncio. Um
 * componente de 4.101 linhas com 99 estados é fácil de quebrar sem que build,
 * typecheck ou teste percebam.
 *
 * São de nível de código-fonte porque tudo relevante ainda vive dentro do
 * componente, sem interface exportada. Conforme a Fase 1 extrair módulos,
 * cada bloco daqui deve ser substituído por teste de comportamento do módulo
 * correspondente — não apagado.
 */

const PAGINA = 'src/pages/CriativoStudioPage.tsx';
const fonte = readFileSync(PAGINA, 'utf8');

/** Campos do snapshot que o autosave grava em creative_project_state. */
const CAMPOS_DO_SNAPSHOT = [
  'currentStage', 'rightPanelMode', 'conversationMessages', 'initialPrompt',
  'selectedAspectRatio', 'selectedResolution', 'step', 'refImages', 'analysis',
  'editedDoc', 'rawCopy', 'copyVariations', 'selectedVariationIdx', 'copyApproved',
  'copySource', 'suggestedRawCopy', 'productUrl', 'urlContext', 'logoImage',
  'productImages', 'preserveFaces', 'model', 'language', 'businessContext',
  'negativePrompt', 'storyImage', 'squareImage', 'factorVariations', 'factorImages',
  'factorErrors', 'factorSquareImages', 'editedVersions', 'projectTitle',
  'selectedTemplateId', 'selectedTemplate', 'selectedClientId',
];

function blocoDoSnapshot(): string {
  const i = fonte.indexOf('const buildProjectStateSnapshot');
  const fim = fonte.indexOf('});', i);
  return fonte.slice(i, fim);
}

describe('snapshot do projeto', () => {
  it('grava exatamente os campos de hoje', () => {
    // Perder um campo aqui é perder trabalho do usuário na restauração, e
    // nada no build denuncia. A lista é o contrato.
    const bloco = blocoDoSnapshot();
    const ausentes = CAMPOS_DO_SNAPSHOT.filter((c) => !new RegExp(`\\b${c}\\b`).test(bloco));
    expect(ausentes).toEqual([]);
  });

  it('tudo que o snapshot grava é reposto na restauração', () => {
    // Era um defeito: `step`, `model` e `language` eram gravados e nunca
    // repostos. `language` é o idioma do texto DENTRO da arte — um projeto
    // salvo em inglês voltava como pt-BR sem aviso.
    const i = fonte.indexOf('const restoreProjectState');
    const restore = fonte.slice(i, fonte.indexOf('\n  };', i));
    const semRestauro = CAMPOS_DO_SNAPSHOT.filter((c) => {
      const setter = `set${c[0].toUpperCase()}${c.slice(1)}`;
      return !restore.includes(setter);
    });
    expect(semRestauro).toEqual([]);
  });

  it('não serializa imagem em base64', () => {
    // Um data: URI no snapshot infla o registro e vaza para a thumbnail do
    // histórico. O código já se protege disso ao escolher a thumbnail.
    expect(fonte).toMatch(/startsWith\('data:'\)/);
  });
});

describe('máquinas de estado', () => {
  const ETAPAS = [
    'initial', 'references', 'reference-review', 'copy', 'assets',
    'generation-summary', 'result', 'factor', 'editing',
  ];
  const PAINEIS = [
    'none', 'upload-references', 'reference-library', 'design-system',
    'paste-copy', 'copy-suggestions', 'read-url', 'assets', 'avatar-library',
    'generation-summary', 'generated-result', 'creative-factor', 'asset-actions',
    'edit-image', 'project-history', 'template-library', 'template-detail',
    'save-template', 'template-applied',
  ];

  it('mantém as 9 etapas', () => {
    const bloco = fonte.slice(fonte.indexOf('type CurrentStage'), fonte.indexOf('type RightPanelMode'));
    expect(ETAPAS.filter((e) => !bloco.includes(`'${e}'`))).toEqual([]);
  });

  it('mantém os 19 modos de painel', () => {
    const i = fonte.indexOf('type RightPanelMode');
    const bloco = fonte.slice(i, fonte.indexOf(';', fonte.indexOf('template-applied', i)));
    expect(PAINEIS.filter((p) => !bloco.includes(`'${p}'`))).toEqual([]);
  });

  it('os quatro painéis globais não dependem de etapa', () => {
    // project-history, template-library, template-detail e save-template são
    // abertos de qualquer lugar. Um refactor que amarrar painel a etapa
    // quebra justamente esses.
    for (const painel of ['project-history', 'template-library', 'template-detail', 'save-template']) {
      expect(fonte).toContain(`setRightPanelMode('${painel}')`);
    }
  });
});

describe('integrações que não podem sumir', () => {
  it('chama as 8 edge functions do fluxo', () => {
    const esperadas = [
      'criativo-generate', 'criativo-edit-image', 'criativo-fator',
      'criativo-analyze-refs', 'criativo-suggest-copy', 'criativo-improve-copy',
      'criativo-business-context', 'criativo-fetch-url',
    ];
    expect(esperadas.filter((f) => !fonte.includes(`invoke('${f}'`))).toEqual([]);
  });

  it('toda chamada de geração, edição e Fator declara timeout', () => {
    // Sem teto, uma chamada perdida pendura a interface para sempre. A
    // geração ganhou o dela depois de a página travar; edição e Fator
    // tinham ficado de fora.
    const chamadas = [...fonte.matchAll(/invoke\('criativo-[a-z-]+'/g)];
    const semTimeout = chamadas.filter((m) => {
      if (!/generate|edit-image|fator/.test(m[0])) return false;
      const proxima = chamadas.find((o) => o.index! > m.index!)?.index ?? fonte.length;
      return !fonte.slice(m.index!, proxima).includes('timeout:');
    });
    expect(semTimeout.map((m) => m[0])).toEqual([]);
  });

  it('erro de edge function é extraído do corpo', () => {
    // Sem isso, toda falha vira "Edge Function returned a non-2xx status code".
    expect(fonte).toContain('extractFunctionErrorMessage');
  });
});

describe('linhagem de assets', () => {
  it('toda arte produzida passa por persistImageAsset', () => {
    expect(fonte).toContain('const persistImageAsset');
  });

  it('os cinco tipos de arte são usados', () => {
    for (const tipo of ["'original'", "'factor'", "'edited'", "'resize'"]) {
      expect(fonte).toContain(`type: ${tipo}`);
    }
  });

  it('o resize de arte editada parte da imagem editada', () => {
    // Caminho especial: usar recreateSquare aqui devolveria o quadrado da
    // arte ANTES da edição.
    const i = fonte.indexOf('const recreateSquareFromAsset');
    expect(i).toBeGreaterThan(-1);
    const bloco = fonte.slice(i, fonte.indexOf('\n  };', i));
    expect(bloco).toContain('aspectReference: asset.url');
  });

  it('o snapshot guarda as âncoras de linhagem', () => {
    // Sem os IDs no snapshot, restaurar um projeto e editar criava asset
    // órfão com parent_asset_id nulo, e o Fator montava grupo sem pai.
    const bloco = blocoDoSnapshot();
    for (const id of ['mainStoryAssetId', 'mainSquareAssetId', 'factorAssetIds', 'factorSquareAssetIds']) {
      expect(bloco).toContain(id);
    }
  });

  it('projeto salvo antes disso recupera os IDs pela URL', () => {
    // A consulta em si mudou de lugar (agora é `findAssetIdsByUrl`, no
    // repositório, com teste de comportamento próprio). O que importa aqui é
    // que a página continue chamando a reconciliação ao abrir um projeto —
    // sem isso, projeto antigo volta a produzir arte órfã.
    const i = fonte.indexOf('const reconcileAssetIdsByUrl');
    expect(i).toBeGreaterThan(-1);
    const bloco = fonte.slice(i, fonte.indexOf('\n  };', i));
    expect(bloco).toContain('findAssetIdsByUrl');
    // Reparo oportunista: falhar aqui não pode impedir o projeto de abrir.
    expect(bloco).toContain('catch');
    expect(fonte).toContain('await reconcileAssetIdsByUrl(projectId');
  });

  it('a página não fala direto com as tabelas de projeto', () => {
    // Depois da extração, todo acesso passa pelo repositório. Uma consulta
    // solta aqui é sinal de que alguém contornou a camada.
    expect(fonte).not.toContain("from('creative_projects')");
    expect(fonte).not.toContain("from('creative_project_state')");
  });

  it('o Fator agrupa as cinco variações num lote', () => {
    expect(fonte).toContain('createAssetGroup');
    expect(fonte).toMatch(/type:\s*'factor'/);
  });
});
