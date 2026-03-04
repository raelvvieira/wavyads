import { GlassCard } from './GlassCard';
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

  // Best campaign by lowest cost_per_result (with results > 0)
  const withResults = activeCampaigns.filter(c => c.results > 0 && c.cost_per_result > 0);
  if (withResults.length > 0) {
    const best = withResults.reduce((a, b) => a.cost_per_result < b.cost_per_result ? a : b);
    insights.push({
      emoji: '🏆',
      title: 'Melhor Campanha',
      description: `"${best.name}" tem o menor custo por resultado: ${formatCurrency(best.cost_per_result)} com ${best.results} resultados.`,
      color: 'green',
    });
  }

  // Worst campaign: highest cost_per_result or spend with zero results
  const zeroResults = activeCampaigns.filter(c => c.results === 0 && c.spend > 10);
  if (zeroResults.length > 0) {
    const worst = zeroResults.reduce((a, b) => a.spend > b.spend ? a : b);
    insights.push({
      emoji: '🚨',
      title: 'Gasto sem Resultado',
      description: `"${worst.name}" gastou ${formatCurrency(worst.spend)} sem gerar nenhum resultado. Considere pausar.`,
      color: 'red',
    });
  } else if (withResults.length > 1) {
    const worst = withResults.reduce((a, b) => a.cost_per_result > b.cost_per_result ? a : b);
    insights.push({
      emoji: '⚠️',
      title: 'Campanha Mais Cara',
      description: `"${worst.name}" tem o maior custo por resultado: ${formatCurrency(worst.cost_per_result)}.`,
      color: 'red',
    });
  }

  // CTR outlier (> 2x average)
  if (avgCtr > 0) {
    const highCtr = activeCampaigns.filter(c => c.ctr > avgCtr * 2 && c.impressions > 100);
    if (highCtr.length > 0) {
      const top = highCtr[0];
      insights.push({
        emoji: '🎯',
        title: 'CTR Excepcional',
        description: `"${top.name}" tem CTR de ${top.ctr.toFixed(2)}%, mais que o dobro da média (${avgCtr.toFixed(2)}%).`,
        color: 'blue',
      });
    }
  }

  // High CPM (> 2x average)
  if (avgCpm > 0) {
    const highCpm = activeCampaigns.filter(c => c.cpm > avgCpm * 2 && c.impressions > 100);
    if (highCpm.length > 0) {
      const worst = highCpm.reduce((a, b) => a.cpm > b.cpm ? a : b);
      insights.push({
        emoji: '💸',
        title: 'CPM Elevado',
        description: `"${worst.name}" tem CPM de ${formatCurrency(worst.cpm)}, mais que o dobro da média (${formatCurrency(avgCpm)}).`,
        color: 'yellow',
      });
    }
  }

  // Saturated audience (frequency > 3)
  const saturated = activeCampaigns.filter(c => c.frequency > 3);
  if (saturated.length > 0) {
    const top = saturated.reduce((a, b) => a.frequency > b.frequency ? a : b);
    insights.push({
      emoji: '🔄',
      title: 'Público Saturado',
      description: `"${top.name}" tem frequência de ${top.frequency.toFixed(1)}x. O público pode estar cansado do anúncio.`,
      color: 'yellow',
    });
  }

  // Scale suggestion
  if (withResults.length > 0) {
    const scalable = withResults.reduce((a, b) => a.cost_per_result < b.cost_per_result ? a : b);
    if (scalable.cost_per_result < avgCpl * 0.8 || (avgCpl === 0 && scalable.cost_per_result > 0)) {
      insights.push({
        emoji: '🚀',
        title: 'Oportunidade de Escala',
        description: `"${scalable.name}" performa bem com custo de ${formatCurrency(scalable.cost_per_result)}/resultado. Considere aumentar o orçamento.`,
        color: 'green',
      });
    }
  }

  if (insights.length === 0) return null;

  return (
    <GlassCard className="animate-fade-in">
      <h3 className="text-lg font-semibold mb-4">💡 Insights & Recomendações</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {insights.map((insight, i) => (
          <div
            key={i}
            className={`rounded-xl border p-4 ${borderColors[insight.color]} ${bgColors[insight.color]}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{insight.emoji}</span>
              <div className="min-w-0">
                <p className="font-semibold text-sm">{insight.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{insight.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
