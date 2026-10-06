import { describe, expect, it } from 'vitest';
import { briefDaVariacao, resumoDaPeca } from './variacoes';

const BRIEF = 'anúncio de clareamento dental';

describe('briefDaVariacao', () => {
  it('uma peça só devolve o brief INTOCADO', () => {
    // A garantia que protege o pedido normal: nada que já saía bom passa a
    // ser lido diferente por causa de um recurso que não foi usado.
    expect(briefDaVariacao(BRIEF, 1, 1)).toBe(BRIEF);
    expect(briefDaVariacao(BRIEF, 1, 0)).toBe(BRIEF);
  });

  it('a primeira de duas pede uma abordagem definida, sem citar ninguém', () => {
    const texto = briefDaVariacao(BRIEF, 1, 2, []);
    expect(texto).toContain(BRIEF);
    expect(texto).toContain('peça 1 de 2');
    expect(texto).not.toContain('já propostas');
  });

  it('a segunda sabe o que a primeira propôs, e é mandada a diferir', () => {
    // É a única razão de a leitura ser sequencial em vez de paralela. Sem
    // isto, "duas ideias diferentes" seria duas leituras parecidas.
    const texto = briefDaVariacao(BRIEF, 2, 2, ['Dois registros do mesmo sorriso, split vertical.']);
    expect(texto).toContain('Dois registros do mesmo sorriso, split vertical.');
    expect(texto).toContain('DIFERENTE');
    expect(texto).toContain('peça 2 de 2');
  });

  it('o brief original abre o texto e sobrevive inteiro', () => {
    // Ele continua sendo o pedido; o resto é instrução sobre o lote.
    expect(briefDaVariacao(BRIEF, 2, 3, ['x']).startsWith(BRIEF)).toBe(true);
  });

  it('proposta anterior vazia não vira item de lista órfão', () => {
    const texto = briefDaVariacao(BRIEF, 2, 2, ['', '   ']);
    expect(texto).not.toContain('- ');
    expect(texto).not.toContain('já propostas');
  });
});

describe('resumoDaPeca', () => {
  it('junta sujeito e composição numa frase só', () => {
    expect(resumoDaPeca({ mainSubject: 'Vitrine da loja.', composition: 'Plano frontal.' }))
      .toBe('Vitrine da loja. Plano frontal.');
  });

  it('sem direção, não inventa frase', () => {
    expect(resumoDaPeca(null)).toBeNull();
    expect(resumoDaPeca({ mainSubject: '  ', composition: '' })).toBeNull();
  });
});
