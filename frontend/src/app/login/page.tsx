"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Lock,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Package,
  Truck,
  Building2,
  RotateCcw,
  Send,
} from "lucide-react";
import { loginApi } from "@/lib/api";

const DEMO_ACCOUNTS = [
  {
    role: "SUPER_ADMIN",
    title: "Direction Générale (Super Admin)",
    username: "admin",
    password: "admin123",
    badge: "Super Admin",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
    desc: "Privilèges totaux, gestion financière, caisse et contrats",
    icon: "👑",
  },
  {
    role: "SUPERVISEUR",
    title: "Superviseur & Chef de Quai",
    username: "superviseur",
    password: "super123",
    badge: "Superviseur",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-300",
    desc: "Dispatching, suivi des tournées, réassignation et contrôle quai",
    icon: "👔",
  },
  {
    role: "RECEPTIONNISTE",
    title: "Guichet 1 • COD Urbain",
    username: "recep_cod",
    password: "recep123",
    badge: "Flux COD",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
    desc: "Accueil et prise en charge des colis payables à la livraison",
    icon: "📦",
  },
  {
    role: "RECEPTIONNISTE",
    title: "Guichet 2 • Port Payé (Simple)",
    username: "recep_simple",
    password: "recep123",
    badge: "Flux Simple",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-300",
    desc: "Courses simples prépayées et plis sans encaissement marchandise",
    icon: "✉️",
  },
  {
    role: "RECEPTIONNISTE",
    title: "Guichet 3 • Expéditions Province",
    username: "recep_province",
    password: "recep123",
    badge: "Flux Province",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
    desc: "Routage vers gares routières d'Antananarivo et coopératives",
    icon: "🚌",
  },
  {
    role: "RECEPTIONNISTE",
    title: "Guichet 4 • SAV & Retours",
    username: "recep_retour",
    password: "recep123",
    badge: "Flux Retours",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-300",
    desc: "Gestion des colis refusés, échanges et réexpéditions SAV",
    icon: "🔄",
  },
  {
    role: "RECEPTIONNISTE",
    title: "Guichet 5 • Entreprises & B2B",
    username: "recep_b2b",
    password: "recep123",
    badge: "Flux B2B",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
    desc: "Comptes entreprises, facturation mensuelle et plis officiels",
    icon: "🏢",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successUser, setSuccessUser] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password) {
      setError("Veuillez renseigner votre identifiant et votre mot de passe.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await loginApi(username.trim(), password);

      // Save session credentials
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

      window.dispatchEvent(new Event("tms_role_change"));
      setSuccessUser(res.nom_complet);

      setTimeout(() => {
        router.push("/");
      }, 500);
    } catch (err: any) {
      setError(err.message || "Identifiants invalides.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemo = (account: (typeof DEMO_ACCOUNTS)[0]) => {
    setUsername(account.username);
    setPassword(account.password);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/25 mb-4 border border-blue-400/40">
          <span className="text-2xl">⚡</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          TMS EXPRESS
        </h1>
        <p className="mt-1 text-xs text-blue-200">
          Système de Gestion du Transport & Pilotage Dernier Kilomètre
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 sm:px-8 shadow-2xl rounded-2xl border border-white/20 text-slate-800">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Connexion Utilisateur
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Saisissez vos identifiants pour accéder à votre espace de travail.
            </p>
          </div>

          {error && (
            <div
              data-cy="login-error"
              className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {successUser && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="font-semibold">
                Authentifié avec succès : {successUser}. Redirection en cours...
              </span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Identifiant / Nom d&apos;utilisateur
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  data-testid="login-username"
                  data-cy="login-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ex: admin, superviseur, recep_cod"
                  className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Mot de passe
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  data-testid="login-password"
                  data-cy="login-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit-btn"
              data-cy="login-submit-btn"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Vérification des identifiants...
                </>
              ) : (
                <>
                  Se connecter à la plateforme
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demonstration & simulation accounts list */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Comptes pour Simulation Production
              </span>
              <span className="text-[10px] text-blue-600 font-medium">1-clic pour charger</span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              Cliquez sur un profil pour pré-remplir ses identifiants réels enregistrés en base :
            </p>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => handleSelectDemo(acc)}
                  className={`w-full p-2 rounded-xl text-left border transition flex items-center justify-between ${
                    username === acc.username
                      ? "bg-blue-50/80 border-blue-300 ring-1 ring-blue-300"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">{acc.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {acc.title}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${acc.badgeColor}`}
                        >
                          {acc.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono">
                        login: <span className="font-semibold text-slate-700">{acc.username}</span> • mdp: <span className="font-semibold text-slate-700">{acc.password}</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-blue-600 pl-2">Sélectionner</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-[11px] text-slate-400">
          TMS EXPRESS v5.0 • Hub Central Tsiazotafo / Analakely • Antananarivo, Madagascar
        </div>
      </div>
    </div>
  );
}
