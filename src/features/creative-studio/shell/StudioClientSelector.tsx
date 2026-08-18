import { useMemo, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface StudioClientOption {
  id: string;
  name: string;
}

interface StudioClientSelectorProps {
  clientId: string | null;
  clientName: string | null;
  clients: StudioClientOption[];
  onChange: (clientId: string | null) => void;
}

/**
 * Seletor de cliente do topo.
 *
 * É o único elemento do canto esquerdo da barra — havia um botão de
 * projeto em negrito por cima dele, mas trocar de projeto não estava
 * ligado a nada e o par de botões empilhados confundia mais do que
 * ajudava. Este seletor, que já funcionava, herdou o destaque visual do
 * que saiu: escolher aqui restringe o resto da tela (canvas, bibliotecas e
 * o que a próxima geração recebe como contexto) ao que já existe daquele
 * cliente — ver `CriativoStudioV2Page.tsx`.
 */
export function StudioClientSelector({ clientId, clientName, clients, onChange }: StudioClientSelectorProps) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState('');

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(termo));
  }, [clients, busca]);

  const escolher = (id: string | null) => {
    onChange(id);
    setOpen(false);
    setBusca('');
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setBusca(''); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Filtrar por cliente"
          className="group -mx-1 flex min-w-0 items-center gap-1.5 rounded-[10px] px-1 py-0.5 text-left transition-colors duration-200 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wavy-focus)]"
        >
          <span className="truncate text-sm font-semibold text-white/92">
            {clientName ?? 'Todos Clientes'}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/45 transition-transform duration-200 group-hover:translate-y-0.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="glass w-64 border-white/10 p-0">
        <div className="border-b border-white/10 p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cliente…"
              aria-label="Buscar cliente"
              autoFocus
              className="glass-input h-8 w-full rounded-[var(--wavy-radius-control)] pl-8 pr-2 text-[12px]"
            />
          </div>
        </div>

        <ul className="max-h-64 overflow-y-auto p-1.5">
          <li>
            <button
              type="button"
              onClick={() => escolher(null)}
              className="flex w-full items-center justify-between gap-2 rounded-[var(--wavy-radius-control)] px-2.5 py-2 text-left text-[13px] font-medium text-white/78 transition-colors duration-150 hover:bg-white/[0.07]"
            >
              Todos Clientes
              {clientId === null && <Check className="h-3.5 w-3.5 shrink-0 text-accent" />}
            </button>
          </li>
          {filtrados.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => escolher(c.id)}
                className="flex w-full items-center justify-between gap-2 rounded-[var(--wavy-radius-control)] px-2.5 py-2 text-left text-[13px] font-medium text-white/82 transition-colors duration-150 hover:bg-white/[0.07]"
              >
                <span className="truncate">{c.name}</span>
                {clientId === c.id && <Check className="h-3.5 w-3.5 shrink-0 text-accent" />}
              </button>
            </li>
          ))}
          {filtrados.length === 0 && (
            <li className="px-2.5 py-3 text-center text-[12px] text-white/45">Nenhum cliente encontrado.</li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
