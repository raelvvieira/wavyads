import { describe, expect, it } from 'vitest';
import { ESTILOS_GENOMA, lerEstiloGenoma } from './estiloGenoma';

describe('estiloGenoma', () => {
  it('traz os 16 estilos de estética, com id único', () => {
    expect(ESTILOS_GENOMA).toHaveLength(16);
    expect(new Set(ESTILOS_GENOMA.map((e) => e.id)).size).toBe(16);
  });

  it('monta o documento com a base, o template e o layout', () => {
    const leitura = lerEstiloGenoma('palavra-gigante-close');
    expect(leitura).not.toBeNull();
    expect(leitura!.designSystemDoc).toContain('PHOTO REALISM');
    expect(leitura!.designSystemDoc).toContain('TEMPLATE · Anúncio · Palavra gigante no close');
    expect(leitura!.designSystemFromReference).toBe(false);
    expect(leitura!.antiPadroes?.some((r) => r.includes('before/after'))).toBe(true);
    expect(leitura!.mood?.adjetivos.length).toBeGreaterThan(0);
    expect(leitura!.nome).toBe('Genoma · Anúncio · Palavra gigante no close');
  });

  it('id desconhecido não vira estilo vazio', () => {
    expect(lerEstiloGenoma('nao-existe')).toBeNull();
    expect(lerEstiloGenoma(null)).toBeNull();
  });
});
