import React from "react";
import "./globals.css";
import { Sidebar } from "../components/Sidebar";
import { HeaderUserRole } from "../components/HeaderUserRole";

export const metadata = {
  title: "TMS EXPRESS - Gestion Logistique Dernier Kilomètre",
  description: "Transport Management System pour Grand Tanà & Madagascar",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="flex min-h-screen bg-slate-50 text-slate-900 antialiased">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <header className="bg-white border-b border-slate-200 px-8 py-3.5 flex items-center justify-between shadow-sm sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                🏢 Dépôt Central : Tsiazotafo / Analakely
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
                🌐 Réseau National : 8 Corridors & 3 Gares
              </span>
            </div>
            <HeaderUserRole />
          </header>
          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
