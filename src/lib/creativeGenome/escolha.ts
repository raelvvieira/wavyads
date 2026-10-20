import { CONTAINERS } from './catalog';
import type { CreativeContainer } from './types';

/**
 * Quem escolhe o container.
 *
 * O catálogo tem 53 peças desde a primeira fase, o cano até o
 * `[TEMPLATE STRUCTURE]` existe desde a segunda — e no meio não havia
 * ninguém. O único lugar que passava um container era a bancada de prompt,
 * atrás de `import.meta.env.DEV`. Na prática: nenhuma arte gerada no Studio
 * até hoje passou por um container.
 *
 * Este módulo é a peça que faltava, e ele é PURO de propósito. A escolha
 * precisa acontecer no mesmo instante da leitura do pedido, antes de
 * qualquer imagem, e precisa funcionar mesmo quando a edge function de
 * direção de arte não responde — que é o estado de hoje. Regra escrita à
 * mão não depende de deploy; quando a IA entrar, ela entra por cima disto,
 * não no lugar.
 *
 * Duas garantias moldam tudo aqui:
 *
 * **Na dúvida, não escolhe.** Abaixo de `PONTOS_MINIMOS` o resultado é
 * `null`, e o prompt sai exatamente como sai hoje. Um container errado é
 * pior que container nenhum: ele impõe um layout que o pedido não pediu, e
 * o `fixo` entra no prompt como regra dura.
 *
 * **A proporção é porteira, não nota.** Um "antes e depois" é 1:1 no
 * catálogo; servi-lo a um pedido 9:16 produziria uma peça que o próprio
 * container declara não ser. Fora da proporção, nem entra na lista.
 */

/** Quantos candidatos a proposta mostra para troca. */
export const TAMANHO_DA_LISTA_CURTA = 5;

/**
 * O piso para o sistema escolher um container sem ninguém pedir.
 *
 * Calibrado contra o catálogo real, e alto de propósito. Com o piso em 3,
 * um briefing genérico com uma foto de produto anexada já elegia
 * `sticker_pergunta_instagram` — um formato que o pedido não mencionou,
 * escolhido só porque a peça tem produto no quadro. O layout entraria no
 * prompt como regra dura, e a pessoa receberia um sticker do Instagram por
 * ter escrito "criativo do creme".
 *
 * Em 5, só passa quem acerta VÁRIOS sinais ao mesmo tempo — produto, mais
 * pessoa, mais densidade de copy, mais nicho. Um sinal sozinho não elege
 * ninguém, e o pedido genérico continua saindo como sai hoje.
 *
 * Pedido que CITA o formato não passa por aqui: ver `escolherContainer`.
 */
export const PONTOS_MINIMOS = 5;

export interface ContextoDaEscolha {
  /** O que a pessoa escreveu no dock. */
  brief: string;
  /** O formato pedido. Fora dele, nenhum container entra. */
  aspectRatio: string | null | undefined;
  /** A copy anexada, quando houver — decide densidade e CTA. */
  copy?: string | null;
  temProduto?: boolean;
  /** Pessoa real ou avatar: para o container é a mesma pergunta. */
  temPessoa?: boolean;
  temLogo?: boolean;
  temReferencia?: boolean;
  /**
   * O ângulo estratégico do pedido, quando há um (Fator Criativo).
   *
   * Container que veta o ângulo é EXCLUÍDO, não penalizado: o veto é
   * escrito por quem desenhou a peça e diz que ela não comporta aquilo —
   * "a peça tem um quadro só e uma foto só" não vira "antes e depois" com
   * insistência.
   */
  angulo?: string | null;
}

export interface ContainerPontuado {
  container: CreativeContainer;
  pontos: number;
  /** Em português, o que somou. É o que a proposta mostra. */
  porques: string[];
  /** O pedido nomeou este formato, e com que força. */
  citacao: Citacao;
  /**
   * O que a peça pede e não foi anexado.
   *
   * Não impede nada — é o que permite ao chat PERGUNTAR em vez de chutar:
   * "esse formato mostra o produto e não achei foto nenhuma — anexa ou uso
   * outro?". Um pedido explícito que não pode ser atendido em silêncio é
   * pior que um pedido recusado.
   */
  faltas: string[];
}

