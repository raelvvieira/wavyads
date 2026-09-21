/**
 * Uma campanha está veiculando, ou não?
 *
 * Parece uma pergunta de um campo só. Não é — e foi por isso que a tela
 * mentiu por meses. Um cliente clicou no filtro "Ativas" e recebeu seis
 * campanhas que já não rodavam; o rodapé somou aquelas seis e chamou o
 * resultado de "Total", e foi com esse número que ele olhou a verba.
 *
 * A causa: o sistema lia `status`, que é o botão liga/desliga da campanha.
 * O Gerenciador mostra outra coisa na coluna "Veiculação". E nem o
 * `effective_status` da campanha resolve sozinho: no nível de campanha ele
 * só assume ACTIVE, PAUSED, DELETED, ARCHIVED, IN_PROCESS e WITH_ISSUES —
 * ele NÃO muda quando os conjuntos estão pausados, que é justamente o caso
 * mais comum. Uma campanha ligada cujos conjuntos foram desligados continua
 * ACTIVE nos dois campos.
 *
 * Quem sabe a verdade é o ANÚNCIO: o `effective_status` dele carrega a
 * hierarquia inteira (CAMPAIGN_PAUSED, ADSET_PAUSED, DISAPPROVED,
 * PENDING_REVIEW, PENDING_BILLING_INFO). Uma campanha veicula se, e somente
 * se, tem ao menos um anúncio ACTIVE.
 *
 * Este módulo é puro de propósito. As edge functions rodam em Deno e ficam
 * fora do alcance do Vitest, então a borda só CONTA (devolve fatos crus e um
 * histograma) e a decisão mora aqui, onde os testes chegam. Mesmo padrão de
 * `creativesCardState.ts`.
 */

export type EstadoCampanha =
  | 'veiculando'
  | 'em_analise'
  | 'nao_aprovada'
  | 'sem_veiculacao'
  | 'fora_do_periodo'
  | 'verba_esgotada'
  | 'com_problemas'
  | 'pausada'
  | 'encerrada'
  /** A pergunta não pôde ser respondida — não é o mesmo que "não veicula". */
  | 'nao_confirmada'
  /** A Meta respondeu algo que este código não conhece. */
  | 'desconhecida';

export interface StatusCampanha {
  estado: EstadoCampanha;
  rotulo: string;
  /** Uma frase curta: por quê. Vai no tooltip e no card do mobile. */
  motivo: string | null;
  /** O `effective_status` cru. É o que encerra discussão com o cliente. */
  bruto: string | null;
  /**
   * A pergunta que o resto do sistema realmente faz.
   *
   * `true` entrega, `false` não entrega, **`null` não dá para afirmar**. O
   * `null` é o ponto do arquivo: hoje "não sei" vira silenciosamente `true`
   * ou `false`, e as duas versões já mentiram. Quem pergunta "está no ar?"
   * escreve `=== true`; quem pergunta "posso afirmar que parou?" escreve
   * `=== false`.
   */
  veiculando: boolean | null;
}

/** Quantos filhos de cada `effective_status`, por campanha. */
export type Histograma = Record<string, number>;

export interface Veiculacao {
  /** `null` = a chamada falhou. Ausência de dado nunca é ausência de entrega. */
  conjuntos: {
    por_status: Histograma;
    total: number;
    /** Maior `end_time` entre os conjuntos, ISO. */
    ultimo_fim: string | null;
    /** Algum conjunto sem data de término — ou seja, sem prazo para acabar. */
    algum_sem_fim: boolean;
  } | null;
  anuncios: { por_status: Histograma; total: number } | null;
  /** Alguma das listas veio truncada ou incompleta. */
  parcial: boolean;
}

export interface CampanhaBruta {
  efeito_bruto?: string | null;
  status_bruto?: string | null;
  /** Fim programado da própria campanha, ISO. */
  stop_time?: string | null;
  spend_cap?: number | null;
  budget_remaining?: number | null;
  veiculacao?: Veiculacao | null;
}

