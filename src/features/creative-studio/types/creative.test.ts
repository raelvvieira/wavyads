import { describe, expect, it } from 'vitest';
import { normalizeFactorAxis } from './creative';

describe('normalizeFactorAxis', () => {
  // O CHECK do banco só aceita os valores canônicos: se a normalização falhar,
  // o eixo é perdido silenciosamente (grava null) em vez de estourar.
  it('mapeia os cinco eixos escritos em português', () => {
    expect(normalizeFactorAxis('Emocional')).toBe('emotional');
    expect(normalizeFactorAxis('Oferta')).toBe('offer');
    expect(normalizeFactorAxis('Persona')).toBe('persona');
    expect(normalizeFactorAxis('Hook')).toBe('hook');
    expect(normalizeFactorAxis('Estrutura')).toBe('structure');
  });

  it('ignora acentos e caixa', () => {
    expect(normalizeFactorAxis('emoção')).toBe('emotional');
    expect(normalizeFactorAxis('PÚBLICO')).toBe('persona');
    expect(normalizeFactorAxis('  gancho ')).toBe('hook');
  });

  it('devolve null para valor desconhecido ou ausente', () => {
    expect(normalizeFactorAxis('xyz')).toBeNull();
    expect(normalizeFactorAxis(undefined)).toBeNull();
    expect(normalizeFactorAxis('')).toBeNull();
  });
});
