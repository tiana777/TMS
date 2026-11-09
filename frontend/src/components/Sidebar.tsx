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
  Bike,
} from "lucide-react";

const navigation = [
  { name: "Tableau de Bord", href: "/", icon: LayoutDashboard },
  { name: "01. Réception Inbound", href: "/inbound", icon: PackagePlus },
  { name: "02. Import Fichiers", href: "/import", icon: FileSpreadsheet },
  { name: "03A. Dispatch Ville (Urbain)", href: "/dispatch", icon: Truck },
  { name: "03B. Dispatch Province (Gares)", href: "/dispatch/province", icon: MapPin },
  { name: "04. Flotte & Livreurs", href: "/couriers", icon: Bike },
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
    <aside className="w-64 bg-white text-slate-800 flex flex-col h-screen sticky top-0 border-r border-slate-200/90 shadow-xs z-20">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
            <span className="text-blue-600">⚡</span> TMS EXPRESS
          </h1>
          <p className="text-[11px] text-slate-400 font-normal">Hub Central Tsiazotafo</p>
        </div>
        <span className="px-1.5 py-0.5 text-[10px] bg-blue-50 text-blue-700 font-semibold rounded border border-blue-200">
          v5.0
        </span>
      </div>

      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        <p className="px-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
          Modules Opérationnels
        </p>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white shadow-xs font-semibold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-slate-400"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Fuseau : GMT+3 (Indian/Antananarivo)</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5">Devise : Ariary Malgache (MGA)</p>
      </div>
    </aside>
  );
};
