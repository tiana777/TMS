"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Compass,
  Bus,
  MapPin,
  PlusCircle,
  Search,
  CheckCircle2,
  Building,
  RefreshCw,
  Phone,
  Tag,
  X,
  Layers,
} from "lucide-react";
import { AxisInfo, Partner } from "@/types";
import { addZoneToAxis, createPartner, fetchAxes, fetchPartners } from "@/lib/api";

export default function ReferentielPage() {
  const [axes, setAxes] = useState<AxisInfo[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"AXES" | "PARTNERS">("AXES");

  // Modals
  const [isAddZoneModalOpen, setIsAddZoneModalOpen] = useState<boolean>(false);
  const [selectedAxisForZone, setSelectedAxisForZone] = useState<AxisInfo | null>(null);
  const [newZoneName, setNewZoneName] = useState<string>("");

  const [isAddPartnerModalOpen, setIsAddPartnerModalOpen] = useState<boolean>(false);
  const [partnerName, setPartnerName] = useState<string>("");
  const [partnerType, setPartnerType] = useState<string>("COOPERATIVE");
  const [partnerContact, setPartnerContact] = useState<string>("");
  const [partnerStation, setPartnerStation] = useState<string>("Gare Routière Ambodivona");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [axList, partList] = await Promise.all([fetchAxes(), fetchPartners()]);
      setAxes(axList);
      setPartners(partList);
    } catch (e) {
      console.error("Erreur chargement référentiel", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddZoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAxisForZone || !newZoneName.trim()) return;

    setSubmitting(true);
    try {
      await addZoneToAxis(selectedAxisForZone.id, newZoneName.trim());
      setIsAddZoneModalOpen(false);
      setNewZoneName("");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'ajout de la zone.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddPartnerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!partnerName.trim()) {
      alert("Le nom de la coopérative ou gare est obligatoire.");
      return;
    }

    setSubmitting(true);
    try {
      await createPartner({
        nom: partnerName.trim(),
        type: partnerType,
        contact: partnerContact.trim() || undefined,
        gare_rattachement: partnerStation.trim() || undefined,
      });
      setIsAddPartnerModalOpen(false);
      setPartnerName("");
      setPartnerContact("");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'enregistrement du partenaire.");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredAxes = axes.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.libelle.toLowerCase().includes(q) ||
      a.code.toLowerCase().includes(q) ||
      a.zones.some((z) => z.toLowerCase().includes(q))
    );
  });

  const filteredPartners = partners.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.nom.toLowerCase().includes(q) ||
      (p.gare_rattachement || "").toLowerCase().includes(q) ||
      p.type.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 font-bold border border-slate-200">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Écran 10 : Administration du Référentiel Logistique
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Paramétrage des corridors urbains, des quartiers/zones, des gares routières et coopératives nationales (CDC §5 & §6)
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
          {activeTab === "PARTNERS" && (
            <button
              onClick={() => setIsAddPartnerModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-md shadow-blue-600/20"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Ajouter une Coopérative / Gare</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("AXES")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition border-b-2 ${
            activeTab === "AXES"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Axes & Quartiers Urbains ({axes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("PARTNERS")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition border-b-2 ${
            activeTab === "PARTNERS"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Bus className="w-4 h-4" />
          <span>Gares Routières & Coopératives ({partners.length})</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={activeTab === "AXES" ? "Filtrer axes ou quartiers..." : "Filtrer gares ou coopératives..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-white shadow-sm"
          />
        </div>
      </div>

      {/* TAB 1: Axes & Zones */}
      {activeTab === "AXES" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAxes.map((axe) => (
            <div
              key={axe.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between hover:border-slate-300 transition"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 text-[10px] font-mono font-bold bg-slate-100 text-slate-800 rounded-lg border border-slate-200">
                    {axe.code}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    {axe.zones.length} quartier(s)
                  </span>
                </div>

                <h3 className="text-sm font-black text-slate-900 mt-2.5">{axe.libelle}</h3>

                <div className="mt-3 flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {axe.zones.map((zone, zIdx) => (
                    <span
                      key={zIdx}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 rounded-md border border-blue-200"
                    >
                      {zone}
                    </span>
                  ))}
                  {axe.zones.length === 0 && (
                    <span className="text-xs text-slate-400 italic">Aucun quartier configuré</span>
                  )}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end">
                <button
                  onClick={() => {
                    setSelectedAxisForZone(axe);
                    setIsAddZoneModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Ajouter un Quartier</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: Partners (Coopératives & Gares) */}
      {activeTab === "PARTNERS" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Nom Partenaire</th>
                <th className="px-4 py-3.5">Type</th>
                <th className="px-4 py-3.5">Gare de Rattachement</th>
                <th className="px-4 py-3.5">Contact Guichet</th>
                <th className="px-4 py-3.5 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPartners.map((p) => {
                let badgeType = "bg-blue-50 text-blue-700 border-blue-200";
                if (p.type === "GARE") {
                  badgeType = "bg-purple-50 text-purple-700 border-purple-200 font-black";
                } else if (p.type === "CONFRERE") {
                  badgeType = "bg-amber-50 text-amber-700 border-amber-200";
                }

                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-3 font-bold text-slate-900 flex items-center gap-2">
                      <Bus className="w-4 h-4 text-slate-400" />
                      <span>{p.nom}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeType}`}>
                        {p.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      {p.gare_rattachement || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.contact || "Standard"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Actif</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredPartners.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Aucun partenaire trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL : Ajouter Quartier à un Axe */}
      {isAddZoneModalOpen && selectedAxisForZone && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-blue-50/50">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900">
                  Ajouter un Quartier à l'Axe
                </h3>
              </div>
              <button onClick={() => setIsAddZoneModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddZoneSubmit} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-400 uppercase font-bold text-[10px]">Axe sélectionné :</span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedAxisForZone.libelle}</p>
                <p className="text-[11px] font-mono text-slate-500">{selectedAxisForZone.code}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nom du Quartier / Localité :
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Analamahitsy, Ilafy, Sabotsy Namehana..."
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddZoneModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-md shadow-blue-600/20"
                >
                  {submitting ? "Ajout..." : "Rattacher ce Quartier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : Ajouter Coopérative / Gare */}
      {isAddPartnerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-blue-50/50">
              <div className="flex items-center gap-2">
                <Bus className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900">
                  Nouvelle Coopérative ou Gare Partenaire
                </h3>
              </div>
              <button onClick={() => setIsAddPartnerModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPartnerSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nom du Partenaire : *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Cotisse Transport, Trans Tsiry..."
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Type :
                </label>
                <select
                  value={partnerType}
                  onChange={(e) => setPartnerType(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 outline-none bg-white"
                >
                  <option value="COOPERATIVE">Coopérative Régionale</option>
                  <option value="GARE">Gare Routière Nationale</option>
                  <option value="CONFRERE">Confrère Dernier Kilomètre</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Gare de Rattachement :
                </label>
                <select
                  value={partnerStation}
                  onChange={(e) => setPartnerStation(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 outline-none bg-white"
                >
                  <option value="Gare Routière Ambodivona">Gare Routière Ambodivona (RN2 Toamasina, RN4 Majunga)</option>
                  <option value="Gare Fasan'ny Karana">Gare Fasan'ny Karana (RN7 Sud, Fianarantsoa/Tuléar)</option>
                  <option value="Gare Routière Andohatapenaka">Gare Routière Andohatapenaka (RN1 & Ouest)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Contact Guichet / Tél :
                </label>
                <input
                  type="text"
                  placeholder="ex: 034 11 222 33 / Guichet 12"
                  value={partnerContact}
                  onChange={(e) => setPartnerContact(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddPartnerModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-md shadow-blue-600/20"
                >
                  {submitting ? "Création..." : "Enregistrer le Partenaire"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
