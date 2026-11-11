"use client";

import React, { useState, useEffect } from "react";
import { Shield, User, ChevronDown, CheckCircle2 } from "lucide-react";

export type UserRole = "RECEPTIONNISTE" | "SUPERVISEUR" | "SUPER_ADMIN";

export interface ReceptionistAgent {
  id: number;
  username: string;
  nom: string;
  flux: "COD" | "SIMPLE" | "PROVINCE" | "RETOUR" | "ENTREPRISE";
  fluxLabel: string;
  email: string;
  badge: string;
  icon: string;
  badgeBg: string;
  badgeText: string;
}

export const RECEPTIONIST_AGENTS: ReceptionistAgent[] = [
  {
    id: 4,
    username: "recep_cod",
    nom: "Aina (Guichet 1)",
    flux: "COD",
    fluxLabel: "Flux COD Urbain",
    email: "recep.cod@tmsexpress.mg",
    badge: "Guichet 1 • COD",
    icon: "📦",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-800",
  },
  {
    id: 5,
    username: "recep_simple",
    nom: "Faly (Guichet 2)",
    flux: "SIMPLE",
    fluxLabel: "Flux Port Payé / Simple",
    email: "recep.simple@tmsexpress.mg",
    badge: "Guichet 2 • Port Payé",
    icon: "✉️",
    badgeBg: "bg-teal-100",
    badgeText: "text-teal-800",
  },
  {
    id: 6,
    username: "recep_province",
    nom: "Hery (Guichet 3)",
    flux: "PROVINCE",
    fluxLabel: "Flux Expéditions Province",
    email: "recep.prov@tmsexpress.mg",
    badge: "Guichet 3 • Province",
    icon: "🚌",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-800",
  },
  {
    id: 7,
    username: "recep_retour",
    nom: "Voahirana (Guichet 4)",
    flux: "RETOUR",
    fluxLabel: "Flux SAV & Retours",
    email: "recep.sav@tmsexpress.mg",
    badge: "Guichet 4 • Retours SAV",
    icon: "🔄",
    badgeBg: "bg-rose-100",
    badgeText: "text-rose-800",
  },
  {
    id: 8,
    username: "recep_b2b",
    nom: "Mamy (Guichet 5)",
    flux: "ENTREPRISE",
    fluxLabel: "Flux Entreprises & B2B",
    email: "recep.b2b@tmsexpress.mg",
    badge: "Guichet 5 • B2B / Mass",
    icon: "🏢",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-800",
  },
];

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
  const [activeAgentUsername, setActiveAgentUsername] = useState<string>("recep_cod");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("tms_user_role") as UserRole | null;
    const savedUsername = localStorage.getItem("tms_username");
    if (saved && ROLES[saved]) {
      setCurrentRole(saved);
    }
    if (savedUsername) {
      setActiveAgentUsername(savedUsername);
    }
  }, []);

  const handleSelectRole = (role: UserRole) => {
    setCurrentRole(role);
    localStorage.setItem("tms_user_role", role);
    if (role === "RECEPTIONNISTE") {
      const defaultAgent = RECEPTIONIST_AGENTS.find((a) => a.username === activeAgentUsername) || RECEPTIONIST_AGENTS[0];
      handleSelectReceptionist(defaultAgent);
      return;
    } else {
      localStorage.removeItem("tms_assigned_flux");
      localStorage.removeItem("tms_username");
      localStorage.removeItem("tms_user_id");
      localStorage.removeItem("tms_user_nom");
    }
    window.dispatchEvent(new Event("tms_role_change"));
    setIsOpen(false);
  };

  const handleSelectReceptionist = (agent: ReceptionistAgent) => {
    setCurrentRole("RECEPTIONNISTE");
    setActiveAgentUsername(agent.username);
    localStorage.setItem("tms_user_role", "RECEPTIONNISTE");
    localStorage.setItem("tms_username", agent.username);
    localStorage.setItem("tms_user_id", agent.id.toString());
    localStorage.setItem("tms_user_nom", agent.nom);
    localStorage.setItem("tms_assigned_flux", agent.flux);
    window.dispatchEvent(new Event("tms_role_change"));
    setIsOpen(false);
  };

  const selectedAgent = RECEPTIONIST_AGENTS.find((a) => a.username === activeAgentUsername) || RECEPTIONIST_AGENTS[0];

  const displayConfig =
    currentRole === "RECEPTIONNISTE" && selectedAgent
      ? {
          title: selectedAgent.nom,
          email: selectedAgent.email,
          badge: selectedAgent.badge,
          badgeBg: selectedAgent.badgeBg,
          badgeText: selectedAgent.badgeText,
          icon: selectedAgent.icon,
        }
      : {
          ...ROLES[currentRole],
          icon: currentRole === "SUPER_ADMIN" ? "👑" : "👔",
        };

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
              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${displayConfig.badgeBg} ${displayConfig.badgeText}`}
            >
              {displayConfig.badge}
            </span>
            <p className="text-xs font-bold text-slate-800">{displayConfig.title}</p>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">{displayConfig.email}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-black flex items-center justify-center text-xs shadow">
          {displayConfig.icon}
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div
          data-cy="role-switcher-dropdown"
          className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-50 animate-in fade-in zoom-in-95"
        >
          {/* Main Profiles */}
          <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
            Rôles de Supervision & Direction
          </p>
          <div className="space-y-1 my-1">
            <button
              data-cy="select-role-super_admin"
              onClick={() => handleSelectRole("SUPER_ADMIN")}
              className={`w-full p-2 rounded-xl flex items-center justify-between text-left transition ${
                currentRole === "SUPER_ADMIN" ? "bg-emerald-50 border border-emerald-200 font-bold" : "hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">👑</span>
                <div>
                  <span className="text-xs font-bold text-slate-800">Super Admin (Direction)</span>
                  <p className="text-[10px] text-slate-500 font-mono">admin@tmsexpress.mg</p>
                </div>
              </div>
              {currentRole === "SUPER_ADMIN" && <span className="text-xs text-emerald-600 font-bold">✓</span>}
            </button>

            <button
              data-cy="select-role-superviseur"
              onClick={() => handleSelectRole("SUPERVISEUR")}
              className={`w-full p-2 rounded-xl flex items-center justify-between text-left transition ${
                currentRole === "SUPERVISEUR" ? "bg-indigo-50 border border-indigo-200 font-bold" : "hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">👔</span>
                <div>
                  <span className="text-xs font-bold text-slate-800">Superviseur Logistique</span>
                  <p className="text-[10px] text-slate-500 font-mono">superviseur@tmsexpress.mg</p>
                </div>
              </div>
              {currentRole === "SUPERVISEUR" && <span className="text-xs text-indigo-600 font-bold">✓</span>}
            </button>
          </div>

          {/* 5 Receptionist Agents with dedicated flows */}
          <div className="pt-2 border-t border-slate-100">
            <div className="px-3 py-1 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                5 Guichets Réceptionnistes (Flux Cloisonnés)
              </span>
              <button
                data-cy="select-role-receptionniste"
                onClick={() => handleSelectRole("RECEPTIONNISTE")}
                className="text-[10px] font-bold text-slate-400 hover:text-blue-600 underline"
                title="Sélectionner le guichet par défaut"
              >
                Général
              </button>
            </div>

            <div className="space-y-1 mt-1">
              {RECEPTIONIST_AGENTS.map((agent) => {
                const isSelected = currentRole === "RECEPTIONNISTE" && activeAgentUsername === agent.username;
                return (
                  <button
                    key={agent.username}
                    data-cy={`select-agent-${agent.username}`}
                    onClick={() => handleSelectReceptionist(agent)}
                    className={`w-full p-2 rounded-xl flex items-center justify-between text-left transition ${
                      isSelected
                        ? "bg-blue-50/80 border border-blue-200 font-bold shadow-sm"
                        : "hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{agent.icon}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800">{agent.nom}</span>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${agent.badgeBg} ${agent.badgeText}`}>
                            {agent.flux}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono">{agent.email}</p>
                      </div>
                    </div>
                    {isSelected && <span className="text-xs text-blue-600 font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
