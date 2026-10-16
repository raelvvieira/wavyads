import { describe, expect, it } from 'vitest';
import { agregarSerie, pontosPorGranularidade } from './serieTemporal';

/** Uma segunda-feira: 2026-10-05. */
const dia = (iso: string, p: any = {}) => ({
  date: iso.slice(8) + '/' + iso.slice(5, 7),
  date_raw: iso,
  spend: 100, impressions: 1000, clicks: 10, leads: 2, purchases: 1,
  results: 3, conversions: 3, ...p,
});

describe('agregarSerie', () => {
  it('dia devolve ponto a ponto', () => {
    const s = agregarSerie([dia('2026-10-05'), dia('2026-10-06')], 'dia');
    expect(s).toHaveLength(2);
    expect(s[0].date).toBe('05/10');
  });

  it('semana soma de segunda a domingo, e rotula pela segunda', () => {
    const s = agregarSerie([
      dia('2026-10-05'), dia('2026-10-08'), dia('2026-10-11'), // mesma semana
      dia('2026-10-12'),                                        // semana seguinte
    ], 'semana');
    expect(s).toHaveLength(2);
    expect(s[0].date).toBe('05/10');
    expect(s[0].spend).toBe(300);
    expect(s[1].date).toBe('12/10');
  });

  it('CTR da semana NÃO é a média dos CTRs diários', () => {
    // O erro que este módulo existe para não cometer. Um dia com 3
    // impressões e 1 clique tem CTR de 33%; deixá-lo puxar a média da
    // semana inventaria uma semana que não existiu.
    const s = agregarSerie([
      dia('2026-10-05', { impressions: 3, clicks: 1 }),      // CTR 33,3%
      dia('2026-10-06', { impressions: 9997, clicks: 99 }),  // CTR 0,99%
    ], 'semana');

    // As somas primeiro: é delas que a derivada sai.
    expect(s[0].impressions).toBe(10_000);
    expect(s[0].clicks).toBe(100);
    const mediaDosDias = (33.33 + 0.99) / 2;
    expect(s[0].ctr).toBeCloseTo(1, 2);          // 100 / 10.000
    expect(s[0].ctr).not.toBeCloseTo(mediaDosDias, 0);
  });

  it('custo por resultado da semana também sai da soma', () => {
    const s = agregarSerie([
      dia('2026-10-05', { spend: 900, results: 30 }),
      dia('2026-10-06', { spend: 100, results: 10 }),
    ], 'semana');
    expect(s[0].cost_per_result).toBe(25); // 1000 / 40
  });

  it('mês agrupa pelo ano-mês, com rótulo legível', () => {
    const s = agregarSerie([dia('2026-09-30'), dia('2026-10-01'), dia('2026-10-31')], 'mes');
    expect(s.map((p) => p.date)).toEqual(['set/26', 'out/26']);
    expect(s[1].spend).toBe(200);
  });

  it('a ordem é cronológica, não a de chegada', () => {
    const s = agregarSerie([dia('2026-10-12'), dia('2026-10-05')], 'semana');
    expect(s.map((p) => p.date)).toEqual(['05/10', '12/10']);
  });

  it('sem a data ISO, volta como diária em vez de inventar baldes', () => {
    // O rótulo do eixo é "dd/mm", sem ano. Errar o agrupamento em silêncio
    // seria pior que não agrupar.
    const semIso = [{ date: '05/10', spend: 100 }, { date: '06/10', spend: 100 }];
    expect(agregarSerie(semIso, 'semana')).toHaveLength(2);
    expect(agregarSerie(semIso, 'mes')).toHaveLength(2);
  });

  it('divisão por zero vira zero, não infinito', () => {
    const s = agregarSerie([dia('2026-10-05', { impressions: 0, clicks: 0, results: 0 })], 'dia');
    expect(s[0].ctr).toBe(0);
    expect(s[0].cpc).toBe(0);
    expect(s[0].cost_per_result).toBe(0);
  });

  it('série vazia não quebra', () => {
    for (const vazia of [null, undefined, []]) {
      expect(agregarSerie(vazia as any, 'semana')).toEqual([]);
    }
  });
});

describe('pontosPorGranularidade', () => {
  it('diz quantos pontos cada granularidade produz', () => {
    const trinta = Array.from({ length: 30 }, (_, i) =>
      dia(`2026-10-${String(i + 1).padStart(2, '0')}`));
    const p = pontosPorGranularidade(trinta);
    expect(p.dia).toBe(30);
    expect(p.semana).toBeLessThan(p.dia);
    expect(p.mes).toBe(1);
  });
});
