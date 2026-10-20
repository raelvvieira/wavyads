import { describe, expect, it } from 'vitest';
import { escolherContainer, pontuarContainer, PONTOS_MINIMOS, TAMANHO_DA_LISTA_CURTA } from './escolha';
import { CONTAINERS, containerPorId } from './catalog';
import type { CreativeContainer } from './types';

/* Um container de teste, para as regras que precisam de um caso controlado.
   Os testes que importam de verdade rodam contra o catálogo REAL — é ele
   que vai ao prompt, e é nele que uma regra calibrada em fixture falha. */
const base = (p: Partial<CreativeContainer> = {}): CreativeContainer => ({
  id: 'formato_teste', nome_pt: 'Formato Teste',
  descricao_layout: 'layout', blocos: [], fixo: [], trocavel: [],
  proporcao: '4:5', funil: ['meio'], densidade_texto: 'media',
  presenca_de_cta: 'opcional', tem_rosto: false, tem_produto: false,
  origem: 'arquivo', ...p,
});

describe('a proporção é porteira, não nota', () => {
  it('container de outra proporção nem entra na lista', () => {
    // Um "antes e depois" é 1:1 no catálogo. Servi-lo a um pedido 9:16
    // produziria uma peça que o próprio container declara não ser.
    const r = escolherContainer({ brief: 'quero um antes e depois', aspectRatio: '9:16' });
    expect(r.listaCurta.every((p) => p.container.proporcao === '9:16')).toBe(true);
    expect(r.container?.id).not.toBe('antes_depois');
  });

  it('proporção sem nenhum container no catálogo devolve lista vazia, não um palpite', () => {
    const r = escolherContainer({ brief: 'antes e depois', aspectRatio: '16:9' });
    expect(r.listaCurta).toEqual([]);
    expect(r.container).toBeNull();
  });

  it('sem proporção definida, a porteira não filtra nada', () => {
    const r = escolherContainer({ brief: 'antes e depois', aspectRatio: null });
    expect(r.container?.id).toBe('antes_depois');
  });
});

describe('o pedido que nomeia o formato', () => {
  it('"antes e depois" escolhe o antes e depois', () => {
    const r = escolherContainer({ brief: 'quero um antes e depois de clareamento', aspectRatio: '1:1' });
    expect(r.container?.id).toBe('antes_depois');
    expect(r.citado).toBe(true);
  });

  it('um formato de token único também é reconhecido', () => {
    // `censurado` tem um token só no id: exigir dois tokens o tornaria
    // impossível de pedir pelo nome.
    const r = escolherContainer({ brief: 'quero um criativo censurado', aspectRatio: '1:1' });
    expect(r.container?.id).toBe('censurado');
  });

  it('pedido explícito VENCE as penalidades de anexo que faltou', () => {
    // O caso que a calibragem inicial errava: `carrinho_checkout` tem
    // produto no quadro, tem pré-requisito de produção e é de risco alto.
    // Com a mão vazia ele somava 0 mesmo tendo sido pedido pelo nome — e o
    // sistema ignorava o pedido em silêncio, que é o pior resultado
    // possível.
    const r = escolherContainer({ brief: 'faz um carrinho de checkout', aspectRatio: '9:16' });
    expect(r.container?.id).toBe('carrinho_checkout');
    const pontos = r.listaCurta[0].pontos;
    expect(pontos).toBeLessThan(PONTOS_MINIMOS);
  });

  it('o que faltou é DITO, não decidido por conta própria', () => {
    const r = escolherContainer({ brief: 'faz um carrinho de checkout', aspectRatio: '9:16' });
    expect(r.faltas.length).toBeGreaterThan(0);
    expect(r.faltas.join(' ')).toMatch(/produto|foto/i);
  });

  it('formato citado que não existe na proporção pedida é relatado, não engolido', () => {
    // Sem isto, o pedido cai no vazio: a arte sai comum e ninguém diz que
    // o formato pedido foi ignorado.
    const r = escolherContainer({ brief: 'quero um antes e depois', aspectRatio: '9:16' });
    expect(r.container).toBeNull();
    expect(r.foraDoFormato).toEqual({ nome: expect.stringMatching(/Antes e depois/i), proporcao: '1:1' });
  });

  it('pedido que não cita formato nenhum não inventa divergência', () => {
    const r = escolherContainer({ brief: 'criativo de clareamento', aspectRatio: '4:5' });
    expect(r.foraDoFormato).toBeNull();
  });
});

