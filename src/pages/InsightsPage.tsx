import { useState } from 'react';
import { useRole } from '@/hooks/useRole';
import { useInsightsData } from '@/hooks/useInsightsData';
import { useClients } from '@/hooks/useClients';
import { GlassCard } from '@/components/GlassCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle,
  ArrowUpDown,
  Shield,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IntelligenceFlag, ClientHealthScore } from '@/lib/intelligenceEngine';

// ==================== CONSTANTS ====================

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#FF2222',
  high: '#FF6B2B',
  medium: '#F59E0B',
  low: '#1ACD8A',
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Crítico',
  high: 'Urgente',
  medium: 'Médio',
  low: 'Oportunidade',
};

const TYPE_COLORS: Record<string, string> = {
  tracking: '#FF2222',
  performance: '#FF6B2B',
  creative: '#A855F7',
  structure: '#3B82F6',
  opportunity: '#1ACD8A',
};

const TYPE_LABELS: Record<string, string> = {
  tracking: 'Rastreio',
  performance: 'Performance',
  creative: 'Criativo',
  structure: 'Estrutura',
  opportunity: 'Oportunidade',
};

const FIX_LABELS: Record<string, string> = {
  pixel_setup: '🔧 Configurar Pixel',
  pixel_broken: '🔧 Pixel Quebrado',
  pixel_audit: '🔍 Auditoria de Pixel',
  wrong_event: '⚠️ Evento Errado',
  destination_check: '🔗 Verificar Destino',
  optimize: '📊 Otimizar',
  budget: '💰 Realocar Budget',
  creative: '🎨 Renovar Criativo',
  creative_refresh: '🎨 Refresh de Criativo',
  audience: '👥 Expandir Público',
  structure: '🏗️ Reestruturar',
  learning: '📚 Fase de Aprendizado',
  scale: '🚀 Escalar',
  pause_ad: '⏸️ Pausar Anúncio',
  scale_ad: '📈 Escalar Anúncio',
  hook: '🎬 Reformular Hook',
  video_body: '🎥 Reestruturar Vídeo',
  diversify: '🔀 Diversificar',
  retargeting: '🎯 Criar Retargeting',
  page_speed: '⚡ Otimizar Página',
};

function fmtCurrency(v: number): string {
  return `R$${v.toFixed(2).replace('.', ',')}`;
}

// ==================== INSIGHT CARD ====================

