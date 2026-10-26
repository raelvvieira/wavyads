import { describe, expect, it } from 'vitest';
import { blocoDoPedidoDeEstilo, lerPedidoDeEstilo } from './temas';
import { lerOcasiao } from './ocasioes';
import { lerNicho } from './qualidade';
import { montarRepertorio } from '.';

const base = { aspectRatio: '4:5', pessoas: 0, produtos: 0, temReferencia: false };

describe('cor e tema pedidos', () => {
  it('lê as cores na ordem em que foram ditas', () => {
    expect(lerPedidoDeEstilo('quero em verde e dourado').cores.map((c) => c.nome)).toEqual(['verde', 'dourado']);
    expect(lerPedidoDeEstilo('branco com dourado, bem premium').cores.map((c) => c.nome)).toEqual(['branco', 'dourado']);
  });

  it('o tom específico cobre o genérico', () => {
    expect(lerPedidoDeEstilo('verde sálvia').cores.map((c) => c.nome)).toEqual(['verde sálvia']);
    expect(lerPedidoDeEstilo('azul petróleo e creme claro').cores.map((c) => c.nome)).toEqual(['azul petróleo']);
  });

  it('não inventa cor nem tema a partir de palavras parecidas', () => {
    const p = lerPedidoDeEstilo('criativo de clareamento e limpeza, creme facial');
    expect(p.cores).toEqual([]);
    expect(p.temas).toEqual([]);
  });

  it('reconhece temas e diz que o pedido vence o design system', () => {
    const p = lerPedidoDeEstilo('algo mais premium e minimalista');
    expect(p.temas.map((t) => t.id)).toEqual(['premium', 'minimalista']);
    expect(blocoDoPedidoDeEstilo(p)).toContain('THIS REQUEST WINS');
  });

  it('sem cor nem tema, bloco vazio', () => {
    expect(blocoDoPedidoDeEstilo(lerPedidoDeEstilo('criativo para a minha marca'))).toBe('');
  });

  it('dourado sempre como metal em degradê', () => {
    expect(blocoDoPedidoDeEstilo(lerPedidoDeEstilo('preto e dourado'))).toContain('never flat yellow');
  });
});

describe('ocasião e nicho', () => {
  it('a precedência é a da lista', () => {
    expect(lerOcasiao('lançamento com desconto')?.id).toBe('lancamento');
    expect(lerOcasiao('workshop com condição especial')?.id).toBe('evento');
    expect(lerOcasiao('combo limpeza + clareamento')?.id).toBe('oferta');
    expect(lerOcasiao('criativo para a minha marca')).toBeNull();
  });

  it('"de verdade" não vira peça educativa', () => {
    expect(lerOcasiao('um brilho de verdade')).toBeNull();
  });

  it('reconhece o nicho', () => {
    expect(lerNicho('clareamento dental')?.id).toBe('odontologia');
    expect(lerNicho('harmonização facial')?.id).toBe('estetica');
    expect(lerNicho('loja de roupas')).toBeNull();
  });
});

describe('montarRepertorio', () => {
  it('evento com uma pessoa: palestrante em destaque; com duas: lineup', () => {
    expect(montarRepertorio({ ...base, brief: 'imersão de vendas', pessoas: 1 }).container?.id).toBe('evento_palestrante_heroi');
    expect(montarRepertorio({ ...base, brief: 'imersão de vendas', pessoas: 3 }).container?.id).toBe('evento_lineup_convidados');
  });

  it('respeita a proporção: no story, o container de story', () => {
    expect(montarRepertorio({ ...base, aspectRatio: '9:16', brief: 'palestra dia 12/11', pessoas: 1 }).container?.id)
      .toBe('evento_palestrante_heroi_story');
  });

  it('evento sem data avisa o que falta', () => {
    const r = montarRepertorio({ ...base, brief: 'workshop de fotografia', pessoas: 1 });
    expect(r.faltas).toContain('a data, o horário e o local do evento');
    expect(montarRepertorio({ ...base, brief: 'workshop dia 14/11 às 19h', pessoas: 1 }).faltas).toEqual([]);
  });

  it('antes e depois sem foto real: nenhum container e o aviso', () => {
    const r = montarRepertorio({ ...base, brief: 'antes e depois de clareamento' });
    expect(r.blocos.join('\n')).toContain('Do NOT generate or simulate any before/after');
    expect(r.faltas[0]).toContain('fotos reais do antes e do depois');
    expect(r.naoIncluir.join('\n')).toContain('before/after');
  });

  it('no nicho, pedidos diferentes giram entre os layouts aprovados', () => {
    const ids = new Set(['clareamento', 'clareamento dental premium', 'sorriso branco', 'limpeza dental e clareamento',
      'lentes de contato dental', 'clareamento para noivas', 'sorriso de verdade'].map(
      (brief) => montarRepertorio({ ...base, brief }).container?.id,
    ));
    expect(ids.size).toBeGreaterThan(2);
    expect([...ids].every((id) => !!id)).toBe(true);
  });

  it('oferta de clínica alterna entre o layout de preço e os aprovados do nicho', () => {
    const ids = new Set(['combo limpeza + clareamento', 'combo clareamento com condição especial', 'promoção de clareamento',
      'desconto em lentes de contato dental', 'oferta de clareamento para dezembro', 'pacote de limpeza dental'].map(
      (brief) => montarRepertorio({ ...base, brief }).container?.id,
    ));
    expect(ids.size).toBeGreaterThan(2);
    // Fora do nicho, a oferta fica com o layout dela.
    expect(montarRepertorio({ ...base, brief: 'promoção de tênis' }).container?.id).toBe('oferta_preco_destaque');
  });

  it('o mesmo pedido sai sempre com o mesmo container', () => {
    const a = montarRepertorio({ ...base, brief: 'harmonização facial natural' }).container?.id;
    const b = montarRepertorio({ ...base, brief: 'harmonização facial natural' }).container?.id;
    expect(a).toBe(b);
  });

  it('pedido sem ocasião nem nicho: só a régua de qualidade', () => {
    const r = montarRepertorio({ ...base, brief: 'criativo para a minha marca' });
    expect(r.container).toBeNull();
    expect(r.blocos).toHaveLength(1);
    expect(r.blocos[0]).toContain('[QUALITY BAR]');
    expect(r.naoIncluir).toEqual([]);
  });

  it('o nicho também se reconhece pelo contexto (estilo próprio anexado)', () => {
    const r = montarRepertorio({ ...base, brief: 'campanha de novembro', contexto: 'GENOMA · ESTÉTICA & ODONTOLOGIA' });
    expect(r.leu).toContain('as regras de odontologia');
  });
});
