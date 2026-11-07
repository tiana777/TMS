"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Printer, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { detectMalagasyPhone } from "../../lib/phone";
import { detectAxisClient } from "../../lib/axis";
import { fetchVendors, createParcelBatch } from "../../lib/api";
import { OperatorBadge } from "../../components/OperatorBadge";
import { AxisBadge } from "../../components/AxisBadge";
import { FluxType, LogisticAxis, Vendor } from "../../types";

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
  const [selectedVendorId, setSelectedVendorId] = useState<number>(1);
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
      if (data.length > 0) setSelectedVendorId(data[0].id);
    });
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate rows
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.recipientName.trim()) {
        setErrorMessage(`Ligne #${i + 1} : Le nom du destinataire est obligatoire.`);
        return;
      }
      const phoneCheck = detectMalagasyPhone(r.recipientPhone);
      if (!phoneCheck.isValid) {
        setErrorMessage(`Ligne #${i + 1} : Numéro de téléphone invalide (${r.recipientPhone || "vide"}). Requis : 10 chiffres malgaches valides (032, 033, 034, 037, 038).`);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
            Écran 01 • Agent d'Accueil Inbound
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-1">
            Réception Quai & Formulaire Multi-Colis
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Saisie rapide par lot avec détection temps réel opérateur (Telma/Orange/Airtel) et calcul inviolable des montants.
          </p>
        </div>

        {/* Vendor Selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
            Cybermarchand :
          </label>
          <select
            data-testid="vendor-select"
            value={selectedVendorId}
            onChange={(e) => setSelectedVendorId(Number(e.target.value))}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nom}
              </option>
            ))}
          </select>
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
                <th className="py-3 px-3 w-48">Téléphone (10 ch.) *</th>
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
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 text-center text-xs font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Recipient Name */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        data-testid={`input-name-${idx}`}
                        value={row.recipientName}
                        onChange={(e) => updateRow(idx, "recipientName", e.target.value)}
                        placeholder="Ex: Rasoa Nirina"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                        required
                      />
                    </td>

                    {/* Phone with real-time operator badge */}
                    <td className="py-2 px-3">
                      <div className="space-y-1">
                        <input
                          type="text"
                          data-testid={`input-phone-${idx}`}
                          value={row.recipientPhone}
                          onChange={(e) => updateRow(idx, "recipientPhone", e.target.value)}
                          placeholder="034 12 345 67"
                          className={`w-full px-2.5 py-1.5 bg-white border rounded-lg text-xs focus:ring-2 focus:outline-none font-mono ${
                            phoneDetect.isValid
                              ? "border-emerald-500 ring-emerald-500"
                              : row.recipientPhone.length > 0
                              ? "border-amber-400"
                              : "border-slate-300 focus:ring-blue-500"
                          }`}
                          required
                        />
                        <div className="flex items-center justify-between text-[10px]">
                          <OperatorBadge operator={phoneDetect.operator} />
                          {phoneDetect.errorMessage && (
                            <span className="text-amber-600 font-medium">
                              {phoneDetect.errorMessage}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Address with auto-detection */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        data-testid={`input-address-${idx}`}
                        value={row.deliveryAddress}
                        onChange={(e) => updateRow(idx, "deliveryAddress", e.target.value)}
                        placeholder="Ex: Itaosy Cité Seimad ou Tamatave"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                      />
                    </td>

                    {/* Detected Axis Badge */}
                    <td className="py-2 px-3">
                      <AxisBadge axis={row.axis} isFallback={row.isAxisFallback} />
                    </td>

                    {/* Flux Type */}
                    <td className="py-2 px-3">
                      <select
                        value={row.fluxType}
                        onChange={(e) => updateRow(idx, "fluxType", e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none"
                      >
                        <option value="COD">COD</option>
                        <option value="SIMPLE">Course Simple</option>
                        <option value="RETOUR">Retour / SAV</option>
                        <option value="PROVINCE">Province</option>
                      </select>
                    </td>

                    {/* Merchandise Amount */}
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        data-testid={`input-merch-${idx}`}
                        min="0"
                        step="100"
                        value={row.merchandiseAmount === 0 ? "" : row.merchandiseAmount}
                        placeholder="0"
                        disabled={row.fluxType === "SIMPLE"}
                        onChange={(e) => updateRow(idx, "merchandiseAmount", e.target.value === "" ? 0 : Number(e.target.value))}
                        className={`w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-right focus:outline-none ${
                          row.fluxType === "SIMPLE" ? "bg-slate-100 text-slate-400" : ""
                        }`}
                      />
                    </td>

                    {/* Delivery Fee */}
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        data-testid={`input-fee-${idx}`}
                        min="0"
                        step="100"
                        value={row.deliveryFee === 0 ? "" : row.deliveryFee}
                        placeholder="0"
                        onChange={(e) => updateRow(idx, "deliveryFee", e.target.value === "" ? 0 : Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-right focus:outline-none"
                      />
                    </td>

                    {/* Total Dû */}
                    <td className="py-2 px-3 font-mono font-black text-right text-xs text-blue-700">
                      {formatAriary(rowTotal)}
                    </td>

                    {/* Delete action */}
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        disabled={rows.length <= 1}
                        className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 transition-colors"
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

        {/* Submit Action footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            * Les numéros de bordereaux (BDR) séquentiels inviolables seront générés lors de la validation.
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
                  Les bordereaux BDR ont été immatriculés au statut initial <strong className="text-amber-700">EN_DEPOT</strong>.
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
