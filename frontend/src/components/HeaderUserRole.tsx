"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  User,
  ChevronDown,
  Lock,
  LogOut,
  LogIn,
  KeyRound,
  AlertCircle,
  Loader2,
  X,
  Users,
  CheckCircle2,
} from "lucide-react";
import type { FluxType } from "@/types";
import { fetchCurrentUser } from "@/lib/api";

export type UserRole = "RECEPTIONNISTE" | "SUPERVISEUR" | "SUPER_ADMIN";

export interface ReceptionistAgent {
  id: number;
  username: string;
  nom: string;
  matricule?: string;
  flux?: FluxType;
  fluxLabel?: string;
  email: string;
  badge: string;
  description?: string;
  icon: string;
  badgeBg: string;
  badgeText: string;
}

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
    badge: "Agent Quai",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-800",
  },
  SUPERVISEUR: {
    role: "SUPERVISEUR",
    title: "Direction des Opérations",
    email: "directeur@tmsexpress.mg",
    badge: "Directeur Opérations",
    badgeBg: "bg-indigo-100",
    badgeText: "text-indigo-800",
  },
  SUPER_ADMIN: {
    role: "SUPER_ADMIN",
    title: "Super Administrateur",
    email: "admin@tmsexpress.mg",
    badge: "Super Admin",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-800",
  },
};

