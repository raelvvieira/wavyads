import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  steps: string[];
  shortSteps?: string[]; // mobile labels
  current: number; // 0-based
  completed: boolean[];
  onJump?: (idx: number) => void;
  allowJumpAny?: boolean;
}

export function StepIndicator({ steps, shortSteps, current, completed, onJump, allowJumpAny }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-4 overflow-x-auto pb-2">
      {steps.map((label, i) => {
        const isCurrent = i === current;
        const isDone = completed[i];
        const clickable = !!onJump && (allowJumpAny || isDone || i <= current);
        const short = shortSteps?.[i] || label;
        return (
          <div key={i} className="flex items-center gap-1.5 sm:gap-4 flex-shrink-0">
            <button
              disabled={!clickable}
              onClick={() => clickable && onJump?.(i)}
              className={cn(
                'flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg transition-all',
                isCurrent && 'bg-accent/20 border border-accent/40',
                !isCurrent && isDone && 'text-white/70 hover:bg-white/5',
                !isCurrent && !isDone && 'text-white/30',
                clickable && 'cursor-pointer',
              )}
            >
              <div
                className={cn(
                  'flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full text-[9px] sm:text-[10px] font-semibold',
                  isDone ? 'bg-accent text-black' : isCurrent ? 'bg-accent/30 text-accent' : 'bg-white/10',
                )}
              >
                {isDone ? <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : i + 1}
              </div>
              <span className="text-[11px] sm:text-xs font-medium whitespace-nowrap sm:hidden">{short}</span>
              <span className="text-xs font-medium whitespace-nowrap hidden sm:inline">{label}</span>
            </button>
            {i < steps.length - 1 && <div className="h-px w-2 sm:w-8 bg-white/10" />}
          </div>
        );
      })}
    </div>
  );
}
