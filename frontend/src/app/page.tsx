"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  PackagePlus,
  FileSpreadsheet,
  Truck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Clock,
  RotateCcw,
  Calendar,
  Layers,
  MapPin,
  Building2,
  Wallet,
  Award,
  Activity,
  User,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { fetchParcels, fetchTours, fetchCouriers } from "../lib/api";

interface Parcel {
  id: number;
  tracking_number: string;
  reception_date: string;
  sender_name?: string;
  sender_type?: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_phone_formatted: string;
  operator: string;
  delivery_address: string;
  axis: string;
  axis_label: string;
  flux_type: string;
  merchandise_amount: number;
  delivery_fee: number;
  total_to_collect: number;
  total_to_collect_formatted: string;
  partner_fee: number;
  status: string;
  status_label: string;
  tour_id?: number;
  courier_id?: number;
  payment_method?: string;
}

interface Tour {
  id: number;
  tour_date: string;
  courier_id: number;
  courier_name?: string;
  courier_phone?: string;
  courier_phone_formatted?: string;
  courier_vehicle?: string;
  status: string;
  theoretical_total: number;
  actual_remitted: number;
  discrepancy: number;
  parcels_count?: number;
  parcels?: Parcel[];
}

interface Courier {
  id: number;
  name: string;
  phone: string;
  vehicle_type: string;
  active: boolean;
}

