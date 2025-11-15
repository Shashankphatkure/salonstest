import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';

const SalonLayout = ({ children, currentPage }) => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-white dark:bg-gray-800 px-4">
          <SidebarTrigger />
        </header>
        <main className="flex-1 overflow-auto bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-purple-900">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default SalonLayout; 