import { contem, normalizar } from './texto';

/**
 * Que tipo de peça o pedido é — evento, oferta, lançamento, depoimento.
 *
 * O container diz o LAYOUT; a ocasião diz o que a peça precisa CONTER e
 * como usar o que foi anexado. "Criativo pro evento" com três fotos de
 * pessoas tem uma resposta conhecida: as pessoas são os palestrantes, o
 * nome do evento domina, data e local vão juntos numa linha, e o CTA é de
 * inscrição. Até aqui essa resposta dependia de a direção de arte acertar
 * sozinha; agora ela vem escrita, e também escolhe o container.
 */

export interface ContextoDaOcasiao {
  brief: string;
  pessoas: number;
  produtos: number;
  temReferencia: boolean;
}

export interface Ocasiao {
  id: string;
  nome: string;
  termos: string[];
  /** Containers que servem a esta ocasião, do mais típico ao menos. */
  containers: (ctx: ContextoDaOcasiao) => string[];
  /** O roteiro em inglês, para a direção de arte e o modelo de imagem. */
  roteiro: (ctx: ContextoDaOcasiao) => string;
  /** O que a peça pede e o pedido não trouxe. Em português, para a proposta. */
  faltas?: (ctx: ContextoDaOcasiao) => string[];
  /**
   * Os layouts aprovados do nicho também servem a esta ocasião.
   *
   * Uma oferta de clínica cabe tanto no layout de preço quanto nos layouts
   * de estética do Genoma — foi assim que o combo de limpeza e clareamento
   * foi aprovado. Um evento, não: ele tem layout próprio.
   */
  aceitaONicho?: boolean;
}

