"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  User,
  ChevronDown,
  CheckCircle2,
  Lock,
  LogOut,
  LogIn,
  KeyRound,
  AlertCircle,
  Loader2,
  X,
  Store,
  Layers,
} from "lucide-react";
import { loginApi } from "@/lib/api";

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
  const [userName, setUserName] = useState<string>("Chef de Quai Dispatcher");
  const [isOpen, setIsOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Form states for in-app login
  const [inputUsername, setInputUsername] = useState("");
  const [inputPassword, setInputPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const syncStateFromStorage = () => {
      const savedRole = localStorage.getItem("tms_user_role") as UserRole | null;
      const savedUsername = localStorage.getItem("tms_username");
      const savedNom = localStorage.getItem("tms_user_nom");

      if (savedRole && ROLES[savedRole]) {
        setCurrentRole(savedRole);
      }
      if (savedUsername) {
        setActiveAgentUsername(savedUsername);
      }
      if (savedNom) {
        setUserName(savedNom);
      }
    };

    syncStateFromStorage();
    window.addEventListener("tms_role_change", syncStateFromStorage);
    return () => window.removeEventListener("tms_role_change", syncStateFromStorage);
  }, []);

  const handleSelectRole = (role: UserRole) => {
    setCurrentRole(role);
    localStorage.setItem("tms_user_role", role);
    if (role === "RECEPTIONNISTE") {
      const defaultAgent =
        RECEPTIONIST_AGENTS.find((a) => a.username === activeAgentUsername) ||
        RECEPTIONIST_AGENTS[0];
      handleSelectReceptionist(defaultAgent);
      return;
    } else if (role === "SUPER_ADMIN") {
      localStorage.setItem("tms_username", "admin");
      localStorage.setItem("tms_user_nom", "Direction Générale TMS");
      localStorage.setItem("tms_user_id", "1");
      localStorage.removeItem("tms_assigned_flux");
    } else {
      localStorage.setItem("tms_username", "superviseur");
      localStorage.setItem("tms_user_nom", "Chef de Quai Dispatcher");
      localStorage.setItem("tms_user_id", "2");
      localStorage.removeItem("tms_assigned_flux");
    }
    window.dispatchEvent(new Event("tms_role_change"));
    setIsOpen(false);
  };

  const handleSelectReceptionist = (agent: ReceptionistAgent) => {
    setCurrentRole("RECEPTIONNISTE");
    setActiveAgentUsername(agent.username);
    setUserName(agent.nom);
    localStorage.setItem("tms_user_role", "RECEPTIONNISTE");
    localStorage.setItem("tms_username", agent.username);
    localStorage.setItem("tms_user_id", agent.id.toString());
    localStorage.setItem("tms_user_nom", agent.nom);
    localStorage.setItem("tms_assigned_flux", agent.flux);
    window.dispatchEvent(new Event("tms_role_change"));
    setIsOpen(false);
  };

  const handleRealLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUsername.trim() || !inputPassword) {
      setLoginError("Veuillez renseigner un login et un mot de passe.");
      return;
    }

    try {
      setLoginLoading(true);
      setLoginError(null);

      const res = await loginApi(inputUsername.trim(), inputPassword);

      localStorage.setItem("tms_token", res.access_token);
      localStorage.setItem("tms_user_role", res.role);
      localStorage.setItem("tms_username", res.username);
      localStorage.setItem("tms_user_nom", res.nom_complet);
      localStorage.setItem("tms_user_id", res.id.toString());
      if (res.assigned_flux) {
        localStorage.setItem("tms_assigned_flux", res.assigned_flux);
      } else {
        localStorage.removeItem("tms_assigned_flux");
      }

      setCurrentRole(res.role as UserRole);
      setActiveAgentUsername(res.username);
      setUserName(res.nom_complet);

      window.dispatchEvent(new Event("tms_role_change"));
      setShowLoginModal(false);
      setInputPassword("");
    } catch (err: any) {
      setLoginError(err.message || "Identifiants incorrects.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("tms_token");
    localStorage.removeItem("tms_user_role");
    localStorage.removeItem("tms_username");
    localStorage.removeItem("tms_user_nom");
    localStorage.removeItem("tms_user_id");
    localStorage.removeItem("tms_assigned_flux");
    setCurrentRole("SUPERVISEUR");
    setUserName("Chef de Quai Dispatcher");
    setActiveAgentUsername("superviseur");
    window.dispatchEvent(new Event("tms_role_change"));
    setIsOpen(false);
    setShowLoginModal(true);
  };

  const selectedAgent =
    RECEPTIONIST_AGENTS.find((a) => a.username === activeAgentUsername) ||
    RECEPTIONIST_AGENTS[0];

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
          title: userName || ROLES[currentRole].title,
          icon: currentRole === "SUPER_ADMIN" ? "👑" : "👔",
        };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          data-cy="role-switcher-btn"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-100 transition text-left border border-slate-200 bg-white"
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
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-black flex items-center justify-center text-xs shadow-xs">
            {displayConfig.icon}
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {/* Quick Authenticate button */}
        <button
          onClick={() => {
            setShowLoginModal(true);
            setIsOpen(false);
          }}
          title="Se connecter avec un identifiant et mot de passe"
          className="p-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 transition text-xs flex items-center gap-1.5 font-medium"
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Authentification</span>
        </button>
      </div>

      {isOpen && (
        <div
          data-cy="role-switcher-dropdown"
          className="absolute right-0 mt-2 w-84 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-50 animate-in fade-in zoom-in-95"
        >
          {/* Header with auth status */}
          <div className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Compte Actif
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Connecté
              </span>
            </div>
            <p className="text-xs font-bold text-slate-900 mt-0.5">{displayConfig.title}</p>
            <p className="text-[11px] text-slate-500 font-mono">{displayConfig.email}</p>
          </div>

          {/* Real auth actions */}
          <div className="px-1 py-1 mb-2 grid grid-cols-2 gap-1.5">
            <button
              onClick={() => {
                setShowLoginModal(true);
                setIsOpen(false);
              }}
              className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              Saisir Identifiants
            </button>
            <button
              onClick={handleLogout}
              className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Déconnexion
            </button>
          </div>

          {/* Roles de Direction & Supervision */}
          <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-t border-slate-100 pt-2">
            Rôles de Supervision & Direction
          </p>
          <div className="space-y-1 my-1">
            <button
              data-cy="select-role-super_admin"
              onClick={() => handleSelectRole("SUPER_ADMIN")}
              className={`w-full p-2 rounded-xl flex items-center justify-between text-left transition ${
                currentRole === "SUPER_ADMIN"
                  ? "bg-emerald-50 border border-emerald-200 font-bold"
                  : "hover:bg-slate-50 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">👑</span>
                <div>
                  <span className="text-xs font-bold text-slate-800">Super Admin (Direction)</span>
                  <p className="text-[10px] text-slate-500 font-mono">admin / admin123</p>
                </div>
              </div>
              {currentRole === "SUPER_ADMIN" && <span className="text-xs text-emerald-600 font-bold">✓</span>}
            </button>

            <button
              data-cy="select-role-superviseur"
              onClick={() => handleSelectRole("SUPERVISEUR")}
              className={`w-full p-2 rounded-xl flex items-center justify-between text-left transition ${
                currentRole === "SUPERVISEUR"
                  ? "bg-indigo-50 border border-indigo-200 font-bold"
                  : "hover:bg-slate-50 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">👔</span>
                <div>
                  <span className="text-xs font-bold text-slate-800">Superviseur Logistique</span>
                  <p className="text-[10px] text-slate-500 font-mono">superviseur / super123</p>
                </div>
              </div>
              {currentRole === "SUPERVISEUR" && <span className="text-xs text-indigo-600 font-bold">✓</span>}
            </button>
          </div>

          {/* 5 Receptionist Agents with dedicated flows */}
          <div className="pt-2 border-t border-slate-100">
            <div className="px-3 py-1 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                5 Guichets Réceptionnistes
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
                const isSelected =
                  currentRole === "RECEPTIONNISTE" && activeAgentUsername === agent.username;
                return (
                  <button
                    key={agent.username}
                    data-cy={`select-agent-${agent.username}`}
                    onClick={() => handleSelectReceptionist(agent)}
                    className={`w-full p-2 rounded-xl flex items-center justify-between text-left transition ${
                      isSelected
                        ? "bg-blue-50/80 border border-blue-200 font-bold shadow-xs"
                        : "hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{agent.icon}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800">{agent.nom}</span>
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${agent.badgeBg} ${agent.badgeText}`}
                          >
                            {agent.flux}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {agent.username} / recep123
                        </p>
                      </div>
                    </div>
                    {isSelected && <span className="text-xs text-blue-600 font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Direct link to dedicated login page */}
          <div className="pt-2 border-t border-slate-100 mt-1">
            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className="w-full py-1.5 px-3 rounded-lg text-slate-500 hover:text-slate-800 text-[11px] font-medium flex items-center justify-center gap-1.5 hover:bg-slate-50 transition"
            >
              Aller sur la page de connexion complète
            </Link>
          </div>
        </div>
      )}

      {/* Real Login Modal (saisie de vrai login et mdp) */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⚡</span>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Authentification TMS EXPRESS</h3>
                  <p className="text-[11px] text-slate-400">Saisie des identifiants de production</p>
                </div>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-slate-400 hover:text-white transition p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              {loginError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleRealLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Identifiant / Nom d&apos;utilisateur
                  </label>
                  <div className="relative rounded-xl">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={inputUsername}
                      onChange={(e) => setInputUsername(e.target.value)}
                      placeholder="ex: admin, superviseur, recep_cod"
                      className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Mot de passe
                  </label>
                  <div className="relative rounded-xl">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={inputPassword}
                      onChange={(e) => setInputPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLoginModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition disabled:opacity-50"
                  >
                    {loginLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Vérification...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        Se connecter
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Raccourcis pour simulation */}
              <div className="mt-5 pt-4 border-t border-slate-200">
                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Pré-remplir un compte pour simulation :
                </p>
                <div className="grid grid-cols-2 gap-1.5 text-left">
                  <button
                    type="button"
                    onClick={() => {
                      setInputUsername("admin");
                      setInputPassword("admin123");
                    }}
                    className="p-1.5 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-left transition"
                  >
                    <p className="text-xs font-bold text-slate-800">👑 Super Admin</p>
                    <p className="text-[10px] text-slate-500 font-mono">admin / admin123</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputUsername("superviseur");
                      setInputPassword("super123");
                    }}
                    className="p-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-left transition"
                  >
                    <p className="text-xs font-bold text-slate-800">👔 Superviseur</p>
                    <p className="text-[10px] text-slate-500 font-mono">superviseur / super123</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputUsername("recep_cod");
                      setInputPassword("recep123");
                    }}
                    className="p-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-left transition"
                  >
                    <p className="text-xs font-bold text-slate-800">📦 Guichet 1 COD</p>
                    <p className="text-[10px] text-slate-500 font-mono">recep_cod / recep123</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputUsername("recep_province");
                      setInputPassword("recep123");
                    }}
                    className="p-1.5 rounded-lg bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 text-left transition"
                  >
                    <p className="text-xs font-bold text-slate-800">🚌 Guichet 3 Province</p>
                    <p className="text-[10px] text-slate-500 font-mono">recep_province / recep123</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
