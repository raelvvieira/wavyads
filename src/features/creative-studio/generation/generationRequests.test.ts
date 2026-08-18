import { describe, expect, it } from 'vitest';
import { buildEditRequest, buildGenerationRequest, buildResizeRequest, buildRetryRequest } from './generationRequests';

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
