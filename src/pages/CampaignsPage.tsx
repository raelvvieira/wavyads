import { useState } from 'react';
import { GlassCard } from '@/components/GlassCard';
import { StatusBadge } from '@/components/StatusBadge';
import { mockCampaigns, mockClients, formatCurrency, formatNumber } from '@/data/mock';
import { DollarSign, Eye, MousePointer, Target } from 'lucide-react';
import { CampaignStatus } from '@/types';
import { cn } from '@/lib/utils';

const filters: { label: string; value: CampaignStatus | 'all' }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Ativas', value: 'active' },
  { label: 'Pausadas', value: 'paused' },
  { label: 'Encerradas', value: 'ended' },
];

export default function CampaignsPage() {
  const [filter, setFilter] = useState<CampaignStatus | 'all'>('all');

  const campaigns = filter === 'all' ? mockCampaigns : mockCampaigns.filter((c) => c.status === filter);

  return (
    <div className="p-6 pt-20 lg:pt-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Campanhas</h1>
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'rounded-lg px-4 py-2 text-xs font-medium transition-all duration-300',
                filter === f.value ? 'btn-orange' : 'glass text-white/60 hover:text-white'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {campaigns.map((c) => {
          const client = mockClients.find((cl) => cl.id === c.clientId);
          return (
            <GlassCard key={c.id} hover className="relative animate-fade-in">
              <div className="absolute top-4 right-4">
                <StatusBadge status={c.status} />
              </div>

              <h3 className="font-semibold text-lg pr-20 mb-1">{c.name}</h3>
              <p className="text-sm text-white/40 mb-5">{client?.company}</p>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-orange" />
                  <div>
                    <p className="text-xs text-white/40">Gasto</p>
                    <p className="text-sm font-semibold metric-number">{formatCurrency(c.spend)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-orange" />
                  <div>
                    <p className="text-xs text-white/40">Impressões</p>
                    <p className="text-sm font-semibold metric-number">{formatNumber(c.impressions)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MousePointer className="h-4 w-4 text-orange" />
                  <div>
                    <p className="text-xs text-white/40">Cliques</p>
                    <p className="text-sm font-semibold metric-number">{formatNumber(c.clicks)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-orange" />
                  <div>
                    <p className="text-xs text-white/40">Conversões</p>
                    <p className="text-sm font-semibold metric-number">{c.conversions}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/5 flex justify-between text-xs text-white/40">
                <span>CTR: {c.ctr}%</span>
                <span>CPC: {formatCurrency(c.cpc)}</span>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
