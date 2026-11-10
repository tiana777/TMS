"use client";

import React, { useState, useEffect } from "react";
import {
  Bike,
  Shield,
  ShieldAlert,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Phone,
  Compass,
  Package,
  Wallet,
  Lock,
  Unlock,
  Edit2,
  Trash2,
  RefreshCw,
  X,
  UserCheck,
  TrendingUp,
  MessageCircle,
} from "lucide-react";
import { Courier } from "@/types";
import {
  fetchCouriers,
  createCourier,
  updateCourierProfile,
  updateCourierAxis,
  updateCourierCapacity,
  toggleCourierStatus,
  deleteCourier,
} from "@/lib/api";
import { AXIS_METADATA } from "@/lib/axis";

type UserRole = "RECEPTIONNISTE" | "SUPERVISEUR" | "SUPER_ADMIN";

const VEHICLE_OPTIONS = [
  "Moto 125cc",
  "Moto 150cc",
  "Scooter 110cc",
  "Moto Cross 150cc",
  "Moto Trail 150cc",
  "Navette Fourgonnette",
  "Vélo Cargo",
];

export default function CouriersManagementPage() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [axisFilter, setAxisFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // User role state synced from HeaderUserRole / localStorage
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>("SUPERVISEUR");

  // Notification Toast / Alert
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReassignAxisModalOpen, setIsReassignAxisModalOpen] = useState(false);
  const [isAdjustCapModalOpen, setIsAdjustCapModalOpen] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<Courier | null>(null);

  // Form states for Create
  const [createForm, setCreateForm] = useState<{
    name: string;
    phone: string;
    vehicle_type: string;
    security_deposit: number | string;
    max_parcels: number | string;
    assigned_axis: string;
  }>({
    name: "",
    phone: "",
    vehicle_type: "Moto 125cc",
    security_deposit: 150000,
    max_parcels: 30,
    assigned_axis: "",
  });

  // Form states for Edit (Admin)
  const [editForm, setEditForm] = useState<{
    name: string;
    phone: string;
    vehicle_type: string;
    security_deposit: number | string;
    max_parcels: number | string;
    assigned_axis: string;
    active: boolean;
  }>({
    name: "",
    phone: "",
    vehicle_type: "",
    security_deposit: 0,
    max_parcels: 30,
    assigned_axis: "",
    active: true,
  });

  // Form state for Axis quick change
  const [targetAxis, setTargetAxis] = useState<string>("");

  // Form state for Capacity quick change
  const [targetCapacity, setTargetCapacity] = useState<number>(30);

  const isAdmin = currentUserRole === "SUPER_ADMIN";
  const isSuperviseur = currentUserRole === "SUPERVISEUR";

  // Sync role from localStorage / HeaderUserRole events
  useEffect(() => {
    const syncRole = () => {
      const saved = localStorage.getItem("tms_user_role") as UserRole | null;
      if (saved && (saved === "SUPERVISEUR" || saved === "SUPER_ADMIN" || saved === "RECEPTIONNISTE")) {
        setCurrentUserRole(saved);
      }
    };
    syncRole();
    window.addEventListener("tms_role_change", syncRole);
    return () => window.removeEventListener("tms_role_change", syncRole);
  }, []);

  const loadCouriers = async () => {
    setLoading(true);
    try {
      const data = await fetchCouriers("ALL", true);
      setCouriers(data);
    } catch (err: any) {
      showNotification("error", err.message || "Erreur de chargement des livreurs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCouriers();
  }, []);

  const showNotification = (type: "success" | "error" | "info", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Filtered Couriers
  const filteredCouriers = couriers.filter((c) => {
    // Status filter
    if (statusFilter === "ACTIVE" && !c.active) return false;
    if (statusFilter === "INACTIVE" && c.active) return false;

    // Axis filter
    if (axisFilter !== "ALL" && c.assigned_axis !== axisFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchPhone = (c.phone_formatted || c.phone || "").toLowerCase().includes(q);
      const matchVehicle = (c.vehicle_type || "").toLowerCase().includes(q);
      const matchAxis = (c.assigned_axis || "").toLowerCase().includes(q);
      return matchName || matchPhone || matchVehicle || matchAxis;
    }

    return true;
  });

  // Fleet Statistics
  const totalCouriers = couriers.length;
  const activeCouriersCount = couriers.filter((c) => c.active).length;
  const inTourCouriersCount = couriers.filter((c) => c.active_tour_id).length;
  const totalCapacityDeployed = couriers
    .filter((c) => c.active)
    .reduce((acc, c) => acc + (c.max_parcels || 30), 0);
  const totalAssignedToday = couriers.reduce((acc, c) => acc + (c.today_parcels_count || 0), 0);
  const totalDisputes = couriers.reduce((acc, c) => acc + (c.disputes_count || 0), 0);

  // Handlers
  const handleOpenCreateModal = () => {
    if (!isAdmin) {
      showNotification(
        "error",
        "Privilège insuffisant : Seule la Direction (Super Admin) est habilitée à créer un nouveau livreur."
      );
      return;
    }
    setCreateForm({
      name: "",
      phone: "",
      vehicle_type: "Moto 125cc",
      security_deposit: 150000,
      max_parcels: 30,
      assigned_axis: "",
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      showNotification("error", "Le nom du coursier est obligatoire.");
      return;
    }
    if (!createForm.phone.match(/^03[23478]\d{7}$/)) {
      showNotification(
        "error",
        "Numéro de téléphone invalide. Format attendu : 10 chiffres débutant par 032, 033, 034, 037 ou 038."
      );
      return;
    }
    if (Number(createForm.max_parcels) > 30) {
      showNotification("error", "Surcharge interdite : un livreur ne peut transporter que 30 colis au maximum.");
      return;
    }

    try {
      await createCourier({
        name: createForm.name.trim(),
        phone: createForm.phone.trim(),
        vehicle_type: createForm.vehicle_type,
        security_deposit: Number(createForm.security_deposit),
        max_parcels: Number(createForm.max_parcels),
        assigned_axis: createForm.assigned_axis,
      });
      showNotification("success", `Livreur ${createForm.name} créé et enregistré avec succès !`);
      setIsCreateModalOpen(false);
      loadCouriers();
    } catch (err: any) {
      showNotification("error", err.message || "Erreur lors de la création.");
    }
  };

  const handleOpenEditModal = (courier: Courier) => {
    if (!isAdmin) {
      showNotification(
        "error",
        "Privilège insuffisant : La modification du contrat (Caution, Téléphone officiel, Véhicule) est réservée au Super Admin."
      );
      return;
    }
    setSelectedCourier(courier);
    setEditForm({
      name: courier.name,
      phone: courier.phone,
      vehicle_type: courier.vehicle_type,
      security_deposit: courier.security_deposit,
      max_parcels: courier.max_parcels || 30,
      assigned_axis: courier.assigned_axis || "",
      active: courier.active,
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourier) return;

    if (Number(editForm.max_parcels) > 30) {
      showNotification("error", "Surcharge interdite : un livreur ne peut transporter que 30 colis au maximum.");
      return;
    }

    try {
      await updateCourierProfile(selectedCourier.id, {
        name: editForm.name,
        phone: editForm.phone,
        vehicle_type: editForm.vehicle_type,
        security_deposit: Number(editForm.security_deposit),
        max_parcels: Number(editForm.max_parcels),
        assigned_axis: editForm.assigned_axis || null,
        active: editForm.active,
      });
      showNotification("success", `Profil et contrat de ${editForm.name} mis à jour avec succès.`);
      setIsEditModalOpen(false);
      loadCouriers();
    } catch (err: any) {
      showNotification("error", err.message || "Erreur de mise à jour.");
    }
  };

  const handleOpenReassignAxis = (courier: Courier) => {
    setSelectedCourier(courier);
    setTargetAxis(courier.assigned_axis || "AXE_CENTRE_1");
    setIsReassignAxisModalOpen(true);
  };

  const handleReassignAxisSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourier) return;

    try {
      await updateCourierAxis(selectedCourier.id, targetAxis);
      showNotification(
        "success",
        `Axe du livreur ${selectedCourier.name} réaffecté vers ${
          AXIS_METADATA[targetAxis]?.label || targetAxis
        }.`
      );
      setIsReassignAxisModalOpen(false);
      loadCouriers();
    } catch (err: any) {
      showNotification("error", err.message || "Erreur lors de la réaffectation d'axe.");
    }
  };

  const handleOpenAdjustCapacity = (courier: Courier) => {
    setSelectedCourier(courier);
    setTargetCapacity(courier.max_parcels || 30);
    setIsAdjustCapModalOpen(true);
  };

  const handleAdjustCapacitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourier) return;

    if (targetCapacity > 30) {
      showNotification("error", "Surcharge interdite : un livreur ne peut transporter que 30 colis au maximum.");
      return;
    }

    try {
      await updateCourierCapacity(selectedCourier.id, targetCapacity);
      showNotification(
        "success",
        `Capacité journalière de ${selectedCourier.name} ajustée à ${targetCapacity} colis.`
      );
      setIsAdjustCapModalOpen(false);
      loadCouriers();
    } catch (err: any) {
      showNotification("error", err.message || "Erreur lors de l'ajustement de capacité.");
    }
  };

  const handleToggleStatus = async (courier: Courier) => {
    if (!isAdmin) {
      showNotification(
        "error",
        "Action refusée : Seule la Direction (Super Admin) peut activer ou désactiver un coursier."
      );
      return;
    }

    try {
      await toggleCourierStatus(courier.id);
      showNotification(
        "success",
        `Statut du livreur ${courier.name} basculé à ${courier.active ? "INACTIF" : "ACTIF"}.`
      );
      loadCouriers();
    } catch (err: any) {
      showNotification("error", err.message || "Impossible de modifier le statut.");
    }
  };

  const handleDeleteCourier = async (courier: Courier) => {
    if (!isAdmin) {
      showNotification(
        "error",
        "Action refusée : Seule la Direction (Super Admin) est autorisée à archiver un livreur."
      );
      return;
    }

    if (!confirm(`Confirmez-vous l'archivage du livreur ${courier.name} (ID: #${courier.id}) ?`)) {
      return;
    }

    try {
      await deleteCourier(courier.id);
      showNotification("success", `Livreur ${courier.name} archivé avec succès.`);
      loadCouriers();
    } catch (err: any) {
      showNotification("error", err.message || "Erreur lors de l'archivage.");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Role Banner / Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Bike className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">
                04. Gestion de la Flotte des Livreurs
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Pilotage opérationnel des tournées urbaines, navettes et gouvernance de la flotte (CDC Section 3 & 14)
              </p>
            </div>
          </div>
        </div>

        {/* Active Role Indicator */}
        <div className="flex items-center gap-3">
          <div
            data-cy="role-badge-indicator"
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${
              isAdmin
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : isSuperviseur
                ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                : "bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            {isAdmin ? <Shield className="w-4 h-4 text-emerald-600" /> : <ShieldAlert className="w-4 h-4 text-indigo-600" />}
            <span>
              Profil Actif : {isAdmin ? "👑 Super Admin (Direction)" : isSuperviseur ? "👔 Superviseur Logistique" : "📋 Réceptionniste"}
            </span>
          </div>

          <button
            onClick={loadCouriers}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition text-slate-600"
            title="Rafraîchir la flotte"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* RBAC Rules Description Card */}
      <div
        data-cy="rbac-explanation-card"
        className={`p-3.5 rounded-xl text-xs border ${
          isAdmin
            ? "bg-emerald-50/70 border-emerald-200/80 text-emerald-900"
            : "bg-indigo-50/70 border-indigo-200/80 text-indigo-900"
        }`}
      >
        <div className="flex items-start gap-2.5">
          {isAdmin ? <Unlock className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" /> : <Lock className="w-4 h-4 mt-0.5 text-indigo-600 shrink-0" />}
          <div>
            <span className="font-bold uppercase tracking-wider text-[11px]">
              {isAdmin ? "Habilitations Super Admin Débloquées" : "Habilitations Opérationnelles Superviseur"} :
            </span>
            <p className="mt-0.5 leading-relaxed">
              {isAdmin
                ? "En tant que Super Admin (Direction), vous disposez du super-privilège : création de coursier, gestion de la caution de garantie, modification contractuelle complète, activation/désactivation et archivage."
                : "En tant que Superviseur, vous assurez le pilotage quotidien : réaffectation rapide d'axe selon la charge et ajustement de la capacité maximale journalière (10 à 30 colis). La création, modification contractuelle, caution financière et désactivation restent verrouillées pour la Direction."}
            </p>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div
          data-cy={`alert-${notification.type}`}
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : notification.type === "error"
              ? "bg-rose-50 text-rose-800 border border-rose-200"
              : "bg-blue-50 text-blue-800 border border-blue-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : notification.type === "error" ? (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Fleet KPI Cockpit */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Flotte Totale</p>
          <p data-cy="kpi-total-couriers" className="text-xl font-black text-slate-900 mt-1">
            {totalCouriers} <span className="text-xs font-normal text-slate-400">coursiers</span>
          </p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Livreurs Actifs</p>
          <p data-cy="kpi-active-couriers" className="text-xl font-black text-emerald-700 mt-1">
            {activeCouriersCount}{" "}
            <span className="text-xs font-normal text-slate-400">
              ({totalCouriers ? Math.round((activeCouriersCount / totalCouriers) * 100) : 0}%)
            </span>
          </p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">En Tournée (Direct)</p>
          <p data-cy="kpi-in-tour" className="text-xl font-black text-blue-700 mt-1">
            {inTourCouriersCount} <span className="text-xs font-normal text-slate-400">déployés</span>
          </p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider">Charge / Capacité</p>
          <p data-cy="kpi-capacity" className="text-xl font-black text-purple-700 mt-1">
            {totalAssignedToday} / {totalCapacityDeployed}{" "}
            <span className="text-xs font-normal text-slate-400">colis</span>
          </p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Litiges Actifs</p>
          <p data-cy="kpi-disputes" className="text-xl font-black text-amber-700 mt-1">
            {totalDisputes} <span className="text-xs font-normal text-slate-400">dossiers</span>
          </p>
        </div>
      </div>

      {/* Control & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              data-cy="search-courier-input"
              type="text"
              placeholder="Rechercher nom, téléphone, moto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50"
            />
          </div>

          {/* Filter Axis */}
          <select
            data-cy="filter-axis-select"
            value={axisFilter}
            onChange={(e) => setAxisFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">Tous les Axes (Flotte Globale)</option>
            {Object.entries(AXIS_METADATA).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>

          {/* Filter Status */}
          <select
            data-cy="filter-status-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">Tous Statuts (Actifs & Inactifs)</option>
            <option value="ACTIVE">Actifs uniquement</option>
            <option value="INACTIVE">Inactifs / Archivés</option>
          </select>
        </div>

        {/* Action Button: Nouveau Livreur (Role Differentiated) */}
        <div>
          {isAdmin ? (
            <button
              data-cy="btn-open-create-courier"
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nouveau Livreur (Direction)</span>
            </button>
          ) : (
            <button
              data-cy="btn-open-create-courier-disabled"
              onClick={() =>
                showNotification(
                  "error",
                  "Création réservée à la Direction (Super Admin). Le Superviseur pilote les affectations."
                )
              }
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold border border-slate-200 cursor-not-allowed"
              title="Réservé au Super Admin"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Nouveau Livreur (Réservé Admin)</span>
            </button>
          )}
        </div>
      </div>

      {/* Couriers Grid */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">Chargement de la flotte des coursiers...</p>
        </div>
      ) : filteredCouriers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Bike className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">Aucun coursier ne correspond aux critères.</p>
          <p className="text-xs text-slate-400 mt-1">Modifiez vos filtres ou effectuez une recherche différente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCouriers.map((courier) => {
            const axisMeta = courier.assigned_axis ? AXIS_METADATA[courier.assigned_axis] : null;
            const currentParcels = courier.today_parcels_count || 0;
            const maxCap = courier.max_parcels || 30;
            const capPercent = Math.min(100, Math.round((currentParcels / maxCap) * 100));

            return (
              <div
                key={courier.id}
                data-cy={`courier-card-${courier.id}`}
                className={`bg-white rounded-2xl border transition shadow-xs hover:shadow-md flex flex-col justify-between ${
                  courier.active ? "border-slate-200" : "border-slate-200 bg-slate-50/60 opacity-80"
                }`}
              >
                {/* Card Header */}
                <div className="p-4 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shadow-xs ${
                          courier.active ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        <Bike className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 data-cy={`courier-name-${courier.id}`} className="font-bold text-slate-900 text-sm">
                            {courier.name}
                          </h3>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-semibold">
                            #{courier.id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span className="font-mono">{courier.phone_formatted || courier.phone}</span>
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex flex-col items-end gap-1">
                      <span
                        data-cy={`courier-status-${courier.id}`}
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          courier.active
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-slate-200 text-slate-600 border border-slate-300"
                        }`}
                      >
                        {courier.active ? "Actif" : "Inactif"}
                      </span>
                      {courier.active_tour_id && (
                        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 animate-pulse">
                          En Tournée
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Vehicle & Axis Tag */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      🛵 {courier.vehicle_type}
                    </span>
                    <span
                      data-cy={`courier-axis-${courier.id}`}
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                        axisMeta?.badgeColor || "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {axisMeta?.label || courier.assigned_axis || "Axe Non Assigné"}
                    </span>
                  </div>
                </div>

                {/* Card Body : Operational Metrics & Financials */}
                <div className="p-4 space-y-3 flex-1 bg-slate-50/40">
                  {/* Capacity Meter */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500 font-medium">Charge du jour</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {currentParcels} / {maxCap} colis ({capPercent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          capPercent >= 100
                            ? "bg-rose-500"
                            : capPercent >= 75
                            ? "bg-amber-500"
                            : "bg-blue-600"
                        }`}
                        style={{ width: `${capPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Financial & Caution Guarantee */}
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Wallet className="w-3.5 h-3.5 text-slate-400" />
                      <span>Caution Garantie :</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 font-mono">
                        {courier.security_deposit_formatted || `${courier.security_deposit.toLocaleString("fr-FR")} Ar`}
                      </span>
                      {!isAdmin && (
                        <span title="Verrouillé pour la Direction (Super Admin)">
                          <Lock className="w-3 h-3 text-slate-400" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Disputes warning */}
                  {courier.disputes_count && courier.disputes_count > 0 ? (
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        <strong>{courier.disputes_count} litige(s)</strong> / déficit caisse en cours.
                      </span>
                    </div>
                  ) : null}
                </div>

                {/* Card Footer : Role-differentiated Actions */}
                <div className="p-3 border-t border-slate-100 bg-white rounded-b-2xl flex items-center justify-between gap-1.5">
                  {/* Operational actions: Available to Superviseur AND Super Admin */}
                  <div className="flex items-center gap-1.5 flex-1">
                    <button
                      data-cy={`btn-reassign-axis-${courier.id}`}
                      onClick={() => handleOpenReassignAxis(courier)}
                      className="px-2.5 py-1.5 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition flex items-center gap-1"
                      title="Changer l'axe quotidien"
                    >
                      <Compass className="w-3 h-3 text-slate-500" />
                      <span>Axe</span>
                    </button>

                    <button
                      data-cy={`btn-adjust-cap-${courier.id}`}
                      onClick={() => handleOpenAdjustCapacity(courier)}
                      className="px-2.5 py-1.5 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition flex items-center gap-1"
                      title="Ajuster la capacité max journalière"
                    >
                      <TrendingUp className="w-3 h-3 text-slate-500" />
                      <span>Capacité ({maxCap})</span>
                    </button>
                  </div>

                  {/* Contractual / Governance actions: Super Admin ONLY */}
                  <div className="flex items-center gap-1">
                    {isAdmin ? (
                      <>
                        <button
                          data-cy={`btn-edit-contract-${courier.id}`}
                          onClick={() => handleOpenEditModal(courier)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Modifier Contrat & Caution (Admin)"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          data-cy={`btn-toggle-status-${courier.id}`}
                          onClick={() => handleToggleStatus(courier)}
                          className={`p-1.5 rounded-lg transition ${
                            courier.active
                              ? "text-amber-600 hover:bg-amber-50"
                              : "text-emerald-600 hover:bg-emerald-50"
                          }`}
                          title={courier.active ? "Désactiver le livreur" : "Réactiver le livreur"}
                        >
                          {courier.active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          data-cy={`btn-delete-courier-${courier.id}`}
                          onClick={() => handleDeleteCourier(courier)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                          title="Archiver le livreur"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <span
                        data-cy={`locked-admin-tools-${courier.id}`}
                        className="flex items-center gap-1 text-[10px] text-slate-400 px-2 py-1 bg-slate-50 rounded border border-slate-200"
                        title="Actions contractuelles réservées au Super Admin"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Admin</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1 : CRÉATION NOUVEAU LIVREUR (Super Admin Exclusif)  */}
      {/* ========================================================= */}
      {isCreateModalOpen && (
        <div
          data-cy="modal-create-courier"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Shield className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Nouveau Contrat Livreur (Direction)</h3>
                  <p className="text-[11px] text-slate-500">Recrutement et immatriculation dans le système</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nom Complet du Coursier *</label>
                <input
                  data-cy="input-courier-name"
                  type="text"
                  required
                  placeholder="ex: RAKOTOARISOA Hery"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Téléphone Malgache (10 ch.) *</label>
                  <input
                    data-cy="input-courier-phone"
                    type="text"
                    required
                    placeholder="ex: 0341234567"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value.replace(/\s+/g, "") })}
                    className="w-full text-xs font-mono border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Préfixes valides : 032, 033, 034, 037, 038</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Type de Véhicule *</label>
                  <select
                    data-cy="select-courier-vehicle"
                    value={createForm.vehicle_type}
                    onChange={(e) => setCreateForm({ ...createForm, vehicle_type: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {VEHICLE_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Caution Garantie (Ar) *</label>
                  <input
                    data-cy="input-courier-deposit"
                    type="number"
                    step="10000"
                    min="0"
                    required
                    value={createForm.security_deposit}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        security_deposit: e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                    className="w-full text-xs font-mono border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Bloquée en cas de sinistre / litige caisse</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Capacité Max (colis, max 30) *</label>
                  <input
                    data-cy="input-courier-capacity"
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={createForm.max_parcels}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        max_parcels: e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                    className="w-full text-xs font-mono border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Axe Logistique Principal (Optionnel)</label>
                <select
                  data-cy="select-courier-axis"
                  value={createForm.assigned_axis}
                  onChange={(e) => setCreateForm({ ...createForm, assigned_axis: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Flotte Globale (Non assigné directement)</option>
                  {Object.entries(AXIS_METADATA).map(([k, meta]) => (
                    <option key={k} value={k}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  data-cy="btn-submit-create-courier"
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
                >
                  Enregistrer le Livreur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2 : ÉDITION CONTRACTUELLE COMPLÈTE (Super Admin)    */}
      {/* ========================================================= */}
      {isEditModalOpen && selectedCourier && (
        <div
          data-cy="modal-edit-courier"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                  <Edit2 className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Édition Contractuelle : {selectedCourier.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">Mise à jour des paramètres contractuels et financiers</p>
                </div>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nom Complet *</label>
                <input
                  data-cy="input-edit-courier-name"
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Téléphone Officiel *</label>
                  <input
                    data-cy="input-edit-courier-phone"
                    type="text"
                    required
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value.replace(/\s+/g, "") })}
                    className="w-full text-xs font-mono border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Véhicule Assigné *</label>
                  <select
                    data-cy="select-edit-courier-vehicle"
                    value={editForm.vehicle_type}
                    onChange={(e) => setEditForm({ ...editForm, vehicle_type: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {VEHICLE_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Caution Garantie (Ar) *</label>
                  <input
                    data-cy="input-edit-courier-deposit"
                    type="number"
                    step="10000"
                    min="0"
                    required
                    value={editForm.security_deposit}
                    onChange={(e) => setEditForm({ ...editForm, security_deposit: Number(e.target.value) })}
                    className="w-full text-xs font-mono border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Capacité Max (colis, max 30) *</label>
                  <input
                    data-cy="input-edit-courier-capacity"
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={editForm.max_parcels}
                    onChange={(e) => setEditForm({ ...editForm, max_parcels: Number(e.target.value) })}
                    className="w-full text-xs font-mono border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Axe Logistique Assigné</label>
                <select
                  data-cy="select-edit-courier-axis"
                  value={editForm.assigned_axis}
                  onChange={(e) => setEditForm({ ...editForm, assigned_axis: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Aucun axe assigné</option>
                  {Object.entries(AXIS_METADATA).map(([k, meta]) => (
                    <option key={k} value={k}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  data-cy="btn-submit-edit-courier"
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
                >
                  Mettre à jour le Contrat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3 : RÉAFFECTATION RAPIDE D'AXE (Superviseur & Admin) */}
      {/* ========================================================= */}
      {isReassignAxisModalOpen && selectedCourier && (
        <div
          data-cy="modal-reassign-axis"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in"
        >
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-100 text-indigo-800 rounded-xl">
                  <Compass className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Réaffecter l'Axe de Tournée</h3>
                  <p className="text-[11px] text-slate-500">
                    Livreur : <span className="font-bold text-slate-800">{selectedCourier.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReassignAxisModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReassignAxisSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sélectionner le nouvel Axe Logistique :
                </label>
                <select
                  data-cy="select-target-axis"
                  value={targetAxis}
                  onChange={(e) => setTargetAxis(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {Object.entries(AXIS_METADATA).map(([k, meta]) => (
                    <option key={k} value={k}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-[11px] text-indigo-900 leading-relaxed">
                ℹ️ <strong>Règle Métier Superviseur :</strong> La réaffectation d'axe prend effet immédiatement
                pour les prochains dispatchings et tournées du jour.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReassignAxisModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  data-cy="btn-submit-reassign-axis"
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
                >
                  Confirmer la Réaffectation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4 : AJUSTEMENT CAPACITÉ MAX (Superviseur & Admin)    */}
      {/* ========================================================= */}
      {isAdjustCapModalOpen && selectedCourier && (
        <div
          data-cy="modal-adjust-capacity"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in"
        >
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-purple-100 text-purple-800 rounded-xl">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Ajuster la Capacité Quotidienne</h3>
                  <p className="text-[11px] text-slate-500">
                    Livreur : <span className="font-bold text-slate-800">{selectedCourier.name}</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setIsAdjustCapModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustCapacitySubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Plafond Maximum de Colis pour la Tournée (Max 30) :
                </label>
                <div className="flex items-center gap-3">
                  <input
                    data-cy="input-target-capacity"
                    type="range"
                    min="5"
                    max="30"
                    value={targetCapacity}
                    onChange={(e) => setTargetCapacity(Number(e.target.value))}
                    className="flex-1 accent-purple-600 cursor-pointer"
                  />
                  <span
                    data-cy="target-capacity-display"
                    className="w-14 text-center font-bold text-sm font-mono py-1 px-2 bg-purple-50 text-purple-800 border border-purple-200 rounded-xl"
                  >
                    {targetCapacity}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 pt-1">
                {[10, 15, 20, 30].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTargetCapacity(preset)}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                      targetCapacity === preset
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {preset} colis
                  </button>
                ))}
              </div>

              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 text-[11px] text-purple-900 leading-relaxed">
                💡 <strong>Gestion Opérationnelle Quotidienne :</strong> Permet au Superviseur d'augmenter le
                plafond en période de pointe (jusqu'à 30 colis) ou de le réduire en cas de météo pluvieuse ou de
                véhicule de remplacement.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustCapModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  data-cy="btn-submit-adjust-capacity"
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition"
                >
                  Appliquer la Capacité
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
