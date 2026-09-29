import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CampaignsTable } from './CampaignsTable';
import { derivarStatusCampanha } from '@/lib/campaignStatus';
import type { MetaCampaign } from '@/hooks/useMetaInsights';

function campanha(
  nome: string,
  bruto: Partial<Parameters<typeof derivarStatusCampanha>[0]>,
  spend = 100,
  extra: { id?: string; created_time?: string } = {},
): MetaCampaign {
  const cru = { efeito_bruto: 'ACTIVE', status_bruto: 'ACTIVE', ...bruto };
  return {
    id: extra.id ?? nome, name: nome, created_time: extra.created_time, ...cru,
    status: derivarStatusCampanha(cru),
    spend, budget: 0, impressions: 1000, reach: 500, clicks: 50,
    leads: 5, cpl: 20, purchases: 1, cost_per_purchase: 100,
    purchase_value: 300, purchase_roas: 3, results: 5, cost_per_result: 20,
    conversions: 5, ctr: 5, cpc: 2, cpm: 100, frequency: 1,
  } as MetaCampaign;
}

/** Atalho: descreve o estado dos filhos no formato que a borda devolve. */
const filhos = (p: { anuncioAtivo?: boolean; conjuntoAtivo?: boolean; problemas?: Record<string, number> }) => ({
  veiculacao: {
    tem_anuncio_ativo: p.anuncioAtivo ?? false,
    tem_conjunto_ativo: p.conjuntoAtivo ?? true,
    anuncios_com_problema: p.problemas ?? {},
    ultimo_fim: null,
    algum_sem_fim: true,
    truncado: false,
  },
});

function montar(campaigns: MetaCampaign[]) {
  return render(
    <TooltipProvider>
      <CampaignsTable campaigns={campaigns} />
    </TooltipProvider>,
  );
}

const linhas = (nome: string) => screen.queryAllByText(nome);

describe('CampaignsTable — o filtro que mentia', () => {
  const rodando = campanha('CAMPANHA QUE RODA', filhos({ anuncioAtivo: true }), 100);
  const parada = campanha('CORNEO SP SETEMBRO', filhos({ conjuntoAtivo: false }), 900);

  it('"Veiculando" não devolve campanha cujos conjuntos estão pausados', () => {
    // O relato: o cliente clicou em "Ativas" e recebeu seis campanhas que já
    // não rodavam. O teste antigo dessa tela não existia.
    montar([rodando, parada]);

    fireEvent.click(screen.getByRole('button', { name: 'Veiculando' }));

    expect(linhas('CAMPANHA QUE RODA').length).toBeGreaterThan(0);
    expect(linhas('CORNEO SP SETEMBRO')).toHaveLength(0);
  });

  it('a campanha parada aparece em "Precisam de atenção", com o motivo', () => {
    // Não basta sumir do "Veiculando": ela precisa aparecer em algum lugar,
    // senão o cliente perde de vista um problema que custa verba.
    montar([rodando, parada]);

    fireEvent.click(screen.getByRole('button', { name: 'Precisam de atenção' }));

    expect(linhas('CORNEO SP SETEMBRO').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sem veiculação').length).toBeGreaterThan(0);
  });

  it('"Todas" continua sem esconder nada', () => {
    montar([rodando, parada]);
    expect(linhas('CAMPANHA QUE RODA').length).toBeGreaterThan(0);
    expect(linhas('CORNEO SP SETEMBRO').length).toBeGreaterThan(0);
  });

  it('o rodapé passa a dizer QUE recorte ele está somando', () => {
    // Ele sempre somou a lista filtrada e sempre se chamou "Total". Com o
    // filtro ativo, o cliente lia um subtotal como se fosse o total da conta
    // — e era com esse número que olhava a verba.
    montar([rodando, parada]);

    expect(screen.getAllByText('Total / Média').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Veiculando' }));
    expect(screen.getAllByText(/Total \/ Média · Veiculando \(1 de 2\)/).length).toBeGreaterThan(0);
  });

  it('status desconhecido fica visível em "atenção", e não arquivado em "Encerradas"', () => {
    // O `|| "ended"` empurrava qualquer surpresa para "Encerrada", onde
    // ninguém olha.
    const estranha = campanha('CAMPANHA ESTRANHA', { efeito_bruto: 'FOO_BAR' });
    montar([estranha]);

    fireEvent.click(screen.getByRole('button', { name: 'Encerradas' }));
    expect(linhas('CAMPANHA ESTRANHA')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Precisam de atenção' }));
    expect(linhas('CAMPANHA ESTRANHA').length).toBeGreaterThan(0);
  });

  it('campanhas com o MESMO nome deixam de ser indistinguíveis', () => {
    // Duplicar campanha é rotina na Meta — a conta tem
    // `ACELERADORA - F - 28/09` e `— 2` lado a lado. A tabela mostrava só o
    // nome, então o cliente comparava com o Gerenciador, batia na duplicata
    // errada e concluía que o status estava mentindo.
    const antiga = campanha('CORNEO SP SETEMBRO', filhos({ anuncioAtivo: true }), 100, {
      id: '111', created_time: '2026-07-19T10:00:00Z',
    });
    const nova = campanha('CORNEO SP SETEMBRO', filhos({ conjuntoAtivo: false }), 50, {
      id: '222', created_time: '2026-09-01T10:00:00Z',
    });
    montar([antiga, nova]);

    // O ID é o que permite comparar com o Gerenciador sem ambiguidade.
    expect(screen.getAllByText(/ID 111/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ID 222/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/19\/07\/2026/).length).toBeGreaterThan(0);
  });

  it('nome único não ganha carimbo — o desempate só aparece quando há empate', () => {
    // Carimbar data e ID em toda linha seria ruído nas que não precisam.
    montar([campanha('CAMPANHA SOZINHA', filhos({ anuncioAtivo: true }), 100, { id: '999' })]);
    expect(screen.queryByText(/ID 999/)).toBeNull();
  });

  it('não quebra com um estado fora da união', () => {
    // O `Record` anterior estourava em `config.className` e derrubava a
    // tabela inteira. Um estado inesperado deve dar um selo feio, não uma
    // tela branca.
    const torta = { ...campanha('TORTA', {}), status: { estado: 'coisa_nova', rotulo: '?', motivo: null, bruto: 'X', veiculando: null } } as any;
    expect(() => montar([torta])).not.toThrow();
  });
});
