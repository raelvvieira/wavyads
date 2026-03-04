import { useParams } from 'react-router-dom';
import { useRole } from '@/hooks/useRole';
import AdminDashboard from './AdminDashboard';
import ClientDashboard from './ClientDashboard';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { clientId } = useParams();
  const { isAdmin, isLoading } = useRole();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If viewing a specific client or user is a client → show client dashboard
  if (clientId || !isAdmin) {
    return <ClientDashboard />;
  }

  // Admin home → client cards
  return <AdminDashboard />;
}
