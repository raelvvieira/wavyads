import { describe, expect, it } from 'vitest';
import {
  buildAvatarRequest,
  buildEditRequest,
  buildFactorVariationRequest,
  buildGenerationRequest,
  buildResizeRequest,
  buildRetryRequest,
} from './generationRequests';

describe('buildGenerationRequest', () => {
  it('o texto do dock entra como businessContext, não como copy literal', () => {
    // Sem um wizard de aprovação de copy antes dele, tratar o texto do dock
    // como copy renderizaria a frase de comando na arte.
    const { prompt } = buildGenerationRequest({ brief: 'lançamento de tênis de corrida', aspectRatio: '4:5' });
    expect(prompt).toContain('lançamento de tênis de corrida');
    expect(prompt).not.toContain('[TEXT BLOCKS]');
  });

  it('formatRatio é o formato real, não o vertical/quadrado genérico', () => {
    // A regressão que isto evita: todo vertical anunciado como 9:16 mesmo
    // quando o projeto é 4:5.
    const { body } = buildGenerationRequest({ brief: 'x', aspectRatio: '9:16' });
    expect(body.aspectRatio).toBe('story');
    expect(body.formatRatio).toBe('9:16');
  });

  it('quadrado usa o aspecto de backend certo', () => {
    expect(buildGenerationRequest({ brief: 'x', aspectRatio: '1:1' }).body.aspectRatio).toBe('square');
  });

  it('a zona segura do formato pedido está no prompt', () => {
    const { prompt } = buildGenerationRequest({ brief: 'x', aspectRatio: '4:5' });
    expect(prompt).toContain('[SAFE ZONE]');
  });

  it('logo e produtos entram no corpo quando fornecidos', () => {
    const { body } = buildGenerationRequest({
      brief: 'x', aspectRatio: '4:5', logoImageUrl: 'https://x/logo.png', productImageUrls: ['https://x/p1.png'],
    });
    expect(body.logoImage).toBe('https://x/logo.png');
    expect(body.productImages).toEqual(['https://x/p1.png']);
  });

  it('sem logo nem produtos, o corpo não inventa referência', () => {
    const { body } = buildGenerationRequest({ brief: 'x', aspectRatio: '4:5' });
    expect(body.logoImage).toBeNull();
    expect(body.productImages).toEqual([]);
    expect(body.storyReference).toBeNull();
  });

  it('copy anexada vira modo literal — o texto sai exato, não uma paráfrase', () => {
    const { prompt } = buildGenerationRequest({
      brief: 'lançamento de verão', aspectRatio: '4:5', copy: 'Até 50% OFF — só hoje',
    });
    expect(prompt).toContain('USER-WRITTEN COPY, FINAL');
    expect(prompt).toContain('Até 50% OFF — só hoje');
  });

  it('sem copy anexada, não força o modo literal', () => {
    const { prompt } = buildGenerationRequest({ brief: 'x', aspectRatio: '4:5' });
    expect(prompt).not.toContain('USER-WRITTEN COPY');
  });

  it('copy só de espaços em branco não conta como anexada', () => {
    const { prompt } = buildGenerationRequest({ brief: 'x', aspectRatio: '4:5', copy: '   ' });
    expect(prompt).not.toContain('USER-WRITTEN COPY');
  });

  it('modelId é parametrizável, com o modelo real como padrão', () => {
    expect(buildGenerationRequest({ brief: 'x', aspectRatio: '4:5' }).body.model).toBe('gpt-image-2');
    expect(buildGenerationRequest({ brief: 'x', aspectRatio: '4:5', modelId: 'futuro-modelo' }).body.model).toBe('futuro-modelo');
  });
});

describe('buildEditRequest', () => {
  it('a imagem viaja como URL, sem conversão para data URL', () => {
    // A edge function aceita http(s) direto; converter é trabalho que a
    // versão antiga fazia só porque a function antiga exigia base64.
    const { body } = buildEditRequest({
      imageUrl: 'https://x/foto.png', feedback: 'deixa mais escuro',
      originalPrompt: 'p', aspectRatio: '4:5',
    });
    expect(body.originalImage).toBe('https://x/foto.png');
  });

  it('carrega o formato real e a zona segura correspondente', () => {
    const { body } = buildEditRequest({
      imageUrl: 'u', feedback: 'f', originalPrompt: 'p', aspectRatio: '9:16',
    });
    expect(body.aspectRatio).toBe('9:16');
    expect(body.aspect).toBe('story');
    expect(body.safeZoneBlock).toContain('[SAFE ZONE]');
  });
});