const ROTULOS: Record<EstadoCampanha, string> = {
  veiculando: 'Veiculando',
  em_analise: 'Em análise',
  nao_aprovada: 'Não aprovada',
  sem_veiculacao: 'Sem veiculação',
  fora_do_periodo: 'Fora do período',
  verba_esgotada: 'Verba esgotada',
  com_problemas: 'Com problemas',
  pausada: 'Pausada',
  encerrada: 'Encerrada',
  nao_confirmada: 'Veiculação não confirmada',
  desconhecida: 'Status não reconhecido',
};

/**
 * Quais estados significam "está entregando".
 *
 * Só um. A lista existe para que a resposta fique num lugar só — e para que
 * acrescentar um estado novo obrigue alguém a decidir de que lado ele cai.
 */
const ENTREGA: EstadoCampanha[] = ['veiculando'];
/** Estados em que a pergunta ficou sem resposta. */
const INDEFINIDOS: EstadoCampanha[] = ['nao_confirmada', 'desconhecida'];

function montar(estado: EstadoCampanha, bruto: string | null, motivo: string | null = null): StatusCampanha {
  return {
    estado,
    rotulo: ROTULOS[estado],
    motivo,
    bruto,
    veiculando: INDEFINIDOS.includes(estado) ? null : ENTREGA.includes(estado),
  };
}

/** Data no passado, com margem de um dia. */
function jaPassou(iso: string | null | undefined, agora: Date): boolean {
  if (!iso) return false;
  const fim = new Date(iso).getTime();
  if (Number.isNaN(fim)) return false;
  // `end_time` vem no fuso da conta de anúncios, e comparar com o relógio do
  // navegador erra por até um dia nas bordas. A margem faz errar para o lado
  // de NÃO afirmar, que é o lado certo.
  return fim + 24 * 60 * 60 * 1000 < agora.getTime();
}

function comoData(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('pt-BR');
}

/** Os `effective_status` de anúncio que este código sabe interpretar. */
const CONHECIDOS_DE_ANUNCIO = new Set([
  'ACTIVE', 'PAUSED', 'ADSET_PAUSED', 'CAMPAIGN_PAUSED', 'PENDING_REVIEW',
  'PREAPPROVED', 'DISAPPROVED', 'PENDING_BILLING_INFO', 'WITH_ISSUES',
  'IN_PROCESS', 'ARCHIVED', 'DELETED',
]);

function temDesconhecido(h: Histograma): boolean {
  return Object.keys(h).some((k) => !CONHECIDOS_DE_ANUNCIO.has(k));
}

