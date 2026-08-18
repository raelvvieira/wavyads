import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LANGUAGE,
  DEFAULT_MODEL,
  SNAPSHOT_KEYS,
  pickThumbnailUrl,
  readProjectSnapshot,
} from './projectSnapshot';

describe('readProjectSnapshot', () => {
  it('abre um projeto vazio sem quebrar', () => {
    // Todo projeto já salvo é uma versão anterior deste formato. Abrir não
    // pode falhar por um campo que ainda não existia na época.
    const s = readProjectSnapshot({});
    expect(s.currentStage).toBe('initial');
    expect(s.projectTitle).toBe('Novo criativo');
    expect(s.language).toBe(DEFAULT_LANGUAGE);
  });

  it('tolera null e undefined', () => {
    expect(() => readProjectSnapshot(null)).not.toThrow();
    expect(() => readProjectSnapshot(undefined)).not.toThrow();
  });

  it('repõe o idioma salvo', () => {
    // Era o defeito mais caro: `language` é o idioma do texto DENTRO da arte.
    // Um projeto salvo em inglês voltava como pt-BR e a próxima geração saía
    // no idioma errado, sem aviso.
    expect(readProjectSnapshot({ language: 'en' }).language).toBe('en');
    expect(readProjectSnapshot({}).language).toBe(DEFAULT_LANGUAGE);
  });

  it('repõe modelo e passo', () => {
    expect(readProjectSnapshot({ model: 'x', step: 3 })).toMatchObject({ model: 'x', step: 3 });
    expect(readProjectSnapshot({})).toMatchObject({ model: DEFAULT_MODEL, step: 0 });
  });

  it('preserva o passo zero', () => {
    // `|| 0` também daria 0, mas por acidente. A checagem de tipo é o que
    // distingue "salvou zero" de "não salvou nada".
    expect(readProjectSnapshot({ step: 0 }).step).toBe(0);
  });

  it('trata preserveFaces=false como escolha, não como ausência', () => {
    expect(readProjectSnapshot({ preserveFaces: false }).preserveFaces).toBe(false);
    expect(readProjectSnapshot({}).preserveFaces).toBe(true);
  });

  it('repõe as âncoras de linhagem', () => {
    // Sem elas, restaurar e editar criava asset órfão com parent nulo.
    const s = readProjectSnapshot({
      mainStoryAssetId: 'a1',
      mainSquareAssetId: 'a2',
      factorAssetIds: ['f0', null, 'f2'],
    });
    expect(s.mainStoryAssetId).toBe('a1');
    expect(s.mainSquareAssetId).toBe('a2');
    expect(s.factorAssetIds).toEqual(['f0', null, 'f2', null, null]);
  });

  it('completa os cinco slots do Fator', () => {
    // Um snapshot antigo pode ter menos posições; indexar o sexto elemento
    // de um array de três devolveria undefined no meio do fluxo.
    expect(readProjectSnapshot({ factorSquareImages: ['u'] }).factorSquareImages).toHaveLength(5);
    expect(readProjectSnapshot({}).factorAssetIds).toEqual([null, null, null, null, null]);
  });

  it('deriva o título do prompt quando não há título', () => {
    const s = readProjectSnapshot({ initialPrompt: 'a'.repeat(120) });
    expect(s.projectTitle).toHaveLength(60);
  });

  it('mantém selectedVariationIdx = 0', () => {
    // Zero é um índice válido: `|| null` apagaria a primeira variação.
    expect(readProjectSnapshot({ selectedVariationIdx: 0 }).selectedVariationIdx).toBe(0);
    expect(readProjectSnapshot({}).selectedVariationIdx).toBeNull();
  });

  it('cobre todas as chaves do contrato', () => {
    const s = readProjectSnapshot({}) as unknown as Record<string, unknown>;
    expect(SNAPSHOT_KEYS.filter((k) => !(k in s))).toEqual([]);
  });
});

describe('pickThumbnailUrl', () => {
  it('recusa data URI', () => {
    // Um base64 aqui infla a listagem inteira do histórico.
    expect(pickThumbnailUrl(['data:image/png;base64,AAAA'])).toBeNull();
  });

  it('avalia cada candidato, não só o primeiro truthy', () => {
    // O bug que isso evita: parar no primeiro valor presente e devolver
    // justamente o data URI, ignorando uma URL boa logo atrás.
    expect(pickThumbnailUrl(['data:image/png;base64,AAAA', 'https://x/y.png'])).toBe('https://x/y.png');
  });

  it('ignora vazios', () => {
    expect(pickThumbnailUrl([null, undefined, '', 'https://x/y.png'])).toBe('https://x/y.png');
    expect(pickThumbnailUrl([null, undefined])).toBeNull();
  });
});
