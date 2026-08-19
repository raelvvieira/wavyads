import { describe, expect, it } from 'vitest';
import { buildAvatarPrompt, describeAvatarPersona } from './avatarPromptBuilder';
import type { AvatarPersona } from '../types/avatarPersona';

function persona(patch: Partial<AvatarPersona> = {}): AvatarPersona {
  return {
    name: 'Fashion Model',
    gender: 'female',
    ageRange: '25-30',
    styles: ['luxury'],
    hairColor: 'dark-brown',
    eyeColor: 'brown',
    details: '',
    presetId: null,
    ...patch,
  };
}

describe('buildAvatarPrompt', () => {
  it('descreve gênero e faixa etária no sujeito', () => {
    const p = buildAvatarPrompt({ persona: persona({ gender: 'male', ageRange: '38-45' }) });
    expect(p).toContain('[SUBJECT]');
    expect(p).toContain('man, 38-45 years old');
  });

  it('traduz os traços para inglês — o rótulo PT-BR é só da interface', () => {
    const p = buildAvatarPrompt({ persona: persona({ hairColor: 'platinum-blonde', eyeColor: 'hazel' }) });
    expect(p).toContain('Hair: platinum blonde');
    expect(p).toContain('Eyes: hazel');
    expect(p).not.toContain('Loiro platinado');
  });

  it('cada estilo vira uma frase própria, e todos entram', () => {
    const p = buildAvatarPrompt({ persona: persona({ styles: ['fitness', 'streetwear'] }) });
    expect(p).toContain('[STYLE & AESTHETIC]');
    expect(p).toContain('activewear');
    expect(p).toContain('streetwear');
  });

  it('sem estilo nenhum, o bloco de estética some', () => {
    const p = buildAvatarPrompt({ persona: persona({ styles: [] }) });
    expect(p).not.toContain('[STYLE & AESTHETIC]');
  });

  it('detalhes livres entram literais; vazios não abrem bloco', () => {
    expect(buildAvatarPrompt({ persona: persona({ details: 'Sardas leves' }) })).toContain('Sardas leves');
    expect(buildAvatarPrompt({ persona: persona({ details: '   ' }) })).not.toContain('[ADDITIONAL DETAILS]');
  });

  it('com fotos de referência, manda preservar a identidade', () => {
    const p = buildAvatarPrompt({ persona: persona(), referenceCount: 3 });
    expect(p).toContain('[REFERENCE PHOTOS]');
    expect(p).toContain('3 reference photo(s)');
    expect(p).toContain('preserve their facial structure');
  });

  it('sem referência, o bloco não aparece', () => {
    expect(buildAvatarPrompt({ persona: persona() })).not.toContain('[REFERENCE PHOTOS]');
  });

  it('proíbe texto na imagem — o avatar vira insumo de outra geração', () => {
    // Texto queimado no avatar reapareceria dentro do anúncio final.
    const p = buildAvatarPrompt({ persona: persona() });
    expect(p).toContain('[DO NOT INCLUDE]');
    expect(p).toContain('Any text, lettering, caption, watermark, logo or signature');
  });

  it('sempre carrega o tratamento fotográfico', () => {
    expect(buildAvatarPrompt({ persona: persona() })).toContain('[PHOTOGRAPHIC TREATMENT]');
  });
});

describe('describeAvatarPersona', () => {
  it('resume idade e até dois estilos', () => {
    const d = describeAvatarPersona(persona({ styles: ['luxury', 'lifestyle', 'streetwear'] }));
    expect(d).toBe('25-30 anos · luxury · lifestyle');
  });
});