export function derivarStatusCampanha(c: CampanhaBruta, agora = new Date()): StatusCampanha {
  const bruto = c.efeito_bruto ?? c.status_bruto ?? null;

  // 1. Terminal: a Meta não volta atrás.
  if (bruto === 'ARCHIVED') return montar('encerrada', bruto, 'arquivada na Meta');
  if (bruto === 'DELETED') return montar('encerrada', bruto, 'excluída na Meta');

  // 2. O botão da campanha está desligado. O que os filhos dizem não importa.
  if (bruto === 'PAUSED') return montar('pausada', bruto);

  // 3. A Meta sinalizou algo na própria campanha.
  if (bruto === 'WITH_ISSUES') return montar('com_problemas', bruto, 'a Meta sinalizou um problema nesta campanha');
  if (bruto === 'IN_PROCESS') return montar('em_analise', bruto, 'a Meta ainda está processando esta campanha');

  /*
   * 4. Desconhecido → desconhecido. NUNCA "encerrada".
   *
   * Havia um `|| "ended"` que transformava qualquer surpresa em "Encerrada".
   * É pior que o bug original: "Encerrada" é uma afirmação forte e falsa, a
   * campanha sumia dos alertas sem deixar rastro, e o valor que chegou era
   * apagado — ninguém nunca descobria qual era. Pior ainda: como a API não
   * devolve arquivadas por padrão, esse fallback era na prática o ÚNICO
   * produtor de "Encerrada" no sistema.
   */
  if (bruto !== 'ACTIVE') return montar('desconhecida', bruto, bruto ? `a Meta respondeu "${bruto}"` : 'a Meta não informou o status');

  // --- Daqui para baixo: campanha ligada. A pergunta é se algo roda. ---

  // 5. Teto de gasto batido.
  if ((c.spend_cap ?? 0) > 0 && c.budget_remaining === 0) {
    return montar('verba_esgotada', bruto, 'o limite de gastos da campanha foi atingido');
  }

  /*
   * 6. Período encerrado — ANTES de olhar os anúncios.
   *
   * Um conjunto vencido mantém o anúncio como ACTIVE na API, enquanto o
   * Gerenciador já mostra "Concluída". Sem este degrau, esse caso vira
   * exatamente o falso "Veiculando" que estamos eliminando. Vale para o fim
   * da própria campanha e para o dos conjuntos.
   */
  if (jaPassou(c.stop_time, agora)) {
    return montar('fora_do_periodo', bruto, `o período de veiculação terminou em ${comoData(c.stop_time)}`);
  }
  const conj = c.veiculacao?.conjuntos ?? null;
  if (conj && conj.total > 0 && !conj.algum_sem_fim && jaPassou(conj.ultimo_fim, agora)) {
    return montar('fora_do_periodo', bruto, `o período dos conjuntos terminou em ${comoData(conj.ultimo_fim)}`);
  }

  // 7. Sem filhos observáveis: não afirmo nada.
  const anun = c.veiculacao?.anuncios ?? null;
  if (!anun && !conj) {
    return montar('nao_confirmada', bruto, 'não consegui conferir os anúncios desta campanha');
  }

  // 8. Lista parcial e nenhum filho visto: é ausência de DADO, não de anúncio.
  const nenhumFilhoVisto = (anun?.total ?? 0) === 0 && (conj?.total ?? 0) === 0;
  if (c.veiculacao?.parcial && nenhumFilhoVisto) {
    return montar('nao_confirmada', bruto, 'a lista de anúncios veio incompleta');
  }

  // 9. Os anúncios — a fonte boa.
  if (anun) {
    const a = anun.por_status;
    if ((a.ACTIVE ?? 0) > 0) return montar('veiculando', bruto);
    if ((a.PENDING_REVIEW ?? 0) > 0 || (a.PREAPPROVED ?? 0) > 0) {
      return montar('em_analise', bruto, 'a Meta ainda está revisando os anúncios');
    }
    if ((a.DISAPPROVED ?? 0) > 0) return montar('nao_aprovada', bruto, 'os anúncios foram reprovados na revisão');
    if ((a.PENDING_BILLING_INFO ?? 0) > 0) return montar('com_problemas', bruto, 'aguardando dados de pagamento');
    // Um status que este código não conhece pode ser uma entrega. Concluir
    // "sem veiculação" aqui seria inventar uma resposta.
    if (temDesconhecido(a)) return montar('nao_confirmada', bruto, 'há anúncios num estado que não reconheço');
    if ((a.ADSET_PAUSED ?? 0) > 0) return montar('sem_veiculacao', bruto, 'a campanha está ligada, mas os conjuntos estão pausados');
    if ((a.PAUSED ?? 0) > 0) return montar('sem_veiculacao', bruto, 'a campanha está ligada, mas os anúncios estão pausados');
    if ((a.CAMPAIGN_PAUSED ?? 0) > 0) return montar('nao_confirmada', bruto, 'a Meta ainda está propagando uma mudança nesta campanha');
    if (anun.total === 0) return montar('sem_veiculacao', bruto, 'esta campanha não tem anúncios');
  }

  // 10. Só os conjuntos responderam.
  if (conj) {
    if ((conj.por_status.ACTIVE ?? 0) === 0) {
      return montar('sem_veiculacao', bruto, 'nenhum conjunto desta campanha está ativo');
    }
    return montar('nao_confirmada', bruto, 'os conjuntos estão ativos, mas não consegui conferir os anúncios');
  }

  return montar('nao_confirmada', bruto, null);
}

