import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GapAlertProps {
  leads: number;
  purchases: number;
}

const DISMISS_KEY = 'wavy-gap-alert-dismiss';

function isDismissed(): boolean {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    return Date.now() - parseInt(ts) < 24 * 60 * 60 * 1000;
  } catch { return false; }
}

export function GapAlert({ leads, purchases }: GapAlertProps) {
  const [dismissed, setDismissed] = useState(isDismissed);

  const convRate = leads > 0 ? (purchases / leads) * 100 : 0;
  const showAlert = leads > 0 && (purchases === 0 || convRate < 2);

  if (!showAlert || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setDismissed(true);
  };

  return (
    <div className="relative glass rounded-xl p-5 animate-fade-in border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 shrink-0">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h4 className="font-semibold text-amber-400 mb-1">⚠️ Gap entre Leads e Vendas Detectado</h4>
          <p className="text-sm text-muted-foreground">
            Você gerou <span className="text-foreground font-semibold">{leads}</span> leads no período,
            mas apenas <span className="text-foreground font-semibold">{purchases}</span> resultaram em compra
            (<span className="text-foreground font-semibold">{convRate.toFixed(1)}%</span>).
            Isso pode indicar uma oportunidade de otimização no funil de vendas.
          </p>
          <button onClick={handleDismiss} className="text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors">
            Já estou ciente — dispensar por 24h
          </button>
        </div>
      </div>
    </div>
  );
}
