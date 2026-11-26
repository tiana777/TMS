"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Wallet,
  FileText,
  DollarSign,
  Calendar,
  User,
  Package,
  X,
  CreditCard,
  Check,
  Scale,
  RefreshCw,
} from "lucide-react";
import { Courier, Dispute } from "@/types";
import {
  cancelDebtForceMajeure,
  createDispute,
  fetchCouriers,
  fetchDisputes,
  repayDebt,
} from "@/lib/api";

const INCIDENT_TYPES = [
  { code: "DEFICIT_COD", label: "Déficit d'Encaissement COD (Clôture Soir)", icon: "💸" },
  { code: "CASSE_MARCHANDISE", label: "Marchandise Détériorée / Casse en Tournée", icon: "📦" },
  { code: "PERTE_COLIS", label: "Perte Physique ou Vol en Tournée", icon: "🔍" },
  { code: "FAUX_BILLET", label: "Encaissement de Faux Billets", icon: "🚫" },
  { code: "CREDIT_NON_AUTORISE", label: "Livraison à Crédit Sans Accord", icon: "⚠️" },
  { code: "LITIGE_GARE", label: "Litige Gare / Absence de Récépissé Fret", icon: "🚌" },
];

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [isNewDisputeModalOpen, setIsNewDisputeModalOpen] = useState<boolean>(false);
  const [selectedDisputeForRepayment, setSelectedDisputeForRepayment] = useState<Dispute | null>(null);
  const [selectedDisputeForForceMajeure, setSelectedDisputeForForceMajeure] = useState<Dispute | null>(null);

  // New dispute form
  const [formLivreurId, setFormLivreurId] = useState<number>(1);
  const [formIncidentType, setFormIncidentType] = useState<string>("DEFICIT_COD");
  const [formAmount, setFormAmount] = useState<string>("");
  const [formReason, setFormReason] = useState<string>("");
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [formColisId, setFormColisId] = useState<string>("");
  const [formTourId, setFormTourId] = useState<string>("");
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  // Repayment form
  const [repayAmount, setRepayAmount] = useState<string>("");
  const [repayMode, setRepayMode] = useState<string>("COMPTANT"); // COMPTANT, RETENUE_SALAIRE, CAUTION
  const [courierNetSalary, setCourierNetSalary] = useState<number>(500000); // 500 000 Ar net standard for preview
  const [repaySubmitting, setRepaySubmitting] = useState<boolean>(false);

  // Force Majeure form
  const [policeReport, setPoliceReport] = useState<string>("");
  const [forceMajeureSubmitting, setForceMajeureSubmitting] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [ds, cs] = await Promise.all([fetchDisputes(), fetchCouriers()]);
      setDisputes(ds);
      setCouriers(cs);
      if (cs.length > 0 && !formLivreurId) {
        setFormLivreurId(cs[0].id);
      }
    } catch (err) {
      console.error("Erreur chargement litiges", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateDispute(e: React.FormEvent) {
    e.preventDefault();
    if (!formAmount || Number(formAmount) <= 0) {
      alert("Le montant de la créance doit être supérieur à 0 Ar.");
      return;
    }
    if (!formReason.trim()) {
      alert("Veuillez saisir le motif circonstancié du litige.");
      return;
    }

    // Règle Métier 7 : Les dépenses d'exploitation (carburant, frais) ne doivent pas être comptabilisées en litiges
    // (liste alignée sur OPERATING_EXPENSE_KEYWORDS côté backend : domain/models/dispute.py)
    const expenseKeywords = [
      "carburant",
      "essence",
      "gazole",
      "gasoil",
      "frais de route",
      "frais annexes",
      "péage",
      "peage",
      "stationnement",
    ];
    const reasonLower = formReason.toLowerCase();
    if (expenseKeywords.some((kw) => reasonLower.includes(kw))) {
      alert(
        "Règle Métier 7 : Les dépenses de carburant et frais de tournée sont des charges d'exploitation de la société. Elles relèvent de la décharge de tournée en caisse et ne doivent pas être enregistrées comme des litiges livreurs."
      );
      return;
    }

    setFormSubmitting(true);
    try {
      await createDispute({
        livreur_id: formLivreurId,
        incident_type: formIncidentType,
        initial_amount: Number(formAmount),
        reason: formReason.trim(),
        incident_date: formDate,
        colis_id: formColisId ? Number(formColisId) : undefined,
        tournee_id: formTourId ? Number(formTourId) : undefined,
      });
      setIsNewDisputeModalOpen(false);
      setFormAmount("");
      setFormReason("");
      setFormColisId("");
      setFormTourId("");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Erreur lors de la création du dossier.");
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleRepaySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDisputeForRepayment) return;
    const amt = Number(repayAmount);
    if (!amt || amt <= 0) {
      alert("Montant de remboursement invalide.");
      return;
    }
    if (amt > selectedDisputeForRepayment.remaining_balance) {
      alert("Le montant dépasse le solde restant dû.");
      return;
    }

    setRepaySubmitting(true);
    try {
      await repayDebt(selectedDisputeForRepayment.id, amt, repayMode);
      setSelectedDisputeForRepayment(null);
      setRepayAmount("");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'enregistrement de l'apurement.");
    } finally {
      setRepaySubmitting(false);
    }
  }

  async function handleForceMajeureSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDisputeForForceMajeure) return;
    if (!policeReport.trim()) {
      alert("Le numéro de procès-verbal de police/gendarmerie est obligatoire pour l'exonération.");
      return;
    }

    setForceMajeureSubmitting(true);
    try {
      await cancelDebtForceMajeure(selectedDisputeForForceMajeure.id, policeReport.trim());
      setSelectedDisputeForForceMajeure(null);
      setPoliceReport("");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'annulation pour force majeure.");
    } finally {
      setForceMajeureSubmitting(false);
    }
  }

  // Filtered disputes
  const filteredDisputes = disputes.filter((d) => {
    if (statusFilter !== "ALL" && d.status !== statusFilter) return false;
    if (typeFilter !== "ALL" && d.incident_type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const ref = d.reference_litige.toLowerCase();
      const reason = d.reason.toLowerCase();
      const courierName = (d.livreur_name || "").toLowerCase();
      return ref.includes(q) || reason.includes(q) || courierName.includes(q);
    }
    return true;
  });

  const totalOutstanding = disputes
    .filter((d) => d.status === "OUVERTE" || d.status === "EN_COURS")
    .reduce((sum, d) => sum + d.remaining_balance, 0);

  const totalRecovered = disputes.reduce((sum, d) => sum + d.refunded_amount, 0);
  const openCount = disputes.filter((d) => d.status === "OUVERTE" || d.status === "EN_COURS").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 font-bold border border-rose-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Écran 12 : Registre des Litiges, Dettes Livreurs & Recouvrement
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Gestion formelle des contentieux, responsabilités pécuniaires et plans d'apurement (CDC §11)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition border border-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Actualiser</span>
          </button>
          <button
            onClick={() => setIsNewDisputeModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition shadow-md shadow-rose-600/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Ouvrir un Dossier de Litige</span>
          </button>
        </div>
      </div>

      {/* Règle Métier 7: Séparation stricte Litiges vs Dépenses d'exploitation */}
      <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-blue-900 shadow-2xs">
        <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-blue-900 flex items-center gap-1.5">
            <span>Règle de Gestion Stricte (CDC Section 11 & Priorité Métier 7) :</span>
            <span className="bg-blue-200/80 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-black uppercase">
              Séparation Litiges / Dépenses
            </span>
          </h4>
          <p className="mt-1 text-blue-800 leading-relaxed text-[11px]">
            Les dépenses d&apos;exploitation justifiées (<strong>carburant, entretien moto, péages, fret gare</strong>) relèvent de la décharge de tournée en caisse. <strong>Elles ne constituent en aucun cas des litiges ou des dettes imputables au livreur</strong> et n&apos;impactent pas son scorecard.
            Le registre des litiges est strictement réservé aux créances nées de manquements ou avaries (déficits nets COD, marchandise brisée, perte en route, faux billets, livraisons à crédit non autorisées).
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Créances en Cours</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600 mt-2">
            {totalOutstanding.toLocaleString("fr-FR")} Ar
          </p>
          <p className="text-[11px] text-slate-500 mt-1">{openCount} dossier(s) non apuré(s)</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Recouvré</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">
            {totalRecovered.toLocaleString("fr-FR")} Ar
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Versements comptant & retenues</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Garantie Cybermarchand</span>
            <ShieldAlert className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-sm font-black text-blue-900 mt-2">Indemnisation sous 48h</p>
          <p className="text-[11px] text-slate-500 mt-1">Avancée par TMS Express (CDC §11.3)</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plafond Légal Retenue</span>
            <Scale className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-sm font-black text-indigo-900 mt-2">30% Max Salaire Net</p>
          <p className="text-[11px] text-slate-500 mt-1">Code du Travail malgache (Option B)</p>
        </div>
      </div>

      {/* Main Table + Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Table Filters */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher par référence LIT, livreur ou motif..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 outline-none font-semibold text-slate-700 bg-white"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="OUVERTE">OUVERTE</option>
              <option value="EN_COURS">EN_COURS</option>
              <option value="SOLDEE">SOLDEE</option>
              <option value="ANNULEE_FORCE_MAJEURE">FORCE MAJEURE</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 outline-none font-semibold text-slate-700 bg-white max-w-xs"
            >
              <option value="ALL">Toutes catégories d'incident</option>
              {INCIDENT_TYPES.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.icon} {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Disputes Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Réf. Litige</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Coursier Responsable</th>
                <th className="px-4 py-3">Catégorie d'Incident</th>
                <th className="px-4 py-3">Motif Circonstancié</th>
                <th className="px-4 py-3 text-right">Dette Initiale</th>
                <th className="px-4 py-3 text-right">Solde Restant</th>
                <th className="px-4 py-3 text-center">Statut</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDisputes.map((d) => {
                const categoryObj = INCIDENT_TYPES.find((t) => t.code === d.incident_type);

                let statusBadge = "bg-slate-100 text-slate-700 border-slate-200";
                if (d.status === "OUVERTE") {
                  statusBadge = "bg-rose-100 text-rose-800 border-rose-300 font-bold";
                } else if (d.status === "EN_COURS") {
                  statusBadge = "bg-amber-100 text-amber-800 border-amber-300 font-bold";
                } else if (d.status === "SOLDEE") {
                  statusBadge = "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold";
                } else if (d.status === "ANNULEE_FORCE_MAJEURE") {
                  statusBadge = "bg-indigo-100 text-indigo-800 border-indigo-300 font-bold";
                }

                const canRepay = d.status === "OUVERTE" || d.status === "EN_COURS";

                return (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {d.reference_litige}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{d.incident_date}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {d.livreur_name || `Livreur #${d.livreur_id}`}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold">
                        <span>{categoryObj?.icon || "⚠️"}</span>
                        <span>{categoryObj?.label || d.incident_type}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={d.reason}>
                      {d.reason}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">
                      {d.initial_amount.toLocaleString("fr-FR")} Ar
                    </td>
                    <td className="px-4 py-3 text-right font-black text-rose-600 whitespace-nowrap">
                      {d.remaining_balance.toLocaleString("fr-FR")} Ar
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] border ${statusBadge}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {canRepay ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedDisputeForRepayment(d);
                              setRepayAmount(d.remaining_balance.toString());
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition shadow-sm"
                          >
                            Rembourser
                          </button>
                          <button
                            onClick={() => setSelectedDisputeForForceMajeure(d)}
                            title="Exonérer sous Force Majeure (PV Police)"
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-semibold border border-slate-200 transition"
                          >
                            Force Majeure
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Dossier clos</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredDisputes.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    Aucun dossier de litige correspondant aux critères de filtre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Open New Dispute */}
      {isNewDisputeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-rose-50/50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-black text-slate-900">
                  Ouverture d'un Dossier de Litige & Dette
                </h3>
              </div>
              <button
                onClick={() => setIsNewDisputeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDispute} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Coursier Responsable :
                </label>
                <select
                  value={formLivreurId}
                  onChange={(e) => setFormLivreurId(Number(e.target.value))}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-rose-500 bg-white"
                >
                  {couriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.vehicle_type}) - Caution : {c.security_deposit_formatted}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Catégorie de Litige (CDC §11) :
                </label>
                <select
                  value={formIncidentType}
                  onChange={(e) => setFormIncidentType(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-rose-500 bg-white"
                >
                  {INCIDENT_TYPES.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.icon} {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Montant de la Dette (Ar) :
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    required
                    placeholder="ex: 35000"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Date de l'Incident :
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    N° Colis lié (Optionnel) :
                  </label>
                  <input
                    type="number"
                    placeholder="ID interne colis"
                    value={formColisId}
                    onChange={(e) => setFormColisId(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    N° Tournée liée (Optionnel) :
                  </label>
                  <input
                    type="number"
                    placeholder="ID tournée"
                    value={formTourId}
                    onChange={(e) => setFormTourId(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Motif Circonstancié & Preuves :
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Décrivez les circonstances exactes de l'incident, PV d'avarie contradictoire..."
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl p-3 outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewDisputeModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition shadow-md shadow-rose-600/20"
                >
                  {formSubmitting ? "Enregistrement..." : "Créer le Dossier de Litige"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Repay Debt */}
      {selectedDisputeForRepayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900">
                  Règlement / Apurement de la Dette
                </h3>
              </div>
              <button
                onClick={() => setSelectedDisputeForRepayment(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRepaySubmit} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Dossier :</span>
                  <span className="font-mono font-bold text-slate-900">
                    {selectedDisputeForRepayment.reference_litige}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Livreur :</span>
                  <span className="font-bold text-slate-900">
                    {selectedDisputeForRepayment.livreur_name || `Livreur #${selectedDisputeForRepayment.livreur_id}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Solde Restant Dû :</span>
                  <span className="font-black text-rose-600">
                    {selectedDisputeForRepayment.remaining_balance.toLocaleString("fr-FR")} Ar
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Modalité de Recouvrement (CDC §11.2) :
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRepayMode("COMPTANT")}
                    className={`py-2 px-2 text-[11px] font-bold rounded-xl border transition text-center ${
                      repayMode === "COMPTANT"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    💵 Option A : Comptant
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRepayMode("RETENUE_SALAIRE");
                      const maxLegal = Math.round(0.3 * courierNetSalary);
                      const deduction = Math.min(selectedDisputeForRepayment.remaining_balance, maxLegal);
                      setRepayAmount(deduction.toString());
                    }}
                    className={`py-2 px-2 text-[11px] font-bold rounded-xl border transition text-center ${
                      repayMode === "RETENUE_SALAIRE"
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    📑 Option B : Retenue Paie
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepayMode("CAUTION")}
                    className={`py-2 px-2 text-[11px] font-bold rounded-xl border transition text-center ${
                      repayMode === "CAUTION"
                        ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    🛡️ Option C : Caution
                  </button>
                </div>
              </div>

              {repayMode === "RETENUE_SALAIRE" && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900">
                    <Scale className="w-3.5 h-3.5" />
                    <span>Plafond Légal Malgache : 30% Max du Salaire Net</span>
                  </div>
                  <p className="text-[11px] text-blue-700">
                    Sur un salaire net mensuel standard de 500 000 Ar, la retenue mensuelle maximale autorisée est de{" "}
                    <strong>150 000 Ar</strong>.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Montant à Apurer (Ar) :
                </label>
                <input
                  type="number"
                  min="100"
                  max={selectedDisputeForRepayment.remaining_balance}
                  step="100"
                  required
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  className="w-full text-sm font-black border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedDisputeForRepayment(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={repaySubmitting}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition shadow-md shadow-emerald-600/20"
                >
                  {repaySubmitting ? "Validation..." : "Valider le Remboursement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Force Majeure Exoneration */}
      {selectedDisputeForForceMajeure && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-indigo-50/50">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">
                  Exonération pour Force Majeure
                </h3>
              </div>
              <button
                onClick={() => setSelectedDisputeForForceMajeure(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleForceMajeureSubmit} className="p-6 space-y-4">
              <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200 text-xs text-indigo-900 space-y-1">
                <p className="font-bold">Procédure Formelle (CDC §11.1 - Cas 3.3) :</p>
                <p className="text-[11px] leading-relaxed">
                  L'annulation intégrale de la dette pour vol à main armée ou agression physique requiert la production
                  d'un procès-verbal officiel de dépôt de plainte auprès de la Police ou de la Gendarmerie sous 24h.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  N° de Procès-Verbal de Police / Gendarmerie :
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: PV-COMMISSARIAT-CENTRAL-2026/0892"
                  value={policeReport}
                  onChange={(e) => setPoliceReport(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedDisputeForForceMajeure(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={forceMajeureSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition shadow-md shadow-indigo-600/20"
                >
                  {forceMajeureSubmitting ? "Annulation..." : "Annuler la Dette (Force Majeure)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
