import { describe, expect, it } from 'vitest';
import { normalizeContainer, normalizeContainersFile } from './normalize';
import { CONTAINERS, FALHAS_DE_CARGA, containerPorId, mergeContainers } from './catalog';
import { digestOf, comoAspectRatio, TETO_RESUMO } from './types';

const MINIMO = { id: 'teste', descricao_layout: 'Card com foto sangrando.' };

describe('normalizeContainer', () => {
  it('exige id e layout — e nada mais', () => {
    // 52 dos 53 containers reais não têm `regra_de_copy` nem
    // `angulos_vedados`. Um parser que exigisse o conjunto cheio rejeitaria
    // quase todos.
    expect(normalizeContainer(MINIMO)).not.toBeNull();
    expect(normalizeContainer({ descricao_layout: 'x' })).toBeNull();
    expect(normalizeContainer({ id: 'x' })).toBeNull();
  });

  it('nunca lança com entrada estranha', () => {
    for (const lixo of [null, undefined, 42, 'texto', [], { a: 1 }]) {
      expect(() => normalizeContainer(lixo)).not.toThrow();
    }
  });

  it('sem funil declarado, a peça concorre em qualquer etapa', () => {
    // Mais honesto que inventar uma etapa — e evita que a peça suma do
    // pré-filtro por um campo que ninguém preencheu.
    expect(normalizeContainer(MINIMO)!.funil).toEqual(['topo', 'meio', 'fundo']);
  });

  it('aceita lista escrita como texto, uma por linha', () => {
    const c = normalizeContainer({ ...MINIMO, fixo: '- split 50/50\n- sem moldura' });
    expect(c!.fixo).toEqual(['split 50/50', 'sem moldura']);
  });

  it('valor categórico fora do conjunto cai no padrão, não quebra', () => {
    const c = normalizeContainer({ ...MINIMO, densidade_texto: 'altíssima', presenca_de_cta: '?' });
    expect(c!.densidade_texto).toBe('media');
    expect(c!.presenca_de_cta).toBe('opcional');
  });
});

describe('normalizeContainersFile', () => {
  it('relata o que ficou de fora, em vez de engolir', () => {
    // Um catálogo que perde entradas em silêncio é um catálogo que encolhe
    // sem ninguém notar.
    const { ok, falhas } = normalizeContainersFile([
      MINIMO,
      { id: 'sem-layout' },
      { descricao_layout: 'sem id' },
    ]);
    expect(ok).toHaveLength(1);
    expect(falhas).toHaveLength(2);
    expect(falhas[0].motivo).toContain('descricao_layout');
    expect(falhas[1].motivo).toContain('sem id');
  });

  it('id repetido não entra duas vezes — e o relatório diz qual', () => {
    // Pior que entrada faltando: o seletor escolheria um e a tela mostraria
    // outro, sem nada indicar a troca.
    const { ok, falhas } = normalizeContainersFile([MINIMO, { ...MINIMO, nome_pt: 'Outro' }]);
    expect(ok).toHaveLength(1);
    expect(falhas[0].motivo).toContain('repetido');
  });

  it('aceita a lista na raiz e o objeto com `containers`', () => {
    expect(normalizeContainersFile([MINIMO]).ok).toHaveLength(1);
    expect(normalizeContainersFile({ containers: [MINIMO] }).ok).toHaveLength(1);
  });
});

describe('o catálogo real', () => {
  it('carrega os 53 containers sem perder nenhum', () => {
    expect(CONTAINERS.length).toBe(53);
    expect(FALHAS_DE_CARGA).toEqual([]);
  });

  it('todo container tem id único, layout e o que é fixo', () => {
    const ids = new Set(CONTAINERS.map((c) => c.id));
    expect(ids.size).toBe(CONTAINERS.length);
    for (const c of CONTAINERS) {
      expect(c.descricao_layout.length).toBeGreaterThan(20);
      expect(c.fixo.length).toBeGreaterThan(0);
      expect(c.nome_pt).toBeTruthy();
    }
  });

  it('toda proporção declarada é um formato que o Studio sabe gerar', () => {
    // Um container de um formato desconhecido nunca seria escolhido, e
    // ninguém saberia por quê.
    for (const c of CONTAINERS) {
      expect(comoAspectRatio(c.proporcao), `${c.id} → ${c.proporcao}`).not.toBeNull();
    }
  });

  it('o resumo que vai ao seletor respeita o teto', () => {
    // Todos os resumos da shortlist entram numa mensagem só. O maior
    // `descricao_layout` do catálogo tem 1448 chars — sozinho estouraria.
    for (const c of CONTAINERS) {
      expect(digestOf(c).resumo.length).toBeLessThanOrEqual(TETO_RESUMO);
    }
  });

  it('containerPorId acha e não inventa', () => {
    expect(containerPorId('antes_depois')?.nome_pt).toBe('Antes e depois');
    expect(containerPorId('nao-existe')).toBeNull();
  });

  it('a ordem é alfabética, nunca a do arquivo', () => {
    // O pré-filtro desempata por posição quando a pontuação empata.
    // Reordenar o JSON mudaria em silêncio qual container é escolhido.
    const ids = CONTAINERS.map((c) => c.id);
    expect(ids).toEqual([...ids].sort());
  });
});

describe('mergeContainers', () => {
  it('entrada de fora com id conhecido substitui a do arquivo', () => {
    // É o que permite corrigir um container sem deploy.
    const doArquivo = normalizeContainersFile([MINIMO]).ok;
    const deFora = normalizeContainersFile([{ ...MINIMO, nome_pt: 'Corrigido' }], 'banco').ok;
    const juntos = mergeContainers(doArquivo, deFora);
    expect(juntos).toHaveLength(1);
    expect(juntos[0].nome_pt).toBe('Corrigido');
    expect(juntos[0].origem).toBe('banco');
  });

  it('id novo entra, e nenhum do arquivo some', () => {
    const doArquivo = normalizeContainersFile([MINIMO]).ok;
    const deFora = normalizeContainersFile([{ id: 'novo', descricao_layout: 'Outro card.' }], 'banco').ok;
    const juntos = mergeContainers(doArquivo, deFora);
    expect(juntos.map((c) => c.id)).toEqual(['novo', 'teste']);
  });
});
