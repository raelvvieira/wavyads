// Intelligence Engine — runs entirely on the frontend
// Processes Meta Ads data for all clients and returns prioritized flags + health scores

export interface IntelligenceFlag {
  id: string;
  type: 'tracking' | 'performance' | 'structure' | 'opportunity';
  priority: 'critical' | 'high' | 'medium' | 'low';
  icon: string;
  category: 'rastreio' | 'custo' | 'criativo' | 'estrutura' | 'escala';
  client: string;
  clientId: string;
  campaign: string;
  title: string;
  description: string;
  action: string;
  impact: string;
  metric: string;
  fix: string;
}

export interface CampaignData {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  leads: number;
  purchases: number;
  results: number;
  cost_per_result: number;
  result_type: string;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  conversions: number;
  budget: number;
  cpl: number;
  cost_per_purchase: number;
  // Extended fields
  created_time?: string;
  daily?: DailyData[];
}

export interface DailyData {
  date: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  leads: number;
  purchases: number;
  results: number;
}

export interface InsightsData {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  leads: number;
  purchases: number;
  results: number;
  cost_per_result: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  roas: number;
  daily: DailyData[];
}

export interface ClientInsightsData {
  client: { id: string; name: string };
  campaignsCurrent: CampaignData[];
  campaignsPrevious: CampaignData[];
  insightsCurrent: InsightsData | null;
  insightsPrevious: InsightsData | null;
  // Daily data for last 21 days for historical averages
  dailyHistory: DailyData[];
}

export interface ClientHealthScore {
  clientId: string;
  clientName: string;
  score: number;
  breakdown: {
    tracking: number;
    results: number;
    efficiency: number;
    structure: number;
  };
  flags: IntelligenceFlag[];
  campaigns: CampaignData[];
  totalSpend: number;
}

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function fmtCurrency(v: number): string {
  return `R$${v.toFixed(2).replace('.', ',')}`;
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// Compute week-1 metrics from daily data
function getWeek1Metrics(daily: DailyData[], createdTime?: string) {
  if (!daily.length) return null;
  // If we have created_time, use first 7 days from it
  // Otherwise use the first 7 entries
  const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date));
  const first7 = sorted.slice(0, 7);
  if (!first7.length) return null;
  const totalClicks = first7.reduce((s, d) => s + d.clicks, 0);
  const totalImpressions = first7.reduce((s, d) => s + d.impressions, 0);
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  return { ctr, clicks: totalClicks, impressions: totalImpressions };
}

// Compute average of 7-day windows from daily history
function computeHistoricalAvgCPR(daily: DailyData[]): number {
  if (!daily.length) return 0;
  const totalResults = daily.reduce((s, d) => s + d.results, 0);
  const totalSpend = daily.reduce((s, d) => s + d.spend, 0);
  if (totalResults === 0) return 0;
  return totalSpend / totalResults;
}

function computeHistoricalAvgROAS(daily: DailyData[]): number {
  // Without purchase value data, approximate from spend and purchases
  const totalPurchases = daily.reduce((s, d) => s + d.purchases, 0);
  const totalSpend = daily.reduce((s, d) => s + d.spend, 0);
  if (totalSpend === 0 || totalPurchases === 0) return 0;
  // We can't compute true ROAS without revenue; return 0 to skip this check
  return 0;
}

