import { describe, expect, it } from 'vitest';
import {
  notaDoCriativo, referenciaDaConta, resumoDasNotas, PESOS, RESULTADOS_PARA_CONFIANCA,
} from './notaDoCriativo';

const REF = { custoPorResultado: 50, ctr: 2, holdRate: 30 };
const ad = (p: any = {}) => ({
  spend: 1000, results: 20, cost_per_result: 50, ctr: 2, hook_rate: 25, hold_rate: 30, ...p,
});

describe('notaDoCriativo', () => {
  it('na média da conta em tudo, a nota é 50', () => {
    // O meio da régua precisa cair no meio da escala, ou nenhum número
    // acima ou abaixo dela significa o que parece.
    expect(notaDoCriativo(ad(), REF).nota).toBe(50);
  });

  it('metade do custo e o dobro do CTR levam a nota ao topo', () => {
    const n = notaDoCriativo(ad({ cost_per_result: 25, ctr: 4, hold_rate: 60 }), REF);
    expect(n.nota).toBe(100);
    expect(n.veredito).toBe('escalar');
  });

  it('gastar sem trazer nada não ganha nota ruim — ganha "Parar"', () => {
    // É o mesmo princípio das faixas de verba: não é "ficou caro", é "não
    // voltou". Uma nota baixa sugeriria que existe um número a melhorar.
    const n = notaDoCriativo(ad({ spend: 300, results: 0, cost_per_result: 0 }), REF);
    expect(n.nota).toBe(0);
    expect(n.rotulo).toBe('Parar');
  });

  it('amostra pequena puxa a nota para o meio, e marca', () => {
    // Sem isto, um criativo com dois resultados baratos lidera o ranking e
    // o cliente escala ruído.
    const otimo = { cost_per_result: 25, ctr: 4, hold_rate: 60 };
    const confiante = notaDoCriativo(ad({ ...otimo, results: RESULTADOS_PARA_CONFIANCA }), REF);
    const incerto = notaDoCriativo(ad({ ...otimo, results: 2 }), REF);

    expect(confiante.nota).toBe(100);
    expect(incerto.nota).toBeLessThan(confiante.nota);
    expect(incerto.nota).toBeGreaterThan(50); // continua acima do meio, só menos confiante
    expect(incerto.poucoDado).toBe(true);
    expect(confiante.poucoDado).toBe(false);
  });

  it('imagem não é punida por não ter métrica de vídeo', () => {
    // O peso da retenção é redistribuído entre as outras duas, na proporção
    // em que já estão.
    const imagem = notaDoCriativo(ad({ hook_rate: 0, hold_rate: 0 }), REF);
    expect(imagem.nota).toBe(50);
    expect(imagem.parciais.map((p) => p.chave)).toEqual(['eficiencia', 'atracao']);
    expect(imagem.parciais.reduce((s, p) => s + p.peso, 0)).toBe(100);
  });

  it('os pesos vão JUNTO com a nota — é o que a torna contestável', () => {
    // A plataforma do benchmark esconde a fórmula. Uma nota que ninguém
    // pode conferir é uma nota em que ninguém confia na primeira vez que
    // ela discordar do faro do gestor.
    const n = notaDoCriativo(ad(), REF);
    expect(n.parciais).toHaveLength(3);
    expect(n.parciais.find((p) => p.chave === 'eficiencia')!.peso).toBe(PESOS.eficiencia);
    expect(n.resultados).toBe(20);
  });

  it('eficiência pesa mais que o resto somado', () => {
    // Um criativo que prende a atenção e custa o dobro continua sendo caro.
    const caroEBonito = notaDoCriativo(ad({ cost_per_result: 100, ctr: 4, hold_rate: 60 }), REF);
    const baratoEFeio = notaDoCriativo(ad({ cost_per_result: 25, ctr: 1, hold_rate: 10 }), REF);
    expect(baratoEFeio.nota).toBeGreaterThan(caroEBonito.nota);
  });

  it('sem régua possível, não inventa veredito', () => {
    const n = notaDoCriativo(ad(), { custoPorResultado: 0, ctr: 0, holdRate: 0 });
    expect(n.nota).toBe(50);
    expect(n.veredito).toBe('observar');
  });

  it('nunca lança com número estranho', () => {
    for (const ruim of [{ ctr: NaN }, { cost_per_result: Infinity }, { results: -3 }, { spend: null }]) {
      expect(() => notaDoCriativo(ad(ruim), REF)).not.toThrow();
    }
  });
});

describe('referenciaDaConta', () => {
  it('o custo é o da CONTA; CTR e retenção são média por peça', () => {
    // Custo responde "para onde foi o dinheiro" e precisa ser ponderado.
    // CTR responde "este criativo prende mais atenção que os outros", e aí
    // cada peça vale uma, independente da verba que recebeu.
    const ref = referenciaDaConta([
      ad({ spend: 9000, results: 180, cost_per_result: 50, ctr: 1 }),
      ad({ spend: 100, results: 20, cost_per_result: 5, ctr: 5 }),
    ]);
    expect(ref.custoPorResultado).toBeCloseTo(9100 / 200, 2);
    expect(ref.ctr).toBe(3);
  });

  it('conta sem resultado não produz régua de custo', () => {
    const ref = referenciaDaConta([ad({ results: 0, cost_per_result: 0 })]);
    expect(ref.custoPorResultado).toBe(0);
  });

  it('anúncio sem vídeo não entra na média de retenção', () => {
    const ref = referenciaDaConta([ad({ hold_rate: 60 }), ad({ hold_rate: 0 })]);
    expect(ref.holdRate).toBe(60);
  });
});

describe('resumoDasNotas', () => {
  it('conta os dois extremos que pedem ação', () => {
    const notas = [
      notaDoCriativo(ad({ cost_per_result: 20, ctr: 4, hold_rate: 60 }), REF),
      notaDoCriativo(ad({ spend: 300, results: 0 }), REF),
      notaDoCriativo(ad(), REF),
    ];
    const r = resumoDasNotas(notas);
    expect(r.total).toBe(3);
    expect(r.escalar).toBe(1);
    expect(r.parar).toBe(1);
  });

  it('galeria vazia não produz média falsa', () => {
    expect(resumoDasNotas([])).toEqual({ media: 0, escalar: 0, parar: 0, total: 0 });
  });
});
