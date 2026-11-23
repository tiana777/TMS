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
import { getTodayDateString } from "../lib/date";
import { useCompany } from "../context/CompanyContext";

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
  const { company } = useCompany();
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString);
  const [currentUserRole, setCurrentUserRole] = useState<string>("SUPERVISEUR");
  const [userNom, setUserNom] = useState<string>("Direction");
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const updateRole = () => {
      if (typeof window === "undefined") return;
      const role = localStorage.getItem("tms_user_role") || "SUPERVISEUR";
      const nom = localStorage.getItem("tms_user_nom") || "Direction";
      setCurrentUserRole(role);
      setUserNom(nom);
      loadData();
    };
    updateRole();
    window.addEventListener("tms_role_change", updateRole);
    window.addEventListener("storage", updateRole);
    return () => {
      window.removeEventListener("tms_role_change", updateRole);
      window.removeEventListener("storage", updateRole);
    };
  }, []);

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
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Top Banner & Date Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 text-slate-900 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <span className="text-blue-600">⚡</span> Cockpit d'Exploitation Logistique
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Direct GMT+3
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Tableau de bord temps réel & supervision des flux du Hub
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>
          <button
            onClick={loadData}
            className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-xs flex items-center justify-center"
            title="Rafraîchir"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ================= ÉCRAN 06 : BARRE DE PROGRESSION SEGMENTÉE ================= */}
      <div
        data-cy="segmented-progress-section"
        className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              Progression Globale de la Journée
            </h3>
            <p className="text-[11px] text-slate-500">
              Distribution des {metrics.total} colis par statut FSM en temps réel
            </p>
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/70">
              {metrics.globalProgress}%
            </span>
            <span className="text-xs text-slate-500 font-medium">aboutis</span>
          </div>
        </div>

        {/* Visual Multi-Segmented Bar */}
        <div className="w-full h-3 bg-slate-100 rounded-md overflow-hidden flex border border-slate-200/80 p-0.5">
          {metrics.total === 0 ? (
            <div className="w-full h-full bg-slate-200 rounded flex items-center justify-center text-[10px] font-medium text-slate-500">
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
                  className="h-full first:rounded-l last:rounded-r transition-all duration-500 border-r last:border-r-0 relative group"
                  title={`${seg.label}: ${seg.count} colis (${Math.round(widthPct)}%)`}
                />
              );
            })
          )}
        </div>

        {/* Color Legend with Exact Pastel Themes (CDC section 9) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-1">
          {segments.map((seg) => {
            const pct = metrics.total > 0 ? Math.round((seg.count / metrics.total) * 100) : 0;
            return (
              <div
                key={seg.status}
                data-cy={`legend-pill-${seg.status.toLowerCase()}`}
                style={{ backgroundColor: seg.bg, borderColor: seg.border }}
                className="px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-1.5 transition-shadow hover:shadow-xs"
              >
                <div className="min-w-0">
                  <span
                    style={{ color: seg.text }}
                    className="text-[10px] font-bold uppercase tracking-wide truncate block"
                  >
                    {seg.label}
                  </span>
                  <span style={{ color: seg.text }} className="text-xs font-bold tabular-nums">
                    {seg.count}
                  </span>
                </div>
                <span
                  style={{ color: seg.text }}
                  className="text-[10px] font-semibold opacity-75 tabular-nums shrink-0"
                >
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= 4 CARTES DE MÉTRIQUES D'ACTIVITÉ (CDC ÉCRAN 06) ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Expéditions Totales */}
        <div
          data-cy="metric-total-shipments"
          className="bg-white p-3.5 rounded-xl border border-slate-200/90 border-l-4 border-l-blue-500 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Expéditions Totales
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200/50">
              Total Journée
            </span>
          </div>
          <div className="my-1.5 flex items-baseline gap-2">
            <p className="text-lg font-bold text-blue-950 tabular-nums">{metrics.total}</p>
            <span className="text-xs text-slate-400 font-normal">colis enregistrés</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium pt-1.5 border-t border-slate-100">
            <span className="text-emerald-700 font-semibold">{metrics.totalFluxCOD} COD</span>
            <span>•</span>
            <span>{metrics.totalFluxSimple} Port Payé</span>
            <span>•</span>
            <span className="text-purple-700 font-semibold">{metrics.totalFluxProvince} Province</span>
          </div>
        </div>

        {/* Metric 2: Taux de Succès */}
        <div
          data-cy="metric-success-rate"
          className="bg-white p-3.5 rounded-xl border border-slate-200/90 border-l-4 border-l-emerald-500 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Taux de Succès
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/50">
              Livrés Encaissés
            </span>
          </div>
          <div className="my-1.5 flex items-baseline gap-2">
            <p className="text-lg font-bold text-emerald-700 tabular-nums">{metrics.successRate} %</p>
            <span className="text-xs text-slate-400 font-normal">d'aboutissement</span>
          </div>
          <p className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 truncate">
            <span className="font-semibold text-slate-700">{metrics.totalDelivered}</span> colis livrés sur {metrics.total}
          </p>
        </div>

        {/* Metric 3: Colis en Cours */}
        <div
          data-cy="metric-in-progress"
          className="bg-white p-3.5 rounded-xl border border-slate-200/90 border-l-4 border-l-amber-500 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Colis en Distribution
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200/50">
              Sur le Quai / Terrain
            </span>
          </div>
          <div className="my-1.5 flex items-baseline gap-2">
            <p className="text-lg font-bold text-amber-700 tabular-nums">{metrics.activeDelivering}</p>
            <span className="text-xs text-slate-400 font-normal">en cours de livraison</span>
          </div>
          <p className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 truncate">
            <span>{metrics.countByStatus.EN_COURS} en course</span>
            <span> • </span>
            <span>{metrics.countByStatus.ASSIGNE} assignés</span>
          </p>
        </div>

        {/* Metric 4: Montant COD Recouvré */}
        <div
          data-cy="metric-cod-recovered"
          className="bg-white p-3.5 rounded-xl border border-slate-200/90 border-l-4 border-l-indigo-500 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Montant COD Recouvré
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/50">
              Devise MGA
            </span>
          </div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <p className="text-lg font-bold text-indigo-900 font-mono tabular-nums">
              {metrics.totalCODCollected.toLocaleString()} Ar
            </p>
          </div>
          <p className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 truncate">
            sur <span className="font-semibold text-slate-700 font-mono tabular-nums">{metrics.totalTheoreticalToCollect.toLocaleString()} Ar</span> attendus
          </p>
        </div>
      </div>

      {/* ================= VUE FLOTTE & TOURNÉES EN DIRECT ================= */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" />
              Flotte & Tournées Opérationnelles en Direct ({tours.length} tournées)
            </h3>
            <p className="text-[11px] text-slate-500">
              Statut instantané des coursiers et tournées en cours
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dispatch"
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg transition flex items-center gap-1.5"
            >
              <Truck className="w-3.5 h-3.5" />
              03A. Dispatch Ville
            </Link>
            <Link
              href="/dispatch/province"
              className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium text-xs rounded-lg transition flex items-center gap-1.5 border border-purple-200/50"
            >
              <MapPin className="w-3.5 h-3.5" />
              03B. Dispatch Province
            </Link>
            <Link
              href="/tracking"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg transition shadow-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              05. Pointage Terrain
            </Link>
          </div>
        </div>

        {tours.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400">
            <Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs font-semibold">Aucune tournée active n'a été créée pour cette date.</p>
            <Link
              href="/dispatch"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
            >
              Assigner des colis en tournée ➔
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
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
                  className="bg-slate-50/60 hover:bg-white p-3.5 rounded-xl border border-slate-200/80 hover:border-blue-300 transition-all space-y-2.5 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      Tournée #{t.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        t.status === "ASSIGNE"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                          : t.status === "EN_COURS"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {t.status === "ASSIGNE" ? "Assigné (Quai)" : t.status === "EN_COURS" ? "En Course" : t.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{t.courier_name || `Coursier #${t.courier_id}`}</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{t.courier_phone_formatted || t.courier_phone || "Téléphone non renseigné"}</span>
                      <span className="text-slate-300">•</span>
                      <span className="font-sans text-slate-600">{t.courier_vehicle}</span>
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span className="text-slate-500">Progression</span>
                      <span className="font-medium text-slate-800 tabular-nums">
                        {deliveredCount}/{totalTourParcels} colis ({tourProgress}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${tourProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Théorique</p>
                      <p className="font-semibold text-slate-900 font-mono tabular-nums">
                        {t.theoretical_total?.toLocaleString()} Ar
                      </p>
                    </div>
                    <Link
                      href="/tracking"
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-xs rounded transition flex items-center gap-1"
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
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <span className="text-blue-500">🚀</span> Accès Direct aux Modules {company.app_name || "TMS EXPRESS"} (Les 12 Écrans)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            href="/inbound"
            className="p-3.5 rounded-xl bg-white border border-slate-200/80 hover:border-blue-400 shadow-xs hover:shadow-sm transition group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition">
              <PackagePlus className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-slate-900 text-xs">01. Réception Inbound</h4>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
              Saisie multi-colis, autocomplétion expéditeur, auto-détection 8 axes et impression étiquettes.
            </p>
          </Link>

          <Link
            href="/import"
            className="p-3.5 rounded-xl bg-white border border-slate-200/80 hover:border-indigo-400 shadow-xs hover:shadow-sm transition group"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-slate-900 text-xs">02. Import Fichiers</h4>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
              Téléversement glisser-déposer de fichiers Excel/CSV avec normalisation automatique.
            </p>
          </Link>

          <Link
            href="/dispatch"
            className="p-3.5 rounded-xl bg-white border border-slate-200/80 hover:border-amber-400 shadow-xs hover:shadow-sm transition group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition">
              <Truck className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-slate-900 text-xs">03 & 04. Dispatching & Feuilles</h4>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
              Constitution des tournées, billets thermiques 80 mm et export WhatsApp synthétique.
            </p>
          </Link>

          <Link
            href="/tracking"
            className="p-3.5 rounded-xl bg-white border border-slate-200/80 hover:border-emerald-400 shadow-xs hover:shadow-sm transition group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-slate-900 text-xs">05. Pointage Terrain</h4>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
              Enregistrement instantané des livraisons, reports avec date et gestion des refus et gares.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
