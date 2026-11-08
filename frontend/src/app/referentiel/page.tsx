"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Compass,
  Bus,
  MapPin,
  PlusCircle,
  Search,
  CheckCircle2,
  RefreshCw,
  X,
  Edit2,
  Trash2,
  AlertTriangle,
  Building2,
  Truck,
  Shield,
  Layers,
} from "lucide-react";
import { AxisInfo, Partner, ZoneDetail } from "@/types";
import {
  addZoneToAxis,
  createAxis,
  createPartner,
  deleteAxis,
  fetchAxes,
  fetchPartners,
  removeZoneFromAxis,
  updateAxis,
} from "@/lib/api";

type UserRole = "RECEPTIONNISTE" | "SUPERVISEUR" | "SUPER_ADMIN";

export default function ReferentielPage() {
  const [axes, setAxes] = useState<AxisInfo[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"AXES" | "PARTNERS">("AXES");
  const [axisFilter, setAxisFilter] = useState<"ALL" | "URBAIN" | "PROVINCE">("ALL");

  // User role (RBAC)
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>("SUPERVISEUR");

  useEffect(() => {
    const syncRole = () => {
      const saved = localStorage.getItem("tms_user_role") as UserRole | null;
      if (saved) setCurrentUserRole(saved);
    };
    syncRole();
    window.addEventListener("tms_role_change", syncRole);
    window.addEventListener("storage", syncRole);
    return () => {
      window.removeEventListener("tms_role_change", syncRole);
      window.removeEventListener("storage", syncRole);
    };
  }, []);

  const canManage = currentUserRole === "SUPERVISEUR" || currentUserRole === "SUPER_ADMIN";

  // Modals for Axis management
  const [isAddAxisModalOpen, setIsAddAxisModalOpen] = useState<boolean>(false);
  const [axisCode, setAxisCode] = useState<string>("");
  const [axisLibelle, setAxisLibelle] = useState<string>("");
  const [axisType, setAxisType] = useState<"URBAIN" | "PROVINCE">("URBAIN");
  const [axisInitialZones, setAxisInitialZones] = useState<string>("");

  const [editingAxis, setEditingAxis] = useState<AxisInfo | null>(null);
  const [editAxisCode, setEditAxisCode] = useState<string>("");
  const [editAxisLibelle, setEditAxisLibelle] = useState<string>("");
  const [editAxisType, setEditAxisType] = useState<"URBAIN" | "PROVINCE">("URBAIN");

  const [deletingAxis, setDeletingAxis] = useState<AxisInfo | null>(null);

  // Modals for Zone management
  const [isZoneModalOpen, setIsZoneModalOpen] = useState<boolean>(false);
  const [selectedAxisForZone, setSelectedAxisForZone] = useState<AxisInfo | null>(null);
  const [newZoneName, setNewZoneName] = useState<string>("");

  // Modals for Partner management
  const [isAddPartnerModalOpen, setIsAddPartnerModalOpen] = useState<boolean>(false);
  const [partnerName, setPartnerName] = useState<string>("");
  const [partnerType, setPartnerType] = useState<string>("COOPERATIVE");
  const [partnerContact, setPartnerContact] = useState<string>("");
  const [partnerStation, setPartnerStation] = useState<string>("Gare Routière Ambodivona");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [axList, partList] = await Promise.all([fetchAxes(), fetchPartners()]);
      setAxes(axList);
      setPartners(partList);
    } catch (e) {
      console.error("Erreur chargement référentiel", e);
    } finally {
      setLoading(false);
    }
  }

  // --- Handlers for Axis CRUD ---
  async function handleCreateAxisSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!axisCode.trim() || !axisLibelle.trim()) {
      alert("Le code et le libellé de l'axe sont obligatoires.");
      return;
    }

    setSubmitting(true);
    try {
      const zonesArray = axisInitialZones
        .split(/[,;\n]/)
        .map((z) => z.trim())
        .filter(Boolean);

      await createAxis({
        code: axisCode.trim().toUpperCase(),
        libelle: axisLibelle.trim(),
        type_axe: axisType,
        zones: zonesArray,
      });

      setIsAddAxisModalOpen(false);
      setAxisCode("");
      setAxisLibelle("");
      setAxisType("URBAIN");
      setAxisInitialZones("");
      setFeedbackMessage({ type: "success", text: "Nouvel axe créé avec succès." });
      await loadData();
    } catch (err: any) {
      alert(err.message || "Erreur lors de la création de l'axe.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenEditAxis(axis: AxisInfo) {
    setEditingAxis(axis);
    setEditAxisCode(axis.code);
    setEditAxisLibelle(axis.libelle);
    const resolvedType =
      axis.type_axe === "PROVINCE" || axis.code.includes("PROVINCE") ? "PROVINCE" : "URBAIN";
    setEditAxisType(resolvedType);
  }

  async function handleUpdateAxisSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAxis || !editAxisCode.trim() || !editAxisLibelle.trim()) return;

    setSubmitting(true);
    try {
      await updateAxis(editingAxis.id, {
        code: editAxisCode.trim().toUpperCase(),
        libelle: editAxisLibelle.trim(),
        type_axe: editAxisType,
      });

      setEditingAxis(null);
      setFeedbackMessage({ type: "success", text: "Axe logistique mis à jour avec succès." });
      await loadData();
    } catch (err: any) {
      alert(err.message || "Erreur lors de la modification de l'axe.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDeleteAxis() {
    if (!deletingAxis) return;

    setSubmitting(true);
    try {
      await deleteAxis(deletingAxis.id);
      setDeletingAxis(null);
      setFeedbackMessage({
        type: "success",
        text: `Axe ${deletingAxis.code} désactivé avec succès (Soft-Delete).`,
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || "Erreur lors de la désactivation de l'axe.");
    } finally {
      setSubmitting(false);
    }
  }

  // --- Handlers for Zones on Axis ---
  function handleOpenZoneModal(axis: AxisInfo) {
    setSelectedAxisForZone(axis);
    setNewZoneName("");
    setIsZoneModalOpen(true);
  }

  async function handleAddZoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAxisForZone || !newZoneName.trim()) return;

    setSubmitting(true);
    try {
      const updated = await addZoneToAxis(selectedAxisForZone.id, newZoneName.trim());
      setSelectedAxisForZone(updated);
      setNewZoneName("");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'ajout du quartier.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveZone(zone: ZoneDetail | { id?: number; nom: string }) {
    if (!selectedAxisForZone) return;
    if (!confirm(`Retirer le quartier "${zone.nom}" de cet axe ?`)) return;

    setSubmitting(true);
    try {
      if (zone.id) {
        const updated = await removeZoneFromAxis(selectedAxisForZone.id, zone.id);
        setSelectedAxisForZone(updated);
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || "Erreur lors du retrait du quartier.");
    } finally {
      setSubmitting(false);
    }
  }

  // --- Handlers for Partners ---
  async function handleAddPartnerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!partnerName.trim()) {
      alert("Le nom de la coopérative ou gare est obligatoire.");
      return;
    }

    setSubmitting(true);
    try {
      await createPartner({
        nom: partnerName.trim(),
        type: partnerType,
        contact: partnerContact.trim() || undefined,
        gare_rattachement: partnerStation.trim() || undefined,
      });
      setIsAddPartnerModalOpen(false);
      setPartnerName("");
      setPartnerContact("");
      setFeedbackMessage({ type: "success", text: "Nouveau partenaire enregistré avec succès." });
      await loadData();
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'enregistrement du partenaire.");
    } finally {
      setSubmitting(false);
    }
  }

  // Filtering
  const filteredAxes = axes.filter((a) => {
    const isProvince = a.type_axe === "PROVINCE" || a.code.includes("PROVINCE");
    if (axisFilter === "URBAIN" && isProvince) return false;
    if (axisFilter === "PROVINCE" && !isProvince) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.libelle.toLowerCase().includes(q) ||
      a.code.toLowerCase().includes(q) ||
      a.zones.some((z) => z.toLowerCase().includes(q))
    );
  });

  const totalUrbanCount = axes.filter(
    (a) => a.type_axe !== "PROVINCE" && !a.code.includes("PROVINCE")
  ).length;
  const totalProvinceCount = axes.filter(
    (a) => a.type_axe === "PROVINCE" || a.code.includes("PROVINCE")
  ).length;
  const totalZonesCount = axes.reduce((sum, a) => sum + (a.zones?.length || 0), 0);

  const filteredPartners = partners.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.nom.toLowerCase().includes(q) ||
      (p.gare_rattachement || "").toLowerCase().includes(q) ||
      p.type.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-600" />
              10. Référentiel Logistique — Axes Urbains & Province
            </h1>
            <span
              className={`px-2 py-0.5 text-[11px] font-semibold rounded border ${
                canManage
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {canManage
                ? currentUserRole === "SUPER_ADMIN"
                  ? "👑 Super Admin (Tous droits)"
                  : "👔 Superviseur (Création / Modif / Suppr)"
                : "📋 Réceptionniste (Lecture seule)"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Paramétrage des corridors urbains (Grand Tanà), des expéditions régionales (Province & Gares) et des quartiers desservis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 rounded-lg transition border border-slate-200 shadow-xs"
            title="Rafraîchir les données"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Actualiser</span>
          </button>

          {activeTab === "AXES" && canManage && (
            <button
              onClick={() => setIsAddAxisModalOpen(true)}
              data-cy="btn-create-axis"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Créer un Axe</span>
            </button>
          )}

          {activeTab === "PARTNERS" && canManage && (
            <button
              onClick={() => setIsAddPartnerModalOpen(true)}
              data-cy="btn-create-partner"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Ajouter Coopérative / Gare</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback banner */}
      {feedbackMessage && (
        <div
          data-cy="referentiel-feedback-banner"
          className={`p-3 rounded-xl flex items-center justify-between text-xs font-medium border shadow-xs ${
            feedbackMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs underline text-slate-500 hover:text-slate-800"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Main Tabs (Axes vs Partenaires) */}
      <div className="flex border-b border-slate-200 bg-slate-100/80 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab("AXES")}
          data-cy="tab-axes"
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === "AXES"
              ? "bg-white text-blue-700 shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-blue-600" />
          <span>Corridors Logistiques & Quartiers</span>
          <span className="ml-1 px-1.5 py-0.2 text-[10px] font-semibold rounded bg-blue-50 text-blue-700 border border-blue-200/60">
            {axes.length} axes
          </span>
        </button>

        <button
          onClick={() => setActiveTab("PARTNERS")}
          data-cy="tab-partners"
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === "PARTNERS"
              ? "bg-white text-purple-700 shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Bus className="w-3.5 h-3.5 text-purple-600" />
          <span>Gares Routières & Coopératives</span>
          <span className="ml-1 px-1.5 py-0.2 text-[10px] font-semibold rounded bg-purple-50 text-purple-700 border border-purple-200/60">
            {partners.length} partenaires
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: AXES LOGISTIQUES (URBAIN & PROVINCE)                                */}
      {/* ========================================================================= */}
      {activeTab === "AXES" && (
        <div className="space-y-3.5">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 border-l-4 border-l-slate-600 p-3 rounded-xl shadow-xs">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Corridors</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">{axes.length}</span>
                <span className="text-[11px] text-slate-400">actifs réseau</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 border-l-4 border-l-blue-500 p-3 rounded-xl shadow-xs">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Réseau Urbain (Ville)</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-base sm:text-lg font-bold text-blue-700 tabular-nums">{totalUrbanCount}</span>
                <span className="text-[11px] text-slate-400">Grand Tanà (radiaux)</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 border-l-4 border-l-purple-500 p-3 rounded-xl shadow-xs">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Expéditions Province</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-base sm:text-lg font-bold text-purple-700 tabular-nums">{totalProvinceCount}</span>
                <span className="text-[11px] text-slate-400">Gares routières</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 border-l-4 border-l-emerald-500 p-3 rounded-xl shadow-xs">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Localités & Quartiers</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-base sm:text-lg font-bold text-emerald-700 tabular-nums">{totalZonesCount}</span>
                <span className="text-[11px] text-slate-400">points rattachés</span>
              </div>
            </div>
          </div>

          {/* Filters Bar: Category Pill Filters & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setAxisFilter("ALL")}
                data-cy="filter-axis-all"
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition border ${
                  axisFilter === "ALL"
                    ? "bg-slate-800 text-white border-slate-800 shadow-xs font-semibold"
                    : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                Tous ({axes.length})
              </button>
              <button
                onClick={() => setAxisFilter("URBAIN")}
                data-cy="filter-axis-urbain"
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 border ${
                  axisFilter === "URBAIN"
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs font-semibold"
                    : "bg-white hover:bg-blue-50 text-slate-700 border-slate-200"
                }`}
              >
                <span>🛵 1. Ville / Urbain</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800">
                  {totalUrbanCount}
                </span>
              </button>
              <button
                onClick={() => setAxisFilter("PROVINCE")}
                data-cy="filter-axis-province"
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 border ${
                  axisFilter === "PROVINCE"
                    ? "bg-purple-600 text-white border-purple-600 shadow-xs font-semibold"
                    : "bg-white hover:bg-purple-50 text-slate-700 border-slate-200"
                }`}
              >
                <span>🚌 2. Province / Gares</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-800">
                  {totalProvinceCount}
                </span>
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher code, libellé, quartier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-cy="search-axes"
                className="w-full bg-white border border-slate-200 text-slate-800 pl-8 pr-3 py-1.5 rounded-lg text-xs focus:border-blue-500 focus:outline-none placeholder-slate-400 shadow-xs"
              />
            </div>
          </div>

          {/* Axes Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredAxes.map((axe) => {
              const isProvince = axe.type_axe === "PROVINCE" || axe.code.includes("PROVINCE");

              return (
                <div
                  key={axe.id}
                  data-cy={`axis-card-${axe.id}`}
                  className="bg-white rounded-xl border border-slate-200 shadow-xs p-3.5 flex flex-col justify-between hover:border-slate-300 transition space-y-3"
                >
                  <div>
                    {/* Card Top: Type badge, Code, and Zone Count */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded border ${
                            isProvince
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {isProvince ? "🚌 Province" : "🛵 Urbain"}
                        </span>
                        <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-800 rounded border border-slate-200">
                          {axe.code}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-500">
                        {axe.zones?.length || 0} localité(s)
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-xs font-bold text-slate-900 mt-2 leading-snug">
                      {axe.libelle}
                    </h3>

                    {/* Zones Pill List */}
                    <div className="mt-2.5 flex flex-wrap gap-1 max-h-32 overflow-y-auto pr-1">
                      {axe.zones && axe.zones.length > 0 ? (
                        axe.zones.map((zone, zIdx) => (
                          <span
                            key={zIdx}
                            className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${
                              isProvince
                                ? "bg-purple-50/70 text-purple-700 border-purple-200/70"
                                : "bg-blue-50/70 text-blue-700 border-blue-200/70"
                            }`}
                          >
                            {zone}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Aucun quartier rattaché
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer Actions (Conditional based on RBAC) */}
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1 text-xs">
                    <button
                      onClick={() => handleOpenZoneModal(axe)}
                      data-cy={`btn-manage-zones-${axe.id}`}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 rounded-md transition"
                      title="Gérer ou ajouter des quartiers pour cet axe"
                    >
                      <MapPin className="w-3 h-3 text-blue-600" />
                      <span>{canManage ? "Gérer Quartiers" : "Voir Quartiers"}</span>
                    </button>

                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditAxis(axe)}
                          data-cy={`btn-edit-axis-${axe.id}`}
                          className="p-1 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded transition"
                          title="Modifier l'axe"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingAxis(axe)}
                          data-cy={`btn-delete-axis-${axe.id}`}
                          className="p-1 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded transition"
                          title="Désactiver l'axe"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredAxes.length === 0 && (
            <div className="p-8 bg-white border border-slate-200 rounded-xl text-center text-slate-500 shadow-xs">
              <Compass className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-xs text-slate-700">Aucun axe logistique trouvé</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Essayez d'ajuster vos critères de recherche ou vos filtres.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PARTENAIRES (GARES ROUTIÈRES & COOPÉRATIVES)                        */}
      {/* ========================================================================= */}
      {activeTab === "PARTNERS" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Bus className="w-4 h-4 text-purple-600" />
              Gares Routières d'Antananarivo & Coopératives Nationales ({filteredPartners.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" data-cy="partners-table">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Nom Partenaire</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Gare de Rattachement</th>
                  <th className="py-2.5 px-3">Contact Guichet</th>
                  <th className="py-2.5 px-3 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredPartners.map((p) => {
                  let badgeType = "bg-blue-50 text-blue-700 border-blue-200";
                  if (p.type === "GARE") {
                    badgeType = "bg-purple-50 text-purple-700 border-purple-200 font-bold";
                  } else if (p.type === "CONFRERE") {
                    badgeType = "bg-amber-50 text-amber-700 border-amber-200";
                  }

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-2">
                        <Bus className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>{p.nom}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeType}`}>
                          {p.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {p.gare_rattachement || "—"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {p.contact || "Standard"}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Actif</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredPartners.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Aucun partenaire trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1 : CRÉER UN NOUVEL AXE (URBAIN OU PROVINCE)                        */}
      {/* ========================================================================= */}
      {isAddAxisModalOpen && (
        <div
          data-cy="modal-create-axis"
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                  <Compass className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Créer un Nouvel Axe Logistique
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Paramétrage Ville (Grand Tanà) ou Expéditions Province
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddAxisModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAxisSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                  Type de Réseau : *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAxisType("URBAIN");
                      if (axisCode.startsWith("AXE_PROVINCE_")) {
                        setAxisCode("AXE_RN");
                      }
                    }}
                    data-cy="select-type-urbain"
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      axisType === "URBAIN"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span>🛵 1. Ville / Urbain</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAxisType("PROVINCE");
                      if (!axisCode.startsWith("AXE_PROVINCE_")) {
                        setAxisCode("AXE_PROVINCE_");
                      }
                    }}
                    data-cy="select-type-province"
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      axisType === "PROVINCE"
                        ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span>🚌 2. Province / Gares</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                  Code Unique de l&apos;Axe : *
                </label>
                <input
                  type="text"
                  required
                  placeholder={axisType === "URBAIN" ? "ex: AXE_BYPASS ou AXE_RN8" : "ex: AXE_PROVINCE_EST"}
                  value={axisCode}
                  onChange={(e) => setAxisCode(e.target.value.toUpperCase())}
                  data-cy="input-axis-code"
                  className="w-full font-mono text-xs font-bold border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Identifiant technique utilisé dans les tournées et les exports.
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                  Libellé Opérationnel : *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: AXE BYPASS SUD (Tanjombato / Alasora / Iavoloha)"
                  value={axisLibelle}
                  onChange={(e) => setAxisLibelle(e.target.value)}
                  data-cy="input-axis-libelle"
                  className="w-full text-xs font-medium border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                  Quartiers / Localités rattachés (optionnel) :
                </label>
                <textarea
                  rows={2}
                  placeholder="Séparez les quartiers par une virgule (ex: Alasora, Mandroseza, Ambohimiadana)"
                  value={axisInitialZones}
                  onChange={(e) => setAxisInitialZones(e.target.value)}
                  data-cy="input-axis-initial-zones"
                  className="w-full text-xs font-medium border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddAxisModalOpen(false)}
                  className="px-3.5 py-1.5 font-medium text-xs text-slate-600 hover:text-slate-900 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  data-cy="btn-submit-create-axis"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs uppercase tracking-wider rounded-lg transition shadow-xs flex items-center gap-1.5"
                >
                  {submitting ? "Création..." : "Enregistrer l'Axe"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2 : MODIFIER UN AXE                                                  */}
      {/* ========================================================================= */}
      {editingAxis && (
        <div
          data-cy="modal-edit-axis-referentiel"
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                  <Edit2 className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Modifier l&apos;Axe Logistique
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    ID #{editingAxis.id} • {editingAxis.code}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingAxis(null)}
                className="text-slate-400 hover:text-slate-700 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateAxisSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                  Type d&apos;Axe :
                </label>
                <select
                  value={editAxisType}
                  onChange={(e) => setEditAxisType(e.target.value as "URBAIN" | "PROVINCE")}
                  className="w-full bg-white border border-slate-300 text-slate-800 text-xs font-semibold px-3 py-2 rounded-lg outline-none focus:border-blue-500"
                >
                  <option value="URBAIN">🛵 1. Réseau Urbain (Grand Tanà)</option>
                  <option value="PROVINCE">🚌 2. Expéditions Régionales (Province & Gares)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                  Code Unique : *
                </label>
                <input
                  type="text"
                  required
                  value={editAxisCode}
                  onChange={(e) => setEditAxisCode(e.target.value.toUpperCase())}
                  data-cy="input-edit-axis-code"
                  className="w-full font-mono text-xs font-bold border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                  Libellé Opérationnel : *
                </label>
                <input
                  type="text"
                  required
                  value={editAxisLibelle}
                  onChange={(e) => setEditAxisLibelle(e.target.value)}
                  data-cy="input-edit-axis-libelle"
                  className="w-full text-xs font-medium border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAxis(null)}
                  className="px-3.5 py-1.5 font-medium text-xs text-slate-600 hover:text-slate-900 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  data-cy="btn-submit-update-axis"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs uppercase tracking-wider rounded-lg transition shadow-xs flex items-center gap-1.5"
                >
                  {submitting ? "Modification..." : "Mettre à Jour"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3 : SUPPRIMER / DÉSACTIVER UN AXE                                    */}
      {/* ========================================================================= */}
      {deletingAxis && (
        <div
          data-cy="modal-delete-axis"
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 space-y-3.5 shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-rose-600">
              <span className="p-2 bg-rose-50 text-rose-600 rounded-lg border border-rose-100">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Désactiver l&apos;Axe Logistique
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  {deletingAxis.code}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <p>
                Êtes-vous sûr de vouloir désactiver l&apos;axe :{" "}
                <strong className="text-slate-900">{deletingAxis.libelle}</strong> ?
              </p>
              <p className="text-[11px] text-slate-500">
                💡 <strong>Conformité CDC (Section 14) :</strong> L&apos;axe ne sera pas supprimé physiquement pour préserver l&apos;intégrité de l&apos;historique comptable et des tournées passées. Il sera désactivé (`actif = 0`) et ne sera plus proposé pour les nouveaux colis.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingAxis(null)}
                className="px-3.5 py-1.5 font-medium text-xs text-slate-600 hover:text-slate-900 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmDeleteAxis}
                data-cy="btn-confirm-delete-axis"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs uppercase tracking-wider rounded-lg transition shadow-xs"
              >
                {submitting ? "Désactivation..." : "Confirmer la Désactivation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4 : GÉRER & AJOUTER DES QUARTIERS SUR UN AXE                        */}
      {/* ========================================================================= */}
      {isZoneModalOpen && selectedAxisForZone && (
        <div
          data-cy="modal-manage-zones"
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                  <MapPin className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Quartiers & Localités de l&apos;Axe
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {selectedAxisForZone.code} • {selectedAxisForZone.libelle}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsZoneModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm p-1"
              >
                ✕
              </button>
            </div>

            {/* List of current zones */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  Quartiers Rattachés ({selectedAxisForZone.zones?.length || 0}) :
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto flex flex-wrap gap-1.5">
                {selectedAxisForZone.zones && selectedAxisForZone.zones.length > 0 ? (
                  selectedAxisForZone.zones.map((zoneName, zIdx) => {
                    const detail = selectedAxisForZone.zones_detail?.find((z) => z.nom === zoneName);

                    return (
                      <span
                        key={zIdx}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-white text-slate-800 border border-slate-200 shadow-xs"
                      >
                        <span>{zoneName}</span>
                        {canManage && detail && (
                          <button
                            type="button"
                            onClick={() => handleRemoveZone(detail)}
                            title="Retirer ce quartier"
                            className="text-slate-400 hover:text-rose-600 transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 italic">Aucun quartier configuré pour cet axe.</p>
                )}
              </div>
            </div>

            {/* Form to add a new zone if canManage */}
            {canManage ? (
              <form onSubmit={handleAddZoneSubmit} className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                  Ajouter un Nouveau Quartier / Localité :
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="ex: Analamahitsy, Ilafy, Sabotsy..."
                    value={newZoneName}
                    onChange={(e) => setNewZoneName(e.target.value)}
                    data-cy="input-new-zone-name"
                    className="flex-1 text-xs font-medium border border-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 bg-white"
                  />
                  <button
                    type="submit"
                    disabled={submitting || !newZoneName.trim()}
                    data-cy="btn-submit-add-zone"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition shadow-xs"
                  >
                    {submitting ? "Ajout..." : "Ajouter"}
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-[11px] text-slate-400 italic text-center pt-2 border-t border-slate-100">
                🔒 Modification des quartiers réservée aux Superviseurs et Admins.
              </p>
            )}

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsZoneModalOpen(false)}
                className="px-3.5 py-1.5 font-medium text-xs text-slate-600 hover:text-slate-900 transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5 : AJOUTER COOPÉRATIVE / GARE PARTENAIRE                           */}
      {/* ========================================================================= */}
      {isAddPartnerModalOpen && (
        <div
          data-cy="modal-create-partner"
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-purple-50 text-purple-600 rounded-lg border border-purple-100">
                  <Bus className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Nouvelle Coopérative ou Gare Partenaire
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Réseau national d&apos;expéditions en Province
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddPartnerModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPartnerSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                  Nom du Partenaire : *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Cotisse Transport, Besady Plus..."
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-purple-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                  Type :
                </label>
                <select
                  value={partnerType}
                  onChange={(e) => setPartnerType(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 outline-none bg-white"
                >
                  <option value="COOPERATIVE">Coopérative Régionale</option>
                  <option value="GARE">Gare Routière Nationale</option>
                  <option value="CONFRERE">Confrère Dernier Kilomètre</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                  Gare de Rattachement :
                </label>
                <select
                  value={partnerStation}
                  onChange={(e) => setPartnerStation(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 outline-none bg-white"
                >
                  <option value="Gare Routière Ambodivona">Gare Routière Ambodivona (RN2 Toamasina, RN4 Majunga)</option>
                  <option value="Gare Fasan'ny Karana">Gare Fasan'ny Karana (RN7 Sud, Fianarantsoa/Tuléar)</option>
                  <option value="Gare Routière Andohatapenaka">Gare Routière Andohatapenaka (RN1 & Ouest)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                  Contact Guichet / Téléphone :
                </label>
                <input
                  type="text"
                  placeholder="ex: 034 11 222 33 / Guichet 12"
                  value={partnerContact}
                  onChange={(e) => setPartnerContact(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-purple-500 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddPartnerModalOpen(false)}
                  className="px-3.5 py-1.5 font-medium text-xs text-slate-600 hover:text-slate-900 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs uppercase tracking-wider rounded-lg transition shadow-xs flex items-center gap-1.5"
                >
                  {submitting ? "Création..." : "Enregistrer le Partenaire"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
