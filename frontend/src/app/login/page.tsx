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
  Truck,
  Building2,
  Boxes,
} from "lucide-react";
import { loginApi } from "@/lib/api";
import { useCompany } from "@/context/CompanyContext";

export default function LoginPage() {
  const router = useRouter();
  const { company } = useCompany();
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

      if (res.role === "LIVREUR") {
        setError(
          "Accès non autorisé : les livreurs ne disposent pas d'accès à l'application web de gestion du hub."
        );
        return;
      }

      // Enregistrement des données de session
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
      }, 400);
    } catch (err: any) {
      setError(
        err.message ||
          "Identifiants incorrects. Veuillez vérifier votre nom d'utilisateur et votre mot de passe."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-slate-100 relative overflow-hidden">
      {/* Background ambient lighting accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/10 backdrop-blur-md shadow-xl mb-4 border border-white/20">
          {company.logo_url ? (
            <img
              src={company.logo_url}
              alt={company.app_name}
              className="h-12 w-auto max-w-[160px] object-contain drop-shadow"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Truck className="w-7 h-7 text-white" />
            </div>
          )}
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
          <span>{company.app_name || "TMS EXPRESS"}</span>
          <span className="text-xs px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30 font-semibold tracking-normal">
            Hub Central
          </span>
        </h1>
        <p className="mt-1.5 text-xs text-slate-400 font-medium">
          Plateforme de Pilotage & Traçabilité Dernier Kilomètre
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/95 backdrop-blur-xl py-8 px-6 sm:px-8 shadow-2xl rounded-3xl border border-white/20 text-slate-800">
          <div className="mb-6 pb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Connexion Utilisateur
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Authentification nominative obligatoire
              </p>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>Accès Sécurisé</span>
            </div>
          </div>

          {/* Feedback messages */}
          {error && (
            <div
              data-cy="login-error"
              className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          {successUser && (
            <div
              data-cy="login-success"
              className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-in fade-in"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">
                Bienvenue, {successUser}. Redirection vers votre tableau de bord...
              </span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Identifiant ou Email Professionnel
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  required
                  data-testid="login-username"
                  data-cy="login-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ex: admin, directeur, agent1..."
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Mot de passe
                </label>
              </div>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
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
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
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
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition shadow-md shadow-blue-500/25 disabled:opacity-50 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Vérification des identifiants...
                </>
              ) : (
                <>
                  <span>Se connecter à la plateforme</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-[11px] text-slate-400 font-medium">
          TMS EXPRESS • Hub Analakely / Tsiazotafo • Antananarivo, Madagascar
        </div>
      </div>
    </div>
  );
}
