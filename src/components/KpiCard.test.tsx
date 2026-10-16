import { describe, expect, it } from 'vitest';
import { normalizeCards, DEFAULT_CARDS, TETO_DE_CARDS, METRIC_DEFS } from './KpiCard';

describe('normalizeCards', () => {
  it('quem nunca escolheu nada passa a ver os doze', () => {
    // As escolhas ficam salvas por usuário, e quem nunca abriu o menu tem
    // gravado exatamente o padrão antigo. Tratar isso como "escolha" o
    // deixaria preso a sete cards para sempre — justamente quem mais ganha
    // com a tela cheia.
    const padraoAntigo = ['spend', 'impressions', 'clicks', 'results', 'cost_per_result', 'purchases', 'purchase_value'];
    expect(normalizeCards(padraoAntigo)).toEqual(DEFAULT_CARDS);
  });

  it('mas uma escolha de verdade é respeitada', () => {
    // Mesmo tamanho do padrão antigo, ordem diferente: foi alguém que mexeu.
    const escolha = ['ctr', 'cpm', 'cpc', 'reach', 'frequency', 'leads', 'cpl'];
    expect(normalizeCards(escolha)).toEqual(escolha);
  });

  it('o teto subiu de sete para doze', () => {
    expect(DEFAULT_CARDS).toHaveLength(TETO_DE_CARDS);
    const demais = Object.keys(METRIC_DEFS);
    expect(normalizeCards(demais)).toHaveLength(TETO_DE_CARDS);
  });

  it('entrada inválida cai no padrão em vez de quebrar a tela', () => {
    expect(normalizeCards(null)).toEqual(DEFAULT_CARDS);
    expect(normalizeCards([])).toEqual(DEFAULT_CARDS);
    expect(normalizeCards(['nao_existe', 42, null])).toEqual(DEFAULT_CARDS);
  });

  it('chave desconhecida é descartada sem levar as válidas junto', () => {
    expect(normalizeCards(['ctr', 'inventada', 'cpm'])).toEqual(['ctr', 'cpm']);
  });

  it('custo que cai é notícia BOA — a inversão está declarada', () => {
    // Sem isto, um CPA caindo 9% aparece em vermelho e o cliente lê como
    // piora o que é a melhor notícia da semana.
    for (const k of ['cpm', 'cpc', 'cpl', 'cost_per_purchase', 'cost_per_result'] as const) {
      expect(METRIC_DEFS[k].invertChange, k).toBe(true);
    }
    for (const k of ['spend', 'results', 'purchase_roas', 'ctr'] as const) {
      expect(METRIC_DEFS[k].invertChange, k).toBeFalsy();
    }
  });
});