export function HeaderUserRole() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>("SUPER_ADMIN");
  const [activeUsername, setActiveUsername] = useState<string>("admin");
  const [userNom, setUserNom] = useState<string>("Super Administrateur");
  const [userEmail, setUserEmail] = useState<string>("admin@tmsexpress.mg");
  const [isOpen, setIsOpen] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const syncStateFromStorage = () => {
      if (typeof window === "undefined") return;
      let token = localStorage.getItem("tms_token");

      // Vérifier si le token JWT est valide et non expiré
      if (token) {
        try {
          const parts = token.split(".");
          if (parts.length === 3) {
            let payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
            const rem = payloadB64.length % 4;
            if (rem) payloadB64 += "=".repeat(4 - rem);
            const payload = JSON.parse(atob(payloadB64));
            if (payload.exp && payload.exp < Date.now() / 1000) {
              localStorage.removeItem("tms_token");
              token = null;
            }
          }
        } catch {
          localStorage.removeItem("tms_token");
          token = null;
        }
      }

      const isAuthed = Boolean(token);
      setHasToken(isAuthed);

      if (!isAuthed) {
        return;
      }

      const savedRole = localStorage.getItem("tms_user_role") as UserRole | null;
      const savedUsername = localStorage.getItem("tms_username");
      const savedNom = localStorage.getItem("tms_user_nom");
      const savedEmail = localStorage.getItem("tms_user_email");

      if (savedRole === ("LIVREUR" as any)) {
        handleLogout();
        return;
      }

      if (savedRole && ROLES[savedRole]) {
        setCurrentRole(savedRole);
      }
      if (savedUsername) {
        setActiveUsername(savedUsername);
      }
      if (savedNom) {
        setUserNom(savedNom);
      }
      if (savedEmail) {
        setUserEmail(savedEmail);
      }

      // Synchroniser depuis la base de données (/auth/me)
      fetchCurrentUser().then((me) => {
        if (!me) return;
        const roleFromDb = me.role as UserRole;
        if (ROLES[roleFromDb]) setCurrentRole(roleFromDb);
        setActiveUsername(me.username);
        setUserNom(me.nom_complet);
        setUserEmail(me.email);
        localStorage.setItem("tms_user_id", String(me.id));
        localStorage.setItem("tms_user_role", me.role);
        localStorage.setItem("tms_username", me.username);
        localStorage.setItem("tms_user_nom", me.nom_complet);
        localStorage.setItem("tms_user_email", me.email);
      });
    };

    syncStateFromStorage();
    window.addEventListener("tms_role_change", syncStateFromStorage);
    window.addEventListener("storage", syncStateFromStorage);
    return () => {
      window.removeEventListener("tms_role_change", syncStateFromStorage);
      window.removeEventListener("storage", syncStateFromStorage);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("tms_token");
    localStorage.removeItem("tms_user_role");
    localStorage.removeItem("tms_username");
    localStorage.removeItem("tms_user_nom");
    localStorage.removeItem("tms_user_id");
    localStorage.removeItem("tms_assigned_flux");
    setHasToken(false);
    window.dispatchEvent(new Event("tms_role_change"));
    setIsOpen(false);
    router.push("/login");
  };

  if (!isMounted) {
    return <div className="h-9 w-28" />;
  }

  let displayTitle = userNom || activeUsername || "Utilisateur";
  let displayBadge = "Super Admin";
  let displayBadgeBg = "bg-emerald-50 text-emerald-700 border border-emerald-200";
  let displayIcon = "👑";

  if (currentRole === "SUPERVISEUR") {
    displayBadge = "Directeur Opérations";
    displayBadgeBg = "bg-indigo-50 text-indigo-700 border border-indigo-200";
    displayIcon = "👔";
    displayTitle = userNom || "Directeur des Opérations";
  } else if (currentRole === "RECEPTIONNISTE") {
    displayTitle = userNom || activeUsername || "Agent Quai";
    displayBadge = "Agent Quai";
    displayBadgeBg = "bg-blue-50 text-blue-700 border border-blue-200";
    displayIcon = "👤";
  }

  // État 1 : Non connecté
  if (!hasToken) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 font-medium hidden sm:inline">
          Non connecté
        </span>
        <Link
          href="/login"
          data-cy="header-login-btn"
          title="Se connecter"
          className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition text-xs flex items-center gap-1.5 font-bold cursor-pointer shadow-2xs"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Connexion</span>
        </Link>
      </div>
    );
  }

  // État 2 : Connecté
  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {/* Profile Card Trigger */}
        <button
          data-cy="role-switcher-btn"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 py-1 px-2.5 rounded-xl hover:bg-slate-50 transition text-left border border-slate-200 bg-white shadow-2xs cursor-pointer group"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
              {displayIcon}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white" />
          </div>

          <div className="text-left leading-tight hidden sm:block">
            <p className="text-xs font-bold text-slate-800 truncate max-w-[160px]">
              {displayTitle}
            </p>
            <span
              data-cy="active-role-badge"
              className={`inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded ${displayBadgeBg}`}
            >
              {displayBadge}
            </span>
          </div>

          <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition shrink-0 ml-0.5" />
        </button>

        {/* Bouton Déconnexion rapide */}
        <button
          onClick={handleLogout}
          data-cy="header-logout-quick"
          title="Se déconnecter"
          className="py-1.5 px-3 rounded-xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition text-xs flex items-center gap-1.5 font-medium cursor-pointer shadow-2xs"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-500" />
          <span className="hidden md:inline text-xs font-medium">Déconnexion</span>
        </button>
      </div>

      {isOpen && (
        <div
          data-cy="role-switcher-dropdown"
          className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-3.5 z-50 animate-in fade-in zoom-in-95"
        >
          {/* User info card */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-base shadow-xs shrink-0">
              {displayIcon}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">
                {displayTitle}
              </p>
              <p className="text-[11px] text-slate-500 font-mono truncate">
                {userEmail}
              </p>
              <span className={`inline-block text-[9px] font-bold uppercase px-1.5 py-0.5 rounded mt-1 ${displayBadgeBg}`}>
                {displayBadge}
              </span>
            </div>
          </div>

          {/* Action Déconnexion */}
          <div className="pt-2.5 mt-2.5 border-t border-slate-100">
            <button
              type="button"
              data-cy="logout-btn"
              onClick={handleLogout}
              className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Se déconnecter</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
