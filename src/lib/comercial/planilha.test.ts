import { describe, expect, it } from 'vitest';
import { planilhaDeConversoes, nomeDaPlanilha, type LinhaDeConversao } from './planilha';

const linha = (p: Partial<LinhaDeConversao> = {}): LinhaDeConversao => ({
  conversion_date: '2026-11-04T00:00:00.000Z',
  event_name: 'Purchase',
  value: 5999.56,
  currency: 'BRL',
  fn: 'Thays', ln: 'Milhomem Monteiro Soriano',
  email: 'thaysmilhomem@icloud.com',
  phone: '5533074901368',
  ct: 'sao paulo', zip: '01310100', country: 'br',
  gen: 'f', age: 34, dob: '19920115', doby: '1992',
  send_status: 'sent', error_message: null,
  meta_event_id: '1234567890123456',
  created_at: '2026-11-04T13:20:00.000Z',
  ...p,
});

const linhas = (csv: string) => csv.replace(/^﻿/, '').split('\r\n');

describe('a planilha abre no Excel brasileiro', () => {
  it('separa por ponto e vírgula, não por vírgula', () => {
    // Com vírgula, o Excel em português lê tudo como uma coluna só — e o
    // arquivo "abre", então ninguém entende o que deu errado.
    const csv = planilhaDeConversoes([linha()]);
    expect(linhas(csv)[0].split(';').length).toBeGreaterThan(15);
  });

  it('começa com BOM, senão os acentos viram lixo', () => {
    // Sem BOM, "Bárbara" vira "BÃ¡rbara" no Excel.
    expect(planilhaDeConversoes([])).toMatch(/^﻿/);
  });

  it('quebra as linhas com CRLF', () => {
    const csv = planilhaDeConversoes([linha(), linha()]);
    expect(csv.split('\r\n')).toHaveLength(3); // cabeçalho + 2
  });

  it('o valor sai com vírgula decimal', () => {
    expect(planilhaDeConversoes([linha({ value: 2650 })])).toContain('2650,00');
  });

  it('mesmo sem nenhuma linha, o cabeçalho sai — a planilha vazia é resposta', () => {
    const csv = planilhaDeConversoes([]);
    expect(csv).toContain('E-mail');
    expect(linhas(csv)).toHaveLength(1);
  });
});

describe('nenhum dado some em silêncio', () => {
  it('telefone vai como TEXTO, senão vira notação científica', () => {
    // `5533074901368` lido como número sai `5,53307E+12`.
    const csv = planilhaDeConversoes([linha({ phone: '5533074901368' })]);
    expect(csv).toContain('="5533074901368"');
  });

  it('CEP com zero à esquerda não perde o zero', () => {
    const csv = planilhaDeConversoes([linha({ zip: '01310100' })]);
    expect(csv).toContain('="01310100"');
  });

  it('campo vazio fica vazio, e não vira um par de aspas', () => {
    const csv = planilhaDeConversoes([linha({ phone: null, zip: '   ' })]);
    expect(csv).not.toContain('=""');
  });

  it('o ID do evento da Meta também é texto — são 16 dígitos', () => {
    const csv = planilhaDeConversoes([linha({ meta_event_id: '1234567890123456' })]);
    expect(csv).toContain('="1234567890123456"');
  });
});

describe('a planilha não executa nada ao abrir', () => {
  it('campo que começa com = é neutralizado', () => {
    // O Excel executa fórmulas de CSV ao abrir. Numa lista de contatos de
    // cliente isso vai de célula quebrada a execução de comando.
    const csv = planilhaDeConversoes([linha({ fn: '=1+1', error_message: '@SUM(A1)' })]);
    expect(csv).toContain("'=1+1");
    expect(csv).toContain("'@SUM(A1)");
  });

  it('+ e - também são neutralizados', () => {
    const csv = planilhaDeConversoes([linha({ ct: '-2+3', ln: '+cmd' })]);
    expect(csv).toContain("'-2+3");
    expect(csv).toContain("'+cmd");
  });

  it('mas o texto forçado continua funcionando — é fórmula nossa', () => {
    const csv = planilhaDeConversoes([linha({ phone: '5511999999999' })]);
    expect(csv).not.toContain(`'="5511999999999"`);
  });
});

describe('o conteúdo não escapa da célula', () => {
  it('ponto e vírgula dentro do texto não cria coluna nova', () => {
    // Conferido pelas ASPAS, e não contando `split(';')`: um split ingênuo
    // não sabe ler CSV — ele conta o separador que está dentro das aspas e
    // acusa um erro que não existe. Foi o que este teste fez na primeira
    // versão.
    const csv = planilhaDeConversoes([linha({ error_message: 'falhou; tentar de novo' })]);
    expect(csv).toContain('"falhou; tentar de novo"');
  });

  it('aspas dentro do texto são duplicadas', () => {
    const csv = planilhaDeConversoes([linha({ ct: 'cidade "nova"' })]);
    expect(csv).toContain('"cidade ""nova"""');
  });

  it('quebra de linha dentro do texto não cria registro novo', () => {
    const csv = planilhaDeConversoes([linha({ error_message: 'linha 1\nlinha 2' })]);
    expect(csv.split('\r\n')).toHaveLength(2); // cabeçalho + 1 registro
  });
});

describe('as colunas dizem o que são, em português', () => {
  it('traduz o tipo e o status', () => {
    const compra = planilhaDeConversoes([linha({ event_name: 'Purchase', send_status: 'sent' })]);
    expect(compra).toContain('Compra');
    expect(compra).toContain('Enviado');

    const erro = planilhaDeConversoes([linha({ event_name: 'Lead', send_status: 'error' })]);
    expect(erro).toContain('Lead');
    expect(erro).toContain('Erro');
  });

  it('leva TODOS os campos da linha, não só os que a tela mostra', () => {
    // O pedido foi "o máximo de informações que tivermos". A tela mostra
    // seis colunas; a tabela tem dezenove.
    const csv = planilhaDeConversoes([linha()]);
    for (const titulo of ['Cidade', 'CEP', 'País', 'Gênero', 'Idade', 'Nascimento',
      'Ano de nascimento', 'Erro', 'ID do evento na Meta', 'Registrado em']) {
      expect(csv).toContain(titulo);
    }
  });

  it('data inválida vira vazio, não "Invalid Date"', () => {
    const csv = planilhaDeConversoes([linha({ conversion_date: 'xx', created_at: 'xx' })]);
    expect(csv).not.toContain('Invalid');
  });
});

describe('o nome do arquivo', () => {
  it('carrega o cliente e o dia — três downloads não viram "(1)" e "(2)"', () => {
    expect(nomeDaPlanilha('Deni Haut Cursos', new Date('2026-11-16T10:00:00Z')))
      .toBe('conversoes-deni-haut-cursos-2026-11-16.csv');
  });

  it('sem cliente, ainda tem nome', () => {
    expect(nomeDaPlanilha(null, new Date('2026-11-16T10:00:00Z')))
      .toBe('conversoes-cliente-2026-11-16.csv');
  });
});
