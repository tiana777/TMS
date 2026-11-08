import React from "react";
import { AXIS_METADATA } from "../lib/axis";
import { LogisticAxis } from "../types";

interface Props {
  axis?: LogisticAxis | string | null;
  isFallback?: boolean;
  isManual?: boolean;
}

export const AxisBadge: React.FC<Props> = ({ axis, isFallback = false, isManual = false }) => {
  const normalized = (axis || "").toString().trim().toUpperCase();
  const meta = (normalized && AXIS_METADATA[normalized as LogisticAxis]) || {
    label: normalized || "Non défini",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const testId = normalized ? `badge-axis-${normalized.toLowerCase()}` : "badge-axis-unknown";

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      <span
        data-testid={testId}
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${meta.badgeColor}`}
      >
        {normalized === "AXE_PROVINCE" && <span className="mr-1">🚌</span>}
        {meta.label}
      </span>
      {isManual && (
        <span data-testid="badge-axis-manual" className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-1 py-0.2 rounded border border-blue-200/50">
          ✏️ Manuel
        </span>
      )}
      {!isManual && isFallback && (
        <span data-testid="badge-axis-fallback" className="text-[10px] text-amber-700 font-medium bg-amber-50 px-1 py-0.2 rounded border border-amber-200/50">
          ⚠️ Repli
        </span>
      )}
    </div>
  );
};
