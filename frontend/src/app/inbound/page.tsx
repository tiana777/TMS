"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Printer,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Store,
  User,
  Building2,
  Phone,
  MapPin,
  Package,
  Layers,
  Sparkles,
} from "lucide-react";
import { detectMalagasyPhone } from "../../lib/phone";
import { detectAxisClient, registerCustomZone, registerProvinceAxisClient } from "../../lib/axis";
import { fetchVendors, createParcelBatch, addZoneToAxis, fetchAxes, createAxis } from "../../lib/api";
import { OperatorBadge } from "../../components/OperatorBadge";
import { AxisBadge } from "../../components/AxisBadge";
import { FluxType, LogisticAxis, SenderType, Vendor } from "../../types";
import { RECEPTIONIST_AGENTS, ReceptionistAgent, UserRole } from "../../components/HeaderUserRole";

interface InboundRow {
  id: string;
  recipientName: string;
  recipientPhone: string;
  designation: string;
  deliveryAddress: string;
  axis: LogisticAxis;
  isAxisFallback: boolean;
  isManualAxis?: boolean;
  fluxType: FluxType;
  merchandiseAmount: number;
  deliveryFee: number;
  observation: string;
}

export default function InboundPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [senderType, setSenderType] = useState<SenderType>("CYBERMARCHAND");
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);

  // Sender contact fields - EMPTY BY DEFAULT as requested
  const [senderName, setSenderName] = useState<string>("");
  const [senderPhone, setSenderPhone] = useState<string>("");
  const [senderAddress, setSenderAddress] = useState<string>("");
  const [contactPerson, setContactPerson] = useState<string>("");

  const [rows, setRows] = useState<InboundRow[]>([
    {
      id: "row-1",
      recipientName: "",
      recipientPhone: "",
      designation: "",
      deliveryAddress: "",
      axis: "AXE_CENTRE_1",
      isAxisFallback: true,
      isManualAxis: false,
      fluxType: "COD",
      merchandiseAmount: 0,
      deliveryFee: 3000,
      observation: "",
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdParcels, setCreatedParcels] = useState<any[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal state for attaching a new zone / location to an axis
  const [isAddZoneModalOpen, setIsAddZoneModalOpen] = useState<boolean>(false);
  const [modalTargetRowIndex, setModalTargetRowIndex] = useState<number>(0);
  const [modalZoneName, setModalZoneName] = useState<string>("");
  const [modalSelectedAxis, setModalSelectedAxis] = useState<LogisticAxis>("AXE_CENTRE_1");
  const [modalSelectedFee, setModalSelectedFee] = useState<number>(3000);
  const [modalError, setModalError] = useState<string | null>(null);
  const [zoneSuccessMessage, setZoneSuccessMessage] = useState<string | null>(null);

  // Receptionist Desk & Role State (5 Cloisonnés Flows)
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>("SUPERVISEUR");
  const [activeReceptionist, setActiveReceptionist] = useState<ReceptionistAgent | null>(null);

  useEffect(() => {
    const syncRole = () => {
      if (typeof window === "undefined") return;
      const role = (localStorage.getItem("tms_user_role") as UserRole) || "SUPERVISEUR";
      setCurrentUserRole(role);
      const username = localStorage.getItem("tms_username");
      if (role === "RECEPTIONNISTE" || username) {
        const found = RECEPTIONIST_AGENTS.find((a) => a.username === username) || RECEPTIONIST_AGENTS[0];
        setActiveReceptionist(found);
      } else {
        setActiveReceptionist(null);
      }
    };

    syncRole();
    window.addEventListener("tms_role_change", syncRole);
    window.addEventListener("storage", syncRole);
    return () => {
      window.removeEventListener("tms_role_change", syncRole);
      window.removeEventListener("storage", syncRole);
    };
  }, []);

  const handleSelectGuichet = (agent: ReceptionistAgent) => {
    setActiveReceptionist(agent);
    setCurrentUserRole("RECEPTIONNISTE");
    localStorage.setItem("tms_user_role", "RECEPTIONNISTE");
    localStorage.setItem("tms_username", agent.username);
    localStorage.setItem("tms_user_id", agent.id.toString());
    localStorage.setItem("tms_user_nom", agent.nom);
    localStorage.setItem("tms_assigned_flux", agent.flux);
    window.dispatchEvent(new Event("tms_role_change"));

    // Adapt empty row defaults to the newly selected receptionist flux
    const isProv = agent.flux === "PROVINCE";
    setRows((prev) =>
      prev.map((r, i) => {
        if (!r.recipientName && !r.deliveryAddress) {
          return {
            ...r,
            fluxType: agent.flux as FluxType,
            axis: isProv ? ("AXE_PROVINCE" as LogisticAxis) : r.axis,
            deliveryFee: isProv ? 10000 : r.deliveryFee,
            merchandiseAmount: agent.flux === "SIMPLE" ? 0 : r.merchandiseAmount,
          };
        }
        return r;
      })
    );

    if (agent.flux === "ENTREPRISE") {
      setSenderType("ENTREPRISE");
    }
  };

  const handleOpenAddZoneModal = (rowIndex: number) => {
    setModalTargetRowIndex(rowIndex);
    const row = rows[rowIndex];
    setModalZoneName(row ? row.deliveryAddress.trim() : "");
    setModalSelectedAxis(row?.axis || "AXE_CENTRE_1");
    setModalSelectedFee(row?.deliveryFee || 3000);
    setModalError(null);
    setIsAddZoneModalOpen(true);
  };

  const handleConfirmAddZone = async () => {
    const cleanName = modalZoneName.trim();
    if (!cleanName) {
      setModalError("Le nom du quartier ou lieu est obligatoire.");
      return;
    }

    try {
      // 1. Register in client-side runtime detector
      registerCustomZone(cleanName, modalSelectedAxis, modalSelectedFee);

      // 2. Update the target row immediately
      setRows((prev) => {
        const copy = [...prev];
        if (copy[modalTargetRowIndex]) {
          copy[modalTargetRowIndex] = {
            ...copy[modalTargetRowIndex],
            axis: modalSelectedAxis,
            deliveryFee: modalSelectedFee,
            isAxisFallback: false,
            isManualAxis: true,
            fluxType: modalSelectedAxis === "AXE_PROVINCE" ? "PROVINCE" : copy[modalTargetRowIndex].fluxType,
          };
        }
        return copy;
      });

      setZoneSuccessMessage(
        `Nouveau quartier "${cleanName}" rattaché avec succès à ${modalSelectedAxis} (${modalSelectedFee.toLocaleString("fr-FR")} Ar) !`
      );
      setTimeout(() => setZoneSuccessMessage(null), 6000);
      setIsAddZoneModalOpen(false);

      // 3. Persist asynchronously in background (non-blocking)
      addZoneToAxis(1, cleanName).catch(() => {});
    } catch (err: any) {
      setModalError(err.message || "Erreur lors du rattachement du quartier.");
    }
  };

  // Registered Province Axes state for dynamic manual entry and autocomplete
  const [provinceAxes, setProvinceAxes] = useState<{ id?: number; code: string; libelle: string }[]>([]);

  const loadProvinceAxes = async () => {
    try {
      const data = await fetchAxes("PROVINCE");
      if (Array.isArray(data)) {
        setProvinceAxes(data);
        data.forEach((ax: any) => registerProvinceAxisClient(ax.code, ax.libelle));
      }
    } catch (e) {
      console.warn("Could not load province axes", e);
    }
  };

  useEffect(() => {
    fetchVendors().then((data) => {
      setVendors(data);
      // Sender fields remain strictly empty on first load (user request)
    });
    loadProvinceAxes();
  }, []);

  const getProvinceDisplayName = (axisCode?: string) => {
    if (!axisCode) return "";
    const found = provinceAxes.find((p) => p.code === axisCode);
    if (found) {
      return found.libelle.replace("Axe Province ", "").replace("AXE PROVINCE ", "");
    }
    return axisCode
      .replace("AXE_PROVINCE_", "")
      .replace("AXE_PROV_", "")
      .replace("AXE_", "")
      .replace(/_/g, " ");
  };

  const handleProvinceAxisInputChange = (idx: number, rawInput: string) => {
    const trimmed = rawInput.trim();
    const match = provinceAxes.find(
      (p) =>
        p.code.toLowerCase() === trimmed.toLowerCase() ||
        p.libelle.toLowerCase() === trimmed.toLowerCase() ||
        p.libelle.toLowerCase().replace("axe province ", "").trim() === trimmed.toLowerCase()
    );

    let finalCode = trimmed;
    if (match) {
      finalCode = match.code;
    } else if (trimmed) {
      const cleanUpper = trimmed
        .toUpperCase()
        .replace(/^AXE_PROVINCE_/, "")
        .replace(/^AXE_PROV_/, "")
        .replace(/^AXE_/, "")
        .replace(/\s+/g, "_");
      finalCode = `AXE_PROVINCE_${cleanUpper}`;
    }

    setRows((prev) => {
      const copy = [...prev];
      if (copy[idx]) {
        copy[idx] = {
          ...copy[idx],
          axis: (finalCode || "AXE_PROVINCE") as LogisticAxis,
          fluxType: "PROVINCE",
          isManualAxis: true,
          isAxisFallback: false,
        };
      }
      return copy;
    });
  };

  const selectProvinceAxis = (idx: number, axisCode: string) => {
    setRows((prev) => {
      const copy = [...prev];
      if (copy[idx]) {
        copy[idx] = {
          ...copy[idx],
          axis: axisCode as LogisticAxis,
          fluxType: "PROVINCE",
          isManualAxis: true,
          isAxisFallback: false,
        };
      }
      return copy;
    });
  };

  const isNewUnregisteredProvinceAxis = (axisCode?: string) => {
    if (!axisCode || axisCode === "AXE_PROVINCE") return false;
    const exists = provinceAxes.some((p) => p.code === axisCode);
    return !exists && axisCode.trim().length > 0;
  };

  const handleRegisterProvinceAxisFromRow = async (idx: number) => {
    const row = rows[idx];
    if (!row || !row.axis) return;
    const cleanCode = row.axis.startsWith("AXE_")
      ? row.axis
      : `AXE_PROVINCE_${row.axis.toUpperCase().replace(/\s+/g, "_")}`;
    const rawName = cleanCode
      .replace("AXE_PROVINCE_", "")
      .replace("AXE_PROV_", "")
      .replace("AXE_", "")
      .replace(/_/g, " ")
      .trim();
    const cleanLibelle = `Axe Province ${rawName.charAt(0).toUpperCase() + rawName.slice(1)}`;

    try {
      const created = await createAxis({
        code: cleanCode,
        libelle: cleanLibelle,
        type_axe: "PROVINCE",
      });
      registerProvinceAxisClient(created.code, created.libelle);
      setProvinceAxes((prev) => {
        if (prev.some((p) => p.code === created.code)) return prev;
        return [...prev, created];
      });
      setZoneSuccessMessage(`Axe Province "${created.libelle}" enregistré avec succès et disponible en autocomplétion !`);
      setTimeout(() => setZoneSuccessMessage(null), 5000);
    } catch (err: any) {
      const fallbackItem = { code: cleanCode, libelle: cleanLibelle };
      registerProvinceAxisClient(cleanCode, cleanLibelle);
      setProvinceAxes((prev) => {
        if (prev.some((p) => p.code === cleanCode)) return prev;
        return [...prev, fallbackItem];
      });
      setZoneSuccessMessage(`Axe Province "${cleanLibelle}" mémorisé pour autocomplétion !`);
      setTimeout(() => setZoneSuccessMessage(null), 5000);
    }
  };

  const applyVendorData = (v: Vendor) => {
    setSelectedVendorId(v.id);
    setSenderName(v.nom);
    setSenderPhone(v.telephone || "");
    setSenderAddress(v.adresse || "");
    setContactPerson(v.contact_responsable || "");
    if (v.type_expediteur) {
      setSenderType(v.type_expediteur);
    }
  };

  const handleSenderNameChange = (val: string) => {
    setSenderName(val);
    // Dynamic autocomplete: if typed name matches an existing registered vendor
    const match = vendors.find(
      (v) => v.nom.toLowerCase().trim() === val.toLowerCase().trim()
    );
    if (match) {
      applyVendorData(match);
    }
  };

  const handleSenderTypeChange = (type: SenderType) => {
    setSenderType(type);
    // Keep user's focus clean: clear or filter suggestions
  };

  const addRow = () => {
    const currentFlux = activeReceptionist ? activeReceptionist.flux : "COD";
    const isProv = currentFlux === "PROVINCE";
    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}`,
        recipientName: "",
        recipientPhone: "",
        designation: "",
        deliveryAddress: isProv ? "Gare Routière " : "",
        axis: isProv ? ("AXE_PROVINCE" as LogisticAxis) : ("AXE_CENTRE_1" as LogisticAxis),
        isAxisFallback: !isProv,
        isManualAxis: isProv,
        fluxType: currentFlux as FluxType,
        merchandiseAmount: 0,
        deliveryFee: isProv ? 10000 : 3000,
        observation: "",
      },
    ]);
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof InboundRow, value: any) => {
    setRows((prev) => {
      const copy = [...prev];
      const target = { ...copy[index], [field]: value };

      // Auto-detect axis and fee when address changes (Tarification manuelle / négociée CDC)
      if (field === "deliveryAddress") {
        const detection = detectAxisClient(value);
        if (!target.deliveryFee || target.deliveryFee === 0) {
          target.deliveryFee = detection.fee;
        }
        if (!target.isManualAxis) {
          target.axis = detection.axis;
          target.isAxisFallback = detection.isFallback;
          if (detection.axis === "AXE_PROVINCE") {
            target.fluxType = "PROVINCE";
          }
        }
      }

      // If user directly changes axis, mark as manual override
      if (field === "axis") {
        target.isManualAxis = true;
        target.isAxisFallback = false;
        if (value === "AXE_PROVINCE") {
          target.fluxType = "PROVINCE";
        }
      }

      // If flux is Course Simple, enforce merchandise = 0
      if (field === "fluxType" && value === "SIMPLE") {
        target.merchandiseAmount = 0;
      }

      copy[index] = target;
      return copy;
    });
  };

  // Calculations for summary banner
  const formatAriary = (amount: number) =>
    (amount || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " Ar";

  const totalParcels = rows.length;
  const totalMerchandise = rows.reduce(
    (sum, r) => sum + (Number(r.merchandiseAmount) || 0),
    0
  );
  const totalFees = rows.reduce(
    (sum, r) => sum + (Number(r.deliveryFee) || 0),
    0
  );
  const totalToCollect = totalMerchandise + totalFees;

  const senderPhoneDetect = detectMalagasyPhone(senderPhone);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate Sender Contacts
    if (!senderName.trim()) {
      setErrorMessage("Le nom de l'expéditeur / donneur d'ordre est obligatoire.");
      return;
    }
    if (senderPhone && !senderPhoneDetect.isValid) {
      setErrorMessage(
        `Numéro de téléphone expéditeur invalide (${senderPhone}). Requis : 10 chiffres malgaches valides (032, 033, 034, 035, 036, 037, 038).`
      );
      return;
    }

    // Validate Rows
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      // Note : recipientName est facultatif selon la consigne
      const phoneCheck = detectMalagasyPhone(r.recipientPhone);
      if (!phoneCheck.isValid) {
        setErrorMessage(
          `Ligne #${i + 1} : Numéro de téléphone destinataire invalide (${
            r.recipientPhone || "vide"
          }). Requis : 10 chiffres malgaches valides (032, 033, 034, 035, 036, 037, 038).`
        );
        return;
      }
      if (!r.deliveryAddress.trim()) {
        setErrorMessage(`Ligne #${i + 1} : L'adresse / lieu de livraison est obligatoire.`);
        return;
      }
      if (!r.observation || !r.observation.trim()) {
        setErrorMessage(
          `Ligne #${i + 1} : La plage horaire ou remarque spéciale de livraison est obligatoire.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const activeUserId =
        activeReceptionist?.id ||
        (typeof window !== "undefined" && localStorage.getItem("tms_user_id")
          ? Number(localStorage.getItem("tms_user_id"))
          : undefined);
      const activeUserNom =
        activeReceptionist?.nom ||
        (typeof window !== "undefined" ? localStorage.getItem("tms_user_nom") || undefined : undefined);

      const payload = rows.map((r) => ({
        vendor_id: selectedVendorId || 1,
        sender_type: senderType,
        sender_name: senderName,
        sender_phone: senderPhone || undefined,
        sender_address: senderAddress || undefined,
        recipient_name: r.recipientName.trim() || "Client",
        recipient_phone: r.recipientPhone,
        designation: r.designation || undefined,
        delivery_address: r.deliveryAddress,
        axis: r.axis,
        is_manual_axis: r.isManualAxis,
        flux_type: r.fluxType,
        merchandise_amount: Number(r.merchandiseAmount) || 0,
        delivery_fee: Number(r.deliveryFee) || 0,
        receptionniste_id: activeUserId,
        receptionniste_nom: activeUserNom,
        observation: r.observation ? r.observation.trim() : undefined,
      }));

      const results = await createParcelBatch(payload);
      setCreatedParcels(results);
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur de communication avec le serveur.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter registered vendors for autocomplete pills
  const availableVendorsForType = vendors.filter(
    (v) => !v.type_expediteur || v.type_expediteur === senderType
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* 5 Guichets Réceptionnistes (Flux Cloisonnés) */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-lg border border-slate-700/60 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-2xl shadow-inner">
              {activeReceptionist ? activeReceptionist.icon : "📋"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-blue-300">
                  {activeReceptionist ? activeReceptionist.badge : "Guichet Inbound Général"}
                </span>
                {activeReceptionist && (
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm ${activeReceptionist.badgeBg} ${activeReceptionist.badgeText}`}>
                    Flux Assigné : {activeReceptionist.flux}
                  </span>
                )}
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
                  ● Guichet Actif
                </span>
              </div>
              <h1 className="text-lg font-black text-white mt-0.5">
                {activeReceptionist
                  ? `${activeReceptionist.nom} — ${activeReceptionist.fluxLabel}`
                  : "Accueil Quai Central • Enregistrement Entrant"}
              </h1>
              <p className="text-xs text-slate-300">
                {activeReceptionist?.flux === "COD" &&
                  "Encaissement obligatoire contre-remboursement (COD) auprès des destinataires urbains Grand Tanà."}
                {activeReceptionist?.flux === "SIMPLE" &&
                  "Course simple et port payé d'avance : encaissement marchandise nul (0 Ar), seuls les frais s'appliquent."}
                {activeReceptionist?.flux === "PROVINCE" &&
                  "Acheminement régional national via les gares routières (Ambodivona, Fasan'ny Karana, Andohatapenaka)."}
                {activeReceptionist?.flux === "RETOUR" &&
                  "Gestion quai des retours clients, échanges de références, avaries et réexpéditions SAV."}
                {activeReceptionist?.flux === "ENTREPRISE" &&
                  "Prise en charge des flux réguliers d'entreprises, plis confidentiels, contrats et facturation périodique."}
                {!activeReceptionist && "Sélectionnez votre guichet ci-dessous pour cloisonner le flux opérationnel."}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 self-start lg:self-auto">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Changer de Guichet :
            </span>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5">
              {RECEPTIONIST_AGENTS.map((agent) => {
                const isSelected = activeReceptionist?.username === agent.username;
                return (
                  <button
                    key={agent.username}
                    type="button"
                    data-cy={`guichet-tab-${agent.username}`}
                    onClick={() => handleSelectGuichet(agent)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      isSelected
                        ? "bg-white text-slate-900 shadow-md ring-2 ring-blue-400 font-black scale-105"
                        : "bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10"
                    }`}
                  >
                    <span>{agent.icon}</span>
                    <span>{agent.badge}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Header & Title */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Écran 01 • Réception Quai & Inbound
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-1">
              Prise en Charge Multi-Donneurs d'Ordre & Colis
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Saisie aérée des colis avec désignation de la marchandise, adresses multilignes sans coupure et autocomplétion expéditeur.
            </p>
          </div>

          {/* Sender Type Selector Tabs */}
          <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 gap-1 self-start md:self-auto">
            <button
              type="button"
              data-testid="type-cybermarchand"
              onClick={() => handleSenderTypeChange("CYBERMARCHAND")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                senderType === "CYBERMARCHAND"
                  ? "bg-white text-blue-700 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Store className="w-3.5 h-3.5" /> Cybermarchand
            </button>
            <button
              type="button"
              data-testid="type-particulier"
              onClick={() => handleSenderTypeChange("PARTICULIER")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                senderType === "PARTICULIER"
                  ? "bg-white text-emerald-700 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <User className="w-3.5 h-3.5" /> Particulier
            </button>
            <button
              type="button"
              data-testid="type-entreprise"
              onClick={() => handleSenderTypeChange("ENTREPRISE")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                senderType === "ENTREPRISE"
                  ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> Entreprise / B2B
            </button>
          </div>
        </div>

        {/* Sender Contact Information Bar with Autocomplete */}
        <div className="mt-5 pt-5 border-t border-slate-100 bg-slate-50/80 p-5 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Coordonnées de l'Expéditeur
              (Vides par défaut, autocomplétion intelligente)
            </span>
            {selectedVendorId && (
              <button
                type="button"
                onClick={() => {
                  setSelectedVendorId(null);
                  setSenderName("");
                  setSenderPhone("");
                  setSenderAddress("");
                  setContactPerson("");
                }}
                className="text-[11px] font-semibold text-slate-500 hover:text-red-600 transition-colors"
              >
                ✕ Vider les champs expéditeur
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Sender Name with Datalist Autocomplete */}
            <div className="relative">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Nom / Raison Sociale Expéditeur *
              </label>
              <input
                type="text"
                list="sender-suggestions"
                data-testid="sender-name-input"
                value={senderName}
                onChange={(e) => handleSenderNameChange(e.target.value)}
                placeholder="Tapez le nom ou choisissez ci-dessous..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <datalist id="sender-suggestions">
                {vendors.map((v) => (
                  <option key={v.id} value={v.nom}>
                    {v.type_expediteur} • {v.telephone}
                  </option>
                ))}
              </datalist>
            </div>

            {/* Sender Phone */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" /> Téléphone Expéditeur
                </label>
                {senderPhone && <OperatorBadge operator={senderPhoneDetect.operator} isSmall />}
              </div>
              <input
                type="text"
                data-testid="sender-phone-input"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                placeholder="034 00 000 00"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Sender Address */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                <MapPin className="w-3 h-3 text-slate-400" /> Adresse / Quartier Expéditeur
              </label>
              <input
                type="text"
                data-testid="sender-address-input"
                value={senderAddress}
                onChange={(e) => setSenderAddress(e.target.value)}
                placeholder="Quartier de ramassage ou siège..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Fast Quick-Select Dropdown */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                Sélection Rapide Référencée :
              </label>
              <select
                data-testid="vendor-select"
                value={selectedVendorId || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    setSelectedVendorId(null);
                    setSenderName("");
                    setSenderPhone("");
                    setSenderAddress("");
                    setContactPerson("");
                  } else {
                    const id = Number(val);
                    const found = vendors.find((v) => v.id === id);
                    if (found) applyVendorData(found);
                  }
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">-- Choisir un expéditeur enregistré --</option>
                {availableVendorsForType.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nom} ({v.type_expediteur})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Autocomplete Quick Pills for Registered Senders */}
          {availableVendorsForType.length > 0 && (
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Suggestions rapides :
              </span>
              {availableVendorsForType.slice(0, 4).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => applyVendorData(v)}
                  className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 transition-all shadow-2xs"
                >
                  ⚡ {v.nom}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lot Financial Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 border-l-4 border-l-slate-400 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Nombre de Colis</span>
          <p className="text-lg font-bold text-slate-900 mt-0.5 tabular-nums">{totalParcels}</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 border-l-4 border-l-blue-500 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Marchandise</span>
          <p className="text-lg font-bold text-slate-900 mt-0.5 font-mono tabular-nums">
            {totalMerchandise.toLocaleString("fr-FR")} Ar
          </p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 border-l-4 border-l-indigo-500 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Frais Livraison</span>
          <p className="text-lg font-bold text-slate-900 mt-0.5 font-mono tabular-nums">
            {totalFees.toLocaleString("fr-FR")} Ar
          </p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 border-l-4 border-l-emerald-500 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Global à Encaisser</span>
          <p data-testid="total-to-collect" className="text-lg font-bold text-emerald-700 font-mono mt-0.5 tabular-nums">
            {formatAriary(totalToCollect)}
          </p>
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success alert for new zone attached to axis */}
      {zoneSuccessMessage && (
        <div
          data-cy="alert-zone-success"
          className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between text-sm shadow-xs animate-in fade-in"
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{zoneSuccessMessage}</span>
          </div>
          <button
            onClick={() => setZoneSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Form: Spacious, Non-Overflowing Multi-Colis Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Détails des Colis à Réceptionner ({rows.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={addRow}
            data-testid="add-row-btn"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> Ajouter un Colis
          </button>
        </div>

        {/* Parcels Cards List (No Horizontal Scroll / No Text Cutting) */}
        <div className="space-y-4">
          {rows.map((row, idx) => {
            const phoneDetect = detectMalagasyPhone(row.recipientPhone);
            const rowTotal =
              (Number(row.merchandiseAmount) || 0) + (Number(row.deliveryFee) || 0);

            return (
              <div
                key={row.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all space-y-4"
              >
                {/* Row Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-black">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      Colis #{idx + 1} • Statut prévu : <span className="text-amber-700">EN_DEPOT</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-extrabold text-slate-800">
                      Total Dû : <span className="text-blue-700">{formatAriary(rowTotal)}</span>
                    </span>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        className="inline-flex items-center gap-1 text-slate-400 hover:text-red-600 text-xs font-semibold transition-colors"
                      >
                        <Trash2 className="w-4 h-4" /> Supprimer
                      </button>
                    )}
                  </div>
                </div>

                {/* Form Fields: Grid Layout with Natural Multi-Line Wrapping */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Destinataire Nom (col-span-3 - Facultatif) */}
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Destinataire (Nom facultatif)
                    </label>
                    <input
                      type="text"
                      data-testid={`input-name-${idx}`}
                      value={row.recipientName}
                      onChange={(e) => updateRow(idx, "recipientName", e.target.value)}
                      placeholder="Nom (laisser vide = Client)..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Destinataire Téléphone (col-span-3) */}
                  <div className="md:col-span-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        Téléphone Dest. (10 chiffres) *
                      </label>
                      {row.recipientPhone && (
                        <OperatorBadge operator={phoneDetect.operator} isSmall />
                      )}
                    </div>
                    <input
                      type="text"
                      data-testid={`input-phone-${idx}`}
                      value={row.recipientPhone}
                      onChange={(e) => updateRow(idx, "recipientPhone", e.target.value)}
                      placeholder="034 00 000 00"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Désignation de la Marchandise / Colis (col-span-3) */}
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Désignation / Nature du Colis
                    </label>
                    <input
                      type="text"
                      data-testid={`input-designation-${idx}`}
                      value={row.designation}
                      onChange={(e) => updateRow(idx, "designation", e.target.value)}
                      placeholder="Ex: Chaussures Nike, Robe, Smartphone..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Flux Type (col-span-3) */}
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Type de Flux Logistique
                    </label>
                    <select
                      value={row.fluxType}
                      onChange={(e) => updateRow(idx, "fluxType", e.target.value as FluxType)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="COD">COD (Marchandise + Livraison)</option>
                      <option value="SIMPLE">Course Simple (Port Payé)</option>
                      <option value="RETOUR">Retour SAV / Échange</option>
                      <option value="PROVINCE">Fret Province (Gare Routière)</option>
                    </select>
                  </div>

                  {/* Delivery Address (Multi-line Textarea with Natural Wrapping, col-span-6) */}
                  <div className="md:col-span-6 space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span>Lieu & Repère de Livraison (Multilignes) *</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        Retour à la ligne automatique sans coupure
                      </span>
                    </label>
                    <textarea
                      rows={2}
                      data-testid={`input-address-${idx}`}
                      value={row.deliveryAddress}
                      onChange={(e) => updateRow(idx, "deliveryAddress", e.target.value)}
                      placeholder="Quartier, point de repère, porte, numéro de lot..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none whitespace-normal break-words overflow-visible leading-relaxed"
                    />
                    {row.isAxisFallback && row.deliveryAddress.trim().length > 2 && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                          ⚠️ Lieu non répertorié
                        </span>
                        <button
                          type="button"
                          data-cy={`btn-quick-add-zone-${idx}`}
                          onClick={() => handleOpenAddZoneModal(idx)}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                        >
                          Rattacher à l'axe & fixer tarif ➔
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Axis Selection & Badge (col-span-3) */}
                  <div className="md:col-span-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        Axe Logistique (Manuel & Modifiable)
                      </label>
                      {row.isManualAxis && (
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          Choix Manuel
                        </span>
                      )}
                    </div>
                    {row.fluxType === "PROVINCE" ? (
                      <div className="space-y-1.5">
                        <div className="relative">
                          <input
                            type="text"
                            list="province-axes-datalist"
                            data-testid={`input-province-axis-${idx}`}
                            data-cy={`input-province-axis-${idx}`}
                            value={getProvinceDisplayName(row.axis)}
                            onChange={(e) => handleProvinceAxisInputChange(idx, e.target.value)}
                            placeholder="Tapez l'axe de province (ex: Toamasina, Majunga...)"
                            className="w-full px-3 py-2 bg-purple-50/50 border border-purple-300 rounded-xl text-xs font-bold text-purple-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          />
                        </div>

                        {/* Inline Button to register new province axis if not yet in database */}
                        {isNewUnregisteredProvinceAxis(row.axis) && (
                          <div className="flex items-center justify-between gap-1 bg-purple-100/70 p-1.5 rounded-lg border border-purple-200">
                            <span className="text-[10px] text-purple-800 font-semibold truncate">
                              Nouvel axe : {getProvinceDisplayName(row.axis)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRegisterProvinceAxisFromRow(idx)}
                              data-cy={`btn-register-province-axis-${idx}`}
                              className="px-2 py-0.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px] font-bold shadow-xs transition shrink-0"
                            >
                              + Enregistrer l'axe
                            </button>
                          </div>
                        )}

                        {/* Quick Autocomplete Suggestions Chips */}
                        {provinceAxes.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap pt-0.5">
                            <span className="text-[9px] text-slate-400 font-semibold uppercase">Suggestions :</span>
                            {provinceAxes.map((pAx) => {
                              const isSelected = row.axis === pAx.code;
                              return (
                                <button
                                  key={pAx.code}
                                  type="button"
                                  onClick={() => selectProvinceAxis(idx, pAx.code)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition ${
                                    isSelected
                                      ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                                      : "bg-white text-purple-700 border-purple-200 hover:bg-purple-50"
                                  }`}
                                >
                                  🚌 {pAx.libelle.replace("Axe Province ", "").replace("AXE PROVINCE ", "")}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              updateRow(idx, "fluxType", "COD");
                              updateRow(idx, "axis", "AXE_CENTRE_1");
                            }}
                            className="text-[10px] text-slate-500 hover:text-blue-600 underline"
                          >
                            ← Revenir aux axes urbains
                          </button>
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded border border-purple-200 flex items-center gap-1">
                            📦 Expédition Province
                          </span>
                        </div>
                      </div>
                    ) : (
                      <select
                        data-testid={`select-axis-${idx}`}
                        data-cy={`select-axis-${idx}`}
                        value={row.axis}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "SWITCH_TO_PROVINCE") {
                            updateRow(idx, "fluxType", "PROVINCE");
                            updateRow(idx, "isManualAxis", true);
                          } else {
                            updateRow(idx, "axis", val as LogisticAxis);
                          }
                        }}
                        className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none transition ${
                          row.isManualAxis
                            ? "border-blue-400 bg-blue-50/20"
                            : "border-slate-300"
                        }`}
                      >
                        <optgroup label="📍 Réseau Urbain (Grand Tanà - 9 Axes Réels)">
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
                        <optgroup label="🚚 Expéditions Régionales">
                          <option value="SWITCH_TO_PROVINCE">➔ Expédition Province (Saisie Manuelle & Autocomplétion)...</option>
                        </optgroup>
                      </select>
                    )}
                    <div className="pt-0.5 flex items-center justify-between gap-1 flex-wrap">
                      <AxisBadge
                        axis={row.axis}
                        isFallback={row.isAxisFallback}
                        isManual={row.isManualAxis}
                      />
                      <button
                        type="button"
                        data-cy={`btn-open-add-zone-${idx}`}
                        data-testid={`btn-open-add-zone-${idx}`}
                        onClick={() => handleOpenAddZoneModal(idx)}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100/80 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1 transition cursor-pointer"
                        title="Rattacher un nouveau quartier inconnu à un axe et définir son tarif"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Nouveau Quartier ?</span>
                      </button>
                    </div>
                  </div>

                  {/* Financial Amounts (col-span-3) */}
                  <div className="md:col-span-3 grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        Marchandise (Ar)
                      </label>
                      <input
                        type="number"
                        data-testid={`input-merch-${idx}`}
                        disabled={row.fluxType === "SIMPLE"}
                        value={row.merchandiseAmount === 0 ? "" : row.merchandiseAmount}
                        onChange={(e) =>
                          updateRow(idx, "merchandiseAmount", Number(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-right focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-700 block">
                          Frais Livraison (Ar)
                        </label>
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                            row.deliveryFee === 3000
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : row.deliveryFee === 4000
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : row.deliveryFee === 5000
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}
                        >
                          {row.deliveryFee === 3000
                            ? "3 000 Ar • CUA"
                            : row.deliveryFee === 4000
                            ? "4 000 Ar • Péri-Urbain"
                            : row.deliveryFee === 5000
                            ? "5 000 Ar • Couronne"
                            : "Tarif Manuel"}
                        </span>
                      </div>
                      <input
                        type="number"
                        data-testid={`input-fee-${idx}`}
                        value={row.deliveryFee === 0 ? "" : row.deliveryFee}
                        onChange={(e) =>
                          updateRow(idx, "deliveryFee", Number(e.target.value) || 0)
                        }
                        placeholder="3000"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-right focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Plage Horaire & Remarques Spéciales (md:col-span-12) */}
                  <div className="md:col-span-12 space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span>⏰ Plage Horaire / Remarque Spéciale Livraison *</span>
                        <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          Obligatoire
                        </span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        Ex: Matin avant 12h, Après 14h, Appeler 15min avant, Au bureau...
                      </span>
                    </label>
                    <input
                      type="text"
                      data-testid={`input-observation-${idx}`}
                      value={row.observation}
                      onChange={(e) => updateRow(idx, "observation", e.target.value)}
                      placeholder="Indiquez impérativement la plage horaire ou consigne spéciale pour le livreur..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
                    />

                    {/* Quick tags for easy one-click input */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">Raccourcis :</span>
                      <button
                        type="button"
                        onClick={() => updateRow(idx, "observation", "⚡ URGENT - Livraison immédiate")}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
                      >
                        ⚡ URGENT
                      </button>
                      <button
                        type="button"
                        onClick={() => updateRow(idx, "observation", "Matin (08h - 12h)")}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
                      >
                        ⏰ Matin (8h-12h)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateRow(idx, "observation", "Après-midi (13h - 17h)")}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition cursor-pointer"
                      >
                        ⏰ Après-midi (13h-17h)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateRow(idx, "observation", "📞 Appeler 15 min avant d'arriver")}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                      >
                        📞 Appeler avant
                      </button>
                      <button
                        type="button"
                        onClick={() => updateRow(idx, "observation", "📅 Livraison planifiée pour demain")}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition cursor-pointer"
                      >
                        📅 Planifié Demain
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            Chaque colis recevra un numéro de bordereau officiel unique <strong className="text-blue-700">BDR-XXXX</strong> et entrera en stock sous statut <strong className="text-amber-700">EN_DEPOT</strong>.
          </p>

          <button
            type="submit"
            data-testid="submit-batch-btn"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Enregistrement en cours...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" /> Valider la Réception du Lot ({rows.length})
              </>
            )}
          </button>
        </div>
      </form>

      {/* Success Modal / Card for Generated BDRs */}
      {createdParcels && (
        <div
          data-testid="success-modal"
          className="bg-white p-6 rounded-2xl border-2 border-emerald-500 shadow-xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  Réception Validée : {createdParcels.length} Colis Enregistrés !
                </h3>
                <p className="text-xs text-slate-500">
                  Expéditeur : <strong className="text-slate-800">{senderName}</strong> ({senderType}) • Téléphone : {senderPhone || "N/A"}
                </p>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl shadow"
            >
              <Printer className="w-4 h-4" /> Imprimer les Étiquettes Barcode
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {createdParcels.map((p) => (
              <div
                key={p.id}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-sm text-blue-700">
                    BDR-{p.tracking_number}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                    {p.status}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-800 truncate">{p.recipient_name}</p>
                {p.designation && (
                  <p className="text-[11px] text-blue-700 font-semibold italic truncate">
                    📦 {p.designation}
                  </p>
                )}
                <p className="text-[11px] text-slate-500">
                  {p.recipient_phone_formatted} • {p.operator}
                </p>
                <p className="text-[11px] text-slate-600 break-words line-clamp-2">
                  {p.delivery_address}
                </p>
                <div className="pt-1 flex items-center justify-between border-t border-slate-200 text-xs">
                  <span className="text-[11px] font-medium text-slate-500">{p.axis}</span>
                  <span className="font-black text-slate-800">
                    {p.total_to_collect_formatted}
                  </span>
                </div>
                {(p.receptionniste_nom || activeReceptionist) && (
                  <div className="text-[10px] text-slate-500 font-semibold flex items-center justify-between pt-0.5">
                    <span className="text-slate-400">Pris en charge par :</span>
                    <span className="text-blue-700 font-bold">
                      {p.receptionniste_nom || activeReceptionist?.nom}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-right pt-2">
            <button
              onClick={() => {
                setCreatedParcels(null);
                const currentFlux = activeReceptionist ? activeReceptionist.flux : "COD";
                const isProv = currentFlux === "PROVINCE";
                setRows([
                  {
                    id: "row-1",
                    recipientName: "",
                    recipientPhone: "",
                    designation: "",
                    deliveryAddress: isProv ? "Gare Routière " : "",
                    axis: isProv ? ("AXE_PROVINCE" as LogisticAxis) : ("AXE_CENTRE_1" as LogisticAxis),
                    isAxisFallback: !isProv,
                    isManualAxis: isProv,
                    fluxType: currentFlux as FluxType,
                    merchandiseAmount: 0,
                    deliveryFee: isProv ? 10000 : 3000,
                    observation: "",
                  },
                ]);
              }}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              Enregistrer un autre lot ➔
            </button>
          </div>
        </div>
      )}

      {/* Datalist for Province Axes Autocomplete */}
      <datalist id="province-axes-datalist">
        {provinceAxes.map((pAx) => (
          <option
            key={pAx.code}
            value={pAx.libelle.replace("Axe Province ", "").replace("AXE PROVINCE ", "")}
          >
            {pAx.code}
          </option>
        ))}
      </datalist>

      {/* Modal : Rattacher un Nouveau Quartier / Lieu à un Axe */}
      {isAddZoneModalOpen && (
        <div
          data-cy="modal-add-zone-to-axis"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-base">
                  📍
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-wide">Rattacher un Nouveau Quartier</h3>
                  <p className="text-[11px] text-blue-100">Enrichir le référentiel des axes logistiques</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddZoneModalOpen(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
                data-cy="btn-close-add-zone-modal"
              >
                ✕
              </button>
            </div>

            {/* Body Form */}
            <div className="p-5 space-y-4">
              {/* Zone Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Nom du Quartier / Lieu Inconnu *
                </label>
                <input
                  type="text"
                  data-cy="input-modal-zone-name"
                  value={modalZoneName}
                  onChange={(e) => setModalZoneName(e.target.value)}
                  placeholder="Ex : Ampitatafika Avaratra, Ambohitrandriana..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Axis Selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Axe Logistique de Rattachement *
                </label>
                <select
                  data-cy="select-modal-axis"
                  value={modalSelectedAxis}
                  onChange={(e) => setModalSelectedAxis(e.target.value as LogisticAxis)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <optgroup label="📍 Réseau Urbain (Grand Tanà - 9 Axes Réels)">
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
                </select>
              </div>

              {/* Tariff Selection according to CDC 5.3 */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Grille Tarifaire Applicable (CDC 5.3) *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    data-cy="btn-select-fee-3000"
                    onClick={() => setModalSelectedFee(3000)}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                      modalSelectedFee === 3000
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500 font-bold"
                        : "border-slate-200 hover:border-slate-300 text-slate-600"
                    }`}
                  >
                    <span className="block text-xs font-black">3 000 Ar</span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">Intra-CUA</span>
                  </button>
                  <button
                    type="button"
                    data-cy="btn-select-fee-4000"
                    onClick={() => setModalSelectedFee(4000)}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                      modalSelectedFee === 4000
                        ? "border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-500 font-bold"
                        : "border-slate-200 hover:border-slate-300 text-slate-600"
                    }`}
                  >
                    <span className="block text-xs font-black">4 000 Ar</span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">1ère Couronne</span>
                  </button>
                  <button
                    type="button"
                    data-cy="btn-select-fee-5000"
                    onClick={() => setModalSelectedFee(5000)}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                      modalSelectedFee === 5000
                        ? "border-purple-600 bg-purple-50 text-purple-800 ring-2 ring-purple-500 font-bold"
                        : "border-slate-200 hover:border-slate-300 text-slate-600"
                    }`}
                  >
                    <span className="block text-xs font-black">5 000 Ar</span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">Périphérie</span>
                  </button>
                </div>
              </div>

              {modalError && (
                <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  {modalError}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                data-cy="btn-cancel-add-zone"
                onClick={() => setIsAddZoneModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                data-cy="btn-submit-add-new-zone"
                onClick={handleConfirmAddZone}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>✓</span>
                <span>Enregistrer & Rattacher</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
