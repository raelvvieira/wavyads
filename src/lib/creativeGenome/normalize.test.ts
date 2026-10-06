import { describe, expect, it } from 'vitest';
import { normalizeGenome, resumirEm, slugDe } from './normalize';

const DOC = 'EDITORIAL PREMIUM — Design System\n\nCOMPOSITION\nGrid editorial.';
const LAYOUT = 'Bloco fotográfico no topo da caixa segura; massa tipográfica embaixo.';

describe('normalizeGenome', () => {
  it('sem LAYOUT devolve null — é ele o núcleo, não a paleta', () => {
    expect(normalizeGenome({ nome: 'Vazio' }, 'builtin')).toBeNull();
    expect(normalizeGenome({ nome: 'X', designSystemDoc: DOC }, 'builtin')).toBeNull();
  });

  it('container SEM paleta é válido — é por isso que ele adapta à marca', () => {
    // "Cartaz" é regra de composição: serve à clínica e à oficina mecânica,
    // e a cor vem da marca. Exigir `designSystemDoc` rejeitaria metade dos
    // containers reais.
    const g = normalizeGenome({ nome: 'Cartaz', layout: LAYOUT }, 'importado');
    expect(g).not.toBeNull();
    expect(g!.container.descricao).toBe(LAYOUT);
    expect(g!.designSystemDoc).toBeUndefined();
  });

  it('o layout chega como string, lista ou objeto aninhado', () => {
    // O containers.json de origem não conhece o nosso tipo.
    expect(normalizeGenome({ nome: 'A', estrutura: LAYOUT }, 'importado')!.container.descricao).toBe(LAYOUT);
    expect(normalizeGenome({ nome: 'B', composicao: ['topo: foto', 'base: texto'] }, 'importado')!.container.descricao)
      .toBe('topo: foto\nbase: texto');
    // Objeto sem `descricao` achata em linhas `chave: valor`.
    const achatado = normalizeGenome({ nome: 'C', layout: { topo: 'foto', centro: 'título' } }, 'importado');
    expect(achatado!.container.descricao).toBe('topo: foto\ncentro: título');
  });

  it('regiões nomeadas sobrevivem', () => {
    const g = normalizeGenome({
      nome: 'D',
      container: { descricao: LAYOUT, regioes: [{ papel: 'headline', onde: 'terço superior' }] },
    }, 'builtin');
    expect(g!.container.regioes).toEqual([{ papel: 'headline', onde: 'terço superior' }]);
  });

  it('nunca lança com entrada estranha', () => {
    // Quem chama está carregando um catálogo inteiro: um arquivo malformado
    // não pode derrubar a biblioteca toda.
    for (const lixo of [null, undefined, 42, 'texto', [], { a: 1 }]) {
      expect(() => normalizeGenome(lixo, 'importado')).not.toThrow();
    }
  });

  it('aceita antiPadroes como array OU como o texto que o seeder usa', () => {
    // `negative_prompt` no banco é um texto com uma regra por linha,
    // começando com "- ". É o formato real, não hipotético.
    const comoTexto = normalizeGenome({
      nome: 'X', layout: LAYOUT, designSystemDoc: DOC,
      negative_prompt: '- NEVER use neon gradients\n- NEVER stack more than two fonts',
    }, 'banco');
    expect(comoTexto!.antiPadroes).toEqual([
      'NEVER use neon gradients',
      'NEVER stack more than two fonts',
    ]);

    const comoArray = normalizeGenome({
      nome: 'X', layout: LAYOUT, antiPadroes: ['NEVER a', 'NEVER b'],
    }, 'builtin');
    expect(comoArray!.antiPadroes).toEqual(['NEVER a', 'NEVER b']);
  });

  it('deriva id do nome quando ele não vem', () => {
    const g = normalizeGenome({ nome: 'Editorial Premium', layout: LAYOUT }, 'builtin');
    expect(g!.id).toBe('editorial-premium');
  });

  it('deriva o resumo quando ele falta — um genoma sem resumo é invisível ao seletor', () => {
    const g = normalizeGenome({ nome: 'X', layout: LAYOUT, designSystemDoc: DOC }, 'builtin');
    expect(g!.resumo).toBeTruthy();
    expect(g!.resumo.length).toBeLessThanOrEqual(320);
  });

  it('mood sem nenhuma das três listas vira null, não um objeto oco', () => {
    // Um mood vazio faria o bloco [MOOD] sair com cabeçalho e nada embaixo
    // — a mesma classe de ruído que o `[DESIGN SYSTEM]` órfão já causou.
    const vazio = normalizeGenome({ nome: 'X', layout: LAYOUT, designSystemDoc: DOC, mood: {} }, 'builtin');
    expect(vazio!.mood).toBeNull();

    const cheio = normalizeGenome({
      nome: 'X', layout: LAYOUT, mood: { adjetivos: ['sóbrio'] },
    }, 'builtin');
    expect(cheio!.mood).toEqual({ adjetivos: ['sóbrio'], referencias: [], evita: [] });
  });

  it('terceiros é true por padrão — a guarda da marca de origem não nasce desligada', () => {
    // `mood.referencias` carrega nomes de marca ("Kinfolk", "Aesop") e o
    // bloco [MOOD] os emite. Sem esta bandeira, a cláusula que proíbe
    // reproduzi-las não liga.
    expect(normalizeGenome({ nome: 'X', layout: LAYOUT, designSystemDoc: DOC }, 'builtin')!.terceiros).toBe(true);
    // Só um `false` explícito desliga.
    expect(normalizeGenome({ nome: 'X', layout: LAYOUT, designSystemDoc: DOC, terceiros: false }, 'builtin')!.terceiros).toBe(false);
  });

  it('lê o formato do banco: layout_structure.visualAnalysis e style_metadata.mood', () => {
    const g = normalizeGenome({
      name: 'Do Banco',
      design_system_doc: DOC,
      layout: LAYOUT,
      layout_structure: { visualAnalysis: { camadas: ['Layer 1 — foto'], espaco: 'solto' } },
      style_metadata: { mood: { adjetivos: ['editorial'], referencias: ['Kinfolk'], evita: [] } },
    }, 'banco');

    expect(g!.visualAnalysis?.camadas).toEqual(['Layer 1 — foto']);
    expect(g!.mood?.referencias).toEqual(['Kinfolk']);
    expect(g!.origem).toBe('banco');
  });
});

describe('resumirEm', () => {
  it('fica nas duas primeiras frases', () => {
    expect(resumirEm('Uma. Duas. Três.')).toBe('Uma. Duas.');
  });

  it('corta no teto, porque todos os resumos entram num prompt só', () => {
    const r = resumirEm('a'.repeat(500), 50);
    expect(r.length).toBeLessThanOrEqual(50);
    expect(r.endsWith('…')).toBe(true);
  });

  it('texto vazio não vira reticências soltas', () => {
    expect(resumirEm('   ')).toBe('');
  });
});

describe('slugDe', () => {
  it('tira acento, espaço e pontuação', () => {
    expect(slugDe('Orgânico Aspiracional')).toBe('organico-aspiracional');
    expect(slugDe('  Bold — Direto!  ')).toBe('bold-direto');
  });
});
