import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { EstadoCampanha, StatusCampanha } from '@/lib/campaignStatus';

/**
 * O selo de status — e a razão dele.
 *
 * Antes eram três palavras (Ativa / Pausada / Encerrada) para onze
 * situações diferentes, e "Ativa" era a pior delas: a campanha de fato
 * estava ativa, mas não entregava nada porque os conjuntos tinham sido
 * desligados. O cliente lia "Ativa" e concluía que estava no ar.
 *
 * Duas mudanças de desenho:
 *
 * O rótulo diz o que está acontecendo com a ENTREGA, não com o botão. Por
 * isso "Veiculando", e não "Ativa".
 *
 * O selo carrega o motivo. Saber que não veicula é metade; a outra metade é
 * por quê — e é ela que faz alguém agir. O `effective_status` cru vai junto,
 * porque é o que encerra discussão quando o cliente compara com o
 * Gerenciador aberto ao lado.
 */
const ESTILOS: Record<EstadoCampanha, string> = {
  veiculando: 'bg-status-active/10 text-status-active border-status-active/20',
  em_analise: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  nao_aprovada: 'bg-red-500/10 text-red-400 border-red-500/20',
  sem_veiculacao: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  fora_do_periodo: 'bg-white/5 text-white/50 border-white/10',
  verba_esgotada: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  com_problemas: 'bg-red-500/10 text-red-400 border-red-500/20',
  pausada: 'bg-white/5 text-white/50 border-white/10',
  encerrada: 'bg-red-500/10 text-red-400 border-red-500/20',
  // Borda tracejada: a incerteza precisa ser visível sem depender de cor.
  nao_confirmada: 'bg-white/5 text-white/50 border-white/20 border-dashed',
  desconhecida: 'bg-white/5 text-white/50 border-white/20 border-dashed',
};

export function StatusBadge({ status }: { status: StatusCampanha }) {
  // `?? ESTILOS.desconhecida` não é paranoia: o `Record` anterior fazia
  // `config.className` estourar com qualquer valor fora da união, e derrubar
  // a tabela inteira. Um estado inesperado deve produzir um selo feio, não
  // uma tela branca.
  const classe = ESTILOS[status?.estado] ?? ESTILOS.desconhecida;
  const rotulo = status?.rotulo ?? 'Status não reconhecido';
  const explicacao = [status?.motivo, status?.bruto && `Meta: ${status.bruto}`]
    .filter(Boolean)
    .join(' · ');

  const selo = (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        classe,
      )}
    >
      {rotulo}
      {status?.veiculando === null && (
        <span className="ml-1 opacity-60" aria-hidden>?</span>
      )}
    </span>
  );

  if (!explicacao) return selo;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>{selo}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="max-w-[260px]">
        {explicacao}
      </TooltipContent>
    </Tooltip>
  );
}
