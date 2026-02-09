import { cn } from '@/lib/utils';
import { CampaignStatus } from '@/types';

const statusConfig: Record<CampaignStatus, { label: string; className: string }> = {
  active: {
    label: 'Ativa',
    className: 'bg-green-500/10 text-green-400 border-green-500/20',
  },
  paused: {
    label: 'Pausada',
    className: 'bg-white/5 text-white/50 border-white/10',
  },
  ended: {
    label: 'Encerrada',
    className: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
};

export function StatusBadge({ status }: { status: CampaignStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
