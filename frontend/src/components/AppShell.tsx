"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { HeaderUserRole } from "./HeaderUserRole";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="bg-white border-b border-slate-200 px-8 py-3.5 flex items-center justify-between shadow-xs sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
              🏢 Hub Central : Tsiazotafo / Analakely
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
              🌐 Réseau National : 8 Axes & Gares Routières
            </span>
          </div>
          <HeaderUserRole />
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
