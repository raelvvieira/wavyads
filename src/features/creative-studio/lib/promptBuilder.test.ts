import { describe, expect, it } from 'vitest';
import { buildCreativePrompt } from './promptBuilder';

// Estes snapshots travam o formato do prompt final. O texto dos blocos é
// resultado de ajuste fino contra o modelo de imagem: uma mudança acidental
// aqui degrada a arte gerada sem quebrar nada visível no código. Se um
// snapshot falhar, confirme que a mudança é intencional antes de atualizá-lo.

const ANALYSIS_MOOD = {
  adjetivos: ['sofisticado', 'direto'],
  referencias: ['Apple', 'Nike'],
  evita: ['clipart', 'gradiente neon'],
};

describe('buildCreativePrompt', () => {
  it('monta o prompt mínimo', () => {
    expect(buildCreativePrompt({ aspect: 'story' })).toMatchSnapshot();
  });

  it('monta com copy da IA, mood e anti-padrões', () => {
    expect(buildCreativePrompt({
      aspect: 'story',
      aspectRatio: '4:5',
      resolution: '4K',
      businessContext: 'clínica de estética premium',
      designSystemDoc: 'DOC: paleta escura, tipografia grotesk',
      copy: { source: 'ai', blocks: { label: 'NOVO', titulo: 'Botox Day', subtitulo: 'com naturalidade', dados: '12/08', cta: 'Agendar' } },
      mood: ANALYSIS_MOOD,
      antiPadroes: ['nada de borda arredondada exagerada'],
    })).toMatchSnapshot();
  });

  it('trata a copy do usuário como final e literal', () => {
    expect(buildCreativePrompt({
      aspect: 'story',
      aspectRatio: '9:16',
      resolution: '2K',
      copy: { source: 'original', text: 'Linha 1\nLinha 2' },
    })).toMatchSnapshot();
  });

  it('adiciona o bloco de consistência quando o quadrado tem Story de referência', () => {
    expect(buildCreativePrompt({
      aspect: 'square',
      aspectRatio: '1:1',
      resolution: '1K',
      hasStoryReference: true,
    })).toMatchSnapshot();
  });

  it('monta com template, logo e fotos de produto', () => {
    expect(buildCreativePrompt({
      aspect: 'story',
      aspectRatio: '16:9',
      resolution: '4K',
      template: { name: 'Wavy Editorial', category: 'Oferta', layoutStructure: { grid: '12col' } },
      hasLogo: true,
      productImageCount: 2,
      negativePrompt: '- sem texto em inglês\nsem moldura',
    })).toMatchSnapshot();
  });

  it('omite a instrução de preservar identidade quando preserveFaces é falso', () => {
    const base = { aspect: 'story' as const, productImageCount: 1, avatarCount: 1 };
    expect(buildCreativePrompt({ ...base, preserveFaces: true })).toContain('Preserve their exact likeness');
    expect(buildCreativePrompt({ ...base, preserveFaces: false })).not.toContain('Preserve their exact likeness');
  });

  it('produto anexado NÃO recebe instrução sobre rosto e pele', () => {
    // A frase de preservação enumera "faces, skin tone, body shape" — quando
    // o anexo é uma embalagem, ela é ruído que gasta atenção do modelo com
    // algo que não existe no quadro. Só entra quando há pessoa.
    const soProduto = buildCreativePrompt({ aspect: 'story', productImageCount: 1, productCount: 1 });
    expect(soProduto).not.toContain('skin tone, body shape');
  });

  it('produto anexado ganha o bloco [PRODUCT], com a proibição de redesenhar', () => {
    // Até aqui o produto — que é o que o anúncio vende — tinha a instrução
    // mais fraca das três: o avatar ganhava [TALENT] e o logo ganhava "do
    // NOT distort, recolor, recreate or redesign", e a embalagem só um
    // "integrate naturally".
    const comProduto = buildCreativePrompt({ aspect: 'story', productImageCount: 1, productCount: 1 });
    expect(comProduto).toContain('[PRODUCT — CRITICAL]');
    expect(comProduto).toContain('Do NOT redesign');
    expect(comProduto).toContain('visual ground truth');
  });

  it('sem produto, o bloco [PRODUCT] não existe', () => {
    expect(buildCreativePrompt({ aspect: 'story' })).not.toContain('[PRODUCT');
  });

  it('avatar sozinho não dispara o bloco de produto', () => {
    // `productImageCount` é a SOMA de produtos e avatares — os dois viajam no
    // mesmo canal. Sem a contagem separada, um avatar sozinho faria o prompt
    // afirmar que existe um produto na referência.
    const soAvatar = buildCreativePrompt({
      aspect: 'story', productImageCount: 1, avatarCount: 1, productCount: 0,
    });
    expect(soAvatar).toContain('[TALENT]');
    expect(soAvatar).not.toContain('[PRODUCT');
  });

  it('produto e avatar juntos são indexados por pontas opostas', () => {
    // O backend recebe [...avatares, ...produtos]. [TALENT] fala das
    // PRIMEIRAS imagens e [PRODUCT] das ÚLTIMAS — sem isso, com os dois
    // anexados, os blocos apontariam para o mesmo lugar.
    const ambos = buildCreativePrompt({
      aspect: 'story', productImageCount: 3, avatarCount: 1, productCount: 2,
    });
    expect(ambos).toContain('The first 1 attached reference image(s) are the TALENT');
    expect(ambos).toContain('The last 2 attached reference image(s) are the PRODUCT');
  });

  it('a direção de arte vira bloco próprio, antes da parede de restrições', () => {
    // Era a única camada que o Fator Criativo tinha e a geração normal não.
    // Vir cedo é parte da mudança: tudo depois dela é restrição, e um prompt
    // só de restrição produz arte tímida.
    const prompt = buildCreativePrompt({
      aspect: 'story',
      productImageCount: 1,
      artDirection: {
        mainSubject: 'Um dentista de luvas segurando uma escala de cor',
        composition: 'Clean e minimalista, texto no centro superior',
      },
    });
    expect(prompt).toContain('[ART DIRECTION]\nMain subject: Um dentista de luvas segurando uma escala de cor\nComposition: Clean e minimalista, texto no centro superior');
    expect(prompt.indexOf('[ART DIRECTION]')).toBeLessThan(prompt.indexOf('[SAFE ZONE]'));
    expect(prompt.indexOf('[ART DIRECTION]')).toBeLessThan(prompt.indexOf('[DO NOT INCLUDE]'));
  });

  it('sem direção de arte, o bloco não aparece', () => {
    expect(buildCreativePrompt({ aspect: 'story' })).not.toContain('[ART DIRECTION]');
    expect(buildCreativePrompt({ aspect: 'story', artDirection: { mainSubject: '  ', composition: '' } }))
      .not.toContain('[ART DIRECTION]');
  });

  it('a copy do usuário continua intocável, mas o desenho dela deixa de ser proibido', () => {
    // A frase antiga proibia texto novo E hierarquia na mesma respiração —
    // e a arte saía com todas as linhas no mesmo tamanho porque o modelo
    // obedecia. As palavras seguem fixas; a tipografia não.
    const prompt = buildCreativePrompt({
      aspect: 'story',
      copy: { source: 'original', text: 'Diga adeus aos dentes amarelados\nAgende sua avaliação' },
    });
    expect(prompt).toContain('THE WORDS ARE FIXED.');
    expect(prompt).toContain('Do not paraphrase, shorten, expand or reword it.');
    expect(prompt).toContain('do not invent one');
    expect(prompt).toContain('THE TYPOGRAPHY IS YOURS TO DESIGN.');
    expect(prompt).toContain('render THAT line inside a pill or button in the accent colour — do not write a new one');
    expect(prompt).not.toContain('do not add new text elements to fill the layout');
  });

  it('a copy literal só cita o design system quando existe um', () => {
    // O bloco mandava seguir "the typography system from the design system
    // above" mesmo quando o cabeçalho acima estava vazio — ponteiro solto.
    const semDoc = buildCreativePrompt({
      aspect: 'story', copy: { source: 'original', text: 'Uma linha' },
    });
    expect(semDoc).not.toContain('design system above');

    const comDoc = buildCreativePrompt({
      aspect: 'story', designSystemDoc: 'DOC: paleta quente', copy: { source: 'original', text: 'Uma linha' },
    });
    expect(comDoc).toContain('Follow the typography system and hierarchy from the design system above.');
  });

  it('não emite cabeçalho de design system sem design system', () => {
    // `'[DESIGN SYSTEM]\n' + ''` é truthy e passava pelo filtro: todo prompt
    // do sistema carregava um cabeçalho com nada embaixo.
    expect(buildCreativePrompt({ aspect: 'story' })).not.toContain('[DESIGN SYSTEM]');
    expect(buildCreativePrompt({ aspect: 'story', designSystemDoc: '   ' })).not.toContain('[DESIGN SYSTEM]');
    expect(buildCreativePrompt({ aspect: 'story', designSystemDoc: 'DOC' })).toContain('[DESIGN SYSTEM]\nDOC');
  });

  it('[DO NOT INCLUDE] não abre com linha em branco', () => {
    const prompt = buildCreativePrompt({ aspect: 'story' });
    expect(prompt).toContain('[DO NOT INCLUDE]\n- Any headline, body copy');
  });

  it('[MOOD] não emite linha sem objeto', () => {
    // Com `evita` vazio saía um literal `Not: .` — instrução sem objeto,
    // que ensina o modelo a ler o resto do prompt com menos rigor.
    const prompt = buildCreativePrompt({
      aspect: 'story',
      mood: { adjetivos: ['higiênico', 'educativo'], referencias: [], evita: [] },
    });
    expect(prompt).toContain('Tone: higiênico, educativo.');
    expect(prompt).not.toContain('Not: .');

    // E some inteiro quando não sobra nenhuma linha com conteúdo.
    expect(buildCreativePrompt({
      aspect: 'story', mood: { adjetivos: [], referencias: [], evita: [] },
    })).toContain('Feels like: professional advertising.');
  });

  it('[ATTACHED PHOTOS] sem pessoa não deixa buraco no meio do bloco', () => {
    const prompt = buildCreativePrompt({ aspect: 'story', productImageCount: 2, avatarCount: 0 });
    expect(prompt).toContain('must appear in the composition.\nIntegrate the subject naturally');
  });

  it('traduz o idioma exigido em todos os blocos', () => {
    expect(buildCreativePrompt({ aspect: 'story', language: 'en' })).toContain('other than English');
    expect(buildCreativePrompt({ aspect: 'story', language: 'es' })).toContain('other than Spanish');
    expect(buildCreativePrompt({ aspect: 'story', language: 'pt-BR' })).toContain('other than Portuguese (Brazil)');
  });
});
