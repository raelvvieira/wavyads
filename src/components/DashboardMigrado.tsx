import { ArrowRight } from 'lucide-react';
import wavyLogo from '@/assets/wavy-logo.png';
import { CRM_URL } from '@/config/externalLinks';
import { useAuth } from '@/hooks/useAuth';

/**
 * O aviso de que os dashboards mudaram de endereço.
 *
 * Substitui o sistema inteiro para quem não é admin, em vez de redirecionar
 * sozinho. Um redirecionamento automático tiraria a pessoa daqui antes de
 * ela ler por que saiu — e quem chega por um link salvo ou pelo histórico
 * voltaria a cair aqui sem nunca entender o que aconteceu.
 *
 * Fundo branco, e não o tema do app, de propósito: é a forma mais rápida de
 * dizer "isto não é mais a sua tela" sem precisar de uma frase a mais. Por
 * isso as cores aqui são literais em vez de tokens — a página não deve
 * mudar quando o tema muda, nem clarear junto com o resto do sistema.
 *
 * **Isto é um aviso, não uma tranca.** O controle de quem vê os dados de
 * qual cliente continua onde sempre esteve: na conferência de `client_users`
 * dentro das edge functions, que é a única barreira que o navegador não
 * consegue contornar.
 */
export function DashboardMigrado() {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-5 py-10">
      <div className="w-full max-w-md text-center">
        <img src={wavyLogo} alt="WAVY" className="mx-auto mb-7 h-11 w-11 rounded-xl" />

        <h1 className="text-[22px] font-semibold leading-snug text-neutral-900">
          O seu dashboard mudou de endereço
        </h1>

        <p className="mx-auto mt-3 max-w-sm text-[14.5px] leading-relaxed text-neutral-600">
          Os dashboards da WAVY Marketing agora ficam na nova plataforma.
          É lá que você acompanha as suas campanhas a partir de agora.
        </p>

        {/* A informação que evita o chamado: as contas já foram migradas, e
            ninguém precisa criar nada nem pedir senha nova. Sem esta frase,
            o primeiro impulso de quem lê é ligar perguntando. */}
        <p className="mx-auto mt-4 max-w-sm rounded-xl bg-neutral-100 px-4 py-3 text-[13.5px] leading-relaxed text-neutral-700">
          Entre com <strong className="font-semibold text-neutral-900">o mesmo e-mail e a mesma senha</strong> que
          você já usava aqui. Nada muda no seu acesso.
        </p>

        <a
          href={CRM_URL}
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-5 py-3 text-[14.5px] font-semibold text-white transition-colors hover:bg-neutral-800"
        >
          Acessar o novo dashboard
          <ArrowRight className="h-4 w-4" />
        </a>

        <p className="mt-3 break-all text-[12px] text-neutral-400">{CRM_URL}</p>

        {/* Sair continua possível. Uma tela sem saída prende quem entrou na
            conta errada — e, nesta, não há mais nenhum outro botão. */}
        <button
          type="button"
          onClick={() => { void signOut(); }}
          className="mt-8 text-[12.5px] text-neutral-500 underline underline-offset-4 transition-colors hover:text-neutral-800"
        >
          Sair desta conta
        </button>
      </div>
    </div>
  );
}
