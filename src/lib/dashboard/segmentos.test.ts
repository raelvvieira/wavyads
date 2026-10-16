import { describe, expect, it } from 'vitest';
import { resumirSegmento, rotuloDoSegmento, LINHAS_VISIVEIS } from './segmentos';

const l = (chave: string, spend: number, p: any = {}) => ({
  chave, spend, impressions: 1000, clicks: 50, results: 10,
  cost_per_result: spend / 10, purchase_value: spend * 3, ...p,
});

describe('resumirSegmento', () => {
  it('ordena por investimento e calcula a proporção', () => {
    const r = resumirSegmento([l('25-34', 200), l('35-44', 800)]);
    expect(r.fatias.map((f) => f.chave)).toEqual(['35-44', '25-34']);
    expect(r.fatias[0].percentual).toBe(80);
  });

  it('o corte é da VISTA — os totais continuam somando tudo', () => {
    // Um card que mostra três linhas e um total que só soma essas três
    // mente sobre o tamanho da conta.
    const r = resumirSegmento([l('a', 500), l('b', 300), l('c', 100), l('d', 100)]);
    expect(r.fatias).toHaveLength(LINHAS_VISIVEIS);
    expect(r.investimento).toBe(1000);
    expect(r.ocultas).toBe(1);
  });

  it('a proporção é do total, não do que coube na tela', () => {
    const r = resumirSegmento([l('a', 500), l('b', 300), l('c', 100), l('d', 100)]);
    expect(r.fatias[0].percentual).toBe(50);
  });

  it('linha sem investimento não entra', () => {
    const r = resumirSegmento([l('a', 1000), l('b', 0)]);
    expect(r.fatias).toHaveLength(1);
    expect(r.ocultas).toBe(0);
  });

  it('segmento vazio devolve zeros em vez de quebrar', () => {
    for (const vazio of [null, undefined, []]) {
      const r = resumirSegmento(vazio as any);
      expect(r.fatias).toEqual([]);
      expect(r.investimento).toBe(0);
    }
  });

  it('número estranho vira zero, e a chave vazia vira Desconhecido', () => {
    const r = resumirSegmento([{ chave: '', spend: 100, results: NaN } as any]);
    expect(r.fatias[0].chave).toBe('Desconhecido');
    expect(r.resultados).toBe(0);
  });
});

describe('rotuloDoSegmento', () => {
  it('as plataformas ganham o nome que a pessoa conhece', () => {
    expect(rotuloDoSegmento('instagram')).toBe('Instagram');
    expect(rotuloDoSegmento('audience_network')).toBe('Audience Network');
  });

  it('a posição perde o prefixo da plataforma — ele é ruído ali', () => {
    // Sem tirar, metade das linhas do card começa com a mesma palavra.
    expect(rotuloDoSegmento('instagram_stories')).toBe('Stories');
    expect(rotuloDoSegmento('facebook_reels')).toBe('Reels');
  });

  it('o que não é conhecido vira legível, não cru', () => {
    expect(rotuloDoSegmento('right_hand_column')).toBe('Right Hand Column');
    expect(rotuloDoSegmento('')).toBe('Desconhecido');
  });
});
