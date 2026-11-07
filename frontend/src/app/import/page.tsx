"use client";

import React, { useState, useEffect } from "react";
import { UploadCloud, CheckCircle, AlertTriangle, FileSpreadsheet, RefreshCw, ArrowRight } from "lucide-react";
import { detectMalagasyPhone } from "../../lib/phone";
import { detectAxisClient } from "../../lib/axis";
import { fetchVendors, createParcelBatch } from "../../lib/api";
import { OperatorBadge } from "../../components/OperatorBadge";
import { AxisBadge } from "../../components/AxisBadge";
import { FluxType, LogisticAxis, Vendor } from "../../types";

interface ParsedParcelRow {
  index: number;
  recipientName: string;
  recipientPhone: string;
  phoneNormalized: string;
  operator: string | null;
  isValidPhone: boolean;
  deliveryAddress: string;
  axis: LogisticAxis;
  fluxType: FluxType;
  merchandiseAmount: number;
  deliveryFee: number;
  totalToCollect: number;
  hasErrors: boolean;
  errorDetail?: string;
}

export default function ImportPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<number>(1);
  const [parsedRows, setParsedRows] = useState<ParsedParcelRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<any[] | null>(null);
  const [rawText, setRawText] = useState("");

  useEffect(() => {
    fetchVendors().then((data) => {
      setVendors(data);
      if (data.length > 0) setSelectedVendorId(data[0].id);
    });
  }, []);

  // Parse CSV / Tabular pasted or loaded text
  const parseCSV = (content: string) => {
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    // Check if header present
    let startIndex = 0;
    const firstLineLower = lines[0].toLowerCase();
    if (
      firstLineLower.includes("nom") ||
      firstLineLower.includes("destinataire") ||
      firstLineLower.includes("telephone") ||
      firstLineLower.includes("tel")
    ) {
      startIndex = 1;
    }

    const rows: ParsedParcelRow[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      // Split by semicolon, comma, or tab
      const parts = lines[i].split(/[;,\t]/).map((p) => p.trim());
      if (parts.length < 3) continue;

      const recipientName = parts[0] || "Client Inconnu";
      const rawPhone = parts[1] || "";
      const address = parts[2] || "Antananarivo";
      const rawMerch = parts[3] ? parseInt(parts[3].replace(/[^\d]/g, ""), 10) || 0 : 0;
      const rawFee = parts[4] ? parseInt(parts[4].replace(/[^\d]/g, ""), 10) || 5000 : 5000;

      const phoneDetect = detectMalagasyPhone(rawPhone);
      const axisDetect = detectAxisClient(address);
      const fluxType: FluxType = axisDetect.axis === "AXE_PROVINCE" ? "PROVINCE" : "COD";

      let hasErrors = false;
      let errorDetail: string | undefined;

      if (!phoneDetect.isValid) {
        hasErrors = true;
        errorDetail = phoneDetect.errorMessage || "Numéro malgache invalide";
      }

      rows.push({
        index: i + 1,
        recipientName,
        recipientPhone: rawPhone,
        phoneNormalized: phoneDetect.cleaned,
        operator: phoneDetect.operator,
        isValidPhone: phoneDetect.isValid,
        deliveryAddress: address,
        axis: axisDetect.axis,
        fluxType,
        merchandiseAmount: rawMerch,
        deliveryFee: rawFee,
        totalToCollect: rawMerch + rawFee,
        hasErrors,
        errorDetail,
      });
    }

    setParsedRows(rows);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawText(text);
      parseCSV(text);
    };
    reader.readAsText(file, "UTF-8");
  };

  const loadSampleCSV = () => {
    const sample = `Destinataire;Telephone;Adresse;Marchandise;Frais
Rasoa Nirina;+261 34 12 345 67;Itaosy Cité Seimad;45000;5000
Rakoto Jean;032 11 223 34;Besarety pharmacie;65000;5000
Randria Paul;033 44 556 67;Gare Ambodivona vers Tamatave;120000;10000
Madame Voahangy;038 99 887 76;Antanimena carrefour;30000;4000
Client Invalide;039 00 112 23;Analakely centre;25000;5000`;
    setRawText(sample);
    parseCSV(sample);
  };

  const validRows = parsedRows.filter((r) => !r.hasErrors);
  const errorRows = parsedRows.filter((r) => r.hasErrors);

  const handleConfirmImport = async () => {
    if (validRows.length === 0) return;

    setIsImporting(true);
    try {
      const payload = validRows.map((r) => ({
        vendor_id: selectedVendorId,
        recipient_name: r.recipientName,
        recipient_phone: r.phoneNormalized,
        delivery_address: r.deliveryAddress,
        axis: r.axis,
        flux_type: r.fluxType,
        merchandise_amount: r.merchandiseAmount,
        delivery_fee: r.deliveryFee,
        observation: "Import fichier automatique",
      }));

      const results = await createParcelBatch(payload);
      setImportSuccess(results);
    } catch (e: any) {
      alert(`Erreur d'import : ${e.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
            Écran 02 • Importation Massive
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-1">
            Import de Fichiers Cybermarchands (Excel & CSV)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ingestion et normalisation automatique des numéros malgaches, détection d'axe et prévisualisation avant validation.
          </p>
        </div>

        {/* Vendor Selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
            Cybermarchand :
          </label>
          <select
            value={selectedVendorId}
            onChange={(e) => setSelectedVendorId(Number(e.target.value))}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nom}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 transition-all text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
          <UploadCloud className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800">
            Téléversez votre fichier de commandes (.csv, .txt, .xlsx)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Glissez votre fichier ici ou cliquez pour le sélectionner sur votre poste.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 pt-2">
          <label className="cursor-pointer px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-all">
            Parcourir un Fichier
            <input
              type="file"
              data-testid="file-upload-input"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            type="button"
            data-testid="load-sample-btn"
            onClick={loadSampleCSV}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-all"
          >
            Charger un Fichier Démo (5 Colis)
          </button>
        </div>
      </div>

      {/* Preview Table */}
      {parsedRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">
                Prévisualisation des Données Ingestées ({parsedRows.length} lignes)
              </h3>
              <p className="text-xs text-slate-500">
                <span className="text-emerald-600 font-bold">{validRows.length} valides</span> •{" "}
                <span className="text-rose-600 font-bold">{errorRows.length} anomalies détectées</span>
              </p>
            </div>

            <button
              onClick={handleConfirmImport}
              data-testid="confirm-import-btn"
              disabled={isImporting || validRows.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Importation en cours...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" /> Valider l'Importation ({validRows.length} Colis)
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Statut</th>
                  <th className="py-2.5 px-3">Destinataire</th>
                  <th className="py-2.5 px-3">Téléphone Brut</th>
                  <th className="py-2.5 px-3">Normalisé</th>
                  <th className="py-2.5 px-3">Opérateur</th>
                  <th className="py-2.5 px-3">Adresse</th>
                  <th className="py-2.5 px-3">Axe Détecté</th>
                  <th className="py-2.5 px-3 text-right">Marchandise</th>
                  <th className="py-2.5 px-3 text-right">Frais</th>
                  <th className="py-2.5 px-3 text-right">Total Dû</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {parsedRows.map((row) => (
                  <tr
                    key={row.index}
                    className={row.hasErrors ? "bg-rose-50/70" : "hover:bg-slate-50"}
                  >
                    <td className="py-2.5 px-3 font-bold text-slate-400">{row.index}</td>
                    <td className="py-2.5 px-3">
                      {row.hasErrors ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
                          <AlertTriangle className="w-3 h-3" /> {row.errorDetail}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                          <CheckCircle className="w-3 h-3" /> Valide
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{row.recipientName}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{row.recipientPhone}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                      {row.phoneNormalized || "---"}
                    </td>
                    <td className="py-2.5 px-3">
                      <OperatorBadge operator={row.operator as any} />
                    </td>
                    <td className="py-2.5 px-3">{row.deliveryAddress}</td>
                    <td className="py-2.5 px-3">
                      <AxisBadge axis={row.axis} />
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {row.merchandiseAmount.toLocaleString("fr-FR")} Ar
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {row.deliveryFee.toLocaleString("fr-FR")} Ar
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700">
                      {row.totalToCollect.toLocaleString("fr-FR")} Ar
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {importSuccess && (
        <div data-testid="import-success-alert" className="p-6 bg-emerald-50 border-2 border-emerald-500 rounded-2xl shadow-lg space-y-2">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
            <h3 className="font-bold text-emerald-900 text-lg">
              Importation réussie : {importSuccess.length} colis créés avec succès !
            </h3>
          </div>
          <p className="text-xs text-emerald-800">
            Tous les colis ont été intégrés en base au statut <strong className="text-amber-800">EN_DEPOT</strong> avec leurs numéros de BDR séquentiels.
          </p>
        </div>
      )}
    </div>
  );
}
