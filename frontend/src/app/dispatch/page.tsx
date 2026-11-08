"use client";

import React, { useState, useEffect } from "react";
import {
  Truck,
  Package,
  Calendar,
  CheckCircle,
  Clock,
  Printer,
  MessageSquare,
  AlertCircle,
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
  fetchAxes,
  fetchCouriers,
  fetchParcels,
  fetchTours,
  fetchTourDetail,
  createOrAssignTour,
  unassignParcelFromTour,
  startTour,
} from "@/lib/api";
import { AxisInfo, Courier, LogisticAxis, Parcel, Tour } from "@/types";

const AXIS_OPTIONS: { code: LogisticAxis | "ALL"; label: string; short: string }[] = [
  { code: "ALL", label: "Tous les Axes", short: "Tous" },
  { code: "AXE_CENTRE", label: "AXE CENTRE (Tsiazotafo & Centre)", short: "Centre" },
  { code: "AXE_RN1", label: "AXE RN1 OUEST (Itaosy / Fenoarivo)", short: "RN1 Ouest" },
  { code: "AXE_RN2", label: "AXE RN2 EST (Ambohimangakely)", short: "RN2 Est" },
  { code: "AXE_RN3", label: "AXE RN3 NORD (Sabotsy Namehana)", short: "RN3 Nord" },
  { code: "AXE_RN4", label: "AXE RN4 / DIGUE (Ivato Aéroport)", short: "RN4 Digue" },
  { code: "AXE_RN7", label: "AXE RN7 SUD (Tanjombato / Iavoloha)", short: "RN7 Sud" },
  { code: "AXE_SUD_EST", label: "AXE SUD-EST (Ankatso / Alasora)", short: "Sud-Est" },
  { code: "AXE_PROVINCE", label: "AXE PROVINCES & GARES ROUTIÈRES", short: "Provinces" },
];

const GARE_FILTERS = [
  { id: "ALL", label: "Toutes les Gares" },
  { id: "Ambodivona", label: "Gare Ambodivona (RN2 Est)" },
  { id: "Fasan'ny Karana", label: "Gare Fasan'ny Karana (RN7 Sud)" },
  { id: "Andohatapenaka", label: "Gare Andohatapenaka / Maki (RN4 Nord/Ouest)" },
];