describe('buildResizeRequest', () => {
  it('sempre pede 1:1, independente do prompt de origem', () => {
    const { body } = buildResizeRequest({ originalPrompt: 'anúncio de verão' });
    expect(body.aspectRatio).toBe('square');
    expect(body.formatRatio).toBe('1:1');
  });

  it('manda o modelo ignorar o enquadramento anterior do prompt', () => {
    // Sem o override, a arte quadrada nasceria com a margem do formato de
    // origem — por exemplo, 35% inferior de um Story.
    const { prompt } = buildResizeRequest({ originalPrompt: 'anúncio vertical com margem de Story' });
    expect(prompt).toContain('anúncio vertical com margem de Story');
    expect(prompt).toContain('FRAMING OVERRIDE');
    expect(prompt).toContain('Ignore every framing and safe-zone instruction stated in the brief below');
  });

  it('anexa a arte aprovada — sem ela, redimensionar era gerar de novo', () => {
    // O bug: nada ia anexado, então o modelo recebia só o TEXTO do prompt.
    // Um prompt descreve uma intenção, não uma peça — e ele reinterpretava
    // a intenção do zero, devolvendo outro anúncio com objetos que nunca
    // estiveram na arte aprovada.
    const { body, prompt } = buildResizeRequest({
      originalPrompt: 'anúncio de verão',
      originalImageUrl: 'https://x/arte-9x16.png',
    });
    expect(body.storyReference).toBe('https://x/arte-9x16.png');
    expect(prompt).toContain('The attached reference image IS the artwork');
    expect(prompt).toContain('Nothing enters and nothing leaves.');
  });

  it('o reenquadramento vem antes do briefing, que é rebaixado a contexto', () => {
    // O que vem primeiro pesa mais. Com o briefing na frente, o modelo lia
    // "faça um anúncio para tal negócio" antes de "a verdade é a imagem".
    const { prompt } = buildResizeRequest({
      originalPrompt: 'anúncio de verão',
      originalImageUrl: 'https://x/arte.png',
    });
    expect(prompt.indexOf('[REFRAME')).toBeLessThan(prompt.indexOf('[ORIGINAL BRIEF'));
    expect(prompt).toContain('never to re-invent the composition');
  });

  it('não reanexa produto nem logo — a arte já os contém renderizados', () => {
    // Mandá-los como referência separada convidaria o modelo a desenhá-los
    // de novo, que é o oposto de reenquadrar.
    const { body } = buildResizeRequest({
      originalPrompt: 'x', originalImageUrl: 'https://x/arte.png',
    });
    expect(body.productImages).toEqual([]);
    expect(body.logoImage).toBeNull();
  });
});

describe('buildRetryRequest', () => {
  it('reaproveita o prompt e o formato salvos na própria linha', () => {
    const { body } = buildRetryRequest({ prompt: 'anúncio de verão', aspectRatio: '9:16' });
    expect(body.formatRatio).toBe('9:16');
    expect(body.aspectRatio).toBe('story');
  });

  it('sem formato salvo, cai no padrão do app em vez de quebrar', () => {
    const { body } = buildRetryRequest({ prompt: 'p', aspectRatio: null });
    expect(body.formatRatio).toBe('4:5');
  });

  it('sem prompt salvo, recusa — não há o que tentar de novo', () => {
    expect(() => buildRetryRequest({ prompt: null, aspectRatio: '4:5' })).toThrow(/prompt salvo/);
  });

  it('reaproveita os anexos da geração original — o prompt só MENCIONA o logo', () => {
    // O prompt guarda "a brand logo is provided...", não a URL. Sem
    // repassar aqui, retentar perderia o anexo mesmo com o prompt intacto.
    const { body } = buildRetryRequest({
      prompt: 'p', aspectRatio: '4:5', logoImage: 'https://x/logo.png', productImages: ['https://x/p1.png'],
    });
    expect(body.logoImage).toBe('https://x/logo.png');
    expect(body.productImages).toEqual(['https://x/p1.png']);
  });

  it('sem anexos salvos, o corpo não inventa nenhum', () => {
    const { body } = buildRetryRequest({ prompt: 'p', aspectRatio: '4:5' });
    expect(body.logoImage).toBeNull();
    expect(body.productImages).toEqual([]);
  });
});

