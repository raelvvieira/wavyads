import { describe, expect, it } from 'vitest';
import { unidadeDoResultado, pluralDoResultado } from './unidadeDoResultado';

describe('unidadeDoResultado', () => {
  it('o rótulo longo da tabela vira um substantivo que cabe numa frase', () => {
    // "R$ 11,18 por conversas por mensagem iniciadas na média da conta"
    // apareceu assim na tela. Cabeçalho de coluna e frase são trabalhos
    // diferentes.
    expect(unidadeDoResultado('onsite_conversion.messaging_conversation_started_7d')).toBe('conversa');
    expect(unidadeDoResultado('landing_page_view')).toBe('visita');
  });

  it('os tipos equivalentes caem no mesmo substantivo', () => {
    // Três jeitos de a Meta dizer "lead" não podem virar três palavras
    // diferentes na mesma tela.
    for (const t of ['lead', 'offsite_conversion.fb_pixel_lead', 'onsite_conversion.lead_grouped']) {
      expect(unidadeDoResultado(t), t).toBe('lead');
    }
    for (const t of ['purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase']) {
      expect(unidadeDoResultado(t), t).toBe('compra');
    }
  });

  it('tipo desconhecido vira "resultado", não o identificador cru', () => {
    // Genérico e correto vence específico e incompreensível.
    expect(unidadeDoResultado('offsite_conversion.custom.98271')).toBe('resultado');
    expect(unidadeDoResultado(null)).toBe('resultado');
    expect(unidadeDoResultado('')).toBe('resultado');
  });
});

describe('pluralDoResultado', () => {
  it('uma unidade fica no singular', () => {
    expect(pluralDoResultado('lead', 1)).toBe('lead');
  });

  it('o plural de ão é ões, não ãos', () => {
    expect(pluralDoResultado('video_view', 3)).toBe('visualizações');
  });

  it('o resto ganha s', () => {
    expect(pluralDoResultado('purchase', 2)).toBe('compras');
    expect(pluralDoResultado('nada_conhecido', 0)).toBe('resultados');
  });
});
