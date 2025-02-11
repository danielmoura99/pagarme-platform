// app/(dashboard)/layout.tsx
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      {/* Sidebar com Gradiente */}
      <AppSidebar className="fixed left-0 w-64 h-screen z-30 bg-gradient-to-b from-gray-800 to-gray-900 text-gray-100 border-r border-gray-700" />

      {/* Conteúdo Principal Sem Header Fixo */}
      <main className="flex-1 rounded-2xl">
        {/* Trigger Mobile Flutuante */}
        <div className="fixed top-2 left-2 z-40 md:hidden">
          <SidebarTrigger className="text-gray-300 hover:text-white bg-gray-700/50 backdrop-blur-sm rounded-lg p-2" />
        </div>

        {/* Conteúdo Adaptado */}
        <div className="p-4 lg:ml-64 mt-4">{children}</div>
      </main>
    </SidebarProvider>
  );
}
