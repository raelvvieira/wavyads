/**
 * A planilha das conversões.
 *
 * CSV, e não XLSX, porque CSV abre no Excel, no Google Sheets e no Numbers
 * sem biblioteca nenhuma no pacote — e o que se pede aqui é a lista, não
 * formatação.
 *
 * Mas "é só juntar com vírgula" produz um arquivo que decepciona na
 * primeira tentativa de abrir. Quatro coisas precisam estar certas, e cada
 * uma tem um teste:
 *
 * **O separador é `;`.** O Excel em português lê a vírgula como separador
 * decimal, não de coluna: com vírgula, a planilha inteira chega numa coluna
 * só. É a falha mais comum, e a mais irritante, porque o arquivo "abriu".
 *
 * **O arquivo começa com BOM.** Sem ele o Excel assume a codificação do
 * sistema e "Bárbara Raianne" vira "BÃ¡rbara".
 *
 * **Telefone e CEP vão como texto.** `5511967511631` lido como número vira
 * notação científica, e um CEP com zero à esquerda perde o zero. Em ambos,
 * o dado some sem aviso.
 *
 * **Nada é interpretado como fórmula.** Um campo que comece com `=`, `+`,
 * `-` ou `@` é executado pelo Excel ao abrir. Numa planilha de contatos de
 * cliente isso vai de célula quebrada a execução de comando, e a defesa é
 * uma aspa à frente.
 */

export interface LinhaDeConversao {
  conversion_date: string;
  event_name: string;
  value: number | null;
  currency: string | null;
  fn: string | null;
  ln: string | null;
  email: string | null;
  phone: string | null;
  ct: string | null;
  zip: string | null;
  country: string | null;
  gen: string | null;
  age: number | null;
  dob: string | null;
  doby: string | null;
  send_status: string;
  error_message: string | null;
  meta_event_id: string | null;
  created_at: string;
}

/** `;` — ver o cabeçalho deste arquivo. */
const SEPARADOR = ';';

/** Sem isto o Excel erra a codificação e come os acentos. */
const BOM = '﻿';

const COLUNAS: { titulo: string; de: (r: LinhaDeConversao) => string }[] = [
  { titulo: 'Data', de: (r) => dataCurta(r.conversion_date) },
  { titulo: 'Tipo', de: (r) => (r.event_name === 'Purchase' ? 'Compra' : r.event_name === 'Lead' ? 'Lead' : r.event_name) },
  { titulo: 'Valor', de: (r) => numero(r.value) },
  { titulo: 'Moeda', de: (r) => r.currency ?? '' },
  { titulo: 'Nome', de: (r) => r.fn ?? '' },
  { titulo: 'Sobrenome', de: (r) => r.ln ?? '' },
  { titulo: 'E-mail', de: (r) => r.email ?? '' },
  { titulo: 'Telefone', de: (r) => comoTexto(r.phone) },
  { titulo: 'Cidade', de: (r) => r.ct ?? '' },
  { titulo: 'CEP', de: (r) => comoTexto(r.zip) },
  { titulo: 'País', de: (r) => r.country ?? '' },
  { titulo: 'Gênero', de: (r) => r.gen ?? '' },
  { titulo: 'Idade', de: (r) => (r.age == null ? '' : String(r.age)) },
  { titulo: 'Nascimento', de: (r) => comoTexto(r.dob) },
  { titulo: 'Ano de nascimento', de: (r) => comoTexto(r.doby) },
  { titulo: 'Status do envio', de: (r) => status(r.send_status) },
  { titulo: 'Erro', de: (r) => r.error_message ?? '' },
  { titulo: 'ID do evento na Meta', de: (r) => comoTexto(r.meta_event_id) },
  { titulo: 'Registrado em', de: (r) => dataHora(r.created_at) },
];

function status(s: string): string {
  if (s === 'sent') return 'Enviado';
  if (s === 'error') return 'Erro';
  return 'Pendente';
}

function dataCurta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR');
}

function dataHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

/** Vírgula decimal: é assim que o Excel em pt-BR reconhece o número. */
function numero(v: number | null): string {
  if (v == null) return '';
  return v.toFixed(2).replace('.', ',');
}

/**
 * Força o campo a ser texto.
 *
 * `="..."` é a forma que o Excel e o Google Sheets respeitam igualmente —
 * sem ela, um telefone de 13 dígitos vira `5,51197E+12` e um CEP com zero
 * à esquerda perde o zero. Nos dois casos o dado some sem avisar ninguém.
 */
function comoTexto(v: string | null): string {
  const t = (v ?? '').trim();
  return t ? `="${t.replace(/"/g, '""')}"` : '';
}

/** Começa com um caractere que o Excel executa como fórmula? */
const PARECE_FORMULA = /^[=+\-@\t\r]/;

function celula(valor: string): string {
  // O campo já vem no formato `="..."`: é fórmula nossa, de propósito.
  const texto = valor.startsWith('="') ? valor : neutralizar(valor);
  const precisaDeAspas = /["\n\r;]/.test(texto) && !texto.startsWith('="');
  return precisaDeAspas ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function neutralizar(texto: string): string {
  return PARECE_FORMULA.test(texto) ? `'${texto}` : texto;
}

/** O conteúdo do arquivo, pronto para baixar. */
export function planilhaDeConversoes(linhas: LinhaDeConversao[]): string {
  const cabecalho = COLUNAS.map((c) => celula(c.titulo)).join(SEPARADOR);
  const corpo = linhas.map((r) => COLUNAS.map((c) => celula(c.de(r))).join(SEPARADOR));
  // `\r\n` é o que o Excel espera; com `\n` sozinho algumas versões juntam
  // tudo numa linha só.
  return BOM + [cabecalho, ...corpo].join('\r\n');
}

/**
 * O nome do arquivo.
 *
 * Com o cliente e a data dentro: três exportações no mesmo dia viram
 * "conversoes (1).csv" e "conversoes (2).csv" na pasta de downloads, e
 * ninguém lembra qual é de quem.
 */
export function nomeDaPlanilha(cliente: string | null | undefined, hoje = new Date()): string {
  const limpo = (cliente ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const dia = hoje.toISOString().slice(0, 10);
  return `conversoes-${limpo || 'cliente'}-${dia}.csv`;
}
