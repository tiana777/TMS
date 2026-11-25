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
  Truck,
  Package,
  XCircle,
  Archive,
  ShieldCheck,
  Lock,
  LayoutGrid,
  List,
  Phone,
  MapPin,
} from "lucide-react";
import { HeaderUserRole } from "@/components/HeaderUserRole";
import { AxisBadge } from "@/components/AxisBadge";
import { StatusBadge } from "@/components/StatusBadge";
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
import { getTodayDateString } from "@/lib/date";
import { useCompany } from "@/context/CompanyContext";

function formatMGA(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "0\u00A0Ar";
  return amount.toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, "\u00A0") + "\u00A0Ar";
}

function formatNumber(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "0";
  return amount.toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, "\u00A0");
}

export default function CashAndClosurePage() {
  const { company } = useCompany();
  const [activeTab, setActiveTab] = useState<"caisse" | "decharge" | "siege">("caisse");
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString);
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
  const [encaissementLieuFilter, setEncaissementLieuFilter] = useState<string>("ALL");
  const [selectedParcelIds, setSelectedParcelIds] = useState<number[]>([]);
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
  const [displayMode, setDisplayMode] = useState<"cards" | "table">("cards");

  // Écran 08 (Décharge) states
  const [selectedTourId, setSelectedTourId] = useState<number | null>(null);
  const [selectedTourDetail, setSelectedTourDetail] = useState<Tour | null>(null);
  const [tourParcelFilter, setTourParcelFilter] = useState<
    "ALL" | "DUE" | "SIEGE" | "PENDING" | "FAILED"
  >("ALL");
  const [tourDisplayMode, setTourDisplayMode] = useState<"cards" | "table">("cards");
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
    grossTotal?: number;
    siegeTotal?: number;
    siegeParcels?: Parcel[];
  } | null>(null);

  // Rechargement du détail complet d'une tournée
  const loadTourDetail = async (tourId: number) => {
    setLoadingTourDetail(true);
    try {
      const detail = await fetchTourDetail(tourId);
      setSelectedTourDetail(detail);

      // Pré-remplir les montants selon le statut et les encaissements
      if (detail) {
        if (detail.status === "CLOTURE") {
          setRemittedCash(detail.actual_remitted || 0);
          setRemittedMobile(0);
          setRemittedExpenses(0);
        } else {
          // Calculer le total encaissé par le coursier sur le terrain
          let cashSum = 0;
          let mobileSum = 0;
          const validParcels: Parcel[] = detail.parcels || [];
          validParcels.forEach((p: Parcel) => {
            if (
              p.status === "ENCAISSE" ||
              p.status === "LIVRE_ENCAISSE" ||
              p.status === "CLOTURE_CAISSE" ||
              p.status === "SOUS_TRAITE"
            ) {
              // Si le COD est perçu au Siège, le livreur n'a pas encaissé ces fonds
              if (p.encaissement_lieu === "SIEGE") {
                return;
              }
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
      return detail;
    } catch (e: any) {
      console.error("Erreur chargement détail tournée", e);
      return null;
    } finally {
      setLoadingTourDetail(false);
    }
  };

  // Charger toutes les données initiales et synchroniser la tournée active
  const loadData = async (targetTourId?: number | null) => {
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

      const activeTourId =
        targetTourId !== undefined
          ? targetTourId
          : selectedTourId || (toursData && toursData.length > 0 ? toursData[0].id : null);

      if (activeTourId) {
        if (selectedTourId !== activeTourId) {
          setSelectedTourId(activeTourId);
        }
        await loadTourDetail(activeTourId);
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
    if (selectedTourId) {
      loadTourDetail(selectedTourId);
    } else {
      setSelectedTourDetail(null);
    }
  }, [selectedTourId]);

  // Polling temps réel (toutes les 6 secondes) pour synchroniser le flux de caisse et décharge
  useEffect(() => {
    const timer = setInterval(async () => {
      if (isClosingTour || isSubmittingBulk) return;
      try {
        const [parcelsData, toursData] = await Promise.all([
          fetchParcels({ date: selectedDate }),
          fetchTours(selectedDate),
        ]);
        if (parcelsData) setParcels(parcelsData);
        if (toursData) setTours(toursData);
        if (selectedTourId) {
          const detail = await fetchTourDetail(selectedTourId);
          if (detail) {
            setSelectedTourDetail((prev) => {
              if (
                !prev ||
                prev.status !== detail.status ||
                prev.actual_remitted !== detail.actual_remitted ||
                prev.discrepancy !== detail.discrepancy ||
                JSON.stringify(prev.parcels?.map((p: any) => ({ id: p.id, s: p.status }))) !==
                JSON.stringify(detail.parcels?.map((p: any) => ({ id: p.id, s: p.status })))
              ) {
                if (detail.status === "CLOTURE") {
                  setRemittedCash(detail.actual_remitted || 0);
                  setRemittedMobile(0);
                  setRemittedExpenses(0);
                }
                return detail;
              }
              return prev;
            });
          }
        }
      } catch (err) {
        // Ignorer silencieusement les erreurs de connexion temporaires en arrière-plan
      }
    }, 6000);

    return () => clearInterval(timer);
  }, [selectedDate, selectedTourId, isClosingTour, isSubmittingBulk]);

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

  // Colis avec encaissement direct au Siège (Caisse centrale / Virement / En ligne)
  const siegeParcels = useMemo(() => {
    return parcels.filter(
      (p) =>
        p.encaissement_lieu === "SIEGE" &&
        (p.merchandise_amount > 0 || p.total_to_collect > 0 || p.flux_type === "PROVINCE")
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
    let pendingCount = 0;
    let closedCount = 0;
    let closedAmount = 0;
    let inTourCount = 0;
    let inTourAmount = 0;
    let totalSiege = 0;
    let totalLivreur = 0;

    codParcels.forEach((p) => {
      totalCOD += p.total_to_collect;
      if (p.encaissement_lieu === "SIEGE") {
        totalSiege += p.total_to_collect;
      } else {
        totalLivreur += p.total_to_collect;
      }

      if (p.status === "CLOTURE_CAISSE") {
        closedCount++;
        closedAmount += p.total_to_collect;
      } else if (
        ["ENCAISSE", "LIVRE_ENCAISSE", "LIVRE", "SOUS_TRAITE"].includes(p.status)
      ) {
        pendingValidation += p.total_to_collect;
        pendingCount++;
      } else if (["EN_COURS", "ASSIGNE"].includes(p.status)) {
        inTourCount++;
        inTourAmount += p.total_to_collect;
      }

      if (["ENCAISSE", "LIVRE_ENCAISSE", "CLOTURE_CAISSE", "SOUS_TRAITE"].includes(p.status)) {
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
      pendingCount,
      closedCount,
      closedAmount,
      inTourCount,
      inTourAmount,
      totalSiege,
      totalLivreur,
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
          if (!["ENCAISSE", "LIVRE_ENCAISSE", "LIVRE", "SOUS_TRAITE"].includes(p.status)) {
            return false;
          }
        } else if (statusFilter === "EN_COURS") {
          if (!["EN_COURS", "ASSIGNE"].includes(p.status)) {
            return false;
          }
        } else if (p.status !== statusFilter) {
          return false;
        }
      }

      // Filtre méthode de paiement
      if (paymentFilter !== "ALL") {
        if (p.payment_method !== paymentFilter) return false;
      }

      // Filtre lieu d'encaissement (Siège vs Livreur)
      if (encaissementLieuFilter !== "ALL") {
        if (encaissementLieuFilter === "SIEGE" && p.encaissement_lieu !== "SIEGE") return false;
        if (encaissementLieuFilter === "LIVREUR" && p.encaissement_lieu === "SIEGE") return false;
      }

      return true;
    });
  }, [codParcels, searchQuery, statusFilter, paymentFilter, encaissementLieuFilter]);

  // Actions de sélection groupée
  const handleToggleSelectAll = () => {
    const selectableIds = filteredParcels
      .filter((p) =>
        ["ENCAISSE", "LIVRE_ENCAISSE", "LIVRE", "SOUS_TRAITE"].includes(p.status)
      )
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
      // Feedback optimiste instantané
      setParcels((prev) =>
        prev.map((p) => (p.id === parcelId ? { ...p, status: "CLOTURE_CAISSE" } : p))
      );
      if (selectedTourDetail && selectedTourDetail.parcels) {
        setSelectedTourDetail((prev) =>
          prev
            ? {
              ...prev,
              parcels: prev.parcels?.map((p) =>
                p.id === parcelId ? { ...p, status: "CLOTURE_CAISSE" } : p
              ),
            }
            : prev
        );
      }
      await updateParcelStatus(parcelId, { status: "CLOTURE_CAISSE" });
      setSuccessMessage(`Colis #${parcelId} validé et clôturé en caisse centrale.`);
      await loadData(selectedTourId);
    } catch (e: any) {
      setError(e.message || "Erreur lors de la validation du colis.");
      await loadData(selectedTourId);
    }
  };

  // Validation groupée de caisse
  const handleBulkValidate = async () => {
    if (selectedParcelIds.length === 0) return;
    setIsSubmittingBulk(true);
    const toValidate = [...selectedParcelIds];
    try {
      // Feedback optimiste instantané
      setParcels((prev) =>
        prev.map((p) => (toValidate.includes(p.id) ? { ...p, status: "CLOTURE_CAISSE" } : p))
      );
      if (selectedTourDetail && selectedTourDetail.parcels) {
        setSelectedTourDetail((prev) =>
          prev
            ? {
              ...prev,
              parcels: prev.parcels?.map((p) =>
                toValidate.includes(p.id) ? { ...p, status: "CLOTURE_CAISSE" } : p
              ),
            }
            : prev
        );
      }
      await bulkCloseCash(toValidate);
      setSuccessMessage(
        `${toValidate.length} colis validé(s) avec succès et clôturé(s) en caisse centrale.`
      );
      setSelectedParcelIds([]);
      await loadData(selectedTourId);
    } catch (e: any) {
      setError(e.message || "Erreur lors de la validation groupée.");
      await loadData(selectedTourId);
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  // Calculs financiers détaillés pour la décharge de tournée au Quai (Écran 08)
  const getClientCollectedAmount = (p: Parcel): number => {
    const splitSum = (p.montant_encaisse_livreur || 0) + (p.montant_encaisse_vendeur || 0);
    if (splitSum > 0) return splitSum;
    if (["ENCAISSE", "LIVRE_ENCAISSE", "CLOTURE_CAISSE", "SOUS_TRAITE"].includes(p.status)) {
      return p.total_to_collect || 0;
    }
    return 0;
  };

  const tourFinancials = useMemo(() => {
    const empty = {
      allParcels: [] as Parcel[],
      deliveredParcels: [] as Parcel[],
      pendingParcels: [] as Parcel[],
      failedParcels: [] as Parcel[],
      siegeParcels: [] as Parcel[],
      courierParcels: [] as Parcel[],
      grossTotal: 0,
      grossMerchandise: 0,
      grossDeliveryFee: 0,
      siegeTotal: 0,
      courierTheoreticalDue: 0,
      courierMerchandiseDue: 0,
      courierFeeDue: 0,
      expectedCashTotal: 0,
      expectedCashCount: 0,
      expectedMobileTotal: 0,
      expectedMobileCount: 0,
      expectedOtherTotal: 0,
      expectedOtherCount: 0,
      pendingTotal: 0,
      failedTotal: 0,
      clientCollectedTotal: 0,
      clientCollectedCount: 0,
      clientCollectedCourierTotal: 0,
      clientCollectedVendorTotal: 0,
      deliveredUnconfirmedTotal: 0,
    };

    if (!selectedTourDetail || !selectedTourDetail.parcels) {
      return empty;
    }

    const deliveredStatuses = ["LIVRE", "ENCAISSE", "LIVRE_ENCAISSE", "CLOTURE_CAISSE", "SOUS_TRAITE"];
    const pendingStatuses = ["ASSIGNE", "EN_COURS", "EN_DEPOT", "REPORTE"];

    const allParcels = selectedTourDetail.parcels;
    const deliveredParcels: Parcel[] = [];
    const pendingParcels: Parcel[] = [];
    const failedParcels: Parcel[] = [];
    const siegeParcels: Parcel[] = [];
    const courierParcels: Parcel[] = [];

    let grossTotal = 0;
    let grossMerchandise = 0;
    let grossDeliveryFee = 0;
    let siegeTotal = 0;
    let courierTheoreticalDue = 0;
    let courierMerchandiseDue = 0;
    let courierFeeDue = 0;
    let expectedCashTotal = 0;
    let expectedCashCount = 0;
    let expectedMobileTotal = 0;
    let expectedMobileCount = 0;
    let expectedOtherTotal = 0;
    let expectedOtherCount = 0;
    let pendingTotal = 0;
    let failedTotal = 0;
    let clientCollectedTotal = 0;
    let clientCollectedCount = 0;
    let clientCollectedCourierTotal = 0;
    let clientCollectedVendorTotal = 0;
    let deliveredUnconfirmedTotal = 0;

    allParcels.forEach((p) => {
      const collected = getClientCollectedAmount(p);
      if (collected > 0) {
        clientCollectedTotal += collected;
        clientCollectedCount += 1;
        if (p.montant_encaisse_vendeur && p.montant_encaisse_vendeur > 0) {
          clientCollectedVendorTotal += p.montant_encaisse_vendeur;
        }
        if (p.montant_encaisse_livreur && p.montant_encaisse_livreur > 0) {
          clientCollectedCourierTotal += p.montant_encaisse_livreur;
        } else if (p.encaissement_lieu !== "SIEGE" && p.encaissement_lieu !== "DIRECT_VENDEUR") {
          clientCollectedCourierTotal += collected;
        }
      }

      if (deliveredStatuses.includes(p.status)) {
        deliveredParcels.push(p);
        grossTotal += p.total_to_collect;
        grossMerchandise += p.merchandise_amount;
        grossDeliveryFee += p.delivery_fee;

        if (collected === 0 && p.status === "LIVRE") {
          deliveredUnconfirmedTotal += p.total_to_collect;
        }

        if (p.encaissement_lieu === "SIEGE") {
          siegeTotal += p.total_to_collect;
          siegeParcels.push(p);
        } else {
          courierTheoreticalDue += p.total_to_collect;
          courierMerchandiseDue += p.merchandise_amount;
          courierFeeDue += p.delivery_fee;
          courierParcels.push(p);

          if (p.payment_method === "ESPECES") {
            expectedCashTotal += p.total_to_collect;
            expectedCashCount += 1;
          } else if (
            p.payment_method &&
            ["MVOLA", "AIRTEL", "ORANGE_MONEY"].includes(p.payment_method)
          ) {
            expectedMobileTotal += p.total_to_collect;
            expectedMobileCount += 1;
          } else {
            expectedOtherTotal += p.total_to_collect;
            expectedOtherCount += 1;
          }
        }
      } else if (pendingStatuses.includes(p.status)) {
        pendingParcels.push(p);
        pendingTotal += p.total_to_collect;
      } else {
        failedParcels.push(p);
        failedTotal += p.total_to_collect;
      }
    });

    return {
      allParcels,
      deliveredParcels,
      pendingParcels,
      failedParcels,
      siegeParcels,
      courierParcels,
      grossTotal,
      grossMerchandise,
      grossDeliveryFee,
      siegeTotal,
      courierTheoreticalDue,
      courierMerchandiseDue,
      courierFeeDue,
      expectedCashTotal,
      expectedCashCount,
      expectedMobileTotal,
      expectedMobileCount,
      expectedOtherTotal,
      expectedOtherCount,
      pendingTotal,
      failedTotal,
      clientCollectedTotal,
      clientCollectedCount,
      clientCollectedCourierTotal,
      clientCollectedVendorTotal,
      deliveredUnconfirmedTotal,
    };
  }, [selectedTourDetail]);

const theoreticalTotal = tourFinancials.courierTheoreticalDue;
const totalRemitted = remittedCash + remittedMobile + remittedExpenses;
const cashDiscrepancy =
  selectedTourDetail?.status === "CLOTURE"
    ? selectedTourDetail.discrepancy
    : totalRemitted - theoreticalTotal;

// Clôture définitive de la tournée
const handleConfirmCloseTour = async () => {
  if (!selectedTourDetail) return;
  setIsClosingTour(true);
  setError(null);
  try {
    // 1. Appel API de clôture de la tournée
    const res = await closeTour(selectedTourDetail.id, totalRemitted);

    // 2. Recharger immédiatement en temps réel le détail scellé de la tournée
    const updatedTourDetail = await loadTourDetail(selectedTourDetail.id);

    const finalTour = updatedTourDetail || {
      ...selectedTourDetail,
      status: "CLOTURE" as const,
      actual_remitted: totalRemitted,
      discrepancy: cashDiscrepancy,
    };

    setSuccessMessage(
      `Tournée #${selectedTourDetail.id} clôturée avec succès. Écart de caisse : ${cashDiscrepancy === 0
        ? "0 Ar (Équilibrée)"
        : cashDiscrepancy < 0
          ? `${formatMGA(cashDiscrepancy)} (Déficit consigné en litige)`
          : `+${formatMGA(cashDiscrepancy)} (Excédent)`
      }`
    );

    // 3. Ouvrir le reçu imprimable avec les données scellées
    setReceiptData({
      tour: finalTour,
      cash: remittedCash,
      mobile: remittedMobile,
      expenses: remittedExpenses,
      discrepancy: cashDiscrepancy,
      closedAt: new Date().toISOString(),
      grossTotal: tourFinancials.grossTotal,
      siegeTotal: tourFinancials.siegeTotal,
      siegeParcels: tourFinancials.siegeParcels,
    });

    // 4. Synchroniser en arrière-plan la liste globale des tournées et colis
    await loadData(selectedTourDetail.id);
  } catch (e: any) {
    setError(e.message || "Erreur lors de la clôture de la tournée.");
  } finally {
    setIsClosingTour(false);
  }
};

const getStatusBadge = (status: ParcelStatus | string, encaissement_lieu?: string | null) => {
  return <StatusBadge status={status} encaissement_lieu={encaissement_lieu} />;
};

const getPaymentBadge = (method?: string | null) => {
  if (!method) {
    return (
      <span className="text-xs text-slate-400 italic whitespace-nowrap">Non renseigné</span>
    );
  }
  switch (method) {
    case "ESPECES":
      return (
        <span className="px-2 py-0.5 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1 whitespace-nowrap">
          <DollarSign className="w-3 h-3 text-emerald-600 shrink-0" />
          Espèces
        </span>
      );
    case "MVOLA":
      return (
        <span className="px-2 py-0.5 text-xs font-bold rounded-lg bg-yellow-50 text-yellow-800 border border-yellow-300 inline-flex items-center gap-1 whitespace-nowrap">
          <Smartphone className="w-3 h-3 text-yellow-600 shrink-0" />
          MVola (Telma)
        </span>
      );
    case "AIRTEL":
      return (
        <span className="px-2 py-0.5 text-xs font-bold rounded-lg bg-red-50 text-red-700 border border-red-200 inline-flex items-center gap-1 whitespace-nowrap">
          <Smartphone className="w-3 h-3 text-red-600 shrink-0" />
          Airtel Money
        </span>
      );
    case "ORANGE_MONEY":
      return (
        <span className="px-2 py-0.5 text-xs font-bold rounded-lg bg-orange-50 text-orange-700 border border-orange-200 inline-flex items-center gap-1 whitespace-nowrap">
          <Smartphone className="w-3 h-3 text-orange-600 shrink-0" />
          Orange Money
        </span>
      );
    case "VIREMENT":
      return (
        <span className="px-2 py-0.5 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1 whitespace-nowrap">
          <Building2 className="w-3 h-3 text-blue-600 shrink-0" />
          Virement Bancaire
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
          {method}
        </span>
      );
  }
};

return (
  <div className="w-full max-w-7xl mx-auto space-y-5 pb-12 min-w-0">
    {/* Top Header & Tab Navigation Card */}
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Wallet className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                Caisse Centrale & Clôture Comptable
              </h1>
              <p className="text-xs text-slate-500 font-normal">
                Écran 07 (Validation Encaissements COD) & Écran 08 (Décharge de Tournée Journalière)
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-800 font-medium focus:outline-none text-xs cursor-pointer"
              data-cy="cash-date-picker"
            />
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">Temps Réel Actif</span>
          </div>

          <button
            onClick={() => loadData(selectedTourId)}
            disabled={loading}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition border border-slate-200 cursor-pointer"
            title="Rafraîchir les données manuellement"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex border-t border-slate-100 flex-wrap bg-slate-50/50">
        <button
          onClick={() => setActiveTab("caisse")}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${activeTab === "caisse"
            ? "border-emerald-600 text-emerald-700 bg-white"
            : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50"
            }`}
          data-cy="tab-caisse"
        >
          <Coins className="w-3.5 h-3.5" />
          07. Caisse Centrale COD
          <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-slate-200 text-slate-700 font-medium">
            {codParcels.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("decharge")}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${activeTab === "decharge"
            ? "border-blue-600 text-blue-700 bg-white"
            : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50"
            }`}
          data-cy="tab-decharge"
        >
          <FileText className="w-3.5 h-3.5" />
          08. Décharge au Quai & Clôture de Tournée
          <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-slate-200 text-slate-700 font-medium">
            {tours.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("siege")}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${activeTab === "siege"
            ? "border-purple-600 text-purple-700 bg-white"
            : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50"
            }`}
          data-cy="tab-siege"
        >
          <Building2 className="w-3.5 h-3.5" />
          09. Historique Encaissements au Siège
          <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-blue-100 text-blue-800 font-bold">
            {siegeParcels.length} ({formatMGA(cashMetrics.totalSiege)})
          </span>
        </button>
      </div>
    </div>

    {/* Main Container */}
    <div className="w-full min-w-0 max-w-full space-y-4">
      {/* Banner Alert Feedback */}
      {error && (
        <div
          className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center justify-between shadow-xs text-xs"
          data-cy="cash-error-banner"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-500 hover:text-rose-800 text-xs font-semibold underline"
          >
            Fermer
          </button>
        </div>
      )}

      {successMessage && (
        <div
          className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between shadow-xs text-xs"
          data-cy="cash-success-banner"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="font-medium">{successMessage}</p>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-500 hover:text-emerald-800 text-xs font-semibold underline"
          >
            Fermer
          </button>
        </div>
      )}

      {/* TAB 1 : ÉCRAN 07 - CAISSE CENTRALE COD */}
      {activeTab === "caisse" && (
        <div className="space-y-4" data-cy="view-caisse">
          {/* KPI Cards Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 min-w-0">
            {/* Card 1: Total COD Encaissé / Dû */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 border-l-4 border-l-emerald-500 shadow-xs flex flex-col justify-between min-w-0">
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Total COD Encaissé / Dû
                  </span>
                  <Coins className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono tabular-nums whitespace-nowrap">
                  {formatMGA(cashMetrics.totalCOD)}
                </div>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-1.5">
                <span>Sur {cashMetrics.totalCount} colis COD</span>
                <span className="font-semibold text-emerald-700">100% rapproché</span>
              </div>
            </div>

            {/* Card 2: Espèces Remises */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 border-l-4 border-l-teal-500 shadow-xs flex flex-col justify-between min-w-0">
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Espèces Remises au Hub
                  </span>
                  <DollarSign className="w-4 h-4 text-teal-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-teal-700 font-mono tabular-nums whitespace-nowrap">
                  {formatMGA(cashMetrics.totalEspeces)}
                </div>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-1.5">
                Billetage compté & vérifié
              </div>
            </div>

            {/* Card 3: Mobile Money Réconcilié */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 border-l-4 border-l-amber-500 shadow-xs flex flex-col justify-between min-w-0">
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Mobile Money Réconcilié
                  </span>
                  <Smartphone className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-amber-700 font-mono tabular-nums whitespace-nowrap">
                  {formatMGA(cashMetrics.totalMobile)}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-600 font-mono tabular-nums border-t border-slate-100 pt-1.5 flex-wrap">
                <span className="px-1.5 py-0.5 bg-yellow-50 text-yellow-800 rounded font-bold border border-yellow-200">
                  MV: {formatNumber(cashMetrics.totalMvola)}
                </span>
                <span className="px-1.5 py-0.5 bg-red-50 text-red-800 rounded font-bold border border-red-200">
                  Air: {formatNumber(cashMetrics.totalAirtel)}
                </span>
                <span className="px-1.5 py-0.5 bg-orange-50 text-orange-800 rounded font-bold border border-orange-200">
                  Org: {formatNumber(cashMetrics.totalOrange)}
                </span>
              </div>
            </div>

            {/* Card 4: À Valider en Caisse vs Scellé */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 border-l-4 border-l-indigo-500 shadow-xs flex flex-col justify-between min-w-0">
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    À Valider en Caisse
                  </span>
                  <Clock className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-indigo-700 font-mono tabular-nums whitespace-nowrap">
                  {formatMGA(cashMetrics.pendingValidation)}
                </div>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-1.5">
                <span className="text-amber-700 font-bold">{cashMetrics.pendingCount} à sceller</span>
                <span className="text-emerald-700 font-bold">{cashMetrics.closedCount} scellés</span>
              </div>
            </div>
          </div>

          {/* Action & Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-3 min-w-0 max-w-full">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              {/* Search */}
              <div className="relative min-w-[200px] flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="N° BDR, Destinataire, Expéditeur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  data-cy="search-cash-input"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
                data-cy="status-cash-filter"
              >
                <option value="ALL">Tous les statuts ({codParcels.length})</option>
                <option value="A_VALIDER">⚡ À Valider en Caisse ({cashMetrics.pendingCount})</option>
                <option value="CLOTURE_CAISSE">🔒 Déjà Scellés en Caisse ({cashMetrics.closedCount})</option>
                <option value="EN_COURS">🛵 En Cours de Tournée ({cashMetrics.inTourCount})</option>
                <option value="SOUS_TRAITE">🚌 Sous-traités Gare (Province)</option>
                <option value="REPORTE">⏳ Reportés</option>
                <option value="ANNULE_RETOUR">❌ Annulés / Refus</option>
              </select>

              {/* Payment Method Filter */}
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
                data-cy="payment-cash-filter"
              >
                <option value="ALL">Tous les règlements</option>
                <option value="ESPECES">💵 Espèces physiques</option>
                <option value="MVOLA">📱 MVola (Telma)</option>
                <option value="AIRTEL">📱 Airtel Money</option>
                <option value="ORANGE_MONEY">📱 Orange Money</option>
                <option value="VIREMENT">🏦 Virement Bancaire</option>
              </select>

              {/* Lieu d'encaissement Filter */}
              <select
                value={encaissementLieuFilter}
                onChange={(e) => setEncaissementLieuFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
                data-cy="encaissement-lieu-filter"
              >
                <option value="ALL">Tous les lieux de recouvrement</option>
                <option value="SIEGE">🏢 Récupéré au Siège ({formatMGA(cashMetrics.totalSiege)})</option>
                <option value="LIVREUR">🛵 Récupéré par Livreur ({formatMGA(cashMetrics.totalLivreur)})</option>
              </select>
            </div>

            {/* View Toggle & Bulk Actions */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* View Mode Toggle */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setDisplayMode("cards")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${displayMode === "cards"
                    ? "bg-white text-emerald-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                    }`}
                  title="Affichage en Cartes (0% défilement horizontal)"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cartes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode("table")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${displayMode === "table"
                    ? "bg-white text-emerald-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                    }`}
                  title="Affichage en Tableau compact (Colonnes condensées)"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Tableau</span>
                </button>
              </div>

              {selectedParcelIds.length > 0 && (
                <button
                  onClick={handleBulkValidate}
                  disabled={isSubmittingBulk}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer whitespace-nowrap"
                  data-cy="btn-bulk-validate-cash"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Valider la Caisse ({selectedParcelIds.length} colis)
                </button>
              )}
            </div>
          </div>

          {/* Empty State */}
          {filteredParcels.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <Coins className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-semibold text-slate-600">Aucun colis COD trouvé pour ces critères</p>
              <p className="text-xs text-slate-400 mt-1">
                Ajustez vos filtres ou sélectionnez une autre date.
              </p>
            </div>
          ) : displayMode === "cards" ? (
            /* VUE 1 : AFFICHAGE EN CARTES (AUCUN DÉBORDEMENT HORIZONTAL) */
            <div className="space-y-3 min-w-0 max-w-full" data-cy="cash-parcels-cards">
              {/* Select All Bar */}
              <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer font-bold text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={
                      filteredParcels.length > 0 &&
                      filteredParcels
                        .filter((p) =>
                          ["ENCAISSE", "LIVRE_ENCAISSE", "LIVRE", "SOUS_TRAITE"].includes(p.status)
                        )
                        .every((p) => selectedParcelIds.includes(p.id))
                    }
                    onChange={handleToggleSelectAll}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    data-cy="select-all-cash-cards"
                  />
                  <span>Tout sélectionner pour validation caisse ({filteredParcels.length} colis)</span>
                </label>
                {selectedParcelIds.length > 0 && (
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    {selectedParcelIds.length} colis sélectionné(s)
                  </span>
                )}
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredParcels.map((parcel) => {
                  const isSelectable =
                    ["ENCAISSE", "LIVRE_ENCAISSE", "LIVRE", "SOUS_TRAITE"].includes(parcel.status);
                  const isSelected = selectedParcelIds.includes(parcel.id);
                  const isClosed = parcel.status === "CLOTURE_CAISSE";

                  return (
                    <div
                      key={parcel.id}
                      data-cy={`cash-parcel-card-${parcel.id}`}
                      className={`p-4 rounded-2xl border transition shadow-xs flex flex-col justify-between gap-3 ${isClosed
                        ? "bg-slate-50/80 border-slate-200/90 opacity-75"
                        : isSelected
                          ? "bg-emerald-50/40 border-emerald-300 ring-2 ring-emerald-500/10"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                        }`}
                    >
                      {/* Top: Selection, BDR, Date, Status Badges */}
                      <div className="space-y-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isSelectable ? (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectParcel(parcel.id)}
                                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                                data-cy={`select-cash-parcel-${parcel.id}`}
                              />
                            ) : isClosed ? (
                              <span title="Validé et scellé en caisse centrale" className="inline-block">
                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">•</span>
                            )}

                            <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                              BDR-{parcel.tracking_number}
                            </span>

                            <span className="text-[11px] text-slate-400 font-mono">
                              {parcel.reception_date}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${isClosed
                                ? "bg-slate-100 text-slate-500 border-slate-200"
                                : parcel.encaissement_lieu === "SIEGE"
                                  ? "bg-blue-50 text-blue-800 border-blue-200"
                                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                }`}
                            >
                              {parcel.encaissement_lieu === "SIEGE" ? "🏢 Au Siège" : "🛵 Par Livreur"}
                            </span>
                            <StatusBadge status={parcel.status} encaissement_lieu={parcel.encaissement_lieu} />
                          </div>
                        </div>

                        {/* Axe and Type Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <AxisBadge axis={parcel.axis} />
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 uppercase border border-slate-200">
                            {parcel.flux_type}
                          </span>
                        </div>
                      </div>

                      {/* Middle: Client, Sender, Payment */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="space-y-0.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                            Destinataire & Expéditeur
                          </span>
                          <div className="font-bold text-slate-900">
                            {parcel.recipient_name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            {parcel.recipient_phone_formatted || parcel.recipient_phone}
                          </div>
                          {parcel.sender_name && (
                            <div className="text-[11px] text-blue-700 font-medium truncate" title={parcel.sender_name}>
                              Exp: <strong>{parcel.sender_name}</strong>
                            </div>
                          )}
                        </div>

                        <div className="space-y-0.5 sm:border-l sm:border-slate-100 sm:pl-3">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                            Règlement & Détail
                          </span>
                          <div>{getPaymentBadge(parcel.payment_method)}</div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            Marchandise : <span className="font-mono font-medium">{formatMGA(parcel.merchandise_amount)}</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Frais de port : <span className="font-mono font-medium">{formatMGA(parcel.delivery_fee)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom: Financial Total & Action */}
                      <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-100 bg-slate-50/60 -mx-4 -mb-4 p-3 rounded-b-2xl">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                            Total COD à Encaisser
                          </span>
                          <span className="font-mono font-black text-sm text-emerald-800">
                            {formatMGA(parcel.total_to_collect)}
                          </span>
                        </div>

                        <div>
                          {parcel.status === "CLOTURE_CAISSE" ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-300 shadow-2xs">
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                              Scellé
                            </span>
                          ) : isSelectable ? (
                            <button
                              onClick={() => handleValidateSingleParcel(parcel.id)}
                              disabled={isSubmittingBulk}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                              data-cy={`btn-validate-cash-${parcel.id}`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Valider Caisse
                            </button>
                          ) : parcel.status === "EN_COURS" || parcel.status === "ASSIGNE" ? (
                            <span className="text-[11px] text-sky-600 font-medium italic flex items-center gap-1">
                              <Truck className="w-3.5 h-3.5" /> En cours
                            </span>
                          ) : parcel.status === "EN_DEPOT" ? (
                            <span className="text-[11px] text-amber-600 font-medium italic flex items-center gap-1">
                              <Package className="w-3.5 h-3.5" /> En stock
                            </span>
                          ) : parcel.status === "REPORTE" ? (
                            <span className="text-[11px] text-orange-600 font-medium flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> Reporté
                            </span>
                          ) : (
                            <span className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" /> Annulé
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* VUE 2 : TABLEAU COMPACT AVEC COLONNES CONDENSÉES */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-w-0 max-w-full">
              <div className="overflow-x-auto w-full max-w-full">
                <table className="w-full text-left border-collapse" data-cy="cash-parcels-table">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase font-bold tracking-wider border-b border-slate-200">
                      <th className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredParcels.length > 0 &&
                            filteredParcels
                              .filter((p) =>
                                ["ENCAISSE", "LIVRE_ENCAISSE", "LIVRE", "SOUS_TRAITE"].includes(p.status)
                              )
                              .every((p) => selectedParcelIds.includes(p.id))
                          }
                          onChange={handleToggleSelectAll}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                          data-cy="select-all-cash-checkbox"
                          title="Sélectionner tous les colis éligibles à la clôture"
                        />
                      </th>
                      <th className="py-3 px-3 min-w-[240px]">Colis, Destinataire & Axe</th>
                      <th className="py-3 px-3 w-40 whitespace-nowrap">Règlement & Lieu</th>
                      <th className="py-3 px-3 w-36 whitespace-nowrap text-right">Montants & COD</th>
                      <th className="py-3 px-3 w-36 whitespace-nowrap text-center">Statut</th>
                      <th className="py-3 px-3 w-32 whitespace-nowrap text-center">Action Caisse</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredParcels.map((parcel) => {
                      const isSelectable =
                        ["ENCAISSE", "LIVRE_ENCAISSE", "LIVRE", "SOUS_TRAITE"].includes(parcel.status);
                      const isSelected = selectedParcelIds.includes(parcel.id);
                      const isClosed = parcel.status === "CLOTURE_CAISSE";

                      return (
                        <tr
                          key={parcel.id}
                          className={`transition ${isClosed
                            ? "bg-slate-100/70 text-slate-400 opacity-60 hover:bg-slate-100/90 select-none"
                            : isSelected
                              ? "bg-emerald-50/40 hover:bg-slate-50/80"
                              : "hover:bg-slate-50/80"
                            }`}
                          data-cy={`cash-parcel-row-${parcel.id}`}
                        >
                          {/* Checkbox */}
                          <td className="py-2.5 px-3 text-center">
                            {isSelectable ? (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectParcel(parcel.id)}
                                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                                data-cy={`select-cash-parcel-${parcel.id}`}
                              />
                            ) : isClosed ? (
                              <span title="Validé et scellé en caisse centrale" className="inline-block">
                                <Lock className="w-3.5 h-3.5 text-slate-400 mx-auto" />
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">•</span>
                            )}
                          </td>

                          {/* Colonne Unique Condensée : Colis, Destinataire & Axe */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                BDR-{parcel.tracking_number}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {parcel.reception_date}
                              </span>
                              <AxisBadge axis={parcel.axis} />
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 uppercase border border-slate-200">
                                {parcel.flux_type}
                              </span>
                            </div>
                            <div className="font-bold text-slate-900 text-xs">
                              {parcel.recipient_name}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {parcel.recipient_phone_formatted || parcel.recipient_phone}
                            </div>
                            {parcel.sender_name && (
                              <div className="text-[10px] text-blue-600 font-medium truncate max-w-[260px]" title={parcel.sender_name}>
                                Exp: {parcel.sender_name}
                              </div>
                            )}
                          </td>

                          {/* Règlement & Lieu */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div>{getPaymentBadge(parcel.payment_method)}</div>
                            <div className="mt-1">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${isClosed
                                  ? "bg-slate-100 text-slate-500 border-slate-200"
                                  : parcel.encaissement_lieu === "SIEGE"
                                    ? "bg-blue-50 text-blue-800 border-blue-200"
                                    : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  }`}
                              >
                                {parcel.encaissement_lieu === "SIEGE" ? "🏢 Siège" : "🛵 Livreur"}
                              </span>
                            </div>
                          </td>

                          {/* Montants & COD */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="font-mono font-black text-slate-900 text-xs">
                              {formatMGA(parcel.total_to_collect)}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              March: {formatNumber(parcel.merchandise_amount || 0)}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Port: {formatNumber(parcel.delivery_fee || 0)}
                            </div>
                          </td>

                          {/* Statut */}
                          <td className={`py-2.5 px-3 text-center whitespace-nowrap ${isClosed ? "opacity-75" : ""}`}>
                            <StatusBadge status={parcel.status} encaissement_lieu={parcel.encaissement_lieu} />
                          </td>

                          {/* Action */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {parcel.status === "CLOTURE_CAISSE" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-300 whitespace-nowrap shadow-2xs">
                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                                Scellé
                              </span>
                            ) : isSelectable ? (
                              <button
                                onClick={() => handleValidateSingleParcel(parcel.id)}
                                disabled={isSubmittingBulk}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                                data-cy={`btn-validate-cash-${parcel.id}`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Valider
                              </button>
                            ) : parcel.status === "EN_COURS" || parcel.status === "ASSIGNE" ? (
                              <span className="text-[11px] text-sky-600 font-medium italic flex items-center justify-center gap-1">
                                <Truck className="w-3.5 h-3.5" /> En cours
                              </span>
                            ) : parcel.status === "EN_DEPOT" ? (
                              <span className="text-[11px] text-amber-600 font-medium italic flex items-center justify-center gap-1">
                                <Package className="w-3.5 h-3.5" /> En stock
                              </span>
                            ) : parcel.status === "REPORTE" ? (
                              <span className="text-[11px] text-orange-600 font-medium flex items-center justify-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> Reporté
                              </span>
                            ) : (
                              <span className="text-[11px] text-rose-600 font-medium flex items-center justify-center gap-1">
                                <XCircle className="w-3.5 h-3.5" /> Annulé
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
                  const isClosed = t.status === "CLOTURE";
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTourId(t.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${isSelected
                        ? isClosed
                          ? "bg-slate-100/90 border-slate-400 ring-2 ring-slate-400/20"
                          : "bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20"
                        : isClosed
                          ? "bg-slate-100/60 border-slate-200/80 opacity-70 hover:bg-slate-100"
                          : "bg-slate-50/50 border-slate-200 hover:bg-slate-100"
                        }`}
                      data-cy={`select-tour-card-${t.id}`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isClosed ? "text-slate-600" : "text-slate-900"}`}>
                            Tournée #{t.id}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${isClosed
                              ? "bg-slate-200 text-slate-700 border border-slate-300"
                              : t.status === "EN_COURS"
                                ? "bg-sky-100 text-sky-800"
                                : "bg-indigo-100 text-indigo-800"
                              }`}
                          >
                            {isClosed && <Lock className="w-2.5 h-2.5" />}
                            {t.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                          Livreur: {t.courier_name || `ID #${t.courier_id}`}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {t.courier_vehicle || "Deux-roues standard"}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block">Dû estimé</span>
                        <span className={`font-mono font-bold text-sm ${isClosed ? "text-slate-500" : "text-slate-800"}`}>
                          {formatMGA(t.theoretical_total || 0)}
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
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 ${selectedTourDetail.status === "CLOTURE"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-sky-100 text-sky-800 border border-sky-300"
                        }`}
                    >
                      {selectedTourDetail.status === "CLOTURE" ? (
                        <>
                          <Lock className="w-3 h-3 text-emerald-700" />
                          Tournée Déjà Clôturée & Scellée
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                          En Cours de Clôture
                        </>
                      )}
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

                  {/* Tour Siège Reconciliation Banner & Detailed Breakdown */}
                  {tourFinancials.siegeParcels.length > 0 && (
                    <div className="p-4 bg-blue-50/90 border border-blue-200 rounded-2xl shadow-xs space-y-3" data-cy="tour-siege-reconciliation-card">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="p-1.5 bg-blue-600 text-white rounded-lg">
                            <Building2 className="w-4 h-4" />
                          </span>
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                              Historique Encaissements au Siège pour cette Tournée
                            </h4>
                            <p className="text-xs text-blue-700">
                              {tourFinancials.siegeParcels.length} colis réglé(s) directement au siège ({formatMGA(tourFinancials.siegeTotal)}).
                            </p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-800 border border-blue-200 rounded-full text-xs font-bold font-mono">
                          Ne PAS réclamer au livreur
                        </span>
                      </div>

                      {/* Tableau historique détaillé des colis Siège de la tournée */}
                      <div className="bg-white rounded-xl border border-blue-200 overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-blue-100/60 text-blue-900 text-[10px] font-bold uppercase border-b border-blue-200">
                            <tr>
                              <th className="p-2.5">N° BDR</th>
                              <th className="p-2.5">Destinataire</th>
                              <th className="p-2.5">Règlement Siège</th>
                              <th className="p-2.5 text-right">Marchandise</th>
                              <th className="p-2.5 text-right">Frais Port</th>
                              <th className="p-2.5 text-right">Total COD Siège</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-blue-100">
                            {tourFinancials.siegeParcels.map((sp) => (
                              <tr key={sp.id} className="hover:bg-blue-50/50">
                                <td className="p-2.5 font-mono font-bold text-blue-900 whitespace-nowrap">
                                  BDR-{sp.tracking_number}
                                </td>
                                <td className="p-2.5">
                                  <span className="font-semibold block">{sp.recipient_name}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">{sp.recipient_phone}</span>
                                </td>
                                <td className="p-2.5 whitespace-nowrap">{getPaymentBadge(sp.payment_method)}</td>
                                <td className="p-2.5 text-right font-mono font-medium text-slate-600 whitespace-nowrap">
                                  {formatMGA(sp.merchandise_amount)}
                                </td>
                                <td className="p-2.5 text-right font-mono font-medium text-slate-600 whitespace-nowrap">
                                  {formatMGA(sp.delivery_fee)}
                                </td>
                                <td className="p-2.5 text-right font-mono font-black text-blue-900 whitespace-nowrap">
                                  {formatMGA(sp.total_to_collect)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {selectedTourDetail.status === "CLOTURE" && (
                      <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl flex items-center gap-2 text-xs text-slate-600 font-semibold mb-1 shadow-2xs">
                        <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>
                          <strong>Tournée Clôturée & Scellée :</strong> Les montants réconciliés sont figés en caisse et archivés en lecture seule.
                        </span>
                      </div>
                    )}

                    {/* 1. Espèces physiques */}
                    <div
                      className={`p-4 rounded-xl border transition-all ${selectedTourDetail.status === "CLOTURE"
                        ? "bg-slate-100/80 border-slate-300/80 opacity-75"
                        : "bg-slate-50 border-slate-200"
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <label
                          className={`text-sm font-bold flex items-center gap-2 ${selectedTourDetail.status === "CLOTURE"
                            ? "text-slate-500"
                            : "text-slate-800"
                            }`}
                        >
                          <DollarSign
                            className={`w-4 h-4 ${selectedTourDetail.status === "CLOTURE"
                              ? "text-slate-400"
                              : "text-emerald-600"
                              }`}
                          />
                          1. Espèces Physiques Comptées au Hub (MGA)
                        </label>
                        <span
                          className={`text-xs font-mono ${selectedTourDetail.status === "CLOTURE"
                            ? "text-slate-400"
                            : "text-slate-500"
                            }`}
                        >
                          {selectedTourDetail.status === "CLOTURE" ? "🔒 Scellé" : "Billetage"}
                        </span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        placeholder="0"
                        value={remittedCash === 0 ? "" : remittedCash}
                        onChange={(e) => setRemittedCash(Number(e.target.value) || 0)}
                        disabled={selectedTourDetail.status === "CLOTURE"}
                        className={`w-full px-4 py-2.5 rounded-lg text-lg font-mono font-black border transition-all ${selectedTourDetail.status === "CLOTURE"
                          ? "bg-slate-200/70 text-slate-500 border-slate-300 cursor-not-allowed shadow-none select-none"
                          : "bg-white border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          }`}
                        data-cy="input-remitted-cash"
                      />
                    </div>

                    {/* 2. Mobile Money */}
                    <div
                      className={`p-4 rounded-xl border transition-all ${selectedTourDetail.status === "CLOTURE"
                        ? "bg-slate-100/80 border-slate-300/80 opacity-75"
                        : "bg-slate-50 border-slate-200"
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <label
                          className={`text-sm font-bold flex items-center gap-2 ${selectedTourDetail.status === "CLOTURE"
                            ? "text-slate-500"
                            : "text-slate-800"
                            }`}
                        >
                          <Smartphone
                            className={`w-4 h-4 ${selectedTourDetail.status === "CLOTURE"
                              ? "text-slate-400"
                              : "text-yellow-600"
                              }`}
                          />
                          2. Paiements Mobile Money Vérifiés (MGA)
                        </label>
                        <span
                          className={`text-xs font-mono ${selectedTourDetail.status === "CLOTURE"
                            ? "text-slate-400"
                            : "text-slate-500"
                            }`}
                        >
                          {selectedTourDetail.status === "CLOTURE" ? "🔒 Scellé" : "MVola / Airtel / Orange"}
                        </span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        placeholder="0"
                        value={remittedMobile === 0 ? "" : remittedMobile}
                        onChange={(e) => setRemittedMobile(Number(e.target.value) || 0)}
                        disabled={selectedTourDetail.status === "CLOTURE"}
                        className={`w-full px-4 py-2.5 rounded-lg text-lg font-mono font-black border transition-all ${selectedTourDetail.status === "CLOTURE"
                          ? "bg-slate-200/70 text-slate-500 border-slate-300 cursor-not-allowed shadow-none select-none"
                          : "bg-white border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                          }`}
                        data-cy="input-remitted-mobile"
                      />
                    </div>

                    {/* 3. Frais de fret gares / Justificatifs */}
                    <div
                      className={`p-4 rounded-xl border transition-all ${selectedTourDetail.status === "CLOTURE"
                        ? "bg-slate-100/80 border-slate-300/80 opacity-75"
                        : "bg-slate-50 border-slate-200"
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <label
                          className={`text-sm font-bold flex items-center gap-2 ${selectedTourDetail.status === "CLOTURE"
                            ? "text-slate-500"
                            : "text-slate-800"
                            }`}
                        >
                          <FileText
                            className={`w-4 h-4 ${selectedTourDetail.status === "CLOTURE"
                              ? "text-slate-400"
                              : "text-purple-600"
                              }`}
                          />
                          3. Dépenses & Fret Justifiés par Récépissés (MGA)
                        </label>
                        <span
                          className={`text-xs font-mono ${selectedTourDetail.status === "CLOTURE"
                            ? "text-slate-400"
                            : "text-slate-500"
                            }`}
                        >
                          {selectedTourDetail.status === "CLOTURE" ? "🔒 Scellé" : "Souches coopératives"}
                        </span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        placeholder="0"
                        value={remittedExpenses === 0 ? "" : remittedExpenses}
                        onChange={(e) => setRemittedExpenses(Number(e.target.value) || 0)}
                        disabled={selectedTourDetail.status === "CLOTURE"}
                        className={`w-full px-4 py-2.5 rounded-lg text-lg font-mono font-black border transition-all ${selectedTourDetail.status === "CLOTURE"
                          ? "bg-slate-200/70 text-slate-500 border-slate-300 cursor-not-allowed shadow-none select-none"
                          : "bg-white border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          }`}
                        data-cy="input-remitted-expenses"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column : Balance Synthesis & Validation Action */}
                <div className="lg:col-span-5 flex flex-col justify-between space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                      Bilan de la Tournée au Quai
                    </h4>

                    <div className="space-y-3 font-mono text-sm">
                      <div className="flex items-center justify-between text-slate-500 text-xs">
                        <span>1. Total Brut Tournée (Livrées) :</span>
                        <span className="font-bold">{formatMGA(tourFinancials.grossTotal)}</span>
                      </div>

                      {tourFinancials.siegeTotal > 0 && (
                        <div className="flex items-center justify-between text-blue-700 text-xs pb-1">
                          <span>2. − Déjà Encaissé au Siège (Exclu) :</span>
                          <span className="font-bold">−{formatMGA(tourFinancials.siegeTotal)}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-slate-800 pb-2 border-b border-slate-200">
                        <span className="font-sans font-bold text-xs">
                          = Net Exigé du Livreur au Quai :
                        </span>
                        <span className="font-black text-slate-900 text-base">
                          {formatMGA(tourFinancials.courierTheoreticalDue)}
                        </span>
                      </div>

                      {/* Encaissé Client & Ventilation COD */}
                      <div className="bg-white/80 rounded-xl border border-slate-200/80 p-3 space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between text-teal-800 pb-1.5 border-b border-slate-100">
                          <span className="font-sans font-bold">
                            Encaissé auprès des Clients ({tourFinancials.clientCollectedCount} colis) :
                          </span>
                          <span className="font-black whitespace-nowrap">
                            {formatMGA(tourFinancials.clientCollectedTotal)}
                          </span>
                        </div>
                        {tourFinancials.clientCollectedVendorTotal > 0 && (
                          <div className="flex items-center justify-between text-indigo-700">
                            <span className="font-sans">Dont Direct Vendeur :</span>
                            <span className="font-bold whitespace-nowrap">
                              {formatMGA(tourFinancials.clientCollectedVendorTotal)}
                            </span>
                          </div>
                        )}
                        {tourFinancials.deliveredUnconfirmedTotal > 0 && (
                          <div className="flex items-center justify-between text-amber-700">
                            <span className="font-sans">Livré (encaissement non confirmé) :</span>
                            <span className="font-bold whitespace-nowrap">
                              {formatMGA(tourFinancials.deliveredUnconfirmedTotal)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="font-sans">Dont COD Marchandise :</span>
                          <span className="font-bold text-slate-800 whitespace-nowrap">
                            {formatMGA(tourFinancials.courierMerchandiseDue)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="font-sans">Dont Frais de port (Fee) :</span>
                          <span className="font-bold text-slate-800 whitespace-nowrap">
                            {formatMGA(tourFinancials.courierFeeDue)}
                          </span>
                        </div>
                        <div className="pt-1.5 mt-1 border-t border-slate-100 space-y-1">
                          <div className="flex items-center justify-between text-emerald-700">
                            <span className="font-sans">
                              Attendu Espèces ({tourFinancials.expectedCashCount} colis) :
                            </span>
                            <span className="font-bold whitespace-nowrap">
                              {formatMGA(tourFinancials.expectedCashTotal)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-amber-700">
                            <span className="font-sans">
                              Attendu Mobile Money ({tourFinancials.expectedMobileCount} colis) :
                            </span>
                            <span className="font-bold whitespace-nowrap">
                              {formatMGA(tourFinancials.expectedMobileTotal)}
                            </span>
                          </div>
                          {tourFinancials.expectedOtherCount > 0 && (
                            <div className="flex items-center justify-between text-slate-500">
                              <span className="font-sans">
                                Mode non précisé / Autre ({tourFinancials.expectedOtherCount} colis) :
                              </span>
                              <span className="font-bold whitespace-nowrap">
                                {formatMGA(tourFinancials.expectedOtherTotal)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-1">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Total Remis au Quai (1+2+3) :</span>
                          <span className="font-bold text-slate-900 whitespace-nowrap">
                            {formatMGA(totalRemitted)}
                          </span>
                        </div>
                        {selectedTourDetail.status !== "CLOTURE" && (
                          <div className="text-[10px] text-slate-500 mt-0.5 text-right">
                            Espèces: {formatMGA(remittedCash)} • Mobile: {formatMGA(remittedMobile)} •
                            Justif.: {formatMGA(remittedExpenses)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t-2 border-slate-300 text-base">
                        <span className="font-sans font-bold text-slate-800">
                          Écart de Décharge au Quai :
                        </span>
                        <span
                          className={`font-black text-lg whitespace-nowrap ${cashDiscrepancy === 0
                            ? "text-emerald-700"
                            : cashDiscrepancy < 0
                              ? "text-rose-700"
                              : "text-amber-700"
                            }`}
                          data-cy="cash-discrepancy-value"
                        >
                          {cashDiscrepancy > 0 ? "+" : ""}
                          {formatMGA(cashDiscrepancy)}
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
                              Déficit de Caisse : {formatMGA(Math.abs(cashDiscrepancy))}
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
                              Excédent de Caisse : +{formatMGA(cashDiscrepancy)}
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
                      <div className="space-y-2">
                        <div className="w-full py-3 bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold text-center rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xs select-none">
                          <Lock className="w-4 h-4 text-emerald-600" />
                          Tournée Déjà Clôturée & Scellée
                        </div>
                        <button
                          onClick={() =>
                            setReceiptData({
                              tour: selectedTourDetail,
                              cash: selectedTourDetail.actual_remitted || 0,
                              mobile: 0,
                              expenses: 0,
                              discrepancy: selectedTourDetail.discrepancy || 0,
                              closedAt: selectedTourDetail.closed_at || new Date().toISOString(),
                              grossTotal: tourFinancials.grossTotal,
                              siegeTotal: tourFinancials.siegeTotal,
                              siegeParcels: tourFinancials.siegeParcels,
                            })
                          }
                          className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 border border-slate-300 shadow-2xs cursor-pointer"
                          data-cy="btn-reprint-receipt"
                        >
                          <Printer className="w-4 h-4 text-slate-600" />
                          Voir / Imprimer le Reçu de Décharge
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleConfirmCloseTour}
                        disabled={isClosingTour}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
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
              <div className="border-t border-slate-200 p-5 sm:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      Détail des Colis, COD & Frais de la Tournée (
                      {selectedTourDetail.parcels?.length || 0})
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Observez chaque colis : montant COD (marchandise), frais de port (fee),
                      statut de livraison et impact sur le dû du livreur au quai.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedTourDetail.status === "CLOTURE" && (
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-2">
                        <Lock className="w-3 h-3" /> Scellée
                      </span>
                    )}
                    <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setTourDisplayMode("cards")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${tourDisplayMode === "cards"
                            ? "bg-white text-slate-900 shadow-2xs"
                            : "text-slate-500 hover:text-slate-700"
                          }`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        Cartes
                      </button>
                      <button
                        type="button"
                        onClick={() => setTourDisplayMode("table")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${tourDisplayMode === "table"
                            ? "bg-white text-slate-900 shadow-2xs"
                            : "text-slate-500 hover:text-slate-700"
                          }`}
                      >
                        <List className="w-3.5 h-3.5" />
                        Tableau
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4-Card Summary Strip for quick observation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div
                    onClick={() => setTourParcelFilter("DUE")}
                    className={`p-3.5 rounded-xl border cursor-pointer transition ${tourParcelFilter === "DUE"
                        ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20"
                        : "bg-emerald-50/40 border-emerald-200 hover:bg-emerald-50/80"
                      }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                      <span>Livrés (Dû Livreur)</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono">
                        {tourFinancials.courierParcels.length}
                      </span>
                    </div>
                    <div className="text-base font-black font-mono text-emerald-900 mt-1 tabular-nums">
                      {formatMGA(tourFinancials.courierTheoreticalDue)}
                    </div>
                    <div className="text-[10px] text-emerald-700 mt-1 font-mono tabular-nums">
                      COD: {formatMGA(tourFinancials.courierMerchandiseDue)} + Frais:{" "}
                      {formatMGA(tourFinancials.courierFeeDue)}
                    </div>
                  </div>

                  <div
                    onClick={() => setTourParcelFilter("SIEGE")}
                    className={`p-3.5 rounded-xl border cursor-pointer transition ${tourParcelFilter === "SIEGE"
                        ? "bg-blue-50 border-blue-400 ring-2 ring-blue-500/20"
                        : "bg-blue-50/40 border-blue-200 hover:bg-blue-50/80"
                      }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-blue-800">
                      <span>Encaissés Siège (Exclus)</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono">
                        {tourFinancials.siegeParcels.length}
                      </span>
                    </div>
                    <div className="text-base font-black font-mono text-blue-900 mt-1 tabular-nums">
                      {formatMGA(tourFinancials.siegeTotal)}
                    </div>
                    <div className="text-[10px] text-blue-700 mt-1">
                      Déjà perçus par le siège
                    </div>
                  </div>

                  <div
                    onClick={() => setTourParcelFilter("PENDING")}
                    className={`p-3.5 rounded-xl border cursor-pointer transition ${tourParcelFilter === "PENDING"
                        ? "bg-amber-50 border-amber-400 ring-2 ring-amber-500/20"
                        : "bg-amber-50/40 border-amber-200 hover:bg-amber-50/80"
                      }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-800">
                      <span>En Cours / Reportés</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono">
                        {tourFinancials.pendingParcels.length}
                      </span>
                    </div>
                    <div className="text-base font-black font-mono text-amber-900 mt-1 tabular-nums">
                      {formatMGA(tourFinancials.pendingTotal)}
                    </div>
                    <div className="text-[10px] text-amber-700 mt-1">
                      Hors dû quai (non livrés)
                    </div>
                  </div>

                  <div
                    onClick={() => setTourParcelFilter("FAILED")}
                    className={`p-3.5 rounded-xl border cursor-pointer transition ${tourParcelFilter === "FAILED"
                        ? "bg-rose-50 border-rose-400 ring-2 ring-rose-500/20"
                        : "bg-rose-50/40 border-rose-200 hover:bg-rose-50/80"
                      }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-rose-800">
                      <span>Échecs / Retours</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-mono">
                        {tourFinancials.failedParcels.length}
                      </span>
                    </div>
                    <div className="text-base font-black font-mono text-rose-900 mt-1 tabular-nums">
                      {formatMGA(tourFinancials.failedTotal)}
                    </div>
                    <div className="text-[10px] text-rose-700 mt-1">
                      Hors dû quai (colis à retourner)
                    </div>
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    {
                      key: "ALL" as const,
                      label: `Tous (${tourFinancials.allParcels.length})`,
                    },
                    {
                      key: "DUE" as const,
                      label: `Inclus Dû Livreur (${tourFinancials.courierParcels.length})`,
                    },
                    {
                      key: "SIEGE" as const,
                      label: `Au Siège (${tourFinancials.siegeParcels.length})`,
                    },
                    {
                      key: "PENDING" as const,
                      label: `En cours / Reportés (${tourFinancials.pendingParcels.length})`,
                    },
                    {
                      key: "FAILED" as const,
                      label: `Échecs / Retours (${tourFinancials.failedParcels.length})`,
                    },
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setTourParcelFilter(f.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${tourParcelFilter === f.key
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {(() => {
                  const deliveredStatuses = [
                    "LIVRE",
                    "ENCAISSE",
                    "LIVRE_ENCAISSE",
                    "CLOTURE_CAISSE",
                    "SOUS_TRAITE",
                  ];
                  const pendingStatuses = ["ASSIGNE", "EN_COURS", "EN_DEPOT", "REPORTE"];
                  const visibleParcels = (selectedTourDetail.parcels || []).filter((p) => {
                    const isDelivered = deliveredStatuses.includes(p.status);
                    const isPending = pendingStatuses.includes(p.status);
                    if (tourParcelFilter === "DUE")
                      return isDelivered && p.encaissement_lieu !== "SIEGE";
                    if (tourParcelFilter === "SIEGE")
                      return isDelivered && p.encaissement_lieu === "SIEGE";
                    if (tourParcelFilter === "PENDING") return isPending;
                    if (tourParcelFilter === "FAILED") return !isDelivered && !isPending;
                    return true;
                  });

                  const isTourClosed = selectedTourDetail.status === "CLOTURE";

                  if (visibleParcels.length === 0) {
                    return (
                      <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                        Aucun colis dans cette catégorie pour la tournée #{selectedTourDetail.id}.
                      </div>
                    );
                  }

                  if (tourDisplayMode === "cards") {
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {visibleParcels.map((p) => {
                          const isDelivered = deliveredStatuses.includes(p.status);
                          const isPending = pendingStatuses.includes(p.status);
                          const isSiege = p.encaissement_lieu === "SIEGE";
                          const isCourierDue = isDelivered && !isSiege;
                          const hasCod = (p.merchandise_amount || 0) > 0;

                          return (
                            <div
                              key={p.id}
                              className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 transition ${isTourClosed
                                  ? "bg-slate-50/70 border-slate-200 opacity-85"
                                  : isCourierDue
                                    ? "bg-white border-emerald-200/80 shadow-2xs hover:border-emerald-300"
                                    : isSiege
                                      ? "bg-blue-50/20 border-blue-200/80"
                                      : "bg-white border-slate-200"
                                }`}
                            >
                              {/* Top header */}
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                                      {p.tracking_number?.startsWith("BDR-") ? p.tracking_number : `BDR-${p.tracking_number}`}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${hasCod
                                          ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                                          : "bg-slate-100 text-slate-600 border-slate-200"
                                        }`}
                                    >
                                      {hasCod ? "Avec COD" : "Sans COD (Frais seul)"}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <StatusBadge
                                      status={p.status}
                                      encaissement_lieu={p.encaissement_lieu}
                                      size="xs"
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                  <AxisBadge axis={p.axis} />
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase border border-slate-200">
                                    {p.flux_type}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${isSiege
                                        ? "bg-blue-50 text-blue-800 border-blue-200"
                                        : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                      }`}
                                  >
                                    {isSiege ? "🏢 Au Siège" : "🛵 Par Livreur"}
                                  </span>
                                </div>
                              </div>

                              {/* Middle details */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100">
                                <div className="space-y-1">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                                    Destinataire & Livraison
                                  </span>
                                  <div className="font-bold text-slate-900">
                                    {p.recipient_name}
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                    {p.recipient_phone_formatted || p.recipient_phone}
                                  </div>
                                  {p.delivery_address && (
                                    <div className="text-[11px] text-slate-600 flex items-start gap-1">
                                      <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                                      <span>{p.delivery_address}</span>
                                    </div>
                                  )}
                                  {p.sender_name && (
                                    <div className="text-[11px] text-blue-700 font-medium">
                                      Exp: <strong>{p.sender_name}</strong>
                                    </div>
                                  )}
                                  {p.designation && (
                                    <div className="text-[11px] text-slate-500 italic">
                                      Contenu : {p.designation}
                                    </div>
                                  )}
                                  {(p.observation || p.incident_reason) && (
                                    <div className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                                      Obs: {p.incident_reason || p.observation}
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-1.5 sm:border-l sm:border-slate-100 sm:pl-3">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                                    Détail COD & Frais (Fee)
                                  </span>
                                  <div className="pb-1">{getPaymentBadge(p.payment_method)}</div>
                                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                                    <span>COD Marchandise :</span>
                                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                                      {formatMGA(p.merchandise_amount)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                                    <span>Frais de port (Fee) :</span>
                                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                                      {formatMGA(p.delivery_fee)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 font-bold text-slate-800">
                                    <span>Total Colis :</span>
                                    <span className="font-mono tabular-nums">
                                      {formatMGA(p.total_to_collect)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-dashed border-slate-200">
                                    <span className="font-semibold text-teal-800">Encaissé Client :</span>
                                    {(() => {
                                      const collected = getClientCollectedAmount(p);
                                      if (collected > 0) {
                                        return (
                                          <span className="font-mono font-bold text-teal-700 tabular-nums">
                                            {formatMGA(collected)}
                                          </span>
                                        );
                                      }
                                      if (p.status === "LIVRE") {
                                        return (
                                          <span className="text-[10px] font-semibold text-amber-600">
                                            Non confirmé
                                          </span>
                                        );
                                      }
                                      return (
                                        <span className="font-mono text-slate-400 tabular-nums">
                                          0&nbsp;Ar
                                        </span>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>

                              {/* Bottom Impact Bar */}
                              <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 bg-slate-50/70 -mx-4 -mb-4 px-4 py-2.5 rounded-b-2xl">
                                <span className="text-[11px] font-semibold text-slate-600">
                                  {isCourierDue
                                    ? "✅ Inclus dans le Dû Livreur au Quai"
                                    : isSiege
                                      ? "🏢 Exclu (Encaissé au Siège)"
                                      : isPending
                                        ? `⏳ Exclu (Non livré : ${p.status.replace("_", " ").toLowerCase()})`
                                        : `⚠️ Exclu (${p.status.replace("_", " ").toLowerCase()})`}
                                </span>
                                <span
                                  className={`font-mono font-black text-sm tabular-nums ${isCourierDue
                                      ? "text-emerald-700"
                                      : isSiege
                                        ? "text-blue-700"
                                        : "text-slate-400 line-through"
                                    }`}
                                >
                                  {isCourierDue
                                    ? formatMGA(p.total_to_collect)
                                    : isSiege
                                      ? "0\u00A0Ar"
                                      : formatMGA(p.total_to_collect)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  // Table mode
                  const sumMerch = visibleParcels.reduce((s, p) => s + (p.merchandise_amount || 0), 0);
                  const sumFee = visibleParcels.reduce((s, p) => s + (p.delivery_fee || 0), 0);
                  const sumTotal = visibleParcels.reduce((s, p) => s + (p.total_to_collect || 0), 0);
                  const sumClientCollected = visibleParcels.reduce(
                    (s, p) => s + getClientCollectedAmount(p),
                    0
                  );
                  const sumDue = visibleParcels.reduce((s, p) => {
                    const isDelivered = deliveredStatuses.includes(p.status);
                    return s + (isDelivered && p.encaissement_lieu !== "SIEGE" ? p.total_to_collect : 0);
                  }, 0);

                  return (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs w-full max-w-full">
                      <table className="min-w-[960px] w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200">
                            <th className="py-2.5 px-3 whitespace-nowrap">N° BDR</th>
                            <th className="py-2.5 px-3 min-w-[180px]">Destinataire & Exp.</th>
                            <th className="py-2.5 px-3 whitespace-nowrap text-center">Statut</th>
                            <th className="py-2.5 px-3 whitespace-nowrap text-center">Type COD</th>
                            <th className="py-2.5 px-3 whitespace-nowrap">Règlement</th>
                            <th className="py-2.5 px-3 whitespace-nowrap text-right">
                              COD (March.)
                            </th>
                            <th className="py-2.5 px-3 whitespace-nowrap text-right">
                              Frais (Fee)
                            </th>
                            <th className="py-2.5 px-3 whitespace-nowrap text-right">
                              Total Colis
                            </th>
                            <th className="py-2.5 px-3 whitespace-nowrap text-right text-teal-800">
                              Encaissé Client
                            </th>
                            <th className="py-2.5 px-3 whitespace-nowrap text-right font-black">
                              Dû Livreur
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {visibleParcels.map((p) => {
                            const isDelivered = deliveredStatuses.includes(p.status);
                            const isSiege = p.encaissement_lieu === "SIEGE";
                            const isCourierDue = isDelivered && !isSiege;
                            const hasCod = (p.merchandise_amount || 0) > 0;

                            return (
                              <tr
                                key={p.id}
                                className={`transition ${isTourClosed
                                    ? "bg-slate-50/70 text-slate-500 opacity-75 hover:bg-slate-100/60"
                                    : "hover:bg-slate-50"
                                  }`}
                              >
                                <td className="p-3 font-mono font-bold whitespace-nowrap text-slate-900">
                                  <div>{p.tracking_number?.startsWith("BDR-") ? p.tracking_number : `BDR-${p.tracking_number}`}</div>
                                  <div>{p.tracking_number?.startsWith("BDR-") ? p.tracking_number : `BDR-${p.tracking_number}`}</div>
                                  <div className="text-[10px] font-normal text-slate-400">
                                    {p.axis}
                                  </div>
                                </td>
                                <td className="p-3">
                                  <span className="block font-semibold text-slate-900">
                                    {p.recipient_name}
                                  </span>
                                  <span className="block text-[11px] text-slate-400 font-mono">
                                    {p.recipient_phone_formatted || p.recipient_phone}
                                  </span>
                                  {p.delivery_address && (
                                    <span className="block text-[10px] text-slate-500 truncate max-w-[200px]">
                                      {p.delivery_address}
                                    </span>
                                  )}
                                  {p.sender_name && (
                                    <span className="block text-[10px] text-blue-700">
                                      Exp: {p.sender_name}
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-center whitespace-nowrap">
                                  <StatusBadge
                                    status={p.status}
                                    encaissement_lieu={p.encaissement_lieu}
                                    size="xs"
                                  />
                                  <div className="mt-1">
                                    <span
                                      className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${isSiege
                                          ? "bg-blue-50 text-blue-800 border-blue-200"
                                          : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                        }`}
                                    >
                                      {isSiege ? "🏢 Siège" : "🛵 Livreur"}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-3 text-center whitespace-nowrap">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${hasCod
                                        ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                                        : "bg-slate-100 text-slate-600 border-slate-200"
                                      }`}
                                  >
                                    {hasCod ? "Avec COD" : "Sans COD"}
                                  </span>
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                  {getPaymentBadge(p.payment_method)}
                                </td>
                                <td className="p-3 text-right font-mono tabular-nums whitespace-nowrap text-slate-700">
                                  {formatMGA(p.merchandise_amount)}
                                </td>
                                <td className="p-3 text-right font-mono tabular-nums whitespace-nowrap text-slate-700">
                                  {formatMGA(p.delivery_fee)}
                                </td>
                                <td className="p-3 text-right font-mono font-semibold tabular-nums whitespace-nowrap text-slate-900">
                                  {formatMGA(p.total_to_collect)}
                                </td>
                                <td className="p-3 text-right font-mono tabular-nums whitespace-nowrap">
                                  {(() => {
                                    const collected = getClientCollectedAmount(p);
                                    if (collected > 0) {
                                      return (
                                        <span className="font-bold text-teal-700">
                                          {formatMGA(collected)}
                                        </span>
                                      );
                                    }
                                    if (p.status === "LIVRE") {
                                      return (
                                        <span className="text-[10px] font-semibold text-amber-600">
                                          Non confirmé
                                        </span>
                                      );
                                    }
                                    return <span className="text-slate-400">0&nbsp;Ar</span>;
                                  })()}
                                </td>
                                <td className="p-3 text-right whitespace-nowrap">
                                  {isSiege ? (
                                    <div className="text-right">
                                      <span className="font-bold block font-mono text-xs text-blue-700">
                                        0&nbsp;Ar
                                      </span>
                                      <span className="text-[10px] text-slate-400">
                                        (Exclu : Siège)
                                      </span>
                                    </div>
                                  ) : !isDelivered ? (
                                    <div className="text-right">
                                      <span className="font-mono text-xs text-slate-400 line-through block tabular-nums">
                                        {formatMGA(p.total_to_collect)}
                                      </span>
                                      <span className="text-[10px] text-amber-600 font-medium">
                                        (Non exigé)
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-md border bg-emerald-50 border-emerald-200 font-mono text-xs font-bold text-emerald-900 tabular-nums">
                                      {formatMGA(p.total_to_collect)}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-slate-100/90 border-t-2 border-slate-300 font-mono text-xs font-bold text-slate-900">
                          <tr>
                            <td colSpan={5} className="p-3 text-right uppercase tracking-wider text-slate-600">
                              Totaux ({visibleParcels.length} colis) :
                            </td>
                            <td className="p-3 text-right tabular-nums">{formatMGA(sumMerch)}</td>
                            <td className="p-3 text-right tabular-nums">{formatMGA(sumFee)}</td>
                            <td className="p-3 text-right tabular-nums">{formatMGA(sumTotal)}</td>
                            <td className="p-3 text-right tabular-nums text-teal-800">
                              {formatMGA(sumClientCollected)}
                            </td>
                            <td className="p-3 text-right tabular-nums text-emerald-800 font-black">
                              {formatMGA(sumDue)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  );
                })()}
                </div>
              </div>
            )}
          </div>
        )}

{/* TAB 3 : HISTORIQUE DES ENCAISSEMENTS AU SIÈGE */ }
{
  activeTab === "siege" && (
    <div className="space-y-4" data-cy="view-siege-history">
      {/* KPI Banner Siège */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Building2 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Journal d'Audit des Encaissements au Siège
              </h2>
              <p className="text-xs text-slate-500">
                Historique des paiements perçus directement par la caisse centrale / virement / Mobile Money Siège (déduits de la décharge du livreur au quai).
              </p>
            </div>
          </div>
        </div>
        <div className="text-right bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-200">
          <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
            Total Encaissé au Siège ({selectedDate})
          </span>
          <span className="text-lg font-black font-mono text-blue-900">
            {formatMGA(cashMetrics.totalSiege)}
          </span>
        </div>
      </div>

      {/* Empty State or Content */}
      {siegeParcels.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-600">Aucun encaissement au siège pour le {selectedDate}</p>
          <p className="text-xs text-slate-400 mt-1">
            Tous les colis réglés par virement ou direct au siège apparaissent automatiquement ici.
          </p>
        </div>
      ) : displayMode === "cards" ? (
        /* VUE CARTES SIÈGE */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 min-w-0 max-w-full" data-cy="siege-parcels-cards">
          {siegeParcels.map((sp) => (
            <div
              key={sp.id}
              className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 shadow-xs flex flex-col justify-between gap-3"
            >
              <div className="space-y-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                      BDR-{sp.tracking_number}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {sp.reception_date}
                    </span>
                  </div>
                  <StatusBadge status={sp.status} encaissement_lieu="SIEGE" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <AxisBadge axis={sp.axis} />
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    🏢 Récupéré au Siège
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Destinataire & Expéditeur
                  </span>
                  <div className="font-bold text-slate-900">{sp.recipient_name}</div>
                  <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    {sp.recipient_phone_formatted || sp.recipient_phone}
                  </div>
                  {sp.sender_name && (
                    <div className="text-[11px] text-blue-700 font-medium truncate" title={sp.sender_name}>
                      Exp: <strong>{sp.sender_name}</strong>
                    </div>
                  )}
                </div>

                <div className="space-y-0.5 sm:border-l sm:border-slate-100 sm:pl-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Règlement
                  </span>
                  <div>{getPaymentBadge(sp.payment_method)}</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Marchandise : <span className="font-mono font-medium">{formatMGA(sp.merchandise_amount)}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Frais port : <span className="font-mono font-medium">{formatMGA(sp.delivery_fee)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-100 bg-blue-50/40 -mx-4 -mb-4 p-3 rounded-b-2xl">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Total COD Siège
                  </span>
                  <span className="font-mono font-black text-sm text-blue-900">
                    {formatMGA(sp.total_to_collect)}
                  </span>
                </div>

                <div>
                  {sp.status === "CLOTURE_CAISSE" ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Scellé en Caisse
                    </span>
                  ) : (
                    <button
                      onClick={() => handleValidateSingleParcel(sp.id)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Valider Caisse
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* VUE TABLEAU CONDENSÉ SIÈGE */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-w-0 max-w-full">
          <div className="overflow-x-auto w-full max-w-full">
            <table className="w-full text-left border-collapse" data-cy="siege-parcels-table">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase font-bold tracking-wider border-b border-slate-200">
                  <th className="py-3 px-3 min-w-[240px]">Colis, Destinataire & Axe</th>
                  <th className="py-3 px-3 w-40 whitespace-nowrap">Règlement Siège</th>
                  <th className="py-3 px-3 w-36 whitespace-nowrap text-right">Montants & COD</th>
                  <th className="py-3 px-3 w-36 whitespace-nowrap text-center">Statut</th>
                  <th className="py-3 px-3 w-32 whitespace-nowrap text-center">Action Caisse</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {siegeParcels.map((sp) => (
                  <tr key={sp.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          BDR-{sp.tracking_number}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {sp.reception_date}
                        </span>
                        <AxisBadge axis={sp.axis} />
                      </div>
                      <div className="font-bold text-slate-900 text-xs">
                        {sp.recipient_name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {sp.recipient_phone_formatted || sp.recipient_phone}
                      </div>
                      {sp.sender_name && (
                        <div className="text-[10px] text-blue-600 font-medium truncate max-w-[260px]" title={sp.sender_name}>
                          Exp: {sp.sender_name}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div>{getPaymentBadge(sp.payment_method)}</div>
                      <span className="mt-1 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        🏢 Direct Siège
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="font-mono font-black text-blue-900 text-xs">
                        {formatMGA(sp.total_to_collect)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        March: {formatNumber(sp.merchandise_amount || 0)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Port: {formatNumber(sp.delivery_fee || 0)}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <StatusBadge status={sp.status} encaissement_lieu="SIEGE" />
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {sp.status === "CLOTURE_CAISSE" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Scellé
                        </span>
                      ) : (
                        <button
                          onClick={() => handleValidateSingleParcel(sp.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Valider
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
                  </div >

  {/* PRINTABLE RECEIPT MODAL */ }
{
  receiptData && (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      data-cy="modal-discharge-receipt"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
        <div className="text-center pb-4 border-b border-dashed border-slate-300">
          {company.logo_url && (
            <div className="flex justify-center mb-2">
              <img
                src={company.logo_url}
                alt="Logo"
                className="h-10 w-auto max-w-[140px] object-contain"
              />
            </div>
          )}
          <h3 className="text-lg font-black tracking-wider text-slate-900">
            {company.company_name || company.app_name || "TMS EXPRESS"}
          </h3>
          <p className="text-xs text-slate-500 font-medium">{company.address || "Hub Central Tsiazotafo • Antananarivo"}</p>
          <p className="text-xs font-bold text-slate-800 mt-2 uppercase">
            Bordereau de Décharge au Quai
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

          {/* Rapprochement Siège vs Quai sur le Reçu */}
          <div className="border-t border-slate-200 pt-2 flex justify-between text-slate-500">
            <span>Total Brut Livré :</span>
            <span>{formatMGA(receiptData.grossTotal || receiptData.tour.theoretical_total || 0)}</span>
          </div>

          {(receiptData.siegeTotal || 0) > 0 && (
            <div className="flex justify-between text-blue-700 bg-blue-50 px-2 py-1 rounded">
              <span>− Encaissé au Siège (Exclu Livreur) :</span>
              <span className="font-bold">−{formatMGA(receiptData.siegeTotal || 0)}</span>
            </div>
          )}

          <div className="flex justify-between font-bold text-slate-900 border-b border-slate-200 pb-2">
            <span>Net Dû au Quai par le Livreur :</span>
            <span className="text-sm">{formatMGA(receiptData.tour.theoretical_total || 0)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">Espèces Physiques Remises :</span>
            <span className="font-bold">{formatMGA(receiptData.cash)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Preuves Mobile Money Livreur :</span>
            <span>{formatMGA(receiptData.mobile)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Frais Fret / Dépenses Justifiées :</span>
            <span>{formatMGA(receiptData.expenses)}</span>
          </div>
          <div className="border-t-2 border-dashed border-slate-400 pt-2 flex justify-between text-sm font-black">
            <span>Écart de Décharge au Quai :</span>
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
              {formatMGA(receiptData.discrepancy)}
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
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-lg transition"
            data-cy="btn-close-receipt-modal"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
                </div >
              );
  }
