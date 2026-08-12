import { GlassCard } from './GlassCard';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { GoogleAdsImpressionShareCampaign } from '@/hooks/useGoogleAdsInsights';

interface ImpressionShareCardProps {
  campaigns: GoogleAdsImpressionShareCampaign[];
  isLoading: boolean;
}

function Bar({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
  return (
    <div className="flex-1 min-w-[100px]">
      <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
        <span>{label}</span>
        <span>{value.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={cn('h-full rounded-full', colorClass)}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

export function ImpressionShareCard({ campaigns, isLoading }: ImpressionShareCardProps) {
  if (isLoading) {
    return (
      <GlassCard className="animate-fade-in">
        <Skeleton className="h-6 w-56 bg-white/5 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full bg-white/5" />
          ))}
        </div>
      </GlassCard>
    );
  }

  // Sem campanhas de Pesquisa elegíveis — a seção não faz sentido pra
  // Display/PMax/Vídeo, então simplesmente não aparece.
  if (campaigns.length === 0) return null;

  return (
    <GlassCard className="animate-fade-in">
      <h3 className="text-base sm:text-lg font-semibold mb-1">Parcela de impressões (Rede de Pesquisa)</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Quanto das buscas elegíveis suas campanhas apareceram, e por que não apareceram no resto.
      </p>
      <div className="space-y-4">
        {campaigns.map((c) => (
          <div key={c.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <div className="text-sm font-medium mb-2 truncate">{c.name}</div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Bar label="Parcela de impressões" value={c.impression_share} colorClass="bg-status-active" />
              <Bar label="Perdido por orçamento" value={c.lost_to_budget} colorClass="bg-amber-400" />
              <Bar label="Perdido por posição" value={c.lost_to_rank} colorClass="bg-red-400" />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
