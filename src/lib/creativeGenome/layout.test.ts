import { describe, expect, it } from 'vitest';
import { describeLayoutStructure, containerComoTemplate } from './layout';
import { CONTAINERS, containerPorId } from './catalog';
import { buildCreativePrompt } from '@/features/creative-studio/lib/promptBuilder';

describe('describeLayoutStructure', () => {
  it('objeto desconhecido volta ao JSON — é a V1, que tem snapshot travado', () => {
    // O caminho V1 passa `layout_structure` cru da tabela. Mudar o formato
    // dali alteraria um prompt que já está em produção, sem ganho nenhum.
    expect(describeLayoutStructure({ grid: '12col' })).toBe('{"grid":"12col"}');
    expect(describeLayoutStructure(null)).toBe('{}');
    expect(describeLayoutStructure(undefined)).toBe('{}');
  });

  it('nunca emite [object Object]', () => {
    for (const entrada of [{}, { a: { b: 1 } }, 42, true, [], null]) {
      expect(describeLayoutStructure(entrada)).not.toContain('[object Object]');
    }
  });

  it('string e lista passam direto', () => {
    expect(describeLayoutStructure('  Card com foto sangrando.  ')).toBe('Card com foto sangrando.');
    expect(describeLayoutStructure(['topo: foto', 'base: texto'])).toBe('- topo: foto\n- base: texto');
  });

  it('um container vira prosa: layout, elementos e o que é inegociável', () => {
    const c = containerPorId('antes_depois')!;
    const texto = describeLayoutStructure(c);

    expect(texto).toContain(c.descricao_layout);
    expect(texto).toContain('Elements, in order:');
    expect(texto).toContain('NON-NEGOTIABLE');
    // `fixo` é a definição da peça — "split vertical 50/50 encostado".
    expect(texto).toContain(c.fixo[0]);
    expect(texto).not.toContain('{');
  });

  it('`trocavel` fica DE FORA — é instrução para quem adapta, não para quem desenha', () => {
    // O modelo já recebe o briefing dizendo o que a peça é. Dizer também
    // "a foto pode mudar" convida a inventar uma em vez de usar a anexada.
    // Verificado pelo cabeçalho, não pelo conteúdo: trechos de `trocavel`
    // reaparecem naturalmente dentro de `descricao_layout` ("as duas fotos"),
    // e procurá-los ali seria um teste que acusa o inocente.
    const texto = describeLayoutStructure(containerPorId('antes_depois')!);
    expect(texto).not.toMatch(/trocável|interchangeable|can change|VARIABLE/i);
  });

  it('o bloco cabe no orçamento, mesmo com o maior container do catálogo', () => {
    // O prompt já tem quinze blocos disputando atenção. Um container que
    // sozinho pesasse como meio prompt faria o modelo amolecer no fim —
    // onde moram as proibições.
    const maior = CONTAINERS.reduce((a, b) =>
      describeLayoutStructure(a).length > describeLayoutStructure(b).length ? a : b);
    expect(describeLayoutStructure(maior).length).toBeLessThan(2500);
  });
});

describe('o container no prompt final', () => {
  it('sem container, o prompt é o de sempre — nenhuma arte aprovada muda', () => {
    // A garantia que protege tudo que já foi gerado e aprovado.
    const semNada = buildCreativePrompt({ aspect: 'story' });
    expect(semNada).not.toContain('[TEMPLATE STRUCTURE]');
  });

  it('com container, o layout chega em prosa e a cláusula anti-copy vem junto', () => {
    const c = containerPorId('nota_do_iphone') ?? CONTAINERS[0];
    const prompt = buildCreativePrompt({
      aspect: 'story',
      template: containerComoTemplate(c),
    });

    expect(prompt).toContain('[TEMPLATE STRUCTURE]');
    expect(prompt).toContain(c.nome_pt);
    expect(prompt).toContain(c.descricao_layout);
    // Vinda de graça do bloco que já existia: o container traz o formato,
    // nunca o texto de quem o usou antes.
    expect(prompt).toContain('Do NOT reuse, reference or render any headline');
  });

  it('todo container do catálogo produz um prompt sem JSON cru', () => {
    // Um `{"chave":"valor"}` solto no prompt é candidato a ser renderizado
    // na arte — o [DO NOT INCLUDE] já carrega "garbled text" por isso.
    for (const c of CONTAINERS) {
      const estrutura = describeLayoutStructure(c);
      expect(estrutura.startsWith('{'), c.id).toBe(false);
    }
  });
});
