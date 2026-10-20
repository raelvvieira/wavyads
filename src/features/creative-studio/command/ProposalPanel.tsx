import { Check, Pencil, UserRound, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PropostaDeArte, PropostaDoPedido } from '@/lib/creativeStudio/proposal';

export interface ProposalPanelProps {
  proposta: PropostaDoPedido;
  /** Gerando de verdade: o painel continua na tela, sem aceitar outro sim. */
  busy?: boolean;
  onGerar: () => void;
  /** Devolve o texto ao campo de comando, com os anexos intactos. */
  onAjustar: () => void;
  /**
   * Troca o formato antes de gerar. `null` é "nenhum formato".
   *
   * Sem ele o painel seria um aviso: diria qual peça vai sair e deixaria a
   * pessoa sem nada a fazer a respeito a não ser reescrever o pedido e
   * torcer. A troca é o que transforma a proposta de explicação em decisão.
   */
  onTrocarFormato?: (containerId: string | null) => void;
  onClose: () => void;
}

/**
 * O que o sistema entendeu, antes de gastar uma geração.
 *
 * Toda esta informação já era produzida: a direção de arte roda em TODA
 * geração e fica gravada no metadata, com um comentário no código dizendo
 * que serve "para o inspetor explicar por que a peça saiu como saiu". O
 * inspetor nunca leu. O usuário via um spinner mudo e uma imagem pronta.
 *
 * Mostrar antes muda o que se pode fazer a respeito: deixa de ser
 * explicação do passado e vira decisão. Se o sistema entendeu errado, o
 * conserto é uma frase em vez de uma arte jogada fora.
 *
 * O painel não interpreta nada — a leitura inteira chega pronta em
 * `proposta`, de `montarPropostaDoPedido`. Aqui só se desenha.
 */
