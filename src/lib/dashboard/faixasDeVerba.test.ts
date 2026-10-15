import { describe, expect, it } from 'vitest';
import { faixaDaCampanha, mapearVerba, ORDEM_DAS_FAIXAS } from './faixasDeVerba';

const c = (p: Partial<Parameters<typeof faixaDaCampanha>[0]> = {}) => ({
  id: 'a', name: 'A', spend: 1000, results: 20, cost_per_result: 50, ...p,
});

describe('faixaDaCampanha', () => {
  it('gastar sem trazer nada é a única faixa que não depende de régua', () => {
    // Não é "está caro", é "não voltou nada". É a conta mais certa do
    // painel e a que o cliente mais precisa ver.
    expect(faixaDaCampanha(c({ spend: 222, results: 0 }), 50)).toBe('sem_retorno');
    // E vale mesmo quando o custo por resultado vem zerado junto.
    expect(faixaDaCampanha(c({ spend: 222, results: 0, cost_per_result: 0 }), 50)).toBe('sem_retorno');
  });

  it('as faixas comparam contra a régua da conta', () => {
    const r = 50;
    expect(faixaDaCampanha(c({ cost_per_result: 30 }), r)).toBe('escalar');   // 0,6×
    expect(faixaDaCampanha(c({ cost_per_result: 45 }), r)).toBe('manter');    // 0,9×
    expect(faixaDaCampanha(c({ cost_per_result: 65 }), r)).toBe('observar');  // 1,3×
    expect(faixaDaCampanha(c({ cost_per_result: 90 }), r)).toBe('revisar');   // 1,8×
  });

  it('as bordas caem para o lado mais generoso', () => {
    // Exatamente na régua é "manter", não "observar": uma campanha na média
    // da conta não merece um alerta.
    expect(faixaDaCampanha(c({ cost_per_result: 50 }), 50)).toBe('manter');
    expect(faixaDaCampanha(c({ cost_per_result: 35 }), 50)).toBe('escalar');
    expect(faixaDaCampanha(c({ cost_per_result: 70 }), 50)).toBe('observar');
  });

  it('sem régua, não inventa veredito', () => {
    // Uma conta sem nenhum resultado no período não permite comparar nada.
    // "Observar" é o único rótulo honesto aí.
    expect(faixaDaCampanha(c(), 0)).toBe('observar');
  });
});

describe('mapearVerba', () => {
  it('a régua é o custo da CONTA, não a média das médias', () => {
    // Média de médias distorce: uma campanha de R$ 20 com custo de R$ 200
    // pesaria o mesmo que uma de R$ 20.000 com custo de R$ 30.
    const mapa = mapearVerba([
      c({ id: '1', spend: 20000, results: 400, cost_per_result: 50 }),
      c({ id: '2', spend: 20, results: 1, cost_per_result: 20 }),
    ]);
    // 20.020 / 401 ≈ 49,93 — e não (50 + 20) / 2 = 35.
    expect(mapa.referencia).toBeCloseTo(49.93, 1);
  });

  it('as cinco faixas sempre aparecem, mesmo vazias', () => {
    // Uma barra que muda de segmentos a cada período é uma barra que o
    // olho não consegue comparar entre um dia e outro.
    const mapa = mapearVerba([c()]);
    expect(mapa.fatias.map((f) => f.faixa)).toEqual(ORDEM_DAS_FAIXAS);
  });

  it('o percentual é do total investido, e soma 100', () => {
    const mapa = mapearVerba([
      c({ id: '1', spend: 750, results: 30, cost_per_result: 25 }),
      c({ id: '2', spend: 250, results: 2, cost_per_result: 125 }),
    ]);
    expect(mapa.total).toBe(1000);
    expect(Math.round(mapa.fatias.reduce((s, f) => s + f.percentual, 0))).toBe(100);
  });

  it('campanha sem gasto não entra na conta', () => {
    // Ela não disputa verba nenhuma; contá-la encolheria os percentuais de
    // quem de fato gastou.
    const mapa = mapearVerba([c({ id: '1', spend: 1000 }), c({ id: '2', spend: 0, results: 0 })]);
    expect(mapa.total).toBe(1000);
    expect(mapa.fatias.find((f) => f.faixa === 'sem_retorno')!.campanhas).toBe(0);
  });

  it('dinheiro sem retorno vence qualquer outra notícia na frase', () => {
    const mapa = mapearVerba([
      c({ id: '1', spend: 5000, results: 200, cost_per_result: 25 }),
      c({ id: '2', spend: 222, results: 0 }),
    ]);
    // `toLocaleString` separa "R$" do número com espaço não-separável
    // (U+00A0) — é a tipografia correta, e por isso a comparação normaliza
    // em vez de o código estragar o formato.
    expect(mapa.frase?.replace(/\u00a0/g, ' ')).toBe('R$ 222 em 1 campanha sem nenhum resultado.');
  });

  it('sem desperdício, a frase aponta a concentração que precisa de revisão', () => {
    const mapa = mapearVerba([
      c({ id: '1', spend: 600, results: 24, cost_per_result: 25 }),
      c({ id: '2', spend: 400, results: 4, cost_per_result: 100 }),
    ]);
    expect(mapa.frase).toContain('para revisar');
  });

  it('quando está tudo bem, a frase é curta — ou não existe', () => {
    const mapa = mapearVerba([
      c({ id: '1', spend: 1000, results: 50, cost_per_result: 20 }),
      c({ id: '2', spend: 1000, results: 50, cost_per_result: 20 }),
    ]);
    expect(mapa.frase).toBe('100% da verba está no que performa acima da média.');
  });

  it('tela sem gasto não diz nada em vez de dizer zero', () => {
    expect(mapearVerba([]).frase).toBeNull();
    expect(mapearVerba([]).total).toBe(0);
  });

  it('nunca lança com número estranho', () => {
    for (const ruim of [{ spend: NaN }, { results: -5 }, { cost_per_result: Infinity }]) {
      expect(() => mapearVerba([c(ruim as any)])).not.toThrow();
    }
  });
});
