import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useRole } from '@/hooks/useRole';
import { CreativeWorkspaceProvider } from '../store/workspaceStore';
import { CreativeWorkspace } from '../workspace/CreativeWorkspace';

/**
 * Workspace novo (Etapas 5-7). Vive numa rota própria em vez de uma flag em
 * localStorage: assim as duas versões ficam abertas lado a lado para comparar,
 * sem devtools e sem risco nenhum para a tela em produção, que segue intacta.
 */
export default function CreativeStudioV2Page() {
  const { isAdmin, isLoading } = useRole();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!isLoading && !isAdmin) navigate('/dashboard');
  }, [isAdmin, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6 pt-20 lg:pt-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <CreativeWorkspaceProvider initialProjectId={searchParams.get('project')}>
      <CreativeWorkspace />
    </CreativeWorkspaceProvider>
  );
}