export default function CockpitDashboardPage() {
  const [selectedDate, setSelectedDate] = useState<string>("2026-11-08");
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pList, tList, cList] = await Promise.all([
        fetchParcels({ date: selectedDate }),
        fetchTours(selectedDate),
        fetchCouriers(),
      ]);
      setParcels(pList || []);
      setTours(tList || []);
      setCouriers(cList || []);
    } catch (e) {
      console.error("Erreur chargement Cockpit KPIs", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculations for Écran 06 Segmented Progress Bar and 4 Activity Metric Cards
  const metrics = useMemo(() => {
    const total = parcels.length;

    const countByStatus: Record<string, number> = {
      ENCAISSE: 0,
      LIVRE: 0,
      LIVRE_ENCAISSE: 0,
      EN_COURS: 0,
      ASSIGNE: 0,
      EN_DEPOT: 0,
      REPORTE: 0,
      ANNULE_RETOUR: 0,
      SOUS_TRAITE: 0,
      CLOTURE_CAISSE: 0,
    };

    let totalCODCollected = 0;
    let totalTheoreticalToCollect = 0;
    let totalFluxCOD = 0;
    let totalFluxSimple = 0;
    let totalFluxProvince = 0;

    parcels.forEach((p) => {
      if (countByStatus[p.status] !== undefined) {
        countByStatus[p.status]++;
      }
      totalTheoreticalToCollect += p.total_to_collect || 0;

      if (p.status === "ENCAISSE" || p.status === "LIVRE_ENCAISSE" || p.status === "CLOTURE_CAISSE") {
        totalCODCollected += p.total_to_collect || 0;
      }

      if (p.flux_type === "COD") totalFluxCOD++;
      else if (p.flux_type === "SIMPLE") totalFluxSimple++;
      else if (p.flux_type === "PROVINCE") totalFluxProvince++;
    });

    const totalDelivered =
      (countByStatus.ENCAISSE || 0) +
      (countByStatus.LIVRE || 0) +
      (countByStatus.LIVRE_ENCAISSE || 0) +
      (countByStatus.CLOTURE_CAISSE || 0);
    const activeDelivering = countByStatus.EN_COURS + countByStatus.ASSIGNE;
    const resolvedCount = totalDelivered + countByStatus.ANNULE_RETOUR + countByStatus.SOUS_TRAITE;
    const successRate = total > 0 ? Math.round((totalDelivered / total) * 100) : 0;
    const globalProgress = total > 0 ? Math.round(((totalDelivered + countByStatus.SOUS_TRAITE) / total) * 100) : 0;

    return {
      total,
      countByStatus,
      totalDelivered,
      totalCODCollected,
      totalTheoreticalToCollect,
      totalFluxCOD,
      totalFluxSimple,
      totalFluxProvince,
      activeDelivering,
      successRate,
      globalProgress,
    };
  }, [parcels]);

  // Segmented Progress Bar Data with EXACT pastel color codes from CDC section 9 (Écran 06)
  const segments = [
    {
      status: "ENCAISSE",
      label: "Encaissé",
      bg: "#dcfce7",
      text: "#065f46",
      border: "#86efac",
      count: (metrics.countByStatus.ENCAISSE || 0) + (metrics.countByStatus.LIVRE_ENCAISSE || 0),
    },
    {
      status: "LIVRE",
      label: "Livré (En attente encaissement)",
      bg: "#ccfbf1",
      text: "#0f766e",
      border: "#99f6e4",
      count: metrics.countByStatus.LIVRE || 0,
    },
    {
      status: "EN_COURS",
      label: "En Cours",
      bg: "#dbeafe",
      text: "#0369a1",
      border: "#7dd3fc",
      count: metrics.countByStatus.EN_COURS,
    },
    {
      status: "ASSIGNE",
      label: "Assigné",
      bg: "#e0e7ff",
      text: "#1e40af",
      border: "#a5b4fc",
      count: metrics.countByStatus.ASSIGNE,
    },
    {
      status: "EN_DEPOT",
      label: "En Dépôt",
      bg: "#fef3c7",
      text: "#78350f",
      border: "#fde68a",
      count: metrics.countByStatus.EN_DEPOT,
    },
    {
      status: "REPORTE",
      label: "Reporté",
      bg: "#ffedd5",
      text: "#92400e",
      border: "#fed7aa",
      count: metrics.countByStatus.REPORTE,
    },
    {
      status: "ANNULE_RETOUR",
      label: "Annulé / Refus",
      bg: "#ffe4e6",
      text: "#991b1b",
      border: "#fecdd3",
      count: metrics.countByStatus.ANNULE_RETOUR,
    },
    {
      status: "SOUS_TRAITE",
      label: "Sous-traité Gare",
      bg: "#f3e8ff",
      text: "#6b21a8",
      border: "#d8b4fe",
      count: metrics.countByStatus.SOUS_TRAITE,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Top Banner & Date Selector */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-8 text-white shadow-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-500/20 text-blue-300 border border-blue-400/30">
              Écran 06 • Cockpit & KPIs Temps Réel
            </span>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Direct GMT+3 (Indian/Antananarivo)
            </span>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <span>⚡</span> Cockpit d'Exploitation Logistique
          </h2>
          <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
            Supervision globale des tournées Grand Tanà, du transport régional en Province, du recouvrement de caisse COD et du pilotage de la flotte de distribution.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-white">
            <Calendar className="w-4 h-4 text-blue-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm font-bold text-white focus:outline-none"
            />
          </div>
          <button
            onClick={loadData}
            className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition shadow flex items-center justify-center"
            title="Rafraîchir"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ================= ÉCRAN 06 : BARRE DE PROGRESSION SEGMENTÉE ================= */}
      <div
        data-cy="segmented-progress-section"
        className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Progression Globale de la Journée
            </h3>
            <p className="text-xs text-slate-500">
              Distribution des {metrics.total} colis par statut FSM en temps réel
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-slate-900">{metrics.globalProgress}%</span>
            <span className="text-xs font-bold text-slate-500 ml-1">aboutis</span>
          </div>
        </div>

        {/* Visual Multi-Segmented Bar */}
        <div className="w-full h-6 bg-slate-100 rounded-2xl overflow-hidden flex shadow-inner border border-slate-200/80 p-0.5">
          {metrics.total === 0 ? (
            <div className="w-full h-full bg-slate-200 rounded-xl flex items-center justify-center text-[10px] font-bold text-slate-500">
              Aucun colis enregistré pour cette date
            </div>
          ) : (
            segments.map((seg) => {
              const widthPct = (seg.count / metrics.total) * 100;
              if (widthPct === 0) return null;
              return (
                <div
                  key={seg.status}
                  data-cy={`progress-segment-${seg.status.toLowerCase()}`}
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: seg.bg,
                    borderColor: seg.border,
                  }}
                  className="h-full first:rounded-l-xl last:rounded-r-xl transition-all duration-500 border-r last:border-r-0 relative group"
                  title={`${seg.label}: ${seg.count} colis (${Math.round(widthPct)}%)`}
                />
              );
            })
          )}
        </div>

        {/* Color Legend with Exact Pastel Themes (CDC section 9) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2">
          {segments.map((seg) => {
            const pct = metrics.total > 0 ? Math.round((seg.count / metrics.total) * 100) : 0;
            return (
              <div
                key={seg.status}
                data-cy={`legend-pill-${seg.status.toLowerCase()}`}
                style={{ backgroundColor: seg.bg, borderColor: seg.border }}
                className="p-2.5 rounded-xl border flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span
                    style={{ color: seg.text }}
                    className="text-[11px] font-black uppercase tracking-wider truncate"
                  >
                    {seg.label}
                  </span>
                  <span
                    style={{ color: seg.text }}
                    className="text-[10px] font-bold opacity-80"
                  >
                    {pct}%
                  </span>
                </div>
                <p style={{ color: seg.text }} className="text-xl font-black mt-1">
                  {seg.count}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= 4 CARTES DE MÉTRIQUES D'ACTIVITÉ (CDC ÉCRAN 06) ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Expéditions Totales */}
        <div
          data-cy="metric-total-shipments"
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="p-3 bg-blue-50 text-blue-700 rounded-2xl">
              <Layers className="w-6 h-6" />
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              Total Journée
            </span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-4">
            Expéditions Totales
          </p>
          <p className="text-3xl font-black text-slate-900 mt-1">{metrics.total}</p>
          <div className="flex items-center gap-2 mt-3 text-xs text-slate-500 font-medium">
            <span>{metrics.totalFluxCOD} COD</span>
            <span>•</span>
            <span>{metrics.totalFluxSimple} Port Payé</span>
            <span>•</span>
            <span className="text-purple-600 font-bold">{metrics.totalFluxProvince} Province</span>
          </div>
        </div>

        {/* Metric 2: Taux de Succès */}
        <div
          data-cy="metric-success-rate"
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl">
              <TrendingUp className="w-6 h-6" />
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
              Livrés Encaissés
            </span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-4">
            Taux de Succès
          </p>
          <p className="text-3xl font-black text-emerald-600 mt-1">{metrics.successRate} %</p>
          <p className="text-xs text-slate-500 mt-3 font-medium">
            {metrics.totalDelivered} colis livrés sur {metrics.total}
          </p>
        </div>

        {/* Metric 3: Colis en Cours */}
        <div
          data-cy="metric-in-progress"
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="p-3 bg-amber-50 text-amber-700 rounded-2xl">
              <Truck className="w-6 h-6" />
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
              Sur le Quai / Terrain
            </span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-4">
            Colis en Distribution
          </p>
          <p className="text-3xl font-black text-amber-600 mt-1">{metrics.activeDelivering}</p>
          <p className="text-xs text-slate-500 mt-3 font-medium">
            {metrics.countByStatus.EN_COURS} en course • {metrics.countByStatus.ASSIGNE} assignés
          </p>
        </div>

        {/* Metric 4: Montant COD Recouvré */}
        <div
          data-cy="metric-cod-recovered"
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="p-3 bg-indigo-50 text-indigo-700 rounded-2xl">
              <Wallet className="w-6 h-6" />
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">
              Devise MGA
            </span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-4">
            Montant COD Recouvré
          </p>
          <p className="text-2xl font-black text-indigo-950 mt-1">
            {metrics.totalCODCollected.toLocaleString()} Ar
          </p>
          <p className="text-xs text-slate-500 mt-3 font-medium truncate">
            sur {metrics.totalTheoreticalToCollect.toLocaleString()} Ar attendus
          </p>
        </div>
      </div>

      {/* ================= VUE FLOTTE & TOURNÉES EN DIRECT ================= */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              Flotte & Tournées Opérationnelles en Direct ({tours.length} tournées)
            </h3>
            <p className="text-xs text-slate-500">
              Statut instantané des coursiers et tournées en cours
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dispatch"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
            >
              <Truck className="w-3.5 h-3.5" />
              03. Dispatching
            </Link>
            <Link
              href="/tracking"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              05. Pointage Terrain
            </Link>
          </div>
        </div>

        {tours.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-400">
            <Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-bold">Aucune tournée active n'a été créée pour cette date.</p>
            <Link
              href="/dispatch"
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
            >
              Assigner des colis en tournée ➔
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tours.map((t) => {
              const tourParcels = parcels.filter((p) => p.tour_id === t.id);
              const deliveredCount = tourParcels.filter((p) =>
                ["LIVRE", "ENCAISSE", "LIVRE_ENCAISSE", "CLOTURE_CAISSE"].includes(p.status)
              ).length;
              const totalTourParcels = tourParcels.length;
              const tourProgress =
                totalTourParcels > 0 ? Math.round((deliveredCount / totalTourParcels) * 100) : 0;

              return (
                <div
                  key={t.id}
                  data-cy={`tour-card-${t.id}`}
                  className="bg-slate-50/80 hover:bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm transition space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono">
                      Tournée #{t.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold uppercase ${
                        t.status === "ASSIGNE"
                          ? "bg-[#e0e7ff] text-[#1e40af]"
                          : t.status === "EN_COURS"
                          ? "bg-[#dbeafe] text-[#0369a1]"
                          : "bg-[#dcfce7] text-[#065f46]"
                      }`}
                    >
                      {t.status === "ASSIGNE" ? "Assigné (Quai)" : t.status === "EN_COURS" ? "En Course" : t.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-500" />
                      {t.courier_name || `Coursier #${t.courier_id}`}
                    </h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" />
                      {t.courier_phone_formatted || t.courier_phone || "Téléphone non renseigné"} • {t.courier_vehicle}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                      <span>Progression</span>
                      <span className="font-bold text-slate-800">
                        {deliveredCount}/{totalTourParcels} colis ({tourProgress}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${tourProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Total Théorique</p>
                      <p className="font-bold text-slate-800">
                        {t.theoretical_total?.toLocaleString()} Ar
                      </p>
                    </div>
                    <Link
                      href="/tracking"
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition flex items-center gap-1"
                    >
                      Pointage ➔
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= MODULES & LAUNCHPAD ================= */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>🚀</span> Accès Direct aux Modules TMS EXPRESS (Les 12 Écrans)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/inbound"
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <PackagePlus className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">01. Réception Inbound</h4>
            <p className="text-xs text-slate-500 mt-1">
              Saisie multi-colis, autocomplétion expéditeur, auto-détection 8 axes et impression étiquettes.
            </p>
          </Link>

          <Link
            href="/import"
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">02. Import Fichiers</h4>
            <p className="text-xs text-slate-500 mt-1">
              Téléversement glisser-déposer de fichiers Excel/CSV avec normalisation automatique.
            </p>
          </Link>

          <Link
            href="/dispatch"
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <Truck className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">03 & 04. Dispatching & Feuilles</h4>
            <p className="text-xs text-slate-500 mt-1">
              Constitution des tournées, billets thermiques 80 mm et export WhatsApp synthétique.
            </p>
          </Link>

          <Link
            href="/tracking"
            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">05. Pointage Terrain</h4>
            <p className="text-xs text-slate-500 mt-1">
              Enregistrement instantané des livraisons, reports avec date et gestion des refus et gares.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
