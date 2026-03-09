// Intelligence Engine v2 — Deep Analysis with 5 Layers
// Processes Meta Ads data and returns prioritized flags + health scores

export interface MetricComparison {
  label: string;
  atual: string;
  historico: string;
  variacao: string;
}

export interface IntelligenceFlag {
  id: string;
  type: 'tracking' | 'performance' | 'creative' | 'structure' | 'opportunity';
  priority: 'critical' | 'high' | 'medium' | 'low';
  icon: string;
  category: 'rastreio' | 'funil' | 'custo' | 'criativo' | 'estrutura' | 'escala';
  client: string;
  clientId: string;
  campaign: string;
  adName: string | null;
  title: string;
  diagnosis: string;
  metrics: MetricComparison[];
  action: string;
  impact: number;
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
  created_time?: string;
  daily?: DailyData[];
  landing_page_views?: number;
  add_to_cart?: number;
  initiate_checkout?: number;
}

export interface AdData {
  id: string;
  name: string;
  status: string;
  campaign_id: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  results: number;
  cost_per_result: number;
  result_type: string;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  video_3s_views: number;
  video_thruplay: number;
  hook_rate: number;
  hold_rate: number;
}

export interface DailyData {
  date: string;
  date_raw?: string;
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
  landing_page_views?: number;
  add_to_cart?: number;
  initiate_checkout?: number;
}

