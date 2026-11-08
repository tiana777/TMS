"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  PlusCircle,
  Building2,
  ShoppingBag,
  User,
  Phone,
  MapPin,
  Mail,
  FileText,
  Printer,
  TrendingUp,
  Wallet,
  CheckCircle2,
  Clock,
  ArrowRight,
  X,
  Edit2,
  RefreshCw,
} from "lucide-react";
import { Parcel, Vendor } from "@/types";
import { createVendor, fetchParcels, fetchVendors, updateVendor } from "@/lib/api";

export default function CRMVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);

  // Modals
  const [isNewVendorModalOpen, setIsNewVendorModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState<boolean>(false);

  // Form states
  const [formName, setFormName] = useState<string>("");
  const [formType, setFormType] = useState<string>("CYBERMARCHAND");
  const [formPhone, setFormPhone] = useState<string>("");
  const [formAddress, setFormAddress] = useState<string>("");
  const [formEmail, setFormEmail] = useState<string>("");
  const [formContact, setFormContact] = useState<string>("");
  const [formNifStat, setFormNifStat] = useState<string>("");
  const [formPaymentTerms, setFormPaymentTerms] = useState<string>("COMPTANT");
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [vs, ps] = await Promise.all([fetchVendors(), fetchParcels()]);
      setVendors(vs);
      setParcels(ps);
      if (vs.length > 0 && !selectedVendorId) {
        setSelectedVendorId(vs[0].id);
      }
    } catch (e) {
      console.error("Erreur chargement CRM", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateVendor(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) {
      alert("Le nom de l'expéditeur est obligatoire.");
      return;
    }
    setFormSubmitting(true);
    try {
      const newV = await createVendor({
        nom: formName.trim(),
        type_expediteur: formType,
        telephone: formPhone.trim() || undefined,
        adresse: formAddress.trim() || undefined,
        email: formEmail.trim() || undefined,
        contact_responsable: formContact.trim() || undefined,
        nif_stat: formNifStat.trim() || undefined,
        modalite_paiement: formPaymentTerms,
      });
      setIsNewVendorModalOpen(false);
      resetForm();
      await loadData();
      if (newV?.id) setSelectedVendorId(newV.id);
    } catch (err: any) {
      alert(err.message || "Erreur lors de la création de l'expéditeur.");
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleUpdateVendor(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVendorId) return;
    setFormSubmitting(true);
    try {
      await updateVendor(selectedVendorId, {
        nom: formName.trim(),
        type_expediteur: formType,
        telephone: formPhone.trim() || undefined,
        adresse: formAddress.trim() || undefined,
        email: formEmail.trim() || undefined,
        contact_responsable: formContact.trim() || undefined,
        nif_stat: formNifStat.trim() || undefined,
        modalite_paiement: formPaymentTerms,
      });
      setIsEditModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Erreur lors de la mise à jour.");
    } finally {
      setFormSubmitting(false);
    }
  }

  function resetForm() {
    setFormName("");
    setFormType("CYBERMARCHAND");
    setFormPhone("");
    setFormAddress("");
    setFormEmail("");
    setFormContact("");
    setFormNifStat("");
    setFormPaymentTerms("COMPTANT");
  }

  function openEditModal(v: Vendor) {
    setFormName(v.nom);
    setFormType(v.type_expediteur || "CYBERMARCHAND");
    setFormPhone(v.telephone || "");
    setFormAddress(v.adresse || "");
    setFormEmail(v.email || "");
    setFormContact(v.contact_responsable || "");
    setFormNifStat(v.nif_stat || "");
    setFormPaymentTerms(v.modalite_paiement || "COMPTANT");
    setIsEditModalOpen(true);
  }

  const filteredVendors = vendors.filter((v) => {
    if (selectedType !== "ALL" && v.type_expediteur !== selectedType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const n = (v.nom || "").toLowerCase();
      const t = (v.telephone || "").toLowerCase();
      const c = (v.contact_responsable || "").toLowerCase();
      return n.includes(q) || t.includes(q) || c.includes(q);
    }
    return true;
  });

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId) || vendors[0];

  // Vendor statistics
  const vendorParcels = parcels.filter((p) => p.vendor_id === selectedVendor?.id);
  const totalVolume = vendorParcels.length;
  const deliveredParcels = vendorParcels.filter((p) =>
    ["LIVRE", "ENCAISSE", "LIVRE_ENCAISSE", "CLOTURE_CAISSE"].includes(p.status)
  );
  const deliveredCount = deliveredParcels.length;
  const successRate = totalVolume > 0 ? ((deliveredCount / totalVolume) * 100).toFixed(1) : "0.0";

  // Financial reconciliation for vendor
  // For Cybermarchand: Net à reverser = Total COD perçu - Frais de livraison TMS
  const totalCodCollected = deliveredParcels.reduce((sum, p) => sum + (p.merchandise_amount || 0), 0);
  const totalDeliveryFees = deliveredParcels.reduce((sum, p) => sum + (p.delivery_fee || 0), 0);
  const netDueToVendor = totalCodCollected - (selectedVendor?.modalite_paiement === "COMPTANT" ? 0 : 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 font-bold border border-blue-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Écran 09 : CRM Donneurs d'Ordre & Répertoire Expéditeurs
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Gestion des cybermarchands, particuliers et entreprises partenaires, reversements et bordereaux financiers (CDC §9)
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
            onClick={() => {
              resetForm();
              setIsNewVendorModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-md shadow-blue-600/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nouveau Donneur d'Ordre</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Directory + Detail Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Directory list (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200 space-y-3 bg-slate-50/50">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher par nom, téléphone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white"
              />
            </div>

            {/* Type Filter Buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: "ALL", label: "Tous" },
                { id: "CYBERMARCHAND", label: "Boutiques" },
                { id: "ENTREPRISE", label: "Entreprises" },
                { id: "PARTICULIER", label: "Particuliers" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedType(t.id)}
                  className={`py-1 px-1.5 text-[10px] font-bold rounded-lg transition text-center truncate ${
                    selectedType === t.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Vendors list */}
          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[620px]">
            {filteredVendors.map((v) => {
              const isSelected = selectedVendor?.id === v.id;
              let icon = <ShoppingBag className="w-4 h-4 text-blue-600" />;
              let badgeBg = "bg-blue-50 text-blue-700 border-blue-200";

              if (v.type_expediteur === "ENTREPRISE") {
                icon = <Building2 className="w-4 h-4 text-indigo-600" />;
                badgeBg = "bg-indigo-50 text-indigo-700 border-indigo-200";
              } else if (v.type_expediteur === "PARTICULIER") {
                icon = <User className="w-4 h-4 text-emerald-600" />;
                badgeBg = "bg-emerald-50 text-emerald-700 border-emerald-200";
              }

              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVendorId(v.id)}
                  className={`p-4 cursor-pointer transition flex items-start justify-between gap-3 ${
                    isSelected ? "bg-blue-50/70 border-l-4 border-blue-600 font-semibold" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-slate-100 border border-slate-200 mt-0.5">
                      {icon}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{v.nom}</h4>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{v.telephone || "N/A"}</span>
                      </p>
                      {v.adresse && (
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 truncate max-w-[180px]">
                          <MapPin className="w-2.5 h-2.5" />
                          <span>{v.adresse}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${badgeBg}`}>
                    {v.type_expediteur || "BOUTIQUE"}
                  </span>
                </div>
              );
            })}
            {filteredVendors.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                Aucun donneur d'ordre trouvé.
              </div>
            )}
          </div>
        </div>

        {/* Right: Vendor Full Profile & Account Statement (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {selectedVendor ? (
            <>
              {/* Profile Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-black border border-blue-200 text-lg">
                      {selectedVendor.nom.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                        {selectedVendor.type_expediteur || "CYBERMARCHAND"}
                      </span>
                      <h2 className="text-xl font-black text-slate-900">{selectedVendor.nom}</h2>
                      <p className="text-xs text-slate-500 font-medium">
                        Modalité : <strong>{selectedVendor.modalite_paiement}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(selectedVendor)}
                      className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition border border-slate-200 text-xs font-semibold flex items-center gap-1"
                      title="Modifier les coordonnées"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Modifier</span>
                    </button>
                    <button
                      onClick={() => setIsStatementModalOpen(true)}
                      className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Relevé de Compte</span>
                    </button>
                  </div>
                </div>

                {/* Contact & Administrative Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>Téléphone : <strong>{selectedVendor.telephone || "Non renseigné"}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>Adresse : <strong>{selectedVendor.adresse || "Non renseignée"}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span>Email : <strong>{selectedVendor.email || "Non renseigné"}</strong></span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-700">
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Référent : <strong>{selectedVendor.contact_responsable || "Non renseigné"}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span>NIF / STAT : <strong>{selectedVendor.nif_stat || "N/A"}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Wallet className="w-4 h-4 text-slate-400" />
                      <span>Conditions : <strong>{selectedVendor.modalite_paiement}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Volume & Delivery Performance */}
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Volume Confié</span>
                    <p className="text-xl font-black text-slate-900 mt-1">{totalVolume} Colis</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Historique total</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Taux de Succès</span>
                    <p className="text-xl font-black text-emerald-600 mt-1">{successRate} %</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{deliveredCount} livrés & encaissés</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Fonds COD Marchand</span>
                    <p className="text-xl font-black text-blue-700 mt-1">
                      {totalCodCollected.toLocaleString("fr-FR")} Ar
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Valeur marchandise encaissée</p>
                  </div>
                </div>
              </div>

              {/* Recent Parcels by Vendor */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    Colis Récents Confiés par {selectedVendor.nom}
                  </h3>
                  <span className="text-xs text-slate-500 font-semibold">{vendorParcels.length} colis</span>
                </div>

                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">Bordereau</th>
                        <th className="px-4 py-2.5">Destinataire</th>
                        <th className="px-4 py-2.5">Axe</th>
                        <th className="px-4 py-2.5 text-right">Marchandise</th>
                        <th className="px-4 py-2.5 text-center">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {vendorParcels.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-mono font-bold text-slate-900">{p.tracking_number}</td>
                          <td className="px-4 py-2 font-semibold text-slate-800">{p.recipient_name}</td>
                          <td className="px-4 py-2 text-[11px] text-slate-600">{p.axis}</td>
                          <td className="px-4 py-2 text-right font-bold text-slate-900">
                            {p.merchandise_amount.toLocaleString("fr-FR")} Ar
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {vendorParcels.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                            Aucun colis enregistré pour cet expéditeur pour l'instant.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-400">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-sm">Sélectionnez un donneur d'ordre</p>
              <p className="text-xs text-slate-400 mt-1">La fiche récapitulative et les reversements apparaîtront ici.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1 : Nouveau Donneur d'Ordre */}
      {isNewVendorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-blue-50/50">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900">
                  Enregistrement d'un Nouveau Donneur d'Ordre
                </h3>
              </div>
              <button onClick={() => setIsNewVendorModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVendor} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nom / Raison Sociale : *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Mod'Tanà Boutique"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Catégorie :
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="CYBERMARCHAND">Cybermarchand / E-Commerce</option>
                    <option value="ENTREPRISE">Entreprise / B2B</option>
                    <option value="PARTICULIER">Particulier</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Modalité de Paiement :
                  </label>
                  <select
                    value={formPaymentTerms}
                    onChange={(e) => setFormPaymentTerms(e.target.value)}
                    className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="COMPTANT">Comptant à la livraison</option>
                    <option value="FACTURE_MENSUELLE">Facturation Fin de Mois</option>
                    <option value="PREPAYE">Compte Prépayé</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Téléphone Principal :
                  </label>
                  <input
                    type="text"
                    placeholder="034 XX XXX XX"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Contact / Référent :
                  </label>
                  <input
                    type="text"
                    placeholder="Nom du gérant"
                    value={formContact}
                    onChange={(e) => setFormContact(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Adresse / Box / Pavillon :
                </label>
                <input
                  type="text"
                  placeholder="ex: Box 14 Pavillon Analakely"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Email :
                  </label>
                  <input
                    type="email"
                    placeholder="contact@boutique.mg"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    NIF / STAT :
                  </label>
                  <input
                    type="text"
                    placeholder="Numéro fiscal"
                    value={formNifStat}
                    onChange={(e) => setFormNifStat(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewVendorModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-md shadow-blue-600/20"
                >
                  {formSubmitting ? "Enregistrement..." : "Créer le Donneur d'Ordre"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2 : Modification */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-slate-700" />
                <h3 className="text-base font-black text-slate-900">
                  Modifier les Coordonnées de l'Expéditeur
                </h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateVendor} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nom / Raison Sociale :
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Téléphone :
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Modalité de Paiement :
                  </label>
                  <select
                    value={formPaymentTerms}
                    onChange={(e) => setFormPaymentTerms(e.target.value)}
                    className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 outline-none bg-white"
                  >
                    <option value="COMPTANT">Comptant</option>
                    <option value="FACTURE_MENSUELLE">Facturation Mensuelle</option>
                    <option value="PREPAYE">Prépayé</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Adresse :
                </label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition shadow-sm"
                >
                  {formSubmitting ? "Mise à jour..." : "Enregistrer les Modifications"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3 : Bordereau de Reversement & Relevé Financier */}
      {isStatementModalOpen && selectedVendor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white text-slate-900">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Bordereau Officiel de Reversement Financier
                </h3>
              </div>
              <button onClick={() => setIsStatementModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Header Statement */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h4 className="text-sm font-black text-slate-900">TMS EXPRESS MADAGASCAR</h4>
                  <p className="text-[11px] text-slate-500">Hub Central : Tsiazotafo / Analakely, Antananarivo</p>
                  <p className="text-[11px] text-slate-500">Service Caisse Centrale & Rapprochements</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Destinataire Donneur d'Ordre</span>
                  <h4 className="text-sm font-black text-blue-900">{selectedVendor.nom}</h4>
                  <p className="text-[11px] text-slate-600">{selectedVendor.adresse || "Antananarivo"}</p>
                  <p className="text-[11px] text-slate-600">Tél : {selectedVendor.telephone}</p>
                </div>
              </div>

              {/* Table of delivered parcels with COD */}
              <div>
                <h5 className="font-bold text-slate-800 mb-2 uppercase tracking-wider text-[11px]">
                  Détail des Colis Encaissés à Reverser
                </h5>
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-3 py-2">Bordereau</th>
                      <th className="px-3 py-2">Destinataire</th>
                      <th className="px-3 py-2 text-right">Valeur Marchandise</th>
                      <th className="px-3 py-2 text-right">Frais Livraison TMS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deliveredParcels.map((p) => (
                      <tr key={p.id}>
                        <td className="px-3 py-1.5 font-mono font-bold text-slate-900">{p.tracking_number}</td>
                        <td className="px-3 py-1.5 text-slate-700">{p.recipient_name}</td>
                        <td className="px-3 py-1.5 text-right font-bold text-slate-900">
                          {p.merchandise_amount.toLocaleString("fr-FR")} Ar
                        </td>
                        <td className="px-3 py-1.5 text-right text-slate-600">
                          {p.delivery_fee.toLocaleString("fr-FR")} Ar
                        </td>
                      </tr>
                    ))}
                    {deliveredParcels.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-slate-400">
                          Aucun colis encaissé à reverser pour le moment.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Recap Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>Total Brut Valeur Marchandise Encaissée (COD) :</span>
                  <span>{totalCodCollected.toLocaleString("fr-FR")} Ar</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-500">
                  <span>Total Frais de Livraison TMS Déduits :</span>
                  <span>- {totalDeliveryFees.toLocaleString("fr-FR")} Ar</span>
                </div>
                <div className="flex justify-between font-black text-sm text-slate-900 pt-2 border-t border-slate-200">
                  <span className="text-blue-900">NET À REVERSER AU DONNEUR D'ORDRE :</span>
                  <span className="text-blue-900 text-base">{totalCodCollected.toLocaleString("fr-FR")} Ar</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 italic">Émis le {new Date().toLocaleDateString("fr-FR")}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsStatementModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer le Bordereau</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
