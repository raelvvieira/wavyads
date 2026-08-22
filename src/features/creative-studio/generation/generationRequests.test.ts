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
    expect(prompt).toContain('Ignore every framing and safe-zone instruction stated earlier');
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
    // avatares faria o prompt mentir para o modelo.
    const { prompt } = buildGenerationRequest({
      brief: 'x', aspectRatio: '4:5',
      productImageUrls: ['https://x/p1.png'],
      avatarImageUrls: ['https://x/a1.png', 'https://x/a2.png'],
    });
    expect(prompt).toContain('3 reference image(s) provided');
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
