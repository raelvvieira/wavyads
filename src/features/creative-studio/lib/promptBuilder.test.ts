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

  it('traduz o idioma exigido em todos os blocos', () => {
    expect(buildCreativePrompt({ aspect: 'story', language: 'en' })).toContain('other than English');
    expect(buildCreativePrompt({ aspect: 'story', language: 'es' })).toContain('other than Spanish');
    expect(buildCreativePrompt({ aspect: 'story', language: 'pt-BR' })).toContain('other than Portuguese (Brazil)');
  });
});
