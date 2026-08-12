import { describe, expect, it } from 'vitest';
import { SAFE_AREAS, safeAreaFor, safeRect, typeScaleFor, verticalLift } from './safeArea';
import type { CreativeAspectRatio } from '../types/creative';

describe('safeRect', () => {
  it('reproduz o retângulo seguro publicado pela Meta para 9:16', () => {
    // 14% de 1920 = 269, 35% de 1920 = 672 (logo y1 = 1248), 6% de 1080 = 65.
    const rect = safeRect(SAFE_AREAS['9:16']);
    expect(rect.x0).toBe(65);
    expect(rect.x1).toBe(1015);
    expect(rect.y0).toBe(269);
    expect(rect.y1).toBe(1248);
    expect(rect.width).toBe(950);
    expect(rect.height).toBe(979);
  });

  it('deriva 100px em todas as bordas para 1:1', () => {
    const rect = safeRect(SAFE_AREAS['1:1']);
    expect(rect.x0).toBe(100);
    expect(rect.y0).toBe(100);
    expect(rect.x1).toBe(980);
    expect(rect.y1).toBe(980);
  });

  it('deriva 250px de topo/base para 4:5', () => {
    const rect = safeRect(SAFE_AREAS['4:5']);
    expect(rect.y0).toBe(250);
    expect(rect.y1).toBe(1100); // 1350 - 250
    expect(rect.x0).toBe(100);
  });
});

describe('verticalLift', () => {
  it('mede o quanto o 9:16 precisa subir', () => {
    // Área segura vai de 269 a 1248, centro em 758,5; centro do canvas é 960.
    // Sem essa correção, tudo que o modelo centraliza no frame nasce ~200px
    // baixo demais e é coberto pela interface da Meta.
    expect(verticalLift(SAFE_AREAS['9:16'])).toBe(202);
  });

  it('é zero quando a zona é simétrica', () => {
    expect(verticalLift(SAFE_AREAS['1:1'])).toBe(0);
    expect(verticalLift(SAFE_AREAS['4:5'])).toBe(0);
    expect(verticalLift(SAFE_AREAS['16:9'])).toBe(0);
  });
});

describe('SAFE_AREAS', () => {
  const ratios: CreativeAspectRatio[] = ['1:1', '4:5', '9:16', '16:9', '4:3', '3:4', '2:3', '3:2', '21:9'];

  it('cobre todos os formatos oferecidos no app', () => {
    for (const ratio of ratios) expect(SAFE_AREAS[ratio]).toBeDefined();
  });

  it('só marca como Meta o formato que a Meta realmente publica', () => {
    // Tratar número derivado como se fosse regra da plataforma é o tipo de
    // coisa que vira "a Meta exige" numa conversa com cliente.
    const daMeta = ratios.filter((r) => SAFE_AREAS[r].source === 'meta');
    expect(daMeta).toEqual(['9:16']);
  });

  it('mantém a área segura dentro do canvas em todo formato', () => {
    for (const ratio of ratios) {
      const rect = safeRect(SAFE_AREAS[ratio]);
      expect(rect.width).toBeGreaterThan(0);
      expect(rect.height).toBeGreaterThan(0);
      expect(rect.x0).toBeGreaterThanOrEqual(0);
      expect(rect.y1).toBeLessThanOrEqual(SAFE_AREAS[ratio].canvas.height);
    }
  });

  it('descreve uma tela que realmente tem a proporção do nome', () => {
    // Foi exatamente esta classe de erro que fez as margens não aparecerem na
    // arte: as porcentagens eram calculadas para uma tela e a geração era
    // pedida em outra. Se o canvas de '4:5' não for 4/5, a conta inteira que
    // sai no prompt está descrevendo um quadro que não existe.
    // Acumular e comparar a lista inteira faz a falha dizer QUAL formato está
    // errado e por quanto, em vez de parar no primeiro com dois números soltos.
    const divergentes = ratios
      .map((ratio) => {
        const [w, h] = ratio.split(':').map(Number);
        const { canvas } = SAFE_AREAS[ratio];
        const real = canvas.width / canvas.height;
        const esperado = w / h;
        return Math.abs(real - esperado) > 0.01
          ? `${ratio}: canvas ${canvas.width}x${canvas.height} dá ${real.toFixed(3)}, esperado ${esperado.toFixed(3)}`
          : null;
      })
      .filter(Boolean);

    expect(divergentes).toEqual([]);
  });

  it('reserva folga extra no canto inferior direito só do 9:16', () => {
    // É onde curtir/comentar/compartilhar/áudio se empilham.
    expect(SAFE_AREAS['9:16'].bottomRightPct).toBe(40);
    expect(SAFE_AREAS['1:1'].bottomRightPct).toBeUndefined();
  });
});

describe('safeAreaFor', () => {
  it('cai num padrão seguro quando o formato é desconhecido ou ausente', () => {
    expect(safeAreaFor(null)).toBe(SAFE_AREAS['1:1']);
    expect(safeAreaFor(undefined)).toBe(SAFE_AREAS['1:1']);
    expect(safeAreaFor('formato-inexistente' as CreativeAspectRatio)).toBe(SAFE_AREAS['1:1']);
  });
});

describe('typeScaleFor', () => {
  it('ancora os mínimos em 1080px de largura', () => {
    const scale = typeScaleFor(SAFE_AREAS['9:16']);
    expect(scale.headlineMin).toBe(64);
    expect(scale.bodyMin).toBe(28);
  });

  it('escala junto com um canvas mais largo', () => {
    // 16:9 tem canvas de 1920px de largura, então os mínimos sobem na mesma
    // proporção: 64 × (1920/1080) = 114. Proporcionalmente é o mesmo tamanho
    // que 64px num canvas de 1080 — é disso que o mínimo trata.
    const scale = typeScaleFor(SAFE_AREAS['16:9']);
    expect(scale.headlineMin).toBe(114);
  });
});