export function runIntelligenceEngine(clientsData: ClientInsightsData[]): {
  flags: IntelligenceFlag[];
  healthScores: ClientHealthScore[];
} {
  const allFlags: IntelligenceFlag[] = [];
  const healthScores: ClientHealthScore[] = [];
  let flagCounter = 0;

  for (const cd of clientsData) {
    const clientFlags: IntelligenceFlag[] = [];
    const clientName = cd.client.name;
    const clientId = cd.client.id;
    const campaigns = cd.campaignsCurrent;
    const prevCampaigns = cd.campaignsPrevious;
    const ins = cd.insightsCurrent;
    const prevIns = cd.insightsPrevious;
    const dailyHistory = cd.dailyHistory;

    // === BLOCO 1 — RASTREIO ===

    for (const camp of campaigns) {
      if (camp.status !== 'active') continue;

      // R1 — Gasto >R$200 com resultado = 0, CPM/impressões normais
      if (camp.spend > 200 && camp.results === 0 && camp.impressions > 1000 && camp.cpm > 0) {
        clientFlags.push({
          id: `flag-${++flagCounter}`,
          type: 'tracking',
          priority: 'critical',
          icon: '⛔',
          category: 'rastreio',
          client: clientName,
          clientId,
          campaign: camp.name,
          title: `${fmtCurrency(camp.spend)} gastos sem registrar nenhum resultado`,
          description: 'A Meta está entregando o anúncio normalmente — há impressões e cliques — mas nenhuma conversão está chegando de volta. O algoritmo está distribuindo para qualquer pessoa sem aprender quem converte. Isso não é problema de público nem de criativo — é ausência de dado.',
          action: 'Abrir o Events Manager e verificar se o evento de conversão está ativo e disparando. Usar o Meta Pixel Helper na página de destino. Verificar se a página de confirmação existe e se o evento está instalado nela.',
          impact: `Sem dados de conversão, o CPR real é infinito. ${fmtCurrency(camp.spend)} gastos sem aprendizado do algoritmo.`,
          metric: `Gasto: ${fmtCurrency(camp.spend)} | Resultados: 0 | Impressões: ${camp.impressions.toLocaleString('pt-BR')} | CPM: ${fmtCurrency(camp.cpm)}`,
          fix: 'pixel_setup',
        });
      }

      // R2 — Campanha que tinha resultado e zerou (need previous period data)
      const prevCamp = prevCampaigns.find(p => p.id === camp.id);
      if (prevCamp && prevCamp.results >= 3 && camp.results === 0 && camp.spend > 50) {
        // Had results before, now zero
        clientFlags.push({
          id: `flag-${++flagCounter}`,
          type: 'tracking',
          priority: 'critical',
          icon: '📉',
          category: 'rastreio',
          client: clientName,
          clientId,
          campaign: camp.name,
          title: `Pixel parou de registrar resultados`,
          description: 'Essa campanha tinha histórico consistente de resultados mas parou de registrar abruptamente. O gasto continua normal — impressões e cliques existem — o que confirma que o problema não é entrega.',
          action: 'Verificar se houve atualização no site. Confirmar se a URL da página de obrigado permanece a mesma. Testar o pixel com o Meta Pixel Helper. Verificar no Events Manager se o evento aparece como recente.',
          impact: `Budget continuando a ser gasto sem otimização — ${fmtCurrency(camp.spend)} no período sem resultado.`,
          metric: `Resultados período anterior: ${prevCamp.results} | Resultados atuais: 0 | Gasto atual: ${fmtCurrency(camp.spend)}`,
          fix: 'pixel_broken',
        });
      }

      // R3 — Volume de cliques incompatível com zero resultado
      if (camp.clicks > 400 && camp.results === 0) {
        clientFlags.push({
          id: `flag-${++flagCounter}`,
          type: 'tracking',
          priority: 'critical',
          icon: '🔍',
          category: 'rastreio',
          client: clientName,
          clientId,
          campaign: camp.name,
          title: `${camp.clicks} cliques sem nenhuma conversão registrada — pixel não está disparando`,
          description: 'Com esse volume de cliques na página de destino, a probabilidade estatística de zero conversões é praticamente nula. O pixel está instalado mas não está capturando as conversões.',
          action: 'Verificar se o evento dispara ao completar a ação e não ao carregar a página. Checar se há múltiplas versões do pixel causando conflito. Testar com o Pixel Helper se o evento aparece como "Fired" após a conversão real.',
          impact: `Custo por resultado real deveria existir com ${camp.clicks} cliques. Gasto perdido: ${fmtCurrency(camp.spend)}.`,
          metric: `Cliques: ${camp.clicks} | Conversões: 0 | Gasto: ${fmtCurrency(camp.spend)}`,
          fix: 'pixel_audit',
        });
      }

      // R4 — ROAS improvável
      const impliedROAS = camp.purchases > 0 && camp.spend > 0 ? (camp.cost_per_purchase * camp.purchases) / camp.spend : 0;
      if ((impliedROAS > 15 && camp.purchases < 5) || impliedROAS > 25) {
        clientFlags.push({
          id: `flag-${++flagCounter}`,
          type: 'tracking',
          priority: 'high',
          icon: '⚠️',
          category: 'rastreio',
          client: clientName,
          clientId,
          campaign: camp.name,
          title: `ROAS ${impliedROAS.toFixed(1)}x com apenas ${camp.purchases} compras — evento de conversão pode estar errado`,
          description: 'Um ROAS dessa magnitude com esse volume de dados é tecnicamente improvável. O mais comum é o evento configurado como conversão não ser uma compra real.',
          action: 'Acessar o conjunto de anúncios e verificar qual evento está configurado como conversão principal. Confirmar no Events Manager que o evento Purchase dispara apenas na página de confirmação de pedido.',
          impact: 'Decisões de escala baseadas em ROAS falso podem aumentar budget em campanha que não está convertendo de verdade.',
          metric: `ROAS: ${impliedROAS.toFixed(1)}x | Compras: ${camp.purchases}`,
          fix: 'wrong_event',
        });
      }

      // R5 — Campanha de mensagens com cliques mas sem conversas
      if (camp.result_type && camp.result_type.includes('messaging') && camp.clicks > 200 && camp.results === 0) {
        clientFlags.push({
          id: `flag-${++flagCounter}`,
          type: 'tracking',
          priority: 'high',
          icon: '💬',
          category: 'rastreio',
          client: clientName,
          clientId,
          campaign: camp.name,
          title: `${camp.clicks} cliques no anúncio sem nenhuma conversa registrada`,
          description: 'As pessoas estão clicando no anúncio mas nenhuma conversa está sendo registrada. Pode ser link de WhatsApp incorreto, número desativado, ou evento de conversa não configurado.',
          action: 'Testar o link de destino do anúncio manualmente. Verificar se o número de WhatsApp está correto e ativo. Confirmar que o evento de conversa iniciada está configurado.',
          impact: `${camp.clicks} cliques sem conversa. Gasto: ${fmtCurrency(camp.spend)}.`,
          metric: `Cliques: ${camp.clicks} | Conversas: 0`,
          fix: 'destination_check',
        });
      }
    }

    // === BLOCO 2 — PERFORMANCE ===

    const historicalCPR = computeHistoricalAvgCPR(dailyHistory);

    for (const camp of campaigns) {
      if (camp.status !== 'active') continue;
      if (camp.results < 5) continue; // Need minimum data

      // P1 — CPR aumentou >40% vs média histórica
      if (historicalCPR > 0 && camp.cost_per_result > 0) {
        const cprChange = pctChange(camp.cost_per_result, historicalCPR);
        if (cprChange > 40) {
          clientFlags.push({
            id: `flag-${++flagCounter}`,
            type: 'performance',
            priority: cprChange > 70 ? 'high' : 'medium',
            icon: '📈',
            category: 'custo',
            client: clientName,
            clientId,
            campaign: camp.name,
            title: `Custo por resultado subiu ${cprChange.toFixed(0)}% acima da média histórica`,
            description: 'O custo por resultado aumentou significativamente em relação ao histórico da própria campanha. Os dados estão chegando corretamente, o problema é eficiência.',
            action: `Verificar frequência — se acima de 3.5, o público está saturado. Se frequência estiver normal, revisar o criativo e testar variações. Checar se houve aumento de CPM.`,
            impact: `Custo adicional: ${fmtCurrency((camp.cost_per_result - historicalCPR) * camp.results)} no período.`,
            metric: `CPR atual: ${fmtCurrency(camp.cost_per_result)} | CPR médio: ${fmtCurrency(historicalCPR)} | Variação: +${cprChange.toFixed(0)}% | Frequência: ${camp.frequency.toFixed(1)}`,
            fix: 'optimize',
          });
        }
      }

      // P3 — CTR caiu >40% desde semana 1
      if (camp.daily && camp.daily.length > 0 && camp.impressions > 15000) {
        const week1 = getWeek1Metrics(camp.daily, camp.created_time);
        if (week1 && week1.ctr > 0) {
          const ctrChange = pctChange(camp.ctr, week1.ctr);
          if (ctrChange < -40) {
            clientFlags.push({
              id: `flag-${++flagCounter}`,
              type: 'performance',
              priority: 'medium',
              icon: '🎨',
              category: 'criativo',
              client: clientName,
              clientId,
              campaign: camp.name,
              title: `CTR caiu ${Math.abs(ctrChange).toFixed(0)}% desde o início — criativo com fadiga`,
              description: 'O CTR caindo progressivamente em relação ao início da campanha é o padrão clássico de fadiga de criativo.',
              action: 'Renovar pelo menos 2 variações de criativo mantendo o mesmo público e objetivo. Não pausar a campanha — trocar só o criativo.',
              impact: `CTR atual: ${camp.ctr.toFixed(2)}% vs semana 1: ${week1.ctr.toFixed(2)}%. Impressões acumuladas: ${camp.impressions.toLocaleString('pt-BR')}.`,
              metric: `CTR semana 1: ${week1.ctr.toFixed(2)}% | CTR atual: ${camp.ctr.toFixed(2)}% | Variação: ${ctrChange.toFixed(0)}%`,
              fix: 'creative',
            });
          }
        }
      }

      // P4 — Frequência alta com CTR em queda
      if (camp.frequency > 4.0 && camp.impressions > 20000 && camp.daily && camp.daily.length > 0) {
        const week1 = getWeek1Metrics(camp.daily, camp.created_time);
        if (week1 && week1.ctr > 0 && camp.ctr < week1.ctr * 0.6) {
          clientFlags.push({
            id: `flag-${++flagCounter}`,
            type: 'performance',
            priority: 'medium',
            icon: '🔄',
            category: 'criativo',
            client: clientName,
            clientId,
            campaign: camp.name,
            title: `Frequência ${camp.frequency.toFixed(1)} com CTR ${((1 - camp.ctr / week1.ctr) * 100).toFixed(0)}% abaixo do início — público saturado`,
            description: 'O mesmo público está vendo o anúncio muitas vezes e parando de clicar. A combinação de frequência alta com CTR em queda é o sinal mais claro de saturação.',
            action: 'Expandir o público — aumentar o range de Lookalike, adicionar novos interesses, ou criar um conjunto paralelo. Criar criativo novo em paralelo.',
            impact: `Frequência: ${camp.frequency.toFixed(1)} | CTR caindo de ${week1.ctr.toFixed(2)}% para ${camp.ctr.toFixed(2)}%.`,
            metric: `Frequência: ${camp.frequency.toFixed(1)} | CTR atual vs semana 1: ${camp.ctr.toFixed(2)}% vs ${week1.ctr.toFixed(2)}%`,
            fix: 'audience',
          });
        }
      }

      // P5 — CPM subiu >50% vs período anterior
      const prevCamp = prevCampaigns.find(p => p.id === camp.id);
      if (prevCamp && prevCamp.cpm > 0) {
        const cpmChange = pctChange(camp.cpm, prevCamp.cpm);
        if (cpmChange > 50 && (prevCamp.results === 0 || pctChange(camp.results, prevCamp.results) < cpmChange * 0.5)) {
          clientFlags.push({
            id: `flag-${++flagCounter}`,
            type: 'performance',
            priority: 'medium',
            icon: '💰',
            category: 'custo',
            client: clientName,
            clientId,
            campaign: camp.name,
            title: `CPM subiu ${cpmChange.toFixed(0)}% sem melhora de resultado — leilão mais caro`,
            description: 'O custo para alcançar 1.000 pessoas subiu significativamente sem que os resultados tenham acompanhado.',
            action: 'Verificar se o aumento de CPM é da conta toda ou de campanhas específicas. Se for específico, renovar criativo. Se for geral, avaliar período de alta concorrência.',
            impact: `CPM anterior: ${fmtCurrency(prevCamp.cpm)} → atual: ${fmtCurrency(camp.cpm)}.`,
            metric: `CPM atual: ${fmtCurrency(camp.cpm)} | CPM anterior: ${fmtCurrency(prevCamp.cpm)} | Variação: +${cpmChange.toFixed(0)}%`,
            fix: 'creative',
          });
        }
      }
    }

    // P2 — ROAS caiu >35% (account level)
    if (ins && prevIns && ins.purchases >= 8 && prevIns.roas > 0 && ins.roas > 0) {
      const roasChange = pctChange(ins.roas, prevIns.roas);
      if (roasChange < -35) {
        clientFlags.push({
          id: `flag-${++flagCounter}`,
          type: 'performance',
          priority: 'high',
          icon: '📊',
          category: 'custo',
          client: clientName,
          clientId,
          campaign: 'Conta geral',
          title: `ROAS caiu ${Math.abs(roasChange).toFixed(0)}% abaixo da média histórica da conta`,
          description: 'O ROAS está significativamente abaixo do que essa conta normalmente entrega.',
          action: 'Identificar qual campanha puxou o ROAS para baixo. Reduzir budget nas campanhas com pior ROAS e realocar para as que mantiveram eficiência.',
          impact: `ROAS anterior: ${prevIns.roas.toFixed(2)}x → atual: ${ins.roas.toFixed(2)}x.`,
          metric: `ROAS atual: ${ins.roas.toFixed(2)}x | ROAS anterior: ${prevIns.roas.toFixed(2)}x | Variação: ${roasChange.toFixed(0)}%`,
          fix: 'budget',
        });
      }
    }

    // === BLOCO 3 — ESTRUTURA ===

    const activeCampaigns = campaigns.filter(c => c.status === 'active');
    const totalSpend = activeCampaigns.reduce((s, c) => s + c.spend, 0);

    // E1 — Nenhuma campanha de retargeting
    const hasRetargeting = activeCampaigns.some(c =>
      c.name.toLowerCase().includes('retarget') ||
      c.name.toLowerCase().includes('remarketing') ||
      c.name.toLowerCase().includes('rmkt') ||
      c.name.toLowerCase().includes('remarket')
    );
    if (activeCampaigns.length > 0 && !hasRetargeting) {
      clientFlags.push({
        id: `flag-${++flagCounter}`,
        type: 'structure',
        priority: 'medium',
        icon: '🎯',
        category: 'estrutura',
        client: clientName,
        clientId,
        campaign: 'Conta geral',
        title: 'Nenhum budget em retargeting — público quente sendo ignorado',
        description: 'Todo o budget está indo para aquisição de público frio. Quem já visitou o site, interagiu com o perfil ou engajou com os anúncios não está sendo impactado.',
        action: 'Criar campanhas separadas para visitantes do site nos últimos 7 e 30 dias, engajados no Instagram e Facebook nos últimos 60 dias. Budget inicial recomendado: 20% do gasto total atual.',
        impact: `Budget total: ${fmtCurrency(totalSpend)} — 0% em retargeting.`,
        metric: `Campanhas ativas: ${activeCampaigns.length} | Budget total: ${fmtCurrency(totalSpend)} | Retargeting: 0%`,
        fix: 'structure',
      });
    }

    // E2 — 100% do budget concentrado em uma única campanha
    if (activeCampaigns.length > 1) {
      const maxSpendCamp = activeCampaigns.reduce((max, c) => c.spend > max.spend ? c : max, activeCampaigns[0]);
      const pctConcentration = totalSpend > 0 ? (maxSpendCamp.spend / totalSpend) * 100 : 0;
      if (pctConcentration > 85) {
        clientFlags.push({
          id: `flag-${++flagCounter}`,
          type: 'structure',
          priority: 'medium',
          icon: '⚖️',
          category: 'estrutura',
          client: clientName,
          clientId,
          campaign: maxSpendCamp.name,
          title: `${pctConcentration.toFixed(0)}% do budget em uma campanha só — conta sem diversificação`,
          description: 'Concentrar quase todo o budget em uma campanha única cria dependência total de uma única segmentação e criativo.',
          action: 'Distribuir o budget em pelo menos 2 ou 3 campanhas com públicos ou objetivos diferentes.',
          impact: `${fmtCurrency(maxSpendCamp.spend)} de ${fmtCurrency(totalSpend)} em "${maxSpendCamp.name}".`,
          metric: `Concentração: ${pctConcentration.toFixed(0)}% | Campanhas ativas: ${activeCampaigns.length}`,
          fix: 'structure',
        });
      }
    }

    // E3 — Campanha presa em aprendizado
    for (const camp of activeCampaigns) {
      // Estimate days active from daily data length or created_time
      const daysActive = camp.daily ? camp.daily.length : 14;
      if (daysActive >= 14 && camp.conversions < 50) {
        clientFlags.push({
          id: `flag-${++flagCounter}`,
          type: 'structure',
          priority: 'medium',
          icon: '🔁',
          category: 'estrutura',
          client: clientName,
          clientId,
          campaign: camp.name,
          title: `Campanha em aprendizado há ${daysActive} dias — algoritmo sem dados suficientes`,
          description: 'A Meta precisa de pelo menos 50 conversões por semana por conjunto de anúncios para sair da fase de aprendizado.',
          action: 'Consolidar conjuntos de anúncios — menos conjuntos com mais budget. Avaliar se o evento de conversão não é raro demais.',
          impact: `${camp.conversions} conversões em ${daysActive} dias — média de ${(camp.conversions / (daysActive / 7)).toFixed(1)}/semana.`,
          metric: `Dias ativos: ${daysActive} | Conversões totais: ${camp.conversions} | Média semanal: ${(camp.conversions / (daysActive / 7)).toFixed(1)}`,
          fix: 'learning',
        });
      }
    }

    // E4 — Oportunidade de escala
    // Check ROAS stability over 3 weeks from daily data
    if (dailyHistory.length >= 21 && ins && ins.purchases >= 20) {
      const weeks = [dailyHistory.slice(0, 7), dailyHistory.slice(7, 14), dailyHistory.slice(14, 21)];
      const weekSpends = weeks.map(w => w.reduce((s, d) => s + d.spend, 0));
      const weekPurchases = weeks.map(w => w.reduce((s, d) => s + d.purchases, 0));

      // Simple stability check: all weeks have purchases and spend variation is low
      if (weekPurchases.every(p => p > 0) && weekSpends.every(s => s > 0)) {
        const avgSpend = weekSpends.reduce((a, b) => a + b, 0) / 3;
        const maxVariation = Math.max(...weekSpends.map(s => Math.abs(pctChange(s, avgSpend))));
        if (maxVariation < 20) {
          clientFlags.push({
            id: `flag-${++flagCounter}`,
            type: 'opportunity',
            priority: 'low',
            icon: '🚀',
            category: 'escala',
            client: clientName,
            clientId,
            campaign: 'Conta geral',
            title: 'ROAS estável por 3 semanas — conta pronta para escalar',
            description: 'O algoritmo está maduro e os resultados estão consistentes. Há espaço para crescer sem comprometer a eficiência.',
            action: 'Aumentar budget em 15-20% a cada 7 dias nas campanhas com ROAS mais consistente. Duplicar a melhor campanha com variação de público.',
            impact: `Receita incremental estimada escalando 20% do budget.`,
            metric: `Gasto semanal: ${weekSpends.map(s => fmtCurrency(s)).join(' → ')} | Compras: ${weekPurchases.join(' → ')}`,
            fix: 'scale',
          });
        }
      }
    }

    // === HEALTH SCORE ===
    const hasTrackingCritical = clientFlags.some(f => f.type === 'tracking' && f.priority === 'critical');
    const hasTrackingFlags = clientFlags.some(f => f.type === 'tracking');

    const trackingScore = !hasTrackingFlags ? 35 : (hasTrackingCritical ? 0 : 15);

    const campaignsWithResults = activeCampaigns.filter(c => c.results > 0).length;
    const totalActiveCamps = activeCampaigns.length;
    const resultPct = totalActiveCamps > 0 ? campaignsWithResults / totalActiveCamps : 1;
    const resultScore = resultPct >= 1 ? 25 : (resultPct > 0.5 ? 15 : 5);

    const hasCPRIssue = clientFlags.some(f => f.fix === 'optimize');
    const efficiencyScore = !hasCPRIssue ? 20 : (historicalCPR > 0 ? 10 : 0);

    const retargetingScore = hasRetargeting ? 10 : 0;
    const concentrationOk = !clientFlags.some(f => f.fix === 'structure' && f.title.includes('budget'));
    const learningOk = activeCampaigns.some(c => c.conversions >= 50);
    const structureScore = retargetingScore + (concentrationOk ? 5 : 0) + (learningOk ? 5 : 0);

    const score = Math.min(100, Math.max(0, trackingScore + resultScore + efficiencyScore + structureScore));

    healthScores.push({
      clientId,
      clientName,
      score,
      breakdown: {
        tracking: trackingScore,
        results: resultScore,
        efficiency: efficiencyScore,
        structure: structureScore,
      },
      flags: clientFlags,
      campaigns: activeCampaigns,
      totalSpend,
    });

    allFlags.push(...clientFlags);
  }

  // Sort flags by priority
  allFlags.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  healthScores.sort((a, b) => a.score - b.score);

  return { flags: allFlags, healthScores };
}
