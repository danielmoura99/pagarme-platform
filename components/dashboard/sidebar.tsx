"use client";

import * as React from "react";
import {
  Home,
  Package,
  ShoppingCart,
  Users,
  Ticket,
  HandCoins,
  BadgeDollarSign,
  UserCog,
} from "lucide-react";
import { NavUser } from "@/components/nav-user";
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
} from "@/components/ui/sidebar";

const data = {
  user: {
    name: "Admin",
    email: "Controle Geral",
    avatar: "/avatars/shadcn.jpg",
  },
  menuItems: [
    {
      title: "Início",
      url: "/dashboard",
      icon: Home,
    },
    {
      title: "Produtos",
      url: "/products",
      icon: Package,
    },
    {
      title: "Checkout",
      url: "/checkout",
      icon: ShoppingCart,
    },
    {
      title: "Clientes",
      url: "/clients",
      icon: Users,
    },
    {
      title: "Afiliados",
      url: "/affiliates",
      icon: UserCog,
    },
    {
      title: "Cupons",
      url: "/coupons",
      icon: Ticket,
    },
    {
      title: "Financeiro",
      url: "/finance",
      icon: HandCoins,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      collapsible="icon"
      variant="inset"
      className="bg-gradient-to-b from-gray-800 to-gray-900 text-gray-100 border-r border-gray-700"
      {...props}
    >
      {/* Header Integrado */}
      <SidebarHeader className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <BadgeDollarSign className="size-7 text-blue-400" />
          <div>
            <h2 className="text-lg font-semibold">PayStep</h2>
            <p className="text-xs text-gray-400">Controle Geral</p>
          </div>
        </div>
      </SidebarHeader>

      {/* Conteúdo Principal */}
      <SidebarContent className="mt-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-xs uppercase text-gray-400 mb-2">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarMenu>
            {data.menuItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  className="hover:bg-gray-700/30 text-gray-300 hover:text-white transition-colors"
                >
                  <a href={item.url} className="flex items-center gap-3 px-4">
                    <item.icon className="size-5 text-blue-400" />
                    <span className="text-sm">{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer com Usuário */}
      <SidebarFooter className="border-t border-gray-700">
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
