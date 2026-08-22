import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { CRM_URL } from '@/config/externalLinks';

/**
 * O que sobrou de `/crm`.
 *
 * A página que existia aqui embutia o CRM num iframe, com uma URL por
 * cliente (`clients.crm_url`) e um caminho de SSO. Ela funcionava para
 * quem tinha as duas coisas configuradas e terminava em "Nenhum cliente
 * vinculado à sua conta" para todo o resto — a aba aparecia para todos e
 * servia a quase ninguém. O menu agora leva direto ao login do CRM.
 *
 * Este componente existe só para os favoritos: apagar a rota faria `/crm`
 * cair no `NotFound`, e um link morto é pior que uma ida ao lugar certo.
 * `replace` em vez de `assign` para o botão voltar não trazer de volta
 * para cá num laço.
 */
export default function CrmRedirect() {
  useEffect(() => {
    window.location.replace(CRM_URL);
  }, []);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <Loader2 className="h-5 w-5 animate-spin text-white/45" />
      <p className="text-sm text-white/70">Abrindo o CRM…</p>
      <a href={CRM_URL} className="text-xs text-white/45 underline underline-offset-4">
        Se não abrir sozinho, clique aqui
      </a>
    </div>
  );
}
