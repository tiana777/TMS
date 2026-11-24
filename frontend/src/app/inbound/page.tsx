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
  Copy,
  FileText,
  RotateCcw,
  Check,
  Download,
  Barcode,
  Clock,
  Bus,
} from "lucide-react";
import { detectMalagasyPhone, sanitizePhoneInput } from "../../lib/phone";
import {
  detectAxisClient,
  registerCustomZone,
  registerProvinceAxisClient,
  registerDynamicGare,
  syncMasterZones,
  getAxisForGareClient,
} from "../../lib/axis";
import {
  fetchVendors,
  createParcelBatch,
  addZoneToAxis,
  fetchAxes,
  createAxis,
  createVendor,
  fetchPartners,
  fetchMasterZones,
  createMasterZone,
} from "../../lib/api";
import { OperatorBadge } from "../../components/OperatorBadge";
import { AxisBadge } from "../../components/AxisBadge";
import { FluxType, LogisticAxis, SenderType, Vendor, Partner } from "../../types";
import { RECEPTIONIST_AGENTS, ReceptionistAgent, UserRole } from "../../components/HeaderUserRole";
import { useCompany } from "../../context/CompanyContext";

interface InboundRow {
  id: string;
  recipientName: string;
  recipientPhone: string;
  designation: string;
  deliveryAddress: string;
  axis: LogisticAxis;
  isAxisFallback: boolean;
  isManualAxis?: boolean;
  isManualFee?: boolean;
  fluxType: FluxType;
  merchandiseAmount: number;
  deliveryFee: number;
  observation: string;
  encaissementLieu?: "LIVREUR" | "SIEGE";
  timeMode?: "INTERVAL" | "SIMPLE";
}

function extractTimeRange(val: string): { start: string; end: string } {
  if (!val) return { start: "", end: "" };
  const m = val.match(/(\d{1,2})[h:](\d{2})?\s*[-–à]\s*(\d{1,2})[h:](\d{2})?/i);
  if (m) {
    const sH = m[1].padStart(2, "0");
    const sM = m[2] || "00";
    const eH = m[3].padStart(2, "0");
    const eM = m[4] || "00";
    return { start: `${sH}:${sM}`, end: `${eH}:${eM}` };
  }
  return { start: "", end: "" };
}

function extractSimpleTime(val: string): string {
  if (!val) return "";
  const m = val.match(/\b(\d{1,2})[h:](\d{2})?\b/i);
  if (m) {
    const h = m[1].padStart(2, "0");
    const mn = m[2] || "00";
    return `${h}:${mn}`;
  }
  return "";
}

