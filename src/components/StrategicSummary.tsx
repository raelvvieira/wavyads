import { GlassCard } from './GlassCard';
import { formatCurrency, formatNumber } from '@/data/mock';
import type { MetaCampaign } from '@/hooks/useMetaInsights';

interface StrategicSummaryProps {
  clientName: string;
  period: string;
  totalSpend: number;
  totalLeads: number;
  totalResults: number;
  totalPurchases: number;
  avgCpl: number;
  costPerResult: number;
  campaigns: MetaCampaign[];
}

export function StrategicSummary({
  clientName, period, totalSpend, totalLeads, totalResults, totalPurchases,
  avgCpl, costPerResult, campaigns,
}: StrategicSummaryProps) {
  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const withResults = campaigns.filter(c => c.results > 0 && c.cost_per_result > 0);
  const bestCampaign = withResults.length > 0
    ? withResults.reduce((a, b) => a.cost_per_result < b.cost_per_result ? a : b)
    : null;

  const periodLabel: Record<string, string> = {
    '7d': 'últimos 7 dias',
    '30d': 'últimos 30 dias',
    '90d': 'últimos 90 dias',
  };
  const periodText = periodLabel[period] || period;

  const paragraphs: string[] = [];

  // Overview
  paragraphs.push(
    `Nos ${periodText}, ${clientName} investiu ${formatCurrency(totalSpend)} em ${activeCampaigns.length} campanha${activeCampaigns.length !== 1 ? 's' : ''} ativa${activeCampaigns.length !== 1 ? 's' : ''}, gerando ${formatNumber(totalResults)} resultado${totalResults !== 1 ? 's' : ''} com custo médio de ${formatCurrency(costPerResult)} por resultado.`
  );

  // Best campaign
  if (bestCampaign) {
    paragraphs.push(
      `A campanha de melhor desempenho foi "${bestCampaign.name}", com ${bestCampaign.results} resultados a ${formatCurrency(bestCampaign.cost_per_result)} cada.`
    );
  }

  // Leads detail
  if (totalLeads > 0) {
    paragraphs.push(
      `Foram gerados ${formatNumber(totalLeads)} leads a um CPL de ${formatCurrency(avgCpl)}.`
    );
  }

  // Purchases detail
  if (totalPurchases > 0) {
    const avgCostPurchase = totalSpend > 0 && totalPurchases > 0 ? totalSpend / totalPurchases : 0;
    paragraphs.push(
      `${formatNumber(totalPurchases)} compra${totalPurchases !== 1 ? 's' : ''} ${totalPurchases !== 1 ? 'foram registradas' : 'foi registrada'}.`
    );
  }

  // Zero-result campaigns
  const zeroResult = campaigns.filter(c => c.results === 0 && c.spend > 10 && c.status === 'active');
  if (zeroResult.length > 0) {
    paragraphs.push(
      `⚠️ ${zeroResult.length} campanha${zeroResult.length !== 1 ? 's' : ''} ${zeroResult.length !== 1 ? 'estão' : 'está'} ativa${zeroResult.length !== 1 ? 's' : ''} sem gerar resultados — considere revisá-la${zeroResult.length !== 1 ? 's' : ''} ou pausá-la${zeroResult.length !== 1 ? 's' : ''}.`
    );
  }

  return (
    <GlassCard className="animate-fade-in">
      <h3 className="text-lg font-semibold mb-4">📊 Resumo Estratégico</h3>
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </GlassCard>
  );
}
