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
import { detectAxisClient } from "../../lib/axis";
import { fetchVendors, createParcelBatch } from "../../lib/api";
import { OperatorBadge } from "../../components/OperatorBadge";
import { AxisBadge } from "../../components/AxisBadge";
import { FluxType, LogisticAxis, SenderType, Vendor } from "../../types";

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
      axis: "AXE_CENTRE",
      isAxisFallback: true,
      isManualAxis: false,
      fluxType: "COD",
      merchandiseAmount: 0,
      deliveryFee: 5000,
      observation: "",
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdParcels, setCreatedParcels] = useState<any[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchVendors().then((data) => {
      setVendors(data);
      // Sender fields remain strictly empty on first load (user request)
    });
  }, []);

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
    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}`,
        recipientName: "",
        recipientPhone: "",
        designation: "",
        deliveryAddress: "",
        axis: "AXE_CENTRE",
        isAxisFallback: true,
        isManualAxis: false,
        fluxType: "COD",
        merchandiseAmount: 0,
        deliveryFee: 5000,
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

      // Auto-detect axis when address changes (unless user manually selected a custom axis)
      if (field === "deliveryAddress") {
        if (!target.isManualAxis) {
          const detection = detectAxisClient(value);
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
        `Numéro de téléphone expéditeur invalide (${senderPhone}). Requis : 10 chiffres malgaches (032/033/034/037/038).`
      );
      return;
    }

    // Validate Rows
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.recipientName.trim()) {
        setErrorMessage(`Ligne #${i + 1} : Le nom du destinataire est obligatoire.`);
        return;
      }
      const phoneCheck = detectMalagasyPhone(r.recipientPhone);
      if (!phoneCheck.isValid) {
        setErrorMessage(
          `Ligne #${i + 1} : Numéro de téléphone destinataire invalide (${
            r.recipientPhone || "vide"
          }). Requis : 10 chiffres malgaches valides (032, 033, 034, 037, 038).`
        );
        return;
      }
      if (!r.deliveryAddress.trim()) {
        setErrorMessage(`Ligne #${i + 1} : L'adresse de livraison est obligatoire.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = rows.map((r) => ({
        vendor_id: selectedVendorId || 1,
        sender_type: senderType,
        sender_name: senderName,
        sender_phone: senderPhone || undefined,
        sender_address: senderAddress || undefined,
        recipient_name: r.recipientName,
        recipient_phone: r.recipientPhone,
        designation: r.designation || undefined,
        delivery_address: r.deliveryAddress,
        axis: r.axis,
        is_manual_axis: r.isManualAxis,
        flux_type: r.fluxType,
        merchandise_amount: Number(r.merchandiseAmount) || 0,
        delivery_fee: Number(r.deliveryFee) || 0,
        observation: r.observation || undefined,
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
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Nombre de Colis</span>
          <p className="text-2xl font-black text-slate-800 mt-1">{totalParcels}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Total Marchandise</span>
          <p className="text-xl font-bold text-slate-800 mt-1">
            {totalMerchandise.toLocaleString("fr-FR")} Ar
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Total Frais Livraison</span>
          <p className="text-xl font-bold text-slate-800 mt-1">
            {totalFees.toLocaleString("fr-FR")} Ar
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-900 to-indigo-900 text-white p-4 rounded-xl shadow-md">
          <span className="text-xs text-blue-300 font-medium">Total Global à Encaisser</span>
          <p data-testid="total-to-collect" className="text-2xl font-black text-emerald-400 mt-1">
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
                  {/* Destinataire Nom (col-span-3) */}
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Destinataire (Nom complet) *
                    </label>
                    <input
                      type="text"
                      data-testid={`input-name-${idx}`}
                      value={row.recipientName}
                      onChange={(e) => updateRow(idx, "recipientName", e.target.value)}
                      placeholder="Nom du client destinataire..."
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
                    <select
                      data-testid={`select-axis-${idx}`}
                      data-cy={`select-axis-${idx}`}
                      value={row.axis}
                      onChange={(e) => updateRow(idx, "axis", e.target.value as LogisticAxis)}
                      className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none transition ${
                        row.axis === "AXE_PROVINCE"
                          ? "border-purple-300 bg-purple-50/30 ring-1 ring-purple-400"
                          : row.isManualAxis
                          ? "border-blue-400 bg-blue-50/20"
                          : "border-slate-300"
                      }`}
                    >
                      <optgroup label="📍 Réseau Urbain (Grand Tanà)">
                        <option value="AXE_CENTRE">1. AXE_CENTRE (Tsiazotafo & Hyper-Centre)</option>
                        <option value="AXE_RN1">2. AXE_RN1 (Itaosy / Ampitatafika / Ouest)</option>
                        <option value="AXE_RN2">3. AXE_RN2 (Ambohimangakely / Est)</option>
                        <option value="AXE_RN3">4. AXE_RN3 (Sabotsy Namehana / Nord)</option>
                        <option value="AXE_RN4">5. AXE_RN4 (Ivato / Digue)</option>
                        <option value="AXE_RN7">6. AXE_RN7 (Iavoloha / Sud)</option>
                        <option value="AXE_SUD_EST">7. AXE_SUD_EST (Alasora / By-Pass)</option>
                      </optgroup>
                      <optgroup label="🚚 Expéditions Nationales (Province)">
                        <option value="AXE_PROVINCE">8. AXE_PROVINCE (Gares Routières & Régions)</option>
                      </optgroup>
                    </select>
                    <div className="pt-0.5 flex items-center justify-between gap-1 flex-wrap">
                      <AxisBadge
                        axis={row.axis}
                        isFallback={row.isAxisFallback}
                        isManual={row.isManualAxis}
                      />
                      {row.axis === "AXE_PROVINCE" && (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded border border-purple-200 flex items-center gap-1">
                          📦 Dépôt Gare Coopérative
                        </span>
                      )}
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
                      <label className="text-[11px] font-bold text-slate-700 block">
                        Frais Livraison (Ar)
                      </label>
                      <input
                        type="number"
                        data-testid={`input-fee-${idx}`}
                        value={row.deliveryFee === 0 ? "" : row.deliveryFee}
                        onChange={(e) =>
                          updateRow(idx, "deliveryFee", Number(e.target.value) || 0)
                        }
                        placeholder="5000"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-right focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
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
              </div>
            ))}
          </div>

          <div className="text-right pt-2">
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
                    axis: "AXE_CENTRE",
                    isAxisFallback: true,
                    isManualAxis: false,
                    fluxType: "COD",
                    merchandiseAmount: 0,
                    deliveryFee: 5000,
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
    </div>
  );
}
