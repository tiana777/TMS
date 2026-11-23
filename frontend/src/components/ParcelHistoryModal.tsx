"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  History,
  Clock,
  User,
  ShieldCheck,
  ArrowRight,
  Package,
  MapPin,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Edit,
  Truck,
  CreditCard,
  Send,
} from "lucide-react";
import { Parcel, ParcelHistoryItem } from "../types";
import { fetchParcelHistory } from "../lib/api";

interface ParcelHistoryModalProps {
  parcel: Parcel | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ParcelHistoryModal({ parcel, isOpen, onClose }: ParcelHistoryModalProps) {
  const [historyItems, setHistoryItems] = useState<ParcelHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && parcel?.id) {
      loadHistory();
    } else {
      setHistoryItems([]);
      setError(null);
    }
  }, [isOpen, parcel?.id]);

  const loadHistory = async () => {
    if (!parcel?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchParcelHistory(parcel.id);
      setHistoryItems(data);
    } catch (err: any) {
      console.error("Erreur chargement historique:", err);
      setError(err.message || "Impossible de charger l'historique du colis.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !parcel) return null;

  const getActionBadge = (action: string) => {
    switch (action) {
      case "RECEPTION_QUAI":
        return {
          bg: "bg-blue-100 text-blue-800 border-blue-200",
          icon: <Package className="w-3.5 h-3.5 text-blue-600" />,
          label: "Réception Quai Inbound",
        };
      case "MODIFICATION_AXE":
        return {
          bg: "bg-purple-100 text-purple-800 border-purple-200",
          icon: <MapPin className="w-3.5 h-3.5 text-purple-600" />,
          label: "Changement d'Axe",
        };
      case "MODIFICATION_INFOS":
        return {
          bg: "bg-amber-100 text-amber-800 border-amber-200",
          icon: <Edit className="w-3.5 h-3.5 text-amber-600" />,
          label: "Mise à jour Coordonnées",
        };
      case "AFFECTATION_LIVREUR":
        return {
          bg: "bg-teal-100 text-teal-800 border-teal-200",
          icon: <Truck className="w-3.5 h-3.5 text-teal-600" />,
          label: "Affectation Livreur",
        };
      case "REGLEMENT_PREPAYE":
        return {
          bg: "bg-emerald-100 text-emerald-800 border-emerald-200",
          icon: <CreditCard className="w-3.5 h-3.5 text-emerald-600" />,
          label: "Paiement Anticipé",
        };
      case "CHANGEMENT_STATUT":
      default:
        return {
          bg: "bg-slate-100 text-slate-800 border-slate-200",
          icon: <History className="w-3.5 h-3.5 text-slate-600" />,
          label: "Changement de Statut",
        };
    }
  };

  const getRoleBadge = (role?: string | null) => {
    switch (role) {
      case "SUPER_ADMIN":
        return { bg: "bg-rose-50 text-rose-700 border-rose-200", label: "Super Admin" };
      case "SUPERVISEUR":
        return { bg: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "Superviseur" };
      case "RECEPTIONNISTE":
        return { bg: "bg-sky-50 text-sky-700 border-sky-200", label: "Agent Quai" };
      case "LIVREUR":
        return { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Livreur" };
      default:
        return { bg: "bg-slate-50 text-slate-600 border-slate-200", label: role || "Agent" };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white tracking-wide">
                  BDR-{parcel.tracking_number}
                </h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-white/10 text-white border border-white/20">
                  {parcel.flux_type}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  {parcel.status_label || parcel.status}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Destinataire : <strong className="text-white">{parcel.recipient_name}</strong> • {parcel.axis_label}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={loadHistory}
              disabled={isLoading}
              title="Rafraîchir l'historique"
              className="p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Creator & Latest Modifier Overview Banner */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-slate-600">
              Créé / Réceptionné par :{" "}
              <strong className="text-slate-900 font-semibold">
                {parcel.receptionniste_nom || "Agent Quai (REC)"}
              </strong>
            </span>
          </div>
          {parcel.dernier_agent_nom && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="text-slate-600">
                Dernière intervention :{" "}
                <strong className="text-slate-900 font-semibold">
                  {parcel.dernier_agent_nom}
                </strong>
                {parcel.derniere_action_at && (
                  <span className="text-slate-400 font-normal"> ({parcel.derniere_action_at})</span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Content / Timeline */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-2" />
              <p className="text-sm font-medium">Chargement de la traçabilité en direct...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Erreur de chargement</p>
                <p className="text-xs text-rose-600 mt-0.5">{error}</p>
                <button
                  onClick={loadHistory}
                  className="mt-2 text-xs font-bold underline hover:text-rose-900"
                >
                  Réessayer
                </button>
              </div>
            </div>
          )}

          {!isLoading && !error && historyItems.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Package className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">Aucun historique d&apos;action enregistré.</p>
              <p className="text-xs text-slate-400 mt-1">
                Le colis a été créé le {parcel.reception_date} par {parcel.receptionniste_nom || "l'Agent Quai"}.
              </p>
            </div>
          )}

          {!isLoading && !error && historyItems.length > 0 && (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
              {historyItems.map((item, idx) => {
                const actionBadge = getActionBadge(item.action);
                const roleBadge = getRoleBadge(item.agent_role);

                return (
                  <div key={item.id || idx} className="relative group">
                    {/* Bullet marker on vertical line */}
                    <div className="absolute -left-[19px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center shadow-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    </div>

                    {/* Timeline Card */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition space-y-2">
                      {/* Top Bar: Action Badge + Agent + Date */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold border ${actionBadge.bg}`}
                          >
                            {actionBadge.icon}
                            {actionBadge.label}
                          </span>

                          {/* Agent Badge */}
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            <User className="w-3 h-3 text-slate-500" />
                            {item.agent_nom || "Agent Quai"}
                          </span>

                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${roleBadge.bg}`}
                          >
                            {roleBadge.label}
                          </span>
                        </div>

                        {/* Timestamp */}
                        <div className="inline-flex items-center gap-1 text-slate-400 text-xs font-mono">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{item.horodatage}</span>
                        </div>
                      </div>

                      {/* Status Transition (if status changed) */}
                      {item.statut_nouveau && item.statut_precedent && item.statut_nouveau !== item.statut_precedent && (
                        <div className="inline-flex items-center gap-2 text-xs font-medium bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
                          <span className="text-slate-500 font-mono">{item.statut_precedent}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-blue-700 font-bold font-mono">{item.statut_nouveau}</span>
                        </div>
                      )}

                      {/* Details & Explanation */}
                      <div className="text-xs text-slate-700 leading-relaxed bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
                        {item.details || item.motif || "Action validée sur le flux logistique."}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Traçabilité intégrale garantie • {historyItems.length} événement(s) enregistré(s)
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
