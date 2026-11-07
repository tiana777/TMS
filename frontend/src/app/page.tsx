import React from "react";
import Link from "next/link";
import { PackagePlus, FileSpreadsheet, Truck, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-8 text-white shadow-xl flex items-center justify-between">
        <div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 mb-3">
            Exploitation Logistique Urbaine & Régionale
          </span>
          <h2 className="text-3xl font-black tracking-tight">TMS EXPRESS</h2>
          <p className="text-slate-300 text-sm mt-2 max-w-xl">
            Système d'Entreprise dédié au transport du dernier kilomètre à Grand Tanà, aux expéditions régionales en Province par les gares routières, au suivi de caisse et à la performance des coursiers.
          </p>
        </div>
        <div className="hidden lg:flex flex-col gap-2">
          <Link
            href="/inbound"
            className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 font-bold text-sm rounded-xl transition-all shadow-lg flex items-center gap-2"
          >
            <PackagePlus className="w-4 h-4" />
            Réceptionner des Colis
          </Link>
          <Link
            href="/import"
            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 font-bold text-sm rounded-xl transition-all border border-white/20 flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Import Excel / CSV
          </Link>
        </div>
      </div>

      {/* 4 Logistic Flows Cards according to CDC Section 4 */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>📦</span> Les 4 Typologies de Flux Opérationnels (CDC Section 4)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-sm mb-3">
              01
            </div>
            <h4 className="font-bold text-slate-800 text-sm">Flux COD Urbain</h4>
            <p className="text-xs text-slate-500 mt-1">
              Grand Tanà • Encaissement Marchandise + Frais de Livraison à la remise par Espèces ou Mobile Money.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm mb-3">
              02
            </div>
            <h4 className="font-bold text-slate-800 text-sm">Course Simple (Port Payé)</h4>
            <p className="text-xs text-slate-500 mt-1">
              Marchandise déjà payée au cybermarchand (0 Ar). Simple remise ou encaissement des frais seuls.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 font-bold flex items-center justify-center text-sm mb-3">
              03
            </div>
            <h4 className="font-bold text-slate-800 text-sm">Reverse Logistics</h4>
            <p className="text-xs text-slate-500 mt-1">
              Colis refusés, non-conformes ou échanges SAV. Rapatriement au Hub et restitution physique au vendeur.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm mb-3">
              04
            </div>
            <h4 className="font-bold text-slate-800 text-sm">Sous-traité Province</h4>
            <p className="text-xs text-slate-500 mt-1">
              Navette vers les Gares (Ambodivona, Fasan'ny Karana, Andohatapenaka) & acheminement coopératives.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Launchpad to Screen 01 & Screen 02 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
              <PackagePlus className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800">Écran 01 : Réception Inbound Multi-Colis</h4>
              <p className="text-xs text-slate-500">Grille dynamique de saisie, détection Telma/Orange/Airtel et calcul des totaux</p>
            </div>
          </div>
          <Link
            href="/inbound"
            className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-all"
          >
            Accéder à l'écran de réception <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800">Écran 02 : Importation Massive Entreprises</h4>
              <p className="text-xs text-slate-500">Glisser-déposer Excel/CSV, contrôle automatique des formats et détection d'axe</p>
            </div>
          </div>
          <Link
            href="/import"
            className="inline-flex items-center gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-all"
          >
            Accéder à l'écran d'importation <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
