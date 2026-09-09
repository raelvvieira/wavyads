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
      productCount: 2,
      negativePrompt: '- sem texto em inglês\nsem moldura',
    })).toMatchSnapshot();
  });

  it('omite a instrução de preservar identidade quando preserveFaces é falso', () => {
    const base = { aspect: 'story' as const, avatarCount: 1 };
    expect(buildCreativePrompt({ ...base, preserveFaces: true })).toContain('Preserve their exact likeness');
    expect(buildCreativePrompt({ ...base, preserveFaces: false })).not.toContain('Preserve their exact likeness');
  });

  it('produto anexado NÃO recebe instrução sobre rosto e pele', () => {
    // A frase de preservação enumera "faces, skin tone, body shape" — quando
    // o anexo é uma embalagem, ela é ruído que gasta atenção do modelo com
    // algo que não existe no quadro. Só entra quando há pessoa.
    const soProduto = buildCreativePrompt({ aspect: 'story', productCount: 1 });
    expect(soProduto).not.toContain('skin tone, body shape');
  });

  it('produto anexado ganha o bloco [PRODUCT], com a proibição de redesenhar', () => {
    // Até aqui o produto — que é o que o anúncio vende — tinha a instrução
    // mais fraca das três: o avatar ganhava [TALENT] e o logo ganhava "do
    // NOT distort, recolor, recreate or redesign", e a embalagem só um
    // "integrate naturally".
    const comProduto = buildCreativePrompt({ aspect: 'story', productCount: 1 });
    expect(comProduto).toContain('[PRODUCT — CRITICAL]');
    expect(comProduto).toContain('Do NOT redesign');
    expect(comProduto).toContain('visual ground truth');
  });

  it('sem produto, o bloco [PRODUCT] não existe', () => {
    expect(buildCreativePrompt({ aspect: 'story' })).not.toContain('[PRODUCT');
  });

  it('avatar sozinho não dispara o bloco de produto', () => {
    // Os grupos viajam no mesmo canal do backend. Sem a contagem separada,
    // um avatar sozinho faria o prompt afirmar que existe um produto
    // anexado.
    const soAvatar = buildCreativePrompt({
      aspect: 'story', avatarCount: 1, productCount: 0,
    });
    expect(soAvatar).toContain('[TALENT]');
    expect(soAvatar).not.toContain('[PRODUCT');
  });

  it('produto e avatar juntos são indexados por pontas opostas', () => {
    // O backend recebe [...avatares, ...pessoas, ...objetos]. [TALENT] fala
    // das PRIMEIRAS imagens e [PRODUCT] das ÚLTIMAS — sem isso, com os dois
    // anexados, os blocos apontariam para o mesmo lugar.
    const ambos = buildCreativePrompt({
      aspect: 'story', avatarCount: 1, productCount: 2,
    });
    expect(ambos).toContain('The first 1 attached photograph(s) are the TALENT');
    expect(ambos).toContain('The last 2 attached photograph(s) are the PRODUCT');
  });

  it('a direção de arte vira bloco próprio, antes da parede de restrições', () => {
    // Era a única camada que o Fator Criativo tinha e a geração normal não.
    // Vir cedo é parte da mudança: tudo depois dela é restrição, e um prompt
    // só de restrição produz arte tímida.
    const prompt = buildCreativePrompt({
      aspect: 'story',
      productCount: 1,
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
    const prompt = buildCreativePrompt({ aspect: 'story', productCount: 2, avatarCount: 0 });
    expect(prompt).toContain('not a style sample.\nIntegrate the subject naturally');
  });

  it('o design system lido de terceiros ganha a cláusula que proíbe copiar a origem', () => {
    // O relato que originou isto: a arte saiu com a pessoa e a logo da peça
    // de referência no lugar das do cliente. O [DESIGN SYSTEM] é escrito
    // lendo arte de terceiros, e nada impedia que o modelo tratasse a marca
    // descrita ali como o conteúdo a desenhar.
    const prompt = buildCreativePrompt({
      aspect: 'story',
      designSystemDoc: 'Layered grid, kitesurf brand wordmark top-left, athlete mid-frame',
      designSystemIsThirdParty: true,
    });
    expect(prompt).toContain('[STYLE REFERENCE — DESCRIPTION ONLY, NOT SOURCE MATERIAL]');
    // A peça NÃO está anexada, e o prompt precisa dizer isso com todas as
    // letras: a edge function apenda, depois de tudo, um [REFERENCE IMAGES]
    // afirmando que as imagens anexadas são fonte de verdade para rostos e
    // marcas. As duas frases usam a mesma palavra e não podem colidir.
    expect(prompt).toContain('is NOT attached to this request');
    expect(prompt).toContain('Where the description conflicts with an attached photograph, the attached photograph wins');
  });

  it('a cláusula cita o [MOOD] junto do [DESIGN SYSTEM]', () => {
    // O vazamento mais provável não está no documento técnico: está no
    // `Feels like: ...` do [MOOD], que é exatamente onde um modelo escreve
    // o nome de uma campanha ou de uma marca.
    const prompt = buildCreativePrompt({
      aspect: 'story', designSystemDoc: 'DOC', designSystemIsThirdParty: true,
      mood: { adjetivos: [], referencias: ['Nike Kitesurf 2024'], evita: [] },
    });
    expect(prompt).toContain('The [DESIGN SYSTEM] and [MOOD] sections');
  });

  it('sem sinal de terceiros, a cláusula não aparece', () => {
    // O Fator Criativo reusa o design system da própria peça-base. Emitir a
    // proibição ali seria mandar o modelo não copiar o cliente.
    const prompt = buildCreativePrompt({
      aspect: 'story', designSystemDoc: 'DOC', designSystemIsThirdParty: false,
    });
    expect(prompt).not.toContain('[STYLE REFERENCE');
  });

  it('sem design system, a cláusula não aparece nem com a bandeira ligada', () => {
    // Um rider qualificando um bloco que não está na tela é a mesma classe
    // de ruído do `[DESIGN SYSTEM]` órfão já corrigido aqui.
    const prompt = buildCreativePrompt({
      aspect: 'story', designSystemDoc: '   ', designSystemIsThirdParty: true,
    });
    expect(prompt).not.toContain('[STYLE REFERENCE');
    expect(prompt).not.toContain('rather than in an attached photograph');
  });

  it('a proibição também entra no [DO NOT INCLUDE], que é a última parede', () => {
    const prompt = buildCreativePrompt({
      aspect: 'story', designSystemDoc: 'DOC', designSystemIsThirdParty: true,
    });
    expect(prompt).toContain('- Any brand name, wordmark, logo, slogan, headline or person that appears in the style description above rather than in an attached photograph');
  });

  it('pessoa anexada como produto entra no [TALENT], e não no [PRODUCT]', () => {
    // Não havia canal para foto de pessoa real — avatar só nasce gerado no
    // Avatar Studio. A foto do cliente ia como produto e recebia linguagem
    // de embalagem: "preserve every label and piece of text printed on it".
    const prompt = buildCreativePrompt({ aspect: 'story', personCount: 1, productCount: 0 });
    expect(prompt).toContain('The first 1 attached photograph(s) are the TALENT');
    expect(prompt).not.toContain('[PRODUCT');
    expect(prompt).toContain('Do NOT substitute a model who merely resembles them');
  });

  it('avatar e pessoa real somam no mesmo bloco de talento', () => {
    // A proteção que as duas pedem é idêntica: rosto, pele, cabelo,
    // semelhança. O que as separa é de onde vêm, não o que fazer com elas.
    const prompt = buildCreativePrompt({ aspect: 'story', avatarCount: 1, personCount: 2 });
    expect(prompt).toContain('The first 3 attached photograph(s) are the TALENT');
  });

  it('os três grupos são indexados por pontas opostas da mesma pilha', () => {
    const prompt = buildCreativePrompt({
      aspect: 'story', avatarCount: 1, personCount: 1, productCount: 2,
    });
    expect(prompt).toContain('The first 2 attached photograph(s) are the TALENT');
    expect(prompt).toContain('The last 2 attached photograph(s) are the PRODUCT');
  });

  it('[ATTACHED PHOTOS] declara cada grupo, e o total fecha com a soma', () => {
    // A contagem era um parâmetro que o chamador somava à mão, e a soma à
    // mão foi onde o bloco passou a mentir quando um terceiro grupo
    // apareceu. Agora ela é derivada dos grupos.
    const prompt = buildCreativePrompt({
      aspect: 'story', avatarCount: 1, personCount: 1, productCount: 2,
    });
    expect(prompt).toContain('4 photograph(s) are attached to this request: 2 of a real person who must appear in the artwork, and 2 of the product being advertised.');
  });

  it('traduz o idioma exigido em todos os blocos', () => {
    expect(buildCreativePrompt({ aspect: 'story', language: 'en' })).toContain('other than English');
    expect(buildCreativePrompt({ aspect: 'story', language: 'es' })).toContain('other than Spanish');
    expect(buildCreativePrompt({ aspect: 'story', language: 'pt-BR' })).toContain('other than Portuguese (Brazil)');
  });
});
