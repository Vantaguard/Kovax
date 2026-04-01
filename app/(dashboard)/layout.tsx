import { requireAuth } from '@/lib/auth';
import Sidebar from '@/components/dashboard/Sidebar';
import Navbar from '@/components/dashboard/Navbar';
import { UserProvider } from '@/contexts/UserContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { AppConfigProvider } from '@/contexts/AppConfigContext';
import { ToastProvider } from '@/components/ui/ToastProvider';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

  return (
    <UserProvider>
      <OrganizationProvider>
        <AppConfigProvider>
        <ToastProvider>
          <div className="flex h-screen bg-slate-900">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <Navbar />
              <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-900">
                <div className="container mx-auto px-6 py-8">{children}</div>
              </main>
            </div>
          </div>
        </ToastProvider>
        </AppConfigProvider>
      </OrganizationProvider>
    </UserProvider>
  );
}
