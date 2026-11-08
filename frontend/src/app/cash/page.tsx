"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Wallet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Search,
  Filter,
  DollarSign,
  Smartphone,
  Coins,
  FileText,
  Printer,
  Calendar,
  UserCheck,
  Building2,
  RefreshCw,
  ShieldAlert,
  ChevronDown,
  Layers,
  ArrowDownCircle,
  Clock,
} from "lucide-react";
import { HeaderUserRole } from "@/components/HeaderUserRole";
import {
  fetchParcels,
  fetchTours,
  fetchTourDetail,
  fetchCouriers,
  updateParcelStatus,
  bulkCloseCash,
  closeTour,
} from "@/lib/api";
import { Parcel, Tour, Courier, ParcelStatus } from "@/types";

export default function CashAndClosurePage() {
  const [activeTab, setActiveTab] = useState<"caisse" | "decharge">("caisse");
  const [selectedDate, setSelectedDate] = useState<string>("2026-11-08");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Data states
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);

  // Écran 07 (Caisse) filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [paymentFilter, setPaymentFilter] = useState<string>("ALL");
  const [selectedParcelIds, setSelectedParcelIds] = useState<number[]>([]);
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);

  // Écran 08 (Décharge) states
  const [selectedTourId, setSelectedTourId] = useState<number | null>(null);
  const [selectedTourDetail, setSelectedTourDetail] = useState<Tour | null>(null);
  const [loadingTourDetail, setLoadingTourDetail] = useState(false);
  const [remittedCash, setRemittedCash] = useState<number>(0);
  const [remittedMobile, setRemittedMobile] = useState<number>(0);
  const [remittedExpenses, setRemittedExpenses] = useState<number>(0);
  const [isClosingTour, setIsClosingTour] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    tour: Tour;
    cash: number;
    mobile: number;
    expenses: number;
    discrepancy: number;
    closedAt: string;
  } | null>(null);

  // Load all initial data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [parcelsData, toursData, couriersData] = await Promise.all([
        fetchParcels({ date: selectedDate }),
        fetchTours(selectedDate),
        fetchCouriers(),
      ]);
      setParcels(parcelsData || []);
      setTours(toursData || []);
      setCouriers(couriersData || []);

      if (toursData && toursData.length > 0 && !selectedTourId) {
        setSelectedTourId(toursData[0].id);
      }
    } catch (e: any) {
      console.error("Erreur chargement données de caisse", e);
      setError(e.message || "Erreur de communication avec le serveur.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  // Load selected tour details when tour selection changes
  useEffect(() => {
    if (!selectedTourId) {
      setSelectedTourDetail(null);
      return;
    }
    const loadDetail = async () => {
      setLoadingTourDetail(true);
      try {
        const detail = await fetchTourDetail(selectedTourId);
        setSelectedTourDetail(detail);

        // Pre-fill fields based on theoretical and already remitted amounts
        if (detail) {
          if (detail.status === "CLOTURE") {
            setRemittedCash(detail.actual_remitted);
            setRemittedMobile(0);
            setRemittedExpenses(0);
          } else {
            // Count delivered & cashed parcel totals
            let cashSum = 0;
            let mobileSum = 0;
            const validParcels: Parcel[] = detail.parcels || [];
            validParcels.forEach((p: Parcel) => {
              if (
                p.status === "ENCAISSE" ||
                p.status === "LIVRE_ENCAISSE" ||
                p.status === "CLOTURE_CAISSE"
              ) {
                if (p.payment_method === "ESPECES") {
                  cashSum += p.total_to_collect;
                } else if (
                  p.payment_method &&
                  ["MVOLA", "AIRTEL", "ORANGE_MONEY"].includes(p.payment_method)
                ) {
                  mobileSum += p.total_to_collect;
                }
              }
            });
            setRemittedCash(cashSum);
            setRemittedMobile(mobileSum);
            setRemittedExpenses(0);
          }
        }
      } catch (e: any) {
        console.error("Erreur chargement détail tournée", e);
      } finally {
        setLoadingTourDetail(false);
      }
    };
    loadDetail();
  }, [selectedTourId]);

  // Écran 07 : Colis COD éligibles à la caisse
  // Sont considérés comme colis de caisse les colis porteurs de COD ou encaissés
  const codParcels = useMemo(() => {
    return parcels.filter(
      (p) =>
        p.merchandise_amount > 0 ||
        p.total_to_collect > 0 ||
        ["ENCAISSE", "LIVRE_ENCAISSE", "CLOTURE_CAISSE"].includes(p.status)
    );
  }, [parcels]);

  // Calcul des métriques de caisse
  const cashMetrics = useMemo(() => {
    let totalCOD = 0;
    let totalEspeces = 0;
    let totalMvola = 0;
    let totalAirtel = 0;
    let totalOrange = 0;
    let pendingValidation = 0;
    let closedCount = 0;

    codParcels.forEach((p) => {
      totalCOD += p.total_to_collect;
      if (p.status === "CLOTURE_CAISSE") {
        closedCount++;
      } else if (["ENCAISSE", "LIVRE_ENCAISSE", "LIVRE"].includes(p.status)) {
        pendingValidation += p.total_to_collect;
      }

      if (["ENCAISSE", "LIVRE_ENCAISSE", "CLOTURE_CAISSE"].includes(p.status)) {
        if (p.payment_method === "ESPECES") {
          totalEspeces += p.total_to_collect;
        } else if (p.payment_method === "MVOLA") {
          totalMvola += p.total_to_collect;
        } else if (p.payment_method === "AIRTEL") {
          totalAirtel += p.total_to_collect;
        } else if (p.payment_method === "ORANGE_MONEY") {
          totalOrange += p.total_to_collect;
        }
      }
    });

    const totalMobile = totalMvola + totalAirtel + totalOrange;

    return {
      totalCOD,
      totalEspeces,
      totalMvola,
      totalAirtel,
      totalOrange,
      totalMobile,
      pendingValidation,
      closedCount,
      totalCount: codParcels.length,
    };
  }, [codParcels]);

  // Filtrage des colis pour la vue Écran 07
  const filteredParcels = useMemo(() => {
    return codParcels.filter((p) => {
      // Recherche
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTracking = p.tracking_number.toLowerCase().includes(q);
        const matchRecipient = p.recipient_name?.toLowerCase().includes(q);
        const matchPhone = p.recipient_phone?.toLowerCase().includes(q);
        const matchSender = p.sender_name?.toLowerCase().includes(q);
        if (!matchTracking && !matchRecipient && !matchPhone && !matchSender) {
          return false;
        }
      }

      // Filtre statut
      if (statusFilter !== "ALL") {
        if (statusFilter === "A_VALIDER") {
          if (!["ENCAISSE", "LIVRE_ENCAISSE", "LIVRE"].includes(p.status)) return false;
        } else if (p.status !== statusFilter) {
          return false;
        }
      }

      // Filtre méthode de paiement
      if (paymentFilter !== "ALL") {
        if (p.payment_method !== paymentFilter) return false;
      }

      return true;
    });
  }, [codParcels, searchQuery, statusFilter, paymentFilter]);

  // Actions de sélection groupée
  const handleToggleSelectAll = () => {
    const selectableIds = filteredParcels
      .filter((p) => ["ENCAISSE", "LIVRE_ENCAISSE", "LIVRE"].includes(p.status))
      .map((p) => p.id);

    if (
      selectedParcelIds.length > 0 &&
      selectableIds.every((id) => selectedParcelIds.includes(id))
    ) {
      setSelectedParcelIds([]);
    } else {
      setSelectedParcelIds(selectableIds);
    }
  };

  const handleToggleSelectParcel = (id: number) => {
    setSelectedParcelIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Validation individuelle de caisse
  const handleValidateSingleParcel = async (parcelId: number) => {
    try {
      await updateParcelStatus(parcelId, { status: "CLOTURE_CAISSE" });
      setSuccessMessage(`Colis #${parcelId} validé et clôturé en caisse centrale.`);
      await loadData();
    } catch (e: any) {
      setError(e.message || "Erreur lors de la validation du colis.");
    }
  };

  // Validation groupée de caisse
  const handleBulkValidate = async () => {
    if (selectedParcelIds.length === 0) return;
    setIsSubmittingBulk(true);
    try {
      await bulkCloseCash(selectedParcelIds);
      setSuccessMessage(
        `${selectedParcelIds.length} colis validé(s) avec succès et clôturé(s) en caisse centrale.`
      );
      setSelectedParcelIds([]);
      await loadData();
    } catch (e: any) {
      setError(e.message || "Erreur lors de la validation groupée.");
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  // Calculs financiers pour la décharge de tournée (Écran 08)
  const theoreticalTotal = useMemo(() => {
    if (!selectedTourDetail || !selectedTourDetail.parcels) return 0;
    return selectedTourDetail.parcels
      .filter((p) =>
        ["LIVRE", "ENCAISSE", "LIVRE_ENCAISSE", "CLOTURE_CAISSE"].includes(p.status)
      )
      .reduce((sum, p) => sum + p.total_to_collect, 0);
  }, [selectedTourDetail]);

  const totalRemitted = remittedCash + remittedMobile + remittedExpenses;
  const cashDiscrepancy = totalRemitted - theoreticalTotal;

  // Clôture définitive de la tournée
  const handleConfirmCloseTour = async () => {
    if (!selectedTourDetail) return;
    setIsClosingTour(true);
    setError(null);
    try {
      const res = await closeTour(selectedTourDetail.id, totalRemitted);
      setSuccessMessage(
        `Tournée #${selectedTourDetail.id} clôturée avec succès. Écart de caisse : ${
          cashDiscrepancy === 0
            ? "0 Ar (Équilibrée)"
            : cashDiscrepancy < 0
            ? `${cashDiscrepancy.toLocaleString("fr-FR")} Ar (Déficit consigné en litige)`
            : `+${cashDiscrepancy.toLocaleString("fr-FR")} Ar (Excédent)`
        }`
      );

      // Ouvrir le reçu imprimable
      setReceiptData({
        tour: selectedTourDetail,
        cash: remittedCash,
        mobile: remittedMobile,
        expenses: remittedExpenses,
        discrepancy: cashDiscrepancy,
        closedAt: new Date().toISOString(),
      });

      await loadData();
    } catch (e: any) {
      setError(e.message || "Erreur lors de la clôture de la tournée.");
    } finally {
      setIsClosingTour(false);
    }
  };

  const getStatusBadge = (status: ParcelStatus) => {
    switch (status) {
      case "CLOTURE_CAISSE":
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Clôturé Caisse
          </span>
        );
      case "ENCAISSE":
      case "LIVRE_ENCAISSE":
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-teal-100 text-teal-800 border border-teal-300 flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-teal-600" />
            Encaissé (À valider)
          </span>
        );
      case "LIVRE":
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-cyan-100 text-cyan-800 border border-cyan-300">
            Livré Simple
          </span>
        );
      case "EN_COURS":
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-sky-100 text-sky-800 border border-sky-300">
            En Cours
          </span>
        );
      case "REPORTE":
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
            Reporté
          </span>
        );
      case "ANNULE_RETOUR":
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-300">
            Annulé / Refus
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-300">
            {status}
          </span>
        );
    }
  };

  const getPaymentBadge = (method?: string | null) => {
    if (!method) {
      return (
        <span className="text-xs text-slate-400 italic">Non renseigné</span>
      );
    }
    switch (method) {
      case "ESPECES":
        return (
          <span className="px-2 py-0.5 text-xs font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-emerald-600" />
            Espèces
          </span>
        );
      case "MVOLA":
        return (
          <span className="px-2 py-0.5 text-xs font-bold rounded bg-yellow-50 text-yellow-800 border border-yellow-300 flex items-center gap-1">
            <Smartphone className="w-3 h-3 text-yellow-600" />
            MVola (Telma)
          </span>
        );
      case "AIRTEL":
        return (
          <span className="px-2 py-0.5 text-xs font-bold rounded bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
            <Smartphone className="w-3 h-3 text-red-600" />
            Airtel Money
          </span>
        );
      case "ORANGE_MONEY":
        return (
          <span className="px-2 py-0.5 text-xs font-bold rounded bg-orange-50 text-orange-700 border border-orange-200 flex items-center gap-1">
            <Smartphone className="w-3 h-3 text-orange-600" />
            Orange Money
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-700">
            {method}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                <Wallet className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                  Caisse Centrale & Clôture Comptable
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Écran 07 (Validation Encaissements COD) & Écran 08 (Décharge de Tournée Journalière)
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-sm">
              <Calendar className="w-4 h-4 text-slate-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-slate-800 font-bold focus:outline-none text-xs sm:text-sm cursor-pointer"
                data-cy="cash-date-picker"
              />
            </div>

            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition border border-slate-200"
              title="Rafraîchir les données"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <HeaderUserRole />
          </div>
        </div>

        {/* Tab navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex border-t border-slate-100">
          <button
            onClick={() => setActiveTab("caisse")}
            className={`py-3 px-5 text-sm font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === "caisse"
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/50"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
            data-cy="tab-caisse"
          >
            <Coins className="w-4 h-4" />
            07. Caisse Centrale COD
            <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-200 text-slate-700 font-medium">
              {codParcels.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("decharge")}
            className={`py-3 px-5 text-sm font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === "decharge"
                ? "border-blue-600 text-blue-700 bg-blue-50/50"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
            data-cy="tab-decharge"
          >
            <FileText className="w-4 h-4" />
            08. Décharge & Clôture de Tournée
            <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-200 text-slate-700 font-medium">
              {tours.length}
            </span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Banner Alert Feedback */}
        {error && (
          <div
            className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center justify-between shadow-sm"
            data-cy="cash-error-banner"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-500 hover:text-rose-800 text-xs font-bold underline"
            >
              Fermer
            </button>
          </div>
        )}

        {successMessage && (
          <div
            className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between shadow-sm"
            data-cy="cash-success-banner"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-sm font-medium">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-500 hover:text-emerald-800 text-xs font-bold underline"
            >
              Fermer
            </button>
          </div>
        )}

        {/* TAB 1 : ÉCRAN 07 - CAISSE CENTRALE COD */}
        {activeTab === "caisse" && (
          <div className="space-y-6" data-cy="view-caisse">
            {/* KPI Cards Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Total COD Encaissé / Dû
                  </span>
                  <Coins className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {cashMetrics.totalCOD.toLocaleString("fr-FR")} Ar
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Sur un volume de {cashMetrics.totalCount} colis COD
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Espèces Remises
                  </span>
                  <DollarSign className="w-5 h-5 text-teal-600" />
                </div>
                <div className="text-2xl font-black text-teal-700">
                  {cashMetrics.totalEspeces.toLocaleString("fr-FR")} Ar
                </div>
                <p className="text-xs text-slate-500 mt-1">Cash physique encaissé au Hub</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Mobile Money Réconcilié
                  </span>
                  <Smartphone className="w-5 h-5 text-amber-600" />
                </div>
                <div className="text-2xl font-black text-amber-700">
                  {cashMetrics.totalMobile.toLocaleString("fr-FR")} Ar
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                  <span>MV: {cashMetrics.totalMvola.toLocaleString("fr-FR")}</span>
                  <span>•</span>
                  <span>Air: {cashMetrics.totalAirtel.toLocaleString("fr-FR")}</span>
                  <span>•</span>
                  <span>Org: {cashMetrics.totalOrange.toLocaleString("fr-FR")}</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    À Valider en Caisse
                  </span>
                  <Clock className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="text-2xl font-black text-indigo-700">
                  {cashMetrics.pendingValidation.toLocaleString("fr-FR")} Ar
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {cashMetrics.closedCount} colis déjà scellés en caisse
                </p>
              </div>
            </div>

            {/* Action & Filter Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                {/* Search */}
                <div className="relative min-w-[240px] flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="N° BDR, Destinataire, Vendeur..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    data-cy="search-cash-input"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none"
                  data-cy="status-cash-filter"
                >
                  <option value="ALL">Tous les statuts COD</option>
                  <option value="A_VALIDER">À Valider (Encaissés)</option>
                  <option value="CLOTURE_CAISSE">Déjà Clôturés en Caisse</option>
                  <option value="EN_COURS">En Cours de Tournée</option>
                </select>

                {/* Payment Method Filter */}
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none"
                  data-cy="payment-cash-filter"
                >
                  <option value="ALL">Tous les modes de règlement</option>
                  <option value="ESPECES">Espèces uniquement</option>
                  <option value="MVOLA">MVola</option>
                  <option value="AIRTEL">Airtel Money</option>
                  <option value="ORANGE_MONEY">Orange Money</option>
                </select>
              </div>

              {/* Bulk Actions */}
              <div className="flex items-center gap-3">
                {selectedParcelIds.length > 0 && (
                  <button
                    onClick={handleBulkValidate}
                    disabled={isSubmittingBulk}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center gap-2"
                    data-cy="btn-bulk-validate-cash"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Valider la Caisse ({selectedParcelIds.length} colis)
                  </button>
                )}
              </div>
            </div>

            {/* Parcels Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" data-cy="cash-parcels-table">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider border-b border-slate-200">
                      <th className="p-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredParcels.length > 0 &&
                            filteredParcels
                              .filter((p) =>
                                ["ENCAISSE", "LIVRE_ENCAISSE", "LIVRE"].includes(p.status)
                              )
                              .every((p) => selectedParcelIds.includes(p.id))
                          }
                          onChange={handleToggleSelectAll}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                          data-cy="select-all-cash-checkbox"
                        />
                      </th>
                      <th className="p-4">N° BDR & Suivi</th>
                      <th className="p-4">Expéditeur & Destinataire</th>
                      <th className="p-4">Axe & Type</th>
                      <th className="p-4">Mode Règlement</th>
                      <th className="p-4 text-right">Marchandise</th>
                      <th className="p-4 text-right">Frais Port</th>
                      <th className="p-4 text-right">Total COD</th>
                      <th className="p-4 text-center">Statut</th>
                      <th className="p-4 text-center">Action Caisse</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredParcels.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-12 text-center text-slate-400">
                          <Coins className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                          <p className="font-semibold text-slate-600">Aucun colis COD trouvé</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Modifiez vos critères de recherche ou sélectionnez une autre date.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredParcels.map((parcel) => {
                        const isSelectable = [
                          "ENCAISSE",
                          "LIVRE_ENCAISSE",
                          "LIVRE",
                        ].includes(parcel.status);
                        const isSelected = selectedParcelIds.includes(parcel.id);

                        return (
                          <tr
                            key={parcel.id}
                            className={`hover:bg-slate-50/80 transition ${
                              isSelected ? "bg-emerald-50/40" : ""
                            }`}
                            data-cy={`cash-parcel-row-${parcel.id}`}
                          >
                            <td className="p-4 text-center">
                              {isSelectable ? (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectParcel(parcel.id)}
                                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                                  data-cy={`select-cash-parcel-${parcel.id}`}
                                />
                              ) : (
                                <span className="text-slate-300">•</span>
                              )}
                            </td>
                            <td className="p-4 font-mono font-bold text-slate-900">
                              BDR-{parcel.tracking_number}
                            </td>
                            <td className="p-4">
                              <div className="font-semibold text-slate-800">
                                {parcel.recipient_name}
                              </div>
                              <div className="text-xs text-slate-500 font-mono">
                                {parcel.recipient_phone_formatted || parcel.recipient_phone}
                              </div>
                              {parcel.sender_name && (
                                <div className="text-[11px] text-blue-600 mt-0.5">
                                  Exp: {parcel.sender_name}
                                </div>
                              )}
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-700">
                                {parcel.axis}
                              </span>
                            </td>
                            <td className="p-4">{getPaymentBadge(parcel.payment_method)}</td>
                            <td className="p-4 text-right font-medium text-slate-600">
                              {parcel.merchandise_amount.toLocaleString("fr-FR")} Ar
                            </td>
                            <td className="p-4 text-right font-medium text-slate-600">
                              {parcel.delivery_fee.toLocaleString("fr-FR")} Ar
                            </td>
                            <td className="p-4 text-right font-mono font-black text-slate-900">
                              {parcel.total_to_collect.toLocaleString("fr-FR")} Ar
                            </td>
                            <td className="p-4 text-center">{getStatusBadge(parcel.status)}</td>
                            <td className="p-4 text-center">
                              {parcel.status === "CLOTURE_CAISSE" ? (
                                <span className="text-xs text-emerald-600 font-bold flex items-center justify-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Scellé
                                </span>
                              ) : isSelectable ? (
                                <button
                                  onClick={() => handleValidateSingleParcel(parcel.id)}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition"
                                  data-cy={`btn-validate-cash-${parcel.id}`}
                                >
                                  Valider Caisse
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400 italic">En attente</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2 : ÉCRAN 08 - DÉCHARGE DE TOURNÉE & CLÔTURE COMPTABLE */}
        {activeTab === "decharge" && (
          <div className="space-y-6" data-cy="view-decharge">
            {/* Tour Selection Header */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
                Sélectionner la Tournée à Décharger
              </h2>
              {tours.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-sm">
                  Aucune tournée enregistrée pour le {selectedDate}.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tours.map((t) => {
                    const isSelected = selectedTourId === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTourId(t.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? "bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20"
                            : "bg-slate-50/50 border-slate-200 hover:bg-slate-100"
                        }`}
                        data-cy={`select-tour-card-${t.id}`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">
                              Tournée #{t.id}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                t.status === "CLOTURE"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : t.status === "EN_COURS"
                                  ? "bg-sky-100 text-sky-800"
                                  : "bg-indigo-100 text-indigo-800"
                              }`}
                            >
                              {t.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium mt-1">
                            Livreur: {t.courier_name || `ID #${t.courier_id}`}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {t.courier_vehicle || "Deux-roues standard"}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block">Dû estimé</span>
                          <span className="font-mono font-bold text-slate-800 text-sm">
                            {(t.theoretical_total || 0).toLocaleString("fr-FR")} Ar
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tour Financial Reconciliation Panel */}
            {selectedTourDetail && (
              <div
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                data-cy="tour-reconciliation-panel"
              >
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-black text-slate-900">
                        Décharge Financière — Tournée #{selectedTourDetail.id}
                      </h3>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          selectedTourDetail.status === "CLOTURE"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-sky-100 text-sky-800 border border-sky-300"
                        }`}
                      >
                        {selectedTourDetail.status === "CLOTURE"
                          ? "Tournée Déjà Clôturée"
                          : "En Cours de Clôture"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Coursier responsable :{" "}
                      <strong className="text-slate-700">
                        {selectedTourDetail.courier_name || "Livreur"}
                      </strong>{" "}
                      ({selectedTourDetail.courier_phone_formatted || selectedTourDetail.courier_phone}) •{" "}
                      {selectedTourDetail.courier_vehicle}
                    </p>
                  </div>

                  {selectedTourDetail.status === "CLOTURE" && (
                    <button
                      onClick={() =>
                        setReceiptData({
                          tour: selectedTourDetail,
                          cash: selectedTourDetail.actual_remitted,
                          mobile: 0,
                          expenses: 0,
                          discrepancy: selectedTourDetail.discrepancy,
                          closedAt: selectedTourDetail.closed_at || new Date().toISOString(),
                        })
                      }
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-2 border border-slate-300"
                    >
                      <Printer className="w-4 h-4" />
                      Imprimer Décharge
                    </button>
                  )}
                </div>

                <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Column : Detailed Money Inputs */}
                  <div className="lg:col-span-7 space-y-6">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                        Formule de Rapprochement des Fonds (CDC § 13.1)
                      </h4>
                      <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                        Saisissez les montants réels remis par le coursier. Le système vérifie
                        l'égalité stricte entre le total théorique attendu et la somme des espèces,
                        preuves Mobile Money et récépissés de fret gares.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* 1. Espèces physiques */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-emerald-600" />
                            1. Espèces Physiques Comptées au Hub (MGA)
                          </label>
                          <span className="text-xs text-slate-500 font-mono">Billetage</span>
                        </div>
                        <input
                          type="number"
                          min={0}
                          step={500}
                          value={remittedCash}
                          onChange={(e) => setRemittedCash(Number(e.target.value) || 0)}
                          disabled={selectedTourDetail.status === "CLOTURE"}
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-lg font-mono font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          data-cy="input-remitted-cash"
                        />
                      </div>

                      {/* 2. Mobile Money */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-yellow-600" />
                            2. Paiements Mobile Money Vérifiés (MGA)
                          </label>
                          <span className="text-xs text-slate-500 font-mono">MVola / Airtel / Orange</span>
                        </div>
                        <input
                          type="number"
                          min={0}
                          step={500}
                          value={remittedMobile}
                          onChange={(e) => setRemittedMobile(Number(e.target.value) || 0)}
                          disabled={selectedTourDetail.status === "CLOTURE"}
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-lg font-mono font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                          data-cy="input-remitted-mobile"
                        />
                      </div>

                      {/* 3. Frais de fret gares / Justificatifs */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-purple-600" />
                            3. Dépenses & Fret Justifiés par Récépissés (MGA)
                          </label>
                          <span className="text-xs text-slate-500 font-mono">Souches coopératives</span>
                        </div>
                        <input
                          type="number"
                          min={0}
                          step={500}
                          value={remittedExpenses}
                          onChange={(e) => setRemittedExpenses(Number(e.target.value) || 0)}
                          disabled={selectedTourDetail.status === "CLOTURE"}
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-lg font-mono font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          data-cy="input-remitted-expenses"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column : Balance Synthesis & Validation Action */}
                  <div className="lg:col-span-5 flex flex-col justify-between space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                        Bilan de la Tournée
                      </h4>

                      <div className="space-y-3 font-mono text-sm">
                        <div className="flex items-center justify-between text-slate-600 pb-2 border-b border-slate-200">
                          <span>Total Théorique Dû :</span>
                          <span className="font-bold text-slate-900">
                            {theoreticalTotal.toLocaleString("fr-FR")} Ar
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600">
                          <span>Total Remis (1+2+3) :</span>
                          <span className="font-bold text-slate-900">
                            {totalRemitted.toLocaleString("fr-FR")} Ar
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t-2 border-slate-300 text-base">
                          <span className="font-sans font-bold text-slate-800">
                            Écart de Caisse :
                          </span>
                          <span
                            className={`font-black text-lg ${
                              cashDiscrepancy === 0
                                ? "text-emerald-700"
                                : cashDiscrepancy < 0
                                ? "text-rose-700"
                                : "text-amber-700"
                            }`}
                            data-cy="cash-discrepancy-value"
                          >
                            {cashDiscrepancy > 0 ? "+" : ""}
                            {cashDiscrepancy.toLocaleString("fr-FR")} Ar
                          </span>
                        </div>
                      </div>

                      {/* Discrepancy Status Feedback Banner */}
                      <div className="mt-5">
                        {cashDiscrepancy === 0 ? (
                          <div
                            className="p-3.5 bg-emerald-100/70 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-start gap-2.5"
                            data-cy="alert-balance-perfect"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block font-bold">Caisse Parfaitement Équilibrée</strong>
                              Aucun écart de caisse constaté. Clôture comptable conforme à la formule.
                            </div>
                          </div>
                        ) : cashDiscrepancy < 0 ? (
                          <div
                            className="p-3.5 bg-rose-100/80 border border-rose-300 rounded-xl text-rose-900 text-xs flex items-start gap-2.5"
                            data-cy="alert-balance-deficit"
                          >
                            <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block font-bold">
                                Déficit de Caisse : {Math.abs(cashDiscrepancy).toLocaleString("fr-FR")} Ar
                              </strong>
                              Un dossier de litige <code className="bg-rose-200 px-1 rounded">DEFICIT_COD</code> sera
                              automatiquement imputé au compte de ce livreur dans le registre des litiges.
                            </div>
                          </div>
                        ) : (
                          <div
                            className="p-3.5 bg-amber-100/80 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2.5"
                            data-cy="alert-balance-surplus"
                          >
                            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block font-bold">
                                Excédent de Caisse : +{cashDiscrepancy.toLocaleString("fr-FR")} Ar
                              </strong>
                              Le montant remis est supérieur au total théorique des livraisons de la tournée.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action button */}
                    <div>
                      {selectedTourDetail.status === "CLOTURE" ? (
                        <div className="w-full py-3 bg-slate-200 text-slate-500 font-bold text-center rounded-xl text-sm">
                          Cette tournée est déjà clôturée et scellée
                        </div>
                      ) : (
                        <button
                          onClick={handleConfirmCloseTour}
                          disabled={isClosingTour}
                          className="w-full py-3.5 bg-slate-900 hover:bg-black text-white font-black text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                          data-cy="btn-confirm-close-tour"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          {isClosingTour
                            ? "Clôture en cours..."
                            : "Valider la Décharge & Clôturer la Tournée"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tour Parcels Breakdown */}
                <div className="border-t border-slate-200 p-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                    Colis Pris en Charge dans cette Tournée (
                    {selectedTourDetail.parcels?.length || 0})
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200">
                          <th className="p-3">BDR</th>
                          <th className="p-3">Destinataire</th>
                          <th className="p-3">Statut</th>
                          <th className="p-3">Mode Règlement</th>
                          <th className="p-3 text-right">Marchandise</th>
                          <th className="p-3 text-right">Frais Port</th>
                          <th className="p-3 text-right">Total Dû</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(selectedTourDetail.parcels || []).map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold text-slate-800">
                              BDR-{p.tracking_number}
                            </td>
                            <td className="p-3">
                              <span className="font-semibold text-slate-800">
                                {p.recipient_name}
                              </span>
                              <span className="block text-[11px] text-slate-400 font-mono">
                                {p.recipient_phone}
                              </span>
                            </td>
                            <td className="p-3">{getStatusBadge(p.status)}</td>
                            <td className="p-3">{getPaymentBadge(p.payment_method)}</td>
                            <td className="p-3 text-right font-mono">
                              {p.merchandise_amount.toLocaleString("fr-FR")} Ar
                            </td>
                            <td className="p-3 text-right font-mono">
                              {p.delivery_fee.toLocaleString("fr-FR")} Ar
                            </td>
                            <td className="p-3 text-right font-mono font-black text-slate-900">
                              {p.total_to_collect.toLocaleString("fr-FR")} Ar
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* PRINTABLE RECEIPT MODAL */}
      {receiptData && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          data-cy="modal-discharge-receipt"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="text-center pb-4 border-b border-dashed border-slate-300">
              <h3 className="text-lg font-black tracking-wider text-slate-900">
                ⚡ TMS EXPRESS MADAGASCAR
              </h3>
              <p className="text-xs text-slate-500 font-medium">Hub Central Tsiazotafo • Antananarivo</p>
              <p className="text-xs font-bold text-slate-800 mt-2 uppercase">
                Bordereau de Décharge de Tournée
              </p>
              <p className="text-xs font-mono text-slate-400">
                Tournée #{receiptData.tour.id} • Date : {receiptData.tour.tour_date}
              </p>
            </div>

            <div className="py-4 space-y-3 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Livreur :</span>
                <span className="font-bold text-slate-900">
                  {receiptData.tour.courier_name || `Livreur #${receiptData.tour.courier_id}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Téléphone :</span>
                <span>{receiptData.tour.courier_phone_formatted || receiptData.tour.courier_phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Véhicule :</span>
                <span>{receiptData.tour.courier_vehicle || "Scooter"}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between">
                <span className="text-slate-500">Total Théorique Dû :</span>
                <span className="font-bold">
                  {(receiptData.tour.theoretical_total || 0).toLocaleString("fr-FR")} Ar
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Espèces Physiques :</span>
                <span>{receiptData.cash.toLocaleString("fr-FR")} Ar</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Preuves Mobile Money :</span>
                <span>{receiptData.mobile.toLocaleString("fr-FR")} Ar</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Frais Fret / Dépenses :</span>
                <span>{receiptData.expenses.toLocaleString("fr-FR")} Ar</span>
              </div>
              <div className="border-t-2 border-dashed border-slate-400 pt-2 flex justify-between text-sm font-black">
                <span>Écart de Caisse :</span>
                <span
                  className={
                    receiptData.discrepancy === 0
                      ? "text-emerald-700"
                      : receiptData.discrepancy < 0
                      ? "text-rose-700"
                      : "text-amber-700"
                  }
                >
                  {receiptData.discrepancy > 0 ? "+" : ""}
                  {receiptData.discrepancy.toLocaleString("fr-FR")} Ar
                </span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 mt-2 grid grid-cols-2 gap-4 text-center text-[10px] text-slate-400">
              <div>
                <p className="font-bold text-slate-600 mb-6">Signature Livreur</p>
                <div className="border-b border-slate-300 w-24 mx-auto" />
              </div>
              <div>
                <p className="font-bold text-slate-600 mb-6">Signature Responsable Caisse</p>
                <div className="border-b border-slate-300 w-24 mx-auto" />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Imprimer Ticket
              </button>
              <button
                onClick={() => setReceiptData(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl transition"
                data-cy="btn-close-receipt-modal"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