export default function InboundPage() {
  const { company } = useCompany();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [senderType, setSenderType] = useState<SenderType>("CYBERMARCHAND");
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);

  // Sender contact fields - EMPTY BY DEFAULT as requested
  const [senderName, setSenderName] = useState<string>("");
  const [senderPhone, setSenderPhone] = useState<string>("");
  const [senderAddress, setSenderAddress] = useState<string>("");
  const [contactPerson, setContactPerson] = useState<string>("");

  const isSenderSpecified = Boolean(senderName.trim());

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
      encaissementLieu: "LIVREUR",
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdParcels, setCreatedParcels] = useState<any[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal state for attaching a new zone / location to an axis
  const [isAddZoneModalOpen, setIsAddZoneModalOpen] = useState<boolean>(false);
  const [modalTargetRowIndex, setModalTargetRowIndex] = useState<number>(0);
  const [modalZoneName, setModalZoneName] = useState<string>("");
  const [modalZoneType, setModalZoneType] = useState<"quartier" | "gare" | "cooperative">("gare");
  const [modalDestinations, setModalDestinations] = useState<string>("");
  const [modalSelectedAxis, setModalSelectedAxis] = useState<LogisticAxis>("AXE_CENTRE_2");
  const [modalSelectedFee, setModalSelectedFee] = useState<number>(3000);
  const [modalError, setModalError] = useState<string | null>(null);
  const [zoneSuccessMessage, setZoneSuccessMessage] = useState<string | null>(null);

  // Receptionist Desk & Role State (Synchronisé avec l'authentification officielle)
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>("SUPER_ADMIN");
  const [currentUserName, setCurrentUserName] = useState<string>("Super Administrateur");
  const [activeReceptionist, setActiveReceptionist] = useState<ReceptionistAgent | null>(null);

  // Vendor Quick Registration & Print modes
  const [isSavingVendor, setIsSavingVendor] = useState<boolean>(false);
  const [printViewMode, setPrintViewMode] = useState<"BDR" | "LABELS">("BDR");
  const [showSenderSuggestions, setShowSenderSuggestions] = useState<boolean>(false);

  // Modal state for adding a new sender / vendor
  const [isNewSenderModalOpen, setIsNewSenderModalOpen] = useState<boolean>(false);
  const [newVendorName, setNewVendorName] = useState<string>("");
  const [newVendorType, setNewVendorType] = useState<SenderType>("CYBERMARCHAND");
  const [newVendorPhone, setNewVendorPhone] = useState<string>("");
  const [newVendorAddress, setNewVendorAddress] = useState<string>("");
  const [newVendorContact, setNewVendorContact] = useState<string>("");
  const [newVendorError, setNewVendorError] = useState<string | null>(null);
  const [isSubmittingNewVendor, setIsSubmittingNewVendor] = useState<boolean>(false);

  const openNewSenderModal = (nameOverride?: string) => {
    setNewVendorType(senderType);
    setNewVendorName(nameOverride !== undefined ? nameOverride.trim() : senderName.trim());
    setNewVendorPhone(senderPhone.trim());
    setNewVendorAddress(senderAddress.trim());
    setNewVendorContact(contactPerson.trim());
    setNewVendorError(null);
    setIsNewSenderModalOpen(true);
  };

  const handleConfirmAddNewVendor = async () => {
    const cleanName = newVendorName.trim();
    if (!cleanName) {
      setNewVendorError("Le nom ou raison sociale de l'expéditeur est obligatoire.");
      return;
    }

    if (newVendorPhone.trim()) {
      const phoneDetect = detectMalagasyPhone(newVendorPhone);
      if (!phoneDetect.isValid) {
        setNewVendorError("Numéro de téléphone malgache invalide (10 chiffres : 032, 033, 034, 035, 036, 037, 038) ou laissez vide.");
        return;
      }
    }

    setIsSubmittingNewVendor(true);
    setNewVendorError(null);
    try {
      const created = await createVendor({
        nom: cleanName,
        type_expediteur: newVendorType,
        telephone: newVendorPhone.trim() || undefined,
        adresse: newVendorAddress.trim() || undefined,
        contact_responsable: newVendorContact.trim() || undefined,
        modalite_paiement: newVendorType === "ENTREPRISE" ? "FACTURE_MENSUELLE" : "COMPTANT",
      });

      setVendors((prev) => [...prev, created]);
      setSenderType(newVendorType);
      applyVendorData(created);

      setZoneSuccessMessage(`Expéditeur "${created.nom}" (${created.type_expediteur}) enregistré et sélectionné avec succès !`);
      setTimeout(() => setZoneSuccessMessage(null), 5000);

      setIsNewSenderModalOpen(false);
      setNewVendorName("");
      setNewVendorPhone("");
      setNewVendorAddress("");
      setNewVendorContact("");
    } catch (err: any) {
      setNewVendorError(err.message || "Erreur lors de l'enregistrement de l'expéditeur.");
    } finally {
      setIsSubmittingNewVendor(false);
    }
  };

  useEffect(() => {
    const syncRole = () => {
      if (typeof window === "undefined") return;
      const role = (localStorage.getItem("tms_user_role") as UserRole) || "SUPER_ADMIN";
      const username = localStorage.getItem("tms_username") || "admin";
      const nom = localStorage.getItem("tms_user_nom");

      setCurrentUserRole(role);
      setCurrentUserName(nom || (username === "directeur" ? "Directeur des Opérations" : "Super Administrateur"));

      if (role === "RECEPTIONNISTE" || username.startsWith("agent") || username.startsWith("recep_")) {
        const found = RECEPTIONIST_AGENTS.find((a) => a.username === username) || RECEPTIONIST_AGENTS[0];
        setActiveReceptionist({
          ...found,
          nom: nom || found.nom,
        });
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

  const duplicateRow = (index: number) => {
    const source = rows[index];
    if (!source) return;
    const duplicated: InboundRow = {
      ...source,
      id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      recipientName: "",
      recipientPhone: "",
    };
    setRows((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, duplicated);
      return copy;
    });
  };

  const addMultipleRows = (count: number) => {
    const newRows: InboundRow[] = Array.from({ length: count }, (_, i) => ({
      id: `row-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
      recipientName: "",
      recipientPhone: "",
      designation: "",
      deliveryAddress: "",
      axis: "AXE_CENTRE_1" as LogisticAxis,
      isAxisFallback: true,
      isManualAxis: false,
      fluxType: "COD" as FluxType,
      merchandiseAmount: 0,
      deliveryFee: 3000,
      observation: "",
      encaissementLieu: "LIVREUR",
    }));
    setRows((prev) => [...prev, ...newRows]);
  };

  const resetRows = () => {
    if (typeof window !== "undefined" && window.confirm("Voulez-vous vraiment réinitialiser la grille et repartir avec 1 colis vierge ?")) {
      setRows([
        {
          id: `row-${Date.now()}`,
          recipientName: "",
          recipientPhone: "",
          designation: "",
          deliveryAddress: "",
          axis: "AXE_CENTRE_1" as LogisticAxis,
          isAxisFallback: true,
          isManualAxis: false,
          fluxType: "COD" as FluxType,
          merchandiseAmount: 0,
          deliveryFee: 3000,
          observation: "",
          encaissementLieu: "LIVREUR",
        },
      ]);
    }
  };

  const isCurrentSenderRegistered = Boolean(
    selectedVendorId ||
    vendors.some(
      (v) => v.nom.toLowerCase().trim() === senderName.toLowerCase().trim() && senderName.trim().length > 0
    )
  );

  const senderNameTrimmed = senderName.trim().toLowerCase();
  const matchingVendors = senderNameTrimmed
    ? vendors.filter((v) => v.nom.toLowerCase().includes(senderNameTrimmed))
    : [];
  const isExactVendorMatch = vendors.some(
    (v) => v.nom.toLowerCase().trim() === senderNameTrimmed
  );

  const handleQuickRegisterVendor = async () => {
    const cleanName = senderName.trim();
    if (!cleanName) return;
    setIsSavingVendor(true);
    setErrorMessage(null);
    try {
      const created = await createVendor({
        nom: cleanName,
        type_expediteur: senderType,
        telephone: senderPhone.trim() || undefined,
        adresse: senderAddress.trim() || undefined,
        contact_responsable: contactPerson.trim() || undefined,
        modalite_paiement: "COMPTANT",
      });
      setVendors((prev) => [...prev, created]);
      setSelectedVendorId(created.id);
      setZoneSuccessMessage(`Nouveau partenaire "${created.nom}" (${senderType}) enregistré avec succès dans le CRM !`);
      setTimeout(() => setZoneSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors de l'enregistrement du partenaire.");
    } finally {
      setIsSavingVendor(false);
    }
  };

  const handleOpenAddZoneModal = (rowIndex: number) => {
    setModalTargetRowIndex(rowIndex);
    const row = rows[rowIndex];
    const rawAddr = row ? row.deliveryAddress.trim() : "";
    setModalZoneName(rawAddr);
    const lower = rawAddr.toLowerCase();
    if (lower.includes("coop") || lower.includes("cotisse") || lower.includes("besady") || lower.includes("soatrans") || lower.includes("kofmad")) {
      setModalZoneType("cooperative");
    } else if (lower.includes("gare") || row?.fluxType === "PROVINCE") {
      setModalZoneType("gare");
    } else {
      setModalZoneType("quartier");
    }
    setModalDestinations("");
    setModalSelectedAxis(row?.axis || "AXE_CENTRE_2");
    setModalSelectedFee(row?.deliveryFee || 3000);
    setModalError(null);
    setIsAddZoneModalOpen(true);
  };

  const handleConfirmAddZone = async () => {
    const cleanName = modalZoneName.trim();
    if (!cleanName) {
      setModalError("Le nom du quartier ou de la gare est obligatoire.");
      return;
    }

    try {
      // 1. Persist directly to DB via API
      await createMasterZone({
        nom: cleanName,
        axe_code: modalSelectedAxis,
        type: modalZoneType,
        tarif_livraison: modalSelectedFee,
        destinations: modalDestinations.trim() || undefined,
      });

      // 2. Register in client-side runtime detector (immediate continuous learning)
      registerDynamicGare({
        name: cleanName,
        axis: modalSelectedAxis,
        type: modalZoneType,
        fee: modalSelectedFee,
        destinations: modalDestinations.trim() || undefined,
      });

      // 3. Update the target row immediately
      setRows((prev) => {
        const copy = [...prev];
        if (copy[modalTargetRowIndex]) {
          copy[modalTargetRowIndex] = {
            ...copy[modalTargetRowIndex],
            axis: modalSelectedAxis,
            deliveryFee: modalSelectedFee,
            isAxisFallback: false,
            isManualAxis: true,
            fluxType: modalZoneType === "quartier" ? copy[modalTargetRowIndex].fluxType : "PROVINCE",
          };
        }
        return copy;
      });

      const labelType = modalZoneType === "gare" ? "Gare" : modalZoneType === "cooperative" ? "Coopérative" : "Quartier";
      setZoneSuccessMessage(
        `${labelType} "${cleanName}" enregistrée et rattachée avec succès à ${modalSelectedAxis} (${modalSelectedFee.toLocaleString("fr-FR")} Ar) !`
      );
      setTimeout(() => setZoneSuccessMessage(null), 6000);
      setIsAddZoneModalOpen(false);
    } catch (err: any) {
      setModalError(err.message || "Erreur lors de l'enregistrement de la gare/zone.");
    }
  };

  // Registered Province Axes state for dynamic manual entry and autocomplete
  const [provinceAxes, setProvinceAxes] = useState<{ id?: number; code: string; libelle: string }[]>([]);

  // 7 Gares Routières et Coopératives Nationales officielles du Référentiel
  const DEFAULT_PARTNERS: Partner[] = [
    { id: 6, nom: "Besady Plus", type: "COOPERATIVE", gare_rattachement: "Andohatapenaka", contact: "033 15 444 77" },
    { id: 4, nom: "Cotisse Transport", type: "COOPERATIVE", gare_rattachement: "Ambodivona", contact: "032 11 025 00" },
    { id: 1, nom: "Gare Routière Ambodivona", type: "GARE", gare_rattachement: "Ambodivona", contact: "034 00 111 22" },
    { id: 3, nom: "Gare Routière Andohatapenaka (Maki)", type: "GARE", gare_rattachement: "Andohatapenaka", contact: "033 00 333 44" },
    { id: 2, nom: "Gare Routière Fasan'ny Karana", type: "GARE", gare_rattachement: "Fasan'ny Karana", contact: "032 00 222 33" },
    { id: 5, nom: "Kofmad Transport", type: "COOPERATIVE", gare_rattachement: "Fasan'ny Karana", contact: "034 22 555 88" },
    { id: 7, nom: "Trans Texpress", type: "COOPERATIVE", gare_rattachement: "Ambodivona", contact: "034 88 999 00" },
  ];

  const [partners, setPartners] = useState<Partner[]>(DEFAULT_PARTNERS);

  const loadPartners = async () => {
    try {
      const data = await fetchPartners();
      if (Array.isArray(data) && data.length > 0) {
        setPartners(data);
      }
    } catch (e) {
      console.warn("Could not load partners", e);
    }
  };

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
    loadPartners();
    fetchMasterZones().then((zones) => {
      if (zones && Array.isArray(zones)) {
        syncMasterZones(zones);
      }
    }).catch(() => {});
  }, []);

  const selectPartnerOrGare = (idx: number, partner: Partner) => {
    let targetAxis: LogisticAxis = "AXE_CENTRE_2";
    const gare = (partner.gare_rattachement || "").toLowerCase();
    const nom = partner.nom.toLowerCase();
    const combined = `${gare} ${nom}`;

    if (combined.includes("ambodivona")) {
      targetAxis = "AXE_CENTRE_2";
    } else if (combined.includes("ampasapito")) {
      targetAxis = "AXE_AMBOHIMANGAKELY";
    } else if (combined.includes("andranobevava")) {
      targetAxis = "AXE_SABOTSY_NAMEHANA";
    } else if (combined.includes("anosibe")) {
      targetAxis = "AXE_AMPITATAFIKA";
    } else if (combined.includes("ankadimbahoaka") || combined.includes("fasan")) {
      targetAxis = "AXE_IAVOLOHA";
    } else if (combined.includes("behoririka")) {
      targetAxis = "AXE_CENTRE_1";
    } else if (combined.includes("andohatapenaka") || combined.includes("maki")) {
      targetAxis = "AXE_ITAOSY";
    } else if (combined.includes("anosizato")) {
      targetAxis = "AXE_AMPITATAFIKA";
    } else if (combined.includes("amoronakona")) {
      targetAxis = "AXE_ALASORA";
    }

    setRows((prev) => {
      const copy = [...prev];
      if (copy[idx]) {
        const currentAddr = (copy[idx].deliveryAddress || "").trim();
        let newAddress = currentAddr;
        if (!currentAddr || currentAddr.toLowerCase().startsWith("gare") || currentAddr.toLowerCase().includes("province")) {
          const gareSuffix = partner.gare_rattachement ? ` (Gare ${partner.gare_rattachement})` : "";
          newAddress = `${partner.nom}${gareSuffix}`;
        }

        copy[idx] = {
          ...copy[idx],
          axis: targetAxis,
          fluxType: "PROVINCE",
          isManualAxis: true,
          isAxisFallback: false,
          deliveryAddress: newAddress,
        };
      }
      return copy;
    });
  };

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
    setShowSenderSuggestions(true);
    // Dynamic autocomplete: if typed name matches an existing registered vendor
    const match = vendors.find(
      (v) => v.nom.toLowerCase().trim() === val.toLowerCase().trim()
    );
    if (match) {
      applyVendorData(match);
    } else if (selectedVendorId) {
      setSelectedVendorId(null);
    }
  };

  const handleSenderTypeChange = (type: SenderType) => {
    setSenderType(type);
    // Keep user's focus clean: clear or filter suggestions
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}`,
        recipientName: "",
        recipientPhone: "",
        designation: "",
        deliveryAddress: "",
        axis: "AXE_CENTRE_1" as LogisticAxis,
        isAxisFallback: true,
        isManualAxis: false,
        fluxType: "COD" as FluxType,
        merchandiseAmount: 0,
        deliveryFee: 3000,
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

      // Auto-detect axis and fee when address changes (Tarification automatique CDC 5.3 / manuelle si modifiée)
      if (field === "deliveryAddress") {
        const detection = detectAxisClient(value);
        if (!target.isManualFee) {
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

      // If user directly changes deliveryFee, mark as manual fee override
      if (field === "deliveryFee") {
        target.isManualFee = true;
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
        encaissement_lieu: r.encaissementLieu || "LIVREUR",
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
    <div className="max-w-7xl mx-auto space-y-5 pb-12">
      {/* Header & Title */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span className="text-blue-600">📦</span> Réception Quai & Inbound
            </h2>
          </div>

          {/* Sender Type Selector Tabs */}
          <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 gap-1 self-start sm:self-auto">
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

        {/* Sender Contact Information Bar */}
        <div className="mt-5 pt-5 border-t border-slate-100 bg-slate-50/80 p-5 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Coordonnées de l'Expéditeur
            </span>
            <div className="flex items-center gap-3">
              {selectedVendorId && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600" /> Partenaire Référencé (#{selectedVendorId})
                </span>
              )}
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
                  className="text-[11px] font-semibold text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                >
                  ✕ Vider les champs expéditeur
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Sender Name with Smart Auto-Suggestions */}
            <div className="relative">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Nom / Raison Sociale Expéditeur *
              </label>
              <div className="relative">
                <input
                  type="text"
                  data-testid="sender-name-input"
                  value={senderName}
                  onFocus={() => {
                    if (senderName.trim().length > 0) setShowSenderSuggestions(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowSenderSuggestions(false), 250);
                  }}
                  onChange={(e) => handleSenderNameChange(e.target.value)}
                  placeholder="Tapez le nom de l'expéditeur..."
                  className="w-full px-3 py-2 pr-7 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                {senderName && (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => {
                      setSenderName("");
                      setSelectedVendorId(null);
                      setShowSenderSuggestions(false);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer p-0.5"
                    title="Effacer le nom"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Auto-Suggestion Floating Dropdown */}
              {showSenderSuggestions && senderName.trim().length > 0 && (
                <div
                  data-testid="sender-suggestions-popup"
                  className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-40 max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-100"
                >
                  {matchingVendors.length > 0 ? (
                    <>
                      <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        <span>Expéditeurs existants ({matchingVendors.length})</span>
                        <span className="text-[9px] text-blue-600 font-semibold">Cliquer pour auto-compléter</span>
                      </div>
                      {matchingVendors.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applyVendorData(v);
                            setShowSenderSuggestions(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 transition flex items-center justify-between cursor-pointer group"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-800 group-hover:text-blue-700 truncate">
                                {v.nom}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-semibold flex-shrink-0">
                                {v.type_expediteur}
                              </span>
                            </div>
                            {v.adresse && (
                              <p className="text-[10px] text-slate-400 truncate">
                                📍 {v.adresse}
                              </p>
                            )}
                          </div>
                          {v.telephone && (
                            <span className="text-[11px] font-mono text-slate-500 font-semibold flex-shrink-0">
                              {v.telephone}
                            </span>
                          )}
                        </button>
                      ))}
                    </>
                  ) : (
                    <div className="p-3 text-center text-xs text-slate-500">
                      Aucun expéditeur enregistré ne correspond à &quot;{senderName.trim()}&quot;
                    </div>
                  )}

                  {/* Option to add as new vendor if not exact match */}
                  {!isExactVendorMatch && (
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setShowSenderSuggestions(false);
                        openNewSenderModal(senderName);
                      }}
                      className="w-full text-left px-3 py-2.5 bg-blue-50/90 hover:bg-blue-100 text-blue-700 transition flex items-center gap-2 text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span>➕ Ajouter &quot;{senderName.trim()}&quot; comme nouveau...</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Sender Phone (Facultatif) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" /> Téléphone Expéditeur <span className="font-normal text-slate-400 text-[10px]">(Facultatif)</span>
                </label>
                <div className="flex items-center gap-1">
                  {senderPhone && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      senderPhone.length === 10
                        ? "text-emerald-700 bg-emerald-50 border-emerald-200 font-bold"
                        : "text-amber-700 bg-amber-50 border-amber-200"
                    }`}>
                      {senderPhone.length}/10 {senderPhone.length === 10 ? "✓" : ""}
                    </span>
                  )}
                  {senderPhone && <OperatorBadge operator={senderPhoneDetect.operator} isSmall />}
                </div>
              </div>
              <input
                type="tel"
                maxLength={10}
                data-testid="sender-phone-input"
                value={senderPhone}
                onChange={(e) => setSenderPhone(sanitizePhoneInput(e.target.value))}
                placeholder="0340000000"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Sender Address (Facultatif) */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                <MapPin className="w-3 h-3 text-slate-400" /> Adresse / Quartier <span className="font-normal text-slate-400 text-[10px]">(Facultatif)</span>
              </label>
              <input
                type="text"
                data-testid="sender-address-input"
                value={senderAddress}
                onChange={(e) => setSenderAddress(e.target.value)}
                placeholder="Quartier ou repère (optionnel)..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Fast Quick-Select Dropdown with "Ajouter Nouveau" */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Sélection Expéditeur Référencé :
              </label>
              <select
                data-testid="vendor-select"
                value={selectedVendorId || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__ADD_NEW__") {
                    openNewSenderModal(senderName);
                    return;
                  }
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
                <option value="__ADD_NEW__" className="font-bold text-blue-700 bg-blue-50">
                  {senderName.trim() && !isCurrentSenderRegistered
                    ? `➕ + Ajouter "${senderName.trim()}" comme nouveau...`
                    : `➕ + Ajouter un nouvel expéditeur...`}
                </option>
                <optgroup label={`Expéditeurs ${senderType} enregistrés (${availableVendorsForType.length})`}>
                  {availableVendorsForType.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nom}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>
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
      <form onSubmit={handleSubmit} className="space-y-4 no-print">
        {/* Banner if sender name is missing */}
        {!isSenderSpecified && (
          <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-xl flex-shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Expéditeur non renseigné
                </h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  Veuillez d'abord renseigner au moins le <strong>Nom / Raison Sociale de l'expéditeur</strong> ci-dessus pour débloquer la saisie des colis.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const el = document.querySelector('input[data-testid="sender-name-input"]') as HTMLInputElement;
                if (el) {
                  el.focus();
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex-shrink-0 cursor-pointer text-center"
            >
              Renseigner l'Expéditeur ↑
            </button>
          </div>
        )}

        {/* Parcel Form Section: Disabled & Greyed-out when sender is not specified */}
        <fieldset
          disabled={!isSenderSpecified}
          className={`space-y-4 transition-all duration-200 ${
            !isSenderSpecified
              ? "opacity-40 grayscale pointer-events-none select-none cursor-not-allowed"
              : "opacity-100"
          }`}
        >
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Détails des Colis à Réceptionner ({rows.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Renseignez la marchandise, le destinataire et le quartier de livraison
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={addRow}
                data-testid="add-row-btn"
                disabled={!isSenderSpecified}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" /> Ajouter un colis
              </button>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={resetRows}
                  disabled={!isSenderSpecified}
                  className="inline-flex items-center gap-1 px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold transition-all cursor-pointer border border-rose-200 disabled:opacity-50"
                  title="Vider la grille et repartir avec 1 colis vierge"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser
                </button>
              )}
            </div>
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

                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <span className="text-xs font-extrabold text-slate-800">
                      Total Dû : <span className="text-blue-700">{formatAriary(rowTotal)}</span>
                    </span>

                    {/* Button Duplicate Row */}
                    <button
                      type="button"
                      onClick={() => duplicateRow(idx)}
                      title="Dupliquer ce colis avec la même marchandise, le même tarif et les mêmes consignes"
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Dupliquer</span>
                    </button>

                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" /> Supprimer
                      </button>
                    )}
                  </div>
                </div>

                {/* Form Fields: Grid Layout with Natural Multi-Line Wrapping */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  {/* Destinataire Nom (col-span-3 - Facultatif) */}
                  <div className="md:col-span-3 space-y-1">
                    <div className="h-5 flex items-center">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        Destinataire (Nom facultatif)
                      </label>
                    </div>
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
                    <div className="h-5 flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        Téléphone Dest. (10 chiffres) *
                      </label>
                      <div className="flex items-center gap-1">
                        {row.recipientPhone && (
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            row.recipientPhone.length === 10
                              ? "text-emerald-700 bg-emerald-50 border-emerald-200 font-bold"
                              : "text-amber-700 bg-amber-50 border-amber-200"
                          }`}>
                            {row.recipientPhone.length}/10 {row.recipientPhone.length === 10 ? "✓" : ""}
                          </span>
                        )}
                        {row.recipientPhone && (
                          <OperatorBadge operator={phoneDetect.operator} isSmall />
                        )}
                      </div>
                    </div>
                    <input
                      type="tel"
                      maxLength={10}
                      data-testid={`input-phone-${idx}`}
                      value={row.recipientPhone}
                      onChange={(e) => updateRow(idx, "recipientPhone", sanitizePhoneInput(e.target.value))}
                      placeholder="0340000000"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Désignation de la Marchandise / Colis (col-span-3) */}
                  <div className="md:col-span-3 space-y-1">
                    <div className="h-5 flex items-center">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        Désignation / Nature du Colis
                      </label>
                    </div>
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
                    <div className="h-5 flex items-center">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        Type de Flux Logistique
                      </label>
                    </div>
                    <select
                      value={row.fluxType}
                      onChange={(e) => updateRow(idx, "fluxType", e.target.value as FluxType)}
                      className="w-full px-3 py-2 border rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50 border-slate-300"
                    >
                      <option value="COD">💵 COD (Contre-Remboursement)</option>
                      <option value="SIMPLE">📄 Course Simple (Port Payé)</option>
                      <option value="PROVINCE">🚐 Fret Province (Gares Routières)</option>
                      <option value="RETOUR">🔄 Retour SAV / Échange</option>
                      <option value="ENTREPRISE">🏢 Compte Entreprise / B2B</option>
                    </select>
                  </div>

                  {/* Delivery Address (col-span-5) */}
                  <div className="md:col-span-5 space-y-1">
                    <div className="h-5 flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        Lieu & Repère de Livraison *
                      </label>
                      <span className="text-[10px] text-slate-400 font-normal">
                        Retour auto
                      </span>
                    </div>
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
                    <div className="h-5 flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        Axe Logistique
                      </label>
                    </div>
                    {row.fluxType === "PROVINCE" ? (
                      <select
                        data-testid={`select-province-axis-${idx}`}
                        data-cy={`select-province-axis-${idx}`}
                        value={row.axis}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "SWITCH_TO_URBAN") {
                            updateRow(idx, "fluxType", "COD");
                            updateRow(idx, "axis", "AXE_CENTRE_1");
                          } else {
                            selectProvinceAxis(idx, val);
                          }
                        }}
                        className="w-full px-3 py-2 bg-purple-50 border border-purple-300 rounded-xl text-xs font-bold text-purple-950 focus:ring-2 focus:ring-purple-500 focus:outline-none shadow-xs"
                      >
                        <option value="" disabled>-- Sélectionner la Gare --</option>
                        <optgroup label="🏢 Gares Routières (➔ Axes)">
                          <option value="AXE_CENTRE_2">Gare Ambodivona ➔ Centre Ville 2</option>
                          <option value="AXE_AMBOHIMANGAKELY">Gare Ampasapito ➔ Ambohimangakely</option>
                          <option value="AXE_SABOTSY_NAMEHANA">Gare Andranobevava ➔ Sabotsy Namehana</option>
                          <option value="AXE_AMPITATAFIKA">Gare Anosibe ➔ Ampitatafika</option>
                          <option value="AXE_IAVOLOHA">Gare Fasan'ny Karana ➔ Iavoloha</option>
                          <option value="AXE_CENTRE_1">Gare Behoririka ➔ Centre Ville 1</option>
                          <option value="AXE_ITAOSY">Gare Andohatapenaka ➔ Itaosy</option>
                          <option value="AXE_AMPITATAFIKA">Gare Anosizato ➔ Ampitatafika</option>
                          <option value="AXE_ALASORA">Gare Amoronakona ➔ Alasora</option>
                        </optgroup>
                        <option value="SWITCH_TO_URBAN">← Revenir aux livraisons urbaines</option>
                      </select>
                    ) : (
                      <select
                        data-testid={`select-axis-${idx}`}
                        data-cy={`select-axis-${idx}`}
                        value={row.axis}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.startsWith("AXE_PROVINCE") || provinceAxes.some((p) => p.code === val)) {
                            selectProvinceAxis(idx, val);
                          } else {
                            updateRow(idx, "axis", val as LogisticAxis);
                            updateRow(idx, "fluxType", "COD");
                          }
                        }}
                        className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none transition ${
                          row.isManualAxis
                            ? "border-blue-400 bg-blue-50/20"
                            : "border-slate-300"
                        }`}
                      >
                        <optgroup label="📍 Réseau Urbain (9 Axes)">
                          <option value="AXE_CENTRE_1">1. Centre Ville 1 (Analakely)</option>
                          <option value="AXE_CENTRE_2">2. Centre Ville 2 (Antanimena)</option>
                          <option value="AXE_ITAOSY">3. Itaosy (67Ha, Ouest)</option>
                          <option value="AXE_AMPITATAFIKA">4. Ampitatafika (Ampefiloha)</option>
                          <option value="AXE_AMBOHIMANGAKELY">5. Ambohimangakely (RN2)</option>
                          <option value="AXE_SABOTSY_NAMEHANA">6. Sabotsy Namehana (RN3)</option>
                          <option value="AXE_IVATO">7. Ivato (RN4, Aéroport)</option>
                          <option value="AXE_IAVOLOHA">8. Iavoloha (RN7 Sud)</option>
                          <option value="AXE_ALASORA">9. Alasora (By-pass)</option>
                        </optgroup>
                        <optgroup label="🏢 Gares Routières (➔ Axes)">
                          <option value="AXE_CENTRE_2">Gare Ambodivona ➔ Centre Ville 2</option>
                          <option value="AXE_AMBOHIMANGAKELY">Gare Ampasapito ➔ Ambohimangakely</option>
                          <option value="AXE_SABOTSY_NAMEHANA">Gare Andranobevava ➔ Sabotsy Namehana</option>
                          <option value="AXE_AMPITATAFIKA">Gare Anosibe ➔ Ampitatafika</option>
                          <option value="AXE_IAVOLOHA">Gare Fasan'ny Karana ➔ Iavoloha</option>
                          <option value="AXE_CENTRE_1">Gare Behoririka ➔ Centre Ville 1</option>
                          <option value="AXE_ITAOSY">Gare Andohatapenaka ➔ Itaosy</option>
                          <option value="AXE_AMPITATAFIKA">Gare Anosizato ➔ Ampitatafika</option>
                          <option value="AXE_ALASORA">Gare Amoronakona ➔ Alasora</option>
                        </optgroup>
                      </select>
                    )}
                    <AxisBadge
                      axis={row.axis}
                      isFallback={row.isAxisFallback}
                      isManual={row.isManualAxis}
                    />
                  </div>

                  {/* Marchandise (col-span-2) */}
                  <div className="md:col-span-2 space-y-1">
                    <div className="h-5 flex items-center">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        Marchandise (Ar)
                      </label>
                    </div>
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

                  {/* Frais Livraison (col-span-2) */}
                  <div className="md:col-span-2 space-y-1">
                    <div className="h-5 flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        Frais (Ar)
                      </label>
                      <span
                        className={`text-[9px] font-extrabold px-1 py-0.5 rounded border uppercase tracking-wider ${
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
                          ? "CUA"
                          : row.deliveryFee === 4000
                          ? "Péri"
                          : row.deliveryFee === 5000
                          ? "Couronne"
                          : "Manuel"}
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
                    {/* One-click Tariff Pills */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateRow(idx, "deliveryFee", 3000)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                          row.deliveryFee === 3000
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                            : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        }`}
                        title="Tarif CUA standard"
                      >
                        3k
                      </button>
                      <button
                        type="button"
                        onClick={() => updateRow(idx, "deliveryFee", 4000)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                          row.deliveryFee === 4000
                            ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                            : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
                        }`}
                        title="Tarif Péri-Urbain"
                      >
                        4k
                      </button>
                      <button
                        type="button"
                        onClick={() => updateRow(idx, "deliveryFee", 5000)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                          row.deliveryFee === 5000
                            ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                            : "bg-white text-purple-700 border-purple-200 hover:bg-purple-50"
                        }`}
                        title="Tarif Grande Couronne"
                      >
                        5k
                      </button>
                    </div>
                  </div>

                  {/* Sélecteur Horaire de Livraison (Facultatif : Intervalle ou Heure Simple) */}
                  <div className="md:col-span-12 space-y-1.5 pt-2 border-t border-slate-100">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-[11px] font-bold text-slate-700">Horaire de livraison</span>
                        <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          Facultatif
                        </span>
                      </div>

                      {/* Mode Switch: Intervalle vs Heure simple */}
                      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => updateRow(idx, "timeMode", "INTERVAL")}
                          className={`px-2.5 py-0.5 rounded-md font-semibold transition cursor-pointer ${
                            (row.timeMode || "INTERVAL") === "INTERVAL"
                              ? "bg-white text-blue-700 shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Intervalle (Plage)
                        </button>
                        <button
                          type="button"
                          onClick={() => updateRow(idx, "timeMode", "SIMPLE")}
                          className={`px-2.5 py-0.5 rounded-md font-semibold transition cursor-pointer ${
                            row.timeMode === "SIMPLE"
                              ? "bg-white text-blue-700 shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Heure simple
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 bg-slate-50/70 p-2 rounded-xl border border-slate-200">
                      {(row.timeMode || "INTERVAL") === "INTERVAL" ? (
                        <>
                          {/* Time Interval Inputs */}
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                            <span className="text-[11px] text-slate-400 font-medium">De</span>
                            <input
                              type="time"
                              value={extractTimeRange(row.observation).start}
                              onChange={(e) => {
                                const currentEnd = extractTimeRange(row.observation).end || "12:00";
                                const newStart = e.target.value;
                                updateRow(idx, "observation", newStart ? `${newStart} - ${currentEnd}` : "");
                              }}
                              className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                            />
                            <span className="text-[11px] text-slate-400 font-medium">à</span>
                            <input
                              type="time"
                              value={extractTimeRange(row.observation).end}
                              onChange={(e) => {
                                const currentStart = extractTimeRange(row.observation).start || "08:00";
                                const newEnd = e.target.value;
                                updateRow(idx, "observation", newEnd ? `${currentStart} - ${newEnd}` : "");
                              }}
                              className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                            />
                          </div>

                          {/* Quick interval presets */}
                          <div className="flex items-center gap-1 flex-wrap">
                            {[
                              { label: "08h - 12h", value: "08:00 - 12:00" },
                              { label: "12h - 14h", value: "12:00 - 14:00" },
                              { label: "14h - 17h", value: "14:00 - 17:00" },
                              { label: "17h - 19h", value: "17:00 - 19:00" },
                            ].map((preset) => {
                              const isSelected = row.observation === preset.value;
                              return (
                                <button
                                  key={preset.value}
                                  type="button"
                                  onClick={() => updateRow(idx, "observation", preset.value)}
                                  className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition cursor-pointer ${
                                    isSelected
                                      ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                                      : "bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-700"
                                  }`}
                                >
                                  {preset.label}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Simple Hour Input */}
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                            <span className="text-[11px] text-slate-400 font-medium">Heure</span>
                            <input
                              type="time"
                              value={extractSimpleTime(row.observation)}
                              onChange={(e) => updateRow(idx, "observation", e.target.value)}
                              className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                            />
                          </div>

                          {/* Quick simple hour presets */}
                          <div className="flex items-center gap-1 flex-wrap">
                            {["09:00", "11:00", "14:00", "16:00"].map((time) => {
                              const isSelected = row.observation === time;
                              return (
                                <button
                                  key={time}
                                  type="button"
                                  onClick={() => updateRow(idx, "observation", time)}
                                  className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition cursor-pointer ${
                                    isSelected
                                      ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                                      : "bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-700"
                                  }`}
                                >
                                  {time.replace(":", "h")}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}

                      {/* Observation text input (accessible for Cypress & custom notes, facultatif) */}
                      <div className="flex-1 min-w-[200px]">
                        <input
                          type="text"
                          data-testid={`input-observation-${idx}`}
                          value={row.observation}
                          onChange={(e) => updateRow(idx, "observation", e.target.value)}
                          placeholder="Horaire ou remarque (optionnel)..."
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                        />
                      </div>

                      {/* Clear button if observation is set */}
                      {row.observation && (
                        <button
                          type="button"
                          onClick={() => updateRow(idx, "observation", "")}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Effacer l'horaire"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
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
            disabled={isSubmitting || !isSenderSpecified}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
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
        </fieldset>
      </form>

      {/* Success Modal / Card for Generated BDRs */}
      {createdParcels && (
        <div
          data-testid="success-modal"
          className="bg-white p-6 rounded-2xl border-2 border-emerald-500 shadow-xl space-y-6"
        >
          {/* Header Action Bar (Hidden during print) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print pb-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  Réception Validée : {createdParcels.length} Colis Enregistrés avec Succès !
                </h3>
                <p className="text-xs text-slate-500">
                  Expéditeur : <strong className="text-slate-800">{senderName}</strong> ({senderType}) • Téléphone : {senderPhone || "N/A"}
                </p>
              </div>
            </div>

            {/* Toggle Print Format & Print Button */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPrintViewMode("BDR")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    printViewMode === "BDR"
                      ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> Bon de Réception A4
                </button>
                <button
                  type="button"
                  onClick={() => setPrintViewMode("LABELS")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    printViewMode === "LABELS"
                      ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Barcode className="w-3.5 h-3.5" /> Étiquettes Barcode (80mm)
                </button>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition"
              >
                <Printer className="w-4 h-4" /> Imprimer ({printViewMode === "BDR" ? "Bon A4" : "Étiquettes 80mm"})
              </button>
            </div>
          </div>

          {/* Cards Overview Grid (Web view, hidden when printing BDR) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 no-print">
            {createdParcels.map((p) => (
              <div
                key={p.id}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 hover:border-slate-300 transition"
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
                    <span className="text-slate-400">Agent Réception Quai :</span>
                    <span className="text-blue-700 font-bold">
                      {p.receptionniste_nom || activeReceptionist?.nom}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Printable Official Document 1 : Bon de Réception A4 */}
          {printViewMode === "BDR" && (
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 space-y-6">
              {/* Entête Officielle de l'Entreprise & Identifiants Fiscaux Facture */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    {company.logo_url ? (
                      <img
                        src={company.logo_url}
                        alt="Logo Entreprise"
                        className="h-10 w-auto max-w-[120px] object-contain rounded"
                      />
                    ) : (
                      <span className="text-2xl">🚚</span>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black tracking-tight text-slate-900">{company.company_name || company.app_name}</span>
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Hub Quai Central</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 font-semibold">
                    {company.address || "Antananarivo 101, Madagascar"} • Tél : {company.phone || "+261 34 00 000 00"}
                  </p>
                  <p className="text-[11px] text-slate-700 mt-0.5 font-mono">
                    <span className="font-bold text-slate-900">NIF :</span> {company.nif} • <span className="font-bold text-slate-900">STAT :</span> {company.stat}
                    {company.rcs && <> • <span className="font-bold text-slate-900">RCS :</span> {company.rcs}</>}
                    {company.cif && <> • <span className="font-bold text-slate-900">CIF :</span> {company.cif}</>}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {company.email || "contact@tmsexpress.mg"} • {company.website || "www.tmsexpress.mg"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded">
                    BON DE RÉCEPTION (BDR)
                  </span>
                  <p className="text-xs font-mono font-bold text-slate-700 mt-1">
                    Date : {new Date().toLocaleDateString("fr-FR")} • {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-xs text-slate-600 font-medium">
                    Agent Quai : <strong>{activeReceptionist ? activeReceptionist.nom : currentUserName}</strong>
                  </p>
                </div>
              </div>

              {/* Informations Expéditeur */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Expéditeur / Donneur d'Ordre</span>
                  <p className="text-sm font-bold text-slate-900">{senderName}</p>
                  <p className="text-slate-600">Type : {senderType} • Tél : {senderPhone || "Non renseigné"}</p>
                  {senderAddress && <p className="text-slate-500">Adresse / Siège : {senderAddress}</p>}
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Récapitulatif du Lot</span>
                  <p className="text-sm font-bold text-slate-900">{createdParcels.length} Colis Enregistrés</p>
                  <p className="text-slate-600">Statut initial : <span className="font-bold text-amber-700">EN_DEPOT</span></p>
                </div>
              </div>

              {/* Tableau Détaillé des Colis */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">N° Bordereau</th>
                      <th className="p-2.5">Destinataire</th>
                      <th className="p-2.5">Téléphone</th>
                      <th className="p-2.5">Lieu / Quartier</th>
                      <th className="p-2.5">Axe</th>
                      <th className="p-2.5 text-right">Marchandise</th>
                      <th className="p-2.5 text-right">Frais Livr.</th>
                      <th className="p-2.5 text-right">Total à Encaisser</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {createdParcels.map((p, i) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-400">{i + 1}</td>
                        <td className="p-2.5 font-mono font-bold text-blue-700">BDR-{p.tracking_number}</td>
                        <td className="p-2.5 font-semibold text-slate-800">{p.recipient_name}</td>
                        <td className="p-2.5 font-mono text-slate-600">{p.recipient_phone_formatted || p.recipient_phone}</td>
                        <td className="p-2.5 text-slate-600 max-w-[180px] truncate">{p.delivery_address}</td>
                        <td className="p-2.5 text-slate-600 font-medium">{p.axis}</td>
                        <td className="p-2.5 text-right font-mono font-medium text-slate-700">
                          {(p.merchandise_amount || 0).toLocaleString("fr-FR")} Ar
                        </td>
                        <td className="p-2.5 text-right font-mono font-medium text-slate-700">
                          {(p.delivery_fee || 0).toLocaleString("fr-FR")} Ar
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          {p.total_to_collect_formatted || `${((p.merchandise_amount || 0) + (p.delivery_fee || 0)).toLocaleString("fr-FR")} Ar`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={6} className="p-2.5 text-right uppercase text-slate-700">Totaux Récapitulatifs :</td>
                      <td className="p-2.5 text-right font-mono text-blue-800">{totalMerchandise.toLocaleString("fr-FR")} Ar</td>
                      <td className="p-2.5 text-right font-mono text-indigo-800">{totalFees.toLocaleString("fr-FR")} Ar</td>
                      <td className="p-2.5 text-right font-mono text-emerald-800 font-black">{totalToCollect.toLocaleString("fr-FR")} Ar</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Cadres de Signature */}
              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200">
                <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center h-28 flex flex-col justify-between">
                  <span className="text-[11px] font-bold uppercase text-slate-500">Signature & Cachet de l'Expéditeur</span>
                  <span className="text-[10px] text-slate-400">« Bon pour accord et remise des colis ci-dessus »</span>
                </div>
                <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center h-28 flex flex-col justify-between">
                  <span className="text-[11px] font-bold uppercase text-slate-500">Tampon Quai & Signature Réceptionniste</span>
                  <span className="text-[10px] text-slate-400">{company.company_name || company.app_name} • Hub Central</span>
                </div>
              </div>
            </div>
          )}

          {/* Printable Thermal Stickers 2 : Format 80 mm */}
          {printViewMode === "LABELS" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {createdParcels.map((p, i) => (
                  <div
                    key={p.id}
                    className="p-4 bg-white rounded-xl border-2 border-slate-800 font-sans space-y-2 text-xs shadow-xs"
                  >
                    <div className="flex items-center justify-between border-b-2 border-slate-800 pb-1.5">
                      <span className="font-black text-sm text-slate-900 tracking-wider">{company.app_name}</span>
                      <span className="font-mono font-black text-xs bg-slate-900 text-white px-2 py-0.5 rounded">
                        #{i + 1}/{createdParcels.length}
                      </span>
                    </div>

                    <div className="text-center py-1 bg-slate-50 rounded border border-slate-200">
                      <div className="font-mono font-black text-lg tracking-wider text-blue-900">
                        BDR-{p.tracking_number}
                      </div>
                      <div className="text-[10px] text-slate-400 tracking-widest font-mono">
                        ||| | |||| | ||| |||| | ||||| | |||
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] border-b border-slate-200 pb-1.5">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Axe Logistique</span>
                        <strong className="text-slate-900 font-extrabold">{p.axis}</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Total COD</span>
                        <strong className="text-sm font-black text-emerald-700">{p.total_to_collect_formatted}</strong>
                      </div>
                    </div>

                    <div className="text-[11px] space-y-0.5">
                      <p className="font-bold text-slate-900">{p.recipient_name} • {p.recipient_phone_formatted || p.recipient_phone}</p>
                      <p className="text-slate-600 break-words">{p.delivery_address}</p>
                      {p.designation && <p className="text-slate-500 italic text-[10px]">Marchandise : {p.designation}</p>}
                      {p.observation && <p className="text-amber-800 font-semibold text-[10px]">⚠️ {p.observation}</p>}
                    </div>

                    <div className="pt-1 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Exp : {senderName}</span>
                      <span>{new Date().toLocaleDateString("fr-FR")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Action to Reset or Continue */}
          <div className="text-right pt-2 no-print flex items-center justify-between border-t border-slate-100">
            <span className="text-xs text-slate-500">
              Les colis sont désormais prêts pour le module <strong className="text-blue-700">Dispatching & Tournées</strong>.
            </span>
            <button
              onClick={() => {
                setCreatedParcels(null);
                setRows([
                  {
                    id: "row-1",
                    recipientName: "",
                    recipientPhone: "",
                    designation: "",
                    deliveryAddress: "",
                    axis: "AXE_CENTRE_1" as LogisticAxis,
                    isAxisFallback: true,
                    isManualAxis: false,
                    fluxType: "COD" as FluxType,
                    merchandiseAmount: 0,
                    deliveryFee: 3000,
                    observation: "",
                  },
                ]);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
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
                  🚌
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-wide">Rattacher une Gare, Coopérative ou Quartier</h3>
                  <p className="text-[11px] text-blue-100">Associer immédiatement à l'un des 9 axes urbains réels</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddZoneModalOpen(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
                data-cy="btn-close-add-zone-modal"
              >
                ✕
              </button>
            </div>

            {/* Body Form */}
            <div className="p-5 space-y-4">
              {/* Type Selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Type d'Élément *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalZoneType("gare")}
                    className={`p-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-0.5 ${
                      modalZoneType === "gare"
                        ? "border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-500 font-bold"
                        : "border-slate-200 hover:border-slate-300 text-slate-600"
                    }`}
                  >
                    <span className="text-sm">🚌</span>
                    <span className="text-xs font-bold">Gare Routière</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalZoneType("cooperative")}
                    className={`p-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-0.5 ${
                      modalZoneType === "cooperative"
                        ? "border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500 font-bold"
                        : "border-slate-200 hover:border-slate-300 text-slate-600"
                    }`}
                  >
                    <span className="text-sm">🤝</span>
                    <span className="text-xs font-bold">Coopérative</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalZoneType("quartier")}
                    className={`p-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-0.5 ${
                      modalZoneType === "quartier"
                        ? "border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500 font-bold"
                        : "border-slate-200 hover:border-slate-300 text-slate-600"
                    }`}
                  >
                    <span className="text-sm">🏘️</span>
                    <span className="text-xs font-bold">Quartier Urbain</span>
                  </button>
                </div>
              </div>

              {/* Zone / Gare Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  {modalZoneType === "gare"
                    ? "Nom de la Gare Routière *"
                    : modalZoneType === "cooperative"
                    ? "Nom de la Coopérative / Transporteur *"
                    : "Nom du Quartier / Lieu *"}
                </label>
                <input
                  type="text"
                  data-cy="input-modal-zone-name"
                  value={modalZoneName}
                  onChange={(e) => setModalZoneName(e.target.value)}
                  placeholder={
                    modalZoneType === "gare"
                      ? "Ex : Gare Routière Ambodivona, Gare Maki Andohatapenaka..."
                      : modalZoneType === "cooperative"
                      ? "Ex : Cotisse Transport, Besady Plus, Kofmad..."
                      : "Ex : Ampitatafika Avaratra, Ambohitrandriana..."
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Destinations (If Gare or Cooperative) */}
              {(modalZoneType === "gare" || modalZoneType === "cooperative") && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-purple-900 block flex items-center justify-between">
                    <span>Villes de destination Province desservies (optionnel)</span>
                    <span className="text-[10px] text-purple-600 font-normal">Reconnaissance auto</span>
                  </label>
                  <input
                    type="text"
                    value={modalDestinations}
                    onChange={(e) => setModalDestinations(e.target.value)}
                    placeholder="Ex : Tamatave, Moramanga, Brickaville..."
                    className="w-full px-3 py-2 border border-purple-200 bg-purple-50/30 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500">
                    💡 Les colis mentionnant ces villes seront automatiquement dirigés vers cette gare et cet axe urbain !
                  </p>
                </div>
              )}

              {/* Axis Selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Axe Urbain Physique d'Antananarivo où se situe la gare / le quartier *
                </label>
                <select
                  data-cy="select-modal-axis"
                  value={modalSelectedAxis}
                  onChange={(e) => setModalSelectedAxis(e.target.value as LogisticAxis)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <optgroup label="📍 Réseau Urbain Réel (9 Axes de Livraison)">
                    <option value="AXE_CENTRE_1">1. Axe Centre Ville 1 (Hyper-Centre & Analakely)</option>
                    <option value="AXE_CENTRE_2">2. Axe Centre Ville 2 (Péri-Centre & Antanimena - Gare Ambodivona)</option>
                    <option value="AXE_ITAOSY">3. Axe Itaosy (67Ha, Itaosy & Ouest - Gare Andohatapenaka)</option>
                    <option value="AXE_AMPITATAFIKA">4. Axe Ampitatafika (Ampefiloha & Fenoarivo - Gares Anosibe/Anosizato)</option>
                    <option value="AXE_AMBOHIMANGAKELY">5. Axe Ambohimangakely (Besarety & RN2 - Gare Ampasapito)</option>
                    <option value="AXE_SABOTSY_NAMEHANA">6. Axe Sabotsy Namehana (Ankadikely & RN3 - Gare Andranobevava)</option>
                    <option value="AXE_IVATO">7. Axe Ivato (RN4 Digue & Aéroport - Fret Ivato)</option>
                    <option value="AXE_IAVOLOHA">8. Axe Iavoloha (RN7 Sud & Tanjombato - Gare Fasan'ny Karana)</option>
                    <option value="AXE_ALASORA">9. Axe Alasora (Mandroseza & By-pass - Gare Amoronakona)</option>
                  </optgroup>
                </select>
              </div>

              {/* Tariff Selection according to CDC 5.3 */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Frais de livraison / acheminement jusqu'à la gare ou adresse (CDC 5.3) *
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
                <span>Enregistrer & Mémoriser</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal : Ajouter un Nouveau Donneur d'Ordre / Expéditeur */}
      {isNewSenderModalOpen && (
        <div
          data-cy="modal-add-sender"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold text-lg">
                  {newVendorType === "CYBERMARCHAND" ? "🏪" : newVendorType === "PARTICULIER" ? "👤" : "🏢"}
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-wide">Ajouter un Nouvel Expéditeur</h3>
                  <p className="text-[11px] text-blue-100">Enregistrer un donneur d'ordre partenaire dans le CRM</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewSenderModalOpen(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
                data-cy="btn-close-add-sender-modal"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">
              {/* Type d'expéditeur */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Typologie d'Expéditeur *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewVendorType("CYBERMARCHAND")}
                    className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      newVendorType === "CYBERMARCHAND"
                        ? "bg-blue-50 text-blue-800 border-blue-500 ring-2 ring-blue-400"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" /> Cybermarchand
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewVendorType("PARTICULIER")}
                    className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      newVendorType === "PARTICULIER"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-500 ring-2 ring-emerald-400"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <User className="w-3.5 h-3.5" /> Particulier
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewVendorType("ENTREPRISE")}
                    className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      newVendorType === "ENTREPRISE"
                        ? "bg-indigo-50 text-indigo-800 border-indigo-500 ring-2 ring-indigo-400"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" /> Entreprise
                  </button>
                </div>
              </div>

              {/* Nom / Raison Sociale */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Nom complet / Raison Sociale *
                </label>
                <input
                  type="text"
                  data-cy="input-modal-sender-name"
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  placeholder="Ex: Boutique Chic Tanà, Cabinet Juridique..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Téléphone & Opérateur */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 block">
                    Numéro de Téléphone <span className="font-normal text-slate-400">(Facultatif)</span>
                  </label>
                  <div className="flex items-center gap-1">
                    {newVendorPhone && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        newVendorPhone.length === 10
                          ? "text-emerald-700 bg-emerald-50 border-emerald-200 font-bold"
                          : "text-amber-700 bg-amber-50 border-amber-200"
                      }`}>
                        {newVendorPhone.length}/10 {newVendorPhone.length === 10 ? "✓" : ""}
                      </span>
                    )}
                    {newVendorPhone && (
                      <OperatorBadge operator={detectMalagasyPhone(newVendorPhone).operator} isSmall />
                    )}
                  </div>
                </div>
                <input
                  type="tel"
                  maxLength={10}
                  data-cy="input-modal-sender-phone"
                  value={newVendorPhone}
                  onChange={(e) => setNewVendorPhone(sanitizePhoneInput(e.target.value))}
                  placeholder="0340000000 (optionnel)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Adresse / Quartier */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Adresse / Quartier de Ramassage <span className="font-normal text-slate-400">(Facultatif)</span>
                </label>
                <input
                  type="text"
                  data-cy="input-modal-sender-address"
                  value={newVendorAddress}
                  onChange={(e) => setNewVendorAddress(e.target.value)}
                  placeholder="Ex: Box 14 Pavillon Analakely, Lot II M... (optionnel)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Contact Référent */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Contact Référent / Responsable <span className="font-normal text-slate-400">(Facultatif)</span>
                </label>
                <input
                  type="text"
                  data-cy="input-modal-sender-contact"
                  value={newVendorContact}
                  onChange={(e) => setNewVendorContact(e.target.value)}
                  placeholder="Ex: Madame Rasoa, Monsieur Jean... (optionnel)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {newVendorError && (
                <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  {newVendorError}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                data-cy="btn-cancel-add-sender"
                onClick={() => setIsNewSenderModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                data-cy="btn-submit-add-new-sender"
                onClick={handleConfirmAddNewVendor}
                disabled={isSubmittingNewVendor}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmittingNewVendor ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Enregistrement...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" /> Enregistrer & Sélectionner
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
