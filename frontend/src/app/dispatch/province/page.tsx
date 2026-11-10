"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Truck,
  Package,
  Calendar,
  CheckCircle,
  Clock,
  Printer,
  MessageSquare,
  AlertCircle,
  AlertTriangle,
  Search,
  Filter,
  CheckSquare,
  Square,
  ArrowRight,
  Play,
  RotateCcw,
  Sparkles,
  MapPin,
  Building2,
  User,
  ShoppingBag,
} from "lucide-react";
import { AxisBadge } from "@/components/AxisBadge";
import { OperatorBadge } from "@/components/OperatorBadge";
import { ThermalTicket80mm } from "@/components/ThermalTicket80mm";
import { WhatsAppModal } from "@/components/WhatsAppModal";
import {
  fetchCouriers,
  fetchParcels,
  fetchTours,
  fetchTourDetail,
  createOrAssignTour,
  reassignParcel,
  unassignParcelFromTour,
  startTour,
  overrideParcelAxis,
  updateCourierCapacity,
} from "@/lib/api";
import { Courier, LogisticAxis, Parcel, Tour } from "@/types";

const GARE_FILTERS = [
  { id: "ALL", label: "Toutes les Gares", short: "Toutes Gares" },
  { id: "Ambodivona", label: "Gare Ambodivona (RN2 Est)", short: "Ambodivona" },
  { id: "Fasan'ny Karana", label: "Gare Fasan'ny Karana (RN7 Sud)", short: "Fasan'ny Karana" },
  { id: "Andohatapenaka", label: "Gare Andohatapenaka (RN4 Ouest)", short: "Andohatapenaka" },
];

