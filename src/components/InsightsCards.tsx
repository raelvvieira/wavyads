import { formatCurrency, formatNumber } from '@/data/mock';
import type { MetaCampaign } from '@/hooks/useMetaInsights';

interface InsightsCardsProps {
  campaigns: MetaCampaign[];
  totalSpend: number;
  totalLeads: number;
  totalResults: number;
  avgCpl: number;
  avgCpm: number;
  avgCtr: number;
}

interface InsightCard {
  emoji: string;
  title: string;
  description: string;
  color: 'green' | 'red' | 'yellow' | 'blue';
}

const borderColors = {
  green: 'border-emerald-500/40',
  red: 'border-red-500/40',
  yellow: 'border-amber-500/40',
  blue: 'border-blue-500/40',
};

const bgColors = {
  green: 'bg-emerald-500/5',
  red: 'bg-red-500/5',
  yellow: 'bg-amber-500/5',
  blue: 'bg-blue-500/5',
};

export function InsightsCards({ campaigns, totalSpend, totalLeads, totalResults, avgCpl, avgCpm, avgCtr }: InsightsCardsProps) {
  const insights: InsightCard[] = [];

  const activeCampaigns = campaigns.filter(c => c.status === 'active' && c.spend > 0);
  if (activeCampaigns.length === 0) return null;

  const totalClicks = activeCampaigns.reduce((s, c) => s + (c.clicks || 0), 0);
  const totalImpressions = activeCampaigns.reduce((s, c) => s + (c.impressions || 0), 0);
  const totalPurchases = activeCampaigns.reduce((s, c) => s + (c.purchases || 0), 0);

  // Best campaign by lowest cost_per_result
  const withResults = activeCampaigns.filter(c => c.results > 0 && c.cost_per_result > 0);
  if (withResults.length > 0) {
    const best = withResults.reduce((a, b) => a.cost_per_result < b.cost_per_result ? a : b);
    const pctSpend = totalSpend > 0 ? ((best.spend / totalSpend) * 100).toFixed(0) : '0';
    insights.push({
      emoji: '🏆',
      title: 'Melhor Campanha',
      description: `A campanha "${best.name}" apresenta o menor custo por resultado: ${formatCurrency(best.cost_per_result)}, com ${best.results} resultados gerados. Ela representa ${pctSpend}% do investimento total. Considere aumentar o orçamento desta campanha para escalar os resultados.`,
      color: 'green',
    });
  }

  // Worst campaign: spend with zero results
  const zeroResults = activeCampaigns.filter(c => c.results === 0 && c.spend > 10);
  if (zeroResults.length > 0) {
    const worst = zeroResults.reduce((a, b) => a.spend > b.spend ? a : b);
    insights.push({
      emoji: '🚨',
      title: 'Gasto sem Resultado',
      description: `A campanha "${worst.name}" consumiu ${formatCurrency(worst.spend)} sem gerar nenhum resultado. Isso representa desperdício de orçamento. Recomenda-se pausar imediatamente e realocar o investimento para campanhas com melhor desempenho.`,
      color: 'red',
    });
  } else if (withResults.length > 1) {
    const worst = withResults.reduce((a, b) => a.cost_per_result > b.cost_per_result ? a : b);
    const diff = best => worst.cost_per_result / best.cost_per_result;
    insights.push({
      emoji: '⚠️',
      title: 'Campanha Mais Cara',
      description: `A campanha "${worst.name}" tem o maior custo por resultado: ${formatCurrency(worst.cost_per_result)}, com apenas ${worst.results} resultados para ${formatCurrency(worst.spend)} investidos. Avalie se o público ou criativo precisa de ajustes.`,
      color: 'red',
    });
  }

  // Funnel health: CTR assessment
  if (totalImpressions > 0 && totalClicks > 0) {
    const overallCtr = (totalClicks / totalImpressions) * 100;
    if (overallCtr < 1) {
      insights.push({
        emoji: '📉',
        title: 'Saúde do Funil — CTR Baixo',
        description: `O CTR geral está em ${overallCtr.toFixed(2)}%, abaixo do benchmark de 1%. De ${formatNumber(totalImpressions)} impressões, apenas ${formatNumber(totalClicks)} cliques foram gerados. Isso sugere que os criativos ou a segmentação precisam de otimização para atrair mais cliques.`,
        color: 'red',
      });
    } else if (overallCtr >= 2) {
      insights.push({
        emoji: '🎯',
        title: 'CTR Acima da Média',
        description: `O CTR geral está em ${overallCtr.toFixed(2)}%, acima do benchmark de 1%. Os criativos estão performando bem em atrair cliques. Foque agora em otimizar a conversão pós-clique para maximizar resultados.`,
        color: 'green',
      });
    }
  }

  // Click → Lead conversion
  if (totalClicks > 0 && totalLeads > 0) {
    const clickToLead = (totalLeads / totalClicks) * 100;
    insights.push({
      emoji: '🔄',
      title: 'Conversão Clique → Lead',
      description: `De ${formatNumber(totalClicks)} cliques totais, ${formatNumber(totalLeads)} se tornaram leads — uma taxa de conversão de ${clickToLead.toFixed(1)}%. ${clickToLead < 3 ? 'A taxa está abaixo do ideal (3-5%). Revise a landing page e a proposta de valor.' : 'A taxa está saudável. Mantenha a estratégia atual.'}`,
      color: clickToLead < 3 ? 'yellow' : 'green',
    });
  }

  // Lead → Purchase conversion
  if (totalLeads > 0 && totalPurchases > 0) {
    const leadToPurchase = (totalPurchases / totalLeads) * 100;
    insights.push({
      emoji: '💰',
      title: 'Conversão Lead → Compra',
      description: `De ${formatNumber(totalLeads)} leads gerados, ${formatNumber(totalPurchases)} realizaram compra — taxa de ${leadToPurchase.toFixed(1)}%. ${leadToPurchase < 5 ? 'Considere implementar uma sequência de nutrição para reativar leads que não converteram.' : 'A taxa de fechamento está dentro do esperado.'}`,
      color: leadToPurchase < 5 ? 'yellow' : 'green',
    });
  }

  // High CPM
  if (avgCpm > 0) {
    const highCpm = activeCampaigns.filter(c => c.cpm > avgCpm * 2 && c.impressions > 100);
    if (highCpm.length > 0) {
      const worst = highCpm.reduce((a, b) => a.cpm > b.cpm ? a : b);
      insights.push({
        emoji: '💸',
        title: 'CPM Elevado',
        description: `A campanha "${worst.name}" tem CPM de ${formatCurrency(worst.cpm)}, mais que o dobro da média (${formatCurrency(avgCpm)}). Isso encarece toda a cadeia de aquisição. Teste públicos diferentes ou formatos de anúncio mais econômicos.`,
        color: 'yellow',
      });
    }
  }

  // Saturated audience
  const saturated = activeCampaigns.filter(c => c.frequency > 3);
  if (saturated.length > 0) {
    const top = saturated.reduce((a, b) => a.frequency > b.frequency ? a : b);
    insights.push({
      emoji: '🔁',
      title: 'Público Saturado',
      description: `A campanha "${top.name}" tem frequência de ${top.frequency.toFixed(1)}x — cada pessoa viu o anúncio mais de ${Math.floor(top.frequency)} vezes. Isso pode causar fadiga e aumentar custos. Renove os criativos ou expanda o público-alvo.`,
      color: 'yellow',
    });
  }

  // Campaign concentration
  if (withResults.length > 1) {
    const sorted = [...withResults].sort((a, b) => b.results - a.results);
    const topCampaign = sorted[0];
    const totalRes = sorted.reduce((s, c) => s + c.results, 0);
    const concentration = totalRes > 0 ? (topCampaign.results / totalRes) * 100 : 0;
    if (concentration > 60) {
      insights.push({
        emoji: '📊',
        title: 'Concentração de Resultados',
        description: `${concentration.toFixed(0)}% dos resultados vêm de uma única campanha ("${topCampaign.name}"). Alta dependência de uma campanha é arriscado. Diversifique investimentos para reduzir risco e descobrir novos públicos.`,
        color: 'blue',
      });
    }
  }

  // Scale opportunity
  if (withResults.length > 0) {
    const scalable = withResults.reduce((a, b) => a.cost_per_result < b.cost_per_result ? a : b);
    const avgCostPerResult = totalSpend / Math.max(1, totalResults);
    if (scalable.cost_per_result < avgCostPerResult * 0.8) {
      insights.push({
        emoji: '🚀',
        title: 'Oportunidade de Escala',
        description: `A campanha "${scalable.name}" performa ${((1 - scalable.cost_per_result / avgCostPerResult) * 100).toFixed(0)}% abaixo do custo médio por resultado, com ${formatCurrency(scalable.cost_per_result)}/resultado. Teste um aumento gradual de 20-30% no orçamento para validar se a eficiência se mantém.`,
        color: 'green',
      });
    }
  }

  if (insights.length === 0) return null;

  return (
    <div className="animate-fade-in space-y-4">
      <h3 className="text-lg font-semibold">💡 Insights & Recomendações</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {insights.map((insight, i) => (
          <div
            key={i}
            className={`rounded-xl border p-4 ${borderColors[insight.color]} ${bgColors[insight.color]}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">{insight.emoji}</span>
              <div className="min-w-0">
                <p className="font-semibold text-sm mb-1">{insight.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
