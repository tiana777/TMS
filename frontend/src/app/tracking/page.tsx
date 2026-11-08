"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Truck,
  RotateCcw,
  Search,
  Filter,
  DollarSign,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  Play,
  Share2,
  Building2,
  ArrowRight,
  ShieldCheck,
  User,
  Package,
} from "lucide-react";
import {
  fetchTours,
  fetchTourDetail,
  fetchCouriers,
  fetchParcels,
  updateParcelStatus,
  reassignParcel,
  startTour,
  UpdateParcelStatusPayload,
} from "../../lib/api";

interface Courier {
  id: number;
  name: string;
  phone: string;
  phone_formatted: string;
  vehicle_type: string;
  active: boolean;
}

interface Parcel {
  id: number;
  tracking_number: string;
  reception_date: string;
  vendor_id: number;
  sender_name?: string;
  sender_type?: string;
  sender_phone?: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_phone_formatted: string;
  operator: string;
  delivery_address: string;
  designation?: string;
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
  reschedule_date?: string;
  incident_reason?: string;
  partner_name?: string;
  partner_reference?: string;
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

export default function TrackingPage() {
  const [selectedDate, setSelectedDate] = useState<string>("2026-11-08");
  const [tours, setTours] = useState<Tour[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [selectedTourId, setSelectedTourId] = useState<number | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals state
  const [activeModal, setActiveModal] = useState<"DELIVER" | "RESCHEDULE" | "CANCEL" | "OUTSOURCE" | "REASSIGN" | null>(null);
  const [targetParcel, setTargetParcel] = useState<Parcel | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Role & Reassignment states
  const [currentUserRole, setCurrentUserRole] = useState<string>("SUPERVISEUR");
  const [reassignTargetCourierId, setReassignTargetCourierId] = useState<number | "">("");
  const [reassignReason, setReassignReason] = useState<string>("Panne de moto du livreur initial");

  useEffect(() => {
    const updateRole = () => {
      const saved = localStorage.getItem("tms_user_role") || "SUPERVISEUR";
      setCurrentUserRole(saved);
    };
    updateRole();
    window.addEventListener("tms_role_change", updateRole);
    return () => window.removeEventListener("tms_role_change", updateRole);
  }, []);

  // Form states for modals
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("ESPECES");
  const [rescheduleDate, setRescheduleDate] = useState<string>("2026-11-09");
  const [rescheduleReason, setRescheduleReason] = useState<string>("Client absent au rendez-vous");
  const [customRescheduleReason, setCustomRescheduleReason] = useState<string>("");

  const [cancelReason, setCancelReason] = useState<string>("Refus client : article non conforme");
  const [customCancelReason, setCustomCancelReason] = useState<string>("");

  const [partnerName, setPartnerName] = useState<string>("Cotisse Transport");
  const [partnerReference, setPartnerReference] = useState<string>("");
  const [partnerFee, setPartnerFee] = useState<number>(10000);

  // Load data
  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tList, cList, pList] = await Promise.all([
        fetchTours(selectedDate),
        fetchCouriers(),
        fetchParcels({ date: selectedDate }),
      ]);
      setTours(tList || []);
      setCouriers(cList || []);
      // If we got parcels from API
      setParcels(pList || []);
    } catch (e) {
      console.error("Erreur chargement données pointage", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to get active tour
  const currentTour = useMemo(() => {
    if (selectedTourId === "ALL") return null;
    return tours.find((t) => t.id === selectedTourId) || null;
  }, [tours, selectedTourId]);

  // Filter parcels
  const filteredParcels = useMemo(() => {
    return parcels.filter((p) => {
      // Tour filter
      if (selectedTourId !== "ALL") {
        if (p.tour_id !== selectedTourId) return false;
      }
      // Status filter
      if (statusFilter !== "ALL") {
        if (statusFilter === "IN_PROGRESS") {
          if (!["ASSIGNE", "EN_COURS"].includes(p.status)) return false;
        } else if (p.status !== statusFilter) {
          return false;
        }
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTracking = p.tracking_number.toLowerCase().includes(q);
        const matchRecipient = p.recipient_name.toLowerCase().includes(q);
        const matchPhone = p.recipient_phone.includes(q);
        const matchAddress = p.delivery_address.toLowerCase().includes(q);
        const matchDesignation = (p.designation || "").toLowerCase().includes(q);
        if (!matchTracking && !matchRecipient && !matchPhone && !matchAddress && !matchDesignation) {
          return false;
        }
      }
      return true;
    });
  }, [parcels, selectedTourId, statusFilter, searchQuery]);

  // Statistics calculation
  const stats = useMemo(() => {
    const list = selectedTourId === "ALL" ? parcels : parcels.filter((p) => p.tour_id === selectedTourId);
    const total = list.length;
    const delivered = list.filter((p) => p.status === "LIVRE_ENCAISSE").length;
    const inProgress = list.filter((p) => ["ASSIGNE", "EN_COURS"].includes(p.status)).length;
    const rescheduled = list.filter((p) => p.status === "REPORTE").length;
    const canceled = list.filter((p) => p.status === "ANNULE_RETOUR").length;
    const outsourced = list.filter((p) => p.status === "SOUS_TRAITE").length;

    const collectedCash = list
      .filter((p) => p.status === "LIVRE_ENCAISSE")
      .reduce((sum, p) => sum + (p.total_to_collect || 0), 0);

    const theoreticalCash = list.reduce((sum, p) => sum + (p.total_to_collect || 0), 0);

    const completionRate = total > 0 ? Math.round(((delivered + canceled + outsourced) / total) * 100) : 0;

    return {
      total,
      delivered,
      inProgress,
      rescheduled,
      canceled,
      outsourced,
      collectedCash,
      theoreticalCash,
      completionRate,
    };
  }, [parcels, selectedTourId]);

  // Start tour handler
  const handleStartTour = async (tourId: number) => {
    try {
      setIsSubmitting(true);
      await startTour(tourId);
      setFeedbackMessage({
        type: "success",
        text: `Tournée #${tourId} démarrée avec succès ! Les colis sont passés au statut EN COURS.`,
      });
      await loadData();
    } catch (e: any) {
      setFeedbackMessage({
        type: "error",
        text: e.message || "Erreur lors du démarrage de la tournée.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenReassignModal = (parcel: Parcel) => {
    if (parcel.status === "EN_COURS" && currentUserRole !== "SUPER_ADMIN") {
      setFeedbackMessage({
        type: "error",
        text: "🔒 Action restreinte : Seul le Super Admin est habilité à réassigner d'urgence un colis déjà en cours de livraison.",
      });
      return;
    }
    setTargetParcel(parcel);
    const otherCourier = couriers.find((c) => c.id !== parcel.courier_id);
    setReassignTargetCourierId(otherCourier ? otherCourier.id : "");
    setActiveModal("REASSIGN");
  };

  // Submit Pointage
  const submitPointage = async () => {
    if (!targetParcel || !activeModal) return;

    try {
      setIsSubmitting(true);

      if (activeModal === "REASSIGN") {
        if (!reassignTargetCourierId) {
          throw new Error("Veuillez choisir un coursier cible pour la réassignation.");
        }
        const targetCourier = couriers.find((c) => c.id === Number(reassignTargetCourierId));
        await reassignParcel(targetParcel.id, Number(reassignTargetCourierId), {
          tourDate: selectedDate,
          reason: targetParcel.status === "EN_COURS" ? reassignReason : undefined,
        });

        setFeedbackMessage({
          type: "success",
          text: `Colis BDR-${targetParcel.tracking_number} réassigné avec succès à ${targetCourier?.name || "Livreur"} !`,
        });

        await loadData();
        closeModal();
        return;
      }

      const payload: UpdateParcelStatusPayload = { status: "EN_COURS" };

      if (activeModal === "DELIVER") {
        payload.status = "LIVRE_ENCAISSE";
        payload.payment_method = selectedPaymentMethod;
      } else if (activeModal === "RESCHEDULE") {
        payload.status = "REPORTE";
        payload.reschedule_date = rescheduleDate;
        payload.incident_reason =
          rescheduleReason === "Autre" ? customRescheduleReason.trim() : rescheduleReason;
        if (!payload.incident_reason) {
          throw new Error("Veuillez préciser le motif circonstancié du report.");
        }
      } else if (activeModal === "CANCEL") {
        payload.status = "ANNULE_RETOUR";
        payload.incident_reason =
          cancelReason === "Autre" ? customCancelReason.trim() : cancelReason;
        if (!payload.incident_reason) {
          throw new Error("Veuillez préciser le motif explicite de l'annulation/refus.");
        }
      } else if (activeModal === "OUTSOURCE") {
        payload.status = "SOUS_TRAITE";
        payload.partner_name = partnerName;
        payload.partner_reference = partnerReference.trim();
        payload.partner_fee = Number(partnerFee) || 0;
        if (!payload.partner_reference) {
          throw new Error("Le numéro de récépissé officiel de la coopérative est obligatoire.");
        }
      }

      await updateParcelStatus(targetParcel.id, payload);

      setFeedbackMessage({
        type: "success",
        text: `Pointage validé pour le colis ${targetParcel.tracking_number} (${targetParcel.recipient_name}) !`,
      });

      // Update state locally for immediate snappy feedback
      setParcels((prev) =>
        prev.map((p) =>
          p.id === targetParcel.id
            ? {
                ...p,
                status: payload.status,
                payment_method: payload.payment_method,
                reschedule_date: payload.reschedule_date,
                incident_reason: payload.incident_reason,
                partner_name: payload.partner_name,
                partner_reference: payload.partner_reference,
              }
            : p
        )
      );

      closeModal();
    } catch (e: any) {
      setFeedbackMessage({
        type: "error",
        text: e.message || "Erreur lors du pointage.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setTargetParcel(null);
    setCustomRescheduleReason("");
    setCustomCancelReason("");
    setPartnerReference("");
  };

  // Status badge renderer according to CDC section 9
  const renderStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      EN_DEPOT: { bg: "bg-[#fef3c7]", text: "text-[#78350f]", label: "En Dépôt" },
      ASSIGNE: { bg: "bg-[#e0e7ff]", text: "text-[#1e40af]", label: "Assigné" },
      EN_COURS: { bg: "bg-[#dbeafe]", text: "text-[#0369a1]", label: "En Cours" },
      LIVRE_ENCAISSE: { bg: "bg-[#dcfce7]", text: "text-[#065f46]", label: "Livré & Encaissé" },
      REPORTE: { bg: "bg-[#ffedd5]", text: "text-[#92400e]", label: "Reporté" },
      ANNULE_RETOUR: { bg: "bg-[#ffe4e6]", text: "text-[#991b1b]", label: "Annulé / Retour" },
      SOUS_TRAITE: { bg: "bg-[#f3e8ff]", text: "text-[#6b21a8]", label: "Sous-traité Gare" },
    };

    const s = map[status] || { bg: "bg-slate-100", text: "text-slate-700", label: status };
    return (
      <span
        data-cy={`status-badge-${status.toLowerCase()}`}
        className={`px-2.5 py-1 text-xs font-black rounded-lg border border-black/5 uppercase tracking-wider inline-flex items-center gap-1.5 ${s.bg} ${s.text}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
        {s.label}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Title & Date Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              Écran 05 : Pointage Terrain & Suivi en Direct
            </h2>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Qualification instantanée de l'issue des livraisons, validation des encaissements COD et contrôle FSM strict.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none"
            />
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition shadow flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Actualiser
          </button>
        </div>
      </div>

      {/* Alert / Feedback message */}
      {feedbackMessage && (
        <div
          data-cy="feedback-banner"
          className={`p-4 rounded-xl flex items-center justify-between text-sm font-bold ${
            feedbackMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
              : "bg-rose-50 text-rose-800 border border-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === "success" ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs underline hover:opacity-80"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Tour Selection and Summary Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/20">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Sélection de la Tournée Opérationnelle
              </p>
              <div className="flex items-center gap-3 mt-1">
                <select
                  data-cy="tour-selector"
                  value={selectedTourId}
                  onChange={(e) =>
                    setSelectedTourId(e.target.value === "ALL" ? "ALL" : Number(e.target.value))
                  }
                  className="bg-slate-800 border border-slate-700 text-white font-bold text-base rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">🌐 Toutes les Tournées ({tours.length} tournées)</option>
                  {tours.map((t) => (
                    <option key={t.id} value={t.id}>
                      Tournée #{t.id} — {t.courier_name || `Livreur ${t.courier_id}`} (
                      {t.status === "ASSIGNE" ? "Assignée (En quai)" : t.status === "EN_COURS" ? "En Course" : t.status})
                    </option>
                  ))}
                </select>

                {currentTour && currentTour.status === "ASSIGNE" && (
                  <button
                    data-cy="btn-start-tour"
                    onClick={() => handleStartTour(currentTour.id)}
                    disabled={isSubmitting}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 font-black text-xs uppercase tracking-wider rounded-xl transition shadow flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Lancer la Tournée (Départ Quai)
                  </button>
                )}
              </div>
            </div>
          </div>

          {currentTour && (
            <div className="flex items-center gap-4 text-xs text-slate-300 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-white">{currentTour.courier_name}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>{currentTour.courier_phone_formatted || currentTour.courier_phone}</span>
              </div>
              <span>•</span>
              <span className="px-2 py-0.5 rounded bg-slate-700 font-medium">
                {currentTour.courier_vehicle}
              </span>
            </div>
          )}
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-800">
            <p className="text-xs font-semibold text-slate-400">Total Colis</p>
            <p className="text-2xl font-black text-white mt-1">{stats.total}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              {stats.inProgress} en cours de livraison
            </p>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-800">
            <p className="text-xs font-semibold text-slate-400">Taux d'Achèvement</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{stats.completionRate} %</p>
            <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-800">
            <p className="text-xs font-semibold text-slate-400">Montant Encaissé</p>
            <p className="text-2xl font-black text-amber-400 mt-1">
              {stats.collectedCash.toLocaleString()} Ar
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              sur {stats.theoreticalCash.toLocaleString()} Ar attendus
            </p>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-800">
            <p className="text-xs font-semibold text-slate-400">Répartition Statuts</p>
            <div className="flex items-center gap-2 mt-2 text-xs font-bold">
              <span className="text-emerald-400">✓ {stats.delivered}</span>
              <span className="text-amber-400">⏳ {stats.rescheduled}</span>
              <span className="text-rose-400">✕ {stats.canceled}</span>
              <span className="text-purple-400">📦 {stats.outsourced}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { id: "ALL", label: "Tous les Colis" },
            { id: "IN_PROGRESS", label: "En Distribution" },
            { id: "LIVRE_ENCAISSE", label: "Livrés" },
            { id: "REPORTE", label: "Reportés" },
            { id: "ANNULE_RETOUR", label: "Refus / Annulés" },
            { id: "SOUS_TRAITE", label: "Sous-traités Gare" },
          ].map((tab) => (
            <button
              key={tab.id}
              data-cy={`tab-${tab.id.toLowerCase()}`}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                statusFilter === tab.id
                  ? "bg-slate-900 text-white shadow"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            data-cy="search-parcels"
            type="text"
            placeholder="N° BDR, Destinataire, Tél..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs font-medium border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
          />
        </div>
      </div>

      {/* Parcels List with Rapid Pointage Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-600" />
            <h3 className="font-bold text-sm text-slate-800">
              Colis de la tournée ({filteredParcels.length} affichés)
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Actions disponibles pour les colis au statut Assigné ou En Cours
          </p>
        </div>

        {filteredParcels.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="font-bold text-sm">Aucun colis ne correspond à ce filtre.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredParcels.map((parcel) => {
              const isActionable = ["ASSIGNE", "EN_COURS"].includes(parcel.status);

              return (
                <div
                  key={parcel.id}
                  data-cy={`parcel-row-${parcel.id}`}
                  className="p-5 hover:bg-slate-50/70 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Left Column: BDR & Customer Info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-black text-sm px-2.5 py-0.5 rounded-lg bg-slate-900 text-white font-mono shadow-sm">
                        BDR-{parcel.tracking_number}
                      </span>
                      {renderStatusBadge(parcel.status)}
                      <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        {parcel.axis_label?.split("(")[0]?.trim() || parcel.axis}
                      </span>
                      <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                        {parcel.flux_type}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 text-sm text-slate-800">
                      <span className="font-bold">{parcel.recipient_name}</span>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-mono font-medium">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {parcel.recipient_phone_formatted || parcel.recipient_phone}
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 ml-1">
                          {parcel.operator}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-start gap-1.5 text-xs text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <span className="break-words max-w-xl">{parcel.delivery_address}</span>
                    </div>

                    {parcel.designation && (
                      <p className="text-xs text-slate-500 italic">
                        Marchandise : {parcel.designation}
                      </p>
                    )}

                    {/* Operational notes if any */}
                    {parcel.reschedule_date && (
                      <p className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 inline-block">
                        🗓️ Reporté au {parcel.reschedule_date} • Motif : {parcel.incident_reason}
                      </p>
                    )}
                    {parcel.status === "ANNULE_RETOUR" && parcel.incident_reason && (
                      <p className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 inline-block">
                        ✕ Motif annulation : {parcel.incident_reason}
                      </p>
                    )}
                    {parcel.status === "SOUS_TRAITE" && (
                      <p className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 inline-block">
                        🏢 Gare / Coopérative : {parcel.partner_name} • Récépissé :{" "}
                        {parcel.partner_reference} ({parcel.partner_fee?.toLocaleString()} Ar frais)
                      </p>
                    )}
                    {parcel.payment_method && (
                      <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block">
                        ✓ Encaissé via {parcel.payment_method}
                      </p>
                    )}
                  </div>

                  {/* Middle Column: Financial Amount */}
                  <div className="text-left lg:text-right shrink-0 bg-slate-50 p-3 rounded-xl border border-slate-100 lg:bg-transparent lg:p-0 lg:border-none">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Montant à Recouvrer
                    </p>
                    <p className="text-lg font-black text-slate-900 mt-0.5">
                      {parcel.total_to_collect?.toLocaleString()} Ar
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Marchandise : {parcel.merchandise_amount?.toLocaleString()} Ar • Port :{" "}
                      {parcel.delivery_fee?.toLocaleString()} Ar
                    </p>
                  </div>

                  {/* Right Column: Rapid Pointage Buttons */}
                  <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap shrink-0">
                    {isActionable ? (
                      <>
                        <button
                          data-cy={`btn-deliver-${parcel.id}`}
                          onClick={() => {
                            setTargetParcel(parcel);
                            setActiveModal("DELIVER");
                          }}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Livré & Encaissé
                        </button>

                        <button
                          data-cy={`btn-reschedule-${parcel.id}`}
                          onClick={() => {
                            setTargetParcel(parcel);
                            setActiveModal("RESCHEDULE");
                          }}
                          className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Reporter
                        </button>

                        <button
                          data-cy={`btn-cancel-${parcel.id}`}
                          onClick={() => {
                            setTargetParcel(parcel);
                            setActiveModal("CANCEL");
                          }}
                          className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          Refus
                        </button>

                        {parcel.flux_type === "PROVINCE" && (
                          <button
                            data-cy={`btn-outsource-${parcel.id}`}
                            onClick={() => {
                              setTargetParcel(parcel);
                              setActiveModal("OUTSOURCE");
                            }}
                            className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                          >
                            <Building2 className="w-3.5 h-3.5 text-purple-600" />
                            Gare
                          </button>
                        )}

                        <button
                          data-cy={`btn-reassign-${parcel.id}`}
                          onClick={() => handleOpenReassignModal(parcel)}
                          className={`px-3 py-2 border font-bold text-xs rounded-xl transition flex items-center gap-1.5 ${
                            parcel.status === "EN_COURS"
                              ? currentUserRole === "SUPER_ADMIN"
                                ? "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300"
                                : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                              : "bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-300"
                          }`}
                          title={
                            parcel.status === "EN_COURS"
                              ? currentUserRole === "SUPER_ADMIN"
                                ? "👑 Réassignation d'urgence (Super Admin)"
                                : "🔒 Réservé au Super Admin pour les colis en cours"
                              : "Réassigner à un autre coursier"
                          }
                        >
                          <Truck className="w-3.5 h-3.5 text-blue-600" />
                          {parcel.status === "EN_COURS" && currentUserRole === "SUPER_ADMIN" ? "👑 Urgence" : "Réassigner"}
                        </button>
                      </>
                    ) : (
                      <span className="text-xs font-bold text-slate-400 italic px-2 py-1">
                        Pointage clôturé
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= MODAL 1: LIVRAISON & ENCAISSEMENT ================= */}
      {activeModal === "DELIVER" && targetParcel && (
        <div
          data-cy="modal-deliver"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-800">Validation de Livraison</h3>
                <p className="text-xs text-slate-500">
                  Colis BDR-{targetParcel.tracking_number} • {targetParcel.recipient_name}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1 text-center">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Montant Total à Encaisser
              </p>
              <p className="text-3xl font-black text-emerald-600">
                {targetParcel.total_to_collect?.toLocaleString()} Ar
              </p>
              <p className="text-[11px] text-slate-500">
                (Marchandise COD : {targetParcel.merchandise_amount?.toLocaleString()} Ar +
                Livraison : {targetParcel.delivery_fee?.toLocaleString()} Ar)
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                Mode de Règlement Utilisé (Obligatoire)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "ESPECES", label: "💵 Espèces Physiques" },
                  { id: "MVOLA", label: "📱 Telma MVola" },
                  { id: "AIRTEL", label: "📱 Airtel Money" },
                  { id: "ORANGE_MONEY", label: "📱 Orange Money" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    data-cy={`payment-method-${m.id.toLowerCase()}`}
                    onClick={() => setSelectedPaymentMethod(m.id)}
                    className={`p-3 text-xs font-bold rounded-xl border transition text-left ${
                      selectedPaymentMethod === m.id
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 font-bold text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Annuler
              </button>
              <button
                data-cy="btn-confirm-deliver"
                type="button"
                onClick={submitPointage}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirmer l'Encaissement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: REPORT ================= */}
      {activeModal === "RESCHEDULE" && targetParcel && (
        <div
          data-cy="modal-reschedule"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-800">Signaler un Report de Livraison</h3>
                <p className="text-xs text-slate-500">
                  Colis BDR-{targetParcel.tracking_number} • {targetParcel.recipient_name}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">
                  Date de Reprogrammation (Obligatoire YYYY-MM-DD)
                </label>
                <input
                  data-cy="reschedule-date-input"
                  type="date"
                  value={rescheduleDate}
                  min={selectedDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">
                  Motif Circonstancié (Obligatoire)
                </label>
                <select
                  data-cy="reschedule-reason-select"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 bg-white"
                >
                  <option value="Client absent au rendez-vous">Client absent au rendez-vous</option>
                  <option value="Client injoignable après 3 appels">Client injoignable après 3 appels</option>
                  <option value="Demande expresse du client (report de date)">Demande expresse du client (report de date)</option>
                  <option value="Adresse inaccessible temporairement">Adresse inaccessible temporairement</option>
                  <option value="Fonds indisponibles au moment du passage">Fonds indisponibles au moment du passage</option>
                  <option value="Autre">Autre motif circonstancié...</option>
                </select>

                {rescheduleReason === "Autre" && (
                  <input
                    data-cy="reschedule-custom-reason"
                    type="text"
                    placeholder="Précisez le motif du report..."
                    value={customRescheduleReason}
                    onChange={(e) => setCustomRescheduleReason(e.target.value)}
                    className="w-full mt-2 px-3 py-2 text-xs border border-amber-300 rounded-xl focus:outline-none focus:border-amber-500"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 font-bold text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Annuler
              </button>
              <button
                data-cy="btn-confirm-reschedule"
                type="button"
                onClick={submitPointage}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center gap-1.5"
              >
                <Clock className="w-4 h-4" />
                Valider le Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: REFUS / ANNULATION ================= */}
      {activeModal === "CANCEL" && targetParcel && (
        <div
          data-cy="modal-cancel"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-xl">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-800">Signaler un Refus ou Annulation</h3>
                <p className="text-xs text-slate-500">
                  Colis BDR-{targetParcel.tracking_number} • {targetParcel.recipient_name}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">
                  Motif Circonstancié du Refus (Obligatoire)
                </label>
                <select
                  data-cy="cancel-reason-select"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:outline-none focus:border-rose-500 bg-white"
                >
                  <option value="Refus client : article non conforme">Refus client : article non conforme</option>
                  <option value="Refus client : emballage endommagé">Refus client : emballage endommagé</option>
                  <option value="Client a annulé la commande">Client a annulé la commande</option>
                  <option value="Refus du client de régler le montant COD">Refus du client de régler le montant COD</option>
                  <option value="Numéro faux ou destinataire inconnu">Numéro faux ou destinataire inconnu</option>
                  <option value="Autre">Autre motif explicite...</option>
                </select>

                {cancelReason === "Autre" && (
                  <input
                    data-cy="cancel-custom-reason"
                    type="text"
                    placeholder="Précisez le motif du refus..."
                    value={customCancelReason}
                    onChange={(e) => setCustomCancelReason(e.target.value)}
                    className="w-full mt-2 px-3 py-2 text-xs border border-rose-300 rounded-xl focus:outline-none focus:border-rose-500"
                  />
                )}
              </div>
              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                Le colis passera au statut <strong>ANNULE_RETOUR</strong> et devra être restitué au quai
                pour retour physique au donneur d'ordre.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 font-bold text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Annuler
              </button>
              <button
                data-cy="btn-confirm-cancel"
                type="button"
                onClick={submitPointage}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                Confirmer le Refus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: SOUS-TRAITANCE GARE ================= */}
      {activeModal === "OUTSOURCE" && targetParcel && (
        <div
          data-cy="modal-outsource"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-800">Dépôt en Gare Routière</h3>
                <p className="text-xs text-slate-500">
                  Colis BDR-{targetParcel.tracking_number} • Expédition Province
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">
                  Nom de la Coopérative de Transport
                </label>
                <select
                  data-cy="outsource-partner-select"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:outline-none focus:border-purple-500 bg-white"
                >
                  <option value="Cotisse Transport">Cotisse Transport (Gare Ambodivona)</option>
                  <option value="Kofmad">Kofmad (Gare Fasan'ny Karana)</option>
                  <option value="Besady Plus">Besady Plus (Gare Andohatapenaka)</option>
                  <option value="Trans Texpress">Trans Texpress (Gare Ambodivona)</option>
                  <option value="Sonatra">Sonatra (Gare Fasan'ny Karana)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">
                  Numéro de Récépissé Officiel (Obligatoire)
                </label>
                <input
                  data-cy="outsource-ref-input"
                  type="text"
                  placeholder="Ex: COT-88291"
                  value={partnerReference}
                  onChange={(e) => setPartnerReference(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">
                  Frais de Fret Payés en Gare (Ariary)
                </label>
                <input
                  data-cy="outsource-fee-input"
                  type="number"
                  step="500"
                  value={partnerFee}
                  onChange={(e) => setPartnerFee(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 font-bold text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Annuler
              </button>
              <button
                data-cy="btn-confirm-outsource"
                type="button"
                onClick={submitPointage}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center gap-1.5"
              >
                <Building2 className="w-4 h-4" />
                Valider la Sous-Traitance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 5: RÉASSIGNATION ================= */}
      {activeModal === "REASSIGN" && targetParcel && (
        <div
          data-cy="modal-reassign"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-800">
                  {targetParcel.status === "EN_COURS"
                    ? "👑 Réassignation d'Urgence Terrain (Super Admin)"
                    : "Réassignation de Colis"}
                </h3>
                <p className="text-xs text-slate-500">
                  Colis BDR-{targetParcel.tracking_number} • {targetParcel.recipient_name}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1 text-xs">
              <p className="text-slate-600">
                <strong>Destinataire :</strong> {targetParcel.recipient_name} (
                {targetParcel.recipient_phone_formatted || targetParcel.recipient_phone})
              </p>
              <p className="text-slate-600 truncate">
                <strong>Adresse :</strong> {targetParcel.delivery_address}
              </p>
              <p className="text-slate-600">
                <strong>Statut actuel :</strong>{" "}
                <span className="font-bold text-blue-700">{targetParcel.status}</span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                Nouveau Coursier / Navette d'Affectation
              </label>
              <select
                data-cy="reassign-courier-select"
                value={reassignTargetCourierId}
                onChange={(e) => setReassignTargetCourierId(Number(e.target.value))}
                className="w-full px-3 py-2.5 text-xs font-bold border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="">-- Choisir un coursier --</option>
                {couriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.vehicle_type})
                  </option>
                ))}
              </select>
            </div>

            {targetParcel.status === "EN_COURS" && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Motif Circonstancié d'Urgence (Obligatoire)
                </label>
                <input
                  data-cy="reassign-reason-input"
                  type="text"
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="Ex: Panne de moto, accident, renfort quai..."
                  className="w-full px-3 py-2 text-xs border border-amber-300 rounded-xl focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 font-bold text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Annuler
              </button>
              <button
                data-cy="btn-confirm-reassign"
                type="button"
                onClick={submitPointage}
                disabled={isSubmitting || !reassignTargetCourierId}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center gap-1.5"
              >
                <Truck className="w-4 h-4" />
                Confirmer la Réassignation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