describe('buildGenerationRequest — a referência não tem canal de imagem', () => {
  it('uma URL anexada como referência NUNCA aparece em body.productImages', () => {
    // A regressão de origem: `kind: 'reference'` e `kind: 'product'` eram
    // achatados no mesmo array, e o prompt declarava o resultado como "the
    // PRODUCT being advertised". A arte saía com a pessoa e a logo da peça
    // de terceiros no lugar das do cliente.
    //
    // O builder nem tem parâmetro para receber uma referência. Este teste
    // registra isso como decisão, e não como acidente.
    const { body } = buildGenerationRequest({
      brief: 'aula de kitesurf',
      aspectRatio: '4:5',
      productImageUrls: ['https://x/prancha.png'],
      personImageUrls: ['https://x/heiner.png'],
      avatarImageUrls: ['https://x/avatar.png'],
      logoImageUrl: 'https://x/logo-heiner.png',
      designSystemDoc: 'Layered grid, kitesurf wordmark top-left',
      designSystemIsThirdParty: true,
    });

    expect(body.productImages).toEqual([
      'https://x/avatar.png', 'https://x/heiner.png', 'https://x/prancha.png',
    ]);
    expect(JSON.stringify(body.productImages)).not.toContain('kitesurf');
    expect(body.storyReference).toBeNull();
  });

  it('o que a referência vira é TEXTO, com a cláusula que proíbe copiar a origem', () => {
    const { prompt } = buildGenerationRequest({
      brief: 'x', aspectRatio: '4:5',
      designSystemDoc: 'Layered grid, athlete mid-frame',
      designSystemIsThirdParty: true,
    });
    expect(prompt).toContain('[DESIGN SYSTEM]');
    expect(prompt).toContain('[STYLE REFERENCE — DESCRIPTION ONLY, NOT SOURCE MATERIAL]');
  });

  it('a ordem da pilha é avatar, pessoa, objeto — é ela que sustenta os índices', () => {
    const { prompt, body } = buildGenerationRequest({
      brief: 'x', aspectRatio: '4:5',
      avatarImageUrls: ['https://x/av1.png'],
      personImageUrls: ['https://x/pe1.png', 'https://x/pe2.png'],
      productImageUrls: ['https://x/ob1.png'],
    });
    expect(body.productImages).toEqual([
      'https://x/av1.png', 'https://x/pe1.png', 'https://x/pe2.png', 'https://x/ob1.png',
    ]);
    expect(prompt).toContain('The first 3 attached photograph(s) are the TALENT');
    expect(prompt).toContain('The last 1 attached photograph(s) are the PRODUCT');
  });

  it('a pilha respeita o teto de 14 da edge function, sacrificando objeto antes de talento', () => {
    // A edge function corta a CAUDA (`slice(0, 14)`) — justamente os
    // objetos que o [PRODUCT] indexa por trás. Sem cortar aqui, o prompt
    // afirmaria "the last 5" sobre uma pilha em que 2 chegaram, e a
    // instrução de embalagem apontaria para uma pessoa.
    const url = (p: string, n: number) => Array.from({ length: n }, (_, i) => `https://x/${p}${i}.png`);
    const { prompt, body } = buildGenerationRequest({
      brief: 'x', aspectRatio: '4:5',
      avatarImageUrls: url('av', 8),
      personImageUrls: url('pe', 4),
      productImageUrls: url('ob', 5),
    });

    expect(body.productImages).toHaveLength(14);
    expect(prompt).toContain('The first 12 attached photograph(s) are the TALENT');
    expect(prompt).toContain('The last 2 attached photograph(s) are the PRODUCT');
    // Os avatares e as pessoas ficam inteiros; o corte cai nos objetos.
    expect(body.productImages).toContain('https://x/pe3.png');
    expect(body.productImages).not.toContain('https://x/ob2.png');
  });
});

