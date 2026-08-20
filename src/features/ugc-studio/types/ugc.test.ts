import { describe, expect, it } from 'vitest';
import {
  BROLL_ANGLES, brollAngle, countWords, estimatedCredits, wordBudget,
} from './ugc';

describe('orçamento de palavras', () => {
  it('cresce com a duração — é o que amarra a fala ao tempo do clipe', () => {
    // O vídeo tem duração FIXA. Fala curta demais deixa silêncio que o modelo
    // preenche com balbucio; longa demais é cortada no meio da frase.
    expect(wordBudget(4)).toBeLessThan(wordBudget(8));
    expect(wordBudget(8)).toBe(22);
  });

  it('conta palavras ignorando espaço extra, e trata vazio como zero', () => {
    expect(countWords('  meu   vizinho via tudo  ')).toBe(4);
    expect(countWords('   ')).toBe(0);
  });
});

describe('custo estimado', () => {
  it('avatar falando custa várias vezes um clipe de produto', () => {
    // A assimetria é o que justifica orientar o usuário a deixar o B-roll
    // cobrir a maior parte do anúncio. Se ela sumir, a orientação vira
    // superstição.
    const avatar = estimatedCredits('avatar', 8, '1080p');
    const broll = estimatedCredits('broll', 8, '1080p');
    expect(avatar).toBeGreaterThan(broll * 3);
  });

  it('4K custa mais que 720p na mesma duração', () => {
    expect(estimatedCredits('broll', 5, '4K')).toBeGreaterThan(estimatedCredits('broll', 5, '720p'));
  });
});

describe('presets de ângulo', () => {
  it('são oito, cada um com instrução própria de câmera', () => {
    expect(BROLL_ANGLES).toHaveLength(8);
    const fragmentos = new Set(BROLL_ANGLES.map((a) => a.promptFragment));
    // Fragmentos repetidos gerariam clipes iguais com nomes diferentes.
    expect(fragmentos.size).toBe(8);
  });

  it('busca por id devolve o preset, e id desconhecido devolve nulo', () => {
    expect(brollAngle('night_moody')?.label).toBe('Noturno');
    expect(brollAngle('inexistente')).toBeNull();
  });
});
