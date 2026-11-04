import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { DashboardMigrado } from './DashboardMigrado';

/**
 * A porta do sistema.
 *
 * Além da sessão, ela decide uma segunda coisa desde a migração dos
 * dashboards para o CRM: **quem não é admin não entra em rota nenhuma.**
 * Em vez do conteúdo, recebe o aviso de que o endereço mudou.
 *
 * O portão mora aqui, e não em cada página, porque é aqui que passa tudo o
 * que é interno — `ProtectedRoute` envolve o `DashboardLayout`, e o layout
 * carrega todas as rotas do app. Espalhar a verificação por página deixaria
 * a próxima rota nova aberta por esquecimento, que é exatamente o tipo de
 * buraco que ninguém descobre até um cliente passar por ele.
 *
 * **Falha fechada de propósito.** Se a consulta do papel não responder, a
 * pessoa vê o aviso. Um admin nessa situação recarrega a página e entra; o
 * caminho oposto — deixar passar na dúvida — entregaria o sistema inteiro a
 * quem a migração tirou dele, e sem ninguém perceber.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isAdmin, isLoading: carregandoPapel } = useRole();

  // Uma espera só, para as duas perguntas. Mostrar o conteúdo enquanto o
  // papel carrega entregaria um lampejo do sistema a quem não pode vê-lo.
  if (loading || (user && carregandoPapel)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-2 border-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!isAdmin) return <DashboardMigrado />;

  return <>{children}</>;
}