describe('o sistema só decide sozinho com sinal forte', () => {
  it('briefing genérico sem anexo não elege ninguém', () => {
    const r = escolherContainer({ brief: 'criativo de clareamento dental', aspectRatio: '4:5' });
    expect(r.container).toBeNull();
  });

  it('um sinal sozinho não basta — uma foto de produto não elege um formato', () => {
    // Com o piso em 3, "criativo do creme" + uma foto elegia um sticker do
    // Instagram: um layout que o pedido não mencionou, imposto no prompt
    // como regra dura. Container errado é pior que container nenhum.
    const r = escolherContainer({ brief: 'criativo do creme', aspectRatio: '4:5', temProduto: true });
    expect(r.container).toBeNull();
  });

  it('mas a lista curta continua cheia, para a troca manual', () => {
    const r = escolherContainer({ brief: 'criativo do creme', aspectRatio: '4:5', temProduto: true });
    expect(r.listaCurta.length).toBe(TAMANHO_DA_LISTA_CURTA);
    expect(r.listaCurta[0].pontos).toBeGreaterThan(r.listaCurta[4].pontos - 1);
  });

  it('vários sinais juntos elegem', () => {
    const catalogo = [base({
      id: 'combinado', tem_produto: true, tem_rosto: true,
      densidade_texto: 'alta', exemplo_nicho: 'odontologia estetica',
    })];
    const r = escolherContainer({
      brief: 'peça de odontologia', aspectRatio: '4:5',
      temProduto: true, temPessoa: true,
      copy: 'x'.repeat(130),
    }, catalogo);
    expect(r.container?.id).toBe('combinado');
    expect(r.porques.length).toBeGreaterThanOrEqual(2);
  });
});

describe('as palavras genéricas não escolhem nada', () => {
  it('"criativo", "produto" e "arte" não casam com formato nenhum', () => {
    // Sem a lista de genéricas, quem escreve "quero um criativo de
    // produto" casa com todo container cujo id tem `produto` — e o sistema
    // escolhe um formato porque a pessoa usou a palavra mais comum do
    // vocabulário dela.
    const catalogo = [base({ id: 'criativo_produto_arte', nome_pt: 'Criativo de produto' })];
    const r = escolherContainer({ brief: 'quero um criativo de produto', aspectRatio: '4:5' }, catalogo);
    expect(r.citado).toBe(false);
  });
});

describe('o ângulo vetado exclui, não penaliza', () => {
  it('container que veda o ângulo some da lista inteira', () => {
    // O veto é escrito por quem desenhou a peça: "a peça tem um quadro só
    // e uma foto só" não vira "antes e depois" com insistência.
    const catalogo = [base({
      id: 'quadro_unico',
      angulos_vedados: ['qualquer angulo que exija par ANTES e DEPOIS (a peca tem um quadro so)'],
    })];
    const com = escolherContainer({ brief: 'x', aspectRatio: '4:5', angulo: 'antes e depois do resultado' }, catalogo);
    const sem = escolherContainer({ brief: 'x', aspectRatio: '4:5', angulo: 'prova social' }, catalogo);
    expect(com.listaCurta).toEqual([]);
    expect(sem.listaCurta.length).toBe(1);
  });
});

describe('a copy pesa no formato', () => {
  it('copy longa não vai para peça de texto baixo', () => {
    const alta = base({ id: 'texto_alto', densidade_texto: 'alta' });
    const baixa = base({ id: 'texto_baixo', densidade_texto: 'baixa' });
    const longa = { brief: 'x', aspectRatio: '4:5', copy: 'palavra '.repeat(30) };
    const pa = pontuarContainer(alta, longa)!;
    const pb = pontuarContainer(baixa, longa)!;
    expect(pa.pontos).toBeGreaterThan(pb.pontos);
  });

  it('copy com chamada para ação não vai para peça que proíbe CTA', () => {
    const proibe = base({ id: 'sem_cta', presenca_de_cta: 'proibido' });
    const ctx = { brief: 'x', aspectRatio: '4:5', copy: 'Agende sua avaliação pelo WhatsApp hoje' };
    const semCta = { ...ctx, copy: 'Um sorriso novo' };
    expect(pontuarContainer(proibe, ctx)!.pontos)
      .toBeLessThan(pontuarContainer(proibe, semCta)!.pontos);
  });
});

describe('a escolha é estável', () => {
  it('a ordem do catálogo não muda quem ganha um empate', () => {
    // `catalog.ts` ordena por id justamente para isto. Se o desempate
    // dependesse da posição, reordenar o `containers.json` trocaria em
    // silêncio o formato de todo pedido empatado.
    const ctx = { brief: 'criativo do creme', aspectRatio: '4:5', temProduto: true };
    const direto = escolherContainer(ctx).listaCurta.map((p) => p.container.id);
    const invertido = escolherContainer(ctx, [...CONTAINERS].reverse()).listaCurta.map((p) => p.container.id);
    expect(invertido).toEqual(direto);
  });

  it('o mesmo pedido devolve a mesma escolha duas vezes', () => {
    const ctx = { brief: 'quero um antes e depois', aspectRatio: '1:1' };
    expect(escolherContainer(ctx).container?.id).toBe(escolherContainer(ctx).container?.id);
  });
});

describe('o catálogo real responde', () => {
  it('todo container do catálogo é alcançável pelo próprio nome', () => {
    // Um formato que não dá para pedir pelo nome é um formato que não
    // existe para quem usa. Este teste é o que mantém o catálogo honesto
    // quando ele crescer.
    const inalcancaveis = CONTAINERS.filter((c) => {
      const r = escolherContainer({ brief: c.nome_pt, aspectRatio: c.proporcao });
      return r.container?.id !== c.id;
    }).map((c) => c.id);
    expect(inalcancaveis).toEqual([]);
  });

  it('containerPorId acha o que a escolha devolveu', () => {
    const r = escolherContainer({ brief: 'quero um antes e depois', aspectRatio: '1:1' });
    expect(containerPorId(r.container!.id)?.id).toBe(r.container!.id);
  });
});
