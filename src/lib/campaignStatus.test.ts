import { describe, expect, it } from 'vitest';
import {
  derivarStatusCampanha,
  derivarStatusAnuncio,
  derivarStatusGoogle,
  pertenceAoGrupo,
  type CampanhaBruta,
  type Histograma,
} from './campaignStatus';

const HOJE = new Date('2026-09-21T12:00:00Z');

function campanha(patch: Partial<CampanhaBruta> = {}): CampanhaBruta {
  return { efeito_bruto: 'ACTIVE', status_bruto: 'ACTIVE', ...patch };
}

function comAnuncios(por_status: Histograma, patch: Partial<CampanhaBruta> = {}): CampanhaBruta {
  const total = Object.values(por_status).reduce((s, n) => s + n, 0);
  return campanha({
    veiculacao: {
      anuncios: { por_status, total },
      conjuntos: { por_status: { ACTIVE: 1 }, total: 1, ultimo_fim: null, algum_sem_fim: true },
      parcial: false,
    },
    ...patch,
  });
}

describe('derivarStatusCampanha', () => {
  it('campanha ligada com todos os conjuntos pausados NÃO aparece como veiculando', () => {
    // O relato: o cliente clicou no filtro "Ativas" e recebeu seis campanhas
    // que já não rodavam. Nem `status` nem `effective_status` da campanha
    // mudam quando os conjuntos são desligados — só o anúncio sabe.
    const s = derivarStatusCampanha(comAnuncios({ ADSET_PAUSED: 4 }), HOJE);

    expect(s.veiculando).toBe(false);
    expect(s.estado).toBe('sem_veiculacao');
    expect(s.rotulo).not.toBe('Veiculando');
    // O cliente precisa saber POR QUÊ, senão troca um mistério por outro.
    expect(s.motivo).toContain('conjuntos');
  });

  it('status desconhecido não vira nem Veiculando nem Encerrada, e a evidência sobrevive', () => {
    // Havia um `|| "ended"` engolindo qualquer surpresa. "Encerrada" é uma
    // afirmação forte e falsa: a campanha sumia dos alertas e ninguém nunca
    // descobria qual valor tinha chegado.
    const s = derivarStatusCampanha(campanha({ efeito_bruto: 'FUTURO_QUE_A_META_INVENTOU' }), HOJE);

    expect(s.estado).toBe('desconhecida');
    expect(s.veiculando).toBeNull(); // não é `false`: é "não sei"
    expect(s.bruto).toBe('FUTURO_QUE_A_META_INVENTOU');
    expect(s.motivo).toContain('FUTURO_QUE_A_META_INVENTOU');
  });

  it('um anúncio ativo entre nove pausados basta para veicular', () => {
    const s = derivarStatusCampanha(comAnuncios({ ACTIVE: 1, PAUSED: 9 }), HOJE);
    expect(s.veiculando).toBe(true);
    expect(s.rotulo).toBe('Veiculando');
  });

  it('a campanha pausada é pausada, mesmo com anúncios ativos dentro', () => {
    // O botão da campanha manda. A Meta às vezes demora a propagar o estado
    // para os filhos, e acreditar neles aqui inverteria a verdade.
    const s = derivarStatusCampanha(comAnuncios({ ACTIVE: 3 }, { efeito_bruto: 'PAUSED' }), HOJE);
    expect(s.estado).toBe('pausada');
    expect(s.veiculando).toBe(false);
  });

  it('em análise tem precedência sobre reprovado', () => {
    // Enquanto houver peça em revisão, a campanha ainda pode entrar no ar.
    const s = derivarStatusCampanha(comAnuncios({ PENDING_REVIEW: 1, DISAPPROVED: 2 }), HOJE);
    expect(s.estado).toBe('em_analise');
  });

  it('tudo reprovado vira "Não aprovada" — que é diferente de "Pausada"', () => {
    // Chamar isto de pausa seria esconder que alguém precisa AGIR.
    const s = derivarStatusCampanha(comAnuncios({ DISAPPROVED: 3 }), HOJE);
    expect(s.estado).toBe('nao_aprovada');
    expect(s.motivo).toContain('reprovados');
  });

  it('chamada de filhos que falhou NÃO vira "sem veiculação"', () => {
    // Ausência de dado nunca pode virar ausência de entrega. Este é o ramo
    // que impede o conserto de criar uma mentira nova.
    const s = derivarStatusCampanha(
      campanha({ veiculacao: { anuncios: null, conjuntos: null, parcial: false } }),
      HOJE,
    );
    expect(s.estado).toBe('nao_confirmada');
    expect(s.veiculando).toBeNull();
  });

  it('lista truncada sem filho nenhum também é "não confirmada"', () => {
    // Uma campanha cujos anúncios ficaram fora do corte apareceria como
    // "sem anúncios" — mentira nova, criada pelo conserto.
    const s = derivarStatusCampanha(
      campanha({
        veiculacao: {
          anuncios: { por_status: {}, total: 0 },
          conjuntos: { por_status: {}, total: 0, ultimo_fim: null, algum_sem_fim: false },
          parcial: true,
        },
      }),
      HOJE,
    );
    expect(s.estado).toBe('nao_confirmada');
  });

  it('status de anúncio que este código não conhece não deixa concluir "parou"', () => {
    // A chave desconhecida pode ser uma entrega. Mesmo princípio, um nível
    // abaixo.
    const s = derivarStatusCampanha(comAnuncios({ ALGO_NOVO: 2 }), HOJE);
    expect(s.estado).toBe('nao_confirmada');
    expect(s.veiculando).toBeNull();
  });

  it('conjuntos vencidos vencem anúncios ACTIVE — a API não desliga o filho', () => {
    // Um conjunto com fim no passado mantém o anúncio como ACTIVE, enquanto
    // o Gerenciador já mostra "Concluída". Sem este degrau, o caso vira
    // exatamente o falso "Veiculando" que estamos eliminando.
    const s = derivarStatusCampanha(
      campanha({
        veiculacao: {
          anuncios: { por_status: { ACTIVE: 2 }, total: 2 },
          conjuntos: { por_status: { ACTIVE: 1 }, total: 1, ultimo_fim: '2026-08-30T00:00:00Z', algum_sem_fim: false },
          parcial: false,
        },
      }),
      HOJE,
    );
    expect(s.estado).toBe('fora_do_periodo');
    expect(s.motivo).toContain('30/08');
  });

  it('um conjunto sem data de término impede a conclusão de "fora do período"', () => {
    const s = derivarStatusCampanha(
      campanha({
        veiculacao: {
          anuncios: { por_status: { ACTIVE: 1 }, total: 1 },
          conjuntos: { por_status: { ACTIVE: 2 }, total: 2, ultimo_fim: '2026-08-30T00:00:00Z', algum_sem_fim: true },
          parcial: false,
        },
      }),
      HOJE,
    );
    expect(s.estado).toBe('veiculando');
  });

  it('fim de ontem não conta — a margem de um dia protege o fuso da conta', () => {
    // `end_time` vem no fuso da conta de anúncios; comparar com o relógio do
    // navegador erra por até um dia nas bordas. Errar para o lado de não
    // afirmar é o lado certo.
    const ontem = new Date(HOJE.getTime() - 20 * 60 * 60 * 1000).toISOString();
    const s = derivarStatusCampanha(campanha({ stop_time: ontem }), HOJE);
    expect(s.estado).not.toBe('fora_do_periodo');
  });

  it('teto de gasto batido tem nome próprio', () => {
    const s = derivarStatusCampanha(campanha({ spend_cap: 1000, budget_remaining: 0 }), HOJE);
    expect(s.estado).toBe('verba_esgotada');
  });

  it('arquivada e excluída são encerradas, e dizem qual das duas', () => {
    expect(derivarStatusCampanha(campanha({ efeito_bruto: 'ARCHIVED' }), HOJE).motivo).toContain('arquivada');
    expect(derivarStatusCampanha(campanha({ efeito_bruto: 'DELETED' }), HOJE).motivo).toContain('excluída');
  });

  it('campanha sem anúncio nenhum diz exatamente isso', () => {
    const s = derivarStatusCampanha(
      campanha({
        veiculacao: {
          anuncios: { por_status: {}, total: 0 },
          conjuntos: { por_status: { ACTIVE: 1 }, total: 1, ultimo_fim: null, algum_sem_fim: true },
          parcial: false,
        },
      }),
      HOJE,
    );
    expect(s.estado).toBe('sem_veiculacao');
    expect(s.motivo).toContain('não tem anúncios');
  });

  it('todo caminho devolve um estado com rótulo — nenhum cai no vazio', () => {
    const casos: CampanhaBruta[] = [
      campanha(),
      campanha({ efeito_bruto: null, status_bruto: null }),
      campanha({ efeito_bruto: 'IN_PROCESS' }),
      campanha({ efeito_bruto: 'WITH_ISSUES' }),
      comAnuncios({ CAMPAIGN_PAUSED: 2 }),
      comAnuncios({ PENDING_BILLING_INFO: 1 }),
    ];
    for (const caso of casos) {
      const s = derivarStatusCampanha(caso, HOJE);
      expect(s.rotulo).toBeTruthy();
      expect(s.estado).toBeTruthy();
    }
  });
});

