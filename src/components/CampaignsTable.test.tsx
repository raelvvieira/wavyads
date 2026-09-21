import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CampaignsTable } from './CampaignsTable';
import { derivarStatusCampanha } from '@/lib/campaignStatus';
import type { MetaCampaign } from '@/hooks/useMetaInsights';

function campanha(nome: string, bruto: Partial<Parameters<typeof derivarStatusCampanha>[0]>, spend = 100): MetaCampaign {
  const cru = { efeito_bruto: 'ACTIVE', status_bruto: 'ACTIVE', ...bruto };
  return {
    id: nome, name: nome, ...cru,
    status: derivarStatusCampanha(cru),
    spend, budget: 0, impressions: 1000, reach: 500, clicks: 50,
    leads: 5, cpl: 20, purchases: 1, cost_per_purchase: 100,
    purchase_value: 300, purchase_roas: 3, results: 5, cost_per_result: 20,
    conversions: 5, ctr: 5, cpc: 2, cpm: 100, frequency: 1,
  } as MetaCampaign;
}

const filhos = (por_status: Record<string, number>) => ({
  veiculacao: {
    anuncios: { por_status, total: Object.values(por_status).reduce((s, n) => s + n, 0) },
    conjuntos: { por_status: { ACTIVE: 1 }, total: 1, ultimo_fim: null, algum_sem_fim: true },
    parcial: false,
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
  const rodando = campanha('CAMPANHA QUE RODA', filhos({ ACTIVE: 2 }), 100);
  const parada = campanha('CORNEO SP SETEMBRO', filhos({ ADSET_PAUSED: 4 }), 900);

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

  it('não quebra com um estado fora da união', () => {
    // O `Record` anterior estourava em `config.className` e derrubava a
    // tabela inteira. Um estado inesperado deve dar um selo feio, não uma
    // tela branca.
    const torta = { ...campanha('TORTA', {}), status: { estado: 'coisa_nova', rotulo: '?', motivo: null, bruto: 'X', veiculando: null } } as any;
    expect(() => montar([torta])).not.toThrow();
  });
});
