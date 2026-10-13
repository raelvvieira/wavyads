import type { StatusCampanha } from './campaignStatus';

/**
 * Em que condições os status desta tela estão sendo lidos.
 *
 * O frontend e as edge functions sobem por caminhos diferentes: um sai no
 * build, as outras precisam de deploy manual. Quando a função no ar é a
 * antiga, o payload traz um status COLAPSADO — `active`/`paused`/`ended` —
 * que diz apenas se a chave da campanha está ligada. Ele não sabe se há
 * anúncio no ar, não enxerga conjunto pausado, não distingue reprovado de
 * em análise.
 *
 * O sistema continua funcionando nesse modo, de propósito: a ponte de
 * compatibilidade existe para a tela não quebrar enquanto o deploy não
 * acontece. O que faltava era DIZER isso. Sem o aviso, quem filtra por
 * "Veiculando" e recebe zero conclui que o sistema perdeu as campanhas — e
 * reporta o mesmo problema toda semana, porque a tela nunca admitiu o
 * limite em que está operando.
 */

/**
 * O teto de campanhas da função antiga.
 *
 * A versão nova pede 500; a antiga para em 200. Uma lista que volta com
 * exatamente este tamanho bateu no teto — e, numa conta com mais campanhas
 * que isso, as que ficaram de fora podem ser justamente as ativas, porque a
 * Meta não devolve as ativas primeiro.
 */
export const TETO_LEGADO_DE_CAMPANHAS = 200;

export interface DiagnosticoDaIntegracao {
  /** O payload chegou no formato antigo, sem o status bruto da Meta. */
  modoLegado: boolean;
  /** A lista bateu no teto: há campanhas que nem chegaram à tela. */
  truncada: boolean;
  total: number;
}

/**
 * Lê as condições a partir do que já está na tela.
 *
 * `status.bruto` é o valor que a Meta respondeu. A ponte do formato antigo
 * nunca o preenche — ela não tem o que preencher. Então todas as campanhas
 * com `bruto` nulo é a assinatura de que a função no ar é a antiga.
 */
export function diagnosticarCampanhas(
  campanhas: { status: StatusCampanha }[],
): DiagnosticoDaIntegracao {
  const total = campanhas.length;
  if (total === 0) return { modoLegado: false, truncada: false, total };

  const modoLegado = campanhas.every((c) => c.status?.bruto == null);
  return {
    modoLegado,
    // Só afirma truncamento no modo legado: é o único em que se conhece o
    // teto. Na função nova o corte vem declarado pelo servidor.
    truncada: modoLegado && total >= TETO_LEGADO_DE_CAMPANHAS,
    total,
  };
}

/** O que dizer na tela, em uma frase. `null` quando não há nada a dizer. */
export function avisoDaIntegracao(d: DiagnosticoDaIntegracao): string | null {
  if (!d.modoLegado) return null;
  const limite = d.truncada
    ? ` A lista também parou em ${TETO_LEGADO_DE_CAMPANHAS} campanhas, então pode haver campanhas ativas que nem chegaram aqui.`
    : '';
  return 'A integração com a Meta está numa versão antiga: o status diz apenas se a '
    + 'campanha está ligada, não se ela está entregando.' + limite;
}

/**
 * O mesmo diagnóstico, um nível abaixo.
 *
 * No formato antigo o anúncio chega como `active`/`paused` — a chave DELE,
 * e só. Um anúncio ligado dentro de uma campanha pausada continua chegando
 * como `active`, porque o payload antigo não carrega a hierarquia. É por
 * isso que a galeria mostra, em "Veiculando", criativos de campanhas que já
 * foram desligadas: não é a leitura que erra, é o dado que não existe.
 *
 * O valor que resolve isso é o `effective_status` do ANÚNCIO, que a Meta
 * devolve com `CAMPAIGN_PAUSED` e `ADSET_PAUSED` dentro. Ele não vem na
 * resposta antiga.
 */
export function diagnosticarAnuncios(
  anuncios: { status: StatusCampanha }[],
): DiagnosticoDaIntegracao {
  const total = anuncios.length;
  if (total === 0) return { modoLegado: false, truncada: false, total };
  return { modoLegado: anuncios.every((a) => a.status?.bruto == null), truncada: false, total };
}

/** O que dizer na galeria de criativos. `null` quando não há o que dizer. */
export function avisoDosAnuncios(d: DiagnosticoDaIntegracao): string | null {
  if (!d.modoLegado) return null;
  return 'A integração com a Meta está numa versão antiga: aqui "Veiculando" significa que o '
    + 'ANÚNCIO está ligado — ele pode estar dentro de uma campanha ou de um conjunto já pausado.';
}