/**
 * O mesmo, um nível abaixo.
 *
 * É no anúncio que "não aprovada" e "em análise" existem de verdade — e é
 * aqui que o cliente vê, na peça, o motivo que a campanha anuncia em cima.
 * Antes isto era `ad.status === 'ACTIVE' ? 'active' : 'paused'`: um booleano
 * onde a Meta oferece onze valores.
 */
export function derivarStatusAnuncio(bruto: string | null | undefined): StatusCampanha {
  const v = bruto ?? null;
  switch (v) {
    case 'ACTIVE': return montar('veiculando', v);
    case 'PAUSED': return montar('pausada', v);
    case 'ADSET_PAUSED': return { ...montar('sem_veiculacao', v, 'o conjunto deste anúncio está pausado'), rotulo: 'Pausado pelo conjunto' };
    case 'CAMPAIGN_PAUSED': return { ...montar('sem_veiculacao', v, 'a campanha deste anúncio está pausada'), rotulo: 'Pausado pela campanha' };
    case 'PENDING_REVIEW':
    case 'PREAPPROVED': return montar('em_analise', v, 'a Meta ainda está revisando este anúncio');
    case 'IN_PROCESS': return montar('em_analise', v, 'a Meta ainda está processando este anúncio');
    case 'DISAPPROVED': return montar('nao_aprovada', v, 'reprovado na revisão da Meta');
    case 'PENDING_BILLING_INFO': return montar('com_problemas', v, 'aguardando dados de pagamento');
    case 'WITH_ISSUES': return montar('com_problemas', v, 'a Meta sinalizou um problema neste anúncio');
    case 'ARCHIVED':
    case 'DELETED': return montar('encerrada', v);
    default: return montar('desconhecida', v, v ? `a Meta respondeu "${v}"` : 'a Meta não informou o status');
  }
}

/**
 * O lado Google, que divide esta tabela e este selo.
 *
 * Ele tem o mesmo ponto cego — campanha ENABLED com todos os grupos de
 * anúncios pausados — e o plano de fechá-lo é uma rodada própria. Até lá,
 * `ENABLED` vira "veiculando" com a mesma fé de antes. O que muda já é o
 * que importa: `REMOVED` e desconhecido param de virar "Encerrada" por
 * acidente, pelo mesmo motivo do item 4 acima.
 */
export function derivarStatusGoogle(bruto: string | null | undefined): StatusCampanha {
  const v = bruto ?? null;
  switch (v) {
    case 'ENABLED': return montar('veiculando', v);
    case 'PAUSED': return montar('pausada', v);
    case 'REMOVED': return montar('encerrada', v, 'removida no Google Ads');
    default: return montar('desconhecida', v, v ? `o Google respondeu "${v}"` : 'o Google não informou o status');
  }
}

/** Os grupos do filtro da tabela. Onze botões não seriam um filtro. */
export type GrupoDeStatus = 'todas' | 'veiculando' | 'atencao' | 'pausadas' | 'encerradas';

const ATENCAO: EstadoCampanha[] = [
  'em_analise', 'nao_aprovada', 'sem_veiculacao', 'verba_esgotada',
  'com_problemas', 'nao_confirmada', 'desconhecida',
];

export function pertenceAoGrupo(status: StatusCampanha, grupo: GrupoDeStatus): boolean {
  switch (grupo) {
    case 'todas': return true;
    case 'veiculando': return status.veiculando === true;
    // O desconhecido fica VISÍVEL aqui, em vez de arquivado em "Encerradas".
    case 'atencao': return ATENCAO.includes(status.estado);
    case 'pausadas': return status.estado === 'pausada';
    case 'encerradas': return status.estado === 'encerrada' || status.estado === 'fora_do_periodo';
  }
}