describe('buildGenerationRequest — avatar como talento', () => {
  it('avatar anexado abre o bloco [TALENT] e vem primeiro nas referências', () => {
    // Primeiro na lista de propósito: o modelo pesa mais as primeiras
    // referências, e a identidade da pessoa é o que menos pode derreter.
    const { prompt, body } = buildGenerationRequest({
      brief: 'anúncio de verão',
      aspectRatio: '4:5',
      productImageUrls: ['https://x/produto.png'],
      avatarImageUrls: ['https://x/avatar.png'],
    });

    expect(prompt).toContain('[TALENT]');
    expect(prompt).toContain('Preserve their facial structure');
    expect(body.productImages).toEqual(['https://x/avatar.png', 'https://x/produto.png']);
  });

  it('sem avatar, nenhum bloco [TALENT]', () => {
    const { prompt } = buildGenerationRequest({
      brief: 'x', aspectRatio: '4:5', productImageUrls: ['https://x/produto.png'],
    });
    expect(prompt).not.toContain('[TALENT]');
  });

  it('a contagem de fotos anexadas soma produto e avatar', () => {
    // O bloco [ATTACHED PHOTOS] AFIRMA quantas imagens vieram — omitir os
    // avatares faria o prompt mentir para o modelo. A soma passou a ser
    // derivada dentro do montador: era um parâmetro somado à mão aqui, e
    // foi assim que ela deixou de bater quando um terceiro grupo apareceu.
    const { prompt } = buildGenerationRequest({
      brief: 'x', aspectRatio: '4:5',
      productImageUrls: ['https://x/p1.png'],
      avatarImageUrls: ['https://x/a1.png', 'https://x/a2.png'],
    });
    expect(prompt).toContain('3 photograph(s) are attached to this request: 2 of a real person who must appear in the artwork, and 1 of the product being advertised.');
  });
});

describe('buildAvatarRequest', () => {
  const persona = {
    name: 'Fashion Model', gender: 'female' as const, ageRange: '25-30' as const,
    styles: ['luxury' as const], hairColor: 'dark-brown' as const, eyeColor: 'brown' as const,
    details: '', presetId: null,
  };

  it('sempre 4:5 — retrato é retrato', () => {
    const { body } = buildAvatarRequest({ persona });
    expect(body.formatRatio).toBe('4:5');
    expect(body.aspectRatio).toBe('story');
  });

  it('não carrega logo nem story de referência', () => {
    const { body } = buildAvatarRequest({ persona });
    expect(body.logoImage).toBeNull();
    expect(body.storyReference).toBeNull();
  });
});

describe('buildGenerationRequest — as camadas que vieram do Fator', () => {
  it('papéis validados substituem o bloco literal, nunca convivem com ele', () => {
    // Os dois juntos fariam a arte renderizar o texto duas vezes: uma pelo
    // modo `ai`, papel por papel, e outra pelo bloco literal inteiro.
    const { prompt } = buildGenerationRequest({
      brief: 'clínica odontológica',
      aspectRatio: '9:16',
      copy: 'Diga adeus aos dentes amarelados',
      copyBlocks: { titulo: 'Diga adeus', subtitulo: 'aos dentes amarelados' },
    });
    expect(prompt).toContain('MAIN TITLE (dominant, large, primary typeface, high contrast): "Diga adeus"');
    expect(prompt).not.toContain('THE WORDS ARE FIXED');
  });

  it('sem papéis, a copy do usuário continua saindo literal', () => {
    const { prompt } = buildGenerationRequest({
      brief: 'x', aspectRatio: '9:16', copy: 'Diga adeus aos dentes amarelados',
    });
    expect(prompt).toContain('THE WORDS ARE FIXED');
    expect(prompt).not.toContain('MAIN TITLE (dominant');
  });

  it('o mood da referência e o da peça somam, em vez de um apagar o outro', () => {
    // A análise traz o mood do ESTILO; a direção traz o desta peça.
    const { prompt } = buildGenerationRequest({
      brief: 'x',
      aspectRatio: '9:16',
      mood: { adjetivos: ['sofisticado'], referencias: ['Kinfolk'], evita: ['clipart'] },
      artDirection: { mainSubject: 'S', composition: 'C', mood: 'higiênico' },
    });
    expect(prompt).toContain('Tone: sofisticado, higiênico.');
    expect(prompt).toContain('Feels like: Kinfolk.');
    expect(prompt).toContain('Not: clipart.');
  });

  it('a direção sozinha já produz um [MOOD], mesmo sem referência lida', () => {
    const { prompt } = buildGenerationRequest({
      brief: 'x', aspectRatio: '9:16',
      artDirection: { mainSubject: 'S', composition: 'C', mood: 'higiênico, claro' },
    });
    expect(prompt).toContain('Tone: higiênico, claro.');
    expect(prompt).not.toContain('Not: .');
  });
});