export default function DispatchProvincePage() {
  const [activeTab, setActiveTab] = useState<"dispatch" | "roadmaps">("dispatch");
  const [selectedDate, setSelectedDate] = useState<string>("2026-11-08");

  // Master data
  const [couriers, setCouriers] = useState<Courier[]>([]);

  // Dispatch state (Écran 03B Province)
  const [stockParcels, setStockParcels] = useState<Parcel[]>([]);
  const [selectedGare, setSelectedGare] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedParcelIds, setSelectedParcelIds] = useState<number[]>([]);
  const [assignedCourierId, setAssignedCourierId] = useState<number | "">("");
  const [courierCapacityInput, setCourierCapacityInput] = useState<number>(30);
  const [isUpdatingCapacity, setIsUpdatingCapacity] = useState<boolean>(false);
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [assignSuccessMessage, setAssignSuccessMessage] = useState<string | null>(null);

  // Roadmaps state (Écran 04 Province)
  const [tours, setTours] = useState<Tour[]>([]);
  const [selectedTourId, setSelectedTourId] = useState<number | null>(null);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [isLoadingTourDetail, setIsLoadingTourDetail] = useState<boolean>(false);

  // Modals
  const [showThermalTicket, setShowThermalTicket] = useState<boolean>(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);

  // Pagination state (Écran 03B) - 10 lignes max par page
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 10;

  // Reassignment & Role state
  const [currentUserRole, setCurrentUserRole] = useState<string>("SUPERVISEUR");
  const [reassigningParcel, setReassigningParcel] = useState<Parcel | null>(null);
  const [reassignTargetCourierId, setReassignTargetCourierId] = useState<number | "">("");
  const [reassignReason, setReassignReason] = useState<string>("Panne de moto du livreur initial");
  const [isReassigning, setIsReassigning] = useState<boolean>(false);
  const [reassignFeedback, setReassignFeedback] = useState<string | null>(null);

  // Axis modification state (CDC 5.2)
  const [editingAxisParcel, setEditingAxisParcel] = useState<Parcel | null>(null);
  const [targetAxis, setTargetAxis] = useState<LogisticAxis>("AXE_PROVINCE");
  const [isSavingAxis, setIsSavingAxis] = useState<boolean>(false);
  const [axisFeedback, setAxisFeedback] = useState<string | null>(null);

  // Couriers: Mutualized pool across all axes - couriers are NOT assigned to axes directly.
  // The supervisor manually selects any active courier for any delivery.
  const availableCouriers = couriers.filter((c) => c.active !== false);

  const selectedCourier = availableCouriers.find((c) => c.id === Number(assignedCourierId)) || couriers.find((c) => c.id === Number(assignedCourierId));
  const courierCapacity = selectedCourier ? Math.min(selectedCourier.max_parcels || 30, 30) : 30;
  const isOverCapacity = selectedParcelIds.length > courierCapacity;
  const isSurchargeOver30 = selectedParcelIds.length > 30;
  const isSurcharge = isOverCapacity || isSurchargeOver30;

  useEffect(() => {
    if (selectedCourier) {
      setCourierCapacityInput(selectedCourier.max_parcels || 30);
    }
  }, [selectedCourier]);

  const loadData = async () => {
    try {
      const couriersList = await fetchCouriers();
      setCouriers(couriersList);
      if (couriersList.length > 0 && assignedCourierId === "") {
        setAssignedCourierId(couriersList[0].id);
      }
    } catch (e) {
      console.error("Error loading couriers", e);
    }
  };

  const loadStockParcels = async () => {
    try {
      const parcels = await fetchParcels({ status: "EN_DEPOT" });
      setStockParcels(parcels);
    } catch (e) {
      console.error("Error loading stock parcels", e);
    }
  };

  const loadTours = async () => {
    try {
      const toursList = await fetchTours(selectedDate);
      setTours(toursList);
      if (toursList.length > 0 && selectedTourId === null) {
        setSelectedTourId(toursList[0].id);
        loadTourDetail(toursList[0].id);
      }
    } catch (e) {
      console.error("Error loading tours", e);
    }
  };

  const loadTourDetail = async (tourId: number) => {
    setIsLoadingTourDetail(true);
    try {
      const detail = await fetchTourDetail(tourId);
      setSelectedTour(detail);
    } catch (e) {
      console.error("Error loading tour detail", e);
    } finally {
      setIsLoadingTourDetail(false);
    }
  };

  useEffect(() => {
    loadData();
    loadStockParcels();
  }, []);

  useEffect(() => {
    loadTours();
  }, [selectedDate]);

  useEffect(() => {
    setSelectedParcelIds([]);
    setCurrentPage(1);
  }, [selectedGare, searchQuery]);

  // Strictly province parcels
  const provinceParcels = stockParcels.filter(
    (p) => p.axis === "AXE_PROVINCE" || p.flux_type === "PROVINCE" || (p.axis && p.axis.startsWith("AXE_PROV"))
  );

  const filteredParcels = provinceParcels.filter((p) => {
    if (selectedGare !== "ALL") {
      const textToSearch = `${p.delivery_address} ${p.axis_label}`.toLowerCase();
      if (!textToSearch.includes(selectedGare.toLowerCase())) return false;
    }
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchBDR = p.tracking_number.toLowerCase().includes(q);
      const matchClient = p.recipient_name.toLowerCase().includes(q);
      const matchPhone = p.recipient_phone.includes(q);
      const matchAddress = p.delivery_address.toLowerCase().includes(q);
      const matchSender = p.sender_name?.toLowerCase().includes(q);
      const matchItem = p.designation?.toLowerCase().includes(q);
      if (!matchBDR && !matchClient && !matchPhone && !matchAddress && !matchSender && !matchItem) {
        return false;
      }
    }
    return true;
  });

  // Pagination calculations (10 lignes max par page)
  const totalPages = Math.max(1, Math.ceil(filteredParcels.length / ITEMS_PER_PAGE));
  const paginatedParcels = filteredParcels.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleToggleSelectCurrentPage = () => {
    const pageIds = paginatedParcels.map((p) => p.id);
    const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedParcelIds.includes(id));
    if (allPageSelected) {
      setSelectedParcelIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedParcelIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const totalStockCount = provinceParcels.length;
  const totalStockCOD = provinceParcels.reduce((sum, p) => sum + p.total_to_collect, 0);

  const handleToggleSelectParcel = (id: number) => {
    setSelectedParcelIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredParcels.map((p) => p.id);
    const allSelected = visibleIds.every((id) => selectedParcelIds.includes(id));
    if (allSelected) {
      setSelectedParcelIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedParcelIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleSaveCapacity = async () => {
    if (!selectedCourier || courierCapacityInput <= 0) return;
    if (courierCapacityInput > 30) {
      alert("Surcharge interdite : un livreur ne peut pas transporter plus de 30 colis.");
      return;
    }
    setIsUpdatingCapacity(true);
    try {
      await updateCourierCapacity(selectedCourier.id, courierCapacityInput);
      setCouriers((prev) =>
        prev.map((c) =>
          c.id === selectedCourier.id ? { ...c, max_parcels: courierCapacityInput } : c
        )
      );
    } catch (err: any) {
      alert(err.message || "Erreur lors de la mise à jour de la capacité.");
    } finally {
      setIsUpdatingCapacity(false);
    }
  };

  const handleAssignToTour = async () => {
    if (selectedParcelIds.length === 0 || !assignedCourierId || isSurcharge) return;
    setIsAssigning(true);
    try {
      const res = await createOrAssignTour(Number(assignedCourierId), selectedDate, selectedParcelIds);
      setAssignSuccessMessage(
        `${selectedParcelIds.length} colis assigné(s) avec succès au livreur pour la tournée #${res.id} !`
      );
      setSelectedParcelIds([]);
      await loadStockParcels();
      await loadTours();
      setTimeout(() => setAssignSuccessMessage(null), 5000);
    } catch (e: any) {
      alert(e.message || "Erreur lors de l'assignation de la tournée.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleSelectTour = (tourId: number) => {
    setSelectedTourId(tourId);
    loadTourDetail(tourId);
  };

  const handleStartTour = async (tourId: number) => {
    try {
      await startTour(tourId);
      await loadTours();
      await loadTourDetail(tourId);
    } catch (e: any) {
      alert(e.message || "Erreur lors du démarrage de la tournée.");
    }
  };

  const handleUnassign = async (tourId: number, parcelId: number) => {
    try {
      await unassignParcelFromTour(tourId, parcelId);
      await loadTours();
      await loadTourDetail(tourId);
      await loadStockParcels();
    } catch (e: any) {
      alert(e.message || "Erreur lors de la désassignation.");
    }
  };

  const handleConfirmReassign = async () => {
    if (!reassigningParcel || !reassignTargetCourierId) return;
    setIsReassigning(true);
    try {
      await reassignParcel(
        reassigningParcel.id,
        Number(reassignTargetCourierId),
        { tourDate: selectedDate, reason: reassignReason }
      );
      setReassignFeedback(
        `Colis BDR-${reassigningParcel.tracking_number} réassigné avec succès au coursier #${reassignTargetCourierId} !`
      );
      setReassigningParcel(null);
      await loadTours();
      if (selectedTourId) await loadTourDetail(selectedTourId);
      setTimeout(() => setReassignFeedback(null), 5000);
    } catch (e: any) {
      alert(e.message || "Erreur lors de la réassignation.");
    } finally {
      setIsReassigning(false);
    }
  };

  const handleConfirmOverrideAxis = async () => {
    if (!editingAxisParcel) return;
    setIsSavingAxis(true);
    try {
      await overrideParcelAxis(editingAxisParcel.id, targetAxis);
      setAxisFeedback(
        `Axe du colis BDR-${editingAxisParcel.tracking_number} modifié avec succès vers ${targetAxis} !`
      );
      setEditingAxisParcel(null);
      await loadStockParcels();
      setTimeout(() => setAxisFeedback(null), 4000);
    } catch (e: any) {
      alert(e.message || "Erreur lors de la modification de l'axe.");
    } finally {
      setIsSavingAxis(false);
    }
  };

  const selectedParcelsTotal = stockParcels
    .filter((p) => selectedParcelIds.includes(p.id))
    .reduce((sum, p) => sum + p.total_to_collect, 0);

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* SÉPARATION STRICTE : BANDEAU NAVIGATION VILLE VS PROVINCE                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-white border border-slate-200 rounded-xl shadow-xs">
        <Link
          href="/dispatch"
          data-cy="nav-dispatch-urban"
          className="py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
        >
          <span>🛵 1. LIVRAISON EN VILLE (URBAIN • 7 CORRIDORS)</span>
        </Link>
        <Link
          href="/dispatch/province"
          data-cy="nav-dispatch-province"
          className="py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all bg-purple-600 text-white shadow-xs border border-purple-600"
        >
          <span>🚌 2. EXPÉDITIONS PROVINCE (GARES ROUTIÈRES)</span>
        </Link>
      </div>

      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-purple-600" />
              03B. Dispatching Régional — Expéditions Province
            </h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded">
              Écran 03B • Gares Routières
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestion exclusive des dépôts en gares routières d&apos;Antananarivo (Ambodivona, Fasan&apos;ny Karana, Andohatapenaka).
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs text-slate-800 font-medium focus:outline-none cursor-pointer"
            />
          </div>
          <button
            onClick={() => {
              loadStockParcels();
              loadTours();
            }}
            className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-lg transition-colors border border-slate-200 shadow-xs"
            title="Rafraîchir"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Screen Mode Tabs (Écran 03B vs Écran 04) */}
      <div className="flex border-b border-slate-200 bg-slate-100/80 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab("dispatch")}
          data-cy="tab-dispatch"
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === "dispatch"
              ? "bg-white text-purple-700 shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Package className="w-3.5 h-3.5 text-purple-600" />
          <span>Écran 03B • Dépôts Gares en Attente</span>
          <span className="ml-1 px-1.5 py-0.2 text-[10px] font-semibold rounded bg-purple-50 text-purple-700 border border-purple-200/60">
            {totalStockCount} en stock
          </span>
        </button>

        <button
          onClick={() => setActiveTab("roadmaps")}
          data-cy="tab-roadmaps"
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === "roadmaps"
              ? "bg-white text-purple-700 shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Printer className="w-3.5 h-3.5 text-slate-500" />
          <span>Écran 04 • Feuilles de Route Gares</span>
          <span className="ml-1 px-1.5 py-0.2 text-[10px] font-semibold rounded bg-slate-200 text-slate-700">
            {tours.length} tournées
          </span>
        </button>
      </div>

      {/* SUCCESS NOTIFICATION TOAST */}
      {assignSuccessMessage && (
        <div
          data-cy="assign-success-banner"
          className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between shadow-xs text-xs font-medium"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{assignSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActiveTab("roadmaps")}
            className="text-xs font-semibold text-emerald-700 underline hover:text-emerald-900 ml-4 flex items-center gap-1"
          >
            <span>Voir les feuilles de route</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* AXIS FEEDBACK */}
      {axisFeedback && (
        <div
          data-cy="axis-feedback-banner"
          className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between shadow-xs text-xs font-medium"
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{axisFeedback}</span>
          </div>
          <button onClick={() => setAxisFeedback(null)} className="text-slate-500 hover:text-slate-800 text-xs underline">
            Fermer
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: ÉCRAN 03B - STOCK PROVINCE & ATTRIBUTION                           */}
      {/* ========================================================================= */}
      {activeTab === "dispatch" && (
        <div className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 border-l-4 border-l-purple-500 p-3 rounded-xl shadow-xs">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Colis Province en Stock</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-base sm:text-lg font-bold text-purple-700 tabular-nums">{totalStockCount}</span>
                <span className="text-[11px] text-slate-400">dépôt coopératives</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 border-l-4 border-l-emerald-500 p-3 rounded-xl shadow-xs">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total COD Province</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-base sm:text-lg font-bold text-emerald-700 font-mono tabular-nums">
                  {totalStockCOD.toLocaleString("fr-FR")} Ar
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 border-l-4 border-l-blue-500 p-3 rounded-xl shadow-xs">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Livreurs Disponibles</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-base sm:text-lg font-bold text-blue-700 tabular-nums">{couriers.length}</span>
                <span className="text-[11px] text-slate-400">pour liaisons gares</span>
              </div>
            </div>
          </div>

          {/* BARRE DE CONTRÔLE STICKY (Gares, Affectation Rapide, Recherche) */}
          <div
            data-cy="sticky-dispatch-controls"
            className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md pt-2 pb-3 space-y-2.5 border-b border-slate-200/80 -mx-4 px-4 sm:-mx-8 sm:px-8 shadow-xs"
          >
            {/* Gare Filter Pills */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  Gares Routières de Correspondance :
                </span>
                <span className="text-xs text-slate-500">
                  {filteredParcels.length} colis affiché(s)
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {GARE_FILTERS.map((g) => {
                  const isSelected = selectedGare === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGare(g.id)}
                      data-cy={`gare-filter-${g.id}`}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                        isSelected
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs font-semibold"
                          : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs"
                      }`}
                    >
                      {g.short}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Assignment Toolbar */}
            <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Selection actions */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleSelectAllVisible}
                  data-cy="select-all-btn"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors border border-slate-200"
                >
                  {filteredParcels.length > 0 &&
                  filteredParcels.every((p) => selectedParcelIds.includes(p.id)) ? (
                    <CheckSquare className="w-3.5 h-3.5 text-purple-600" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>Tout sélectionner ({filteredParcels.length})</span>
                </button>

                <div className="text-xs">
                  <span className="font-semibold text-slate-800" data-cy="selected-count">
                    {selectedParcelIds.length} sélectionné(s)
                  </span>
                  {selectedParcelIds.length > 0 && (
                    <span className="text-emerald-700 ml-2 font-semibold">
                      • COD : {selectedParcelsTotal.toLocaleString("fr-FR")} Ar
                    </span>
                  )}
                </div>
              </div>

              {/* Courier Selection & Parametric Capacity */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 font-medium">Affecter au livreur :</span>
                  <select
                    value={assignedCourierId}
                    onChange={(e) => setAssignedCourierId(Number(e.target.value))}
                    data-cy="select-courier"
                    className="bg-white border border-slate-300 text-slate-900 text-xs font-medium px-2.5 py-1.5 rounded-lg focus:border-purple-500 focus:outline-none"
                  >
                    {availableCouriers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.vehicle_type} - {c.phone_formatted}){c.assigned_axis ? ` [${c.assigned_axis}]` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Courier Capacity Indicator & Configurator */}
                {selectedCourier && (
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <span className="text-slate-500 font-medium">Capacité :</span>
                    <span
                      data-cy="courier-capacity-display"
                      className={`font-mono font-bold ${
                        isSurcharge ? "text-red-600" : "text-emerald-600"
                      }`}
                    >
                      {selectedParcelIds.length} / {courierCapacity} max
                    </span>
                    <div className="flex items-center gap-1 ml-1.5 border-l border-slate-200 pl-1.5">
                      <span className="text-[10px] text-slate-500">Plafond (max 30):</span>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        data-cy="input-courier-capacity"
                        value={courierCapacityInput}
                        onChange={(e) => setCourierCapacityInput(Number(e.target.value))}
                        className="w-12 px-1 py-0.5 text-center font-mono font-semibold text-xs bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-purple-500"
                      />
                      <button
                        type="button"
                        data-cy="btn-update-capacity"
                        onClick={handleSaveCapacity}
                        disabled={isUpdatingCapacity}
                        className="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-[10px] font-bold"
                      >
                        {isUpdatingCapacity ? "..." : "OK"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Assign button */}
                <button
                  onClick={handleAssignToTour}
                  disabled={selectedParcelIds.length === 0 || !assignedCourierId || isAssigning || isSurcharge}
                  data-cy="assign-tour-btn"
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all shadow-xs ${
                    selectedParcelIds.length > 0 && assignedCourierId && !isAssigning && !isSurcharge
                      ? "bg-purple-600 hover:bg-purple-500 text-white cursor-pointer"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {isAssigning
                      ? "Assignation..."
                      : isSurcharge
                      ? `Capacité dépassée (${selectedParcelIds.length}/${courierCapacity})`
                      : `Assigner (${selectedParcelIds.length} colis)`}
                  </span>
                </button>
              </div>
            </div>

            {/* Capacity Overload Warning Alert */}
            {isSurcharge && (
              <div
                data-cy="capacity-warning-banner"
                className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2 shadow-xs"
              >
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  {isSurchargeOver30
                    ? `🚨 Surcharge stricte : un livreur ne peut transporter que 30 colis au maximum (${selectedParcelIds.length} sélectionnés). Veuillez réduire le lot.`
                    : `Capacité maximale dépassée : le livreur ${selectedCourier?.name} ne peut prendre que ${courierCapacity} colis maximum (${selectedParcelIds.length} sélectionnés). Réduisez la sélection ou ajustez le plafond paramétrable.`}
                </span>
              </div>
            )}

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par N° BDR, Destinataire, Téléphone, Adresse..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 shadow-xs"
              />
            </div>
          </div>

          {/* Province Table with 10 lines max & overflow-hidden */}
          <div
            data-cy="parcels-table-container"
            className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs"
          >
            <div className="overflow-x-auto overflow-y-hidden">
              <table className="w-full text-left text-xs" data-cy="stock-parcels-table">
                <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          paginatedParcels.length > 0 &&
                          paginatedParcels.every((p) => selectedParcelIds.includes(p.id))
                        }
                        onChange={handleToggleSelectCurrentPage}
                        title="Sélectionner tous les colis de la page courante"
                        className="rounded border-slate-300 text-purple-600 focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-3">N° BDR</th>
                    <th className="py-2.5 px-3">Expéditeur</th>
                    <th className="py-2.5 px-3">Destinataire Province</th>
                    <th className="py-2.5 px-3">Gare / Adresse</th>
                    <th className="py-2.5 px-3">Flux & Axe</th>
                    <th className="py-2.5 px-3 text-right">Montant COD</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedParcels.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-xs text-slate-600">Aucun colis Province en dépôt pour ces filtres.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedParcels.map((p) => {
                      const isSelected = selectedParcelIds.includes(p.id);
                      return (
                        <tr
                          key={p.id}
                          onClick={() => handleToggleSelectParcel(p.id)}
                          data-cy={`parcel-row-${p.id}`}
                          className={`hover:bg-purple-50/40 cursor-pointer transition-colors ${
                            isSelected ? "bg-purple-50/70" : ""
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectParcel(p.id)}
                              className="rounded border-slate-300 text-purple-600 focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-purple-700 text-xs">
                            {p.tracking_number}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900 text-xs">{p.sender_name || "N/A"}</div>
                            <span className="text-[10px] text-slate-400 uppercase font-medium">
                              {p.sender_type || "CYBERMARCHAND"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900 text-xs">{p.recipient_name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-slate-600 text-xs tabular-nums">
                                {p.recipient_phone_formatted || p.recipient_phone}
                              </span>
                              <OperatorBadge operator={p.operator} isSmall />
                            </div>
                          </td>
                          <td className="py-2.5 px-3 max-w-xs truncate text-slate-800 text-xs font-medium" title={p.delivery_address}>
                            {p.delivery_address}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <AxisBadge axis={p.axis} isManual={p.is_manual_axis} />
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase bg-purple-50 text-purple-700 border border-purple-200">
                                {p.flux_type}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-700 font-mono text-xs tabular-nums">
                            {p.total_to_collect_formatted || `${p.total_to_collect.toLocaleString("fr-FR")} Ar`}
                          </td>
                          <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setEditingAxisParcel(p);
                                setTargetAxis(p.axis);
                              }}
                              data-cy={`edit-axis-btn-${p.id}`}
                              className="px-2 py-0.5 bg-slate-50 hover:bg-purple-50 text-slate-600 hover:text-purple-700 border border-slate-200 rounded text-[10px] font-medium flex items-center gap-1 mx-auto transition shadow-xs"
                            >
                              <MapPin className="w-3 h-3 text-purple-600" />
                              <span>Axe</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Bar */}
            {filteredParcels.length > 0 && (
              <div
                data-cy="pagination-container"
                className="p-3 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
              >
                <div className="text-slate-500 font-medium flex items-center gap-2">
                  <span>
                    Affichage de{" "}
                    <strong className="text-slate-900 font-mono">
                      {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                    </strong>{" "}
                    à{" "}
                    <strong className="text-slate-900 font-mono">
                      {Math.min(currentPage * ITEMS_PER_PAGE, filteredParcels.length)}
                    </strong>{" "}
                    sur{" "}
                    <strong className="text-slate-900 font-mono" data-cy="pagination-total-count">
                      {filteredParcels.length}
                    </strong>{" "}
                    colis
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md font-semibold">
                    10 lignes max / page
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    data-cy="btn-page-first"
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs transition shadow-2xs"
                    title="Première page"
                  >
                    « Début
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    data-cy="btn-page-prev"
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs transition shadow-2xs"
                  >
                    ‹ Précédent
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum = i + 1;
                      if (totalPages > 5) {
                        if (currentPage <= 3) pageNum = i + 1;
                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                        else pageNum = currentPage - 2 + i;
                      }
                      const isActive = pageNum === currentPage;
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          data-cy={`btn-page-${pageNum}`}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                            isActive
                              ? "bg-purple-600 text-white shadow-xs"
                              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    data-cy="btn-page-next"
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs transition shadow-2xs"
                  >
                    Suivant ›
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    data-cy="btn-page-last"
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs transition shadow-2xs"
                    title="Dernière page"
                  >
                    Fin »
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ROADMAPS & FEUILLES DE ROUTE PROVINCE                              */}
      {/* ========================================================================= */}
      {activeTab === "roadmaps" && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-purple-600" />
                Tournées Province pour le {selectedDate} ({tours.length})
              </h2>
            </div>

            {reassignFeedback && (
              <div
                data-cy="reassign-feedback-banner"
                className="mb-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between"
              >
                <span>✓ {reassignFeedback}</span>
                <button onClick={() => setReassignFeedback(null)} className="underline text-[10px] font-bold">
                  Fermer
                </button>
              </div>
            )}

            {tours.length === 0 ? (
              <div className="p-8 bg-white border border-slate-200 rounded-xl text-center text-slate-500 shadow-xs">
                <Truck className="w-9 h-9 mx-auto text-slate-400 mb-2" />
                <p className="font-bold text-slate-700 text-sm">Aucune tournée active pour cette date</p>
                <p className="text-xs text-slate-500 mt-1">
                  Passez sur l&apos;onglet &quot;Écran 03B • Dépôts Gares&quot; pour affecter des colis aux coursiers.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {tours.map((t) => {
                  const isSelected = selectedTourId === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => handleSelectTour(t.id)}
                      data-cy={`tour-card-${t.id}`}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-purple-50/80 border-purple-500 shadow-xs ring-1 ring-purple-500/20"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-xs"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono font-bold text-purple-700">
                              #TOUR-{String(t.id).padStart(4, "0")}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                t.status === "CLOTURE"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : t.status === "EN_COURS"
                                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                                  : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              }`}
                            >
                              {t.status}
                            </span>
                          </div>
                          <h3 className="text-xs font-bold text-slate-900 mt-1">
                            {t.courier_name || `Livreur #${t.courier_id}`}
                          </h3>
                          <p className="text-[11px] text-slate-500">{t.courier_vehicle || "Deux-roues"}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold text-slate-600">
                            {t.parcels_count || t.parcels?.length || 0} colis
                          </span>
                          <p className="text-xs font-bold text-emerald-700 font-mono mt-0.5">
                            {t.theoretical_total.toLocaleString("fr-FR")} Ar
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected tour detail */}
          {selectedTour && (
            <div className="space-y-3">
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded">
                        #TOUR-{String(selectedTour.id).padStart(4, "0")}
                      </span>
                      <h2 className="text-base font-bold text-slate-900">
                        Feuille de Route : {selectedTour.courier_name}
                      </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1.5">
                      <span>
                        📞 <strong>Contact :</strong> {selectedTour.courier_phone_formatted || selectedTour.courier_phone || "N/A"}
                      </span>
                      <span>
                        🛵 <strong>Véhicule :</strong> {selectedTour.courier_vehicle || "Standard"}
                      </span>
                      <span>
                        📦 <strong>Total Colis :</strong> {selectedTour.parcels?.length || 0}
                      </span>
                      <span className="text-emerald-700 font-bold">
                        💰 <strong>Total COD :</strong> {selectedTour.theoretical_total.toLocaleString("fr-FR")} Ar
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setShowThermalTicket(true)}
                      data-cy="print-ticket-btn"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors border border-slate-200 shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5 text-purple-600" />
                      <span>Ticket 80 mm</span>
                    </button>
                    <button
                      onClick={() => setShowWhatsAppModal(true)}
                      data-cy="share-whatsapp-btn"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-colors border border-emerald-200 shadow-xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp</span>
                    </button>
                    {selectedTour.status === "ASSIGNE" && (
                      <button
                        onClick={() => handleStartTour(selectedTour.id)}
                        data-cy="start-tour-btn"
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Démarrer</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Parcels in tour */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs divide-y divide-slate-100">
                {selectedTour.parcels?.map((p, idx) => (
                  <div key={p.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <span className="font-bold text-slate-900 mr-2 text-xs">#{idx + 1} BDR-{p.tracking_number}</span>
                      <span className="text-xs text-slate-500">{p.recipient_name} ({p.delivery_address})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-emerald-700 text-xs tabular-nums">
                        {p.total_to_collect_formatted || `${p.total_to_collect.toLocaleString("fr-FR")} Ar`}
                      </span>
                      {selectedTour.status === "ASSIGNE" && (
                        <button
                          onClick={() => handleUnassign(selectedTour.id, p.id)}
                          data-cy={`unassign-btn-${p.id}`}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[10px] font-semibold rounded transition-colors"
                        >
                          Désassigner
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: EDIT AXIS */}
      {editingAxisParcel && (
        <div
          data-cy="modal-edit-axis"
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-purple-50 text-purple-600 rounded-lg border border-purple-100">
                  <MapPin className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Sélection Manuelle de l&apos;Axe Logistique</h3>
                  <p className="text-[11px] text-slate-500 font-mono">Colis BDR-{editingAxisParcel.tracking_number}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingAxisParcel(null)}
                className="text-slate-400 hover:text-slate-700 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block uppercase tracking-wider">
                Choisir le Nouvel Axe
              </label>
              <select
                data-cy="select-override-axis"
                value={targetAxis}
                onChange={(e) => setTargetAxis(e.target.value as LogisticAxis)}
                className="w-full bg-white border border-slate-300 text-slate-800 font-medium text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                <optgroup label="🛵 Réseau Urbain (Grand Tanà - 9 Axes Réels)">
                  <option value="AXE_CENTRE_1">1. Axe Centre Ville 1 (Hyper-Centre & Analakely)</option>
                  <option value="AXE_CENTRE_2">2. Axe Centre Ville 2 (Péri-Centre & Antanimena)</option>
                  <option value="AXE_ITAOSY">3. Axe Itaosy (67Ha, Itaosy & Ouest)</option>
                  <option value="AXE_AMPITATAFIKA">4. Axe Ampitatafika (Ampefiloha & Fenoarivo)</option>
                  <option value="AXE_AMBOHIMANGAKELY">5. Axe Ambohimangakely (Besarety & RN2)</option>
                  <option value="AXE_SABOTSY_NAMEHANA">6. Axe Sabotsy Namehana (Ankadikely & RN3)</option>
                  <option value="AXE_IVATO">7. Axe Ivato (RN4 Digue & Aéroport)</option>
                  <option value="AXE_IAVOLOHA">8. Axe Iavoloha (RN7 Sud & Tanjombato)</option>
                  <option value="AXE_ALASORA">9. Axe Alasora (Mandroseza & By-pass)</option>
                </optgroup>
                <optgroup label="🚐 Expéditions Nationales (Province & Gares)">
                  <option value="AXE_PROVINCE">8. AXE_PROVINCE (Toutes Gares Routières)</option>
                  <option value="AXE_PROV_RN2_EST">9. AXE_PROV_RN2_EST (Tamatave / Moramanga / Sainte-Marie)</option>
                  <option value="AXE_PROV_RN4_OUEST">10. AXE_PROV_RN4_OUEST (Majunga / Maevatanana / Marovoay)</option>
                  <option value="AXE_PROV_RN6_NORD">11. AXE_PROV_RN6_NORD (Diego-Suarez / Nosy Be / Sambava)</option>
                  <option value="AXE_PROV_RN7_SUD">12. AXE_PROV_RN7_SUD (Antsirabe / Ambositra / Fianar)</option>
                  <option value="AXE_PROV_RN7_SUD_OUEST">13. AXE_PROV_RN7_SUD_OUEST (Tuléar / Morondava)</option>
                  <option value="AXE_PROV_SUD_EST">14. AXE_PROV_SUD_EST (Manakara / Fort-Dauphin)</option>
                  <option value="AXE_PROV_RN44_ALAOTRA">15. AXE_PROV_RN44_ALAOTRA (Ambatondrazaka / Alaotra)</option>
                </optgroup>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingAxisParcel(null)}
                className="px-3.5 py-1.5 font-medium text-xs text-slate-600 hover:text-slate-900 transition"
              >
                Annuler
              </button>
              <button
                data-cy="btn-confirm-override-axis"
                onClick={handleConfirmOverrideAxis}
                disabled={isSavingAxis}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs uppercase tracking-wider rounded-lg transition shadow-xs flex items-center gap-1.5"
              >
                {isSavingAxis ? "Enregistrement..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals Thermal Ticket & WhatsApp */}
      {showThermalTicket && selectedTour && (
        <ThermalTicket80mm tour={selectedTour} onClose={() => setShowThermalTicket(false)} />
      )}
      {showWhatsAppModal && selectedTour && (
        <WhatsAppModal tour={selectedTour} onClose={() => setShowWhatsAppModal(false)} />
      )}
    </div>
  );
}