/** Uma data ou um dia da semana escrito no pedido. */
function temData(brief: string): boolean {
  const t = normalizar(brief);
  return /\b\d{1,2}\s*(\/|de|\.)\s*(\d{1,2}|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/.test(t)
    || /\b(segunda|terca|quarta|quinta|sexta|sabado|domingo|amanha|hoje)\b/.test(t)
    || /\b\d{1,2}\s*(h|:\d{2})\b/.test(t);
}

const pessoasNaPeca = ({ pessoas }: ContextoDaOcasiao) => pessoas > 0
  ? `Use the ${pessoas} attached photo(s) of real people exactly as they are — same faces — as the human focus of the piece.`
  : '';

export const OCASIOES: Ocasiao[] = [
  {
    id: 'evento',
    nome: 'evento',
    termos: ['evento', 'palestra', 'workshop', 'imersao', 'congresso', 'summit', 'encontro', 'webinar', 'live',
      'masterclass', 'aula', 'curso presencial', 'meetup', 'conferencia', 'seminario', 'mentoria presencial', 'retiro', 'festa', 'show'],
    containers: ({ pessoas }) => pessoas >= 2
      ? ['evento_lineup_convidados', 'evento_palestrante_heroi', 'evento_palestrante_heroi_story', 'adesivos_de_story_sobre_foto_de_evento']
      : ['evento_palestrante_heroi', 'evento_palestrante_heroi_story', 'adesivos_de_story_sobre_foto_de_evento', 'evento_lineup_convidados'],
    roteiro: (ctx) => [
      'This is an EVENT announcement. The event name is the dominant text.',
      ctx.pessoas >= 2
        ? `The ${ctx.pessoas} attached people are the speakers / guests: show all of them with the same crop, light and face size, each with their name and role right below.`
        : ctx.pessoas === 1
          ? 'The attached person is the speaker / host: make them the hero (portrait from the waist or chest up), with name and role on a contrast strip next to them.'
          : 'No people attached: build the piece on a strong typographic poster or a real venue / ambience photo, never invented speakers.',
      'Date, time and place (or "online") go together in one compact data line. The call to action is about registering or securing a spot.',
      'Background with depth and texture in the palette colours, not flat and empty.',
    ].join('\n'),
    faltas: ({ brief, pessoas }) => [
      ...(temData(brief) ? [] : ['a data, o horário e o local do evento']),
      ...(pessoas === 0 ? ['a foto de quem conduz o evento (opcional, mas é o que mais vende)'] : []),
    ],
  },
  {
    id: 'lancamento',
    nome: 'lançamento',
    termos: ['lancamento', 'lancando', 'lancar', 'novidade', 'chegou', 'pre-venda', 'pre venda', 'em breve', 'estreia', 'nova colecao'],
    containers: () => ['lancamento_revelacao'],
    roteiro: (ctx) => [
      'This is a LAUNCH. One hero only (the attached product, service or person), with premiere lighting: a light beam, rim light or a background that darkens towards the edges.',
      'A small letter-spaced label such as "LANÇAMENTO" or "NOVO" at the top, the launch name large, one short benefit line, availability or date, and a call to action.',
      pessoasNaPeca(ctx),
      'Lots of breathing room around the hero.',
    ].filter(Boolean).join('\n'),
  },
  {
    id: 'inauguracao',
    nome: 'inauguração',
    termos: ['inauguracao', 'inaugura', 'inaugurar', 'novo endereco', 'nova unidade', 'nova sede', 'abrimos', 'reinauguracao', 'mudamos'],
    containers: () => ['inauguracao_convite'],
    roteiro: () => 'This is an OPENING / NEW ADDRESS invitation: a real, beautiful photo of the space, an invitation card with the label, an invitation line, date and time, the address with a small pin icon, and a call to come visit.',
    faltas: ({ brief }) => (temData(brief) ? [] : ['a data e o endereço']),
  },
  {
    id: 'data_comemorativa',
    nome: 'data comemorativa',
    termos: ['dia das maes', 'dia dos pais', 'natal', 'ano novo', 'pascoa', 'dia dos namorados', 'dia da mulher', 'dia das criancas',
      'dia do cliente', 'aniversario da', 'aniversario do', 'carnaval', 'festa junina', 'outubro rosa', 'novembro azul'],
    containers: () => ['data_comemorativa_editorial'],
    roteiro: (ctx) => [
      'This is a SEASONAL / COMMEMORATIVE piece: an affectionate, real scene tied to the date, the name of the date in expressive type, one line connecting it to the brand.',
      pessoasNaPeca(ctx),
      'Use the symbols of the date sparingly; no stock-photo clichés.',
    ].filter(Boolean).join('\n'),
  },
  {
    id: 'antes_depois',
    nome: 'antes e depois',
    termos: ['antes e depois', 'antes x depois', 'antes/depois', 'transformacao'],
    containers: ({ pessoas }) => pessoas > 0
      ? ['antes_depois_horizontal_educativo', 'antes_depois_pagina_virando', 'antes_depois_perfil_com_manchete', 'antes_depois']
      : [],
    roteiro: (ctx) => ctx.pessoas > 0
      ? 'This is a BEFORE AND AFTER built ONLY from the attached real photos. Do not retouch, enhance or alter the result in either photo; keep both with the same framing and light.'
      : 'A before and after was asked for but no real photos are attached. Do NOT generate or simulate any before/after result. Show the process instead (steps, the procedure, a shade guide or the professional at work).',
    faltas: ({ pessoas }) => pessoas > 0 ? [] : ['as fotos reais do antes e do depois (com autorização) — sem elas a peça mostra o processo, não um resultado inventado'],
  },
  {
    id: 'depoimento',
    nome: 'depoimento',
    termos: ['depoimento', 'prova social', 'avaliacao de cliente', 'review', 'feedback de cliente', 'cliente satisfeito', 'o que dizem'],
    containers: ({ pessoas }) => pessoas > 0
      ? ['depoimento_retrato_cliente', 'genoma_prova_depoimento', 'secao_de_comentarios']
      : ['genoma_prova_depoimento', 'secao_de_comentarios', 'depoimento_retrato_cliente'],
    roteiro: (ctx) => [
      'This is a TESTIMONIAL. The testimonial text is written exactly as provided — never invent or improve what a customer said.',
      ctx.pessoas > 0
        ? 'The attached person is the customer giving the testimonial: real portrait, natural expression.'
        : 'No customer photo attached: build it typographically (large quotation marks, serif italic quote, name and short info), never with an invented face presented as the customer.',
    ].join('\n'),
    faltas: ({ pessoas }) => pessoas > 0 ? [] : ['a foto do cliente (com autorização), se quiser o rosto na peça'],
  },
  {
    id: 'autoridade',
    nome: 'apresentação da profissional',
    termos: ['apresentacao', 'conheca a dra', 'conheca o dr', 'conheca a equipe', 'quem sou', 'quem somos', 'sobre mim', 'sobre nos', 'especialista', 'nossa equipe', 'nosso time', 'autoridade'],
    containers: ({ pessoas }) => pessoas > 0
      ? ['genoma_prova_autoridade', 'editorial_premium_com_pilula_cta', 'genoma_manchete_cena_clinica']
      : ['genoma_manchete_cena_clinica', 'editorial_premium_com_pilula_cta'],
    roteiro: (ctx) => [
      'This piece PRESENTS THE PROFESSIONAL or the team: credibility through a real portrait, name, title and two or three short credentials.',
      ctx.pessoas > 0 ? 'The attached person is the professional: identical face, professional but warm setting.' : 'No portrait attached: show the workplace or hands at work, never an invented face presented as the professional.',
    ].join('\n'),
    faltas: ({ pessoas }) => pessoas > 0 ? [] : ['a foto real da profissional ou da equipe'],
  },
  {
    id: 'recrutamento',
    nome: 'vaga',
    termos: ['vaga', 'vagas', 'contratando', 'trabalhe conosco', 'estamos contratando', 'oportunidade de emprego', 'recrutamento', 'seletivo'],
    containers: () => ['procuramos_pessoas', 'procura_se'],
    roteiro: () => 'This is a HIRING piece: the role in large type, two or three short requirements or perks, and how to apply as the call to action.',
  },
  {
    id: 'oferta',
    nome: 'oferta',
    aceitaONicho: true,
    termos: ['oferta', 'promocao', 'promo', 'desconto', 'black friday', 'cupom', 'liquidacao', 'condicao especial',
      'condicoes especiais', 'combo', 'preco', 'r$', '% off', 'off', 'queima', 'saldao', 'pacote'],
    containers: ({ produtos, pessoas }) => [
      'oferta_preco_destaque', 'oferta_preco_destaque_story',
      ...(produtos > 0 ? ['depoimento_com_selo_de_desconto', 'oferta_em_notificacao'] : []),
      ...(pessoas === 0 && produtos === 0 ? ['genoma_pergunta_caixa_vidro'] : []),
    ],
    roteiro: (ctx) => [
      'This is an OFFER. Hierarchy: the offer (what it is), then the price or condition, then the call to action as a solid button.',
      'Write the offer name, prices and conditions exactly as given in the brief; never invent a price, a percentage or a deadline.',
      'When there is an old and a new price: old price small and struck through, new price large and clean, instalments smaller beside it.',
      ctx.produtos > 0 ? 'The attached product is the hero photo of the offer.' : pessoasNaPeca(ctx),
      'Premium promotion, not a supermarket flyer: no exploding stars, no red-and-yellow clutter, unless the user asked for a loud retail style.',
    ].filter(Boolean).join('\n'),
  },
  {
    id: 'educativo',
    nome: 'educativo',
    aceitaONicho: true,
    termos: ['dica', 'dicas', 'mito', 'mitos', 'mito ou verdade', 'sabia que', 'voce sabia', 'passo a passo', 'erros', 'guia', 'curiosidade'],
    containers: () => ['capa_educativa_macro', 'pergunta_editorial_serifada', 'mito_vs_fato', 'genoma_pergunta_caixa_vidro', 'cinco_razoes_tabela_manuscrita'],
    roteiro: (ctx) => [
      'This is an EDUCATIONAL piece: one clear idea or question, a strong headline, and a short supporting line. It teaches, it does not sell hard; the call to action invites to learn more or book.',
      pessoasNaPeca(ctx),
    ].filter(Boolean).join('\n'),
  },
];

/**
 * A ocasião do pedido — a primeira da lista que casar.
 *
 * A ordem da lista é a ordem de precedência: "evento com condição especial"
 * é um evento, não uma oferta, e "lançamento com desconto" é lançamento.
 */
export function lerOcasiao(brief: string | null | undefined): Ocasiao | null {
  const t = normalizar(brief);
  if (!t.trim()) return null;
  return OCASIOES.find((o) => o.termos.some((termo) => contem(t, termo))) ?? null;
}
