import { describe, expect, it } from 'vitest';
import { lerIntencao, rotearPedido } from './intencao';

describe('lerIntencao', () => {
  it('lê o pedido que virou uma edição por engano', () => {
    // "quero mais 2 criativos de COMBO: Limpeza + Clareamento com imagem de
    // antes e depois, pra dra mariane" saiu como EDIÇÃO da arte selecionada:
    // o texto inteiro virou `metadata.feedback`.
    const r = lerIntencao('quero mais 2 criativos de COMBO: Limpeza + Clareamento pra dra mariane');
    expect(r.intencao).toBe('criar');
  });

  it('verbo de edição vence a quantidade — ele conta o alvo, não a saída', () => {
    // "troca o fundo nas 2 artes": o "2 artes" são as que já existem. Deixar
    // a quantidade decidir aqui criaria duas peças novas no lugar de alterar
    // as que o usuário está olhando.
    expect(lerIntencao('troca o fundo nas 2 artes').intencao).toBe('editar');
    expect(lerIntencao('tira as 2 pessoas do fundo').intencao).toBe('editar');
  });

  it('nomear uma saída contável já é pedir produção, mesmo sem verbo', () => {
    expect(lerIntencao('2 criativos de clareamento').intencao).toBe('criar');
    expect(lerIntencao('mais uma arte pro natal').intencao).toBe('criar');
  });

  it('as marcas fracas de criação decidem por último', () => {
    expect(lerIntencao('faz uma peça de lançamento').intencao).toBe('criar');
    expect(lerIntencao('quero algo mais sóbrio').intencao).toBe('criar');
    // "faz" sozinho não vence um verbo de edição na mesma frase.
    expect(lerIntencao('tira o fundo e faz mais escuro').intencao).toBe('editar');
  });

  it('pedido sem verbo nenhum fica indefinido, em vez de chutar', () => {
    // Chutar aqui custaria: com arte selecionada, um palpite de "criar"
    // geraria arte nova quando o usuário queria mexer na que está vendo.
    expect(lerIntencao('anúncio de clareamento dental').intencao).toBe('indefinida');
    expect(lerIntencao('clínica odontológica em Floripa').intencao).toBe('indefinida');
  });

  it('entende sem acento e em caixa alta', () => {
    expect(lerIntencao('MUDA O TITULO').intencao).toBe('editar');
    expect(lerIntencao('Começa uma nova campanha').intencao).toBe('criar');
  });

  it('devolve o trecho que decidiu, nas palavras do usuário', () => {
    expect(lerIntencao('troca o fundo').trecho).toBe('troca');
    expect(lerIntencao('quero 2 criativos').trecho).toBe('2 criativos');
    expect(lerIntencao('anúncio qualquer').trecho).toBeNull();
  });

  it('nunca lança, com qualquer entrada', () => {
    for (const lixo of [null, undefined, 42, '', '   ', {}, []]) {
      expect(() => lerIntencao(lixo)).not.toThrow();
      expect(lerIntencao(lixo).intencao).toBe('indefinida');
    }
  });
});

describe('rotearPedido', () => {
  it('sem seleção, tudo é criação — não existe o que editar', () => {
    // Recusar um "muda o fundo" sem alvo seria pior que gerar: o usuário
    // pediu uma arte, não uma lição sobre o estado da tela.
    const r = rotearPedido('muda o fundo pra azul', false);
    expect(r.rota).toBe('criar');
    expect(r.ignorouSelecao).toBe(false);
  });

  it('com seleção, o TEXTO manda — e a proposta fica sabendo', () => {
    // O caso do relato: arte selecionada, pedido de coisa nova. O clique
    // deixa de decidir, e o usuário é avisado de que a seleção foi ignorada
    // — pode ter sido justamente a que ele esqueceu de soltar.
    const r = rotearPedido('quero mais 2 criativos', true);
    expect(r.rota).toBe('criar');
    expect(r.ignorouSelecao).toBe(true);
  });

  it('com seleção e verbo de edição, edita', () => {
    const r = rotearPedido('tira o fundo azul', true);
    expect(r.rota).toBe('editar');
    expect(r.ignorouSelecao).toBe(false);
  });

  it('com seleção e texto indefinido, edita — e não finge que foi escolha do texto', () => {
    // Editar não destrói nada: sai uma arte filha, com a original intacta.
    const r = rotearPedido('mais sóbrio, com menos texto', true);
    expect(r.rota).toBe('editar');
    expect(r.leitura.intencao).toBe('indefinida');
    expect(r.ignorouSelecao).toBe(false);
  });
});