describe('derivarStatusAnuncio', () => {
  it('diz de onde veio a pausa — a mesma verdade que a campanha anuncia em cima', () => {
    expect(derivarStatusAnuncio('ADSET_PAUSED').rotulo).toBe('Pausado pelo conjunto');
    expect(derivarStatusAnuncio('CAMPAIGN_PAUSED').rotulo).toBe('Pausado pela campanha');
  });

  it('reprovado e em análise deixam de virar apenas "pausado"', () => {
    // Era `ad.status === 'ACTIVE' ? 'active' : 'paused'` — um booleano onde a
    // Meta oferece onze valores, e onde mora o que exige ação.
    expect(derivarStatusAnuncio('DISAPPROVED').estado).toBe('nao_aprovada');
    expect(derivarStatusAnuncio('PENDING_REVIEW').estado).toBe('em_analise');
    expect(derivarStatusAnuncio('PENDING_BILLING_INFO').estado).toBe('com_problemas');
  });

  it('desconhecido continua desconhecido, com o valor à vista', () => {
    const s = derivarStatusAnuncio('ALGO_NOVO');
    expect(s.estado).toBe('desconhecida');
    expect(s.veiculando).toBeNull();
    expect(s.bruto).toBe('ALGO_NOVO');
  });
});

describe('derivarStatusGoogle', () => {
  it('REMOVED e desconhecido param de virar "Encerrada" por acidente', () => {
    expect(derivarStatusGoogle('REMOVED').estado).toBe('encerrada');
    const s = derivarStatusGoogle('ALGO_NOVO');
    expect(s.estado).toBe('desconhecida');
    expect(s.veiculando).toBeNull();
  });

  it('ENABLED e PAUSED seguem como eram', () => {
    expect(derivarStatusGoogle('ENABLED').veiculando).toBe(true);
    expect(derivarStatusGoogle('PAUSED').estado).toBe('pausada');
  });
});