export interface EscolhaDeContainer {
  /** O escolhido, ou `null` quando nada passou do piso. */
  container: CreativeContainer | null;
  /** Por que este. Vazio quando não houve escolha. */
  porques: string[];
  /** O que o escolhido pede e não foi anexado. Alimenta a pergunta. */
  faltas: string[];
  /** Os candidatos, para a troca na proposta. O escolhido é o primeiro. */
  listaCurta: ContainerPontuado[];
  /** O pedido citou o formato pelo nome. */
  citado: boolean;
  /**
   * O pedido nomeou um formato que NÃO existe na proporção escolhida.
   *
   * "Quero um antes e depois" em 9:16 cairia no vazio: o `antes_depois` é
   * 1:1 no catálogo, a porteira o exclui, e o sistema geraria uma arte
   * comum sem dizer que ignorou o pedido. Dizer o que aconteceu custa uma
   * linha na proposta e evita a pessoa repetir o pedido achando que não
   * foi lido.
   */
  foraDoFormato: { nome: string; proporcao: string } | null;
}

function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normalizar(s: string): string {
  return semAcento((s ?? '').toLowerCase());
}

/**
 * Palavras que aparecem em quase todo pedido de anúncio.
 *
 * Sem esta lista, "quero um criativo de produto" casaria com todo container
 * cujo id contém `produto` — e o sistema escolheria um formato porque a
 * pessoa usou a palavra mais comum do vocabulário dela.
 */
const GENERICAS = new Set([
  'criativo', 'criativos', 'arte', 'artes', 'anuncio', 'anuncios', 'imagem',
  'imagens', 'peca', 'pecas', 'post', 'posts', 'story', 'stories', 'banner',
  'cliente', 'clientes', 'marca', 'produto', 'produtos', 'foto', 'fotos',
  'video', 'videos', 'campanha', 'campanhas', 'versao', 'versoes', 'opcao',
  'sobre', 'para', 'pela', 'pelo', 'como', 'mais', 'esse', 'essa', 'isso',
  'esta', 'este', 'novo', 'nova', 'nosso', 'nossa', 'quero', 'fazer',
]);

/** Os tokens que identificam um formato, sem o ruído. */
function distintivos(palavras: string[]): string[] {
  const vistos = new Set<string>();
  for (const t of palavras) {
    const limpo = normalizar(t);
    if (limpo.length >= 5 && !GENERICAS.has(limpo)) vistos.add(limpo);
  }
  return [...vistos];
}

export interface Citacao {
  citado: boolean;
  /** Fração dos tokens do formato que o pedido contém. Desempata famílias. */
  cobertura: number;
  /** Quantos tokens casaram. Desempata dentro da mesma cobertura. */
  tokens: number;
}

const SEM_CITACAO: Citacao = { citado: false, cobertura: 0, tokens: 0 };

/**
 * O pedido nomeia este formato, e com que força?
 *
 * É o sinal mais forte do módulo, e o mais direto: quem escreve "faz um
 * antes e depois" não quer que o sistema delibere.
 *
 * O "com que força" não é preciosismo — é o que faz o catálogo real
 * responder. Sem ele, seis dos 53 formatos eram **impossíveis de pedir pelo
 * nome**, por duas razões diferentes:
 *
 * As FAMÍLIAS empatavam. "Antes e depois com página virando" casava com os
 * três containers que começam por "antes e depois", todos com a mesma nota,
 * e o desempate alfabético entregava sempre o irmão errado. Medindo
 * cobertura, o que casa 4 de 4 tokens vence o que casa 2 de 4.
 *
 * E os dois VOCABULÁRIOS divergem. O id de "Novo vs velho" é
 * `novo_vs_velho_comparativo`: "comparativo" está no id e não no nome, e
 * exigir cobertura sobre a união dos dois tornava o próprio nome
 * insuficiente. Por isso a medida é feita duas vezes — sobre os tokens do
 * id e sobre os do nome — e vale a melhor: os dois são formas legítimas de
 * chamar a mesma peça.
 */
