"use client";

import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  UploadCloud,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
  Sparkles,
  Camera,
  Image as ImageIcon,
  Key,
  Download,
  FileDown,
  Building2,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { detectMalagasyPhone } from "../../lib/phone";
import { detectAxisClient } from "../../lib/axis";
import {
  fetchVendors,
  createParcelBatch,
  recognizeManifestAI,
  AIRecognizedParcel,
} from "../../lib/api";
import { OperatorBadge } from "../../components/OperatorBadge";
import { AxisBadge } from "../../components/AxisBadge";
import { FluxType, LogisticAxis, Vendor } from "../../types";

interface ParsedParcelRow {
  index: number;
  trackingNumber?: string;
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
  observation?: string;
  hasErrors: boolean;
  errorDetail?: string;
}

export default function ImportPage() {
  const [activeMode, setActiveMode] = useState<"csv" | "ai_vision">("csv");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<number>(0);
  const [customSenderName, setCustomSenderName] = useState<string>("");
  const [parsedRows, setParsedRows] = useState<ParsedParcelRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<any[] | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  // AI Vision states
  const [aiImageBase64, setAiImageBase64] = useState<string | null>(null);
  const [aiImagePreview, setAiImagePreview] = useState<string | null>(null);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiApiKey, setAiApiKey] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [aiStatusMessage, setAiStatusMessage] = useState<{
    type: "success" | "error" | "info";
    engine?: string;
    model?: string;
    text: string;
  } | null>(null);

  useEffect(() => {
    fetchVendors().then((data) => {
      setVendors(data);
      if (data.length > 0) setSelectedVendorId(data[0].id);
    });
  }, []);

  // Convert extracted AI parcels into ParsedParcelRow
  const processExtractedItems = (items: AIRecognizedParcel[]) => {
    const rows: ParsedParcelRow[] = items.map((item, idx) => {
      const rawPhone = item.recipient_phone || "";
      const phoneDetect = detectMalagasyPhone(rawPhone);
      const axisDetect = detectAxisClient(item.delivery_address || "Antananarivo");
      const fee =
        item.delivery_fee && item.delivery_fee > 0
          ? item.delivery_fee
          : axisDetect.fee;
      const fluxType: FluxType =
        axisDetect.axis === "AXE_PROVINCE" ? "PROVINCE" : "COD";

      let hasErrors = false;
      let errorDetail: string | undefined;

      if (!phoneDetect.isValid) {
        hasErrors = true;
        errorDetail = phoneDetect.errorMessage || "Numéro malgache invalide";
      }

      return {
        index: idx + 1,
        trackingNumber: item.tracking_number,
        recipientName: item.recipient_name || "Client",
        recipientPhone: rawPhone,
        phoneNormalized: phoneDetect.cleaned,
        operator: phoneDetect.operator,
        isValidPhone: phoneDetect.isValid,
        deliveryAddress: item.delivery_address || "Antananarivo",
        axis: axisDetect.axis,
        fluxType,
        merchandiseAmount: item.merchandise_amount || 0,
        deliveryFee: fee,
        totalToCollect: (item.merchandise_amount || 0) + fee,
        observation: item.observation || "Reconnaissance IA Manifeste",
        hasErrors,
        errorDetail,
      };
    });

    setParsedRows(rows);
  };

  // Traitement Image IA
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAiImageBase64(base64);
      setAiImagePreview(base64);
      setAiStatusMessage(null);
    };
    reader.readAsDataURL(file);
  };

  // Nettoyage intelligent de la clé API saisie par l'utilisateur
  const cleanApiKey = (raw: string) => {
    let key = (raw || "").trim();
    if (key.includes("GEMINI_API_KEY=")) {
      key = key.split("GEMINI_API_KEY=").pop()?.trim() || "";
    }
    return key.replace(/^["'`]|["'`]$/g, "").trim();
  };

  const handleRunAIRecognition = async () => {
    if (!aiImageBase64) {
      alert("Veuillez d'abord sélectionner une photo ou un scan de bordereau.");
      return;
    }

    setIsAnalyzingAI(true);
    setAiStatusMessage(null);
    try {
      const sanitizedKey = cleanApiKey(aiApiKey);
      const res = await recognizeManifestAI({
        imageBase64: aiImageBase64,
        customApiKey: sanitizedKey || undefined,
      });

      if (res.parcels && res.parcels.length > 0) {
        processExtractedItems(res.parcels);
        setAiStatusMessage({
          type: "success",
          engine: res.engine,
          model: res.model,
          text: res.message || `${res.count} colis extraits avec succès !`,
        });
      } else {
        setAiStatusMessage({
          type: "info",
          text: "Aucun colis n'a pu être extrait du document fourni.",
        });
      }
    } catch (e: any) {
      setAiStatusMessage({
        type: "error",
        text: e.message || "Erreur lors de la reconnaissance IA.",
      });
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  // Parsing 2D Array from Excel (xlsx/xls) or CSV
  const parseRowsFrom2DArray = (data: any[][]) => {
    if (!data || data.length === 0) return;

    // Filter out rows where all cells are empty
    const cleaned = data.filter(
      (r) => r && r.some((c) => c !== undefined && c !== null && String(c).trim() !== "")
    );
    if (cleaned.length === 0) return;

    // Detect header row keywords
    const firstRow = cleaned[0].map((c) => String(c || "").trim().toLowerCase());
    let hasHeader = false;
    let colName = 0;
    let colPhone = 1;
    let colAddress = 2;
    let colMerch = 3;
    let colFee = 4;
    let colObs = -1;

    const keywords = [
      "nom", "destinataire", "client", "contact", "tel", "telephone",
      "phone", "lieu", "adresse", "prix", "montant", "marchandise",
      "frais", "tarif", "observation", "remarque", "note"
    ];

    if (firstRow.some((cell) => keywords.some((k) => cell.includes(k)))) {
      hasHeader = true;
      firstRow.forEach((cell, idx) => {
        if (cell.includes("tel") || cell.includes("contact") || cell.includes("phone")) colPhone = idx;
        else if (cell.includes("lieu") || cell.includes("adresse") || cell.includes("quartier") || cell.includes("repere") || cell.includes("destination")) colAddress = idx;
        else if (cell.includes("prix") || cell.includes("marchandise") || cell.includes("montant") || cell.includes("article") || cell.includes("valeur")) colMerch = idx;
        else if (cell.includes("frais") || cell.includes("tarif") || cell.includes("port") || cell.includes("livraison")) colFee = idx;
        else if (cell.includes("remarque") || cell.includes("obs") || cell.includes("note") || cell.includes("instruction")) colObs = idx;
        else if (cell.includes("nom") || cell.includes("destinataire") || cell.includes("client")) colName = idx;
      });
    }

    const parseNumber = (val: any) => {
      if (typeof val === "number") return val;
      if (!val) return 0;
      return parseInt(String(val).replace(/[^\d]/g, ""), 10) || 0;
    };

    const startIndex = hasHeader ? 1 : 0;
    const parsed: ParsedParcelRow[] = [];

    for (let i = startIndex; i < cleaned.length; i++) {
      const row = cleaned[i];
      if (row.length < 2) continue;

      const recipientName = String(row[colName] || "Client").trim();
      const rawPhone = String(row[colPhone] || "").trim();
      const address = String(row[colAddress] || "Antananarivo").trim();

      const rawMerch = parseNumber(row[colMerch]);
      const phoneDetect = detectMalagasyPhone(rawPhone);
      const axisDetect = detectAxisClient(address);
      const parsedFee = colFee >= 0 ? parseNumber(row[colFee]) : 0;
      const rawFee = parsedFee > 0 ? parsedFee : axisDetect.fee;
      const fluxType: FluxType = axisDetect.axis === "AXE_PROVINCE" ? "PROVINCE" : "COD";

      let hasErrors = false;
      let errorDetail: string | undefined;

      if (!phoneDetect.isValid) {
        hasErrors = true;
        errorDetail = phoneDetect.errorMessage || "Numéro malgache invalide";
      }

      parsed.push({
        index: parsed.length + 1,
        recipientName: recipientName || "Client",
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
        observation: colObs >= 0 && row[colObs] ? String(row[colObs]).trim() : undefined,
        hasErrors,
        errorDetail,
      });
    }

    setParsedRows(parsed);
  };

  // Traitement universel de fichier Excel (.xlsx, .xls) et texte (.csv, .tsv, .txt)
  const processUploadedFile = (file: File) => {
    setFileName(file.name);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        // XLSX.read handles both binary xlsx/xls and csv text seamlessly!
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const data = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        parseRowsFrom2DArray(data);
      } catch (err: any) {
        alert(`Erreur de lecture du fichier : ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  // Génération et téléchargement d'un modèle Excel .xlsx prêt à l'emploi
  const downloadExcelTemplate = () => {
    const templateData = [
      {
        "Destinataire": "Rasoa Nirina",
        "Telephone": "034 12 345 67",
        "Adresse": "Itaosy Cité Seimad",
        "Marchandise": 45000,
        "Frais": 5000,
        "Observation": "Appeler avant de livrer - Matin",
      },
      {
        "Destinataire": "Rakoto Jean",
        "Telephone": "032 11 223 34",
        "Adresse": "Besarety près pharmacie",
        "Marchandise": 65000,
        "Frais": 4000,
        "Observation": "Boutique cosmétique au RDC",
      },
      {
        "Destinataire": "Randria Paul",
        "Telephone": "033 44 556 67",
        "Adresse": "Gare Routière Ambodivona vers Tamatave",
        "Marchandise": 120000,
        "Frais": 10000,
        "Observation": "Expédition province Cotisse",
      },
      {
        "Destinataire": "Mme Voahangy",
        "Telephone": "038 99 887 76",
        "Adresse": "Antanimena carrefour Batpro",
        "Marchandise": 30000,
        "Frais": 4000,
        "Observation": "Colis fragile",
      },
      {
        "Destinataire": "Société Alpha Tech",
        "Telephone": "034 77 889 90",
        "Adresse": "Ankorondrano Immeuble FIT",
        "Marchandise": 85000,
        "Frais": 5000,
        "Observation": "Paiement chèque ou espèces",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    ws["!cols"] = [
      { wch: 22 },
      { wch: 18 },
      { wch: 40 },
      { wch: 14 },
      { wch: 10 },
      { wch: 32 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modèle Colis TMS");
    XLSX.writeFile(wb, "modele_import_colis_tms_express.xlsx");
  };

  const validRows = parsedRows.filter((r) => !r.hasErrors);
  const errorRows = parsedRows.filter((r) => r.hasErrors);

  const handleConfirmImport = async () => {
    if (validRows.length === 0) return;

    setIsImporting(true);
    try {
      const activeVendor = vendors.find((v) => v.id === selectedVendorId);
      const senderName =
        (selectedVendorId > 0 && activeVendor ? activeVendor.nom : null) ||
        customSenderName.trim() ||
        "Cybermarchand Import Excel";

      const payload = validRows.map((r) => ({
        vendor_id: selectedVendorId > 0 ? selectedVendorId : undefined,
        sender_name: senderName,
        recipient_name: r.recipientName,
        recipient_phone: r.phoneNormalized,
        delivery_address: r.deliveryAddress,
        axis: r.axis,
        flux_type: r.fluxType,
        merchandise_amount: r.merchandiseAmount,
        delivery_fee: r.deliveryFee,
        observation: r.observation || "Import Excel / CSV",
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
            Écran 02 • Ingestion & Reconnaissance
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-1">
            Importation & Reconnaissance de Colis
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Support natif des fichiers Excel (.xlsx, .xls), CSV, ou photos/scans par IA multimodale, avec normalisation téléphonique et routage automatique par axe.
          </p>
        </div>

        {/* Sender / Cybermarchand Selector & Creator */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 whitespace-nowrap">
            <Building2 className="w-4 h-4 text-emerald-600" />
            Expéditeur :
          </div>
          {vendors.length > 0 ? (
            <select
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(Number(e.target.value))}
              className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nom}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              placeholder="Nom du Donneur d'ordre (ex: Boutique Chic, Cyber Vente...)"
              value={customSenderName}
              onChange={(e) => setCustomSenderName(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none min-w-[240px]"
            />
          )}
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex bg-slate-200/60 p-1.5 rounded-2xl max-w-lg border border-slate-300">
        <button
          onClick={() => setActiveMode("csv")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeMode === "csv"
              ? "bg-white text-emerald-800 shadow-sm border border-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
          data-cy="tab-mode-csv"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          Fichier Excel (.xlsx, .xls) / CSV
        </button>
        <button
          onClick={() => setActiveMode("ai_vision")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeMode === "ai_vision"
              ? "bg-white text-emerald-800 shadow-sm border border-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
          data-cy="tab-mode-ai"
        >
          <Sparkles className="w-4 h-4 text-emerald-600" />
          Mode IA (Scan / Photo)
        </button>
      </div>

      {/* MODE CSV / EXCEL CLASSIQUE */}
      {activeMode === "csv" && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`bg-white p-8 rounded-2xl border-2 border-dashed transition-all text-center space-y-4 ${
            isDragging
              ? "border-emerald-500 bg-emerald-50/30 scale-[1.01]"
              : "border-slate-300 hover:border-emerald-500"
          }`}
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Glissez et déposez votre fichier Excel ou CSV ici
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Formats compatibles : <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.csv</strong>, <strong>.txt</strong> (colonnes : Destinataire, Téléphone, Adresse, Marchandise, Frais).
            </p>
            {fileName && (
              <p className="text-xs font-bold text-emerald-700 mt-2 bg-emerald-50 inline-block px-3 py-1 rounded-full border border-emerald-200">
                📄 Fichier chargé : {fileName}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <label className="cursor-pointer px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Parcourir un Fichier Excel / CSV
              <input
                type="file"
                data-testid="file-upload-input"
                accept=".xlsx,.xls,.csv,.txt,.tsv"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={downloadExcelTemplate}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-emerald-600" />
              Télécharger Modèle Excel (.xlsx)
            </button>
          </div>
        </div>
      )}

      {/* MODE B : RECONNAISSANCE IA VISION */}
      {activeMode === "ai_vision" && (
        <div className="space-y-4">
          <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-50/20 text-center space-y-4 transition-all">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <Camera className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-base font-bold text-slate-800">
                Déposez une Photo ou un Scan Numérisé de votre Liste
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Formats acceptés : JPG, PNG, WEBP, PDF. L'IA Gemini Vision analyse les colonnes, extrait les noms, téléphones malgaches (032/033/034/038), adresses et montants COD.
              </p>
            </div>

            {/* Preview image if uploaded */}
            {aiImagePreview && (
              <div className="max-w-sm mx-auto p-2 bg-white rounded-xl border border-slate-300 shadow-xs relative">
                <img
                  src={aiImagePreview}
                  alt="Aperçu du bordereau scanné"
                  className="w-full max-h-48 object-contain rounded-lg"
                />
                <button
                  onClick={() => {
                    setAiImageBase64(null);
                    setAiImagePreview(null);
                  }}
                  className="absolute top-3 right-3 p-1 bg-black/60 hover:bg-black text-white rounded-full text-xs"
                  title="Supprimer l'image"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <label className="cursor-pointer px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Sélectionner une Photo / Scan
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleImageUpload}
                  className="hidden"
                  data-cy="input-ai-manifest-file"
                />
              </label>

              {aiImageBase64 && (
                <button
                  type="button"
                  onClick={handleRunAIRecognition}
                  disabled={isAnalyzingAI}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  data-cy="btn-analyze-ai"
                >
                  {isAnalyzingAI ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                      Analyse IA en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      Lancer l'Extraction IA
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Optional API Key toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Key className="w-3 h-3 text-emerald-600" />
                {showApiKeyInput ? "Masquer la configuration de clé API" : "Configurer une clé API Gemini (Optionnel)"}
              </button>
              {showApiKeyInput && (
                <div className="max-w-lg mx-auto mt-2 p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs text-left">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Clé API Google Gemini (Vision Multimodale)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="AIzaSy... (laisser vide pour la clé serveur .env)"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(cleanApiKey(e.target.value))}
                      className="flex-1 px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {aiApiKey && (
                      <button
                        type="button"
                        onClick={() => setAiApiKey("")}
                        className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 cursor-pointer"
                        title="Effacer la clé"
                      >
                        Effacer
                      </button>
                    )}
                  </div>
                  {aiApiKey && aiApiKey.startsWith("sk-") ? (
                    <div className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mt-2 space-y-1">
                      <p className="font-bold flex items-center gap-1">
                        ⚠️ Clé DeepSeek détectée (commence par &quot;sk-&quot;)
                      </p>
                      <p className="text-[10.5px] leading-relaxed text-slate-600">
                        Cette interface utilise l&apos;IA de reconnaissance optique multimodale <strong>Google Gemini Vision</strong> (pour lire des photos/scans). Les clés Google sont 100% gratuites et commencent par <code className="font-bold text-emerald-700">AIzaSy...</code>
                      </p>
                    </div>
                  ) : aiApiKey && !aiApiKey.startsWith("AIzaSy") ? (
                    <p className="text-[11px] text-amber-600 font-medium mt-1">
                      ⚠️ Note : Une clé Google AI Studio standard commence par <code className="font-bold">AIzaSy</code>.
                    </p>
                  ) : null}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                    <span>Besoin d'une clé gratuite ?</span>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 hover:text-emerald-700 font-bold inline-flex items-center gap-1 hover:underline"
                    >
                      Obtenir une clé sur Google AI Studio <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Result notification banner */}
          {aiStatusMessage && (
            <div
              className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start gap-3 text-left transition-all ${
                aiStatusMessage.type === "success"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                  : aiStatusMessage.type === "error"
                  ? "bg-rose-50 border-rose-300 text-rose-900"
                  : "bg-blue-50 border-blue-300 text-blue-900"
              }`}
            >
              {aiStatusMessage.type === "error" ? (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              ) : (
                <Sparkles className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
              )}
              <div className="flex-1 space-y-2">
                <div>
                  <p className="font-bold text-xs">{aiStatusMessage.text}</p>
                  {aiStatusMessage.engine && (
                    <p className="text-[11px] opacity-80 mt-0.5">
                      Moteur : <span className="font-mono font-bold">{aiStatusMessage.engine}</span> ({aiStatusMessage.model})
                    </p>
                  )}
                </div>

                {/* Si l'erreur est liée à la clé API Gemini, afficher une aide guidée immédiate */}
                {aiStatusMessage.type === "error" &&
                  (aiStatusMessage.text.includes("Clé API") ||
                    aiStatusMessage.text.includes("API key") ||
                    aiStatusMessage.text.includes("400") ||
                    aiStatusMessage.text.includes("INVALID_ARGUMENT")) && (
                    <div className="bg-white/90 p-3 rounded-lg border border-rose-200 text-xs text-slate-700 space-y-2 mt-2">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-emerald-600" />
                        Comment résoudre cette erreur de clé API ?
                      </div>
                      <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600">
                        <li>
                          Générez une clé gratuite en 30 secondes sur{" "}
                          <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 font-bold underline inline-flex items-center gap-0.5"
                          >
                            Google AI Studio <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </li>
                        <li>
                          Vérifiez que la clé commence par <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-slate-800">AIzaSy...</code>
                        </li>
                        <li>
                          Copiez uniquement la clé (sans guillemets ni préfixe <code className="text-slate-500">GEMINI_API_KEY=</code>)
                        </li>
                      </ol>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview Table */}
      {parsedRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-lg">
                  Prévisualisation des Données Ingestées ({parsedRows.length} lignes)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {activeMode === "ai_vision" ? "✨ Extrait par IA" : "📊 Données Excel / CSV"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                <span className="text-emerald-600 font-bold">{validRows.length} valides</span> •{" "}
                <span className="text-rose-600 font-bold">{errorRows.length} anomalies détectées</span>
              </p>
            </div>

            <button
              onClick={handleConfirmImport}
              data-testid="confirm-import-btn"
              disabled={isImporting || validRows.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
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
                  <th className="py-2.5 px-3">Réf / BDR</th>
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
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-600">
                      {row.trackingNumber || `BDR-auto`}
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
