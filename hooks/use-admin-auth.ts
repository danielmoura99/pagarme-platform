// hooks/use-admin-auth.ts
"use client";

import { useState, useEffect } from "react";

export interface AdminAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  showModal: boolean;
  authenticate: () => void;
  onSuccess: () => void;
  onClose: () => void;
}

export function useAdminAuth(): AdminAuthState {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Verificar se já está autenticado (sessionStorage)
  useEffect(() => {
    const checkAuth = () => {
      try {
        const authExpiry = sessionStorage.getItem("admin_auth_expiry");
        const now = Date.now();
        
        if (authExpiry && parseInt(authExpiry) > now) {
          setIsAuthenticated(true);
        } else {
          sessionStorage.removeItem("admin_auth_expiry");
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.warn("Erro ao verificar auth admin:", error);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const authenticate = () => {
    if (!isAuthenticated) {
      setShowModal(true);
    }
  };

  const onSuccess = () => {
    // Autenticar por 2 horas
    const expiry = Date.now() + (2 * 60 * 60 * 1000);
    sessionStorage.setItem("admin_auth_expiry", expiry.toString());
    
    setIsAuthenticated(true);
    setShowModal(false);
  };

  const onClose = () => {
    setShowModal(false);
  };

  return {
    isAuthenticated,
    isLoading,
    showModal,
    authenticate,
    onSuccess,
    onClose,
  };
}