function medirCitacao(c: CreativeContainer, briefNormalizado: string): Citacao {
  const conjuntos = [
    distintivos(c.id.split('_')),
    distintivos(normalizar(c.nome_pt).split(/[^a-z0-9]+/)),
  ].filter((t) => t.length > 0);
  if (conjuntos.length === 0) return SEM_CITACAO;

  let melhor = SEM_CITACAO;
  for (const tokens of conjuntos) {
    const casados = tokens.filter((t) => briefNormalizado.includes(t)).length;
    if (casados === 0) continue;
    const cobertura = casados / tokens.length;
    /*
     * Cobertura total vale por si — é a pessoa dizendo o nome inteiro da
     * peça. Abaixo disso são precisos dois tokens e metade do vocabulário,
     * senão uma palavra solta compartilhada entre dois formatos (um
     * "comentários" que aparece no nome de dois containers) elegeria o
     * primeiro em ordem alfabética.
     */
    const citado = cobertura === 1 || (casados >= 2 && cobertura >= 0.5);
    if (citado && (cobertura > melhor.cobertura
      || (cobertura === melhor.cobertura && casados > melhor.tokens))) {
      melhor = { citado: true, cobertura, tokens: casados };
    }
  }
  return melhor;
}

/** A copy pede ação? Container que proíbe CTA não serve a ela. */
function pareceTerCta(copy: string): boolean {
  const c = normalizar(copy);
  return /\b(agende|agendar|clique|clica|compre|comprar|garanta|garantir|chame|chamar|saiba|reserve|reservar|inscreva|cadastre|baixe|peca agora|fale com|whatsapp|link na bio)\b/.test(c);
}

/** Um ângulo vetado por este container? O veto é prosa; a busca é por palavra. */
function vetaOAngulo(c: CreativeContainer, angulo: string): boolean {
  const a = normalizar(angulo);
  if (!a.trim()) return false;
  /*
   * Os vetos são escritos como "qualquer angulo que exija par ANTES e
   * DEPOIS (...)" — frase inteira, com o termo decisivo em maiúsculas.
   * Casar frase com frase nunca funcionaria; o que funciona é procurar os
   * termos do ÂNGULO dentro do veto.
   */
  const termos = a.split(/[^a-z0-9]+/).filter((t) => t.length >= 5 && !GENERICAS.has(t));
  if (termos.length === 0) return false;
  return (c.angulos_vedados ?? []).some((v) => {
    const vn = normalizar(v);
    return termos.filter((t) => vn.includes(t)).length >= 2;
  });
}

/**
 * Pontua um container contra o pedido.
 *
 * Devolve `null` quando o container está fora de questão — proporção
 * diferente, ou ângulo vetado. Fora de questão não é nota baixa: é ausência
 * da lista, e é o que impede a troca manual de oferecer uma peça que o
 * catálogo declara incompatível.
 */