export function ProposalPanel({ proposta, busy, onGerar, onAjustar, onTrocarFormato, onClose }: ProposalPanelProps) {
  const { n, pedido } = proposta.quantidade;
  const lote = n > 1;
  const edicao = proposta.edicao;

  return (
    <aside className="studio-side-panel" aria-label="Proposta de arte">
      <header className="studio-side-panel-header">
        <div className="min-w-0">
          <p className="wavy-caps text-[10px] font-semibold uppercase text-white/45">Antes de gerar</p>
          <p className="truncate text-sm font-semibold text-white/90">
            {edicao ? 'Alterar esta arte' : lote ? `${n} peças` : 'O que entendi do pedido'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar proposta"
          className="shrink-0 rounded-full p-1 text-white/45 transition-colors hover:bg-white/[0.08] hover:text-white/80"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="studio-side-panel-body">
        {/* A alteração, dita antes de acontecer. Era este o ponto de parada
            que faltava: a edição ia direto ao provedor, e um pedido de duas
            artes novas virava uma edição sem ninguém poder intervir. */}
        {edicao && (
          <section className="space-y-1.5">
            <p className="wavy-caps text-[10px] font-semibold uppercase text-white/40">Na arte</p>
            <p className="text-[12.5px] leading-relaxed text-white/85">{edicao.arte}</p>
            <p className="wavy-caps pt-1 text-[10px] font-semibold uppercase text-white/40">Você pediu</p>
            <p className="text-[12.5px] leading-relaxed text-white/85">{edicao.pedido}</p>
          </section>
        )}

        {/* A seleção que o texto atropelou. Pode ter sido a que você
            esqueceu de soltar — e aí "Ajustar" custa um clique, em vez de
            uma arte. */}
        {proposta.ignorouSelecao && (
          <p className="rounded-lg bg-white/[0.06] px-2.5 py-2 text-[11.5px] leading-relaxed text-white/70">
            Você tem uma arte selecionada, mas pediu peça nova — então vou criar.
            Se queria alterar aquela arte, clique em Ajustar.
          </p>
        )}

        {/* O teto, quando ele cortou. Entregar 4 calada depois de um pedido
            de 10 é mentir pelo resultado. */}
        {pedido > n && (
          <p className="rounded-lg bg-white/[0.06] px-2.5 py-2 text-[11.5px] leading-relaxed text-white/70">
            Você pediu {pedido}. Vou gerar {n} agora — é o limite por pedido.
            Para as outras, é só pedir de novo.
          </p>
        )}

        {/* O cliente lido do texto precisa de confirmação: o sistema mexeu
            numa escolha que o usuário não fez à mão, e errar o dono manda a
            arte para a biblioteca do cliente errado. */}
        {proposta.cliente && (
          <section className="flex items-start gap-1.5">
            <UserRound className="mt-[2px] h-3.5 w-3.5 shrink-0 text-white/40" />
            <p className="text-[12.5px] leading-relaxed text-white/85">
              {proposta.cliente.nome}
              {proposta.cliente.doTexto && (
                <span className="text-white/45"> · reconheci no seu pedido</span>
              )}
            </p>
          </section>
        )}

        {proposta.pecas.map((peca, i) => (
          <Peca key={i} peca={peca} rotulo={lote ? `Peça ${i + 1} de ${n}` : null} />
        ))}

        {/* O formato que você pediu existe — noutra proporção.
            Sem esta linha a arte sai comum e o pedido parece não ter sido
            lido, que é o pior desfecho possível para um pedido escrito com
            todas as letras. */}
        {proposta.foraDoFormato && (
          <p className="rounded-[var(--wavy-radius-control)] border border-amber-400/25 bg-amber-400/[0.07] px-2.5 py-2 text-[11.5px] leading-relaxed text-amber-200/90">
            “{proposta.foraDoFormato.nome}” só existe em {proposta.foraDoFormato.proporcao} no catálogo —
            você pediu outra proporção, então ele ficou de fora.
          </p>
        )}

        {/* A troca. É o que transforma a proposta de aviso em decisão: sem
            ela, o painel diria qual peça vai sair e deixaria a pessoa sem
            nada a fazer a não ser reescrever o pedido e torcer. */}
        {onTrocarFormato && proposta.alternativas.length > 0 && !edicao && (
          <Secao titulo="Formato">
            <div className="flex flex-wrap gap-1.5">
              {proposta.alternativas.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  disabled={busy}
                  aria-pressed={a.atual}
                  onClick={() => onTrocarFormato(a.atual ? null : a.id)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors duration-150 disabled:opacity-50',
                    a.atual
                      ? 'border-accent/45 bg-accent/15 text-white/92'
                      : 'border-white/12 bg-white/[0.05] text-white/60 hover:bg-white/[0.09] hover:text-white/85',
                  )}
                >
                  {a.nome}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-white/40">
              {proposta.alternativas.some((a) => a.atual)
                ? 'Clique no escolhido para gerar sem formato nenhum.'
                : 'Nenhum formato aplicado — clique em um para usá-lo.'}
            </p>
          </Secao>
        )}

        {/* "O sistema leu tudo" é uma promessa que ninguém consegue
            verificar. Listar as fontes transforma isso em algo conferível —
            e a lista vazia também é resposta: o pedido foi mais pobre do
            que podia ser, e dá para voltar e anexar algo. */}
        <Secao titulo="Li para isso">
          {proposta.leu.length > 0 ? (
            <ul className="space-y-1">
              {proposta.leu.map((fonte) => (
                <li key={fonte} className="flex items-start gap-1.5 text-[12px] leading-relaxed text-white/70">
                  <Check className="mt-[3px] h-3 w-3 shrink-0 text-white/40" />
                  {fonte}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px] leading-relaxed text-white/50">
              Só o seu pedido. Anexar uma referência ou escolher um cliente dá mais de onde partir.
            </p>
          )}

          {/* E o que NÃO entrou. Uma decisão certa tomada em silêncio
              parece um bug: a pessoa vê os chips no dock e não vê efeito
              nenhum na arte. */}
          {proposta.naoLeu.length > 0 && (
            <ul className="mt-1.5 space-y-1">
              {proposta.naoLeu.map((motivo) => (
                <li key={motivo} className="flex items-start gap-1.5 text-[12px] leading-relaxed text-amber-300/75">
                  <X className="mt-[3px] h-3 w-3 shrink-0" />
                  {motivo}
                </li>
              ))}
            </ul>
          )}
        </Secao>
      </div>

      <div className="studio-side-panel-footer">
        <button
          type="button"
          onClick={onGerar}
          disabled={busy}
          className="btn-accent inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3 text-[12px] font-semibold disabled:opacity-60"
        >
          <Check className="h-3.5 w-3.5" />
          {busy ? 'Gerando…' : edicao ? 'Alterar' : lote ? `Gerar as ${n}` : 'Gerar assim'}
        </button>
        <button
          type="button"
          onClick={onAjustar}
          disabled={busy}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/10 px-3 text-[12px] font-medium text-white/75 transition-colors hover:bg-white/[0.06] hover:text-white/90 disabled:opacity-60"
        >
          <Pencil className="h-3.5 w-3.5" />
          Ajustar o pedido
        </button>
      </div>
    </aside>
  );
}

function Peca({ peca, rotulo }: { peca: PropostaDeArte; rotulo: string | null }) {
  /*
   * Peça magra num lote não vira bloco vazio.
   *
   * Num pedido de duas, a leitura de uma pode voltar sem nada — e um
   * "Peça 2 de 2" seguido de espaço em branco parece defeito. Dizer que ela
   * sai do pedido como foi escrito é a informação verdadeira.
   */
  const vazia = peca.vazia;

  return (
    <section className="space-y-1.5 border-l border-white/10 pl-2.5">
      {rotulo && (
        <p className="wavy-caps text-[10px] font-semibold uppercase text-white/40">{rotulo}</p>
      )}

      {peca.formato && (
        <>
          <p className="text-[12.5px] leading-relaxed text-white/85">
            {peca.formato.nome}
            <span className="text-white/45"> · {peca.formato.proporcao}</span>
          </p>
          {/* Por que este formato. Uma escolha que o sistema faz sozinho e
              não explica é uma caixa-preta — e o layout dela entra no
              prompt como regra dura. */}
          {peca.formato.porques.length > 0 && (
            <p className="text-[11.5px] leading-relaxed text-white/45">
              {peca.formato.porques.join(' · ')}
            </p>
          )}
          {/* O que falta. Sem este aviso, a peça sai com o produto
              inventado pelo gerador — e isso só se descobre depois de
              pagar a geração. */}
          {peca.formato.faltas.length > 0 && (
            <p className="text-[11.5px] leading-relaxed text-amber-300/80">
              Esse formato pede {peca.formato.faltas.join(' e ')} — sem isso, o gerador inventa.
            </p>
          )}
        </>
      )}

      {peca.cena && <p className="text-[12.5px] leading-relaxed text-white/85">{peca.cena}</p>}

      {peca.copy.length > 0 && (
        <dl className="studio-inspector-facts">
          {peca.copy.map((bloco) => (
            <div key={bloco.papel} className="contents">
              <dt className="text-[11px] text-white/45">{bloco.papel}</dt>
              <dd className="text-[12.5px] leading-relaxed text-white/85">{bloco.texto}</dd>
            </div>
          ))}
        </dl>
      )}

      {peca.angulo && (
        <p className="text-[12.5px] leading-relaxed text-white/85">
          {peca.angulo.nome}
          {/* Dizer que o ângulo já foi usado é o que impede propor pela
              quinta vez a mesma abordagem para o mesmo cliente. */}
          <span className="text-white/45">
            {peca.angulo.inedito ? ' · ainda não usado com este cliente' : ' · já usado com este cliente'}
          </span>
        </p>
      )}

      {vazia && (
        <p className="text-[12px] leading-relaxed text-white/50">
          Sai do seu pedido como você escreveu.
        </p>
      )}
    </section>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="wavy-caps mb-1.5 text-[10px] font-semibold uppercase text-white/40">{titulo}</p>
      {children}
    </section>
  );
}