describe('pertenceAoGrupo', () => {
  const sem = derivarStatusCampanha(comAnuncios({ ADSET_PAUSED: 2 }), HOJE);
  const rodando = derivarStatusCampanha(comAnuncios({ ACTIVE: 1 }), HOJE);
  const desconhecida = derivarStatusCampanha(campanha({ efeito_bruto: 'XPTO' }), HOJE);

  it('"Veiculando" devolve só o que entrega de verdade', () => {
    // O filtro que mentia. Era `c.status === 'active'`.
    expect(pertenceAoGrupo(rodando, 'veiculando')).toBe(true);
    expect(pertenceAoGrupo(sem, 'veiculando')).toBe(false);
    expect(pertenceAoGrupo(desconhecida, 'veiculando')).toBe(false);
  });

  it('o desconhecido fica VISÍVEL em "Precisam de atenção", não arquivado', () => {
    expect(pertenceAoGrupo(desconhecida, 'atencao')).toBe(true);
    expect(pertenceAoGrupo(desconhecida, 'encerradas')).toBe(false);
    expect(pertenceAoGrupo(sem, 'atencao')).toBe(true);
  });

  it('"Todas" não esconde nada', () => {
    for (const s of [sem, rodando, desconhecida]) {
      expect(pertenceAoGrupo(s, 'todas')).toBe(true);
    }
  });
});
