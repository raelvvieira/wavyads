import { describe, expect, it } from 'vitest';
import { PREVIEW_ASSETS } from '../shell/studioPreviewFixtures';
import {
  SEM_FILTROS_AVANCADOS,
  advancedFilterChips,
  availableAspectRatios,
  hasAdvancedFilters,
  toAssetFilters,
} from './advancedFilters';

describe('advancedFilters', () => {
  it('só oferece formatos presentes no acervo, na ordem do dock', () => {
    expect(availableAspectRatios(PREVIEW_ASSETS)).toEqual(['9:16', '4:5', '1:1', '16:9']);
  });

  it('"Gerando" cobre também o que ainda está na fila', () => {
    // 'queued' e 'generating' são a mesma coisa para quem olha a tela.
    // Deixar 'queued' de fora esconderia a arte que acabou de ser pedida.
    expect(toAssetFilters({ aspectRatio: null, status: 'generating' }))
      .toEqual({ statuses: ['queued', 'generating'] });
  });

  it('sem escolha, não manda filtro nenhum para o canvas', () => {
    // `{ aspectRatio: null }` não é o mesmo que ausência: um objeto com a
    // chave presente convida `matchesFilters` a testar por ela.
    expect(toAssetFilters(SEM_FILTROS_AVANCADOS)).toEqual({});
    expect(hasAdvancedFilters(SEM_FILTROS_AVANCADOS)).toBe(false);
  });

  it('cada corte ativo vira um chip removível', () => {
    expect(advancedFilterChips({ aspectRatio: '9:16', status: 'failed' })).toEqual([
      { id: 'formato', label: '9:16' },
      { id: 'status', label: 'Com falha' },
    ]);
  });
});
