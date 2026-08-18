import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  isCreativeStudioCanvasV2,
  setCreativeStudioCanvasV2,
  STUDIO_V2_STORAGE_KEY,
} from './featureFlags';

describe('flag creativeStudioCanvasV2', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllEnvs();
  });

  it('vem desligada por padrão', () => {
    // Enquanto a V2 não cumprir os critérios de aceite, quem não pediu
    // explicitamente continua no fluxo que funciona.
    expect(isCreativeStudioCanvasV2('')).toBe(false);
  });

  it('liga pelo ambiente', () => {
    vi.stubEnv('VITE_STUDIO_CANVAS_V2', 'true');
    expect(isCreativeStudioCanvasV2('')).toBe(true);
  });

  it('a escolha no aparelho vence o ambiente', () => {
    vi.stubEnv('VITE_STUDIO_CANVAS_V2', 'true');
    setCreativeStudioCanvasV2(false);
    expect(isCreativeStudioCanvasV2('')).toBe(false);
  });

  it('a URL vence tudo — é o caminho de rollback imediato', () => {
    vi.stubEnv('VITE_STUDIO_CANVAS_V2', 'true');
    setCreativeStudioCanvasV2(true);
    expect(isCreativeStudioCanvasV2('?studioV2=off')).toBe(false);
    expect(isCreativeStudioCanvasV2('?studioV2=on')).toBe(true);
  });

  it('valor desconhecido na URL não decide nada', () => {
    setCreativeStudioCanvasV2(true);
    expect(isCreativeStudioCanvasV2('?studioV2=talvez')).toBe(true);
  });

  it('limpar volta ao padrão do ambiente', () => {
    setCreativeStudioCanvasV2(true);
    setCreativeStudioCanvasV2(null);
    expect(localStorage.getItem(STUDIO_V2_STORAGE_KEY)).toBeNull();
    expect(isCreativeStudioCanvasV2('')).toBe(false);
  });

  it('não quebra com armazenamento bloqueado', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(() => isCreativeStudioCanvasV2('')).not.toThrow();
    expect(isCreativeStudioCanvasV2('')).toBe(false);
    getItem.mockRestore();
  });
});
