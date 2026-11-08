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
  const [courierCapacityInput, setCourierCapacityInput] = useState<number>(15);
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

  const selectedCourier = couriers.find((c) => c.id === Number(assignedCourierId));
  const courierCapacity = selectedCourier?.max_parcels || 15;
  const isOverCapacity = selectedParcelIds.length > courierCapacity;

  useEffect(() => {
    if (selectedCourier) {
      setCourierCapacityInput(selectedCourier.max_parcels || 15);
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

  // Strictly province parcels
  const provinceParcels = stockParcels.filter(
    (p) => p.axis === "AXE_PROVINCE" || p.flux_type === "PROVINCE"
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
    if (selectedParcelIds.length === 0 || !assignedCourierId || isOverCapacity) return;
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ========================================================================= */}
      {/* SÉPARATION STRICTE : BANDEAU NAVIGATION VILLE VS PROVINCE                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900/90 border border-slate-800 rounded-xl shadow-xs">
        <Link
          href="/dispatch"
          data-cy="nav-dispatch-urban"
          className="py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent"
        >
          <span>🛵 1. LIVRAISON EN VILLE (URBAIN • 7 CORRIDORS)</span>
        </Link>
        <Link
          href="/dispatch/province"
          data-cy="nav-dispatch-province"
          className="py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all bg-purple-600 text-white shadow-xs border border-purple-500/50"
        >
          <span>🚌 2. EXPÉDITIONS PROVINCE (GARES ROUTIÈRES)</span>
        </Link>
      </div>

      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[11px] font-semibold uppercase tracking-wider">
              Écran 03B • Gares Routières
            </span>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Dispatching Régional — Expéditions Province
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestion exclusive des dépôts en gares routières d&apos;Antananarivo (Ambodivona, Fasan&apos;ny Karana, Andohatapenaka).
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <Calendar className="w-3.5 h-3.5 text-purple-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-medium text-white focus:outline-none cursor-pointer"
            />
          </div>
          <button
            onClick={() => {
              loadStockParcels();
              loadTours();
            }}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
            title="Rafraîchir"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Screen Mode Tabs (Écran 03B vs Écran 04) */}
      <div className="flex border-b border-slate-800 bg-slate-900/50 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab("dispatch")}
          data-cy="tab-dispatch"
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === "dispatch"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Écran 03B • Dépôts Gares en Attente</span>
          <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-slate-950/40 text-purple-200">
            {totalStockCount} en stock
          </span>
        </button>

        <button
          onClick={() => setActiveTab("roadmaps")}
          data-cy="tab-roadmaps"
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === "roadmaps"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Écran 04 • Feuilles de Route Gares</span>
          <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-slate-950/40 text-purple-200">
            {tours.length} tournées
          </span>
        </button>
      </div>

      {/* SUCCESS NOTIFICATION TOAST */}
      {assignSuccessMessage && (
        <div
          data-cy="assign-success-banner"
          className="p-3 bg-emerald-950/80 border border-emerald-600/50 text-emerald-200 rounded-xl flex items-center justify-between shadow-xs text-xs font-medium"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{assignSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActiveTab("roadmaps")}
            className="text-xs font-semibold text-white underline hover:text-emerald-300 ml-4 flex items-center gap-1"
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
          className="p-2.5 bg-emerald-950/80 border border-emerald-600/50 text-emerald-200 rounded-xl flex items-center justify-between shadow-xs text-xs font-medium"
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{axisFeedback}</span>
          </div>
          <button onClick={() => setAxisFeedback(null)} className="text-slate-400 hover:text-white text-xs underline">
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
            <div className="bg-slate-900/90 border border-slate-800 border-l-4 border-l-purple-500 p-3 rounded-xl shadow-xs">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Colis Province en Stock</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-base sm:text-lg font-bold text-purple-400 tabular-nums">{totalStockCount}</span>
                <span className="text-[11px] text-slate-500">dépôt coopératives</span>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 border-l-4 border-l-emerald-500 p-3 rounded-xl shadow-xs">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total COD Province</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-base sm:text-lg font-bold text-emerald-400 font-mono tabular-nums">
                  {totalStockCOD.toLocaleString("fr-FR")} Ar
                </span>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 border-l-4 border-l-blue-500 p-3 rounded-xl shadow-xs">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Livreurs Disponibles</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-base sm:text-lg font-bold text-blue-400 tabular-nums">{couriers.length}</span>
                <span className="text-[11px] text-slate-500">pour liaisons gares</span>
              </div>
            </div>
          </div>

          {/* Gare Filter Pills */}
          <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Gares Routières de Correspondance :
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {GARE_FILTERS.map((g) => {
                const isSelected = selectedGare === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGare(g.id)}
                    data-cy={`gare-filter-${g.id}`}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
                        : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                    }`}
                  >
                    {g.short}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search bar & Capacity / Assign Action Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
            {/* Selection actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSelectAllVisible}
                data-cy="select-all-btn"
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors border border-slate-700"
              >
                {filteredParcels.length > 0 &&
                filteredParcels.every((p) => selectedParcelIds.includes(p.id)) ? (
                  <CheckSquare className="w-4 h-4 text-purple-400" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>Tout sélectionner ({filteredParcels.length})</span>
              </button>

              <div className="text-xs">
                <span className="font-bold text-white" data-cy="selected-count">
                  {selectedParcelIds.length} sélectionné(s)
                </span>
                {selectedParcelIds.length > 0 && (
                  <span className="text-emerald-400 ml-2 font-bold">
                    • COD : {selectedParcelsTotal.toLocaleString("fr-FR")} Ar
                  </span>
                )}
              </div>
            </div>

            {/* Courier Selection & Parametric Capacity */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold">Affecter au livreur :</span>
                <select
                  value={assignedCourierId}
                  onChange={(e) => setAssignedCourierId(Number(e.target.value))}
                  data-cy="select-courier"
                  className="bg-slate-950 border border-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-xl focus:border-purple-500 focus:outline-none"
                >
                  {couriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.vehicle_type} - {c.phone_formatted})
                    </option>
                  ))}
                </select>
              </div>

              {/* Courier Capacity Indicator & Configurator */}
              {selectedCourier && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs">
                  <span className="text-slate-400 font-medium">Capacité :</span>
                  <span
                    data-cy="courier-capacity-display"
                    className={`font-mono font-bold ${
                      isOverCapacity ? "text-red-400" : "text-emerald-400"
                    }`}
                  >
                    {selectedParcelIds.length} / {courierCapacity} max
                  </span>
                  <div className="flex items-center gap-1.5 ml-2 border-l border-slate-800 pl-2">
                    <span className="text-[10px] text-slate-400">Plafond :</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      data-cy="input-courier-capacity"
                      value={courierCapacityInput}
                      onChange={(e) => setCourierCapacityInput(Number(e.target.value))}
                      className="w-14 px-1.5 py-0.5 text-center font-mono font-bold text-xs bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-purple-500"
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
                disabled={selectedParcelIds.length === 0 || !assignedCourierId || isAssigning || isOverCapacity}
                data-cy="assign-tour-btn"
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg ${
                  selectedParcelIds.length > 0 && assignedCourierId && !isAssigning && !isOverCapacity
                    ? "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/50 cursor-pointer"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {isAssigning
                    ? "Assignation..."
                    : isOverCapacity
                    ? `Capacité dépassée (${selectedParcelIds.length}/${courierCapacity})`
                    : `Assigner (${selectedParcelIds.length} colis)`}
                </span>
              </button>
            </div>
          </div>

          {/* Capacity Overload Warning Alert */}
          {isOverCapacity && (
            <div
              data-cy="capacity-warning-banner"
              className="p-3 bg-red-950/90 border border-red-500/80 text-red-200 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg"
            >
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>
                Capacité maximale dépassée : le livreur {selectedCourier?.name} ne peut prendre que {courierCapacity} colis maximum ({selectedParcelIds.length} sélectionnés). Réduisez la sélection ou ajustez le plafond paramétrable.
              </span>
            </div>
          )}

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par N° BDR, Destinataire, Téléphone, Adresse..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Province Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" data-cy="stock-parcels-table">
                <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">Sel.</th>
                    <th className="py-3 px-3">N° BDR</th>
                    <th className="py-3 px-3">Expéditeur</th>
                    <th className="py-3 px-3">Destinataire Province</th>
                    <th className="py-3 px-3">Gare / Adresse</th>
                    <th className="py-3 px-3">Flux & Axe</th>
                    <th className="py-3 px-3 text-right">Montant COD</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredParcels.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 font-bold">
                        Aucun colis Province en dépôt pour ces filtres.
                      </td>
                    </tr>
                  ) : (
                    filteredParcels.map((p) => {
                      const isSelected = selectedParcelIds.includes(p.id);
                      return (
                        <tr
                          key={p.id}
                          onClick={() => handleToggleSelectParcel(p.id)}
                          data-cy={`parcel-row-${p.id}`}
                          className={`hover:bg-slate-800/50 cursor-pointer transition-colors ${
                            isSelected ? "bg-purple-950/30" : ""
                          }`}
                        >
                          <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectParcel(p.id)}
                              className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-purple-400">
                            {p.tracking_number}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-white">{p.sender_name || "N/A"}</div>
                            <span className="text-[10px] text-slate-400 uppercase">
                              {p.sender_type || "CYBERMARCHAND"}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-white">{p.recipient_name}</div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                              <span>{p.recipient_phone_formatted || p.recipient_phone}</span>
                              <OperatorBadge operator={p.operator} />
                            </div>
                          </td>
                          <td className="py-3 px-3 max-w-xs truncate text-slate-300">
                            {p.delivery_address}
                          </td>
                          <td className="py-3 px-3">
                            <AxisBadge axis={p.axis} isManual={p.is_manual_axis} />
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {p.flux_type}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                            {p.total_to_collect_formatted || `${p.total_to_collect.toLocaleString("fr-FR")} Ar`}
                          </td>
                          <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setEditingAxisParcel(p);
                                setTargetAxis(p.axis);
                              }}
                              data-cy={`edit-axis-btn-${p.id}`}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 rounded text-[11px] font-bold"
                            >
                              ✏️ Axe
                            </button>
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

      {/* ========================================================================= */}
      {/* TAB 2: ROADMAPS & FEUILLES DE ROUTE PROVINCE                              */}
      {/* ========================================================================= */}
      {activeTab === "roadmaps" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-purple-400" />
              Tournées Province pour le {selectedDate} ({tours.length})
            </h2>
          </div>

          {reassignFeedback && (
            <div
              data-cy="reassign-feedback-banner"
              className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-between"
            >
              <span>✓ {reassignFeedback}</span>
              <button onClick={() => setReassignFeedback(null)} className="underline text-[10px]">
                Fermer
              </button>
            </div>
          )}

          {tours.length === 0 ? (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-500">
              <Truck className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="font-bold text-slate-400">Aucune tournée active pour cette date</p>
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
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-purple-950/40 border-purple-500 shadow-lg shadow-purple-950/50"
                        : "bg-slate-900/80 border-slate-800 hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-mono font-bold text-purple-400">
                          #TOUR-{String(t.id).padStart(4, "0")}
                        </span>
                        <h3 className="text-sm font-bold text-white mt-1">
                          {t.courier_name || `Livreur #${t.courier_id}`}
                        </h3>
                        <p className="text-xs text-slate-400">{t.courier_vehicle || "Deux-roues"}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-300">
                          {t.parcels_count || t.parcels?.length || 0} colis
                        </span>
                        <p className="text-sm font-black text-emerald-400 font-mono mt-0.5">
                          {t.theoretical_total.toLocaleString("fr-FR")} Ar
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected tour detail */}
          {selectedTour && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-black text-white">
                    Feuille de Route : Tournée #{selectedTour.id} — {selectedTour.courier_name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Statut : <span className="font-bold text-purple-400">{selectedTour.status}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowThermalTicket(true)}
                    data-cy="print-ticket-btn"
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700"
                  >
                    <Printer className="w-4 h-4 text-purple-400" />
                    <span>Ticket 80 mm</span>
                  </button>
                  <button
                    onClick={() => setShowWhatsAppModal(true)}
                    data-cy="share-whatsapp-btn"
                    className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </button>
                  {selectedTour.status === "ASSIGNE" && (
                    <button
                      onClick={() => handleStartTour(selectedTour.id)}
                      data-cy="start-tour-btn"
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black shadow-lg"
                    >
                      <Play className="w-4 h-4" />
                      <span>Démarrer</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Parcels in tour */}
              <div className="divide-y divide-slate-800/60">
                {selectedTour.parcels?.map((p, idx) => (
                  <div key={p.id} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white mr-2">#{idx + 1} BDR-{p.tracking_number}</span>
                      <span className="text-xs text-slate-400">{p.recipient_name} ({p.delivery_address})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-emerald-400 text-xs">
                        {p.total_to_collect_formatted || `${p.total_to_collect} Ar`}
                      </span>
                      {selectedTour.status === "ASSIGNE" && (
                        <button
                          onClick={() => handleUnassign(selectedTour.id, p.id)}
                          data-cy={`unassign-btn-${p.id}`}
                          className="px-2 py-1 bg-red-950/60 hover:bg-red-900 border border-red-800/60 text-red-200 text-xs font-bold rounded"
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
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div data-cy="modal-edit-axis" className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Sélection Manuelle de l&apos;Axe Logistique</h3>
            <p className="text-xs text-slate-400">Colis BDR-{editingAxisParcel.tracking_number}</p>
            <select
              data-cy="select-override-axis"
              value={targetAxis}
              onChange={(e) => setTargetAxis(e.target.value as LogisticAxis)}
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-2.5 text-xs font-bold"
            >
              <option value="AXE_CENTRE">AXE CENTRE (Tsiazotafo & Centre)</option>
              <option value="AXE_RN1">AXE RN1 OUEST (Itaosy / Fenoarivo)</option>
              <option value="AXE_RN2">AXE RN2 EST (Ambohimangakely)</option>
              <option value="AXE_RN3">AXE RN3 NORD (Sabotsy Namehana)</option>
              <option value="AXE_RN4">AXE RN4 / DIGUE (Ivato Aéroport)</option>
              <option value="AXE_RN7">AXE RN7 SUD (Tanjombato / Iavoloha)</option>
              <option value="AXE_SUD_EST">AXE SUD-EST (Ankatso / Alasora)</option>
              <option value="AXE_PROVINCE">AXE PROVINCES & GARES ROUTIÈRES</option>
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditingAxisParcel(null)} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold">
                Annuler
              </button>
              <button
                data-cy="btn-confirm-override-axis"
                onClick={handleConfirmOverrideAxis}
                disabled={isSavingAxis}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold"
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
