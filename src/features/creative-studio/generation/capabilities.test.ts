import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  IMAGE_EDIT_MODEL,
  IMAGE_GENERATION_MODEL,
  KNOWN_CAPABILITY_GAPS,
  canGenerateRatio,
  describeGeneration,
  findCapability,
} from './capabilities';

const GERADOR = readFileSync('supabase/functions/criativo-generate/index.ts', 'utf8');
const EDITOR = readFileSync('supabase/functions/criativo-edit-image/index.ts', 'utf8');

describe('o contrato bate com o backend', () => {
  it('o modelo declarado é o que a function usa', () => {
    // Se alguém trocar o modelo na edge function e esquecer daqui, o
    // contrato vira ficção — que é justamente o problema que ele resolve.
    expect(GERADOR).toContain(`MODEL_NAME = "${IMAGE_GENERATION_MODEL.id}"`);
    expect(EDITOR).toContain(`GEMINI_MODEL = "${IMAGE_EDIT_MODEL.id}"`);
  });

  it('gerar e editar usam provedores diferentes', () => {
    // Não é detalhe: é candidato a explicar divergência de estilo entre a
    // arte original e a editada.
    expect(IMAGE_GENERATION_MODEL.provider).toBe('evolink');
    expect(IMAGE_EDIT_MODEL.provider).toBe('gemini');
  });

  it('todo formato declarado existe no mapa do gerador', () => {
    const naFunction = new Set([...GERADOR.matchAll(/"(\d+:\d+)":\s*\{\s*label/g)].map((m) => m[1]));
    expect(IMAGE_GENERATION_MODEL.ratios.filter((r) => !naFunction.has(r))).toEqual([]);
  });

  it('não declara resolução como parâmetro', () => {
    // Enquanto 1K/2K/4K forem texto de prompt, declarar aqui repetiria a
    // promessa falsa da interface num lugar novo.
    expect(IMAGE_GENERATION_MODEL.resolutions).toEqual([]);
    expect(IMAGE_EDIT_MODEL.resolutions).toEqual([]);
  });

  it('só o editor declara suporte a edição', () => {
    expect(IMAGE_GENERATION_MODEL.supportsEditing).toBe(false);
    expect(IMAGE_EDIT_MODEL.supportsEditing).toBe(true);
  });
});

describe('divergências conhecidas', () => {
  it('a resolução ainda é texto de prompt', () => {
    // Quando o parâmetro virar real, este teste falha e obriga a remover a
    // entrada da lista — é assim que a lista não vira folclore.
    expect(GERADOR).not.toMatch(/resolution:\s*mapResolution/);
    expect(KNOWN_CAPABILITY_GAPS.map((g) => g.id)).toContain('resolution-is-prompt-text');
  });

  it('cada divergência aponta a fase que a corrige', () => {
    expect(KNOWN_CAPABILITY_GAPS.every((g) => g.faseDeCorrecao > 0)).toBe(true);
    expect(new Set(KNOWN_CAPABILITY_GAPS.map((g) => g.id)).size).toBe(KNOWN_CAPABILITY_GAPS.length);
  });
});

describe('describeGeneration', () => {
  it('mostra o modelo real, não o do seletor', () => {
    expect(describeGeneration({ ratio: '4:5' })).toBe('GPT Image 2 · 4:5');
  });

  it('só cita quantidade quando é mais de uma', () => {
    expect(describeGeneration({ ratio: '1:1', quantity: 1 })).toBe('GPT Image 2 · 1:1');
    expect(describeGeneration({ ratio: '1:1', quantity: 4 })).toBe('GPT Image 2 · 1:1 · 4 imagens');
  });
});

describe('findCapability e canGenerateRatio', () => {
  it('encontra por id', () => {
    expect(findCapability('gpt-image-2')?.provider).toBe('evolink');
    expect(findCapability('inexistente')).toBeNull();
  });

  it('aceita os nove formatos do produto', () => {
    for (const r of ['1:1', '4:5', '9:16', '16:9', '4:3', '3:4', '2:3', '3:2', '21:9'] as const) {
      expect(canGenerateRatio(r)).toBe(true);
    }
  });
});