export default function DispatchPage() {
  const [activeTab, setActiveTab] = useState<"dispatch" | "roadmaps">("dispatch");
  const [selectedDate, setSelectedDate] = useState<string>("2026-11-08");

  // Master data
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [axes, setAxes] = useState<AxisInfo[]>([]);

  // Dispatch state (Écran 03)
  const [stockParcels, setStockParcels] = useState<Parcel[]>([]);
  const [selectedAxis, setSelectedAxis] = useState<LogisticAxis | "ALL">("ALL");
  const [selectedGare, setSelectedGare] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedParcelIds, setSelectedParcelIds] = useState<number[]>([]);
  const [assignedCourierId, setAssignedCourierId] = useState<number | "">("");
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [assignSuccessMessage, setAssignSuccessMessage] = useState<string | null>(null);

  // Roadmaps state (Écran 04)
  const [tours, setTours] = useState<Tour[]>([]);
  const [selectedTourId, setSelectedTourId] = useState<number | null>(null);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [isLoadingTourDetail, setIsLoadingTourDetail] = useState<boolean>(false);

  // Modals
  const [showThermalTicket, setShowThermalTicket] = useState<boolean>(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);

  // Initial load
  useEffect(() => {
    loadMasterData();
    loadStockParcels();
    loadTours();
  }, [selectedDate]);

  const loadMasterData = async () => {
    try {
      const [cList, aList] = await Promise.all([fetchCouriers(), fetchAxes()]);
      setCouriers(cList);
      setAxes(aList);
      if (cList.length > 0 && assignedCourierId === "") {
        setAssignedCourierId(cList[0].id);
      }
    } catch (e) {
      console.error("Error loading master data", e);
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

  const handleSelectTour = (tourId: number) => {
    setSelectedTourId(tourId);
    loadTourDetail(tourId);
  };

  // Filtered parcels for Écran 03
  const filteredParcels = stockParcels.filter((p) => {
    if (selectedAxis !== "ALL" && p.axis !== selectedAxis) return false;
    if (selectedAxis === "AXE_PROVINCE" && selectedGare !== "ALL") {
      if (!p.delivery_address.toLowerCase().includes(selectedGare.toLowerCase())) return false;
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

  // Selection handlers
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

  // Assign parcels to tour
  const handleAssignToTour = async () => {
    if (selectedParcelIds.length === 0 || !assignedCourierId) return;
    setIsAssigning(true);
    try {
      const res = await createOrAssignTour(Number(assignedCourierId), selectedDate, selectedParcelIds);
      const assignedCourier = couriers.find((c) => c.id === Number(assignedCourierId));
      setAssignSuccessMessage(
        `${selectedParcelIds.length} colis assigné(s) avec succès à la tournée de ${assignedCourier?.name || "Livreur"} !`
      );
      // Retirer immédiatement les colis assignés du stock en dépôt affiché
      setStockParcels((prev) => prev.filter((p) => !selectedParcelIds.includes(p.id)));
      setSelectedParcelIds([]);
      await loadStockParcels();
      await loadTours();
      setTimeout(() => setAssignSuccessMessage(null), 4000);
    } catch (e: any) {
      alert(e.message || "Erreur lors de l'assignation de la tournée.");
    } finally {
      setIsAssigning(false);
    }
  };

  // Unassign parcel from roadmap
  const handleUnassignParcel = async (parcelId: number) => {
    if (!selectedTour) return;
    if (!confirm("Voulez-vous retirer ce colis de la tournée et le réintégrer au stock en dépôt ?")) return;
    try {
      const updated = await unassignParcelFromTour(selectedTour.id, parcelId);
      setSelectedTour(updated);
      await loadStockParcels();
      await loadTours();
    } catch (e: any) {
      alert(e.message || "Erreur lors du retrait du colis.");
    }
  };

  // Start tour (Passer en cours)
  const handleStartTour = async () => {
    if (!selectedTour) return;
    try {
      const updated = await startTour(selectedTour.id);
      setSelectedTour(updated);
      await loadTours();
    } catch (e: any) {
      alert(e.message || "Erreur lors du démarrage de la tournée.");
    }
  };

  // Aggregated metrics for Écran 03
  const totalStockCount = stockParcels.length;
  const totalStockCOD = stockParcels.reduce((sum, p) => sum + p.total_to_collect, 0);
  const totalProvinceStock = stockParcels.filter((p) => p.axis === "AXE_PROVINCE").length;
  const selectedParcelsTotal = stockParcels
    .filter((p) => selectedParcelIds.includes(p.id))
    .reduce((sum, p) => sum + p.total_to_collect, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Truck className="w-7 h-7 text-blue-500" />
              03. Dispatching & Feuilles de Route
            </h1>
            <span className="px-2 py-0.5 text-xs font-black bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
              Hub Tsiazotafo
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Affectation matinale par axe radial, regroupement par gares routières et impression 80 mm
          </p>
        </div>

        {/* Date Selector & Refresh */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm text-white font-medium focus:outline-none cursor-pointer"
            />
          </div>
          <button
            onClick={() => {
              loadStockParcels();
              loadTours();
            }}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors border border-slate-700"
            title="Rafraîchir"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Screen Mode Tabs (Écran 03 vs Écran 04) */}
      <div className="flex border-b border-slate-800 bg-slate-900/50 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab("dispatch")}
          data-cy="tab-dispatch"
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === "dispatch"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Écran 03 • Dispatching Matinal</span>
          <span className="ml-1.5 px-2 py-0.5 text-xs font-black rounded-full bg-slate-950/40 text-blue-200">
            {totalStockCount} en stock
          </span>
        </button>

        <button
          onClick={() => setActiveTab("roadmaps")}
          data-cy="tab-roadmaps"
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === "roadmaps"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Écran 04 • Feuilles de Route & Tickets 80 mm</span>
          <span className="ml-1.5 px-2 py-0.5 text-xs font-black rounded-full bg-slate-950/40 text-blue-200">
            {tours.length} tournées
          </span>
        </button>
      </div>

      {/* SUCCESS NOTIFICATION TOAST */}
      {assignSuccessMessage && (
        <div
          data-cy="assign-success-banner"
          className="p-4 bg-emerald-950/80 border border-emerald-600/50 text-emerald-200 rounded-xl flex items-center justify-between shadow-lg"
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-bold">{assignSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActiveTab("roadmaps")}
            className="text-xs font-bold text-white underline hover:text-emerald-300 ml-4 flex items-center gap-1"
          >
            <span>Voir les feuilles de route</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: ÉCRAN 03 - DISPATCHING MATINAL                                     */}
      {/* ========================================================================= */}
      {activeTab === "dispatch" && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow-md">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Colis en Stock (Hub)</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-amber-400">{totalStockCount}</span>
                <span className="text-xs text-slate-500 font-medium">statut EN_DEPOT</span>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow-md">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total COD à Répartir</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-emerald-400">
                  {totalStockCOD.toLocaleString("fr-FR")} Ar
                </span>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow-md">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Colis Gares / Province</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-purple-400">{totalProvinceStock}</span>
                <span className="text-xs text-slate-500 font-medium">navette coopératives</span>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow-md">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Coursiers Actifs</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-blue-400">{couriers.length}</span>
                <span className="text-xs text-slate-500 font-medium">disponibles quai</span>
              </div>
            </div>
          </div>

          {/* Axis Radial Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                Filtrer par Axe Logistique Radial :
              </p>
              <span className="text-xs text-slate-500">
                {filteredParcels.length} colis affiché(s)
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {AXIS_OPTIONS.map((ax) => {
                const count =
                  ax.code === "ALL"
                    ? stockParcels.length
                    : stockParcels.filter((p) => p.axis === ax.code).length;
                const isSelected = selectedAxis === ax.code;

                return (
                  <button
                    key={ax.code}
                    onClick={() => setSelectedAxis(ax.code)}
                    data-cy={`axis-filter-${ax.code}`}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                        : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                    }`}
                  >
                    <span>{ax.short}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        isSelected ? "bg-blue-800 text-white" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sub-filters for Province Gares */}
            {selectedAxis === "AXE_PROVINCE" && (
              <div className="p-3 bg-purple-950/30 border border-purple-800/40 rounded-xl mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" /> Gares d&apos;Antananarivo :
                </span>
                {GARE_FILTERS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGare(g.id)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                      selectedGare === g.id
                        ? "bg-purple-600 text-white font-bold"
                        : "bg-slate-900/60 text-purple-200 hover:bg-purple-900/40"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Assignment Toolbar (Sticky control) */}
          <div className="bg-slate-900 border border-blue-500/30 p-4 rounded-2xl shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Selection indicators */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSelectAllVisible}
                data-cy="select-all-btn"
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors border border-slate-700"
              >
                {filteredParcels.length > 0 &&
                filteredParcels.every((p) => selectedParcelIds.includes(p.id)) ? (
                  <CheckSquare className="w-4 h-4 text-blue-400" />
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
                    • Valeur COD : {selectedParcelsTotal.toLocaleString("fr-FR")} Ar
                  </span>
                )}
              </div>
            </div>

            {/* Courier picker & Assign Action */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold">Affecter à :</span>
                <select
                  value={assignedCourierId}
                  onChange={(e) => setAssignedCourierId(Number(e.target.value))}
                  data-cy="select-courier"
                  className="bg-slate-950 border border-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-xl focus:border-blue-500 focus:outline-none"
                >
                  {couriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.vehicle_type} - {c.phone_formatted})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleAssignToTour}
                disabled={selectedParcelIds.length === 0 || !assignedCourierId || isAssigning}
                data-cy="assign-tour-btn"
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg ${
                  selectedParcelIds.length > 0 && assignedCourierId && !isAssigning
                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/50 cursor-pointer"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {isAssigning
                    ? "Assignation en cours..."
                    : `Assigner (${selectedParcelIds.length} colis)`}
                </span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Recherche rapide : N° BDR, client, téléphone, lieu, article ou expéditeur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-800 text-slate-200 pl-9 pr-4 py-2 rounded-xl text-sm focus:border-blue-500 focus:outline-none placeholder-slate-500"
            />
          </div>

          {/* Parcels Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" data-cy="stock-parcels-table">
                <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredParcels.length > 0 &&
                          filteredParcels.every((p) => selectedParcelIds.includes(p.id))
                        }
                        onChange={handleSelectAllVisible}
                        className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-3">BDR</th>
                    <th className="py-3 px-3">Donneur d&apos;Ordre</th>
                    <th className="py-3 px-3">Destinataire & Contact</th>
                    <th className="py-3 px-3">Lieu & Axe Logistique</th>
                    <th className="py-3 px-3">Désignation Marchandise</th>
                    <th className="py-3 px-3">Flux</th>
                    <th className="py-3 px-3 text-right">À Encaisser</th>
                    <th className="py-3 px-3 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredParcels.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        <Package className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                        <p className="font-bold text-sm text-slate-400">Aucun colis en attente de dispatch</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Tous les colis de ce filtre ont été assignés ou le stock est vide.
                        </p>
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
                            isSelected ? "bg-blue-950/30" : ""
                          }`}
                        >
                          <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectParcel(p.id)}
                              className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-blue-400">
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
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-slate-300">
                                {p.recipient_phone_formatted}
                              </span>
                              <OperatorBadge operator={p.operator} />
                            </div>
                          </td>
                          <td className="py-3 px-3 max-w-xs">
                            <div className="truncate text-slate-200" title={p.delivery_address}>
                              {p.delivery_address}
                            </div>
                            <div className="mt-1">
                              <AxisBadge axis={p.axis} isManual={p.is_manual_axis} />
                            </div>
                          </td>
                          <td className="py-3 px-3 max-w-[180px]">
                            <div className="text-slate-300 truncate" title={p.designation || "-"}>
                              {p.designation || <span className="text-slate-600 italic">-</span>}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                p.flux_type === "COD"
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : p.flux_type === "PROVINCE"
                                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                  : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              }`}
                            >
                              {p.flux_type}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-black text-emerald-400 font-mono text-sm">
                            {p.total_to_collect.toLocaleString("fr-FR")} Ar
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-900/30 text-amber-400 border border-amber-800">
                              En Dépôt
                            </span>
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
      {/* TAB 2: ÉCRAN 04 - FEUILLES DE ROUTE & TICKETS 80 MM                      */}
      {/* ========================================================================= */}
      {activeTab === "roadmaps" && (
        <div className="space-y-6">
          {/* Tours List Header / Selector */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-400" />
                Tournées Assignées pour le {selectedDate} ({tours.length})
              </h2>
            </div>

            {tours.length === 0 ? (
              <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-500">
                <Truck className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="font-bold text-slate-400">Aucune tournée active pour cette date</p>
                <p className="text-xs text-slate-500 mt-1">
                  Passez sur l&apos;onglet &quot;Écran 03 • Dispatching&quot; pour affecter des colis aux coursiers.
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
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-blue-950/40 border-blue-500 shadow-lg shadow-blue-950/50"
                          : "bg-slate-900/80 border-slate-800 hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-blue-400">
                              #TOUR-{String(t.id).padStart(4, "0")}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                t.status === "CLOTURE"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : t.status === "EN_COURS"
                                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                  : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                              }`}
                            >
                              {t.status}
                            </span>
                          </div>
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
          </div>

          {/* Selected Tour Detailed Roadmap */}
          {selectedTour && (
            <div className="space-y-4">
              {/* Tour Header Action Card */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-black px-2.5 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg">
                        #TOUR-{String(selectedTour.id).padStart(4, "0")}
                      </span>
                      <h2 className="text-xl font-black text-white">
                        Feuille de Route : {selectedTour.courier_name}
                      </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
                      <span>
                        📞 <strong>Contact :</strong> {selectedTour.courier_phone_formatted || selectedTour.courier_phone || "N/A"}
                      </span>
                      <span>
                        🛵 <strong>Véhicule :</strong> {selectedTour.courier_vehicle || "Standard"}
                      </span>
                      <span>
                        📦 <strong>Total Colis :</strong> {selectedTour.parcels?.length || 0}
                      </span>
                      <span className="text-emerald-400 font-bold">
                        💰 <strong>Total COD :</strong> {selectedTour.theoretical_total.toLocaleString("fr-FR")} Ar
                      </span>
                    </div>
                  </div>

                  {/* Actions: Thermal Print, A4 Print, WhatsApp, Start */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setShowThermalTicket(true)}
                      data-cy="open-thermal-btn"
                      className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors border border-slate-700 shadow"
                    >
                      <Printer className="w-4 h-4 text-blue-400" />
                      <span>Ticket 80 mm</span>
                    </button>

                    <button
                      onClick={() => setShowWhatsAppModal(true)}
                      data-cy="open-whatsapp-btn"
                      className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-xl text-xs font-bold transition-colors border border-emerald-500/30 shadow"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-400" />
                      <span>WhatsApp</span>
                    </button>

                    {selectedTour.status === "ASSIGNE" && (
                      <button
                        onClick={handleStartTour}
                        data-cy="start-tour-btn"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-blue-900/40"
                      >
                        <Play className="w-4 h-4" />
                        <span>Démarrer la Tournée (En Cours)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Roadmap Table with Emargement Column */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <span>Bordereaux de Tournée & Emargements Clients</span>
                    <span className="text-xs text-slate-400 font-normal">
                      ({selectedTour.parcels?.length || 0} livraisons)
                    </span>
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs" data-cy="roadmap-parcels-table">
                    <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[11px]">
                      <tr>
                        <th className="py-3 px-3 w-12 text-center">N°</th>
                        <th className="py-3 px-3">BDR</th>
                        <th className="py-3 px-3">Destinataire & Tél</th>
                        <th className="py-3 px-3">Adresse / Lieu</th>
                        <th className="py-3 px-3">Marchandise</th>
                        <th className="py-3 px-3">Flux</th>
                        <th className="py-3 px-3 text-right">À Recouvrer</th>
                        <th className="py-3 px-3 text-center">Statut</th>
                        <th className="py-3 px-3 text-center w-36">Émargement Client</th>
                        <th className="py-3 px-3 text-center w-24">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {selectedTour.parcels?.map((p, index) => (
                        <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3 text-center font-bold text-slate-400">
                            {index + 1}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-blue-400">
                            {p.tracking_number}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-white">{p.recipient_name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-slate-300">
                                {p.recipient_phone_formatted}
                              </span>
                              <OperatorBadge operator={p.operator} />
                            </div>
                          </td>
                          <td className="py-3 px-3 max-w-xs">
                            <div className="truncate text-slate-200" title={p.delivery_address}>
                              {p.delivery_address}
                            </div>
                            <div className="mt-1">
                              <AxisBadge axis={p.axis} isManual={p.is_manual_axis} />
                            </div>
                          </td>
                          <td className="py-3 px-3 max-w-[160px]">
                            <span className="text-slate-300 truncate block">
                              {p.designation || "-"}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-800 text-slate-300 border border-slate-700">
                              {p.flux_type}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-black text-emerald-400 font-mono text-sm">
                            {p.total_to_collect.toLocaleString("fr-FR")} Ar
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                p.status === "LIVRE_ENCAISSE"
                                  ? "bg-emerald-900/40 text-emerald-300 border border-emerald-800"
                                  : p.status === "EN_COURS"
                                  ? "bg-blue-900/40 text-blue-300 border border-blue-800"
                                  : "bg-indigo-900/40 text-indigo-300 border border-indigo-800"
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="h-8 border border-dashed border-slate-700 rounded-lg flex items-center justify-center text-[10px] text-slate-500 bg-slate-950/40">
                              Signature Dest.
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {selectedTour.status === "ASSIGNE" && (
                              <button
                                onClick={() => handleUnassignParcel(p.id)}
                                data-cy={`unassign-btn-${p.id}`}
                                className="px-2 py-1 text-[10px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-md transition-colors"
                                title="Retirer de la tournée et remettre en dépôt"
                              >
                                Retirer
                              </button>
                            )}
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

      {/* THERMAL TICKET 80 MM MODAL */}
      {showThermalTicket && selectedTour && (
        <ThermalTicket80mm tour={selectedTour} onClose={() => setShowThermalTicket(false)} />
      )}

      {/* WHATSAPP MODAL */}
      {showWhatsAppModal && selectedTour && (
        <WhatsAppModal tour={selectedTour} onClose={() => setShowWhatsAppModal(false)} />
      )}
    </div>
  );
}
