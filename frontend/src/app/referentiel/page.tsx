"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Compass,
  Bus,
  MapPin,
  Plus,
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
  FileText,
  Save,
  Users,
  UserPlus,
  Key,
  Lock,
  Unlock,
  Mail,
  Phone,
  Eye,
  EyeOff,
  UserCheck,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { AxisInfo, Courier, Partner, UserItem, ZoneDetail } from "@/types";
import { useCompany } from "@/context/CompanyContext";
import {
  addZoneToAxis,
  createAxis,
  createCourier,
  createPartner,
  updatePartner,
  deletePartner,
  createUser,
  deleteAxis,
  fetchAxes,
  fetchCouriers,
  fetchPartners,
  fetchUsers,
  removeZoneFromAxis,
  toggleUserStatus,
  updateAxis,
  updateCourierAxis,
} from "@/lib/api";

type UserRole = "RECEPTIONNISTE" | "SUPERVISEUR" | "SUPER_ADMIN";

export default function ReferentielPage() {
  const { company, saveCompany } = useCompany();
  const [axes, setAxes] = useState<AxisInfo[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"AXES" | "PARTNERS" | "COURIERS" | "USERS" | "COMPANY">("AXES");
  const [axisFilter, setAxisFilter] = useState<"ALL" | "URBAIN" | "PROVINCE">("ALL");

  // User tab filtering and state
  const [userRoleFilter, setUserRoleFilter] = useState<string>("ALL");
  const [userSearchQuery, setUserSearchQuery] = useState<string>("");
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState<boolean>(false);
  const [newUserForm, setNewUserForm] = useState({
    username: "",
    nom_complet: "",
    email: "",
    role: "RECEPTIONNISTE",
    assigned_flux: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Add courier modal state for Referentiel
  const [isAddCourierModalOpen, setIsAddCourierModalOpen] = useState<boolean>(false);
  const [newCourierForm, setNewCourierForm] = useState<{
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


  // Company settings form state
  const [companyForm, setCompanyForm] = useState({
    app_name: "",
    company_name: "",
    nif: "",
    stat: "",
    rcs: "",
    cif: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    currency: "MGA",
    footer_text: "",
    logo_url: "",
  });
  const [isSavingCompany, setIsSavingCompany] = useState<boolean>(false);

  useEffect(() => {
    if (company) {
      setCompanyForm({
        app_name: company.app_name || "",
        company_name: company.company_name || "",
        nif: company.nif || "",
        stat: company.stat || "",
        rcs: company.rcs || "",
        cif: company.cif || "",
        address: company.address || "",
        phone: company.phone || "",
        email: company.email || "",
        website: company.website || "",
        currency: company.currency || "MGA",
        footer_text: company.footer_text || "",
        logo_url: company.logo_url || "",
      });
    }
  }, [company]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Le fichier est trop volumineux. Veuillez choisir une image de moins de 5 Mo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      // Optimisation et redimensionnement automatique en canvas pour alléger le stockage
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const optimized = canvas.toDataURL("image/png");
          setCompanyForm((prev) => ({ ...prev, logo_url: optimized }));
        } else {
          setCompanyForm((prev) => ({ ...prev, logo_url: dataUrl }));
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

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
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [deletingPartner, setDeletingPartner] = useState<Partner | null>(null);
  const [partnerName, setPartnerName] = useState<string>("");
  const [partnerType, setPartnerType] = useState<string>("COOPERATIVE");
  const [partnerContact, setPartnerContact] = useState<string>("");
  const [partnerStation, setPartnerStation] = useState<string>("Ambodivona");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [axList, partList, courList, userList] = await Promise.all([
        fetchAxes(),
        fetchPartners(),
        fetchCouriers("ALL", true),
        fetchUsers(),
      ]);
      setAxes(axList);
      setPartners(partList);
      setCouriers(courList);
      setUsers(userList);
    } catch (e) {
      console.error("Erreur chargement référentiel", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCourierAxisChange(courierId: number, newAxis: string) {
    try {
      await updateCourierAxis(courierId, newAxis === "NONE" ? null : newAxis);
      setCouriers((prev) =>
        prev.map((c) =>
          c.id === courierId ? { ...c, assigned_axis: newAxis === "NONE" ? null : newAxis } : c
        )
      );
      setFeedbackMessage({
        type: "success",
        text: `L'axe du coursier a été mis à jour avec succès !`,
      });
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      setFeedbackMessage({
        type: "error",
        text: err.message || "Erreur lors de la mise à jour de l'axe du coursier.",
      });
    }
  }

  async function handleAddCourierSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newCourierForm.name.trim()) {
      alert("Le nom complet du coursier est obligatoire.");
      return;
    }
    const cleanPhone = newCourierForm.phone.replace(/\s+/g, "");
    if (!cleanPhone.match(/^03[23478]\d{7}$/)) {
      alert("Numéro de téléphone invalide. Format attendu : 10 chiffres (ex: 0341234567).");
      return;
    }
    if (Number(newCourierForm.max_parcels) > 30) {
      alert("Surcharge interdite : un livreur ne peut transporter que 30 colis au maximum.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createCourier({
        name: newCourierForm.name.trim(),
        phone: cleanPhone,
        vehicle_type: newCourierForm.vehicle_type,
        security_deposit: Number(newCourierForm.security_deposit) || 0,
        max_parcels: Number(newCourierForm.max_parcels) || 30,
        assigned_axis: newCourierForm.assigned_axis || null,
      });
      setCouriers((prev) => [...prev, created]);
      setFeedbackMessage({
        type: "success",
        text: `Livreur ${created.name} créé et enregistré avec succès dans la flotte !`,
      });
      setIsAddCourierModalOpen(false);
      setNewCourierForm({
        name: "",
        phone: "",
        vehicle_type: "Moto 125cc",
        security_deposit: 150000,
        max_parcels: 30,
        assigned_axis: "",
      });
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || "Erreur lors de la création du livreur.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddUserSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newUserForm.username.trim() || newUserForm.username.trim().length < 3) {
      alert("L'identifiant doit comporter au moins 3 caractères.");
      return;
    }
    if (!newUserForm.nom_complet.trim()) {
      alert("Le nom complet de l'utilisateur est obligatoire.");
      return;
    }
    if (!newUserForm.email.trim()) {
      alert("L'adresse email est obligatoire.");
      return;
    }
    if (!newUserForm.password || newUserForm.password.length < 4) {
      alert("Le mot de passe doit comporter au moins 4 caractères.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createUser({
        username: newUserForm.username.trim(),
        nom_complet: newUserForm.nom_complet.trim(),
        email: newUserForm.email.trim(),
        role: newUserForm.role,
        assigned_flux: newUserForm.role === "RECEPTIONNISTE" && newUserForm.assigned_flux ? newUserForm.assigned_flux : null,
        password: newUserForm.password,
      });
      setUsers((prev) => [...prev, created]);
      setFeedbackMessage({
        type: "success",
        text: `Utilisateur ${created.nom_complet} (@${created.username}) créé avec succès !`,
      });
      setIsAddUserModalOpen(false);
      setNewUserForm({
        username: "",
        nom_complet: "",
        email: "",
        role: "RECEPTIONNISTE",
        assigned_flux: "",
        password: "",
      });
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || "Erreur lors de la création de l'utilisateur.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleUser(userItem: UserItem) {
    try {
      const updated = await toggleUserStatus(userItem.id);
      setUsers((prev) => prev.map((u) => (u.id === userItem.id ? updated : u)));
      setFeedbackMessage({
        type: "success",
        text: `Compte de ${userItem.nom_complet} désormais ${updated.actif ? "ACTIF" : "DÉSACTIVÉ"}.`,
      });
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || "Erreur lors du changement de statut de l'utilisateur.");
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
  function handleOpenAddPartner() {
    setEditingPartner(null);
    setPartnerName("");
    setPartnerType("COOPERATIVE");
    setPartnerContact("");
    setPartnerStation("Ambodivona");
    setIsAddPartnerModalOpen(true);
  }

  function handleOpenEditPartner(p: Partner) {
    setEditingPartner(p);
    setPartnerName(p.nom);
    setPartnerType(p.type || "COOPERATIVE");
    setPartnerContact(p.contact || "");
    setPartnerStation(p.gare_rattachement || "");
    setIsAddPartnerModalOpen(true);
  }

  async function handleDeletePartnerConfirm(p: Partner) {
    setSubmitting(true);
    try {
      await deletePartner(p.id);
      setPartners((prev) => prev.filter((item) => item.id !== p.id));
      setDeletingPartner(null);
      setFeedbackMessage({
        type: "success",
        text: `Partenaire "${p.nom}" supprimé avec succès.`,
      });
      setTimeout(() => setFeedbackMessage(null), 4000);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Erreur lors de la suppression du partenaire.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddPartnerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!partnerName.trim()) {
      alert("Le nom de la coopérative ou gare est obligatoire.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        nom: partnerName.trim(),
        type: partnerType,
        contact: partnerContact.trim() || undefined,
        gare_rattachement: partnerStation.trim() || undefined,
      };

      if (editingPartner) {
        const updated = await updatePartner(editingPartner.id, payload);
        setPartners((prev) =>
          prev.map((item) => (item.id === editingPartner.id ? updated : item))
        );
        setFeedbackMessage({
          type: "success",
          text: `Partenaire "${updated.nom}" mis à jour avec succès.`,
        });
      } else {
        const created = await createPartner(payload);
        setPartners((prev) => [...prev, created]);
        setFeedbackMessage({
          type: "success",
          text: `Nouveau partenaire "${created.nom}" enregistré avec succès.`,
        });
      }

      setIsAddPartnerModalOpen(false);
      setEditingPartner(null);
      setPartnerName("");
      setPartnerContact("");
      setPartnerStation("Ambodivona");
      setTimeout(() => setFeedbackMessage(null), 4000);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'enregistrement du partenaire.");
    } finally {
      setSubmitting(false);
    }
  }

  // --- Handler for Company & Invoicing Settings ---
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.app_name.trim() || !companyForm.company_name.trim()) {
      alert("Le nom de l'application et la raison sociale sont obligatoires.");
      return;
    }
    if (!companyForm.nif.trim() || !companyForm.stat.trim()) {
      alert("Le NIF et le STAT de l'entreprise sont obligatoires pour la facturation légale.");
      return;
    }
    setIsSavingCompany(true);
    try {
      await saveCompany(companyForm);
      setFeedbackMessage({
        type: "success",
        text: "Identité de l'entreprise et mentions fiscales de facturation enregistrées avec succès !",
      });
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'enregistrement des paramètres de l'entreprise.");
    } finally {
      setIsSavingCompany(false);
    }
  };

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
              onClick={handleOpenAddPartner}
              data-cy="btn-create-partner"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Nouvelle Coopérative ou Gare</span>
            </button>
          )}

          {activeTab === "COURIERS" && canManage && (
            <button
              onClick={() => setIsAddCourierModalOpen(true)}
              data-cy="btn-create-courier-top"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Nouveau Livreur</span>
            </button>
          )}

          {activeTab === "USERS" && canManage && (
            <button
              onClick={() => setIsAddUserModalOpen(true)}
              data-cy="btn-create-user-top"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Nouvel Utilisateur</span>
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

      {/* Main Tabs (Axes vs Partenaires vs Livreurs vs Utilisateurs vs Entreprise) */}
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

        <button
          onClick={() => setActiveTab("COURIERS")}
          data-cy="tab-couriers"
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === "COURIERS"
              ? "bg-white text-emerald-700 shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Truck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Livreurs & Affectation des Axes</span>
          <span className="ml-1 px-1.5 py-0.2 text-[10px] font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            {couriers.length} livreurs
          </span>
        </button>

        <button
          onClick={() => setActiveTab("USERS")}
          data-cy="tab-users"
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === "USERS"
              ? "bg-white text-indigo-700 shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Users className="w-3.5 h-3.5 text-indigo-600" />
          <span>Comptes & Utilisateurs</span>
          <span className="ml-1 px-1.5 py-0.2 text-[10px] font-semibold rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60">
            {users.length} comptes
          </span>
        </button>

        <button
          onClick={() => setActiveTab("COMPANY")}
          data-cy="tab-company"
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === "COMPANY"
              ? "bg-white text-amber-700 shadow-xs border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-amber-600" />
          <span>Identité Entreprise & Facturation</span>
          <span className="ml-1 px-1.5 py-0.2 text-[10px] font-semibold rounded bg-amber-50 text-amber-700 border border-amber-200/60">
            Dynamique
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
                    <div className="mt-2.5 flex flex-wrap gap-1 max-h-36 overflow-y-auto pr-1">
                      {axe.zones_detail && axe.zones_detail.length > 0 ? (
                        axe.zones_detail.map((zDetail, zIdx) => {
                          const isGare = zDetail.type === "gare";
                          const isCoop = zDetail.type === "cooperative";
                          return (
                            <span
                              key={zDetail.id || zIdx}
                              title={
                                zDetail.destinations
                                  ? `${zDetail.nom} • Destinations : ${zDetail.destinations} (${zDetail.tarif_livraison || 3000} Ar)`
                                  : `${zDetail.nom} (${zDetail.tarif_livraison || 3000} Ar)`
                              }
                              className={`px-1.5 py-0.5 text-[10px] rounded border transition inline-flex items-center gap-1 ${
                                isGare
                                  ? "bg-purple-100/80 text-purple-900 border-purple-300 font-bold shadow-2xs"
                                  : isCoop
                                  ? "bg-amber-100/80 text-amber-900 border-amber-300 font-bold shadow-2xs"
                                  : isProvince
                                  ? "bg-purple-50/70 text-purple-700 border-purple-200/70 font-medium"
                                  : "bg-blue-50/70 text-blue-700 border-blue-200/70 font-medium"
                              }`}
                            >
                              {isGare && <span className="text-[10px]">🚌</span>}
                              {isCoop && <span className="text-[10px]">🤝</span>}
                              <span>{zDetail.nom}</span>
                            </span>
                          );
                        })
                      ) : axe.zones && axe.zones.length > 0 ? (
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
            {canManage && (
              <button
                type="button"
                onClick={handleOpenAddPartner}
                data-cy="btn-add-partner-table"
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Nouvelle Gare ou Coopérative</span>
              </button>
            )}
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
                  <th className="py-2.5 px-3 text-right">Actions</th>
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
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditPartner(p)}
                            data-cy={`btn-edit-partner-${p.id}`}
                            className="p-1 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded transition cursor-pointer"
                            title="Modifier ce partenaire"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingPartner(p)}
                            data-cy={`btn-delete-partner-${p.id}`}
                            className="p-1 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded transition cursor-pointer"
                            title="Supprimer ce partenaire"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredPartners.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
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
      {/* TAB 3: LIVREURS & AFFECTATION DES AXES RADIAUX (CDC ÉCRAN 03 & 10)         */}
      {/* ========================================================================= */}
      {activeTab === "COURIERS" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                <Truck className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Flotte des Livreurs & Rattachement par Axe Logistique
                </h3>
                <p className="text-[11px] text-slate-500">
                  Affectez chaque livreur titulaire à son corridor de distribution (Axe Centre, RN1, RN2, etc.)
                </p>
              </div>
            </div>
            {canManage && (
              <button
                onClick={() => setIsAddCourierModalOpen(true)}
                data-cy="btn-open-add-courier-modal"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Nouveau Livreur</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Livreur / Coursier</th>
                  <th className="py-2.5 px-3">Contact Téléphonique</th>
                  <th className="py-2.5 px-3">Véhicule & Capacité</th>
                  <th className="py-2.5 px-3">Axe Logistique Attribué</th>
                  <th className="py-2.5 px-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {couriers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {c.name}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {c.phone_formatted || c.phone}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <span className="font-medium text-slate-900">{c.vehicle_type}</span>
                      <span className="ml-2 text-slate-400 font-mono">({c.max_parcels || 30} colis max)</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={c.assigned_axis || "NONE"}
                        disabled={!canManage}
                        onChange={(e) => handleCourierAxisChange(c.id, e.target.value)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg border outline-none ${
                          c.assigned_axis
                            ? "bg-blue-50 border-blue-200 text-blue-800"
                            : "bg-slate-50 border-slate-200 text-slate-500"
                        }`}
                      >
                        <option value="NONE">-- Non assigné (Tous les axes) --</option>
                        {axes.map((a) => (
                          <option key={a.id} value={a.code}>
                            {a.libelle}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                        }`}
                      >
                        {c.active ? "Actif" : "Inactif"}
                      </span>
                    </td>
                  </tr>
                ))}
                {couriers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Aucun livreur trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: COMPTES & UTILISATEURS DU SYSTÈME (SUPER ADMIN, SUPERVISEUR, ETC.) */}
      {/* ========================================================================= */}
      {activeTab === "USERS" && (
        <div className="space-y-4">
          {/* User Metrics Cockpit */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white border border-slate-200 border-l-4 border-l-indigo-600 p-3 rounded-xl shadow-xs">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Comptes</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">{users.length}</span>
                <span className="text-[11px] text-slate-400">utilisateurs</span>
              </div>
            </div>
            <div className="bg-white border border-slate-200 border-l-4 border-l-purple-600 p-3 rounded-xl shadow-xs">
              <p className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider">Direction / Admin</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-base sm:text-lg font-bold text-purple-700 tabular-nums">
                  {users.filter((u) => u.role === "SUPER_ADMIN").length}
                </span>
                <span className="text-[11px] text-slate-400">super admin</span>
              </div>
            </div>
            <div className="bg-white border border-slate-200 border-l-4 border-l-blue-600 p-3 rounded-xl shadow-xs">
              <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Superviseurs</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-base sm:text-lg font-bold text-blue-700 tabular-nums">
                  {users.filter((u) => u.role === "SUPERVISEUR").length}
                </span>
                <span className="text-[11px] text-slate-400">dispatchers</span>
              </div>
            </div>
            <div className="bg-white border border-slate-200 border-l-4 border-l-emerald-600 p-3 rounded-xl shadow-xs">
              <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Réceptionnistes</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-base sm:text-lg font-bold text-emerald-700 tabular-nums">
                  {users.filter((u) => u.role === "RECEPTIONNISTE").length}
                </span>
                <span className="text-[11px] text-slate-400">agents quai</span>
              </div>
            </div>
            <div className="bg-white border border-slate-200 border-l-4 border-l-amber-600 p-3 rounded-xl shadow-xs">
              <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Livreurs / Mobile</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-base sm:text-lg font-bold text-amber-700 tabular-nums">
                  {users.filter((u) => u.role === "LIVREUR").length}
                </span>
                <span className="text-[11px] text-slate-400">comptes terrain</span>
              </div>
            </div>
          </div>

          {/* User Table Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                  <Users className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Personnel & Droits d&apos;Accès Plateforme
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Gestion des comptes opérationnels, rôles de sécurité (RBAC) et habilitations
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Rechercher nom, login, email..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="pl-8 pr-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-500 w-52 bg-slate-50/50"
                  />
                </div>

                {/* Role Filter */}
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium outline-none focus:border-indigo-500"
                >
                  <option value="ALL">Tous les rôles</option>
                  <option value="SUPER_ADMIN">👑 Super Admin</option>
                  <option value="SUPERVISEUR">👮 Superviseur</option>
                  <option value="RECEPTIONNISTE">📋 Réceptionniste</option>
                  <option value="LIVREUR">🛵 Livreur</option>
                </select>

                {canManage && (
                  <button
                    onClick={() => setIsAddUserModalOpen(true)}
                    data-cy="btn-open-add-user-modal"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Nouvel Utilisateur</span>
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Utilisateur</th>
                    <th className="py-2.5 px-3">Identifiant (Login)</th>
                    <th className="py-2.5 px-3">Email Professionnel</th>
                    <th className="py-2.5 px-3">Rôle & Profil</th>
                    <th className="py-2.5 px-3">Flux Assigné</th>
                    <th className="py-2.5 px-3">Statut</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users
                    .filter((u) => {
                      if (userRoleFilter !== "ALL" && u.role !== userRoleFilter) return false;
                      if (userSearchQuery.trim()) {
                        const q = userSearchQuery.toLowerCase();
                        const matchNom = u.nom_complet?.toLowerCase().includes(q);
                        const matchUser = u.username?.toLowerCase().includes(q);
                        const matchMail = u.email?.toLowerCase().includes(q);
                        return matchNom || matchUser || matchMail;
                      }
                      return true;
                    })
                    .map((u) => {
                      const roleMeta =
                        u.role === "SUPER_ADMIN"
                          ? { label: "Super Admin", color: "bg-purple-50 text-purple-700 border-purple-200" }
                          : u.role === "SUPERVISEUR"
                          ? { label: "Superviseur", color: "bg-blue-50 text-blue-700 border-blue-200" }
                          : u.role === "RECEPTIONNISTE"
                          ? { label: "Réceptionniste", color: "bg-emerald-50 text-emerald-700 border-emerald-200" }
                          : { label: "Livreur", color: "bg-amber-50 text-amber-700 border-amber-200" };

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs">
                                {u.nom_complet ? u.nom_complet.charAt(0).toUpperCase() : "U"}
                              </div>
                              <span className="font-bold text-slate-900">{u.nom_complet}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">
                            <span className="text-slate-400">@</span>{u.username}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                            {u.email}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${roleMeta.color}`}>
                              {roleMeta.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {u.assigned_flux ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                {u.assigned_flux}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Tous flux</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                u.actif ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {u.actif ? "Actif" : "Désactivé"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {canManage && (
                              <button
                                onClick={() => handleToggleUser(u)}
                                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                                  u.actif
                                    ? "text-rose-600 border-rose-200 hover:bg-rose-50"
                                    : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                }`}
                                title={u.actif ? "Désactiver ce compte" : "Activer ce compte"}
                              >
                                {u.actif ? "Désactiver" : "Activer"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Aucun compte utilisateur trouvé.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* ========================================================================= */}
      {/* TAB 4: IDENTITÉ DE L'ENTREPRISE & PARAMÈTRES DE FACTURATION (DYNAMIQUE)   */}
      {/* ========================================================================= */}
      {activeTab === "COMPANY" && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-lg border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-white/10 rounded-xl text-lg">🏢</span>
                <h2 className="text-base font-bold tracking-wide">
                  Identité Entreprise & Mentions Légales de Facturation
                </h2>
              </div>
              <p className="text-xs text-blue-200 mt-1 max-w-2xl">
                Ces informations sont <strong>entièrement dynamiques</strong>. Elles alimentent automatiquement le titre de l&apos;application, les entêtes de factures, les bordereaux de réception (BDR), les tickets thermiques 80mm et les messages WhatsApp.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold rounded-xl flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Synchronisé en Base
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveCompany} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Fields: 2 Columns */}
            <div className="lg:col-span-2 space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              {/* Groupe 1: Branding & Application */}
              <div>
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  1. Marque Commerciale, Logo & Application
                </h3>

                {/* Téléversement du Logo Dynamique */}
                <div className="mb-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* Boîte visuelle du Logo */}
                      <div className="w-20 h-20 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shadow-xs relative flex-shrink-0">
                        {companyForm.logo_url ? (
                          <img
                            src={companyForm.logo_url}
                            alt="Logo Entreprise"
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <div className="text-center p-2">
                            <span className="text-2xl block">🏢</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Aucun logo</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>Logo Officiel de l&apos;Entreprise</span>
                          {companyForm.logo_url ? (
                            <span className="px-1.5 py-0.5 text-[9px] bg-emerald-100 text-emerald-800 font-bold rounded-md">
                              Actif
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 text-[9px] bg-slate-200 text-slate-600 font-bold rounded-md">
                              Par Défaut
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 max-w-md">
                          Ce logo est injecté dynamiquement dans la barre latérale, les bordereaux imprimés et les tickets thermiques 80mm.
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          PNG, JPG, SVG, WebP acceptés (optimisé et compressé automatiquement).
                        </p>
                      </div>
                    </div>

                    {/* Actions : Upload ou Supprimer */}
                    {canManage && (
                      <div className="flex items-center gap-2">
                        <label className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{companyForm.logo_url ? "Changer" : "Ajouter Logo"}</span>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                            className="hidden"
                            onChange={handleLogoUpload}
                          />
                        </label>

                        {companyForm.logo_url && (
                          <button
                            type="button"
                            onClick={() => setCompanyForm({ ...companyForm, logo_url: "" })}
                            className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition flex items-center gap-1 cursor-pointer"
                            title="Supprimer le logo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Effacer</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Nom Commercial de l&apos;Application *
                    </label>
                    <input
                      type="text"
                      required
                      value={companyForm.app_name}
                      onChange={(e) => setCompanyForm({ ...companyForm, app_name: e.target.value })}
                      placeholder="Ex: TMS EXPRESS 5.0, EXPRESS LOGISTICS..."
                      className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Affiché dans la barre latérale, stickers et onglets.</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Raison Sociale Officielle (Entité Légale) *
                    </label>
                    <input
                      type="text"
                      required
                      value={companyForm.company_name}
                      onChange={(e) => setCompanyForm({ ...companyForm, company_name: e.target.value })}
                      placeholder="Ex: TMS EXPRESS MADAGASCAR SARL"
                      className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Imprimée en titre principal sur les BDR et factures.</p>
                  </div>
                </div>
              </div>

              {/* Groupe 2: Identifiants Fiscaux Facture */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                  2. Identifiants Fiscaux & Réglementaires de la Facture
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Numéro NIF (Identifiant Fiscal) *
                    </label>
                    <input
                      type="text"
                      required
                      value={companyForm.nif}
                      onChange={(e) => setCompanyForm({ ...companyForm, nif: e.target.value })}
                      placeholder="Ex: 4001234567"
                      className="w-full font-mono text-xs font-bold border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Mention fiscale obligatoire sur tout BDR / Facture.</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Numéro STAT (Statistique) *
                    </label>
                    <input
                      type="text"
                      required
                      value={companyForm.stat}
                      onChange={(e) => setCompanyForm({ ...companyForm, stat: e.target.value })}
                      placeholder="Ex: 52291 11 2021 0 10245"
                      className="w-full font-mono text-xs font-bold border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Numéro d&apos;immatriculation statistique INSTAT.</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Numéro RCS (Registre du Commerce)
                    </label>
                    <input
                      type="text"
                      value={companyForm.rcs}
                      onChange={(e) => setCompanyForm({ ...companyForm, rcs: e.target.value })}
                      placeholder="Ex: RCS Antananarivo 2021 B 00123"
                      className="w-full font-mono text-xs font-medium border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Numéro CIF (Carte d&apos;Immatriculation Fiscale)
                    </label>
                    <input
                      type="text"
                      value={companyForm.cif}
                      onChange={(e) => setCompanyForm({ ...companyForm, cif: e.target.value })}
                      placeholder="Ex: 0123456/DGI-J"
                      className="w-full font-mono text-xs font-medium border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Groupe 3: Coordonnées du Siège / Hub */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  3. Coordonnées Officielles du Siège & Hub Central
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Adresse Physique / Quartier du Siège
                    </label>
                    <input
                      type="text"
                      value={companyForm.address}
                      onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                      placeholder="Ex: Tsiazotafo / Analakely, Antananarivo 101, Madagascar"
                      className="w-full text-xs font-medium border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Téléphone Officiel du Service
                    </label>
                    <input
                      type="text"
                      value={companyForm.phone}
                      onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                      placeholder="Ex: +261 34 00 000 00"
                      className="w-full text-xs font-medium border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Email de Contact Facturation
                    </label>
                    <input
                      type="email"
                      value={companyForm.email}
                      onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                      placeholder="Ex: contact@tmsexpress.mg"
                      className="w-full text-xs font-medium border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Site Web / Portail
                    </label>
                    <input
                      type="text"
                      value={companyForm.website}
                      onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                      placeholder="Ex: www.tmsexpress.mg"
                      className="w-full text-xs font-medium border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Devise Monétaire
                    </label>
                    <input
                      type="text"
                      value={companyForm.currency}
                      onChange={(e) => setCompanyForm({ ...companyForm, currency: e.target.value })}
                      placeholder="MGA"
                      className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Texte de Pied de Facture & Mentions Légales
                    </label>
                    <input
                      type="text"
                      value={companyForm.footer_text}
                      onChange={(e) => setCompanyForm({ ...companyForm, footer_text: e.target.value })}
                      placeholder="Ex: Merci pour votre confiance. Envois garantis et tracés."
                      className="w-full text-xs font-medium border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Bouton d'action */}
              {canManage && (
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="submit"
                    disabled={isSavingCompany}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                  >
                    {isSavingCompany ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Enregistrement...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Enregistrer les Modifications</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Live Preview Column: 1 Column */}
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  👁️ Aperçu en Direct — Entête de Facture & BDR Officiel
                </span>

                <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm space-y-3 font-sans text-xs">
                  <div className="border-b-2 border-slate-900 pb-3">
                    <div className="flex items-center gap-3">
                      {companyForm.logo_url ? (
                        <img
                          src={companyForm.logo_url}
                          alt="Logo"
                          className="h-9 max-w-[120px] object-contain rounded"
                        />
                      ) : (
                        <span className="text-2xl">🚚</span>
                      )}
                      <div>
                        <span className="text-base font-black text-slate-900 block leading-tight">
                          {companyForm.company_name || "VOTRE ENTREPRISE"}
                        </span>
                        <span className="text-[10px] text-blue-600 font-bold block">
                          {companyForm.app_name || "Nom Commercial"}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium mt-1">
                      {companyForm.address || "Adresse de l'entreprise"} • Tél : {companyForm.phone || "+261 34 00 000 00"}
                    </p>
                    <p className="text-[10px] text-slate-800 font-mono font-bold mt-1 bg-slate-100 p-1.5 rounded">
                      NIF : {companyForm.nif || "---"} • STAT : {companyForm.stat || "---"}
                      {companyForm.rcs && ` • RCS : ${companyForm.rcs}`}
                      {companyForm.cif && ` • CIF : ${companyForm.cif}`}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {companyForm.email || "email@entreprise.mg"} • {companyForm.website || "www.entreprise.mg"}
                    </p>
                  </div>

                  <div className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-100 text-[11px] text-blue-900">
                    <span className="font-bold block">Application Active :</span>
                    <span className="font-semibold">{companyForm.app_name || "Nom Application"}</span>
                    <span className="text-[10px] text-blue-600 block mt-0.5">Devise : {companyForm.currency}</span>
                  </div>

                  <div className="text-[10px] text-slate-400 text-center italic pt-1 border-t border-dashed border-slate-200">
                    « {companyForm.footer_text || "Mention légale de facturation..."} »
                  </div>
                </div>

                <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                  💡 <strong>Impact immédiat :</strong> Toute modification enregistrée ici sera répercutée en temps réel dans toute l&apos;application sans rechargement de page.
                </div>
              </div>
            </div>
          </form>
        </div>
      )}
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
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border shadow-xs ${
                          detail?.type === "gare"
                            ? "bg-purple-100 text-purple-900 border-purple-300 font-bold"
                            : detail?.type === "cooperative"
                            ? "bg-amber-100 text-amber-900 border-amber-300 font-bold"
                            : "bg-white text-slate-800 border-slate-200"
                        }`}
                      >
                        {detail?.type === "gare" && <span>🚌</span>}
                        {detail?.type === "cooperative" && <span>🤝</span>}
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
                    {editingPartner ? "Modifier la Coopérative ou Gare" : "Nouvelle Coopérative ou Gare Partenaire"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Réseau national d&apos;expéditions en Province
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddPartnerModalOpen(false);
                  setEditingPartner(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPartnerSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                  Nom du Partenaire ou Gare : *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Cotisse Transport, Besady Plus, Gare Routière..."
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
                  className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 outline-none bg-white cursor-pointer"
                >
                  <option value="COOPERATIVE">🚐 Coopérative Régionale / Transporteur</option>
                  <option value="GARE">🏢 Gare Routière Nationale / Hub</option>
                  <option value="CONFRERE">🤝 Confrère Dernier Kilomètre</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                    Gare de Rattachement (Saisie Libre ou Sélection) :
                  </label>
                  {partnerType === "GARE" && (
                    <button
                      type="button"
                      onClick={() => setPartnerStation(partnerName.trim() || "Gare Routière")}
                      className="text-[10px] text-purple-600 hover:text-purple-800 underline font-semibold cursor-pointer"
                    >
                      Même nom que la gare
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  list="partner-station-suggestions-datalist"
                  placeholder="Tapez librement ou cliquez sur une suggestion..."
                  value={partnerStation}
                  onChange={(e) => setPartnerStation(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-purple-500 bg-white"
                />
                <datalist id="partner-station-suggestions-datalist">
                  <option value="Ambodivona">Ambodivona (RN2 Est - Tamatave)</option>
                  <option value="Fasan'ny Karana">Fasan'ny Karana (RN7 Sud - Fianar / Tuléar)</option>
                  <option value="Andohatapenaka">Andohatapenaka Maki (RN4 Ouest / RN6 Nord)</option>
                  <option value="Aranta">Aranta (Majunga)</option>
                  <option value="Toamasina">Toamasina (Tamatave)</option>
                  <option value="Antsirabe">Antsirabe</option>
                  <option value="Fianarantsoa">Fianarantsoa</option>
                  <option value="Moramanga">Moramanga</option>
                  <option value="Siège Central">Siège Central (Dépôt direct)</option>
                </datalist>

                {/* Suggestions rapides en 1 clic */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1.5">
                  <span className="text-[10px] text-slate-400 font-medium">Suggestions :</span>
                  {[
                    { label: "Ambodivona", val: "Ambodivona" },
                    { label: "Fasan'ny Karana", val: "Fasan'ny Karana" },
                    { label: "Andohatapenaka", val: "Andohatapenaka" },
                    { label: "Siège Central", val: "Siège Central" },
                  ].map((sug) => (
                    <button
                      key={sug.val}
                      type="button"
                      onClick={() => setPartnerStation(sug.val)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer ${
                        partnerStation.toLowerCase().includes(sug.val.toLowerCase())
                          ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200"
                      }`}
                    >
                      🏢 {sug.label}
                    </button>
                  ))}
                </div>
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
                  onClick={() => {
                    setIsAddPartnerModalOpen(false);
                    setEditingPartner(null);
                  }}
                  className="px-3.5 py-1.5 font-medium text-xs text-slate-600 hover:text-slate-900 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs uppercase tracking-wider rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting
                    ? "Enregistrement..."
                    : editingPartner
                    ? "Mettre à jour le Partenaire"
                    : "Enregistrer le Partenaire"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL SUPPRESSION PARTENAIRE / GARE                                       */}
      {/* ========================================================================= */}
      {deletingPartner && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Supprimer ce Partenaire ?
                </h3>
                <p className="text-xs text-slate-500">
                  Cette action retirera le partenaire du référentiel et des suggestions de réception.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Bus className="w-3.5 h-3.5 text-purple-600" />
                <span>{deletingPartner.nom}</span>
              </div>
              <div className="text-slate-500">Type : {deletingPartner.type}</div>
              {deletingPartner.gare_rattachement && (
                <div className="text-slate-500">Gare : {deletingPartner.gare_rattachement}</div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingPartner(null)}
                className="px-3.5 py-1.5 font-medium text-xs text-slate-600 hover:text-slate-900 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleDeletePartnerConfirm(deletingPartner)}
                disabled={submitting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs uppercase tracking-wider rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{submitting ? "Suppression..." : "Confirmer la Suppression"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6 : AJOUTER UN NOUVEAU LIVREUR                                       */}
      {/* ========================================================================= */}
      {isAddCourierModalOpen && (
        <div
          data-cy="modal-create-courier-referentiel"
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                  <Truck className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Nouveau Livreur & Coursier Opérationnel
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Enregistrement dans la flotte et affectation d&apos;axe
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddCourierModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCourierSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                  Nom & Prénom du Coursier : *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: RAKOTOARISOA Jean"
                  value={newCourierForm.name}
                  onChange={(e) => setNewCourierForm({ ...newCourierForm, name: e.target.value })}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                    Téléphone Malgache : *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: 0341234567"
                    value={newCourierForm.phone}
                    onChange={(e) => setNewCourierForm({ ...newCourierForm, phone: e.target.value.replace(/\s+/g, "") })}
                    className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 bg-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">10 chiffres (032, 033, 034, 037, 038)</p>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                    Véhicule : *
                  </label>
                  <select
                    value={newCourierForm.vehicle_type}
                    onChange={(e) => setNewCourierForm({ ...newCourierForm, vehicle_type: e.target.value })}
                    className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 outline-none bg-white"
                  >
                    <option value="Scooter 110cc">Scooter 110cc</option>
                    <option value="Moto 125cc">Moto 125cc</option>
                    <option value="Moto Cross 150cc">Moto Cross 150cc</option>
                    <option value="Fourgonnette Urbaine">Fourgonnette Urbaine</option>
                    <option value="Vélo Cargo">Vélo Cargo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                    Caution Garantie (Ar) : *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newCourierForm.security_deposit}
                    onChange={(e) => setNewCourierForm({ ...newCourierForm, security_deposit: e.target.value === "" ? "" : Number(e.target.value) })}
                    className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                    Capacité Max (max 30) : *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={newCourierForm.max_parcels}
                    onChange={(e) => setNewCourierForm({ ...newCourierForm, max_parcels: e.target.value === "" ? "" : Number(e.target.value) })}
                    className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                  Axe Logistique Assigné :
                </label>
                <select
                  value={newCourierForm.assigned_axis}
                  onChange={(e) => setNewCourierForm({ ...newCourierForm, assigned_axis: e.target.value })}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 outline-none bg-white"
                >
                  <option value="">-- Flotte Globale (Non assigné) --</option>
                  {axes.map((a) => (
                    <option key={a.id} value={a.code}>
                      {a.libelle}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  data-cy="btn-close-courier-modal"
                  onClick={() => setIsAddCourierModalOpen(false)}
                  className="px-3.5 py-1.5 font-medium text-xs text-slate-600 hover:text-slate-900 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  data-cy="btn-submit-create-courier"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs uppercase tracking-wider rounded-lg transition shadow-xs flex items-center gap-1.5"
                >
                  {submitting ? "Création..." : "Enregistrer le Livreur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7 : AJOUTER UN NOUVEL UTILISATEUR                                   */}
      {/* ========================================================================= */}
      {isAddUserModalOpen && (
        <div
          data-cy="modal-create-user-referentiel"
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                  <UserPlus className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Créer un Nouvel Utilisateur
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Création de compte avec mot de passe et habilitation de quai
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                data-cy="btn-close-user-modal"
                className="text-slate-400 hover:text-slate-700 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                    Identifiant (Login) : *
                  </label>
                  <input
                    type="text"
                    required
                    data-cy="input-user-username"
                    placeholder="ex: agent5, super2"
                    value={newUserForm.username}
                    onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value.toLowerCase().trim() })}
                    className="w-full text-xs font-mono font-semibold border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                    Rôle Système : *
                  </label>
                  <select
                    data-cy="select-user-role"
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 outline-none bg-white"
                  >
                    <option value="RECEPTIONNISTE">📋 Réceptionniste de Quai</option>
                    <option value="SUPERVISEUR">👮 Superviseur Dispatcher</option>
                    <option value="SUPER_ADMIN">👑 Super Administrateur</option>
                    <option value="LIVREUR">🛵 Livreur (Compte Terrain)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                  Nom & Prénom Complet : *
                </label>
                <input
                  type="text"
                  required
                  data-cy="input-user-fullname"
                  placeholder="ex: Rado RAKOTOMANGA"
                  value={newUserForm.nom_complet}
                  onChange={(e) => setNewUserForm({ ...newUserForm, nom_complet: e.target.value })}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                  Email Professionnel : *
                </label>
                <input
                  type="email"
                  required
                  data-cy="input-user-email"
                  placeholder="ex: rado@tmsexpress.mg"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 bg-white"
                />
              </div>

              {newUserForm.role === "RECEPTIONNISTE" && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                    Flux Assigné au Quai (Optionnel) :
                  </label>
                  <select
                    data-cy="select-user-flux"
                    value={newUserForm.assigned_flux}
                    onChange={(e) => setNewUserForm({ ...newUserForm, assigned_flux: e.target.value })}
                    className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 outline-none bg-white"
                  >
                    <option value="">Tous les flux (Polyvalent)</option>
                    <option value="STANDARD">STANDARD (Simple)</option>
                    <option value="COD">COD (Contre-Remboursement)</option>
                    <option value="PROVINCE">PROVINCE (Gares & Coopératives)</option>
                    <option value="SAV_RETOUR">SAV & Retours</option>
                    <option value="B2B">B2B (Entreprises)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1 uppercase tracking-wider text-[11px]">
                  Mot de Passe Initial : *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    data-cy="input-user-password"
                    placeholder="Minimum 4 caractères"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-2 pr-9 outline-none focus:border-indigo-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  data-cy="btn-cancel-user-modal"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-3.5 py-1.5 font-medium text-xs text-slate-600 hover:text-slate-900 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  data-cy="btn-submit-create-user"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs uppercase tracking-wider rounded-lg transition shadow-xs flex items-center gap-1.5"
                >
                  {submitting ? "Création..." : "Créer le Compte"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
