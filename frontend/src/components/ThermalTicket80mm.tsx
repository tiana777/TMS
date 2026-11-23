"use client";

import React from "react";
import { Printer, X } from "lucide-react";
import { Tour } from "@/types";
import { useCompany } from "@/context/CompanyContext";

interface ThermalTicket80mmProps {
  tour: Tour;
  onClose?: () => void;
}

export const ThermalTicket80mm: React.FC<ThermalTicket80mmProps> = ({ tour, onClose }) => {
  const { company } = useCompany();
  const handlePrint = () => {
    window.print();
  };

  const formattedDate = tour.tour_date;
  const parcels = tour.parcels || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white text-black rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[92vh] border border-slate-300">
        {/* Header Controls (Hidden on print) */}
        <div className="print:hidden p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-sm">Aperçu Ticket Thermique 80 mm</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              data-cy="print-thermal-btn"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow"
            >
              <Printer className="w-4 h-4" />
              Imprimer (80 mm)
            </button>
            {onClose && (
              <button
                onClick={onClose}
                data-cy="close-thermal-btn"
                className="p-1 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Printable Thermal Receipt (80 mm standard width) */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-100 flex justify-center">
          <div
            id="thermal-ticket-receipt"
            className="w-[78mm] bg-white p-3 font-mono text-[11px] leading-tight text-black shadow-md border border-slate-200 print:border-none print:shadow-none print:w-[80mm] print:p-0 print:m-0"
          >
            {/* Header */}
            <div className="text-center pb-2 border-b-2 border-black border-dashed">
              {company.logo_url && (
                <div className="flex justify-center mb-1.5">
                  <img
                    src={company.logo_url}
                    alt="Logo"
                    className="max-h-10 max-w-[140px] object-contain filter grayscale contrast-150"
                  />
                </div>
              )}
              <p className="font-black text-sm tracking-widest uppercase">{company.company_name || company.app_name}</p>
              <p className="text-[10px] uppercase font-bold">Logistique Urbaine & Régionale</p>
              <p className="text-[9px] text-gray-700">{company.address || "Hub Central : Tsiazotafo / Analakely"}</p>
              <p className="text-[9px]">Tél : {company.phone || "034 00 000 00"} • NIF : {company.nif} • STAT : {company.stat}</p>
              <p className="text-[10px] mt-1 font-black bg-black text-white py-0.5 px-1 inline-block uppercase">
                FEUILLE DE ROUTE LIVREUR
              </p>
            </div>

            {/* Tour & Courier info */}
            <div className="py-2 border-b border-black border-dashed space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>N° TOURNEE :</span>
                <span className="font-bold">#TOUR-{String(tour.id).padStart(4, "0")}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE :</span>
                <span className="font-bold">{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span>LIVREUR :</span>
                <span className="font-bold uppercase">{tour.courier_name || `Livreur #${tour.courier_id}`}</span>
              </div>
              <div className="flex justify-between">
                <span>TEL LIVREUR :</span>
                <span>{tour.courier_phone_formatted || tour.courier_phone || "N/A"}</span>
              </div>
              {tour.courier_vehicle && (
                <div className="flex justify-between">
                  <span>VEHICULE :</span>
                  <span>{tour.courier_vehicle}</span>
                </div>
              )}
            </div>

            {/* Financial Summary */}
            <div className="py-2 border-b-2 border-black border-dashed bg-gray-50 px-1 my-1">
              <div className="flex justify-between font-bold text-[10px]">
                <span>NOMBRE COLIS :</span>
                <span>{parcels.length}</span>
              </div>
              <div className="flex justify-between font-black text-[12px] pt-1 border-t border-gray-400 mt-1">
                <span>TOTAL A ENCAISSER :</span>
                <span className="underline">{tour.theoretical_total.toLocaleString("fr-FR")} Ar</span>
              </div>
            </div>

            {/* Parcels list */}
            <div className="py-2 space-y-3">
              <p className="font-bold text-[10px] uppercase text-center border-b border-black pb-0.5">
                Bordereaux de Distribution ({parcels.length})
              </p>

              {parcels.map((p, idx) => (
                <div
                  key={p.id}
                  className="pb-2 border-b border-gray-400 border-dashed space-y-0.5"
                >
                  <div className="flex justify-between font-black text-[11px]">
                    <span>
                      [{idx + 1}] BDR: {p.tracking_number}
                    </span>
                    <span className="bg-gray-200 px-1 text-[9px] rounded font-bold">
                      {p.flux_type}
                    </span>
                  </div>

                  <div className="text-[10px]">
                    <span className="font-bold">DEST : </span>
                    <span className="uppercase">{p.recipient_name}</span>
                  </div>

                  <div className="text-[10px]">
                    <span className="font-bold">TEL : </span>
                    <span className="font-semibold">{p.recipient_phone_formatted}</span>
                    <span className="text-[9px] text-gray-600"> ({p.operator})</span>
                  </div>

                  <div className="text-[10px]">
                    <span className="font-bold">LIEU : </span>
                    <span>{p.delivery_address}</span>
                  </div>

                  {p.designation && (
                    <div className="text-[9px] text-gray-800 italic">
                      <span>Article : </span>
                      <span>{p.designation}</span>
                    </div>
                  )}

                  {p.observation && (
                    <div className="text-[9px] font-black border border-black p-0.5 mt-0.5 bg-gray-50 uppercase">
                      <span>CONSIGNE / PLAGE : </span>
                      <span>{p.observation}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-1 font-bold text-[11px] bg-gray-100 p-0.5 rounded">
                    <span>A ENCAISSER LIVREUR :</span>
                    <span className="text-black font-black">
                      {p.encaissement_lieu === "SIEGE"
                        ? "0 Ar (AU SIÈGE)"
                        : `${p.total_to_collect.toLocaleString("fr-FR")} Ar`}
                    </span>
                  </div>

                  {p.encaissement_lieu === "SIEGE" && (
                    <div className="text-[8px] font-black border border-black p-0.5 mt-0.5 bg-gray-100 text-center uppercase">
                      *** COD DE {p.total_to_collect.toLocaleString("fr-FR")} Ar RÉCUPÉRÉ AU SIÈGE (NE PAS ENCAISSER) ***
                    </div>
                  )}

                  {/* Customer Signature Box */}
                  <div className="mt-1 pt-1 border-t border-dotted border-gray-300">
                    <div className="flex justify-between text-[8px] text-gray-600">
                      <span>EMARGEMENT CLIENT :</span>
                      <span>HEURE : __:__</span>
                    </div>
                    <div className="h-6 border border-gray-400 border-dashed rounded mt-0.5 flex items-center justify-center text-[8px] text-gray-400">
                      Signature / Tampon Destinataire
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer & Signatures */}
            <div className="pt-2 border-t-2 border-black border-dashed text-[9px] space-y-4">
              <div>
                <p className="font-bold text-center uppercase text-[10px]">Attestation de Prise en Charge</p>
                <p className="text-[8px] text-center text-gray-600">
                  Le livreur reconnait avoir reçu les {parcels.length} colis et s&apos;engage à remettre les fonds lors de la décharge du soir.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <p className="font-bold text-[8px] uppercase">Visa Superviseur Quai</p>
                  <div className="h-8 border border-gray-400 rounded mt-0.5"></div>
                </div>
                <div>
                  <p className="font-bold text-[8px] uppercase">Signature Livreur</p>
                  <div className="h-8 border border-gray-400 rounded mt-0.5"></div>
                </div>
              </div>

              <p className="text-[8px] text-center text-gray-500 pt-1">
                *** {company.company_name || company.app_name} • {company.website || "www.tmsexpress.mg"} • NIF : {company.nif} ***
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
