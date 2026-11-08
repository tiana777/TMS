"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PackagePlus,
  FileSpreadsheet,
  Truck,
  CheckCircle2,
  LayoutDashboard,
  Wallet,
  AlertTriangle,
  Award,
  Settings,
  Users,
  MapPin,
} from "lucide-react";

const navigation = [
  { name: "Tableau de Bord", href: "/", icon: LayoutDashboard },
  { name: "01. Réception Inbound", href: "/inbound", icon: PackagePlus },
  { name: "02. Import Fichiers", href: "/import", icon: FileSpreadsheet },
  { name: "03A. Dispatch Ville (Urbain)", href: "/dispatch", icon: Truck },
  { name: "03B. Dispatch Province (Gares)", href: "/dispatch/province", icon: MapPin },
  { name: "05. Pointage Terrain", href: "/tracking", icon: CheckCircle2 },
  { name: "07. Caisse & Clôture", href: "/cash", icon: Wallet },
  { name: "09. CRM Expéditeurs", href: "/crm", icon: Users },
  { name: "10. Référentiel Logistique", href: "/referentiel", icon: Settings },
  { name: "11. Scorecards Livreurs", href: "/scorecards", icon: Award },
  { name: "12. Litiges & Dettes", href: "/disputes", icon: AlertTriangle },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen sticky top-0 border-r border-slate-800 shadow-xl">
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black tracking-wider text-white flex items-center gap-2">
            <span className="text-blue-500">⚡</span> TMS EXPRESS
          </h1>
          <p className="text-xs text-slate-400 font-medium">Hub Central Tsiazotafo</p>
        </div>
        <span className="px-2 py-0.5 text-[10px] bg-blue-900 text-blue-300 font-bold rounded border border-blue-700">
          v5.0
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Modules Opérationnels
        </p>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/50"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Fuseau : GMT+3 (Indian/Antananarivo)</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Devise : Ariary Malgache (MGA)</p>
      </div>
    </aside>
  );
};
