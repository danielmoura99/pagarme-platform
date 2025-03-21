// app/(dashboard)/layout.tsx
"use client";

import { useEffect, useState } from "react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/sidebar";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Estado para detectar rolagem e aplicar sombra ao cabeçalho
  const [scrolled, setScrolled] = useState(false);

  // Detectar rolagem para aplicar efeitos visuais
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <SidebarProvider defaultOpen={true}>
      {/* Sidebar com estilo mais moderno */}
      <AppSidebar variant="sidebar" />

      {/* Conteúdo principal */}
      <SidebarInset>
        {/* Trigger Mobile Flutuante */}
        <div className="fixed top-4 left-4 z-40 md:hidden">
          <SidebarTrigger className="text-gray-300 hover:text-white bg-gray-700/50 backdrop-blur-sm rounded-lg p-2" />
        </div>

        {/* Conteúdo principal */}
        <main className="min-h-screen bg-gray-50">
          {/* Contêiner do conteúdo principal */}
          <div
            className={cn(
              "transition-all duration-200",
              scrolled ? "pt-16" : "pt-20"
            )}
          >
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