describe('buildFactorVariationRequest — herança do sistema visual', () => {
  it('as 5 variações herdam o design system da peça-base', () => {
    // Elas são da mesma oferta e da mesma marca: sem o documento que a base
    // teve, o lote divergiria do original justamente no que deveria manter.
    const { prompt } = buildFactorVariationRequest({
      variation: variacao(),
      originalPrompt: 'prompt da base',
      aspectRatio: '9:16',
      designSystemDoc: 'Layer 1 — Background: full-bleed warm photo',
      antiPadroes: ['NEVER use neon gradients'],
    });
    expect(prompt).toContain('[DESIGN SYSTEM]\nLayer 1 — Background: full-bleed warm photo');
    expect(prompt).toContain('- NEVER use neon gradients');
  });

  it('sem design system na base, o cabeçalho não aparece', () => {
    const { prompt } = buildFactorVariationRequest({
      variation: variacao(), originalPrompt: 'prompt da base', aspectRatio: '9:16',
    });
    expect(prompt).not.toContain('[DESIGN SYSTEM]');
  });
});

function variacao() {
  return {
    slot: 1, label: 'V1',
    strategy: { angle: 'mechanism', angleSubtype: 'sinergia', strategicThesis: 'tese' },
    audience: { persona: 'p', awarenessLevel: 'solution' },
    execution: { dominantEmotion: 'clareza' },
    copy: { title: 'Título', cta: 'Agendar' },
    visualDirection: { mainSubject: 'S', composition: 'C', mood: 'limpo' },
    validation: { changedDimensions: ['thesis'], qualityScore: 9 },
  } as any;
}

describe('buildRetryRequest — o que o prompt afirma, o corpo sustenta', () => {
  it('reenvia os avatares ANTES dos produtos, como na geração original', () => {
    // O prompt indexa talento pelas PRIMEIRAS imagens e produto pelas
    // ÚLTIMAS. Sem os avatares, ele continuava afirmando `avatarCount` e a
    // arte voltava com outro rosto; fora de ordem, [TALENT] apontaria para
    // o produto.
    const { body } = buildRetryRequest({
      prompt: 'p', aspectRatio: '9:16',
      avatarImages: ['https://x/ana.png'],
      productImages: ['https://x/prod.png'],
    });
    expect(body.productImages).toEqual(['https://x/ana.png', 'https://x/prod.png']);
  });

  it('reanexa a arte de origem quando o prompt salvo depende de vê-la', () => {
    // É o caso do reenquadramento: o prompt abre dizendo que a imagem
    // anexada É a arte. Retentar sem ela mandava esse texto no vazio.
    const { body } = buildRetryRequest({
      prompt: 'p', aspectRatio: '1:1', sourceImage: 'https://x/arte.png',
    });
    expect(body.storyReference).toBe('https://x/arte.png');
  });

  it('sem anexos guardados, não inventa nenhum', () => {
    const { body } = buildRetryRequest({ prompt: 'p', aspectRatio: '4:5' });
    expect(body.productImages).toEqual([]);
    expect(body.storyReference).toBeNull();
    expect(body.logoImage).toBeNull();
  });
});
