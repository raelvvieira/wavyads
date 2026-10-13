import { describe, expect, it } from 'vitest';
import { aRecuperarSozinho, estadoDaImagem, TETO_DE_RECUPERACAO_AUTOMATICA } from './imagemDaArte';

const arte = (p: any = {}) => ({ id: 'a', status: 'ready', url: 'https://x/a.png', ...p });

describe('estadoDaImagem', () => {
  it('arte pronta COM endereço desenha a imagem', () => {
    expect(estadoDaImagem(arte())).toBe('pronta');
  });

  it('arte pronta SEM endereço tem estado próprio — não é um branco mudo', () => {
    // Era o quarto caso que não era estado nenhum: os três ramos do card
    // não acendiam e sobrava um retângulo branco com um rótulo embaixo.
    expect(estadoDaImagem(arte({ url: null }))).toBe('sem_endereco');
    expect(estadoDaImagem(arte({ url: '' }))).toBe('sem_endereco');
  });

  it('gerando e na fila continuam sendo trabalho em curso', () => {
    // Elas também não têm url, e confundi-las com "sem endereço" trocaria o
    // spinner por um botão de recuperar uma arte que ainda está nascendo.
    expect(estadoDaImagem(arte({ status: 'generating', url: null }))).toBe('trabalhando');
    expect(estadoDaImagem(arte({ status: 'queued', url: null }))).toBe('trabalhando');
  });

  it('falha vence a ausência de endereço — o motivo é mais útil que o botão', () => {
    expect(estadoDaImagem(arte({ status: 'failed', url: null }))).toBe('falhou');
  });
});

describe('aRecuperarSozinho', () => {
  it('pega só as sem endereço, na ordem da tela', () => {
    const lista = [
      arte({ id: '1' }),
      arte({ id: '2', url: null }),
      arte({ id: '3', status: 'generating', url: null }),
      arte({ id: '4', url: null }),
    ];
    expect(aRecuperarSozinho(lista, new Set())).toEqual(['2', '4']);
  });

  it('respeita o teto — buscar todas de uma vez travaria a tela', () => {
    // Cada recuperação traz a linha inteira, e numa arte em base64 isso são
    // megabytes. Vinte artes sem endereço não podem virar vinte downloads.
    const muitas = Array.from({ length: 30 }, (_, i) => arte({ id: `a${i}`, url: null }));
    expect(aRecuperarSozinho(muitas, new Set())).toHaveLength(TETO_DE_RECUPERACAO_AUTOMATICA);
  });

  it('o teto é ORÇAMENTO total, não cota por passada', () => {
    // Cada recuperação muda a lista, a lista dispara outra passada, e sem
    // orçamento a passada seguinte pegaria os doze SEGUINTES — num acervo
    // de trezentas sem endereço, as trezentas acabariam baixadas.
    const muitas = Array.from({ length: 30 }, (_, i) => arte({ id: `a${i}`, url: null }));
    const pedidos = new Set(muitas.slice(0, TETO_DE_RECUPERACAO_AUTOMATICA).map((a) => a.id));
    expect(aRecuperarSozinho(muitas, pedidos)).toEqual([]);

    // E com o orçamento pela metade, só a metade entra.
    const metade = new Set(muitas.slice(0, TETO_DE_RECUPERACAO_AUTOMATICA - 3).map((a) => a.id));
    expect(aRecuperarSozinho(muitas, metade)).toHaveLength(3);
  });

  it('não pede duas vezes a mesma arte', () => {
    // Sem esta memória a tela entraria em laço: a lista muda a cada
    // geração, e cada render pediria de novo o que já foi pedido.
    const lista = [arte({ id: '1', url: null }), arte({ id: '2', url: null })];
    expect(aRecuperarSozinho(lista, new Set(['1']))).toEqual(['2']);
    expect(aRecuperarSozinho(lista, new Set(['1', '2']))).toEqual([]);
  });

  it('acervo sem buracos não pede nada', () => {
    expect(aRecuperarSozinho([arte({ id: '1' }), arte({ id: '2' })], new Set())).toEqual([]);
  });
});