export function pontuarContainer(
  c: CreativeContainer,
  ctx: ContextoDaEscolha,
): ContainerPontuado | null {
  const ratio = (ctx.aspectRatio ?? '').trim();
  if (ratio && c.proporcao !== ratio) return null;
  if (ctx.angulo && vetaOAngulo(c, ctx.angulo)) return null;

  const brief = normalizar(ctx.brief);
  const copy = (ctx.copy ?? '').trim();
  const porques: string[] = [];
  const faltas: string[] = [];
  const citacao = medirCitacao(c, brief);
  let pontos = 0;

  if (citacao.citado) {
    pontos += 6;
    porques.push('você pediu este formato pelo nome');
  }

  /*
   * `tem_produto` e `tem_rosto` dizem o que a peça TEM no quadro. Quando a
   * peça tem produto e você anexou o produto, elas se encontram; quando a
   * peça tem produto e não há nenhum anexado, o gerador inventa um — que é
   * exatamente a arte que ninguém aprova.
   */
  if (c.tem_produto) {
    if (ctx.temProduto) { pontos += 2; porques.push('a peça mostra o produto, e você anexou um'); }
    else { pontos -= 3; faltas.push('uma foto do produto'); }
  }
  if (c.tem_rosto) {
    if (ctx.temPessoa) { pontos += 2; porques.push('a peça tem rosto no quadro, e você anexou pessoa'); }
    else { pontos -= 2; faltas.push('uma foto da pessoa que aparece'); }
  }

  /*
   * `exige` é o pré-requisito de PRODUÇÃO — "foto real de cobertura feita
   * por terceiro durante um encontro que de fato aconteceu". 42 dos 53 têm
   * um. Com a mão vazia, nenhum deles se sustenta.
   */
  const semAnexo = !ctx.temProduto && !ctx.temPessoa && !ctx.temReferencia;
  if ((c.exige?.length ?? 0) > 0 && semAnexo) {
    pontos -= 2;
    if (faltas.length === 0) faltas.push('material de origem — a peça parte de uma foto real');
  }

  if (copy) {
    const longa = copy.length >= 120;
    if (longa && c.densidade_texto === 'alta') { pontos += 2; porques.push('sua copy é longa e a peça comporta texto'); }
    if (longa && c.densidade_texto === 'baixa') pontos -= 2;
    if (!longa && c.densidade_texto === 'baixa') pontos += 1;
    if (pareceTerCta(copy) && c.presenca_de_cta === 'proibido') pontos -= 2;
  } else if (c.densidade_texto === 'baixa') {
    pontos += 1;
  }

  /*
   * Risco de reprovação é desempate, não veto: 12 dos 53 são alto risco e
   * alguns são justamente os mais fortes. Quem pedir um pelo nome leva.
   */
  if (c.risco_de_reprovacao === 'alto') pontos -= 1;

  // O nicho do exemplo aparece no pedido. Sinal fraco de propósito: nicho
  // não é formato, e um "antes e depois" serve à clínica e ao pet shop.
  const nicho = normalizar(c.exemplo_nicho ?? '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 6 && !GENERICAS.has(t));
  if (nicho.length > 0 && nicho.some((t) => brief.includes(t))) pontos += 1;

  return { container: c, pontos, porques, citacao, faltas };
}

/**
 * A escolha.
 *
 * O desempate é pelo id, e não pela ordem do catálogo: `catalog.ts` já
 * ordena por id justamente para que reordenar o `containers.json` não mude
 * em silêncio qual peça ganha o mesmo briefing.
 */
export function escolherContainer(
  ctx: ContextoDaEscolha,
  catalogo: CreativeContainer[] = CONTAINERS,
): EscolhaDeContainer {
  const pontuados = catalogo
    .map((c) => pontuarContainer(c, ctx))
    .filter((p): p is ContainerPontuado => p !== null)
    /*
     * Citado primeiro, e só depois a nota.
     *
     * Quem escreve "faz um carrinho de checkout" não está pedindo uma
     * deliberação. E a nota sozinha não dava conta: esse container tem
     * produto no quadro, tem pré-requisito de produção e é de risco alto —
     * com a mão vazia ele somava 0 mesmo tendo sido pedido pelo nome, e o
     * sistema respondia ignorando o pedido em silêncio.
     *
     * O que as penalidades viram, nesse caso, é `faltas`: o formato é o que
     * você pediu, e o que falta para ele ficar bom é dito, não decidido por
     * conta própria.
     */
    .sort((a, b) =>
      Number(b.citacao.citado) - Number(a.citacao.citado)
      // Dentro dos citados: quem casou o nome INTEIRO vence quem casou
      // metade dele. É o que separa os três "antes e depois" entre si.
      || b.citacao.cobertura - a.citacao.cobertura
      || b.citacao.tokens - a.citacao.tokens
      || b.pontos - a.pontos
      || a.container.id.localeCompare(b.container.id));

  const listaCurta = pontuados.slice(0, TAMANHO_DA_LISTA_CURTA);
  const melhor = pontuados[0];

  if (!melhor || (!melhor.citacao.citado && melhor.pontos < PONTOS_MINIMOS)) {
    /*
     * Sem escolha, mas COM lista.
     *
     * A troca manual continua possível mesmo quando o sistema preferiu não
     * decidir — que é o caso mais comum de quem quer um formato e não sabe
     * o nome dele. Não escolher é diferente de não ter o que oferecer.
     */
    return {
      container: null, porques: [], faltas: [], listaCurta, citado: false,
      foraDoFormato: citadoForaDoFormato(ctx, catalogo),
    };
  }

  return {
    container: melhor.container,
    porques: melhor.porques,
    faltas: melhor.faltas,
    listaCurta,
    citado: melhor.citacao.citado,
    foraDoFormato: null,
  };
}

/**
 * O formato citado existe, mas noutra proporção.
 *
 * Só é procurado quando a escolha deu em nada — se algum container passou,
 * o pedido foi atendido e não há divergência a relatar.
 */
function citadoForaDoFormato(
  ctx: ContextoDaEscolha,
  catalogo: CreativeContainer[],
): { nome: string; proporcao: string } | null {
  const ratio = (ctx.aspectRatio ?? '').trim();
  if (!ratio) return null;
  const brief = normalizar(ctx.brief);
  const achado = catalogo.find((c) => c.proporcao !== ratio && medirCitacao(c, brief).citado);
  return achado ? { nome: achado.nome_pt, proporcao: achado.proporcao } : null;
}
