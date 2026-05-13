import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  steps: string[];
  current: number; // 0-based
  completed: boolean[];
  onJump?: (idx: number) => void;
}

export function StepIndicator({ steps, current, completed, onJump }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto pb-2">
      {steps.map((label, i) => {
        const isCurrent = i === current;
        const isDone = completed[i];
        const clickable = onJump && (isDone || i <= current);
        return (
          <div key={i} className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <button
              disabled={!clickable}
              onClick={() => clickable && onJump?.(i)}
              className={cn(
                'flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all',
                isCurrent && 'bg-accent/20 border border-accent/40',
                !isCurrent && isDone && 'text-white/70 hover:bg-white/5',
                !isCurrent && !isDone && 'text-white/30',
                clickable && 'cursor-pointer',
              )}
            >
              <div
                className={cn(
                  'flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold',
                  isDone ? 'bg-accent text-black' : isCurrent ? 'bg-accent/30 text-accent' : 'bg-white/10',
                )}
              >
                {isDone ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <span className="text-xs font-medium whitespace-nowrap">{label}</span>
            </button>
            {i < steps.length - 1 && <div className="h-px w-4 sm:w-8 bg-white/10" />}
          </div>
        );
      })}
    </div>
  );
}