function InsightCard({ flag }: { flag: IntelligenceFlag }) {
  const [expanded, setExpanded] = useState(false);
  const priorityColor = PRIORITY_COLORS[flag.priority];
  const typeColor = TYPE_COLORS[flag.type];

  return (
    <div
      className={cn(
        'glass rounded-xl overflow-hidden transition-all duration-300',
        expanded ? 'shadow-lg' : ''
      )}
      style={{
        borderLeft: expanded ? undefined : `3px solid ${priorityColor}`,
        border: expanded ? `1px solid ${priorityColor}40` : undefined,
        boxShadow: expanded ? `0 4px 20px ${priorityColor}15` : undefined,
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left flex items-start gap-3 hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-lg mt-0.5 shrink-0">{flag.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span
              className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${priorityColor}20`, color: priorityColor, border: `1px solid ${priorityColor}30` }}
            >
              {PRIORITY_LABELS[flag.priority]}
            </span>
            <span
              className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}25` }}
            >
              {TYPE_LABELS[flag.type]}
            </span>
            <span className="text-[10px] text-muted-foreground">{flag.client}</span>
          </div>
          <h4 className="text-sm font-medium leading-snug">{flag.title}</h4>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {flag.campaign}{flag.adName ? ` → ${flag.adName}` : ''}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-white/10 p-4 space-y-4 bg-white/[0.02]">
          {/* Diagnosis */}
          <div className="glass rounded-xl p-4">
            <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Diagnóstico</h5>
            <p className="text-xs leading-relaxed">{flag.diagnosis}</p>
          </div>

          {/* Metrics Table */}
          {flag.metrics.length > 0 && (
            <div className="glass rounded-xl overflow-hidden">
              <div className="grid grid-cols-4 gap-px bg-white/5">
                <div className="p-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Métrica</div>
                <div className="p-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium text-right">Atual</div>
                <div className="p-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium text-right">Histórico</div>
                <div className="p-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium text-right">Variação</div>
              </div>
              {flag.metrics.map((m, i) => (
                <div key={i} className="grid grid-cols-4 gap-px border-t border-white/5">
                  <div className="p-2 text-xs">{m.label}</div>
                  <div className="p-2 text-xs font-mono text-right">{m.atual}</div>
                  <div className="p-2 text-xs font-mono text-right text-muted-foreground">{m.historico}</div>
                  <div className={cn(
                    'p-2 text-xs font-mono text-right',
                    m.variacao.startsWith('+') && !m.variacao.includes('Bom') ? 'text-red-400' :
                    m.variacao.startsWith('-') ? 'text-red-400' :
                    m.variacao.includes('Estável') || m.variacao.includes('Bom') || m.variacao.includes('Funcionando') ? 'text-green-400' :
                    'text-muted-foreground'
                  )}>{m.variacao}</div>
                </div>
              ))}
            </div>
          )}

          {/* Action */}
          <div className="glass rounded-xl p-4">
            <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Ação Recomendada</h5>
            <p className="text-xs leading-relaxed">{flag.action}</p>
          </div>

          {/* Impact + Fix */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            {flag.impact > 0 && (
              <div className="glass rounded-xl p-3">
                <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Impacto Estimado</h5>
                <p className="text-sm font-semibold font-mono" style={{ color: priorityColor }}>
                  {fmtCurrency(flag.impact)}
                </p>
              </div>
            )}
            <span className="text-[10px] font-medium px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
              {FIX_LABELS[flag.fix] || flag.fix}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== HEALTH SCORE SECTION ====================

function HealthBar({ score }: { score: number }) {
  const color = score >= 75 ? '#1ACD8A' : score >= 50 ? '#F59E0B' : '#FF2222';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm font-semibold font-mono w-8 text-right" style={{ color }}>{score}</span>
    </div>
  );
}

function ClientHealthCard({ hs }: { hs: ClientHealthScore }) {
  const [expanded, setExpanded] = useState(false);
  const criticalCount = hs.flags.filter(f => f.priority === 'critical').length;
  const highCount = hs.flags.filter(f => f.priority === 'high').length;
  const mediumCount = hs.flags.filter(f => f.priority === 'medium').length;

  return (
    <div className="glass rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold">{hs.clientName}</h4>
          <div className="mt-2">
            <HealthBar score={hs.score} />
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {criticalCount > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FF222220', color: '#FF2222' }}>
                {criticalCount} crítico{criticalCount > 1 ? 's' : ''}
              </span>
            )}
            {highCount > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FF6B2B20', color: '#FF6B2B' }}>
                {highCount} urgente{highCount > 1 ? 's' : ''}
              </span>
            )}
            {mediumCount > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: '#F59E0B20', color: '#F59E0B' }}>
                {mediumCount} médio{mediumCount > 1 ? 's' : ''}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto font-mono">
              Gasto: {fmtCurrency(hs.totalSpend)}
            </span>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-white/10 p-4 space-y-4 bg-white/[0.02]">
          {/* Score breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Rastreio', value: hs.breakdown.tracking, max: 35 },
              { label: 'Resultado', value: hs.breakdown.results, max: 25 },
              { label: 'Eficiência', value: hs.breakdown.efficiency, max: 20 },
              { label: 'Estrutura', value: hs.breakdown.structure, max: 20 },
            ].map(b => {
              const pct = (b.value / b.max) * 100;
              const barColor = pct >= 75 ? '#1ACD8A' : pct >= 50 ? '#F59E0B' : '#FF2222';
              return (
                <div key={b.label} className="glass rounded-xl p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{b.label}</p>
                  <p className="text-lg font-semibold font-mono mt-1">
                    {b.value}<span className="text-xs text-muted-foreground">/{b.max}</span>
                  </p>
                  <div className="h-1 rounded-full bg-white/10 mt-2 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Campaigns */}
          {hs.campaigns.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-muted-foreground">Campanhas Ativas</h5>
              {hs.campaigns.map(camp => {
                const campFlags = hs.flags.filter(f => f.campaign === camp.name);
                const cprColor = camp.cost_per_result > 0 && historicalCPRFromCampaigns(hs.campaigns) > 0
                  ? camp.cost_per_result < historicalCPRFromCampaigns(hs.campaigns) ? '#1ACD8A' : '#FF6B2B'
                  : undefined;

                return (
                  <div key={camp.id} className="glass rounded-xl p-3 flex items-center gap-3">
                    <div className={cn(
                      'h-2 w-2 rounded-full shrink-0',
                    )} style={{
                      backgroundColor: camp.status === 'active' ? '#1ACD8A' : camp.status === 'paused' ? '#F59E0B' : '#666',
                    }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{camp.name}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span>Resultados: <span className="font-mono">{camp.results}</span></span>
                        {camp.cost_per_result > 0 && (
                          <span style={{ color: cprColor }}>
                            CPR: <span className="font-mono">{fmtCurrency(camp.cost_per_result)}</span>
                          </span>
                        )}
                        <span>Freq: <span className="font-mono">{camp.frequency.toFixed(1)}</span></span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {campFlags.map(f => (
                        <span key={f.id} title={f.title} className="text-xs cursor-help">{f.icon}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function historicalCPRFromCampaigns(campaigns: any[]): number {
  const totalSpend = campaigns.reduce((s: number, c: any) => s + c.spend, 0);
  const totalResults = campaigns.reduce((s: number, c: any) => s + c.results, 0);
  return totalResults > 0 ? totalSpend / totalResults : 0;
}

// ==================== MAIN PAGE ====================

export default function InsightsPage() {
  const { isAdmin, isLoading: roleLoading } = useRole();
  const { data, isLoading } = useInsightsData();
  const { data: clients } = useClients();

  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [sortBySpend, setSortBySpend] = useState(false);

  if (roleLoading) {
    return (
      <div className="p-6 pt-20 lg:pt-6">
        <Skeleton className="h-8 w-48 bg-white/5" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const flags = data?.flags || [];
  const healthScores = data?.healthScores || [];

  // Apply filters
  let filteredFlags = flags;
  if (priorityFilter) filteredFlags = filteredFlags.filter(f => f.priority === priorityFilter);
  if (typeFilter) filteredFlags = filteredFlags.filter(f => f.type === typeFilter);
  if (clientFilter) filteredFlags = filteredFlags.filter(f => f.clientId === clientFilter);

  const sortedHealthScores = [...healthScores].sort((a, b) =>
    sortBySpend ? b.totalSpend - a.totalSpend : a.score - b.score
  );

  // Unique clients from flags
  const flagClients = Array.from(new Set(flags.map(f => f.clientId)))
    .map(id => {
      const flag = flags.find(f => f.clientId === id);
      return { id, name: flag?.client || '' };
    });

  // Count by priority
  const countByPriority = (p: string) => flags.filter(f => f.priority === p).length;
  const countByType = (t: string) => flags.filter(f => f.type === t).length;

  return (
    <div className="p-6 pt-20 lg:pt-6 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Análise profunda de rastreio, performance, criativo e estrutura
          </p>
        </div>
        <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-muted-foreground flex items-center gap-1.5">
          <Shield className="h-3 w-3" />
          ADMIN ONLY
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <GlassCard key={i}><Skeleton className="h-20 bg-white/5" /></GlassCard>
          ))}
        </div>
      ) : (
        <>
          {/* ==================== SECTION 1 — INSIGHTS ==================== */}
          <div className="space-y-4">
            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />

              {/* Priority filters */}
              {(['critical', 'high', 'medium', 'low'] as const).map(p => {
                const count = countByPriority(p);
                if (count === 0) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPriorityFilter(priorityFilter === p ? null : p)}
                    className={cn(
                      'text-[11px] px-2.5 py-1 rounded-lg border transition-all',
                      priorityFilter === p
                        ? 'border-opacity-50 font-semibold'
                        : 'border-white/10 text-muted-foreground hover:border-white/20'
                    )}
                    style={priorityFilter === p ? {
                      borderColor: PRIORITY_COLORS[p],
                      color: PRIORITY_COLORS[p],
                      backgroundColor: `${PRIORITY_COLORS[p]}15`,
                    } : {}}
                  >
                    {PRIORITY_LABELS[p]} ({count})
                  </button>
                );
              })}

              <div className="w-px h-4 bg-white/10 mx-1" />

              {/* Type filters */}
              {(['tracking', 'performance', 'creative', 'structure'] as const).map(t => {
                const count = countByType(t);
                if (count === 0) return null;
                return (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(typeFilter === t ? null : t)}
                    className={cn(
                      'text-[11px] px-2.5 py-1 rounded-lg border transition-all',
                      typeFilter === t
                        ? 'border-opacity-50 font-semibold'
                        : 'border-white/10 text-muted-foreground hover:border-white/20'
                    )}
                    style={typeFilter === t ? {
                      borderColor: TYPE_COLORS[t],
                      color: TYPE_COLORS[t],
                      backgroundColor: `${TYPE_COLORS[t]}15`,
                    } : {}}
                  >
                    {TYPE_LABELS[t]} ({count})
                  </button>
                );
              })}

              {/* Client filter */}
              {flagClients.length > 1 && (
                <>
                  <div className="w-px h-4 bg-white/10 mx-1" />
                  <select
                    value={clientFilter || ''}
                    onChange={(e) => setClientFilter(e.target.value || null)}
                    className="text-[11px] px-2.5 py-1 rounded-lg border border-white/10 bg-transparent text-muted-foreground hover:border-white/20 outline-none cursor-pointer"
                  >
                    <option value="" className="bg-black">Todos os clientes</option>
                    {flagClients.map(c => (
                      <option key={c.id} value={c.id} className="bg-black">{c.name}</option>
                    ))}
                  </select>
                </>
              )}
            </div>

            {/* Insight cards */}
            {filteredFlags.length === 0 ? (
              <GlassCard className="flex items-center gap-3 py-8 justify-center">
                <CheckCircle className="h-6 w-6" style={{ color: '#1ACD8A' }} />
                <span className="text-sm font-medium">
                  {flags.length === 0
                    ? 'Nenhum insight detectado — todos os clientes estão saudáveis'
                    : 'Nenhum insight corresponde aos filtros selecionados'}
                </span>
              </GlassCard>
            ) : (
              <div className="space-y-3">
                {filteredFlags.map(flag => (
                  <InsightCard key={flag.id} flag={flag} />
                ))}
              </div>
            )}
          </div>

          {/* ==================== SECTION 2 — HEALTH SCORES ==================== */}
          {healthScores.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Clientes</h2>
                <button
                  onClick={() => setSortBySpend(!sortBySpend)}
                  className="btn-glass text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                >
                  <ArrowUpDown className="h-3 w-3" />
                  {sortBySpend ? 'Ordenar por score' : 'Ordenar por gasto'}
                </button>
              </div>

              <div className="space-y-3">
                {sortedHealthScores.map(hs => (
                  <ClientHealthCard key={hs.clientId} hs={hs} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
