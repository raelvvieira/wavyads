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
    const comPreservacao = buildCreativePrompt({ aspect: 'story', productImageCount: 1, preserveFaces: true });
    const semPreservacao = buildCreativePrompt({ aspect: 'story', productImageCount: 1, preserveFaces: false });
    expect(comPreservacao).toContain('Preserve their exact likeness');
    expect(semPreservacao).not.toContain('Preserve their exact likeness');
  });

  it('traduz o idioma exigido em todos os blocos', () => {
    expect(buildCreativePrompt({ aspect: 'story', language: 'en' })).toContain('other than English');
    expect(buildCreativePrompt({ aspect: 'story', language: 'es' })).toContain('other than Spanish');
    expect(buildCreativePrompt({ aspect: 'story', language: 'pt-BR' })).toContain('other than Portuguese (Brazil)');
  });
});
