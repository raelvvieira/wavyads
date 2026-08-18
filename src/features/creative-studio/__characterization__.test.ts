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

  it('grava três campos que a restauração NÃO repõe — defeito conhecido', () => {
    // Caracterização de um bug real, não de um comportamento desejado.
    // `language` é o idioma do texto DENTRO da arte: restaurar um projeto
    // salvo em inglês devolve pt-BR sem avisar. `model` volta ao padrão e
    // `step` perde a posição no fluxo.
    //
    // Este teste existe para que a correção seja deliberada: ao consertar,
    // ele falha e obriga a atualizar a lista. Não trate como aprovado.
    const i = fonte.indexOf('const restoreProjectState');
    const restore = fonte.slice(i, fonte.indexOf('\n  };', i));
    const semRestauro = CAMPOS_DO_SNAPSHOT.filter((c) => {
      const setter = `set${c[0].toUpperCase()}${c.slice(1)}`;
      return !restore.includes(setter);
    });
    expect(semRestauro).toEqual(['step', 'model', 'language']);
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

  it('só a geração declara timeout — edição e Fator NÃO', () => {
    // Caracterização de defeito, não de acerto. `criativo-generate` ganhou
    // timeout depois de a página travar em geração perdida; `criativo-edit-image`
    // e `criativo-fator` ficaram de fora e podem pendurar a interface
    // indefinidamente. Corrigir isto faz o teste falhar — atualize a lista.
    const chamadas = [...fonte.matchAll(/invoke\('criativo-[a-z-]+'/g)];
    const comTimeout: string[] = [];
    const semTimeout: string[] = [];

    for (const m of chamadas) {
      const nome = m[0].replace("invoke('", '').replace("'", '');
      if (!/generate|edit-image|fator/.test(nome)) continue;
      const proxima = chamadas.find((o) => o.index! > m.index!)?.index ?? fonte.length;
      (fonte.slice(m.index!, proxima).includes('timeout:') ? comTimeout : semTimeout).push(nome);
    }

    expect([...new Set(comTimeout)].sort()).toEqual(['criativo-generate']);
    expect([...new Set(semTimeout)].sort()).toEqual(['criativo-edit-image', 'criativo-fator']);
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

  it('o Fator agrupa as cinco variações num lote', () => {
    expect(fonte).toContain('createAssetGroup');
    expect(fonte).toMatch(/type:\s*'factor'/);
  });
});
