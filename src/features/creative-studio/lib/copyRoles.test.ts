import { describe, expect, it } from 'vitest';
import { joinRoles, rolesArePartitionOf } from './copyRoles';

// A copy real do caso que originou esta mudança — duas linhas escritas à
// mão, sem label e sem CTA.
const COPY = 'Diga adeus aos dentes amarelados\nLimpeza e Clareamento com condições especiais no combo';

describe('rolesArePartitionOf', () => {
  it('aceita a distribuição que só reparte o texto em papéis', () => {
    expect(rolesArePartitionOf({
      titulo: 'Diga adeus aos dentes amarelados',
      subtitulo: 'Limpeza e Clareamento com condições especiais no combo',
    }, COPY)).toBe(true);
  });

  it('aceita quebrar UMA linha em título e subtítulo — é distribuir, não reescrever', () => {
    // É assim que a hierarquia nasce: o que o usuário escreveu como uma
    // frase vira dominante + apoio. Nenhuma palavra mudou.
    expect(rolesArePartitionOf({
      titulo: 'Diga adeus',
      subtitulo: 'aos dentes amarelados Limpeza e Clareamento com condições especiais no combo',
    }, COPY)).toBe(true);
  });

  it('recusa quando o modelo reescreve uma palavra', () => {
    expect(rolesArePartitionOf({
      titulo: 'Diga adeus aos dentes amarelos',
      subtitulo: 'Limpeza e Clareamento com condições especiais no combo',
    }, COPY)).toBe(false);
  });

  it('recusa quando o modelo inventa um CTA que o usuário não escreveu', () => {
    // O caso que mais importa: a arte ganharia um botão com texto que nunca
    // existiu, e ninguém veria a diferença até ela estar pronta.
    expect(rolesArePartitionOf({
      titulo: 'Diga adeus aos dentes amarelados',
      subtitulo: 'Limpeza e Clareamento com condições especiais no combo',
      cta: 'Agende sua avaliação',
    }, COPY)).toBe(false);
  });

  it('recusa quando um trecho se perde no caminho', () => {
    expect(rolesArePartitionOf({
      titulo: 'Diga adeus aos dentes amarelados',
    }, COPY)).toBe(false);
  });

  it('recusa quando falta o título — sem dominante não há hierarquia', () => {
    expect(rolesArePartitionOf({
      subtitulo: 'Diga adeus aos dentes amarelados Limpeza e Clareamento com condições especiais no combo',
    }, COPY)).toBe(false);
  });

  it('recusa papéis ausentes ou texto vazio', () => {
    expect(rolesArePartitionOf(null, COPY)).toBe(false);
    expect(rolesArePartitionOf({ titulo: 'algo' }, '   ')).toBe(false);
  });

  it('ignora diferença de espaço e quebra de linha, que é o que distribuir muda', () => {
    expect(rolesArePartitionOf({
      titulo: '  Diga adeus  aos dentes amarelados ',
      subtitulo: 'Limpeza e Clareamento\ncom condições especiais no combo',
    }, COPY)).toBe(true);
  });

  it('não ignora troca de caixa — trocar a palavra é reescrever', () => {
    expect(rolesArePartitionOf({
      titulo: 'DIGA ADEUS AOS DENTES AMARELADOS',
      subtitulo: 'Limpeza e Clareamento com condições especiais no combo',
    }, COPY)).toBe(false);
  });
});

describe('joinRoles', () => {
  it('lê os papéis na ordem em que aparecem na arte', () => {
    expect(joinRoles({
      cta: 'Agende',
      titulo: 'Título',
      label: 'LABEL',
      subtitulo: 'Apoio',
      dados: 'R$ 99',
    })).toBe('LABEL Título Apoio R$ 99 Agende');
  });

  it('pula papel vazio sem deixar espaço duplo', () => {
    expect(joinRoles({ titulo: 'Título', subtitulo: '  ', cta: 'Agende' })).toBe('Título Agende');
  });
});
