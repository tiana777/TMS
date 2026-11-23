"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { HeaderUserRole } from "./HeaderUserRole";

export function isUserAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  let token = localStorage.getItem("tms_token");
  if (!token) return false;
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      let payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const rem = payloadB64.length % 4;
      if (rem) payloadB64 += "=".repeat(4 - rem);
      const payload = JSON.parse(atob(payloadB64));
      if (payload.exp && payload.exp < Date.now() / 1000) {
        localStorage.removeItem("tms_token");
        return false;
      }
    }
  } catch {
    localStorage.removeItem("tms_token");
    return false;
  }
  return true;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = () => {
      const authed = isUserAuthenticated();
      setIsAuthenticated(authed);
      setCheckingAuth(false);

      if (!authed && pathname !== "/login") {
        router.replace("/login");
      }
    };

    checkAuth();
    window.addEventListener("tms_role_change", checkAuth);
    return () => window.removeEventListener("tms_role_change", checkAuth);
  }, [pathname, router]);

  // Si on est sur la page de connexion, on affiche directement la page login sans layout
  if (isLoginPage) {
    return <main className="min-h-screen">{children}</main>;
  }

  // Pendant la vérification d'authentification ou si non connecté, redirection
  if (checkingAuth || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Redirection vers la page de connexion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="bg-white border-b border-slate-200 px-6 sm:px-8 py-2.5 flex items-center justify-between shadow-xs sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-700">Hub Central</span>
            <span className="text-xs text-slate-300">•</span>
            <span className="text-xs text-slate-500">Antananarivo</span>
          </div>
          <HeaderUserRole />
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
