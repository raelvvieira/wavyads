import { describe, expect, it } from 'vitest';
import { lerQuantidade, TETO_DE_PECAS } from './quantidade';

describe('lerQuantidade', () => {
  it('lê o pedido que motivou tudo isto', () => {
    // "quero 2 criativos de clareamento pra dra mariane" saiu com uma arte.
    const q = lerQuantidade('quero 2 criativos de clareamento pra dra mariane');
    expect(q.n).toBe(2);
    expect(q.trecho).toBe('2 criativos');
  });

  it('número colado em coisa que NÃO é peça continua valendo uma arte', () => {
    // O teste que impede o usuário de pagar por gerações que não pediu. Sem
    // esta regra, todo número no brief viraria uma arte a mais.
    for (const texto of [
      'arte para os 3 produtos',
      'desconto de 3 meses',
      'até 5 parcelas sem juros',
      'anúncio para os 2 sócios da clínica',
      'manda 2 fotos do produto na arte',
    ]) {
      expect(lerQuantidade(texto).n, texto).toBe(1);
      expect(lerQuantidade(texto).trecho, texto).toBeNull();
    }
  });

  it('entende número por extenso e sem acento', () => {
    expect(lerQuantidade('faz duas variações disso').n).toBe(2);
    expect(lerQuantidade('faz tres opcoes').n).toBe(3);
    expect(lerQuantidade('TRÊS ARTES NOVAS').n).toBe(3);
  });

  it('aceita um adjetivo entre o número e a peça, mas não um parágrafo', () => {
    expect(lerQuantidade('quero 2 novos criativos').n).toBe(2);
    expect(lerQuantidade('me dá 3 opções de arte').n).toBe(3);
    // Longe demais: o número já não está falando da peça.
    expect(lerQuantidade('2 pessoas sorrindo em uma arte').n).toBe(1);
  });

  it('acima do teto, corta e DIZ que cortou', () => {
    // Entregar 4 calada depois de um pedido de 10 é mentir pelo resultado.
    const q = lerQuantidade('crie 10 artes para o lançamento');
    expect(q.n).toBe(TETO_DE_PECAS);
    expect(q.pedido).toBe(10);
  });

  it('zero vira uma — pedido de zero peça é engano, não instrução', () => {
    expect(lerQuantidade('0 criativos').n).toBe(1);
  });

  it('o número mais próximo da peça é quem manda', () => {
    // "2 de 3 formatos": deixar o 2 alcançar "formatos" por cima do 3 leria
    // a frase ao contrário.
    expect(lerQuantidade('quero 2 de 3 variações').n).toBe(3);
  });

  it('sem número, é uma peça', () => {
    expect(lerQuantidade('anúncio de clareamento dental')).toEqual({ n: 1, pedido: 1, trecho: null });
  });

  it('nunca lança, com qualquer entrada', () => {
    for (const lixo of [null, undefined, 42, '', '   ', {}, []]) {
      expect(() => lerQuantidade(lixo)).not.toThrow();
      expect(lerQuantidade(lixo).n).toBe(1);
    }
  });

  it('ano não é quantidade', () => {
    // `2026` tem quatro dígitos e não entra; senão "campanha 2026 artes de
    // natal" viraria um lote.
    expect(lerQuantidade('campanha 2026 artes de natal').n).toBe(1);
  });
});
