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
  Plus,
  Trash2,
  Sparkles,
  CreditCard,
  History,
  Lock,
} from "lucide-react";
import { ParcelHistoryModal } from "../../components/ParcelHistoryModal";
import {
  fetchTours,
  fetchTourDetail,
  fetchCouriers,
  fetchParcels,
  updateParcelStatus,
  updateParcelContact,
  reassignParcel,
  markParcelPrepaid,
  startTour,
  deleteParcel,
  bulkDeleteParcels,
  fetchUsers,
  UpdateParcelStatusPayload,
} from "../../lib/api";
import { UserItem } from "../../types";
import {
  detectMalagasyPhone,
  cleanMalagasyPhone,
  formatMalagasyPhone,
  isValidMalagasyPhone,
  sanitizePhoneInput,
  MALAGASY_PHONE_REGEX,
} from "../../lib/phone";
import { getTodayDateString, getTomorrowDateString } from "../../lib/date";

const DEFAULT_CANCEL_REASONS = [
  "Refus client : article non conforme",
  "Refus client : emballage endommagé",
  "Client a annulé la commande",
  "Refus du client de régler le montant COD",
  "Numéro faux ou destinataire inconnu",
  "Client introuvable à l'adresse indiquée",
];

const DEFAULT_RESCHEDULE_REASONS = [
  "Client absent au rendez-vous",
  "Client injoignable après 3 appels",
  "Demande expresse du client (report de date)",
  "Adresse inaccessible temporairement",
  "Fonds indisponibles au moment du passage",
];

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
  driver_contact?: string;
  vehicle_plate?: string;
  receptionniste_id?: number | null;
  receptionniste_nom?: string | null;
  dernier_agent_id?: number | null;
  dernier_agent_nom?: string | null;
  derniere_action?: string | null;
  derniere_action_at?: string | null;
  observation?: string;
  encaissement_lieu?: string;
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
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString);
  const [showAllDates, setShowAllDates] = useState<boolean>(false);
  const [selectedCourierId, setSelectedCourierId] = useState<number | "ALL">("ALL");
  const [tours, setTours] = useState<Tour[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [selectedTourId, setSelectedTourId] = useState<number | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [fluxFilter, setFluxFilter] = useState<string>("ALL");
  const [receptionistFilter, setReceptionistFilter] = useState<number | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [receptionists, setReceptionists] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals state
  const [activeModal, setActiveModal] = useState<"DELIVER" | "MARK_DELIVERED" | "PREPAID" | "RESCHEDULE" | "CANCEL" | "OUTSOURCE" | "REASSIGN" | "EDIT_DELIVERY" | null>(null);
  const [targetParcel, setTargetParcel] = useState<Parcel | null>(null);
  const [historyModalParcel, setHistoryModalParcel] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Priority 9: Edit delivery details (Address & Fee)
  const [editDeliveryAddress, setEditDeliveryAddress] = useState<string>("");
  const [editDeliveryFee, setEditDeliveryFee] = useState<number>(0);

  // Prepaid states (Paiement direct en ligne / Siège)
  const [prepaidType, setPrepaidType] = useState<"ALL" | "MERCHANDISE_ONLY">("ALL");
  const [prepaidPaymentMethod, setPrepaidPaymentMethod] = useState<string>("MVOLA");
  const [prepaidReference, setPrepaidReference] = useState<string>("");

  // Role & Reassignment states
  const [currentUserRole, setCurrentUserRole] = useState<string>("SUPERVISEUR");
  const [activeUsername, setActiveUsername] = useState<string>("");
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const [activeUserNom, setActiveUserNom] = useState<string>("");
  const [reassignTargetCourierId, setReassignTargetCourierId] = useState<number | "">("");
  const [reassignReason, setReassignReason] = useState<string>("Panne de moto du livreur initial");

  useEffect(() => {
    const updateRole = () => {
      const saved = localStorage.getItem("tms_user_role") || "SUPERVISEUR";
      setCurrentUserRole(saved);
      const username = localStorage.getItem("tms_username") || "";
      setActiveUsername(username);
      const uid = localStorage.getItem("tms_user_id");
      setActiveUserId(uid ? Number(uid) : null);
      const unom = localStorage.getItem("tms_user_nom") || "";
      setActiveUserNom(unom);

      // Si l'utilisateur connecté est un LIVREUR, filtrer automatiquement sur son identifiant
      if (saved === "LIVREUR" && uid) {
        setSelectedCourierId(Number(uid));
      }
    };
    updateRole();
    window.addEventListener("tms_role_change", updateRole);
    return () => window.removeEventListener("tms_role_change", updateRole);
  }, []);

  // Privilege flag: Superviseur & Super Admin can delete parcels
  const isPrivileged = currentUserRole === "SUPERVISEUR" || currentUserRole === "SUPER_ADMIN";

  // Bulk selection and delete states for tracking page
  const [selectedTrackingParcelIds, setSelectedTrackingParcelIds] = useState<number[]>([]);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    parcel?: Parcel;
    isBulk?: boolean;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Modal for modifying address & fee according to status (Priorité 9)
  const [editLocationModal, setEditLocationModal] = useState<{
    isOpen: boolean;
    parcel: Parcel | null;
  }>({ isOpen: false, parcel: null });
  const [editAddressInput, setEditAddressInput] = useState<string>("");
  const [editFeeInput, setEditFeeInput] = useState<number>(3000);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  const toggleSelectParcel = (id: number) => {
    setSelectedTrackingParcelIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const visibleIds = filteredParcels.map((p) => p.id);
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedTrackingParcelIds.includes(id));
    if (allSelected) {
      setSelectedTrackingParcelIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedTrackingParcelIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleConfirmDeleteSingle = async (parcel: Parcel) => {
    try {
      setIsDeleting(true);
      await deleteParcel(parcel.id);
      setFeedbackMessage({
        type: "success",
        text: `Colis BDR-${parcel.tracking_number} supprimé avec succès !`,
      });
      setSelectedTrackingParcelIds((prev) => prev.filter((id) => id !== parcel.id));
      setDeleteConfirmModal(null);
      await loadData();
    } catch (err: any) {
      setFeedbackMessage({
        type: "error",
        text: err.message || "Erreur lors de la suppression du colis.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    try {
      setIsDeleting(true);
      const res = await bulkDeleteParcels(selectedTrackingParcelIds);
      setFeedbackMessage({
        type: "success",
        text: `${res.deleted_count} colis supprimé(s) avec succès !`,
      });
      setSelectedTrackingParcelIds([]);
      setDeleteConfirmModal(null);
      await loadData();
    } catch (err: any) {
      setFeedbackMessage({
        type: "error",
        text: err.message || "Erreur lors de la suppression groupée des colis.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Dynamic lists for modal reasons (editable, non-hardcoded & persisted in localStorage)
  const [cancelReasonsList, setCancelReasonsList] = useState<string[]>(DEFAULT_CANCEL_REASONS);
  const [rescheduleReasonsList, setRescheduleReasonsList] = useState<string[]>(DEFAULT_RESCHEDULE_REASONS);

  // Form states for modals (initialized dynamically from lists)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("ESPECES");
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState<string>("");

  // Lieu et répartition de l'encaissement (Livreur/Hub vs Direct Vendeur vs Siège)
  const [encaissementLieu, setEncaissementLieu] = useState<"LIVREUR" | "DIRECT_VENDEUR" | "SIEGE">("LIVREUR");
  const [repartitionVendeur, setRepartitionVendeur] = useState<"COD_SEUL" | "TOUT_VENDEUR" | "FRAIS_SEUL">("COD_SEUL");

  const [rescheduleDate, setRescheduleDate] = useState<string>(getTomorrowDateString);
  const [rescheduleReason, setRescheduleReason] = useState<string>("");
  const [customRescheduleReason, setCustomRescheduleReason] = useState<string>("");
  const [isCreatingRescheduleReason, setIsCreatingRescheduleReason] = useState<boolean>(false);
  const [newRescheduleReasonInput, setNewRescheduleReasonInput] = useState<string>("");

  const [cancelReason, setCancelReason] = useState<string>("");
  const [customCancelReason, setCustomCancelReason] = useState<string>("");
  const [isCreatingCancelReason, setIsCreatingCancelReason] = useState<boolean>(false);
  const [newCancelReasonInput, setNewCancelReasonInput] = useState<string>("");

  // Partial delivery & return states (ex: client prend 2 chaussures au lieu de 3)
  const [isPartialDelivery, setIsPartialDelivery] = useState<boolean>(false);
  const [partialMerchandiseAmount, setPartialMerchandiseAmount] = useState<number>(0);
  const [partialReturnNotes, setPartialReturnNotes] = useState<string>("");

  // Phone verification & live correction states (CDC 7.1)
  const [testPhoneInput, setTestPhoneInput] = useState<string>("");
  const [isUpdatingPhone, setIsUpdatingPhone] = useState<boolean>(false);
  const [phoneUpdateSuccess, setPhoneUpdateSuccess] = useState<string | null>(null);
  const [phoneUpdateError, setPhoneUpdateError] = useState<string | null>(null);

  const [partnerName, setPartnerName] = useState<string>("Cotisse Transport");
  const [partnerReference, setPartnerReference] = useState<string>("");
  const [partnerFee, setPartnerFee] = useState<number>(10000);
  const [driverContact, setDriverContact] = useState<string>("");
  const [vehiclePlate, setVehiclePlate] = useState<string>("");

  // Load custom reasons from localStorage or fallback to defaults
  useEffect(() => {
    try {
      const storedCancel = localStorage.getItem("tms_cancel_reasons");
      if (storedCancel) {
        const parsed = JSON.parse(storedCancel);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCancelReasonsList(parsed);
          setCancelReason(parsed[0]);
          return;
        }
      }
    } catch (e) {
      console.warn("Erreur chargement tms_cancel_reasons", e);
    }
    setCancelReason(DEFAULT_CANCEL_REASONS[0]);
  }, []);

  useEffect(() => {
    try {
      const storedReschedule = localStorage.getItem("tms_reschedule_reasons");
      if (storedReschedule) {
        const parsed = JSON.parse(storedReschedule);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRescheduleReasonsList(parsed);
          setRescheduleReason(parsed[0]);
          return;
        }
      }
    } catch (e) {
      console.warn("Erreur chargement tms_reschedule_reasons", e);
    }
    setRescheduleReason(DEFAULT_RESCHEDULE_REASONS[0]);
  }, []);

  // Load data
  useEffect(() => {
    loadData();
  }, [selectedDate, showAllDates, selectedCourierId, currentUserRole, activeUserId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const dateParam = showAllDates ? undefined : (selectedDate || undefined);
      const courierParam = selectedCourierId === "ALL" ? undefined : selectedCourierId;

      const [tList, cList, pList, uList] = await Promise.all([
        fetchTours(dateParam),
        fetchCouriers(),
        fetchParcels({
          date: dateParam,
          courier_id: courierParam,
        }),
        currentUserRole !== "RECEPTIONNISTE"
          ? fetchUsers("RECEPTIONNISTE", false)
          : Promise.resolve([]),
      ]);
      setTours(tList || []);
      setCouriers(cList || []);
      // If we got parcels from API
      setParcels(pList || []);
      if (uList && uList.length > 0) {
        setReceptionists(uList);
      }
    } catch (e) {
      console.error("Erreur chargement données pointage", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered tours for selected courier
  const availableTours = useMemo(() => {
    if (selectedCourierId === "ALL") return tours;
    return tours.filter((t) => t.courier_id === selectedCourierId);
  }, [tours, selectedCourierId]);

  // Active courier object
  const activeCourier = useMemo(() => {
    if (selectedCourierId === "ALL") return null;
    return couriers.find((c) => c.id === selectedCourierId) || null;
  }, [couriers, selectedCourierId]);

  // Helper to get active tour
  const currentTour = useMemo(() => {
    if (selectedTourId === "ALL") {
      if (selectedCourierId !== "ALL" && availableTours.length > 0) {
        return availableTours[0];
      }
      return null;
    }
    return tours.find((t) => t.id === selectedTourId) || null;
  }, [tours, selectedTourId, selectedCourierId, availableTours]);

  // Helper for status matching
  const matchesStatusFilter = (status: string, filter: string): boolean => {
    if (filter === "ALL") return true;
    if (filter === "IN_PROGRESS") return ["ASSIGNE", "EN_COURS"].includes(status);
    if (filter === "LIVRE") return ["LIVRE", "LIVRE_ENCAISSE", "CLOTURE_CAISSE"].includes(status);
    if (filter === "ENCAISSE") return ["ENCAISSE", "LIVRE_ENCAISSE", "CLOTURE_CAISSE"].includes(status);
    return status === filter;
  };

  // Helper to check parcel ownership / receptionist filter
  // Les agents de quai peuvent voir tous les colis entre agents sur le Hub
  // Le filtre de réceptionniste permet de cibler un agent si désiré
  const isParcelOwnedByAgent = (p: Parcel) => {
    if (receptionistFilter !== "ALL") {
      return p.receptionniste_id === receptionistFilter;
    }
    return true;
  };

  // Scoped parcels for currently selected tour / courier / agent / flux (used to compute dynamic tab counts and live metrics)
  const scopedParcels = useMemo(() => {
    let list = parcels;
    if (selectedCourierId !== "ALL") {
      list = list.filter((p) => p.courier_id === selectedCourierId);
    }
    if (selectedTourId !== "ALL") {
      list = list.filter((p) => p.tour_id === selectedTourId);
    }
    // Strict agent session / supervisor receptionist filter
    list = list.filter(isParcelOwnedByAgent);

    // Flux filter
    if (fluxFilter !== "ALL") {
      list = list.filter((p) => (p.flux_type || "COD") === fluxFilter);
    }

    return list;
  }, [
    parcels,
    selectedCourierId,
    selectedTourId,
    currentUserRole,
    activeUserNom,
    activeUserId,
    receptionistFilter,
    fluxFilter,
  ]);

  // Tab counts dynamically calculated for the scoped parcels
  const tabCounts = useMemo(() => {
    return {
      ALL: scopedParcels.length,
      IN_PROGRESS: scopedParcels.filter((p) => matchesStatusFilter(p.status, "IN_PROGRESS")).length,
      LIVRE: scopedParcels.filter((p) => matchesStatusFilter(p.status, "LIVRE")).length,
      ENCAISSE: scopedParcels.filter((p) => matchesStatusFilter(p.status, "ENCAISSE")).length,
      REPORTE: scopedParcels.filter((p) => matchesStatusFilter(p.status, "REPORTE")).length,
      ANNULE_RETOUR: scopedParcels.filter((p) => matchesStatusFilter(p.status, "ANNULE_RETOUR")).length,
      SOUS_TRAITE: scopedParcels.filter((p) => matchesStatusFilter(p.status, "SOUS_TRAITE")).length,
    };
  }, [scopedParcels]);

  // Filtered parcels: scoped parcels further filtered by status tab and search query
  const filteredParcels = useMemo(() => {
    return scopedParcels.filter((p) => {
      // Status filter
      if (statusFilter !== "ALL") {
        if (!matchesStatusFilter(p.status, statusFilter)) return false;
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
  }, [scopedParcels, statusFilter, searchQuery]);

  // Statistics calculation
  const stats = useMemo(() => {
    const list = scopedParcels;
    const total = list.length;
    const delivered = list.filter((p) =>
      ["LIVRE", "ENCAISSE", "LIVRE_ENCAISSE", "CLOTURE_CAISSE"].includes(p.status)
    ).length;
    const cashed = list.filter((p) =>
      ["ENCAISSE", "LIVRE_ENCAISSE", "CLOTURE_CAISSE"].includes(p.status)
    ).length;
    const inProgress = list.filter((p) => ["ASSIGNE", "EN_COURS"].includes(p.status)).length;
    const rescheduled = list.filter((p) => p.status === "REPORTE").length;
    const canceled = list.filter((p) => p.status === "ANNULE_RETOUR").length;
    const outsourced = list.filter((p) => p.status === "SOUS_TRAITE").length;

    const collectedCash = list
      .filter((p) => ["ENCAISSE", "LIVRE_ENCAISSE", "CLOTURE_CAISSE"].includes(p.status))
      .reduce((sum, p) => sum + (p.total_to_collect || 0), 0);

    const theoreticalCash = list.reduce((sum, p) => sum + (p.total_to_collect || 0), 0);

    const completionRate = total > 0 ? Math.round(((delivered + canceled + outsourced) / total) * 100) : 0;

    return {
      total,
      delivered,
      cashed,
      inProgress,
      rescheduled,
      canceled,
      outsourced,
      collectedCash,
      theoreticalCash,
      completionRate,
    };
  }, [scopedParcels]);

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
    openModal("REASSIGN", parcel);
    const otherCourier = couriers.find((c) => c.id !== parcel.courier_id);
    setReassignTargetCourierId(otherCourier ? otherCourier.id : "");
  };

  const openModal = (
    modalType: "DELIVER" | "MARK_DELIVERED" | "PREPAID" | "RESCHEDULE" | "CANCEL" | "OUTSOURCE" | "REASSIGN" | "EDIT_DELIVERY",
    parcel: Parcel
  ) => {
    setTargetParcel(parcel);
    setActiveModal(modalType);
    setPrepaidType("ALL");
    setPrepaidPaymentMethod("MVOLA");
    setPrepaidReference("");
    setTestPhoneInput(parcel.recipient_phone || "");
    setMobileMoneyPhone(parcel.recipient_phone || "");
    setPhoneUpdateSuccess(null);
    setPhoneUpdateError(null);
    setIsCreatingCancelReason(false);
    setIsCreatingRescheduleReason(false);
    setNewCancelReasonInput("");
    setNewRescheduleReasonInput("");
    setIsPartialDelivery(false);
    setPartialMerchandiseAmount(parcel.merchandise_amount || 0);
    setPartialReturnNotes("");
    setEncaissementLieu((parcel.encaissement_lieu as any) || "LIVREUR");
    setRepartitionVendeur("COD_SEUL");
    setEditDeliveryAddress(parcel.delivery_address || "");
    setEditDeliveryFee(parcel.delivery_fee || 0);
  };

  // Dynamic Reason Creators & Managers (never hardcoded, persistent in localStorage)
  const handleAddCancelReason = (reasonToAdd?: string) => {
    const text = (reasonToAdd || newCancelReasonInput).trim();
    if (!text) return;
    let nextList = cancelReasonsList;
    if (!cancelReasonsList.includes(text)) {
      nextList = [...cancelReasonsList, text];
      setCancelReasonsList(nextList);
      try {
        localStorage.setItem("tms_cancel_reasons", JSON.stringify(nextList));
      } catch (e) {}
    }
    setCancelReason(text);
    setNewCancelReasonInput("");
    setIsCreatingCancelReason(false);
  };

  const handleDeleteCancelReason = (reasonToDelete: string) => {
    const filtered = cancelReasonsList.filter((r) => r !== reasonToDelete);
    const updated = filtered.length > 0 ? filtered : DEFAULT_CANCEL_REASONS;
    setCancelReasonsList(updated);
    try {
      localStorage.setItem("tms_cancel_reasons", JSON.stringify(updated));
    } catch (e) {}
    if (cancelReason === reasonToDelete) {
      setCancelReason(updated[0] || "");
    }
  };

  const handleAddRescheduleReason = (reasonToAdd?: string) => {
    const text = (reasonToAdd || newRescheduleReasonInput).trim();
    if (!text) return;
    let nextList = rescheduleReasonsList;
    if (!rescheduleReasonsList.includes(text)) {
      nextList = [...rescheduleReasonsList, text];
      setRescheduleReasonsList(nextList);
      try {
        localStorage.setItem("tms_reschedule_reasons", JSON.stringify(nextList));
      } catch (e) {}
    }
    setRescheduleReason(text);
    setNewRescheduleReasonInput("");
    setIsCreatingRescheduleReason(false);
  };

  const handleDeleteRescheduleReason = (reasonToDelete: string) => {
    const filtered = rescheduleReasonsList.filter((r) => r !== reasonToDelete);
    const updated = filtered.length > 0 ? filtered : DEFAULT_RESCHEDULE_REASONS;
    setRescheduleReasonsList(updated);
    try {
      localStorage.setItem("tms_reschedule_reasons", JSON.stringify(updated));
    } catch (e) {}
    if (rescheduleReason === reasonToDelete) {
      setRescheduleReason(updated[0] || "");
    }
  };

  // Live Phone Number Verification & Customer Contact Update (CDC Section 7.1)
  const handleUpdateParcelPhone = async () => {
    if (!targetParcel) return;
    const phoneCheck = detectMalagasyPhone(testPhoneInput);
    if (!phoneCheck.isValid) {
      setPhoneUpdateError(phoneCheck.errorMessage || "Numéro malgache non conforme");
      return;
    }

    try {
      setIsUpdatingPhone(true);
      setPhoneUpdateError(null);
      await updateParcelContact(targetParcel.id, {
        recipient_phone: phoneCheck.cleaned,
      });

      // Update in local state for instantaneous feedback
      setParcels((prev) =>
        prev.map((p) =>
          p.id === targetParcel.id
            ? {
                ...p,
                recipient_phone: phoneCheck.cleaned,
                recipient_phone_formatted: phoneCheck.formatted,
                operator: phoneCheck.operator || p.operator,
              }
            : p
        )
      );

      setTargetParcel((prev) =>
        prev
          ? {
              ...prev,
              recipient_phone: phoneCheck.cleaned,
              recipient_phone_formatted: phoneCheck.formatted,
              operator: phoneCheck.operator || prev.operator,
            }
          : null
      );

      setPhoneUpdateSuccess(`Numéro mis à jour avec succès : ${phoneCheck.formatted} (${phoneCheck.operator})`);
    } catch (e: any) {
      setPhoneUpdateError(e.message || "Erreur lors de la mise à jour du numéro");
    } finally {
      setIsUpdatingPhone(false);
    }
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

      if (activeModal === "PREPAID") {
        const updated = await markParcelPrepaid(targetParcel.id, {
          prepaid_type: prepaidType,
          payment_method: prepaidPaymentMethod,
          payment_reference: prepaidReference.trim() || undefined,
        });

        setFeedbackMessage({
          type: "success",
          text: `Pointage validé : Paiement anticipé enregistré pour le colis ${targetParcel.tracking_number} (${prepaidPaymentMethod}) ! COD neutralisé à ${updated.total_to_collect?.toLocaleString()} Ar.`,
        });

        setParcels((prev) =>
          prev.map((p) => (p.id === targetParcel.id ? updated : p))
        );
        closeModal();
        return;
      }

      const payload: UpdateParcelStatusPayload = { status: "EN_COURS" };

      if (activeModal === "DELIVER") {
        if (isPartialDelivery) {
          if (partialMerchandiseAmount <= 0) {
            throw new Error("Veuillez saisir le montant réel de la marchandise achetée.");
          }
          const returnNote = partialReturnNotes.trim()
            ? `Vente partielle (${partialMerchandiseAmount.toLocaleString("fr-FR")} Ar) - Reste retourné : ${partialReturnNotes.trim()}`
            : `Vente partielle (${partialMerchandiseAmount.toLocaleString("fr-FR")} Ar au lieu de ${targetParcel.merchandise_amount.toLocaleString("fr-FR")} Ar) - Articles non retenus retournés au Hub`;

          const updatedObs = targetParcel.observation
            ? `${targetParcel.observation} | ${returnNote}`
            : returnNote;

          await updateParcelContact(targetParcel.id, {
            merchandise_amount: partialMerchandiseAmount,
            observation: updatedObs,
          });
        }

        payload.status = targetParcel.status === "LIVRE" || targetParcel.status === "SOUS_TRAITE" ? "ENCAISSE" : "LIVRE_ENCAISSE";
        payload.payment_method = selectedPaymentMethod;
        payload.encaissement_lieu = encaissementLieu;
      } else if (activeModal === "MARK_DELIVERED") {
        payload.status = "LIVRE";
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
        payload.driver_contact = driverContact.trim() || undefined;
        payload.vehicle_plate = vehiclePlate.trim() || undefined;
        payload.encaissement_lieu = encaissementLieu;
        if (!payload.partner_reference) {
          throw new Error("Le numéro de récépissé officiel de la coopérative est obligatoire.");
        }
      }

      await updateParcelStatus(targetParcel.id, payload);

      setFeedbackMessage({
        type: "success",
        text:
          activeModal === "MARK_DELIVERED"
            ? `Pointage validé : Colis BDR-${targetParcel.tracking_number} marqué comme LIVRÉ avec succès !`
            : activeModal === "DELIVER"
            ? `Pointage validé : Encaissement enregistré pour le colis ${targetParcel.tracking_number} (${selectedPaymentMethod}) !`
            : `Pointage validé pour le colis ${targetParcel.tracking_number} (${targetParcel.recipient_name}) !`,
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
                driver_contact: payload.driver_contact,
                vehicle_plate: payload.vehicle_plate,
                encaissement_lieu: payload.encaissement_lieu || p.encaissement_lieu,
                merchandise_amount:
                  activeModal === "DELIVER" && isPartialDelivery
                    ? partialMerchandiseAmount
                    : p.merchandise_amount,
                total_to_collect:
                  activeModal === "DELIVER" && isPartialDelivery
                    ? partialMerchandiseAmount + (p.delivery_fee || 0)
                    : p.total_to_collect,
                observation:
                  activeModal === "DELIVER" && isPartialDelivery
                    ? `${p.observation || ""} | Vente partielle (${partialMerchandiseAmount.toLocaleString("fr-FR")} Ar) - Reste retourné : ${partialReturnNotes.trim()}`
                    : p.observation,
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
    setIsCreatingCancelReason(false);
    setIsCreatingRescheduleReason(false);
    setNewCancelReasonInput("");
    setNewRescheduleReasonInput("");
    setTestPhoneInput("");
    setPhoneUpdateSuccess(null);
    setPhoneUpdateError(null);
    setMobileMoneyPhone("");
    setPartnerReference("");
    setIsPartialDelivery(false);
    setPartialMerchandiseAmount(0);
    setPartialReturnNotes("");
    setEncaissementLieu("LIVREUR");
    setRepartitionVendeur("COD_SEUL");
  };

  const handleReturnToHub = async (parcel: Parcel) => {
    const tracking = parcel.tracking_number;
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Confirmer la réintégration physique du colis BDR-${tracking} au Hub / Bureau ?\n\nCela acte que le livreur a bien rapporté le colis au bureau et le réintègre dans le stock 'En Dépôt'.`
      )
    ) {
      return;
    }

    try {
      const activeUserNom =
        typeof window !== "undefined"
          ? localStorage.getItem("tms_user_nom") || "Superviseur Hub"
          : "Superviseur Hub";

      await updateParcelStatus(parcel.id, {
        status: "EN_DEPOT",
        incident_reason: `Colis physique rapporté et remis au bureau par le livreur (validé par ${activeUserNom})`,
      });

      setFeedbackMessage({
        type: "success",
        text: `Colis BDR-${tracking} réintégré au Hub (En Dépôt) avec succès ! Le livreur est déchargé du colis physique.`,
      });

      setParcels((prev) =>
        prev.map((p) =>
          p.id === parcel.id
            ? {
                ...p,
                status: "EN_DEPOT",
                courier_id: undefined,
                tour_id: undefined,
                dernier_agent_nom: activeUserNom,
                derniere_action: "Remis au bureau (Retour Hub)",
                derniere_action_at: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
              }
            : p
        )
      );
    } catch (err: any) {
      setFeedbackMessage({
        type: "error",
        text: err.message || "Erreur lors de la remise au bureau.",
      });
    }
  };

  const handleBulkReturnToHub = async () => {
    const eligibleParcels = parcels.filter(
      (p) => selectedTrackingParcelIds.includes(p.id) && (p.status === "REPORTE" || p.status === "ANNULE_RETOUR")
    );

    if (eligibleParcels.length === 0) {
      alert("Aucun colis sélectionné n'est au statut Reporté ou Annulé/Retour.");
      return;
    }

    if (
      !confirm(
        `Confirmer la réintégration physique de ${eligibleParcels.length} colis rapportés au bureau par les livreurs ?\n\nCes colis redeviendront 'En Dépôt' au Hub Tsiazotafo.`
      )
    ) {
      return;
    }

    try {
      const activeUserNom =
        typeof window !== "undefined"
          ? localStorage.getItem("tms_user_nom") || "Superviseur Hub"
          : "Superviseur Hub";

      for (const p of eligibleParcels) {
        await updateParcelStatus(p.id, {
          status: "EN_DEPOT",
          incident_reason: `Colis physique rapporté et remis au bureau (lot validé par ${activeUserNom})`,
        });
      }

      setFeedbackMessage({
        type: "success",
        text: `${eligibleParcels.length} colis réintégrés au stock Bureau (En Dépôt) avec succès !`,
      });

      setParcels((prev) =>
        prev.map((p) =>
          selectedTrackingParcelIds.includes(p.id) && (p.status === "REPORTE" || p.status === "ANNULE_RETOUR")
            ? {
                ...p,
                status: "EN_DEPOT",
                courier_id: undefined,
                tour_id: undefined,
                dernier_agent_nom: activeUserNom,
                derniere_action: "Remis au bureau (Retour Hub)",
              }
            : p
        )
      );
      setSelectedTrackingParcelIds([]);
    } catch (err: any) {
      setFeedbackMessage({
        type: "error",
        text: err.message || "Erreur lors de la remise au bureau groupée.",
      });
    }
  };

  // Handlers for modifying address & fee according to status (Priorité 9)
  const handleOpenEditModal = (parcel: Parcel) => {
    setEditLocationModal({ isOpen: true, parcel });
    setEditAddressInput(parcel.delivery_address || "");
    setEditFeeInput(parcel.delivery_fee ?? 3000);
    setEditError(null);
  };

  const handleCloseEditModal = () => {
    setEditLocationModal({ isOpen: false, parcel: null });
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    const parcel = editLocationModal.parcel;
    if (!parcel) return;

    const trimmedAddress = editAddressInput.trim();
    if (!trimmedAddress) {
      setEditError("Le lieu de livraison ne peut pas être vide.");
      return;
    }

    const isEnCours = parcel.status === "EN_COURS";
    const payload: any = {
      delivery_address: trimmedAddress,
    };

    if (isEnCours) {
      const feeNum = Number(editFeeInput);
      if (isNaN(feeNum) || feeNum < 0) {
        setEditError("Le montant des frais de livraison est invalide.");
        return;
      }
      payload.delivery_fee = feeNum;
    }

    try {
      setIsSubmittingEdit(true);
      setEditError(null);

      const updated = await updateParcelContact(parcel.id, payload);

      setParcels((prev) =>
        prev.map((p) =>
          p.id === parcel.id
            ? {
                ...p,
                delivery_address: updated.delivery_address || trimmedAddress,
                delivery_fee: updated.delivery_fee ?? (isEnCours ? Number(editFeeInput) : p.delivery_fee),
                axis: updated.axis || p.axis,
                total_to_collect: (p.merchandise_amount || 0) + (isEnCours ? Number(editFeeInput) : p.delivery_fee),
              }
            : p
        )
      );

      setFeedbackMessage({
        type: "success",
        text: isEnCours
          ? `Colis BDR-${parcel.tracking_number} : Lieu et tarif (${Number(editFeeInput).toLocaleString()} Ar) mis à jour avec succès !`
          : `Colis BDR-${parcel.tracking_number} : Lieu de livraison mis à jour (axe : ${updated.axis || parcel.axis}). Frais verrouillés à ${(parcel.delivery_fee ?? 3000).toLocaleString()} Ar.`,
      });

      handleCloseEditModal();
    } catch (err: any) {
      setEditError(err.message || "Erreur lors de la mise à jour du colis.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Status badge renderer according to CDC section 9
  const renderStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      EN_DEPOT: { bg: "bg-[#fef3c7]", text: "text-[#78350f]", label: "En Dépôt" },
      ASSIGNE: { bg: "bg-[#e0e7ff]", text: "text-[#1e40af]", label: "Assigné" },
      EN_COURS: { bg: "bg-[#dbeafe]", text: "text-[#0369a1]", label: "En Cours" },
      LIVRE: { bg: "bg-[#ccfbf1]", text: "text-[#0f766e]", label: "Livré" },
      ENCAISSE: { bg: "bg-[#dcfce7]", text: "text-[#065f46]", label: "Encaissé" },
      LIVRE_ENCAISSE: { bg: "bg-[#dcfce7]", text: "text-[#065f46]", label: "Livré & Encaissé" },
      REPORTE: { bg: "bg-[#ffedd5]", text: "text-[#92400e]", label: "Reporté" },
      ANNULE_RETOUR: { bg: "bg-[#ffe4e6]", text: "text-[#991b1b]", label: "Annulé / Retour" },
      SOUS_TRAITE: { bg: "bg-[#f3e8ff]", text: "text-[#6b21a8]", label: "Sous-traité Gare" },
      RETOUR_BOUTIQUE: { bg: "bg-[#f1f5f9]", text: "text-[#334155]", label: "Retour Boutique" },
      CLOTURE_CAISSE: { bg: "bg-[#ecfdf5]", text: "text-[#047857]", label: "Clôturé Caisse" },
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
              Écran 05 : Pointage Terrain & Suivi en Direct
            </h2>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Qualification instantanée de l'issue des livraisons, validation des encaissements COD et contrôle FSM strict.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            data-cy="btn-toggle-all-dates"
            onClick={() => setShowAllDates((prev) => !prev)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition flex items-center gap-1.5 ${
              showAllDates
                ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            {showAllDates ? "🌐 Toutes les dates" : "📅 Filtrer par date"}
          </button>

          {!showAllDates && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input
                data-cy="tracking-date-input"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
              />
            </div>
          )}

          <button
            data-cy="btn-refresh-tracking"
            onClick={loadData}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition shadow-xs flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Actualiser
          </button>
        </div>
      </div>

      {/* Alert / Feedback message */}
      {feedbackMessage && (
        <div
          data-cy="feedback-banner"
          className={`p-3 rounded-xl flex items-center justify-between text-xs font-semibold ${
            feedbackMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
              : "bg-rose-50 text-rose-800 border border-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === "success" ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
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

      {/* Session Livreur Active Banner */}
      {currentUserRole === "LIVREUR" && (
        <div
          data-cy="courier-session-banner"
          className="p-4 rounded-xl bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-emerald-500/40"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-xl shadow-inner">
              🛵
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                  Session Livreur Connecté
                </span>
                <span className="text-[10px] bg-emerald-950/40 text-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  Pointage Terrain Dédié
                </span>
              </div>
              <p className="text-sm font-extrabold mt-0.5">
                {activeCourier ? `${activeCourier.name} (${activeCourier.vehicle_type})` : activeUserNom || "Livreur Terrain"}
              </p>
              <p className="text-xs text-emerald-100 opacity-90">
                Vous visualisez exclusivement vos colis assignés et vos encaissements COD sur le terrain.
              </p>
            </div>
          </div>
          <div className="text-right sm:border-l sm:border-white/20 sm:pl-4">
            <span className="text-[11px] uppercase tracking-wider text-emerald-200 block font-semibold">Colis à livrer</span>
            <span className="text-2xl font-black">{scopedParcels.length}</span>
          </div>
        </div>
      )}

      {/* Courier & Tour Selection and Summary Card */}
      <div className="bg-white border border-slate-200 text-slate-800 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-4">
            {/* Courier Filter */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-200">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                  Livreur Assigné
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <select
                    data-cy="courier-filter"
                    value={selectedCourierId}
                    onChange={(e) => {
                      const val = e.target.value === "ALL" ? "ALL" : Number(e.target.value);
                      setSelectedCourierId(val);
                      setSelectedTourId("ALL");
                    }}
                    className="bg-white border border-slate-300 text-slate-800 font-bold text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
                  >
                    <option value="ALL">🌐 Tous les Livreurs ({couriers.length} livreurs)</option>
                    {couriers.map((c) => (
                      <option key={c.id} value={c.id}>
                        🛵 {c.name} ({c.vehicle_type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Tour Selection */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-200">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                  Tournée Opérationnelle
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <select
                    data-cy="tour-selector"
                    value={selectedTourId}
                    onChange={(e) =>
                      setSelectedTourId(e.target.value === "ALL" ? "ALL" : Number(e.target.value))
                    }
                    className="bg-white border border-slate-300 text-slate-800 font-medium text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500 cursor-pointer shadow-xs"
                  >
                    <option value="ALL">
                      {selectedCourierId !== "ALL"
                        ? `Toutes les tournées du livreur (${availableTours.length})`
                        : `🌐 Toutes les Tournées (${tours.length} tournées)`}
                    </option>
                    {availableTours.map((t) => (
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
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Lancer la Tournée (Départ Quai)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {(activeCourier || currentTour) && (
            <div className="flex items-center gap-3 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 font-mono">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-semibold text-slate-900 font-sans">
                  {activeCourier ? activeCourier.name : currentTour?.courier_name}
                </span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {activeCourier
                    ? activeCourier.phone_formatted || activeCourier.phone
                    : currentTour?.courier_phone_formatted || currentTour?.courier_phone}
                </span>
              </div>
              <span className="text-slate-300">•</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-200 text-[11px] font-sans text-slate-700 font-bold">
                {activeCourier ? activeCourier.vehicle_type : currentTour?.courier_vehicle}
              </span>
            </div>
          )}
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded-lg border border-slate-200 border-l-4 border-l-blue-500 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-500">Total Colis</p>
            <p className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 tabular-nums">{stats.total}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {stats.inProgress} en cours de livraison
            </p>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 border-l-4 border-l-emerald-500 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-500">Taux d'Achèvement</p>
            <p className="text-base sm:text-lg font-bold text-emerald-700 mt-0.5 tabular-nums">{stats.completionRate} %</p>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 border-l-4 border-l-amber-500 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-500">Montant Encaissé</p>
            <p className="text-base sm:text-lg font-bold text-amber-700 mt-0.5 font-mono tabular-nums">
              {stats.collectedCash.toLocaleString()} Ar
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              sur {stats.theoreticalCash.toLocaleString()} Ar attendus
            </p>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 border-l-4 border-l-purple-500 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-500">Répartition Statuts</p>
            <div className="flex items-center gap-2 mt-1.5 text-xs font-semibold">
              <span className="text-teal-700" title="Colis Livrés">📦 {stats.delivered}</span>
              <span className="text-emerald-700" title="Colis Encaissés">💰 {stats.cashed}</span>
              <span className="text-amber-700" title="Reportés">⏳ {stats.rescheduled}</span>
              <span className="text-rose-700" title="Refus / Annulés">✕ {stats.canceled}</span>
              <span className="text-purple-700" title="Sous-traités">🚚 {stats.outsourced}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Agents Réceptionnistes Quai & Flux Filter Bar */}
      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {currentUserRole === "RECEPTIONNISTE" ? (
            <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 flex items-center gap-1.5 shadow-2xs">
              <User className="w-3.5 h-3.5 text-blue-600" />
              Session Agent Quai : <span className="font-black text-slate-900">{activeUserNom || "Agent"}</span> (Vos propres flux)
            </span>
          ) : (
            <>
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
                <User className="w-3.5 h-3.5 text-blue-600" /> Agent Réception Quai :
              </span>
              <select
                data-cy="receptionist-filter"
                value={receptionistFilter}
                onChange={(e) =>
                  setReceptionistFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))
                }
                className="bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs cursor-pointer"
              >
                <option value="ALL">🌐 Tous les Agents Réception (Quai)</option>
                {receptionists.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    👤 {agent.nom_complet} ({agent.username})
                  </option>
                ))}
              </select>
            </>
          )}

          {/* Quick "My Parcels" button for Supervisors/Admins */}
          {activeUserId && currentUserRole !== "RECEPTIONNISTE" && (
            <button
              type="button"
              data-cy="filter-my-parcels"
              onClick={() => {
                if (receptionistFilter === activeUserId) {
                  setReceptionistFilter("ALL");
                } else {
                  setReceptionistFilter(activeUserId);
                }
              }}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                receptionistFilter === activeUserId
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-blue-700 hover:bg-blue-50 border border-blue-200"
              }`}
            >
              <span>🎯</span>
              <span>
                {receptionistFilter === activeUserId
                  ? `Filtre actif : ${activeUserNom}`
                  : `Mes Réceptions (${activeUserNom || "Mon Compte"})`}
              </span>
            </button>
          )}
        </div>

        {/* Flux Type Pill Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
            Flux :
          </span>
          {[
            { id: "ALL", label: "Tous Flux" },
            { id: "COD", label: "COD Urbain", icon: "📦" },
            { id: "SIMPLE", label: "Port Payé", icon: "✉️" },
            { id: "PROVINCE", label: "Province", icon: "🚌" },
            { id: "RETOUR", label: "Retours SAV", icon: "🔄" },
            { id: "ENTREPRISE", label: "B2B", icon: "🏢" },
          ].map((flx) => {
            const isFlxActive = fluxFilter === flx.id;
            return (
              <button
                key={flx.id}
                type="button"
                data-cy={`flux-tab-${flx.id.toLowerCase()}`}
                onClick={() => setFluxFilter(flx.id)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                  isFlxActive
                    ? "bg-slate-900 text-white shadow-xs font-extrabold"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {flx.icon && <span>{flx.icon}</span>}
                <span>{flx.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Status Tabs with Dynamic Parcel Counts (reactive to selected courier) */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { id: "ALL", label: "Tous les Colis" },
            { id: "IN_PROGRESS", label: "En Distribution" },
            { id: "LIVRE", label: "Livrés" },
            { id: "ENCAISSE", label: "Encaissés" },
            { id: "REPORTE", label: "Reportés" },
            { id: "ANNULE_RETOUR", label: "Refus / Annulés" },
            { id: "SOUS_TRAITE", label: "Sous-traités Gare" },
          ].map((tab) => {
            const count = tabCounts[tab.id as keyof typeof tabCounts] ?? 0;
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                data-cy={`tab-${tab.id.toLowerCase()}`}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1.5 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
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
            className="w-full pl-9 pr-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Parcels List with Structured Cards & Rapid Pointage Controls */}
      <div className="space-y-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Package className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-xs sm:text-sm text-slate-800">
              Colis de la tournée ({filteredParcels.length} affichés)
            </h3>
            {selectedTourId !== "ALL" && currentTour && (
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Livreur : {currentTour.courier_name}
              </span>
            )}
            {isPrivileged && filteredParcels.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                data-cy="btn-select-all-filtered-tracking"
                className="ml-2 text-xs font-semibold px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
              >
                {filteredParcels.length > 0 && filteredParcels.every((p) => selectedTrackingParcelIds.includes(p.id))
                  ? "Désélectionner tout"
                  : `Tout sélectionner (${filteredParcels.length})`}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isPrivileged && selectedTrackingParcelIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                  {selectedTrackingParcelIds.length} sélectionné(s)
                </span>
                {parcels.some(
                  (p) =>
                    selectedTrackingParcelIds.includes(p.id) &&
                    (p.status === "REPORTE" || p.status === "ANNULE_RETOUR")
                ) && (
                  <button
                    type="button"
                    onClick={handleBulkReturnToHub}
                    data-cy="btn-bulk-return-hub"
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                    title="Confirmer la remise physique au bureau pour tous les colis sélectionnés reportés ou refusés"
                  >
                    <Building2 className="w-3.5 h-3.5 text-amber-200" />
                    <span>Remis au bureau ({
                      parcels.filter(
                        (p) =>
                          selectedTrackingParcelIds.includes(p.id) &&
                          (p.status === "REPORTE" || p.status === "ANNULE_RETOUR")
                      ).length
                    })</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDeleteConfirmModal({ isOpen: true, isBulk: true })}
                  data-cy="btn-bulk-delete-tracking"
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="Supprimer définitivement les colis sélectionnés (Superviseur / Super Admin)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer ({selectedTrackingParcelIds.length})</span>
                </button>
              </div>
            )}
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Actions rapides disponibles pour les colis au statut <span className="font-semibold text-blue-700">Assigné</span> ou <span className="font-semibold text-sky-700">En Cours</span>
            </p>
          </div>
        </div>

        {filteredParcels.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200 shadow-xs">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-300" />
            <p className="font-bold text-sm text-slate-600">Aucun colis ne correspond à ce filtre.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredParcels.map((parcel) => {
              const isActionable = ["ASSIGNE", "EN_COURS"].includes(parcel.status);
              const isCompleted = ["LIVRE_ENCAISSE", "CLOTURE_CAISSE", "SOUS_TRAITE", "ANNULE_RETOUR"].includes(parcel.status);

              return (
                <div
                  key={parcel.id}
                  data-cy={`parcel-row-${parcel.id}`}
                  className={`border rounded-xl p-3.5 shadow-2xs transition duration-150 space-y-2.5 ${
                    isCompleted
                      ? "bg-slate-50/80 border-slate-200/90 opacity-75 hover:opacity-90"
                      : isActionable
                      ? "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
                      : "bg-slate-50/60 border-slate-200"
                  }`}
                >
                  {/* Top Tier: Identifiers, Status Badges and Montant COD */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      {(parcel.status === "EN_DEPOT" || parcel.status === "ASSIGNE" || parcel.status === "EN_COURS" || parcel.status === "REPORTE") && (
                        <button
                          data-cy={`btn-edit-parcel-${parcel.id}`}
                          onClick={() => handleOpenEditModal(parcel)}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 hover:border-indigo-300 font-bold text-xs rounded-lg transition flex items-center gap-1 shadow-2xs cursor-pointer"
                          title={
                            parcel.status === "EN_COURS"
                              ? "Modifier le lieu et ajuster les frais de livraison (En cours)"
                              : "Modifier le lieu de livraison (En dépôt - frais verrouillés)"
                          }
                        >
                          <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{parcel.status === "EN_COURS" ? "Lieu / Tarif" : "Modifier Lieu"}</span>
                        </button>
                      )}

                      <button
                        data-cy={`btn-history-${parcel.id}`}
                        onClick={() => setHistoryModalParcel(parcel)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs rounded-lg transition flex items-center gap-1 shadow-2xs"
                        title="Consulter l'historique de traçabilité (qui a fait quoi sur ce colis)"
                      >
                        <History className="w-3.5 h-3.5 text-slate-600" />
                        Historique
                      </button>

                      {isPrivileged && (
                        <input
                          type="checkbox"
                          data-cy={`select-tracking-parcel-${parcel.id}`}
                          checked={selectedTrackingParcelIds.includes(parcel.id)}
                          onChange={() => toggleSelectParcel(parcel.id)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer mr-0.5"
                          title="Sélectionner pour action groupée"
                        />
                      )}
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                        BDR-{parcel.tracking_number}
                      </span>
                      {renderStatusBadge(parcel.status)}
                      <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {parcel.axis_label?.split("(")[0]?.trim() || parcel.axis}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded border ${
                          parcel.flux_type === "PROVINCE"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-indigo-50 text-indigo-700 border-indigo-200"
                        }`}
                      >
                        {parcel.flux_type}
                      </span>
                      {(parcel.flux_type === "PROVINCE" || parcel.status === "SOUS_TRAITE") && (
                        <span
                          data-cy={`encaissement-lieu-badge-${parcel.id}`}
                          className={`px-2 py-0.5 text-[11px] font-bold rounded border inline-flex items-center gap-1 ${
                            parcel.encaissement_lieu === "SIEGE"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {parcel.encaissement_lieu === "SIEGE" ? "🏢 COD Siège" : "🛵 COD Livreur"}
                        </span>
                      )}
                      {parcel.courier_id && (
                        <span
                          data-cy={`courier-badge-${parcel.id}`}
                          className="px-2 py-0.5 text-[11px] font-bold rounded bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1"
                        >
                          <Truck className="w-3 h-3 text-emerald-600" />
                          {couriers.find((c) => c.id === parcel.courier_id)?.name || `Livreur #${parcel.courier_id}`}
                        </span>
                      )}
                      {parcel.receptionniste_nom && (
                        <span
                          data-cy={`receptionist-badge-${parcel.id}`}
                          className="px-2 py-0.5 text-[11px] font-bold rounded bg-blue-50 text-blue-800 border border-blue-200 inline-flex items-center gap-1"
                          title="Agent de réception quai ayant enregistré ce colis à l'Inbound"
                        >
                          <User className="w-3 h-3 text-blue-600" />
                          Agent Réception : {parcel.receptionniste_nom}
                        </span>
                      )}
                      {parcel.dernier_agent_nom && (
                        <span
                          data-cy={`last-agent-badge-${parcel.id}`}
                          className="px-2 py-0.5 text-[11px] font-bold rounded bg-indigo-50 text-indigo-800 border border-indigo-200 inline-flex items-center gap-1"
                          title={`Dernière action : ${parcel.derniere_action || 'Mise à jour'} (${parcel.derniere_action_at || ''})`}
                        >
                          <Clock className="w-3 h-3 text-indigo-600" />
                          Dernier intervenant : <strong className="font-semibold">{parcel.dernier_agent_nom}</strong>
                        </span>
                      )}
                    </div>

                    {/* Financial Block (COD) */}
                    <div className="text-right shrink-0">
                      {parcel.total_to_collect === 0 ? (
                        <span
                          data-cy={`prepaid-zero-badge-${parcel.id}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold"
                          title="Paiement déjà effectué (0 Ar à percevoir par le livreur)"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          0 Ar (Déjà Réglé)
                        </span>
                      ) : (
                        <div className="flex flex-col items-end">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-[10px] font-bold uppercase text-slate-400">Montant à recouvrer :</span>
                            <span className="text-sm sm:text-base font-black text-slate-900 font-mono tabular-nums">
                              {parcel.total_to_collect?.toLocaleString()} Ar
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Marchandise : {parcel.merchandise_amount?.toLocaleString()} Ar • Port : {parcel.delivery_fee?.toLocaleString()} Ar
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle Tier: Customer Info, Phone, Address & Merchandise */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                    {/* Customer & Phone (4 cols) */}
                    <div className="md:col-span-4 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-bold text-slate-900 text-sm">{parcel.recipient_name}</span>
                      </div>
                      {(() => {
                        const phoneInfo = detectMalagasyPhone(parcel.recipient_phone);
                        const op = phoneInfo.operator || parcel.operator;
                        const opColors: Record<string, string> = {
                          TELMA: "bg-emerald-50 text-emerald-700 border-emerald-300",
                          ORANGE: "bg-orange-50 text-orange-700 border-orange-300",
                          AIRTEL: "bg-rose-50 text-rose-700 border-rose-300",
                        };
                        const badgeStyle = opColors[op] || "bg-slate-100 text-slate-600 border-slate-200";

                        return (
                          <div className="inline-flex items-center gap-1.5 font-mono text-slate-700">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span className="font-semibold text-xs">{phoneInfo.formatted || parcel.recipient_phone}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-black border uppercase tracking-wider ${badgeStyle}`}>
                              {op || "INCONNU"}
                            </span>
                            {phoneInfo.isValid ? (
                              <span
                                title="Format Malgache Certifié 10 chiffres (CDC 7.1)"
                                className="inline-flex items-center text-emerald-600"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span
                                title={`Format Invalide : ${phoneInfo.errorMessage}`}
                                className="inline-flex items-center text-rose-500 font-bold text-[10px] bg-rose-50 px-1 rounded border border-rose-200"
                              >
                                <AlertCircle className="w-3 h-3 mr-0.5" /> Non conforme
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Address & Items (8 cols) */}
                    <div className="md:col-span-8 space-y-1">
                      <div className="flex items-start gap-1.5 text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                        <span className="font-medium text-slate-800 break-words leading-relaxed">{parcel.delivery_address}</span>
                      </div>
                      {parcel.designation && (
                        <p className="text-[11px] text-slate-500 pl-5">
                          <span className="font-semibold text-slate-600">Marchandise :</span> {parcel.designation}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Operational Event Alerts / Notes if any */}
                  {(parcel.reschedule_date || (parcel.status === "ANNULE_RETOUR" && parcel.incident_reason) || parcel.status === "SOUS_TRAITE" || parcel.payment_method || parcel.observation) && (
                    <div className="flex flex-wrap gap-1.5 pt-1 text-xs">
                      {parcel.observation && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold text-[11px] ${
                          parcel.observation.toUpperCase().includes("URGENT")
                            ? "bg-rose-50 text-rose-800 border-rose-300 font-extrabold animate-pulse"
                            : "bg-blue-50 text-blue-800 border-blue-200"
                        }`}>
                          {parcel.observation.toUpperCase().includes("URGENT") ? "⚡" : "⏰"} Consigne / Plage : {parcel.observation}
                        </span>
                      )}
                      {parcel.reschedule_date && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[11px]">
                          🗓️ Reporté au {parcel.reschedule_date} • Motif : {parcel.incident_reason}
                        </span>
                      )}
                      {parcel.status === "ANNULE_RETOUR" && parcel.incident_reason && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 font-semibold text-[11px]">
                          ✕ Motif annulation : {parcel.incident_reason}
                        </span>
                      )}
                      {parcel.status === "SOUS_TRAITE" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 font-semibold text-[11px] flex-wrap">
                          <span>🚌 Gare / Coopérative : {parcel.partner_name} • Récépissé : {parcel.partner_reference} ({parcel.partner_fee?.toLocaleString()} Ar frais)</span>
                          {parcel.vehicle_plate && <span>• 🚗 {parcel.vehicle_plate}</span>}
                          {parcel.driver_contact && <span>• 📞 {parcel.driver_contact}</span>}
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                            parcel.encaissement_lieu === "SIEGE"
                              ? "bg-blue-100 text-blue-900 border-blue-300"
                              : "bg-emerald-100 text-emerald-900 border-emerald-300"
                          }`}>
                            {parcel.encaissement_lieu === "SIEGE" ? "🏢 COD au Siège" : "🛵 COD Livreur"}
                          </span>
                        </span>
                      )}
                      {parcel.payment_method && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[11px]">
                          ✓ Encaissé via {parcel.payment_method}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Bottom Tier: Rapid Pointage Action Bar */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-[11px] text-slate-500 font-medium">
                      {isActionable ? (
                        <span className="inline-flex items-center gap-1.5 text-blue-700 font-semibold bg-blue-50/80 px-2 py-0.5 rounded border border-blue-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                          Prêt pour pointage terrain
                        </span>
                      ) : parcel.status === "LIVRE" ? (
                        <span className="inline-flex items-center gap-1 text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          <CheckCircle2 className="w-3 h-3 text-teal-600" />
                          Colis remis au destinataire (en attente d'encaissement)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 italic">
                          <CheckCircle2 className="w-3 h-3 text-slate-400" />
                          Pointage clôturé
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isActionable ? (
                        <>
                          <button
                            data-cy={`btn-deliver-only-${parcel.id}`}
                            onClick={() => openModal("MARK_DELIVERED", parcel)}
                            className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center gap-1"
                            title="Valider la remise physique au destinataire (Statut LIVRÉ)"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Livré
                          </button>

                          {parcel.total_to_collect > 0 && (
                            <>
                              <button
                                data-cy={`btn-deliver-${parcel.id}`}
                                onClick={() => openModal("DELIVER", parcel)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center gap-1"
                                title="Valider l'encaissement et marquer ENCAISSÉ"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                Encaisser
                              </button>

                              <button
                                data-cy={`btn-prepaid-${parcel.id}`}
                                onClick={() => openModal("PREPAID", parcel)}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-lg transition flex items-center gap-1"
                                title="Le client a déjà payé à distance (Siège / Boutique) : neutraliser le COD à 0 Ar"
                              >
                                <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                                Déjà Réglé
                              </button>
                            </>
                          )}

                          <button
                            data-cy={`btn-reschedule-${parcel.id}`}
                            onClick={() => openModal("RESCHEDULE", parcel)}
                            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs rounded-lg transition flex items-center gap-1"
                          >
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Reporter
                          </button>

                          <button
                            data-cy={`btn-cancel-${parcel.id}`}
                            onClick={() => openModal("CANCEL", parcel)}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs rounded-lg transition flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            Refus
                          </button>

                          {parcel.flux_type === "PROVINCE" && (
                            <button
                              data-cy={`btn-outsource-${parcel.id}`}
                              onClick={() => openModal("OUTSOURCE", parcel)}
                              className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 font-bold text-xs rounded-lg transition flex items-center gap-1"
                            >
                              <Building2 className="w-3.5 h-3.5 text-purple-600" />
                              Gare
                            </button>
                          )}

                          <button
                            data-cy={`btn-reassign-${parcel.id}`}
                            onClick={() => handleOpenReassignModal(parcel)}
                            className={`px-2.5 py-1.5 border font-bold text-xs rounded-lg transition flex items-center gap-1 ${
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
                      ) : parcel.status === "LIVRE" ? (
                        parcel.total_to_collect > 0 ? (
                          parcel.encaissement_lieu === "SIEGE" ? (
                            <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-blue-600" />
                              Livré & Réglé au Siège ({parcel.total_to_collect?.toLocaleString()} Ar)
                            </span>
                          ) : (
                            <button
                              data-cy={`btn-deliver-${parcel.id}`}
                              onClick={() => openModal("DELIVER", parcel)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center gap-1 animate-pulse"
                              title="Valider l'encaissement pour ce colis déjà livré"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              Encaisser ({parcel.total_to_collect?.toLocaleString()} Ar)
                            </button>
                          )
                        ) : (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Livré & Réglé (0 Ar)
                          </span>
                        )
                      ) : parcel.status === "SOUS_TRAITE" && parcel.total_to_collect > 0 ? (
                        parcel.encaissement_lieu === "SIEGE" ? (
                          <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-blue-600" />
                            Sous-traité & Réglé au Siège ({parcel.total_to_collect?.toLocaleString()} Ar)
                          </span>
                        ) : (
                          <button
                            data-cy={`btn-collect-province-cod-${parcel.id}`}
                            onClick={() => openModal("DELIVER", parcel)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center gap-1 animate-pulse"
                            title="Encaisser le COD Mobile Money versé par le client après réception des coordonnées chauffeur & n° voiture"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            Encaisser COD ({parcel.total_to_collect?.toLocaleString()} Ar)
                          </button>
                        )
                      ) : (parcel.status === "REPORTE" || parcel.status === "ANNULE_RETOUR") ? (
                        <button
                          data-cy={`btn-return-hub-${parcel.id}`}
                          onClick={() => handleReturnToHub(parcel)}
                          className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                          title="Confirmer la remise physique du colis au bureau / Hub par le livreur (réintègre le stock EN_DEPOT et décharge le livreur)"
                        >
                          <Building2 className="w-3.5 h-3.5 text-amber-200" />
                          Remis au bureau
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400 italic px-2 py-1">
                          Pointage clôturé
                        </span>
                      )}

                      {(parcel.status === "EN_DEPOT" || parcel.status === "ASSIGNE" || parcel.status === "EN_COURS" || parcel.status === "REPORTE") && (
                        <button
                          data-cy={`btn-edit-parcel-${parcel.id}`}
                          onClick={() => handleOpenEditModal(parcel)}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 hover:border-indigo-300 font-bold text-xs rounded-lg transition flex items-center gap-1 shadow-2xs cursor-pointer"
                          title={
                            parcel.status === "EN_COURS"
                              ? "Modifier le lieu et ajuster les frais de livraison (En cours)"
                              : "Modifier le lieu de livraison (En dépôt - frais verrouillés)"
                          }
                        >
                          <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{parcel.status === "EN_COURS" ? "Lieu / Tarif" : "Modifier Lieu"}</span>
                        </button>
                      )}

                      <button
                        data-cy={`btn-history-${parcel.id}`}
                        onClick={() => setHistoryModalParcel(parcel)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs rounded-lg transition flex items-center gap-1 shadow-2xs"
                        title="Consulter l'historique de traçabilité (qui a fait quoi sur ce colis)"
                      >
                        <History className="w-3.5 h-3.5 text-slate-600" />
                        Historique
                      </button>

                      {isPrivileged && (
                        <button
                          data-cy={`btn-delete-parcel-${parcel.id}`}
                          onClick={() => setDeleteConfirmModal({ isOpen: true, parcel, isBulk: false })}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 font-bold text-xs rounded-lg transition flex items-center gap-1 shadow-2xs cursor-pointer ml-1"
                          title="Supprimer définitivement ce colis (Superviseur / Super Admin)"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= MODAL 0: CONFIRMATION LIVRAISON PHYSIQUE ================= */}
      {activeModal === "MARK_DELIVERED" && targetParcel && (
        <div
          data-cy="modal-mark-delivered"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-teal-100 text-teal-700 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-800">Confirmation de Livraison Physique</h3>
                <p className="text-xs text-slate-500">
                  Colis BDR-{targetParcel.tracking_number} • {targetParcel.recipient_name}
                </p>
              </div>
            </div>

            <div className="bg-teal-50/60 p-4 rounded-xl border border-teal-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Destinataire :</span>
                <span className="font-bold text-slate-800">{targetParcel.recipient_name}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Contact :</span>
                <span className="font-bold text-slate-800">{targetParcel.recipient_phone}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Adresse :</span>
                <span className="font-bold text-slate-800 text-right">{targetParcel.delivery_address}</span>
              </div>
              <div className="pt-2 border-t border-teal-200/60 flex items-center justify-between">
                <span className="text-xs font-semibold text-teal-900">Montant à encaisser :</span>
                {targetParcel.total_to_collect === 0 ? (
                  <span className="text-sm font-black text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    0 Ar (Déjà Réglé)
                  </span>
                ) : (
                  <span className="text-sm font-black text-teal-700">
                    {targetParcel.total_to_collect?.toLocaleString()} Ar
                  </span>
                )}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-700 flex items-center gap-1.5">
                {targetParcel.total_to_collect === 0 ? "ℹ️ Colis payé d'avance (0 Ar à percevoir) :" : "ℹ️ Remise sans encaissement immédiat :"}
              </p>
              <p>
                {targetParcel.total_to_collect === 0
                  ? "Ce colis a déjà été réglé par le client (en ligne ou au siège). Aucune somme n'est à réclamer au destinataire."
                  : "Cette action enregistre que le colis a été physiquement remis au client. Le statut passera à LIVRÉ. L'encaissement financier pourra être validé séparément."}
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
                data-cy="btn-confirm-mark-delivered"
                type="button"
                onClick={submitPointage}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirmer la Remise (LIVRÉ)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL PREPAID: RÈGLEMENT ANTICIPÉ (COD NEUTRALISÉ) ================= */}
      {activeModal === "PREPAID" && targetParcel && (
        <div
          data-cy="modal-prepaid"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-800">Règlement Anticipé Reçu</h3>
                <p className="text-xs text-slate-500">
                  Colis BDR-{targetParcel.tracking_number} • {targetParcel.recipient_name}
                </p>
              </div>
            </div>

            {/* Current Financial Summary */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Montant COD Initial :</span>
                <span className="font-black text-slate-900">
                  {targetParcel.total_to_collect?.toLocaleString()} Ar
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Marchandise COD : {targetParcel.merchandise_amount?.toLocaleString()} Ar • Port : {targetParcel.delivery_fee?.toLocaleString()} Ar
              </p>
            </div>

            {/* Prepayment Option Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                Portée du Règlement Anticipé
              </label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  data-cy="btn-prepaid-all"
                  onClick={() => setPrepaidType("ALL")}
                  className={`p-3 text-xs font-bold rounded-xl border transition text-left flex items-start gap-2.5 ${
                    prepaidType === "ALL"
                      ? "bg-indigo-50 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${prepaidType === "ALL" ? "text-indigo-600" : "text-slate-400"}`} />
                  <div>
                    <p className="font-black">Paiement Intégral (0 Ar restant à percevoir)</p>
                    <p className="text-[11px] font-normal text-slate-500">
                      Marchandise et livraison réglées d'avance au siège ou par virement. Le livreur remet le colis sans demander d'argent.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  data-cy="btn-prepaid-merch-only"
                  onClick={() => setPrepaidType("MERCHANDISE_ONLY")}
                  className={`p-3 text-xs font-bold rounded-xl border transition text-left flex items-start gap-2.5 ${
                    prepaidType === "MERCHANDISE_ONLY"
                      ? "bg-indigo-50 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${prepaidType === "MERCHANDISE_ONLY" ? "text-indigo-600" : "text-slate-400"}`} />
                  <div>
                    <p className="font-black">Marchandise Seule Réglée ({targetParcel.delivery_fee?.toLocaleString()} Ar restants)</p>
                    <p className="text-[11px] font-normal text-slate-500">
                      Le client a payé le cybermarchand directement. Le livreur ne perçoit que les frais de livraison.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Payment Channel */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                Canal de Paiement Utilisé
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "MVOLA", label: "📱 Telma MVola" },
                  { id: "ORANGE_MONEY", label: "📱 Orange Money" },
                  { id: "AIRTEL", label: "📱 Airtel Money" },
                  { id: "VIREMENT", label: "🏦 Virement" },
                  { id: "ESPECES", label: "💵 Espèces Siège" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    data-cy={`prepaid-channel-${m.id.toLowerCase()}`}
                    onClick={() => setPrepaidPaymentMethod(m.id)}
                    className={`p-2.5 text-[11px] font-bold rounded-xl border transition text-center ${
                      prepaidPaymentMethod === m.id
                        ? "bg-indigo-50 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transaction Reference */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                Référence Transaction / Reçu (Optionnel)
              </label>
              <input
                type="text"
                data-cy="prepaid-reference-input"
                value={prepaidReference}
                onChange={(e) => setPrepaidReference(e.target.value)}
                placeholder="Ex: REF-MVOLA-49204 ou N° BORDEREAU"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500 bg-white"
              />
            </div>

            {/* Notice */}
            <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200 text-xs text-indigo-950 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                💡 Décharge financière du livreur protégée :
              </p>
              <p className="text-[11px] leading-relaxed">
                Le montant neutralisé est immédiatement retiré du total théorique attendu du coursier lors de la clôture de caisse du soir. Aucune dette ne lui sera imputée.
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
                data-cy="btn-confirm-prepaid"
                type="button"
                onClick={submitPointage}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Valider le Règlement Anticipé
              </button>
            </div>
          </div>
        </div>
      )}

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
                <h3 className="font-black text-lg text-slate-800">
                  {targetParcel.status === "LIVRE" || targetParcel.status === "SOUS_TRAITE"
                    ? "Validation d'Encaissement"
                    : "Validation de Livraison & Encaissement"}
                </h3>
                <p className="text-xs text-slate-500">
                  Colis BDR-{targetParcel.tracking_number} • {targetParcel.recipient_name}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1 text-center">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Montant Total Réel à Encaisser
              </p>
              <p className="text-3xl font-black text-emerald-600">
                {isPartialDelivery
                  ? (partialMerchandiseAmount + (targetParcel.delivery_fee || 0)).toLocaleString("fr-FR")
                  : targetParcel.total_to_collect?.toLocaleString("fr-FR")}{" "}
                Ar
              </p>
              <p className="text-[11px] text-slate-500">
                {isPartialDelivery
                  ? `(Marchandise achetée : ${partialMerchandiseAmount.toLocaleString("fr-FR")} Ar + Frais livraison : ${targetParcel.delivery_fee?.toLocaleString("fr-FR")} Ar)`
                  : `(Marchandise COD : ${targetParcel.merchandise_amount?.toLocaleString("fr-FR")} Ar + Livraison : ${targetParcel.delivery_fee?.toLocaleString("fr-FR")} Ar)`}
              </p>
            </div>

            {/* Toggle Vente Partielle & Retour d'Articles (ex: 2 chaussures gardées sur 3) */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-blue-900 flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isPartialDelivery}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsPartialDelivery(checked);
                      if (checked && partialMerchandiseAmount === 0) {
                        setPartialMerchandiseAmount(targetParcel.merchandise_amount);
                      }
                    }}
                    className="rounded text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <span>👟 Vente Partielle (ex: 2 articles gardés sur 3)</span>
                </label>
                {isPartialDelivery && (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                    Reste retourné au Hub
                  </span>
                )}
              </div>

              {isPartialDelivery && (
                <div className="pt-2.5 border-t border-blue-200/80 space-y-2.5 text-xs animate-in fade-in duration-150">
                  <div>
                    <label className="text-[11px] font-bold text-slate-800 block mb-1">
                      Prix des articles réellement achetés (Marchandise Ar) *
                    </label>
                    <input
                      type="number"
                      value={partialMerchandiseAmount === 0 ? "" : partialMerchandiseAmount}
                      onChange={(e) => setPartialMerchandiseAmount(Number(e.target.value) || 0)}
                      placeholder={`Ex: 100000 (au lieu de ${targetParcel.merchandise_amount})`}
                      className="w-full px-3 py-2 text-xs font-mono font-bold border border-blue-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-600 mt-1">
                      <span>Marchandise : <strong>{partialMerchandiseAmount.toLocaleString("fr-FR")} Ar</strong></span>
                      <span>+ Frais port : <strong>{targetParcel.delivery_fee?.toLocaleString("fr-FR")} Ar</strong></span>
                      <span className="text-blue-900 font-black">
                        = Total Perçu : {(partialMerchandiseAmount + (targetParcel.delivery_fee || 0)).toLocaleString("fr-FR")} Ar
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-800 block mb-1">
                      Article(s) retourné(s) / Motif restitution Hub *
                    </label>
                    <input
                      type="text"
                      value={partialReturnNotes}
                      onChange={(e) => setPartialReturnNotes(e.target.value)}
                      placeholder="Ex: Pris 2 paires, retourné 1 paire pointure 39 non retenue"
                      className="w-full px-3 py-2 text-xs border border-blue-300 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5 italic">
                      ℹ️ Cette note figurera sur le relevé de l'expéditeur et les articles non pris seront déchargés au Hub le soir pour restitution.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Choix Lieu Recouvrement COD / Port */}
            {targetParcel.total_to_collect > 0 && (
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1.5">
                <label className="text-xs font-bold text-purple-950 block uppercase tracking-wider">
                  Lieu d'Encaissement des Fonds (Siège vs Livreur)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEncaissementLieu("SIEGE")}
                    className={`p-2 text-xs font-bold rounded-lg border transition text-left cursor-pointer ${
                      encaissementLieu === "SIEGE"
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    🏢 Au Siège (Caisse)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEncaissementLieu("LIVREUR")}
                    className={`p-2 text-xs font-bold rounded-lg border transition text-left cursor-pointer ${
                      encaissementLieu === "LIVREUR"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    🛵 Par le Livreur
                  </button>
                </div>
              </div>
            )}

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

            {/* Mobile Money live phone regex verification (CDC 7.1) */}
            {["MVOLA", "AIRTEL", "ORANGE_MONEY"].includes(selectedPaymentMethod) && (
              <div
                data-cy="mobile-money-verification-box"
                className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    Numéro Mobile Money (Vérification Regex)
                  </label>
                  <span className="text-[11px] font-medium text-slate-500">
                    Attendu :{" "}
                    <strong>
                      {selectedPaymentMethod === "MVOLA"
                        ? "Telma (034, 038)"
                        : selectedPaymentMethod === "ORANGE_MONEY"
                        ? "Orange (032, 037)"
                        : "Airtel (033)"}
                    </strong>
                  </span>
                </div>

                <div className="relative">
                  <input
                    data-cy="mobile-money-phone-input"
                    type="text"
                    value={mobileMoneyPhone}
                    onChange={(e) => setMobileMoneyPhone(e.target.value)}
                    placeholder="Ex: 034 12 345 67 ou 032 ..."
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 bg-white"
                  />
                  {mobileMoneyPhone && (
                    <span className="absolute right-2.5 top-2">
                      {detectMalagasyPhone(mobileMoneyPhone).isValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                      )}
                    </span>
                  )}
                </div>

                {mobileMoneyPhone && (
                  <div className="text-xs">
                    {(() => {
                      const detect = detectMalagasyPhone(mobileMoneyPhone);
                      const expectedOp =
                        selectedPaymentMethod === "MVOLA"
                          ? "TELMA"
                          : selectedPaymentMethod === "ORANGE_MONEY"
                          ? "ORANGE"
                          : "AIRTEL";

                      if (!detect.isValid) {
                        return (
                          <p data-cy="mm-phone-error" className="text-rose-600 text-[11px] font-semibold flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                            {detect.errorMessage || "Format invalide"}
                          </p>
                        );
                      }

                      const opMatch = detect.operator === expectedOp;
                      return (
                        <div
                          data-cy="mm-phone-success"
                          className={`flex items-center justify-between text-[11px] p-2 rounded-lg border font-bold ${
                            opMatch
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            {opMatch ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            )}
                            Format : {detect.formatted} ({detect.operator})
                            {!opMatch && ` • Attention: portefeuille ${expectedOp} mais numéro ${detect.operator}`}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-white/80 border border-current">
                            {detect.operator}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                )}
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                    Motif Circonstancié (Obligatoire)
                  </label>
                  {!isCreatingRescheduleReason && (
                    <button
                      type="button"
                      data-cy="btn-toggle-create-reschedule-reason"
                      onClick={() => setIsCreatingRescheduleReason(true)}
                      className="text-xs font-bold text-amber-700 hover:text-amber-900 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Créer un motif</span>
                    </button>
                  )}
                </div>

                {isCreatingRescheduleReason ? (
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                    <p className="text-[11px] font-bold text-amber-900">
                      Nouveau motif de report personnalisé (enregistré automatiquement) :
                    </p>
                    <div className="flex gap-2">
                      <input
                        data-cy="input-new-reschedule-reason"
                        type="text"
                        placeholder="Ex: Client en réunion jusqu'à 17h..."
                        value={newRescheduleReasonInput}
                        onChange={(e) => setNewRescheduleReasonInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs border border-amber-300 rounded-lg focus:outline-none focus:border-amber-600 bg-white"
                      />
                      <button
                        type="button"
                        data-cy="btn-save-new-reschedule-reason"
                        onClick={() => handleAddRescheduleReason()}
                        className="px-3 py-1.5 bg-amber-600 text-white font-bold text-xs rounded-lg hover:bg-amber-700 transition"
                      >
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCreatingRescheduleReason(false)}
                        className="px-2 py-1.5 bg-slate-200 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-300"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <select
                      data-cy="reschedule-reason-select"
                      value={rescheduleReason}
                      onChange={(e) => {
                        if (e.target.value === "__NEW__") {
                          setIsCreatingRescheduleReason(true);
                        } else {
                          setRescheduleReason(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 bg-white"
                    >
                      {rescheduleReasonsList.map((reason) => (
                        <option key={reason} value={reason}>
                          {reason}
                        </option>
                      ))}
                      <option value="__NEW__">➕ Créer un nouveau motif personnalisé...</option>
                      <option value="Autre">Autre motif circonstancié...</option>
                    </select>

                    {rescheduleReason === "Autre" && (
                      <div className="mt-2 space-y-1.5">
                        <input
                          data-cy="reschedule-custom-reason"
                          type="text"
                          placeholder="Précisez le motif du report..."
                          value={customRescheduleReason}
                          onChange={(e) => setCustomRescheduleReason(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-amber-300 rounded-xl focus:outline-none focus:border-amber-500"
                        />
                        {customRescheduleReason.trim().length > 3 && (
                          <button
                            type="button"
                            onClick={() => handleAddRescheduleReason(customRescheduleReason)}
                            className="text-[11px] font-bold text-amber-700 hover:text-amber-900 underline flex items-center gap-1"
                          >
                            💾 Enregistrer ce motif dans la liste permanente pour les prochaines fois
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Phone Verification Box when customer cannot be reached */}
              {rescheduleReason === "Client injoignable après 3 appels" && (
                <div
                  data-cy="reschedule-phone-verification"
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-blue-600" />
                      Vérification du Numéro Injoignable (Regex CDC 7.1)
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Numéro actuel</span>
                      <span className="font-mono font-bold text-slate-800">
                        {targetParcel.recipient_phone}
                      </span>
                    </div>
                    <div>
                      {detectMalagasyPhone(targetParcel.recipient_phone).isValid ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Regex Valide ({targetParcel.operator})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          Format Invalide
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 block">
                      Tester / corriger le numéro pour la reprogrammation :
                    </label>
                    <div className="flex gap-2">
                      <input
                        data-cy="reschedule-test-phone-input"
                        type="text"
                        placeholder="Ex: 034 12 345 67"
                        value={testPhoneInput}
                        onChange={(e) => {
                          setTestPhoneInput(e.target.value);
                          setPhoneUpdateSuccess(null);
                          setPhoneUpdateError(null);
                        }}
                        className="flex-1 px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                      />
                      <button
                        type="button"
                        data-cy="btn-update-reschedule-phone"
                        onClick={handleUpdateParcelPhone}
                        disabled={isUpdatingPhone || !detectMalagasyPhone(testPhoneInput).isValid}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg transition shrink-0"
                      >
                        {isUpdatingPhone ? "Mise à jour..." : "Mettre à jour"}
                      </button>
                    </div>

                    {testPhoneInput && (
                      <div className="text-xs pt-1">
                        {(() => {
                          const check = detectMalagasyPhone(testPhoneInput);
                          if (!check.isValid) {
                            return (
                              <p className="text-rose-600 text-[11px] font-semibold flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5 shrink-0" />
                                {check.errorMessage || "Format invalide"}
                              </p>
                            );
                          }
                          return (
                            <div className="flex items-center justify-between text-[11px] text-emerald-700 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                              <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Format certifié : {check.formatted}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-600 text-white">
                                {check.operator}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {phoneUpdateSuccess && (
                      <p className="text-emerald-700 text-xs font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                        ✅ {phoneUpdateSuccess}
                      </p>
                    )}
                  </div>
                </div>
              )}
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                    Motif Circonstancié du Refus (Obligatoire)
                  </label>
                  {!isCreatingCancelReason && (
                    <button
                      type="button"
                      data-cy="btn-toggle-create-cancel-reason"
                      onClick={() => setIsCreatingCancelReason(true)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Créer un motif</span>
                    </button>
                  )}
                </div>

                {isCreatingCancelReason ? (
                  <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2">
                    <p className="text-[11px] font-bold text-rose-900">
                      Nouveau motif de refus personnalisé (enregistré automatiquement) :
                    </p>
                    <div className="flex gap-2">
                      <input
                        data-cy="input-new-cancel-reason"
                        type="text"
                        placeholder="Ex: Client indisponible pour les 15 prochains jours..."
                        value={newCancelReasonInput}
                        onChange={(e) => setNewCancelReasonInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs border border-rose-300 rounded-lg focus:outline-none focus:border-rose-600 bg-white"
                      />
                      <button
                        type="button"
                        data-cy="btn-save-new-cancel-reason"
                        onClick={() => handleAddCancelReason()}
                        className="px-3 py-1.5 bg-rose-600 text-white font-bold text-xs rounded-lg hover:bg-rose-700 transition"
                      >
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCreatingCancelReason(false)}
                        className="px-2 py-1.5 bg-slate-200 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-300"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <select
                      data-cy="cancel-reason-select"
                      value={cancelReason}
                      onChange={(e) => {
                        if (e.target.value === "__NEW__") {
                          setIsCreatingCancelReason(true);
                        } else {
                          setCancelReason(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:outline-none focus:border-rose-500 bg-white"
                    >
                      {cancelReasonsList.map((reason) => (
                        <option key={reason} value={reason}>
                          {reason}
                        </option>
                      ))}
                      <option value="__NEW__">➕ Créer un nouveau motif personnalisé...</option>
                      <option value="Autre">Autre motif explicite...</option>
                    </select>

                    {cancelReason === "Autre" && (
                      <div className="mt-2 space-y-1.5">
                        <input
                          data-cy="cancel-custom-reason"
                          type="text"
                          placeholder="Précisez le motif du refus..."
                          value={customCancelReason}
                          onChange={(e) => setCustomCancelReason(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-rose-300 rounded-xl focus:outline-none focus:border-rose-500"
                        />
                        {customCancelReason.trim().length > 3 && (
                          <button
                            type="button"
                            onClick={() => handleAddCancelReason(customCancelReason)}
                            className="text-[11px] font-bold text-rose-700 hover:text-rose-900 underline flex items-center gap-1"
                          >
                            💾 Enregistrer ce motif dans la liste permanente pour les prochaines fois
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Phone Regex Verification & Live Correction Widget (CDC 7.1) */}
              <div
                data-cy="phone-verification-box"
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    Vérification Regex du Numéro Destinataire (CDC 7.1)
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    Format: 03[23478]XXXXXXX
                  </span>
                </div>

                {/* Current parcel number status */}
                <div className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Numéro actuel sur le colis</span>
                    <span className="font-mono font-bold text-slate-800">
                      {targetParcel.recipient_phone}
                    </span>
                  </div>
                  <div>
                    {detectMalagasyPhone(targetParcel.recipient_phone).isValid ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Regex Valide ({targetParcel.operator})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
                        <AlertCircle className="w-3 h-3 text-rose-600" />
                        Format Invalide
                      </span>
                    )}
                  </div>
                </div>

                {/* Tester / Corrector input */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 block">
                    Tester ou corriger le numéro destinataire :
                  </label>
                  <div className="flex gap-2">
                    <input
                      data-cy="test-recipient-phone-input"
                      type="text"
                      placeholder="Ex: 034 12 345 67 ou +261 32 ..."
                      value={testPhoneInput}
                      onChange={(e) => {
                        setTestPhoneInput(e.target.value);
                        setPhoneUpdateSuccess(null);
                        setPhoneUpdateError(null);
                      }}
                      className="flex-1 px-3 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                    />
                    <button
                      type="button"
                      data-cy="btn-update-parcel-phone"
                      onClick={handleUpdateParcelPhone}
                      disabled={isUpdatingPhone || !detectMalagasyPhone(testPhoneInput).isValid}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg transition shrink-0"
                    >
                      {isUpdatingPhone ? "Enregistrement..." : "Appliquer au Colis"}
                    </button>
                  </div>

                  {/* Live Regex Diagnostic Feedback */}
                  {testPhoneInput && (
                    <div className="text-xs pt-1">
                      {(() => {
                        const check = detectMalagasyPhone(testPhoneInput);
                        if (!check.isValid) {
                          return (
                            <p data-cy="phone-regex-error" className="text-rose-600 text-[11px] font-semibold flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 shrink-0" />
                              {check.errorMessage || "Format invalide"}
                            </p>
                          );
                        }
                        return (
                          <div data-cy="phone-regex-success" className="flex items-center justify-between text-[11px] text-emerald-700 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Format normalisé : {check.formatted}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-600 text-white">
                              {check.operator}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {phoneUpdateSuccess && (
                    <p data-cy="phone-update-success" className="text-emerald-700 text-xs font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                      ✅ {phoneUpdateSuccess}
                    </p>
                  )}
                  {phoneUpdateError && (
                    <p className="text-rose-700 text-xs font-bold bg-rose-50 p-2 rounded-lg border border-rose-200">
                      ❌ {phoneUpdateError}
                    </p>
                  )}
                </div>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">
                    N° de Voiture / Immatriculation
                  </label>
                  <input
                    data-cy="outsource-plate-input"
                    type="text"
                    placeholder="Ex: 1234 TAB / N° 14"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">
                    Coordonnées Chauffeur (Nom & Tél)
                  </label>
                  <input
                    data-cy="outsource-driver-input"
                    type="text"
                    placeholder="Ex: Rakoto 034 11 222 33"
                    value={driverContact}
                    onChange={(e) => setDriverContact(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:outline-none focus:border-purple-500"
                  />
                </div>
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

              <div>
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider mb-1">
                  Lieu de Récupération du COD Province
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    data-cy="outsource-encaissement-siege"
                    onClick={() => setEncaissementLieu("SIEGE")}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                      encaissementLieu === "SIEGE"
                        ? "bg-blue-50 border-blue-500 text-blue-800 ring-2 ring-blue-500/20"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    🏢 Au Siège (Caisse)
                    <span className="block text-[10px] font-normal text-slate-500 mt-0.5">
                      Paiement direct au Siège / Virement
                    </span>
                  </button>
                  <button
                    type="button"
                    data-cy="outsource-encaissement-livreur"
                    onClick={() => setEncaissementLieu("LIVREUR")}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                      encaissementLieu === "LIVREUR"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    🛵 Par le Livreur
                    <span className="block text-[10px] font-normal text-slate-500 mt-0.5">
                      Le livreur / navette encaisse et décharge
                    </span>
                  </button>
                </div>
              </div>

              <div className="bg-purple-50/80 p-3 rounded-xl border border-purple-200 text-purple-900 text-[11px] leading-relaxed">
                <strong>💡 Preuves d'Embarquement Province :</strong> Le numéro de récépissé, l'immatriculation du
                taxi-brousse et le contact du chauffeur constituent la preuve formelle transmise au client destinataire.
                Si le colis comporte un COD, ce dernier effectue alors son transfert Mobile Money vers TMS Express.
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
                Nouveau Coursier d'Affectation
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

      {/* ================= MODAL 6: CONFIRMATION SUPPRESSION COLIS (SUPERVISEUR & SUPER ADMIN) ================= */}
      {deleteConfirmModal?.isOpen && (
        <div
          data-cy="modal-delete-confirm-tracking"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-800">
                  {deleteConfirmModal.isBulk
                    ? `Supprimer ${selectedTrackingParcelIds.length} colis ?`
                    : `Supprimer le colis ?`}
                </h3>
                <p className="text-xs text-slate-500">
                  Action réservée aux profils Superviseur et Super Admin
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {deleteConfirmModal.isBulk ? (
                <div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Êtes-vous sûr de vouloir supprimer définitivement les{" "}
                    <strong className="text-rose-700 font-bold">{selectedTrackingParcelIds.length} colis sélectionnés</strong> ?
                  </p>
                  <p className="text-[11px] text-slate-500 mt-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    Cette action est <strong>irréversible</strong>. Les colis, leurs encaissements et historiques associés seront définitivement effacés de la base de données.
                  </p>
                </div>
              ) : deleteConfirmModal.parcel ? (
                <div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Êtes-vous sûr de vouloir supprimer définitivement le colis{" "}
                    <strong className="font-mono text-blue-700 font-bold">
                      BDR-{deleteConfirmModal.parcel.tracking_number}
                    </strong>{" "}
                    destiné à <strong>{deleteConfirmModal.parcel.recipient_name}</strong> ?
                  </p>
                  <div className="text-[11px] text-slate-600 mt-2 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                    <div><strong>Adresse :</strong> {deleteConfirmModal.parcel.delivery_address}</div>
                    <div><strong>Montant COD :</strong> {deleteConfirmModal.parcel.total_to_collect?.toLocaleString()} Ar</div>
                    <div><strong>Statut actuel :</strong> <span className="font-bold text-slate-800">{deleteConfirmModal.parcel.status}</span></div>
                    <div><strong>Axe :</strong> {deleteConfirmModal.parcel.axis}</div>
                  </div>
                  <p className="text-[11px] text-rose-600 font-bold mt-2">
                    ⚠️ Cette suppression est immédiate et irréversible.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmModal(null)}
                className="px-4 py-2 font-bold text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                data-cy="btn-confirm-delete-tracking"
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  if (deleteConfirmModal.isBulk) {
                    handleConfirmBulkDelete();
                  } else if (deleteConfirmModal.parcel) {
                    handleConfirmDeleteSingle(deleteConfirmModal.parcel);
                  }
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? "Suppression en cours..." : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL PRIORITÉ 9: MODIFICATION LIEU ET FRAIS SELON STATUT ================= */}
      {editLocationModal.isOpen && editLocationModal.parcel && (
        <div
          data-cy="modal-edit-location-fee"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-xl ${
                    editLocationModal.parcel.status === "EN_COURS"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-lg text-slate-800">
                      {editLocationModal.parcel.status === "EN_COURS"
                        ? "Modifier Lieu & Tarif"
                        : "Modifier Lieu de Livraison"}
                    </h3>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        editLocationModal.parcel.status === "EN_COURS"
                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {editLocationModal.parcel.status === "EN_COURS" ? "En cours de livraison" : "En dépôt"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Colis <strong className="font-mono text-blue-700">BDR-{editLocationModal.parcel.tracking_number}</strong> • Destinataire : {editLocationModal.parcel.recipient_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseEditModal}
                className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner */}
            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Field 1: Delivery Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Lieu / Adresse de livraison</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    Axe actuel : <strong className="text-slate-700">{editLocationModal.parcel.axis}</strong>
                  </span>
                </label>
                <input
                  data-cy="input-edit-address"
                  type="text"
                  value={editAddressInput}
                  onChange={(e) => setEditAddressInput(e.target.value)}
                  placeholder="Ex: Analakely, Itaosy Cité, Ankorondrano..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 transition"
                />
                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  💡 <span>L&apos;axe de livraison sera automatiquement mis à jour selon le quartier saisi.</span>
                </p>
              </div>

              {/* Field 2: Delivery Fee */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    {editLocationModal.parcel.status === "EN_COURS" ? (
                      <span className="text-emerald-700">Frais de livraison (Ajustable)</span>
                    ) : (
                      <span className="text-slate-600 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                        Frais de livraison (Verrouillés)
                      </span>
                    )}
                  </span>
                  <span className="text-xs font-black text-blue-700">
                    {editLocationModal.parcel.status === "EN_COURS"
                      ? `${Number(editFeeInput).toLocaleString()} Ar`
                      : `${(editLocationModal.parcel.delivery_fee ?? 3000).toLocaleString()} Ar`}
                  </span>
                </label>

                {editLocationModal.parcel.status === "EN_COURS" ? (
                  <div className="space-y-2">
                    <input
                      data-cy="input-edit-fee"
                      type="number"
                      step={500}
                      min={0}
                      value={editFeeInput}
                      onChange={(e) => setEditFeeInput(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 text-sm bg-emerald-50/50 border border-emerald-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-900 transition"
                    />

                    {/* Quick tariff pills */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-500">Tarifs rapides :</span>
                      {[
                        { label: "3 000 Ar (CUA)", val: 3000 },
                        { label: "4 000 Ar (Couronne)", val: 4000 },
                        { label: "5 000 Ar (Périphérie)", val: 5000 },
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => setEditFeeInput(preset.val)}
                          className={`px-2.5 py-1 text-xs rounded-lg font-bold transition border ${
                            editFeeInput === preset.val
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-[11px] leading-relaxed">
                      ⚡ <strong>En cours de livraison</strong> : Le client a changé d&apos;adresse pendant la course. Vous pouvez ajuster les frais selon la nouvelle zone convenue.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-sm font-semibold select-none">
                      <span className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-amber-600" />
                        <span>{(editLocationModal.parcel.delivery_fee ?? 3000).toLocaleString()} Ar</span>
                      </span>
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        Verrouillé au dépôt
                      </span>
                    </div>

                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
                      🔒 <strong>Règle métier (Priorité 9)</strong> : Tant que le colis est <em>En dépôt</em>, les frais restent verrouillés (3 000 Ar standard). Le tarif ne pourra être réajusté que si le colis passe <em>En cours de livraison</em>.
                    </div>
                  </div>
                )}
              </div>

              {/* Summary box */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Marchandise :</span>
                  <span className="font-bold">{(editLocationModal.parcel.merchandise_amount ?? 0).toLocaleString()} Ar</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Frais de livraison :</span>
                  <span className="font-bold">
                    {(editLocationModal.parcel.status === "EN_COURS"
                      ? Number(editFeeInput)
                      : (editLocationModal.parcel.delivery_fee ?? 3000)
                    ).toLocaleString()}{" "}
                    Ar
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200 font-black text-slate-900 text-sm">
                  <span>Nouveau Total COD à encaisser :</span>
                  <span className="text-emerald-700">
                    {(
                      (editLocationModal.parcel.merchandise_amount ?? 0) +
                      (editLocationModal.parcel.status === "EN_COURS"
                        ? Number(editFeeInput)
                        : (editLocationModal.parcel.delivery_fee ?? 3000))
                    ).toLocaleString()}{" "}
                    Ar
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmittingEdit}
                onClick={handleCloseEditModal}
                className="px-4 py-2 font-bold text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                data-cy="btn-confirm-save-location-fee"
                type="button"
                disabled={isSubmittingEdit}
                onClick={handleSaveEdit}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSubmittingEdit ? "Enregistrement..." : "Enregistrer les modifications"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit & Traceability Modal */}
      <ParcelHistoryModal
        parcel={historyModalParcel}
        isOpen={Boolean(historyModalParcel)}
        onClose={() => setHistoryModalParcel(null)}
      />
    </div>
  );
}
