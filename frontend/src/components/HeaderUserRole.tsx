"use client";

import React, { useState, useEffect } from "react";
import { Shield, User, ChevronDown } from "lucide-react";

export type UserRole = "RECEPTIONNISTE" | "SUPERVISEUR" | "SUPER_ADMIN";

interface RoleConfig {
  role: UserRole;
  title: string;
  email: string;
  badge: string;
  badgeBg: string;
  badgeText: string;
}

const ROLES: Record<UserRole, RoleConfig> = {
  RECEPTIONNISTE: {
    role: "RECEPTIONNISTE",
    title: "Réceptionniste Colis",
    email: "reception@tmsexpress.mg",
    badge: "Accueil Hub",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-800",
  },
  SUPERVISEUR: {
    role: "SUPERVISEUR",
    title: "Superviseur Logistique",
    email: "superviseur@tmsexpress.mg",
    badge: "Chef de Quai",
    badgeBg: "bg-indigo-100",
    badgeText: "text-indigo-800",
  },
  SUPER_ADMIN: {
    role: "SUPER_ADMIN",
    title: "Super Admin (Direction)",
    email: "admin@tmsexpress.mg",
    badge: "Super-Privilège",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-800",
  },
};

export function HeaderUserRole() {
  const [currentRole, setCurrentRole] = useState<UserRole>("SUPERVISEUR");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("tms_user_role") as UserRole | null;
    if (saved && ROLES[saved]) {
      setCurrentRole(saved);
    }
  }, []);

  const handleSelectRole = (role: UserRole) => {
    setCurrentRole(role);
    localStorage.setItem("tms_user_role", role);
    window.dispatchEvent(new Event("tms_role_change"));
    setIsOpen(false);
  };

  const config = ROLES[currentRole];

  return (
    <div className="relative">
      <button
        data-cy="role-switcher-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-100 transition text-left border border-slate-200"
      >
        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5">
            <span
              data-cy="active-role-badge"
              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${config.badgeBg} ${config.badgeText}`}
            >
              {config.badge}
            </span>
            <p className="text-xs font-bold text-slate-800">{config.title}</p>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">{config.email}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-black flex items-center justify-center text-xs shadow">
          {currentRole === "SUPER_ADMIN" ? "👑" : currentRole === "SUPERVISEUR" ? "👔" : "📋"}
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div
          data-cy="role-switcher-dropdown"
          className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95"
        >
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
            Simulateur de Profil & Rôle (RBAC)
          </p>
          {(Object.keys(ROLES) as UserRole[]).map((r) => {
            const item = ROLES[r];
            const isSelected = r === currentRole;
            return (
              <button
                key={r}
                data-cy={`select-role-${r.toLowerCase()}`}
                onClick={() => handleSelectRole(r)}
                className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition ${
                  isSelected ? "bg-slate-100 font-bold" : "hover:bg-slate-50"
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">
                      {r === "SUPER_ADMIN" ? "👑" : r === "SUPERVISEUR" ? "👔" : "📋"}
                    </span>
                    <span className="text-xs font-bold text-slate-800">{item.title}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{item.email}</p>
                </div>
                {isSelected && <span className="text-xs text-emerald-600 font-bold">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
