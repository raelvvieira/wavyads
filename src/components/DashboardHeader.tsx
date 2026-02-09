import { useState } from 'react';
import { ChevronDown, User } from 'lucide-react';
import { mockClients } from '@/data/mock';
import { Period } from '@/types';
import { cn } from '@/lib/utils';

const periods: { label: string; value: Period }[] = [
  { label: '7 dias', value: '7d' },
  { label: '14 dias', value: '14d' },
  { label: '30 dias', value: '30d' },
  { label: '90 dias', value: '90d' },
];

interface DashboardHeaderProps {
  selectedClient: string;
  onClientChange: (id: string) => void;
  selectedPeriod: Period;
  onPeriodChange: (p: Period) => void;
}

export function DashboardHeader({
  selectedClient,
  onClientChange,
  selectedPeriod,
  onPeriodChange,
}: DashboardHeaderProps) {
  const [clientOpen, setClientOpen] = useState(false);
  const client = mockClients.find((c) => c.id === selectedClient);

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-4 border-b border-white/10 bg-black/60 backdrop-blur-xl px-6 py-4">
      {/* Client selector */}
      <div className="relative">
        <button
          onClick={() => setClientOpen(!clientOpen)}
          className="glass flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-all duration-300 hover:bg-white/[0.08]"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange to-orange-light">
            <User className="h-4 w-4" />
          </div>
          <span className="font-medium">{client?.company || 'Todos os clientes'}</span>
          <ChevronDown className={cn('h-4 w-4 text-white/60 transition-transform', clientOpen && 'rotate-180')} />
        </button>

        {clientOpen && (
          <div className="absolute top-full left-0 mt-2 w-64 rounded-xl glass border border-white/10 p-2 animate-fade-in">
            <button
              onClick={() => { onClientChange('all'); setClientOpen(false); }}
              className={cn(
                'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
                selectedClient === 'all' ? 'bg-orange/20 text-white' : 'text-white/70 hover:bg-white/5'
              )}
            >
              Todos os clientes
            </button>
            {mockClients.map((c) => (
              <button
                key={c.id}
                onClick={() => { onClientChange(c.id); setClientOpen(false); }}
                className={cn(
                  'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  selectedClient === c.id ? 'bg-orange/20 text-white' : 'text-white/70 hover:bg-white/5'
                )}
              >
                {c.company}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Period filter */}
      <div className="flex items-center gap-2 ml-auto">
        {periods.map((p) => (
          <button
            key={p.value}
            onClick={() => onPeriodChange(p.value)}
            className={cn(
              'rounded-lg px-4 py-2 text-xs font-medium transition-all duration-300',
              selectedPeriod === p.value
                ? 'btn-orange'
                : 'glass text-white/60 hover:text-white hover:bg-white/[0.08]'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
    </header>
  );
}
