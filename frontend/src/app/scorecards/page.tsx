"use client";

import React, { useState, useEffect } from "react";
import {
  Award,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Clock,
  ShieldCheck,
  Wallet,
  Users,
  Search,
  RefreshCw,
  Printer,
  ChevronRight,
  Info,
  SlidersHorizontal,
} from "lucide-react";
import { Courier, Scorecard } from "@/types";
import { fetchCouriers, fetchFleetLeaderboard, fetchScorecard } from "@/lib/api";

export default function ScorecardsPage() {
  const [period, setPeriod] = useState<string>("2026-11");
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [leaderboard, setLeaderboard] = useState<Scorecard[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState<number | null>(null);
  const [selectedScorecard, setSelectedScorecard] = useState<Scorecard | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterTier, setFilterTier] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    loadData();
  }, [period]);

  async function loadData() {
    setLoading(true);
    try {
      const [courierList, board] = await Promise.all([
        fetchCouriers(),
        fetchFleetLeaderboard(period),
      ]);
      setCouriers(courierList);
      setLeaderboard(board);

      if (board.length > 0 && !selectedCourierId) {
        setSelectedCourierId(board[0].livreur_id);
        setSelectedScorecard(board[0]);
      } else if (selectedCourierId) {
        const found = board.find((b: Scorecard) => b.livreur_id === selectedCourierId);
        if (found) setSelectedScorecard(found);
      }
    } catch (err) {
      console.error("Erreur chargement données scorecard", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectCourier(courierId: number) {
    setSelectedCourierId(courierId);
    const existing = leaderboard.find((b) => b.livreur_id === courierId);
    if (existing) {
      setSelectedScorecard(existing);
    } else {
      try {
        const sc = await fetchScorecard(courierId, period);
        setSelectedScorecard(sc);
      } catch (e) {
        console.error(e);
      }
    }
  }

  const filteredLeaderboard = leaderboard.filter((item) => {
    if (filterTier !== "ALL" && item.tier !== filterTier) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (item.courier_name || "").toLowerCase();
      return name.includes(q) || item.livreur_id.toString().includes(q);
    }
    return true;
  });

  const totalAssignedFleet = leaderboard.reduce((sum, s) => sum + s.total_assigned, 0);
  const totalDeliveredFleet = leaderboard.reduce((sum, s) => sum + s.total_delivered, 0);
  const totalBonusFleet = leaderboard.reduce((sum, s) => sum + s.bonus_amount, 0);
  const fleetSuccessAvg = leaderboard.length
    ? (leaderboard.reduce((sum, s) => sum + s.success_rate, 0) / leaderboard.length).toFixed(1)
    : "0";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 font-bold border border-amber-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Écran 11 : Suivi de Performance & Scorecard Livreurs
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Notation mensuelle objective, classement de flotte & attribution automatique des primes de productivité (CDC §10)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-600">Période :</span>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            />
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 text-white hover:bg-slate-900 rounded-xl transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Fleet Macro KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Flotte Active</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{leaderboard.length} Coursiers</p>
          <p className="text-[11px] text-slate-500 mt-1">Évalués sur le mois de {period}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Succès Flotte Moyen</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">{fleetSuccessAvg} %</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {totalDeliveredFleet} livrés / {totalAssignedFleet} assignés
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cagnotte Primes</span>
            <Wallet className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">
            {totalBonusFleet.toLocaleString("fr-FR")} Ar
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Primes Or & Argent débloquées</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Règle de Notation</span>
            <Info className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-xs font-bold text-slate-800 mt-2">Pondération 100 Pts</p>
          <p className="text-[11px] text-slate-500 mt-1">
            50% Succès • 20% Ponct. • 15% Qual. • 15% Caisse
          </p>
        </div>
      </div>

      {/* Main Content: Leaderboard + Individual Scorecard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Leaderboard Table (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>🏆</span> Classement Mensuel de la Flotte (Leaderboard)
              </h2>
              <p className="text-xs text-slate-500">Cliquez sur un livreur pour afficher sa fiche individuelle</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 w-36"
                />
              </div>

              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1 outline-none font-semibold text-slate-700 bg-white"
              >
                <option value="ALL">Tous Paliers</option>
                <option value="OR">Palier OR (≥95)</option>
                <option value="ARGENT">Palier ARGENT (85-94)</option>
                <option value="BRONZE">Palier BRONZE (75-84)</option>
                <option value="ALERTE">Sous-Performance (&lt;75)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 text-center w-12">Rang</th>
                  <th className="px-4 py-3">Coursier</th>
                  <th className="px-3 py-3 text-center">Succès</th>
                  <th className="px-3 py-3 text-center">Ponct.</th>
                  <th className="px-3 py-3 text-center">Score</th>
                  <th className="px-3 py-3 text-center">Palier</th>
                  <th className="px-4 py-3 text-right">Prime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeaderboard.map((item, idx) => {
                  const isSelected = selectedCourierId === item.livreur_id;
                  let badgeColor = "bg-slate-100 text-slate-700 border-slate-200";
                  let medal = null;

                  if (item.tier === "OR") {
                    badgeColor = "bg-amber-100 text-amber-800 border-amber-300 font-black";
                    medal = "🥇";
                  } else if (item.tier === "ARGENT") {
                    badgeColor = "bg-blue-100 text-blue-800 border-blue-300 font-bold";
                    medal = "🥈";
                  } else if (item.tier === "BRONZE") {
                    badgeColor = "bg-orange-100 text-orange-800 border-orange-200";
                    medal = "🥉";
                  } else if (item.tier === "ALERTE") {
                    badgeColor = "bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse";
                    medal = "⚠️";
                  }

                  return (
                    <tr
                      key={item.livreur_id}
                      onClick={() => handleSelectCourier(item.livreur_id)}
                      className={`cursor-pointer transition hover:bg-blue-50/50 ${
                        isSelected ? "bg-blue-50/80 font-semibold" : ""
                      }`}
                    >
                      <td className="px-3 py-3 text-center font-bold text-slate-500">
                        {medal || `#${idx + 1}`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{item.courier_name || `Livreur #${item.livreur_id}`}</div>
                        <div className="text-[11px] text-slate-400">
                          {item.total_delivered} / {item.total_assigned} livrés
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`font-semibold ${item.success_rate >= 90 ? "text-emerald-600" : "text-amber-600"}`}>
                          {item.success_rate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-slate-700">
                        {item.punctuality_rate.toFixed(1)}%
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="font-black text-slate-900 text-sm">
                          {item.global_score.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-slate-400">/100</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] border ${badgeColor}`}>
                          {item.tier}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-emerald-700">
                        {item.bonus_amount > 0 ? `${item.bonus_amount.toLocaleString("fr-FR")} Ar` : "—"}
                      </td>
                    </tr>
                  );
                })}
                {filteredLeaderboard.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Aucun livreur trouvé pour ce filtre sur la période {period}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Individual Scorecard Detail (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          {selectedScorecard ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Fiche Individuelle de Notation
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-0.5">
                    {selectedScorecard.courier_name || `Livreur #${selectedScorecard.livreur_id}`}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Mois évalué : {period}</p>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-3 py-1 rounded-xl text-xs font-black border ${
                      selectedScorecard.tier === "OR"
                        ? "bg-amber-100 text-amber-900 border-amber-300"
                        : selectedScorecard.tier === "ARGENT"
                        ? "bg-blue-100 text-blue-900 border-blue-300"
                        : selectedScorecard.tier === "BRONZE"
                        ? "bg-orange-100 text-orange-900 border-orange-200"
                        : "bg-rose-100 text-rose-900 border-rose-300"
                    }`}
                  >
                    PALIER {selectedScorecard.tier}
                  </span>
                  <div className="text-xs font-bold text-slate-600 mt-1">
                    Score : {selectedScorecard.global_score.toFixed(1)} / 100
                  </div>
                </div>
              </div>

              {/* 4 Core Pillars Breakdown */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                  Détail des 4 Métriques Métier
                </p>

                {/* KPI 1 : Succès */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      1. Taux de Succès Livraison (50%)
                    </span>
                    <span className="font-bold text-slate-900">{selectedScorecard.success_rate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, selectedScorecard.success_rate)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Cible : ≥ 90%</span>
                    <span>{selectedScorecard.total_delivered} livrés / {selectedScorecard.total_assigned} assignés</span>
                  </div>
                </div>

                {/* KPI 2 : Ponctualité */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      2. Respect des Créneaux Horaires (20%)
                    </span>
                    <span className="font-bold text-slate-900">{selectedScorecard.punctuality_rate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, selectedScorecard.punctuality_rate)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Cible : ≥ 85%</span>
                    <span>Créneaux matin (8h-12h) & après-midi (13h-17h)</span>
                  </div>
                </div>

                {/* KPI 3 : Zéro Litige / Qualité */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                      3. Taux de Zéro Litige & Intégrité (15%)
                    </span>
                    <span className="font-bold text-slate-900">{selectedScorecard.quality_rate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, selectedScorecard.quality_rate)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Cible : ≥ 99.5%</span>
                    <span>Sans casse physique ni marchandise détériorée</span>
                  </div>
                </div>

                {/* KPI 4 : Rigueur Décharge Caisse */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-amber-600" />
                      4. Rigueur Reddition Caisse (15%)
                    </span>
                    <span className="font-bold text-slate-900">{selectedScorecard.cash_rigor_rate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-amber-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, selectedScorecard.cash_rigor_rate)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Cible : 100%</span>
                    <span>Décharge avant 18h30 à écart zéro</span>
                  </div>
                </div>
              </div>

              {/* Reward & Decision Banner */}
              <div
                className={`p-4 rounded-xl border ${
                  selectedScorecard.tier === "OR"
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : selectedScorecard.tier === "ARGENT"
                    ? "bg-blue-50 border-blue-200 text-blue-900"
                    : selectedScorecard.tier === "BRONZE"
                    ? "bg-slate-50 border-slate-200 text-slate-800"
                    : "bg-rose-50 border-rose-200 text-rose-900"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  {selectedScorecard.tier === "OR" && <span>🏆 Prime d'Excellence Débloquée : +150 000 Ar</span>}
                  {selectedScorecard.tier === "ARGENT" && <span>🥈 Prime de Productivité Standard : +80 000 Ar</span>}
                  {selectedScorecard.tier === "BRONZE" && <span>🥉 Maintien du Salaire de Base (Sans prime)</span>}
                  {selectedScorecard.tier === "ALERTE" && <span>⚠️ Seuil Critique : Avertissement & Recadrage</span>}
                </div>
                <p className="text-xs mt-1 opacity-90">
                  {selectedScorecard.tier === "OR" &&
                    "Félicitations ! Priorité d'attribution de tournées à haute densité sur les axes majeurs."}
                  {selectedScorecard.tier === "ARGENT" &&
                    "Bonne tenue opérationnelle. Objectif mois prochain : optimiser la ponctualité pour atteindre le palier Or."}
                  {selectedScorecard.tier === "BRONZE" &&
                    "Résultat conforme aux minima. Vigilance sur les reports et la régularité de reddition de caisse."}
                  {selectedScorecard.tier === "ALERTE" &&
                    "Score inférieur à 75 points. Entretien obligatoire avec le Superviseur. Tournée en binôme recommandée."}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimer la Fiche d'Évaluation</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <Award className="w-12 h-12 text-slate-300 mb-2" />
              <p className="font-semibold text-sm">Sélectionnez un livreur dans le tableau</p>
              <p className="text-xs text-slate-400 mt-1">L'évaluation individuelle consolidée s'affichera ici.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
