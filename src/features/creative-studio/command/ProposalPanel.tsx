import { Check, Pencil, UserRound, X } from 'lucide-react';
import type { PropostaDeArte, PropostaDoPedido } from '@/lib/creativeStudio/proposal';

export interface ProposalPanelProps {
  proposta: PropostaDoPedido;
  /** Gerando de verdade: o painel continua na tela, sem aceitar outro sim. */
  busy?: boolean;
  onGerar: () => void;
  /** Devolve o texto ao campo de comando, com os anexos intactos. */
  onAjustar: () => void;
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
export function ProposalPanel({ proposta, busy, onGerar, onAjustar, onClose }: ProposalPanelProps) {
  const { n, pedido } = proposta.quantidade;
  const lote = n > 1;

  return (
    <aside className="studio-side-panel" aria-label="Proposta de arte">
      <header className="studio-side-panel-header">
        <div className="min-w-0">
          <p className="wavy-caps text-[10px] font-semibold uppercase text-white/45">Antes de gerar</p>
          <p className="truncate text-sm font-semibold text-white/90">
            {lote ? `${n} peças` : 'O que entendi do pedido'}
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
          {busy ? 'Gerando…' : lote ? `Gerar as ${n}` : 'Gerar assim'}
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
        <p className="text-[12.5px] leading-relaxed text-white/85">
          {peca.formato.nome}
          <span className="text-white/45"> · {peca.formato.proporcao}</span>
        </p>
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
