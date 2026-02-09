import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="lg:pl-[280px] min-h-screen">
        <Outlet />
      </div>
    </div>
  );
}