export interface ClientInsightsData {
  client: { id: string; name: string };
  campaignsCurrent: CampaignData[];
  campaignsPrevious: CampaignData[];
  insightsCurrent: InsightsData | null;
  insightsPrevious: InsightsData | null;
  dailyHistory: DailyData[];
  adsCurrent?: AdData[];
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

// ==================== HELPERS ====================

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function fmt(v: number): string {
  return `R$${v.toFixed(2).replace('.', ',')}`;
}

function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`;
}

function fmtNum(v: number): string {
  return v.toLocaleString('pt-BR');
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function computeHistoricalAvgCPR(daily: DailyData[]): number {
  if (!daily.length) return 0;
  const totalResults = daily.reduce((s, d) => s + d.results, 0);
  const totalSpend = daily.reduce((s, d) => s + d.spend, 0);
  if (totalResults === 0) return 0;
  return totalSpend / totalResults;
}

function computeHistoricalAvgCTR(daily: DailyData[]): number {
  if (!daily.length) return 0;
  const totalClicks = daily.reduce((s, d) => s + d.clicks, 0);
  const totalImpressions = daily.reduce((s, d) => s + d.impressions, 0);
  if (totalImpressions === 0) return 0;
  return (totalClicks / totalImpressions) * 100;
}

function computeConversionRate(daily: DailyData[]): number {
  if (!daily.length) return 0;
  const totalResults = daily.reduce((s, d) => s + d.results, 0);
  const totalClicks = daily.reduce((s, d) => s + d.clicks, 0);
  if (totalClicks === 0) return 0;
  return (totalResults / totalClicks) * 100;
}

// ==================== MAIN ENGINE ====================

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
    const ads = cd.adsCurrent || [];
    const activeCampaigns = campaigns.filter(c => c.status === 'active');
    const totalSpend = activeCampaigns.reduce((s, c) => s + c.spend, 0);
    const historicalCPR = computeHistoricalAvgCPR(dailyHistory);
    const historicalCTR = computeHistoricalAvgCTR(dailyHistory);
    const historicalConvRate = computeConversionRate(dailyHistory);

    // Track which flag types we've generated per client to deduplicate
    const generatedTypes = new Map<string, IntelligenceFlag>();

    function addFlag(flag: Omit<IntelligenceFlag, 'id'>) {
      const dedupeKey = `${flag.type}-${flag.fix}`;
      const existing = generatedTypes.get(dedupeKey);
      if (existing) {
        // Keep the one with higher impact
        if (flag.impact > existing.impact) {
          // Remove old, add new
          const idx = clientFlags.indexOf(existing);
          if (idx >= 0) clientFlags.splice(idx, 1);
        } else {
          return; // skip, existing has more impact
        }
      }
      const newFlag: IntelligenceFlag = { ...flag, id: `flag-${++flagCounter}` };
      clientFlags.push(newFlag);
      generatedTypes.set(dedupeKey, newFlag);
    }

    // ==================== LAYER 1 — TRACKING ====================

    for (const camp of activeCampaigns) {
      // R1 — Spend > R$200 with zero results, normal delivery
      if (camp.spend > 200 && camp.results === 0 && camp.impressions > 1000 && camp.cpm > 0) {
        addFlag({
          type: 'tracking', priority: 'critical', icon: '⛔', category: 'rastreio',
          client: clientName, clientId, campaign: camp.name, adName: null,
          title: `${fmt(camp.spend)} gastos sem nenhum resultado — pixel não está disparando`,
          diagnosis: 'A Meta está entregando normalmente (CPM e impressões existem), mas nenhuma conversão retorna. O pixel de conversão não está instalado ou não está disparando na página correta.',
          metrics: [
            { label: 'Gasto', atual: fmt(camp.spend), historico: '—', variacao: '—' },
            { label: 'Resultados', atual: '0', historico: '—', variacao: '∞' },
            { label: 'Impressões', atual: fmtNum(camp.impressions), historico: '—', variacao: 'Entrega normal' },
            { label: 'CPM', atual: fmt(camp.cpm), historico: '—', variacao: 'Funcionando' },
          ],
          action: `Verificar no Events Manager se o evento de conversão está ativo para "${camp.name}". Usar o Meta Pixel Helper na página de destino para confirmar disparo.`,
          impact: camp.spend,
          fix: 'pixel_setup',
        });
      }

      // R2 — High clicks with zero conversions
      if (camp.clicks > 400 && camp.results === 0 && camp.spend > 0) {
        addFlag({
          type: 'tracking', priority: 'critical', icon: '🔍', category: 'rastreio',
          client: clientName, clientId, campaign: camp.name, adName: null,
          title: `${fmtNum(camp.clicks)} cliques sem nenhuma conversão — pixel instalado mas não disparando`,
          diagnosis: 'Com esse volume de cliques, zero conversões é estatisticamente impossível. O pixel está instalado mas pode estar disparando no momento errado ou na página errada.',
          metrics: [
            { label: 'Link Clicks', atual: fmtNum(camp.clicks), historico: '—', variacao: '—' },
            { label: 'Conversões', atual: '0', historico: '—', variacao: '—' },
            { label: 'Gasto', atual: fmt(camp.spend), historico: '—', variacao: '—' },
            { label: 'CPC', atual: fmt(camp.cpc), historico: '—', variacao: 'Tráfego real' },
          ],
          action: `Auditar o pixel em "${camp.name}": verificar se o evento dispara ao completar a ação (não ao carregar a página). Checar múltiplas versões do pixel causando conflito.`,
          impact: camp.spend,
          fix: 'pixel_audit',
        });
      }

      // R3 — Results zeroed after consistent history
      const prevCamp = prevCampaigns.find(p => p.id === camp.id);
      if (prevCamp && prevCamp.results >= 3 && camp.results === 0 && camp.spend > 50) {
        // Check last 5 days from daily
        const last5 = (dailyHistory || []).slice(-5);
        const last5Results = last5.reduce((s, d) => s + d.results, 0);
        const avgHistorical = prevCamp.results;

        addFlag({
          type: 'tracking', priority: 'critical', icon: '📉', category: 'rastreio',
          client: clientName, clientId, campaign: camp.name, adName: null,
          title: `Resultados zeraram após média de ${avgHistorical}/semana — pixel quebrou`,
          diagnosis: 'Campanha tinha histórico consistente mas parou abruptamente. Provável atualização no site quebrou a página de conversão ou o código do pixel.',
          metrics: [
            { label: 'Resultados anteriores', atual: '0', historico: String(avgHistorical), variacao: '-100%' },
            { label: 'Gasto atual', atual: fmt(camp.spend), historico: fmt(prevCamp.spend), variacao: 'Continua' },
            { label: 'Últimos 5 dias', atual: String(last5Results), historico: '—', variacao: '—' },
          ],
          action: `Verificar se houve atualização no site. Confirmar URL da página de obrigado. Testar pixel com Meta Pixel Helper em "${camp.name}".`,
          impact: camp.spend,
          fix: 'pixel_broken',
        });
      }

      // R4 — Technically impossible ROAS
      const impliedROAS = camp.purchases > 0 && camp.spend > 0
        ? (camp.cost_per_purchase * camp.purchases) / camp.spend : 0;
      if ((impliedROAS > 15 && camp.purchases < 5) || impliedROAS > 25) {
        addFlag({
          type: 'tracking', priority: 'high', icon: '⚠️', category: 'rastreio',
          client: clientName, clientId, campaign: camp.name, adName: null,
          title: `ROAS ${impliedROAS.toFixed(1)}x com ${camp.purchases} compras — evento de conversão suspeito`,
          diagnosis: 'Um ROAS dessa magnitude com esse volume é tecnicamente improvável. Provavelmente o evento configurado como conversão não é uma compra real (ViewContent ou InitiateCheckout contando como Purchase).',
          metrics: [
            { label: 'ROAS reportado', atual: `${impliedROAS.toFixed(1)}x`, historico: '—', variacao: 'Suspeito' },
            { label: 'Compras', atual: String(camp.purchases), historico: '—', variacao: 'Volume baixo' },
            { label: 'Valor médio implícito', atual: fmt(camp.cost_per_purchase), historico: '—', variacao: '—' },
          ],
          action: `Verificar no conjunto de anúncios de "${camp.name}" qual evento está como conversão principal. Confirmar no Events Manager que Purchase dispara apenas na confirmação de pedido.`,
          impact: camp.spend * 0.5,
          fix: 'wrong_event',
        });
      }

      // R5 — Messaging campaign without conversations
      if (camp.result_type && camp.result_type.includes('messaging') && camp.clicks > 200 && camp.results === 0) {
        addFlag({
          type: 'tracking', priority: 'high', icon: '💬', category: 'rastreio',
          client: clientName, clientId, campaign: camp.name, adName: null,
          title: `${fmtNum(camp.clicks)} cliques sem nenhuma conversa registrada`,
          diagnosis: 'Pessoas clicam no anúncio mas nenhuma conversa é registrada. Pode ser link de WhatsApp incorreto, número desativado, ou evento de conversa não configurado.',
          metrics: [
            { label: 'Cliques', atual: fmtNum(camp.clicks), historico: '—', variacao: '—' },
            { label: 'Conversas', atual: '0', historico: '—', variacao: '—' },
            { label: 'Gasto', atual: fmt(camp.spend), historico: '—', variacao: '—' },
          ],
          action: `Testar manualmente o link de destino de "${camp.name}". Verificar se o número de WhatsApp está correto e ativo.`,
          impact: camp.spend,
          fix: 'destination_check',
        });
      }
    }

    // ==================== LAYER 2 — FUNNEL ====================

    for (const camp of activeCampaigns) {
      if (camp.clicks < 300) continue;

      const currentConvRate = camp.clicks > 0 ? (camp.results / camp.clicks) * 100 : 0;

      // F1 — High CTR with low conversion
      if (historicalCTR > 0 && historicalConvRate > 0 && camp.ctr > historicalCTR && currentConvRate < historicalConvRate * 0.5) {
        addFlag({
          type: 'performance', priority: 'high', icon: '🔀', category: 'funil',
          client: clientName, clientId, campaign: camp.name, adName: null,
          title: `CTR ${camp.ctr.toFixed(2)}% acima da média mas conversão ${currentConvRate.toFixed(2)}% caiu ${Math.abs(pctChange(currentConvRate, historicalConvRate)).toFixed(0)}%`,
          diagnosis: 'O anúncio atrai cliques mas a página de destino ou oferta não convence. O problema não é o criativo — é o que vem depois do clique.',
          metrics: [
            { label: 'CTR', atual: `${camp.ctr.toFixed(2)}%`, historico: `${historicalCTR.toFixed(2)}%`, variacao: fmtPct(pctChange(camp.ctr, historicalCTR)) },
            { label: 'Taxa conversão', atual: `${currentConvRate.toFixed(2)}%`, historico: `${historicalConvRate.toFixed(2)}%`, variacao: fmtPct(pctChange(currentConvRate, historicalConvRate)) },
          ],
          action: `Revisar landing page de "${camp.name}": oferta, preço, congruência entre anúncio e página. O criativo está atraindo o público certo — o funil pós-clique precisa de ajuste.`,
          impact: camp.spend * (1 - currentConvRate / historicalConvRate),
          fix: 'optimize',
        });
      }

      // F2 — Low CTR with high conversion
      if (historicalCTR > 0 && historicalConvRate > 0 && camp.ctr < historicalCTR * 0.6 && currentConvRate > historicalConvRate) {
        const potentialResults = (camp.impressions * (historicalCTR / 100) * (currentConvRate / 100));
        addFlag({
          type: 'performance', priority: 'medium', icon: '💎', category: 'funil',
          client: clientName, clientId, campaign: camp.name, adName: null,
          title: `CTR baixo (${camp.ctr.toFixed(2)}%) mas quem clica converte ${currentConvRate.toFixed(2)}% — oportunidade de escala`,
          diagnosis: 'Quem clica converte bem, mas o anúncio não gera volume suficiente de cliques. Oportunidade clara de escalar com criativo novo mantendo o mesmo público.',
          metrics: [
            { label: 'CTR', atual: `${camp.ctr.toFixed(2)}%`, historico: `${historicalCTR.toFixed(2)}%`, variacao: fmtPct(pctChange(camp.ctr, historicalCTR)) },
            { label: 'Taxa conversão', atual: `${currentConvRate.toFixed(2)}%`, historico: `${historicalConvRate.toFixed(2)}%`, variacao: fmtPct(pctChange(currentConvRate, historicalConvRate)) },
            { label: 'Resultados potenciais', atual: String(camp.results), historico: String(Math.round(potentialResults)), variacao: `+${Math.round(potentialResults - camp.results)}` },
          ],
          action: `Testar novos hooks e criativos para "${camp.name}" mantendo o mesmo público. O funil funciona — precisa de mais volume no topo.`,
          impact: (potentialResults - camp.results) * (camp.cost_per_result || 0),
          fix: 'creative',
        });
      }

      // F3 — Low landing page rate
      if (camp.landing_page_views && camp.landing_page_views > 0 && camp.clicks > 0) {
        const lpRate = (camp.landing_page_views / camp.clicks) * 100;
        if (lpRate < 70) {
          addFlag({
            type: 'performance', priority: 'high', icon: '🐌', category: 'funil',
            client: clientName, clientId, campaign: camp.name, adName: null,
            title: `Apenas ${lpRate.toFixed(0)}% dos cliques carregam a página — ${camp.clicks - camp.landing_page_views} pessoas perdidas`,
            diagnosis: 'Problema técnico de velocidade ou redirect. Pessoas clicam mas a página não carrega a tempo.',
            metrics: [
              { label: 'Link Clicks', atual: fmtNum(camp.clicks), historico: '—', variacao: '—' },
              { label: 'Landing Page Views', atual: fmtNum(camp.landing_page_views), historico: '—', variacao: '—' },
              { label: 'Taxa de carregamento', atual: `${lpRate.toFixed(0)}%`, historico: '>85%', variacao: `${(lpRate - 85).toFixed(0)}%` },
            ],
            action: `Otimizar velocidade da landing page de "${camp.name}". Testar com PageSpeed Insights. Verificar redirects desnecessários.`,
            impact: (camp.clicks - camp.landing_page_views) * (camp.cpc || 0),
            fix: 'page_speed',
          });
        }
      }

      // F4 — High abandonment cart to checkout
      if (camp.add_to_cart && camp.add_to_cart > 0 && camp.initiate_checkout !== undefined) {
        const icRate = camp.initiate_checkout! / camp.add_to_cart;
        if (icRate < 0.4) {
          const lost = camp.add_to_cart - (camp.initiate_checkout || 0);
          addFlag({
            type: 'performance', priority: 'high', icon: '🛒', category: 'funil',
            client: clientName, clientId, campaign: camp.name, adName: null,
            title: `${fmtNum(lost)} abandonos entre carrinho e checkout — taxa ATC→IC de ${(icRate * 100).toFixed(0)}%`,
            diagnosis: 'Produto interessa mas algo no fluxo de carrinho impede a conversão. Frete, opções de pagamento ou UX do carrinho.',
            metrics: [
              { label: 'Add to Cart', atual: fmtNum(camp.add_to_cart), historico: '—', variacao: '—' },
              { label: 'Initiate Checkout', atual: fmtNum(camp.initiate_checkout || 0), historico: '—', variacao: '—' },
              { label: 'Taxa ATC→IC', atual: `${(icRate * 100).toFixed(0)}%`, historico: '>40%', variacao: `${((icRate - 0.4) * 100).toFixed(0)}%` },
            ],
            action: `Revisar experiência do carrinho: frete, opções de pagamento, elementos de confiança.`,
            impact: lost * (camp.cost_per_result || camp.cpc || 0),
            fix: 'optimize',
          });
        }
      }

      // F5 — High abandonment checkout to purchase
      if (camp.initiate_checkout && camp.initiate_checkout > 0 && camp.purchases !== undefined) {
        const purchaseRate = camp.purchases / camp.initiate_checkout;
        if (purchaseRate < 0.35) {
          const lost = camp.initiate_checkout - camp.purchases;
          addFlag({
            type: 'performance', priority: 'high', icon: '💳', category: 'funil',
            client: clientName, clientId, campaign: camp.name, adName: null,
            title: `${fmtNum(lost)} abandonos entre checkout e compra — taxa IC→Purchase de ${(purchaseRate * 100).toFixed(0)}%`,
            diagnosis: 'Pessoas chegam ao checkout mas não finalizam. Problemas comuns: métodos de pagamento, custo de frete revelado tarde, falta de elementos de confiança.',
            metrics: [
              { label: 'Initiate Checkout', atual: fmtNum(camp.initiate_checkout), historico: '—', variacao: '—' },
              { label: 'Purchases', atual: fmtNum(camp.purchases), historico: '—', variacao: '—' },
              { label: 'Taxa IC→Purchase', atual: `${(purchaseRate * 100).toFixed(0)}%`, historico: '>35%', variacao: `${((purchaseRate - 0.35) * 100).toFixed(0)}%` },
            ],
            action: `Verificar métodos de pagamento, custo de frete visível antecipadamente, elementos de confiança na página de checkout.`,
            impact: lost * (camp.cost_per_purchase || camp.cost_per_result || 0),
            fix: 'optimize',
          });
        }
      }
    }

    // ==================== LAYER 3 — PERFORMANCE ====================

    for (const camp of activeCampaigns) {
      if (camp.results < 5) continue;

      const prevCamp = prevCampaigns.find(p => p.id === camp.id);

      // P1 — CPR rising significantly
      if (historicalCPR > 0 && camp.cost_per_result > 0) {
        const cprChange = pctChange(camp.cost_per_result, historicalCPR);
        if (cprChange > 40) {
          // Identify cause
          let cause = 'Causa indeterminada — investigar criativo, público e leilão';
          let causeMetric: MetricComparison | null = null;

          if (camp.frequency > 3.5) {
            cause = 'Saturação de público — frequência acima de 3.5 indica que o mesmo público está vendo o anúncio repetidamente';
            causeMetric = { label: 'Frequência', atual: camp.frequency.toFixed(1), historico: '<3.0', variacao: 'Saturado' };
          } else if (prevCamp && prevCamp.cpm > 0 && pctChange(camp.cpm, prevCamp.cpm) > 30) {
            cause = 'Competição no leilão — CPM subiu proporcionalmente, indicando mais anunciantes competindo pelo mesmo público';
            causeMetric = { label: 'CPM', atual: fmt(camp.cpm), historico: fmt(prevCamp.cpm), variacao: fmtPct(pctChange(camp.cpm, prevCamp.cpm)) };
          } else if (historicalCTR > 0 && camp.ctr < historicalCTR * 0.6) {
            cause = 'Fadiga de criativo — CTR caiu significativamente, o público parou de responder ao anúncio';
            causeMetric = { label: 'CTR', atual: `${camp.ctr.toFixed(2)}%`, historico: `${historicalCTR.toFixed(2)}%`, variacao: fmtPct(pctChange(camp.ctr, historicalCTR)) };
          }

          const extraCost = (camp.cost_per_result - historicalCPR) * camp.results;

          const metricsArr: MetricComparison[] = [
            { label: 'CPR', atual: fmt(camp.cost_per_result), historico: fmt(historicalCPR), variacao: fmtPct(cprChange) },
            { label: 'Custo adicional', atual: fmt(extraCost), historico: '—', variacao: '—' },
          ];
          if (causeMetric) metricsArr.push(causeMetric);

          addFlag({
            type: 'performance', priority: cprChange > 70 ? 'high' : 'medium', icon: '📈', category: 'custo',
            client: clientName, clientId, campaign: camp.name, adName: null,
            title: `CPR subiu de ${fmt(historicalCPR)} para ${fmt(camp.cost_per_result)} — aumento de ${cprChange.toFixed(0)}%`,
            diagnosis: cause,
            metrics: metricsArr,
            action: camp.frequency > 3.5
              ? `Criar novo conjunto com público expandido ou Lookalike diferente para "${camp.name}". Preservar histórico de aprendizado — não pausar, trocar público.`
              : `Revisar criativo e público de "${camp.name}". Testar variações de criativo mantendo segmentação.`,
            impact: extraCost,
            fix: camp.frequency > 3.5 ? 'audience' : 'optimize',
          });
        }
      }

      // P3 — CPM rising without results improvement
      if (prevCamp && prevCamp.cpm > 0) {
        const cpmChange = pctChange(camp.cpm, prevCamp.cpm);
        const resultsChange = prevCamp.results > 0 ? pctChange(camp.results, prevCamp.results) : 0;
        if (cpmChange > 50 && resultsChange < cpmChange * 0.5) {
          addFlag({
            type: 'performance', priority: 'medium', icon: '💰', category: 'custo',
            client: clientName, clientId, campaign: camp.name, adName: null,
            title: `CPM subiu ${cpmChange.toFixed(0)}% sem melhora proporcional de resultado`,
            diagnosis: camp.frequency > 3 ? 'Criativo com baixo score de relevância nesta campanha específica — renovar.' : 'Aumento generalizado no leilão — avaliar sazonalidade ou concorrência.',
            metrics: [
              { label: 'CPM', atual: fmt(camp.cpm), historico: fmt(prevCamp.cpm), variacao: fmtPct(cpmChange) },
              { label: 'Resultados', atual: String(camp.results), historico: String(prevCamp.results), variacao: fmtPct(resultsChange) },
            ],
            action: `Avaliar se o aumento de CPM em "${camp.name}" é isolado ou generalizado na conta. Se isolado, renovar criativo. Se generalizado, aguardar normalização.`,
            impact: (camp.cpm - prevCamp.cpm) / 1000 * camp.impressions,
            fix: 'creative',
          });
        }
      }

      // P4 — Spend increased without proportional results
      if (prevCamp && prevCamp.spend > 0) {
        const spendChange = pctChange(camp.spend, prevCamp.spend);
        const resultsChange = prevCamp.results > 0 ? pctChange(camp.results, prevCamp.results) : 0;
        if (spendChange > 30 && resultsChange < 10 && camp.spend > 100) {
          const wastedSpend = (camp.spend - prevCamp.spend) - ((camp.results - prevCamp.results) * historicalCPR);
          addFlag({
            type: 'performance', priority: 'high', icon: '⚡', category: 'custo',
            client: clientName, clientId, campaign: camp.name, adName: null,
            title: `Gasto aumentou ${spendChange.toFixed(0)}% mas resultados apenas ${resultsChange.toFixed(0)}% — escala ineficiente`,
            diagnosis: 'Escala forçada saiu da zona eficiente do leilão. O budget adicional não está gerando resultado proporcional.',
            metrics: [
              { label: 'Gasto', atual: fmt(camp.spend), historico: fmt(prevCamp.spend), variacao: fmtPct(spendChange) },
              { label: 'Resultados', atual: String(camp.results), historico: String(prevCamp.results), variacao: fmtPct(resultsChange) },
              { label: 'Eficiência perdida', atual: fmt(Math.max(0, wastedSpend)), historico: '—', variacao: '—' },
            ],
            action: `Reduzir budget de "${camp.name}" para o nível anterior e escalar gradualmente (15-20%/semana).`,
            impact: Math.max(0, wastedSpend),
            fix: 'budget',
          });
        }
      }

      // P5 — High frequency with rising CPR
      if (camp.frequency > 4.0 && historicalCPR > 0) {
        const cprChange = pctChange(camp.cost_per_result, historicalCPR);
        if (cprChange > 30) {
          const extraCost = (camp.cost_per_result - historicalCPR) * camp.results;
          addFlag({
            type: 'performance', priority: 'high', icon: '🔄', category: 'custo',
            client: clientName, clientId, campaign: camp.name, adName: null,
            title: `Frequência ${camp.frequency.toFixed(1)} com CPR subindo ${cprChange.toFixed(0)}% — público saturado`,
            diagnosis: 'Frequência alta combinada com CPR subindo é o sinal mais claro de saturação. O mesmo público vê o anúncio repetidamente e para de converter.',
            metrics: [
              { label: 'Frequência', atual: camp.frequency.toFixed(1), historico: '<3.0', variacao: 'Saturado' },
              { label: 'CPR', atual: fmt(camp.cost_per_result), historico: fmt(historicalCPR), variacao: fmtPct(cprChange) },
              { label: 'Custo adicional', atual: fmt(extraCost), historico: '—', variacao: '—' },
            ],
            action: `Criar novo conjunto em "${camp.name}" com público expandido ou Lookalike diferente. Não pausar — preservar histórico de aprendizado trocando público.`,
            impact: extraCost,
            fix: 'audience',
          });
        }
      }
    }

    // P2 — ROAS falling (account level)
    if (ins && prevIns && ins.purchases >= 8 && prevIns.roas > 0 && ins.roas > 0) {
      const roasChange = pctChange(ins.roas, prevIns.roas);
      if (roasChange < -35) {
        // Find worst campaign
        const worstCamp = activeCampaigns
          .filter(c => c.purchases > 0)
          .sort((a, b) => {
            const roasA = a.spend > 0 ? (a.purchases * a.cost_per_purchase) / a.spend : 0;
            const roasB = b.spend > 0 ? (b.purchases * b.cost_per_purchase) / b.spend : 0;
            return roasA - roasB;
          })[0];

        addFlag({
          type: 'performance', priority: 'high', icon: '📊', category: 'custo',
          client: clientName, clientId, campaign: worstCamp ? worstCamp.name : 'Conta geral', adName: null,
          title: `ROAS caiu de ${prevIns.roas.toFixed(2)}x para ${ins.roas.toFixed(2)}x — queda de ${Math.abs(roasChange).toFixed(0)}%`,
          diagnosis: `O ROAS está significativamente abaixo do histórico.${worstCamp ? ` A campanha "${worstCamp.name}" é a maior contribuidora para a queda.` : ''}`,
          metrics: [
            { label: 'ROAS', atual: `${ins.roas.toFixed(2)}x`, historico: `${prevIns.roas.toFixed(2)}x`, variacao: fmtPct(roasChange) },
            ...(worstCamp ? [{ label: 'Pior campanha', atual: worstCamp.name, historico: '—', variacao: '—' }] : []),
          ],
          action: `Reduzir budget nas campanhas com pior ROAS e realocar para as que mantiveram eficiência.`,
          impact: (prevIns.roas - ins.roas) * ins.spend,
          fix: 'budget',
        });
      }
    }

    // ==================== LAYER 4 — CREATIVE ====================

    // Group ads by campaign
    const adsByCampaign = new Map<string, AdData[]>();
    for (const ad of ads) {
      if (!adsByCampaign.has(ad.campaign_id)) adsByCampaign.set(ad.campaign_id, []);
      adsByCampaign.get(ad.campaign_id)!.push(ad);
    }

    for (const [campaignId, campaignAds] of adsByCampaign) {
      const campData = activeCampaigns.find(c => c.id === campaignId);
      if (!campData) continue;

      const totalCampSpend = campaignAds.reduce((s, a) => s + a.spend, 0);
      const totalCampResults = campaignAds.reduce((s, a) => s + a.results, 0);
      const avgCPR = totalCampResults > 0 ? totalCampSpend / totalCampResults : 0;

      for (const ad of campaignAds) {
        if (ad.impressions < 1000) continue; // skip low volume

        const adSpendPct = totalCampSpend > 0 ? (ad.spend / totalCampSpend) * 100 : 0;

        // C1 — Ad draining budget
        if (avgCPR > 0 && ad.cost_per_result > 0 && ad.cost_per_result > avgCPR * 1.8 && adSpendPct > 20) {
          const wasted = ad.spend - (ad.results * avgCPR);
          addFlag({
            type: 'creative', priority: 'high', icon: '🗑️', category: 'criativo',
            client: clientName, clientId, campaign: campData.name, adName: ad.name,
            title: `Anúncio "${ad.name}" com CPR ${((ad.cost_per_result / avgCPR - 1) * 100).toFixed(0)}% acima da média — drenando budget`,
            diagnosis: `Este anúncio está consumindo ${adSpendPct.toFixed(0)}% do budget com CPR muito acima dos outros anúncios da mesma campanha.`,
            metrics: [
              { label: 'CPR do anúncio', atual: fmt(ad.cost_per_result), historico: fmt(avgCPR), variacao: fmtPct(pctChange(ad.cost_per_result, avgCPR)) },
              { label: 'Participação gasto', atual: `${adSpendPct.toFixed(0)}%`, historico: '—', variacao: '—' },
              { label: 'Gasto', atual: fmt(ad.spend), historico: '—', variacao: '—' },
              { label: 'Resultados', atual: String(ad.results), historico: '—', variacao: '—' },
            ],
            action: `Pausar o anúncio "${ad.name}" em "${campData.name}". Economia projetada: ${fmt(Math.max(0, wasted))}.`,
            impact: Math.max(0, wasted),
            fix: 'pause_ad',
          });
        }

        // C2 — Winning ad underinvested
        if (avgCPR > 0 && ad.cost_per_result > 0 && ad.cost_per_result < avgCPR * 0.6 && adSpendPct < 30 && ad.results >= 3) {
          const additionalResults = Math.round((totalCampSpend * 0.5 / ad.cost_per_result) - ad.results);
          addFlag({
            type: 'creative', priority: 'medium', icon: '⭐', category: 'criativo',
            client: clientName, clientId, campaign: campData.name, adName: ad.name,
            title: `Anúncio "${ad.name}" com CPR ${Math.abs(pctChange(ad.cost_per_result, avgCPR)).toFixed(0)}% abaixo da média — subinvestido`,
            diagnosis: `Este anúncio performa ${((1 - ad.cost_per_result / avgCPR) * 100).toFixed(0)}% melhor que a média mas recebe apenas ${adSpendPct.toFixed(0)}% do budget.`,
            metrics: [
              { label: 'CPR do anúncio', atual: fmt(ad.cost_per_result), historico: fmt(avgCPR), variacao: fmtPct(pctChange(ad.cost_per_result, avgCPR)) },
              { label: 'Participação gasto', atual: `${adSpendPct.toFixed(0)}%`, historico: '—', variacao: 'Subinvestido' },
              { label: 'Resultado adicional potencial', atual: `+${additionalResults}`, historico: '—', variacao: '—' },
            ],
            action: `Aumentar budget ou criar campanha dedicada para o anúncio "${ad.name}" em "${campData.name}".`,
            impact: additionalResults * ad.cost_per_result,
            fix: 'scale_ad',
          });
        }

        // C3 — Low hook rate (video only)
        if (ad.video_3s_views > 0 && ad.impressions >= 5000) {
          if (ad.hook_rate < 25) {
            addFlag({
              type: 'creative', priority: 'medium', icon: '🎬', category: 'criativo',
              client: clientName, clientId, campaign: campData.name, adName: ad.name,
              title: `Hook rate de ${ad.hook_rate.toFixed(1)}% no anúncio "${ad.name}" — primeiros 3s não prendem`,
              diagnosis: 'Os primeiros 3 segundos do vídeo não estão parando o scroll. O público vê o início e passa direto.',
              metrics: [
                { label: 'Hook Rate (3s)', atual: `${ad.hook_rate.toFixed(1)}%`, historico: '>25%', variacao: `${(ad.hook_rate - 25).toFixed(0)}%` },
                { label: 'Impressões', atual: fmtNum(ad.impressions), historico: '—', variacao: '—' },
                { label: 'Views perdidas', atual: fmtNum(ad.impressions - ad.video_3s_views), historico: '—', variacao: '—' },
              ],
              action: `Reformular o início do vídeo "${ad.name}": testar hook de dor, pergunta provocativa ou resultado surpreendente nos primeiros 3 segundos.`,
              impact: ad.spend * 0.3,
              fix: 'hook',
            });
          }

          // C4 — Low hold rate with high hook
          if (ad.hook_rate > 30 && ad.hold_rate < 20) {
            addFlag({
              type: 'creative', priority: 'medium', icon: '⏩', category: 'criativo',
              client: clientName, clientId, campaign: campData.name, adName: ad.name,
              title: `"${ad.name}" prende no início (${ad.hook_rate.toFixed(0)}%) mas perde no meio (hold ${ad.hold_rate.toFixed(0)}%)`,
              diagnosis: 'O início do vídeo funciona bem para parar o scroll, mas o desenvolvimento perde o espectador. Problema no corpo do vídeo, não no hook.',
              metrics: [
                { label: 'Hook Rate', atual: `${ad.hook_rate.toFixed(1)}%`, historico: '>30%', variacao: 'Bom' },
                { label: 'Hold Rate', atual: `${ad.hold_rate.toFixed(1)}%`, historico: '>20%', variacao: `${(ad.hold_rate - 20).toFixed(0)}%` },
                { label: 'Gap', atual: `${(ad.hook_rate - ad.hold_rate).toFixed(0)}pp`, historico: '—', variacao: '—' },
              ],
              action: `Manter o mesmo início do vídeo "${ad.name}", reestruturar o corpo: ritmo mais rápido, mais prova social, CTA mais cedo.`,
              impact: ad.spend * 0.25,
              fix: 'video_body',
            });
          }
        }

        // C5 — Progressive creative fatigue (need week1 data approximation)
        // We approximate by checking if CTR is below 50% of campaign average with high impressions
        if (ad.impressions > 20000 && ad.ctr > 0 && historicalCTR > 0 && ad.ctr < historicalCTR * 0.5) {
          addFlag({
            type: 'creative', priority: 'medium', icon: '😴', category: 'criativo',
            client: clientName, clientId, campaign: campData.name, adName: ad.name,
            title: `"${ad.name}" com CTR ${ad.ctr.toFixed(2)}% após ${fmtNum(ad.impressions)} impressões — fadiga progressiva`,
            diagnosis: 'O CTR caiu significativamente em relação à média da conta com impressões acumuladas altas. Padrão clássico de fadiga de criativo.',
            metrics: [
              { label: 'CTR atual', atual: `${ad.ctr.toFixed(2)}%`, historico: `${historicalCTR.toFixed(2)}%`, variacao: fmtPct(pctChange(ad.ctr, historicalCTR)) },
              { label: 'Impressões acumuladas', atual: fmtNum(ad.impressions), historico: '—', variacao: '>20.000' },
            ],
            action: `Pausar "${ad.name}" e criar variação com mesmo ângulo de venda mas execução diferente (novo formato, nova abertura, nova prova social).`,
            impact: ad.spend * 0.4,
            fix: 'creative_refresh',
          });
        }
      }

      // C6 — Excessive concentration in one ad
      if (campaignAds.length > 1 && totalCampSpend > 0) {
        const topAd = campaignAds.reduce((max, a) => a.spend > max.spend ? a : max, campaignAds[0]);
        const topPct = (topAd.spend / totalCampSpend) * 100;
        if (topPct > 70) {
          const isBadCPR = avgCPR > 0 && topAd.cost_per_result > avgCPR * 1.3;
          addFlag({
            type: 'creative', priority: isBadCPR ? 'high' : 'medium', icon: '🎯', category: 'criativo',
            client: clientName, clientId, campaign: campData.name, adName: topAd.name,
            title: `"${topAd.name}" recebe ${topPct.toFixed(0)}% do gasto da campanha — concentração excessiva`,
            diagnosis: isBadCPR
              ? 'Um único anúncio domina o gasto E tem CPR ruim — risco alto.'
              : 'Um único anúncio domina o gasto. Mesmo com bom CPR, falta redundância — se esse criativo fadigar, a campanha inteira para.',
            metrics: [
              { label: 'Participação no gasto', atual: `${topPct.toFixed(0)}%`, historico: '<70%', variacao: 'Concentrado' },
              { label: 'CPR do anúncio', atual: fmt(topAd.cost_per_result), historico: avgCPR > 0 ? fmt(avgCPR) : '—', variacao: avgCPR > 0 ? fmtPct(pctChange(topAd.cost_per_result, avgCPR)) : '—' },
              ...campaignAds.filter(a => a.id !== topAd.id).slice(0, 2).map(a => ({
                label: a.name.slice(0, 30), atual: `${((a.spend / totalCampSpend) * 100).toFixed(0)}%`, historico: '—', variacao: fmt(a.cost_per_result),
              })),
            ],
            action: `Adicionar mais criativos ativos em "${campData.name}" para distribuir o risco. Testar pelo menos 3-4 variações ativas.`,
            impact: isBadCPR ? topAd.spend * 0.3 : topAd.spend * 0.1,
            fix: 'diversify',
          });
        }
      }
    }

    // ==================== LAYER 5 — STRUCTURE & OPPORTUNITY ====================

    // E1 — Campaign stuck in learning
    for (const camp of activeCampaigns) {
      const daysActive = camp.created_time
        ? Math.round((Date.now() - new Date(camp.created_time).getTime()) / (1000 * 60 * 60 * 24))
        : (camp.daily ? camp.daily.length : 14);

      if (daysActive >= 14 && camp.conversions < 50) {
        addFlag({
          type: 'structure', priority: 'medium', icon: '🔁', category: 'estrutura',
          client: clientName, clientId, campaign: camp.name, adName: null,
          title: `"${camp.name}" presa em aprendizado há ${daysActive} dias — ${camp.conversions} de 50 conversões necessárias`,
          diagnosis: 'A Meta precisa de ~50 conversões/semana por conjunto para sair da fase de aprendizado. Sem isso, o algoritmo não consegue otimizar a entrega.',
          metrics: [
            { label: 'Dias ativos', atual: String(daysActive), historico: '<14', variacao: `+${daysActive - 14} dias` },
            { label: 'Conversões', atual: String(camp.conversions), historico: '50', variacao: `${camp.conversions - 50}` },
            { label: 'Média semanal', atual: (camp.conversions / Math.max(1, daysActive / 7)).toFixed(1), historico: '>50', variacao: '—' },
          ],
          action: `Consolidar conjuntos de anúncios em "${camp.name}" — menos conjuntos com mais budget. Se ainda não funcionar, usar evento de conversão mais frequente no funil.`,
          impact: camp.spend * 0.2,
          fix: 'learning',
        });
      }
    }

    // E2 — No retargeting with real volume
    const totalClicks = activeCampaigns.reduce((s, c) => s + c.clicks, 0);
    const hasRetargeting = activeCampaigns.some(c =>
      c.name.toLowerCase().includes('retarget') ||
      c.name.toLowerCase().includes('remarketing') ||
      c.name.toLowerCase().includes('rmkt') ||
      c.name.toLowerCase().includes('remarket')
    );

    if (!hasRetargeting && totalClicks > 1000 && activeCampaigns.length > 0) {
      addFlag({
        type: 'structure', priority: 'medium', icon: '🎯', category: 'estrutura',
        client: clientName, clientId, campaign: 'Conta geral', adName: null,
        title: `${fmtNum(totalClicks)} cliques sem retargeting — público quente ignorado`,
        diagnosis: 'Todo o budget está em aquisição fria. Com esse volume de cliques, há público quente suficiente para retargeting rentável.',
        metrics: [
          { label: 'Cliques no período', atual: fmtNum(totalClicks), historico: '>1.000', variacao: 'Volume suficiente' },
          { label: 'Gasto em aquisição', atual: fmt(totalSpend), historico: '—', variacao: '100%' },
          { label: 'Gasto em retargeting', atual: fmt(0), historico: '~20%', variacao: '0%' },
        ],
        action: `Criar campanhas de retargeting: visitantes do site (7 e 30 dias), engajados no Instagram/Facebook (60 dias). Budget inicial: ${fmt(totalSpend * 0.2)}.`,
        impact: totalSpend * 0.15,
        fix: 'retargeting',
      });
    }

    // E3 — Budget concentrated in one campaign
    if (activeCampaigns.length > 1 && totalSpend > 0) {
      const maxCamp = activeCampaigns.reduce((max, c) => c.spend > max.spend ? c : max, activeCampaigns[0]);
      const pctConc = (maxCamp.spend / totalSpend) * 100;
      if (pctConc > 85) {
        const isBadCPR = historicalCPR > 0 && maxCamp.cost_per_result > historicalCPR * 1.3;
        addFlag({
          type: 'structure', priority: isBadCPR ? 'high' : 'medium', icon: '⚖️', category: 'estrutura',
          client: clientName, clientId, campaign: maxCamp.name, adName: null,
          title: `${pctConc.toFixed(0)}% do budget em "${maxCamp.name}" — conta sem diversificação`,
          diagnosis: 'Concentrar quase todo o budget em uma campanha cria dependência total. Se essa campanha perder eficiência, toda a operação para.',
          metrics: [
            { label: 'Concentração', atual: `${pctConc.toFixed(0)}%`, historico: '<85%', variacao: 'Concentrado' },
            { label: 'Campanha dominante', atual: maxCamp.name, historico: '—', variacao: fmt(maxCamp.spend) },
            { label: 'CPR da dominante', atual: fmt(maxCamp.cost_per_result), historico: historicalCPR > 0 ? fmt(historicalCPR) : '—', variacao: historicalCPR > 0 ? fmtPct(pctChange(maxCamp.cost_per_result, historicalCPR)) : '—' },
          ],
          action: `Distribuir budget em pelo menos 2-3 campanhas com públicos ou objetivos diferentes.`,
          impact: totalSpend * 0.1,
          fix: 'diversify',
        });
      }
    }

    // E4 — Confirmed scale opportunity
    if (dailyHistory.length >= 21 && ins && ins.purchases >= 20) {
      const weeks = [dailyHistory.slice(0, 7), dailyHistory.slice(7, 14), dailyHistory.slice(14, 21)];
      const weekSpends = weeks.map(w => w.reduce((s, d) => s + d.spend, 0));
      const weekResults = weeks.map(w => w.reduce((s, d) => s + d.results, 0));

      if (weekResults.every(r => r > 0) && weekSpends.every(s => s > 0)) {
        const avgSpend = weekSpends.reduce((a, b) => a + b, 0) / 3;
        const maxVariation = Math.max(...weekSpends.map(s => Math.abs(pctChange(s, avgSpend))));
        const avgCPRWeeks = weekSpends.map((s, i) => weekResults[i] > 0 ? s / weekResults[i] : 0);
        const cprVariation = avgCPRWeeks.filter(c => c > 0).length >= 3
          ? Math.max(...avgCPRWeeks.map(c => Math.abs(pctChange(c, avgCPRWeeks.reduce((a, b) => a + b, 0) / 3))))
          : 999;

        if (maxVariation < 20 && cprVariation < 20) {
          const avgWeeklySpend = avgSpend;
          const avgROAS = ins.roas || 1;
          const incrementalRevenue = avgWeeklySpend * 0.2 * avgROAS;

          addFlag({
            type: 'opportunity', priority: 'low', icon: '🚀', category: 'escala',
            client: clientName, clientId, campaign: 'Conta geral', adName: null,
            title: `ROAS estável por 3 semanas — conta pronta para escalar (+${fmt(incrementalRevenue)}/semana)`,
            diagnosis: 'O algoritmo está maduro, resultados consistentes e CPR estável. Condições ideais para escala gradual sem comprometer eficiência.',
            metrics: [
              { label: 'CPR semana 1', atual: fmt(avgCPRWeeks[0] || 0), historico: '—', variacao: '—' },
              { label: 'CPR semana 2', atual: fmt(avgCPRWeeks[1] || 0), historico: '—', variacao: '—' },
              { label: 'CPR semana 3', atual: fmt(avgCPRWeeks[2] || 0), historico: '—', variacao: 'Estável' },
              { label: 'Receita incremental', atual: fmt(incrementalRevenue), historico: '—', variacao: '+20% budget' },
            ],
            action: `Aumentar budget em 15-20% a cada 7 dias nas campanhas com CPR mais consistente. Receita incremental projetada: ${fmt(incrementalRevenue)}/semana.`,
            impact: incrementalRevenue,
            fix: 'scale',
          });
        }
      }
    }

    // ==================== HEALTH SCORE ====================

    const hasTrackingCritical = clientFlags.some(f => f.type === 'tracking' && f.priority === 'critical');
    const hasTrackingFlags = clientFlags.some(f => f.type === 'tracking');
    const trackingScore = !hasTrackingFlags ? 35 : (hasTrackingCritical ? 0 : 15);

    const campaignsWithResults = activeCampaigns.filter(c => c.results > 0).length;
    const totalActiveCamps = activeCampaigns.length;
    const resultPct = totalActiveCamps > 0 ? campaignsWithResults / totalActiveCamps : 1;
    const resultScore = resultPct >= 1 ? 25 : (resultPct > 0.6 ? 15 : 5);

    const hasCPRIssue = clientFlags.some(f => f.category === 'custo' && (f.priority === 'high' || f.priority === 'critical'));
    const cprStable = !hasCPRIssue;
    const cprRisingLess40 = clientFlags.some(f => f.category === 'custo' && f.priority === 'medium');
    const efficiencyScore = cprStable ? 20 : (cprRisingLess40 ? 10 : 0);

    const retargetingPts = hasRetargeting && totalClicks > 1000 ? 8 : 0;
    const notConcentrated = !clientFlags.some(f => f.fix === 'diversify' && f.type === 'structure');
    const concentrationPts = notConcentrated ? 6 : 0;
    const hasLearningOk = activeCampaigns.some(c => c.conversions >= 50);
    const learningPts = hasLearningOk ? 6 : 0;
    const structureScore = retargetingPts + concentrationPts + learningPts;

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

  // Sort: priority first, then by impact descending within same priority
  allFlags.sort((a, b) => {
    const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pDiff !== 0) return pDiff;
    return b.impact - a.impact;
  });

  healthScores.sort((a, b) => a.score - b.score);

  return { flags: allFlags, healthScores };
}
