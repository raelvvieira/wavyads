import { useState } from 'react';
import { useRole } from '@/hooks/useRole';
import { useInsightsData } from '@/hooks/useInsightsData';
import { GlassCard } from '@/components/GlassCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IntelligenceFlag, ClientHealthScore } from '@/lib/intelligenceEngine';

function fmtCurrency(v: number): string {
  return `R$${v.toFixed(2).replace('.', ',')}`;
}

const priorityColors: Record<string, string> = {
  critical: 'bg-destructive/20 text-destructive border-destructive/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-accent/20 text-accent border-accent/30',
};

const priorityLabels: Record<string, string> = {
  critical: 'Crítico',
  high: 'Urgente',
  medium: 'Médio',
  low: 'Baixo',
};

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', priorityColors[priority])}>
      {priorityLabels[priority]}
    </span>
  );
}

function FixBadge({ fix }: { fix: string }) {
  const labels: Record<string, string> = {
    pixel_setup: '🔧 Configurar Pixel',
    pixel_broken: '🔧 Pixel Quebrado',
    pixel_audit: '🔍 Auditoria de Pixel',
    wrong_event: '⚠️ Evento Errado',
    destination_check: '🔗 Verificar Destino',
    optimize: '📊 Otimizar',
    budget: '💰 Realocar Budget',
    creative: '🎨 Renovar Criativo',
    audience: '👥 Expandir Público',
    structure: '🏗️ Reestruturar',
    learning: '📚 Fase de Aprendizado',
    scale: '🚀 Escalar',
  };
  return (
    <span className="text-[10px] font-medium px-2 py-1 rounded-lg bg-white/5 border border-white/10">
      {labels[fix] || fix}
    </span>
  );
}

function FlagCard({ flag }: { flag: IntelligenceFlag }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <GlassCard className="p-0 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left flex items-start gap-3 hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-xl mt-0.5 shrink-0">{flag.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <PriorityBadge priority={flag.priority} />
            <span className="text-[10px] text-muted-foreground">{flag.client}</span>
          </div>
          <h4 className="text-sm font-medium leading-snug">{flag.title}</h4>
          <p className="text-xs text-muted-foreground mt-1 truncate">{flag.campaign}</p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-white/10 p-4 space-y-4 bg-white/[0.02]">
          <p className="text-xs text-muted-foreground leading-relaxed">{flag.description}</p>

          <div className="glass rounded-xl p-4">
            <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Ação Recomendada</h5>
            <p className="text-xs leading-relaxed">{flag.action}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="glass rounded-xl p-3">
              <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Impacto Estimado</h5>
              <p className="text-xs leading-relaxed">{flag.impact}</p>
            </div>
            <div className="glass rounded-xl p-3">
              <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Dado Detectado</h5>
              <p className="text-xs leading-relaxed font-mono">{flag.metric}</p>
            </div>
          </div>

          <FixBadge fix={flag.fix} />
        </div>
      )}
    </GlassCard>
  );
}

