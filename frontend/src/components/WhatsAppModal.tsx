"use client";

import React, { useState } from "react";
import { MessageSquare, Copy, Check, ExternalLink, X } from "lucide-react";
import { Tour } from "@/types";

interface WhatsAppModalProps {
  tour: Tour;
  onClose: () => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ tour, onClose }) => {
  const [copied, setCopied] = useState(false);

  const parcels = tour.parcels || [];

  const generateWhatsAppText = (): string => {
    const lines: string[] = [
      `⚡ *TMS EXPRESS - FEUILLE DE ROUTE*`,
      `📅 *Date :* ${tour.tour_date}`,
      `🛵 *Livreur :* ${tour.courier_name || `Livreur #${tour.courier_id}`}`,
      `📞 *Contact :* ${tour.courier_phone_formatted || tour.courier_phone || "N/A"}`,
      `📦 *Colis assignés :* ${parcels.length}`,
      `💰 *TOTAL À ENCAISSER :* *${tour.theoretical_total.toLocaleString("fr-FR")} Ar*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ];

    parcels.forEach((p, idx) => {
      lines.push(
        `*${idx + 1}. BDR ${p.tracking_number}* [${p.flux_type}]`,
        `👤 *Client :* ${p.recipient_name}`,
        `📞 *Tél :* ${p.recipient_phone_formatted} (${p.operator})`,
        `📍 *Lieu :* ${p.delivery_address}`,
        p.designation ? `📦 *Article :* ${p.designation}` : `📦 *Article :* Colis standard`,
        `💵 *À Encaisser :* *${p.total_to_collect.toLocaleString("fr-FR")} Ar*`,
        `─────────────────────────`
      );
    });

    lines.push(
      `⚠️ _Rappel consignes : Encaisser avant remise du colis. Vérifier l'authenticité des billets et SMS MVola/Orange/Airtel. Décharge Hub avant 18h30._`,
      `🚀 *Bonne route et prudence !*`
    );

    return lines.join("\n");
  };

  const messageText = generateWhatsAppText();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error("Clipboard error", e);
    }
  };

  const courierRawPhone = tour.courier_phone?.replace(/\D/g, "") || "";
  const whatsappUrl = courierRawPhone.startsWith("03")
    ? `https://api.whatsapp.com/send?phone=261${courierRawPhone.substring(1)}&text=${encodeURIComponent(messageText)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Synthèse WhatsApp Tournée</h3>
              <p className="text-xs text-slate-400">
                {tour.courier_name} • {parcels.length} colis • {tour.theoretical_total.toLocaleString("fr-FR")} Ar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Text Preview Box */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-950/40 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-all border-y border-slate-800/80">
          {messageText}
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleCopy}
            data-cy="copy-whatsapp-btn"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md ${
              copied
                ? "bg-emerald-600 text-white shadow-emerald-900/50"
                : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
            }`}
          >
            {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-emerald-400" />}
            <span>{copied ? "Texte Copié !" : "Copier le Texte"}</span>
          </button>

          <div className="flex items-center gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-cy="open-whatsapp-link"
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-900/40"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Ouvrir WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
