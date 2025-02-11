// components/LogoutButton.tsx
"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const handleLogout = () => {
    // Configuração simples de logout
    signOut({
      callbackUrl: "/login",
      redirect: true,
    });
  };

  return (
    <Button
      onClick={handleLogout}
      variant="ghost"
      className="text-red-600 hover:text-red-700"
    >
      Sair
    </Button>
  );
}
