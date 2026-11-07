"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Printer, CheckCircle, AlertCircle, RefreshCw, Store, User, Building2, Phone, MapPin } from "lucide-react";
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
  deliveryAddress: string;
  axis: LogisticAxis;
  isAxisFallback: boolean;
  fluxType: FluxType;
  merchandiseAmount: number;
  deliveryFee: number;
  observation: string;
}

export default function InboundPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [senderType, setSenderType] = useState<SenderType>("CYBERMARCHAND");
  const [selectedVendorId, setSelectedVendorId] = useState<number>(1);

  // Custom sender contact fields (for Particulier or custom override)
  const [senderName, setSenderName] = useState<string>("Mod'Tanà Boutique");
  const [senderPhone, setSenderPhone] = useState<string>("0345566778");
  const [senderAddress, setSenderAddress] = useState<string>("Box 14, Pavillon Analakely");
  const [contactPerson, setContactPerson] = useState<string>("Madame Voahirana");

  const [rows, setRows] = useState<InboundRow[]>([
    {
      id: "row-1",
      recipientName: "",
      recipientPhone: "",
      deliveryAddress: "",
      axis: "AXE_CENTRE",
      isAxisFallback: true,
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
      if (data.length > 0) {
        applyVendorData(data[0]);
      }
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

  const handleSenderTypeChange = (type: SenderType) => {
    setSenderType(type);
    const matching = vendors.filter((v) => v.type_expediteur === type);
    if (matching.length > 0) {
      applyVendorData(matching[0]);
    } else {
      // Default templates when switching type
      if (type === "PARTICULIER") {
        setSenderName("Client Particulier");
        setSenderPhone("0321122334");
        setSenderAddress("Lot IVC 12 Ampefiloha");
        setContactPerson("");
      } else if (type === "ENTREPRISE") {
        setSenderName("Société Commerciale SARL");
        setSenderPhone("0331234567");
        setSenderAddress("Zone Industrielle Forello Tanjombato");
        setContactPerson("Direction Logistique");
      } else {
        setSenderName("Boutique Cybermarchand");
        setSenderPhone("0345566778");
        setSenderAddress("Pavillon Analakely");
        setContactPerson("Gérant Boutique");
      }
    }
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}`,
        recipientName: "",
        recipientPhone: "",
        deliveryAddress: "",
        axis: "AXE_CENTRE",
        isAxisFallback: true,
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

      // Auto-detect axis when address changes
      if (field === "deliveryAddress") {
        const detection = detectAxisClient(value);
        target.axis = detection.axis;
        target.isAxisFallback = detection.isFallback;
        if (detection.axis === "AXE_PROVINCE") {
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
  const totalMerchandise = rows.reduce((sum, r) => sum + (Number(r.merchandiseAmount) || 0), 0);
  const totalFees = rows.reduce((sum, r) => sum + (Number(r.deliveryFee) || 0), 0);
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
      setErrorMessage(`Numéro de téléphone expéditeur invalide (${senderPhone}). Requis : 10 chiffres malgaches (032/033/034/037/038).`);
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
        setErrorMessage(`Ligne #${i + 1} : Numéro de téléphone destinataire invalide (${r.recipientPhone || "vide"}). Requis : 10 chiffres malgaches valides (032, 033, 034, 037, 038).`);
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
        vendor_id: selectedVendorId,
        sender_type: senderType,
        sender_name: senderName,
        sender_phone: senderPhone || undefined,
        sender_address: senderAddress || undefined,
        recipient_name: r.recipientName,
        recipient_phone: r.recipientPhone,
        delivery_address: r.deliveryAddress,
        axis: r.axis,
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
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
              Enregistrement des expéditions pour Cybermarchands, Particuliers et Entreprises avec contrôle strict des coordonnées.
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

        {/* Sender Contact Information Bar */}
        <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
              Nom / Raison Sociale Expéditeur *
            </label>
            <input
              type="text"
              data-testid="sender-name-input"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Nom de l'expéditeur..."
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" /> Téléphone Expéditeur (10 ch.)
              </label>
              {senderPhone && <OperatorBadge operator={senderPhoneDetect.operator} isSmall />}
            </div>
            <input
              type="text"
              data-testid="sender-phone-input"
              value={senderPhone}
              onChange={(e) => setSenderPhone(e.target.value)}
              placeholder="034 00 000 00"
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

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
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 mb-1 block">
              Donneur d'Ordre Référencé :
            </label>
            <select
              data-testid="vendor-select"
              value={selectedVendorId}
              onChange={(e) => {
                const id = Number(e.target.value);
                const found = vendors.find((v) => v.id === id);
                if (found) applyVendorData(found);
              }}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {vendors
                .filter((v) => !v.type_expediteur || v.type_expediteur === senderType)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nom}
                  </option>
                ))}
            </select>
          </div>
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

      {/* Main Multi-Row Grid */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Grille de Saisie Multi-Lignes
          </span>
          <button
            type="button"
            onClick={addRow}
            data-testid="add-row-btn"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> Ajouter une Ligne
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-xs font-bold border-b border-slate-200">
                <th className="py-3 px-3 w-12 text-center">#</th>
                <th className="py-3 px-3 w-44">Destinataire *</th>
                <th className="py-3 px-3 w-48">Téléphone Dest. (10 ch.) *</th>
                <th className="py-3 px-3">Lieu / Adresse *</th>
                <th className="py-3 px-3 w-40">Axe Logistique</th>
                <th className="py-3 px-3 w-32">Flux</th>
                <th className="py-3 px-3 w-32">Marchandise (Ar)</th>
                <th className="py-3 px-3 w-28">Frais (Ar)</th>
                <th className="py-3 px-3 w-32">Total Dû</th>
                <th className="py-3 px-2 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {rows.map((row, idx) => {
                const phoneDetect = detectMalagasyPhone(row.recipientPhone);
                const rowTotal = (Number(row.merchandiseAmount) || 0) + (Number(row.deliveryFee) || 0);

                return (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Index */}
                    <td className="py-3 px-3 text-center text-xs font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Recipient Name */}
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        data-testid={`input-name-${idx}`}
                        value={row.recipientName}
                        onChange={(e) => updateRow(idx, "recipientName", e.target.value)}
                        placeholder="Nom du client"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </td>

                    {/* Recipient Phone & Operator Badge */}
                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-1">
                        <input
                          type="text"
                          data-testid={`input-phone-${idx}`}
                          value={row.recipientPhone}
                          onChange={(e) => updateRow(idx, "recipientPhone", e.target.value)}
                          placeholder="034 00 000 00"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        <OperatorBadge operator={phoneDetect.operator} isSmall />
                      </div>
                    </td>

                    {/* Delivery Address */}
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        data-testid={`input-address-${idx}`}
                        value={row.deliveryAddress}
                        onChange={(e) => updateRow(idx, "deliveryAddress", e.target.value)}
                        placeholder="Quartier, repère, ville..."
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </td>

                    {/* Axis Badge / Auto-detect */}
                    <td className="py-3 px-3">
                      <AxisBadge axis={row.axis} isFallback={row.isAxisFallback} />
                    </td>

                    {/* Flux Type */}
                    <td className="py-3 px-3">
                      <select
                        value={row.fluxType}
                        onChange={(e) => updateRow(idx, "fluxType", e.target.value as FluxType)}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="COD">COD (Marchandise)</option>
                        <option value="SIMPLE">Course Simple (Port Payé)</option>
                        <option value="RETOUR">Retour SAV</option>
                        <option value="PROVINCE">Fret Province (Gare)</option>
                      </select>
                    </td>

                    {/* Merchandise Amount */}
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        data-testid={`input-merch-${idx}`}
                        disabled={row.fluxType === "SIMPLE"}
                        value={row.merchandiseAmount === 0 ? "" : row.merchandiseAmount}
                        onChange={(e) => updateRow(idx, "merchandiseAmount", Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-right focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </td>

                    {/* Delivery Fee */}
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        data-testid={`input-fee-${idx}`}
                        value={row.deliveryFee === 0 ? "" : row.deliveryFee}
                        onChange={(e) => updateRow(idx, "deliveryFee", Number(e.target.value) || 0)}
                        placeholder="5000"
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-right focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </td>

                    {/* Row Total */}
                    <td className="py-3 px-3 font-bold text-slate-800 text-xs text-right whitespace-nowrap">
                      {formatAriary(rowTotal)}
                    </td>

                    {/* Delete Action */}
                    <td className="py-3 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        disabled={rows.length <= 1}
                        className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            Tous les colis validés recevront automatiquement un BDR unique et entreront au statut initial <strong className="text-amber-700">EN_DEPOT</strong>.
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
        <div data-testid="success-modal" className="bg-white p-6 rounded-2xl border-2 border-emerald-500 shadow-xl space-y-4">
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
              <div key={p.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-sm text-blue-700">BDR-{p.tracking_number}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                    {p.status}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-800 truncate">{p.recipient_name}</p>
                <p className="text-[11px] text-slate-500">{p.recipient_phone_formatted} • {p.operator}</p>
                <p className="text-[11px] text-slate-600 truncate">{p.delivery_address}</p>
                <div className="pt-1 flex items-center justify-between border-t border-slate-200 text-xs">
                  <span className="text-[11px] font-medium text-slate-500">{p.axis}</span>
                  <span className="font-black text-slate-800">{p.total_to_collect_formatted}</span>
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
                    deliveryAddress: "",
                    axis: "AXE_CENTRE",
                    isAxisFallback: true,
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