function HealthBar({ score }: { score: number }) {
  const color = score >= 75 ? 'bg-accent' : score >= 50 ? 'bg-yellow-500' : 'bg-destructive';
  const textColor = score >= 75 ? 'text-accent' : score >= 50 ? 'text-yellow-400' : 'text-destructive';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${score}%` }} />
      </div>
      <span className={cn('text-sm font-semibold font-mono w-8 text-right', textColor)}>{score}</span>
    </div>
  );
}

function ClientCard({ hs }: { hs: ClientHealthScore }) {
  const [expanded, setExpanded] = useState(false);
  const criticalCount = hs.flags.filter(f => f.priority === 'critical').length;
  const highCount = hs.flags.filter(f => f.priority === 'high').length;
  const mediumCount = hs.flags.filter(f => f.priority === 'medium').length;

  return (
    <GlassCard className="p-0 overflow-hidden">
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
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">
                {criticalCount} crítico{criticalCount > 1 ? 's' : ''}
              </span>
            )}
            {highCount > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                {highCount} urgente{highCount > 1 ? 's' : ''}
              </span>
            )}
            {mediumCount > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                {mediumCount} médio{mediumCount > 1 ? 's' : ''}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto">
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
            ].map(b => (
              <div key={b.label} className="glass rounded-xl p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{b.label}</p>
                <p className="text-lg font-semibold font-mono mt-1">{b.value}<span className="text-xs text-muted-foreground">/{b.max}</span></p>
              </div>
            ))}
          </div>

          {/* Campaigns */}
          {hs.campaigns.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-muted-foreground">Campanhas Ativas</h5>
              {hs.campaigns.map(camp => {
                const campFlags = hs.flags.filter(f => f.campaign === camp.name);
                return (
                  <div key={camp.id} className="glass rounded-xl p-3 flex items-center gap-3">
                    <div className={cn('h-2 w-2 rounded-full shrink-0', camp.status === 'active' ? 'bg-accent' : 'bg-muted-foreground')} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{camp.name}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span>Resultados: {camp.results}</span>
                        {camp.cost_per_result > 0 && <span>CPR: {fmtCurrency(camp.cost_per_result)}</span>}
                        <span>Freq: {camp.frequency.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {campFlags.map(f => (
                        <span key={f.id} title={f.title} className="text-xs">{f.icon}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}

function TrackingTab({ flags }: { flags: IntelligenceFlag[] }) {
  const trackingFlags = flags.filter(f => f.type === 'tracking');
  const [filterPriority, setFilterPriority] = useState<string | null>(null);

  const filtered = filterPriority
    ? trackingFlags.filter(f => f.priority === filterPriority)
    : trackingFlags;

  const criticalCampaigns = trackingFlags.filter(f => f.priority === 'critical').length;
  const clientsWithTracking = new Set(trackingFlags.map(f => f.clientId)).size;
  const totalSpendAffected = trackingFlags.reduce((s, f) => {
    const match = f.metric.match(/Gasto:\s*R\$([0-9.,]+)/);
    if (match) return s + parseFloat(match[1].replace(',', '.'));
    return s;
  }, 0);

  if (trackingFlags.length === 0) {
    return (
      <GlassCard className="flex items-center gap-3 py-8 justify-center">
        <CheckCircle className="h-6 w-6 text-accent" />
        <span className="text-sm font-medium">Nenhum problema de rastreio detectado em todos os clientes</span>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alert banner */}
      <div className="rounded-xl border-l-4 border-l-destructive bg-destructive/10 border border-destructive/20 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Campanhas com problema</p>
            <p className="text-2xl font-bold font-mono text-destructive mt-1">{criticalCampaigns}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Clientes afetados</p>
            <p className="text-2xl font-bold font-mono text-destructive mt-1">{clientsWithTracking}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Gasto em risco</p>
            <p className="text-2xl font-bold font-mono text-destructive mt-1">{fmtCurrency(totalSpendAffected)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['critical', 'high', 'medium'] as const).map(p => {
          const count = trackingFlags.filter(f => f.priority === p).length;
          if (count === 0) return null;
          return (
            <button
              key={p}
              onClick={() => setFilterPriority(filterPriority === p ? null : p)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-lg border transition-colors',
                filterPriority === p
                  ? priorityColors[p]
                  : 'border-white/10 text-muted-foreground hover:border-white/20'
              )}
            >
              {priorityLabels[p]} ({count})
            </button>
          );
        })}
      </div>

      {/* Flag cards */}
      <div className="space-y-3">
        {filtered.map(flag => (
          <FlagCard key={flag.id} flag={flag} />
        ))}
      </div>
    </div>
  );
}

function PerformanceTab({ flags }: { flags: IntelligenceFlag[] }) {
  const perfFlags = flags.filter(f => f.type !== 'tracking');

  const urgentCount = perfFlags.filter(f => f.priority === 'critical' || f.priority === 'high').length;
  const scaleClients = new Set(perfFlags.filter(f => f.fix === 'scale').map(f => f.clientId)).size;
  const cprFlags = perfFlags.filter(f => f.fix === 'optimize');

  return (
    <div className="space-y-4">
      {perfFlags.length === 0 ? (
        <GlassCard className="flex items-center gap-3 py-8 justify-center">
          <CheckCircle className="h-6 w-6 text-accent" />
          <span className="text-sm font-medium">Nenhum alerta de performance ou estrutura detectado</span>
        </GlassCard>
      ) : (
        <>
          <div className="space-y-3">
            {perfFlags.map(flag => (
              <FlagCard key={flag.id} flag={flag} />
            ))}
          </div>

          {/* Summary panel */}
          <GlassCard>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Resumo</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] text-muted-foreground">Ações urgentes</p>
                <p className="text-xl font-bold font-mono mt-1">{urgentCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Clientes com oportunidade de escala</p>
                <p className="text-xl font-bold font-mono mt-1 text-accent">{scaleClients}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Flags de CPR alto</p>
                <p className="text-xl font-bold font-mono mt-1">{cprFlags.length}</p>
              </div>
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}

function ClientsTab({ healthScores }: { healthScores: ClientHealthScore[] }) {
  const [sortBySpend, setSortBySpend] = useState(false);

  const sorted = [...healthScores].sort((a, b) =>
    sortBySpend ? b.totalSpend - a.totalSpend : a.score - b.score
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setSortBySpend(!sortBySpend)}
          className="btn-glass text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
        >
          <ArrowUpDown className="h-3 w-3" />
          {sortBySpend ? 'Ordenar por score' : 'Ordenar por gasto'}
        </button>
      </div>

      {sorted.length === 0 ? (
        <GlassCard className="flex items-center gap-3 py-8 justify-center">
          <span className="text-sm text-muted-foreground">Nenhum cliente sincronizado</span>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {sorted.map(hs => (
            <ClientCard key={hs.clientId} hs={hs} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function InsightsPage() {
  const { isAdmin, isLoading: roleLoading } = useRole();
  const { data, isLoading } = useInsightsData();

  if (roleLoading) {
    return (
      <div className="p-6 pt-20 lg:pt-6">
        <Skeleton className="h-8 w-48 bg-white/5" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="p-6 pt-20 lg:pt-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Análise inteligente de rastreio, performance e estrutura de todos os clientes
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <GlassCard key={i}><Skeleton className="h-24 bg-white/5" /></GlassCard>
          ))}
        </div>
      ) : (
        <Tabs defaultValue="rastreio" className="w-full">
          <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl">
            <TabsTrigger value="rastreio" className="rounded-lg text-xs data-[state=active]:bg-white/10 data-[state=active]:text-foreground">
              🔍 Rastreio
            </TabsTrigger>
            <TabsTrigger value="performance" className="rounded-lg text-xs data-[state=active]:bg-white/10 data-[state=active]:text-foreground">
              💡 Performance & Estratégia
            </TabsTrigger>
            <TabsTrigger value="clientes" className="rounded-lg text-xs data-[state=active]:bg-white/10 data-[state=active]:text-foreground">
              👥 Clientes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rastreio" className="mt-4">
            <TrackingTab flags={data?.flags || []} />
          </TabsContent>

          <TabsContent value="performance" className="mt-4">
            <PerformanceTab flags={data?.flags || []} />
          </TabsContent>

          <TabsContent value="clientes" className="mt-4">
            <ClientsTab healthScores={data?.healthScores || []} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
