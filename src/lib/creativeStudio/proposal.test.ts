import { describe, expect, it } from 'vitest';
import { montarProposta } from './proposal';
import { containerPorId } from '@/lib/creativeGenome/catalog';

const DIRECAO = {
  mainSubject: 'Dois registros do mesmo sorriso.',
  composition: 'Split vertical, antes à esquerda.',
  mood: 'clínico e caloroso',
};

describe('montarProposta', () => {
  it('sem nada, a proposta se declara vazia em vez de virar painel', () => {
    // Um painel que repete o pedido de volta cobra uma aprovação sem
    // oferecer informação. Melhor não aparecer.
    const p = montarProposta({});
    expect(p.vazia).toBe(true);
    expect(p.cena).toBeNull();
    expect(p.formato).toBeNull();
    expect(p.copy).toEqual([]);
    expect(p.leu).toEqual([]);
  });

  it('a cena é uma frase só, mesmo vindo de dois campos', () => {
    // Separá-las visualmente faria parecer duas decisões independentes,
    // quando a composição é justamente COMO o sujeito aparece.
    const p = montarProposta({ artDirection: DIRECAO });
    expect(p.cena).toBe('Dois registros do mesmo sorriso. Split vertical, antes à esquerda.');
    expect(p.cena).not.toContain('\n');
    expect(p.vazia).toBe(false);
  });

  it('com metade da direção, a frase não sai com sobra de espaço nem órfã', () => {
    expect(montarProposta({ artDirection: { ...DIRECAO, composition: '  ' } }).cena)
      .toBe('Dois registros do mesmo sorriso.');
    expect(montarProposta({ artDirection: { ...DIRECAO, mainSubject: '' } }).cena)
      .toBe('Split vertical, antes à esquerda.');
    // Direção inteira em branco não vira string vazia: vira ausência.
    expect(montarProposta({ artDirection: { mainSubject: ' ', composition: '', mood: '' } }).cena)
      .toBeNull();
  });

  it('a copy sai na ordem da peça, e papel vazio não ganha linha', () => {
    // Sem isto, um "Subtítulo:" sem texto apareceria no painel pedindo
    // aprovação de nada.
    const p = montarProposta({
      copyBlocks: { cta: 'Agendar', titulo: 'Dá pra resolver.', subtitulo: '   ' },
    });
    expect(p.copy).toEqual([
      { papel: 'Título', texto: 'Dá pra resolver.' },
      { papel: 'Chamada', texto: 'Agendar' },
    ]);
  });

  it('o formato vem do container, e a proporção pedida vence a dele', () => {
    // O usuário escolheu 9:16 no popover; o container declara 1:1 como o
    // formato em que nasceu. Mostrar a dele seria mentir sobre o que vai
    // ser gerado.
    const c = containerPorId('antes_depois')!;
    expect(montarProposta({ container: c }).formato)
      .toEqual({ nome: c.nome_pt, proporcao: c.proporcao });
    expect(montarProposta({ container: c, aspectRatio: '9:16' }).formato?.proporcao).toBe('9:16');
  });

  it('a lista do que foi lido é conferível, e no plural certo', () => {
    // "O sistema leu tudo" é uma promessa que ninguém consegue verificar.
    const c = containerPorId('antes_depois')!;
    expect(montarProposta({ referencias: 1, aprovadas: 1 }).leu)
      .toEqual(['1 referência anexada', '1 arte aprovada deste cliente']);
    const p = montarProposta({ referencias: 3, aprovadas: 17, temDossie: true, container: c });
    expect(p.leu).toEqual([
      '3 referências anexadas',
      '17 artes aprovadas deste cliente',
      'o dossiê da oferta',
      `${c.nome_pt}, do catálogo de formatos`,
    ]);
  });

  it('zero não entra na lista — nada lido é diferente de ler nada', () => {
    // Com `leu` vazio, o painel pode dizer que o pedido foi mais pobre do
    // que podia ser. "0 referências anexadas" diria a mesma coisa pior.
    expect(montarProposta({ referencias: 0, aprovadas: 0, temDossie: false }).leu).toEqual([]);
  });

  it('o ângulo atravessa com o aviso de já ter sido usado', () => {
    // É o que impede propor pela quinta vez o mesmo ângulo para o cliente.
    const p = montarProposta({ angulo: { nome: 'demonstração', inedito: false } });
    expect(p.angulo).toEqual({ nome: 'demonstração', inedito: false });
  });

  it('ângulo e leitura sozinhos não bastam para cobrar aprovação', () => {
    // Saber o que o sistema leu é informação; não é uma proposta de arte.
    // Sem cena, sem copy e sem formato não há o que aprovar.
    expect(montarProposta({ angulo: { nome: 'prova social', inedito: true }, referencias: 2 }).vazia)
      .toBe(true);
  });

  it('entrada nula em qualquer campo não quebra a montagem', () => {
    expect(() => montarProposta({
      container: null, artDirection: null, copyBlocks: null, aspectRatio: null, angulo: null,
    })).not.toThrow();
  });
});
