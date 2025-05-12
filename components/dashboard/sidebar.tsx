//components/dashboard/sidebar.tsx
"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  Home,
  Package,
  ShoppingCart,
  Users,
  HandCoins,
  BadgeDollarSign,
  Tag,
  Settings,
  LogOut,
  Lock,
  ChartColumnIncreasingIcon,
} from "lucide-react";
//import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Dados do usuário - idealmente viriam da sessão
const userData = {
  name: "Admin",
  email: "admin@exemplo.com",
  avatar: "/avatar.jpg",
};

// Itens do menu principal
const mainMenuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
    disabled: false,
  },
  {
    title: "Produtos",
    url: "/products",
    icon: Package,
    disabled: false,
  },
  {
    title: "Checkout",
    url: "/checkout-settings",
    icon: ShoppingCart,
    disabled: false,
  },
  {
    title: "Clientes",
    url: "/clients",
    icon: Users,
    disabled: true, // Desabilitado - em desenvolvimento
  },
  {
    title: "Cupons",
    url: "/coupons",
    icon: Tag,
    disabled: false,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: ChartColumnIncreasingIcon,
    disabled: false,
  },
];

// Itens do menu de afiliados/configurações
const affiliateMenuItems = [
  {
    title: "Afiliados",
    url: "/recipients",
    icon: HandCoins,
    disabled: false,
  },
  {
    title: "Financeiro",
    url: "/finance",
    icon: BadgeDollarSign,
    disabled: true, // Desabilitado - em desenvolvimento
  },
  {
    title: "Configurações",
    url: "/settings",
    icon: Settings,
    disabled: true, // Desabilitado - em desenvolvimento
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  // Função para verificar se um item está ativo
  const isActive = (url: string) => {
    return pathname === url || pathname.startsWith(`${url}/`);
  };

  // Função de logout
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  // Renderiza um item de menu com ou sem tooltip de "Em desenvolvimento"
  const renderMenuItem = (item: (typeof mainMenuItems)[0]) => {
    // Classes base para o item de menu
    const baseClasses = `transition-colors ${
      isActive(item.url)
        ? "bg-primary/20 text-white"
        : "text-gray-300 hover:bg-gray-700/30 hover:text-white"
    }`;

    // Se o item estiver desabilitado, renderiza com tooltip
    if (item.disabled) {
      return (
        <SidebarMenuItem key={item.title}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`flex items-center px-4 py-2 cursor-not-allowed opacity-50 ${baseClasses}`}
                >
                  <item.icon className="size-4 mr-3" />
                  <span>{item.title}</span>
                  <Lock className="ml-auto h-3 w-3 text-gray-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Em desenvolvimento</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </SidebarMenuItem>
      );
    }

    // Se o item estiver habilitado, renderiza normalmente
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          asChild
          isActive={isActive(item.url)}
          className={baseClasses}
        >
          <a href={item.url} className="flex items-center px-4">
            <item.icon className="size-4 mr-3" />
            <span>{item.title}</span>
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar
      collapsible="icon"
      variant="inset"
      className="bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100 border-r border-gray-700/50"
      {...props}
    >
      {/* Header com Logo e Título */}
      <SidebarHeader className="p-4 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/20 p-2">
            <BadgeDollarSign className="size-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">PayStep</h2>
            <p className="text-xs text-gray-400">Plataforma de Vendas</p>
          </div>
        </div>
      </SidebarHeader>

      {/* Conteúdo Principal */}
      <SidebarContent className="py-4">
        {/* Menu Principal */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-xs uppercase text-gray-400 mb-1">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarMenu>{mainMenuItems.map(renderMenuItem)}</SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator className="my-4 bg-gray-700/50" />

        {/* Menu de Afiliados/Configurações */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-xs uppercase text-gray-400 mb-1">
            Afiliados & Configurações
          </SidebarGroupLabel>
          <SidebarMenu>{affiliateMenuItems.map(renderMenuItem)}</SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer com informações do usuário e logout */}
      <SidebarFooter className="border-t border-gray-700/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="font-medium text-xs text-white">
                {userData.name.charAt(0)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">
                {userData.name}
              </span>
              <span className="text-xs text-gray-400">{userData.email}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            className="text-gray-300 hover:text-white p-1"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
