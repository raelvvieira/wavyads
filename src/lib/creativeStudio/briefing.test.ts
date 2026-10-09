import { describe, expect, it } from 'vitest';
import { briefingDaArte } from './briefing';

const REENQUADRAMENTO = '[REFRAME — THIS IS NOT A NEW ARTWORK]\n[FRAMING OVERRIDE — THIS RENDER IS 1:1]';

describe('briefingDaArte', () => {
  it('sem herança, o briefing é o próprio prompt', () => {
    expect(briefingDaArte({ prompt: 'anúncio de clareamento', metadata: {} })).toBe('anúncio de clareamento');
  });

  it('num reenquadramento, devolve o briefing herdado e NÃO o texto de recorte', () => {
    // O Fator manda este campo ao estrategista como "a peça aprovada".
    // Sem isto, as cinco teses nasciam de um boilerplate de recorte.
    const resize = { prompt: REENQUADRAMENTO, metadata: { promptDeOrigem: 'anúncio de clareamento' } };
    expect(briefingDaArte(resize)).toBe('anúncio de clareamento');
    expect(briefingDaArte(resize)).not.toContain('REFRAME');
  });

  it('herança em branco não sequestra o prompt real', () => {
    expect(briefingDaArte({ prompt: 'o briefing', metadata: { promptDeOrigem: '   ' } })).toBe('o briefing');
    expect(briefingDaArte({ prompt: 'o briefing', metadata: { promptDeOrigem: 42 } as any })).toBe('o briefing');
  });

  it('nunca lança, e nunca devolve null', () => {
    expect(briefingDaArte(null)).toBe('');
    expect(briefingDaArte(undefined)).toBe('');
    expect(briefingDaArte({ prompt: null, metadata: null } as any)).toBe('');
  });
});
