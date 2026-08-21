import { describe, expect, it, vi, beforeEach } from 'vitest';

const invoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...a: any[]) => invoke(...a) } },
}));

const { writeUgcScript } = await import('./ugcScript');

const COMPLETO = { hook: 'a', body_1: 'b', body_2: 'c', cta: 'd' };

beforeEach(() => vi.clearAllMocks());

describe('writeUgcScript', () => {
  it('manda a descrição e a duração, e devolve os quatro segmentos', async () => {
    invoke.mockResolvedValue({ data: { script: COMPLETO, wordBudget: 22 }, error: null });

    const r = await writeUgcScript({ productDescription: 'película de janela', durationSeconds: 8 });

    expect(invoke).toHaveBeenCalledWith('ugc-script', expect.objectContaining({
      body: expect.objectContaining({ productDescription: 'película de janela', durationSeconds: 8 }),
    }));
    expect(r.script).toEqual(COMPLETO);
    expect(r.wordBudget).toBe(22);
  });

  it('recusa roteiro pela metade em vez de entregar campos vazios', async () => {
    // Meio roteiro na tela deixaria o usuário sem saber se o modelo desistiu
    // ou se ele mesmo esqueceu de escrever.
    invoke.mockResolvedValue({ data: { script: { hook: 'a', body_1: '', body_2: 'c', cta: '' } }, error: null });

    await expect(writeUgcScript({ productDescription: 'x', durationSeconds: 8 }))
      .rejects.toThrow(/incompleto/);
  });

  it('segmento só com espaço em branco conta como ausente', async () => {
    invoke.mockResolvedValue({ data: { script: { ...COMPLETO, cta: '   ' } }, error: null });
    await expect(writeUgcScript({ productDescription: 'x', durationSeconds: 8 }))
      .rejects.toThrow(/incompleto/);
  });

  it('propaga o erro de negócio devolvido no corpo', async () => {
    invoke.mockResolvedValue({ data: { error: 'Limite de uso da IA atingido.' }, error: null });
    await expect(writeUgcScript({ productDescription: 'x', durationSeconds: 8 }))
      .rejects.toThrow('Limite de uso da IA atingido.');
  });
});
