import React from "react";
import {
  Package,
  ClipboardCheck,
  Truck,
  Bus,
  Check,
  Coins,
  CheckCircle2,
  Clock,
  XCircle,
  Archive,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";
import { ParcelStatus } from "@/types";

interface StatusBadgeProps {
  status: ParcelStatus | string;
  encaissement_lieu?: "SIEGE" | "LIVREUR" | string | null;
  size?: "xs" | "sm" | "md";
  showIcon?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  encaissement_lieu,
  size = "sm",
  showIcon = true,
  className = "",
}) => {
  const normStatus = (status || "").toUpperCase();

  const iconClass = size === "xs" ? "w-3 h-3" : size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const sizeClasses =
    size === "xs"
      ? "text-[10px] px-1.5 py-0.5 gap-1"
      : size === "sm"
      ? "text-xs px-2.5 py-1 gap-1.5"
      : "text-sm px-3 py-1.5 gap-2";

  let label = normStatus;
  let colorClasses = "bg-slate-100 text-slate-700 border-slate-300";
  let IconComponent = HelpCircle;

  switch (normStatus) {
    case "EN_DEPOT":
      label = "En Dépôt Hub";
      colorClasses = "bg-amber-50 text-amber-800 border-amber-200";
      IconComponent = Package;
      break;

    case "ASSIGNE":
      label = "Assigné Tournée";
      colorClasses = "bg-indigo-50 text-indigo-800 border-indigo-200";
      IconComponent = ClipboardCheck;
      break;

    case "EN_COURS":
      label = "En Cours";
      colorClasses = "bg-sky-50 text-sky-800 border-sky-200";
      IconComponent = Truck;
      break;

    case "SOUS_TRAITE":
      label = "Sous-traité Gare";
      colorClasses = "bg-purple-50 text-purple-800 border-purple-200";
      IconComponent = Bus;
      break;

    case "LIVRE":
      label = "Livré Simple";
      colorClasses = "bg-cyan-50 text-cyan-800 border-cyan-200";
      IconComponent = Check;
      break;

    case "ENCAISSE":
      label = "Encaissé (À Valider)";
      colorClasses = "bg-teal-50 text-teal-800 border-teal-200 font-semibold";
      IconComponent = Coins;
      break;

    case "LIVRE_ENCAISSE":
      label = "Livré & Encaissé";
      colorClasses = "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold";
      IconComponent = CheckCircle2;
      break;

    case "REPORTE":
      label = "Reporté";
      colorClasses = "bg-orange-50 text-orange-800 border-orange-200";
      IconComponent = Clock;
      break;

    case "ANNULE_RETOUR":
      label = "Annulé / Retour";
      colorClasses = "bg-rose-50 text-rose-800 border-rose-200";
      IconComponent = XCircle;
      break;

    case "RETOUR_BOUTIQUE":
      label = "Retourné Boutique";
      colorClasses = "bg-slate-100 text-slate-700 border-slate-300";
      IconComponent = Archive;
      break;

    case "CLOTURE_CAISSE":
      label = "Clôturé Caisse";
      colorClasses = "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold shadow-2xs";
      IconComponent = ShieldCheck;
      break;

    default:
      label = normStatus || "Inconnu";
      colorClasses = "bg-slate-100 text-slate-600 border-slate-200";
      IconComponent = HelpCircle;
      break;
  }

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border whitespace-nowrap select-none ${sizeClasses} ${colorClasses} ${className}`}
      data-status={normStatus}
    >
      {showIcon && <IconComponent className={`${iconClass} shrink-0`} />}
      <span>{label}</span>
      {normStatus === "SOUS_TRAITE" && encaissement_lieu && (
        <span
          className={`text-[9px] px-1 py-0.2 rounded-full font-bold uppercase ${
            encaissement_lieu === "SIEGE"
              ? "bg-blue-100 text-blue-800"
              : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {encaissement_lieu === "SIEGE" ? "Siège" : "Livreur"}
        </span>
      )}
    </span>
  );
};
