import { describe, expect, it } from 'vitest';
import { creativesCardState } from './creativesCardState';

const base = { carregando: false, erro: null, anuncios: [] as unknown[], tokenInvalido: false };

describe('creativesCardState', () => {
  it('lista vazia MOSTRA o card, em vez de sumir', () => {
    // O bug relatado: o card simplesmente não aparecia, e o cliente não
    // tinha como saber se não havia criativos ou se algo falhou.
    expect(creativesCardState({ ...base, anuncios: [] })).toEqual({ kind: 'lista' });
  });

  it('erro vira mensagem, e não silêncio', () => {
    // O erro da consulta de anúncios nunca chegava à tela: era lido apenas
    // para detectar token inválido, e qualquer outro caía no vazio.
    expect(creativesCardState({ ...base, erro: new Error('Cliente não sincronizado com Meta') }))
      .toEqual({ kind: 'erro', mensagem: 'Cliente não sincronizado com Meta' });
  });

  it('erro sem mensagem legível ainda diz que falhou', () => {
    expect(creativesCardState({ ...base, erro: {}, anuncios: undefined }))
      .toEqual({ kind: 'erro', mensagem: 'Não foi possível carregar os criativos.' });
    expect(creativesCardState({ ...base, erro: new Error('   ') }))
      .toEqual({ kind: 'erro', mensagem: 'Não foi possível carregar os criativos.' });
  });

  it('carregando ganha esqueleto, não card vazio', () => {
    expect(creativesCardState({ ...base, carregando: true, anuncios: undefined }))
      .toEqual({ kind: 'carregando' });
  });

  it('carregando vence o erro anterior — a nova tentativa está em curso', () => {
    expect(creativesCardState({ ...base, carregando: true, erro: new Error('x') }))
      .toEqual({ kind: 'carregando' });
  });

  it('token inválido cala o card: o aviso de reconectar já está no topo', () => {
    // Dois alarmes para o mesmo problema fazem o usuário ignorar os dois.
    expect(creativesCardState({ ...base, tokenInvalido: true, erro: new Error('MetaTokenInvalid') }))
      .toEqual({ kind: 'oculto' });
    expect(creativesCardState({ ...base, tokenInvalido: true, carregando: true }))
      .toEqual({ kind: 'oculto' });
  });

  it('nunca devolve nada — todo caminho tem um estado nomeado', () => {
    // A regressão original foi exatamente um caminho sem estado: o `: null`
    // no fim do ternário.
    const casos = [
      base,
      { ...base, carregando: true },
      { ...base, erro: new Error('x') },
      { ...base, anuncios: undefined },
      { ...base, tokenInvalido: true },
    ];
    for (const caso of casos) {
      expect(creativesCardState(caso).kind).toBeTruthy();
    }
  });
});
