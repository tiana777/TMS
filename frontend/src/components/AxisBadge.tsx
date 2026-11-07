import React from "react";
import { AXIS_METADATA } from "../lib/axis";
import { LogisticAxis } from "../types";

interface Props {
  axis: LogisticAxis;
  isFallback?: boolean;
  isManual?: boolean;
}

export const AxisBadge: React.FC<Props> = ({ axis, isFallback = false, isManual = false }) => {
  const meta = AXIS_METADATA[axis] || {
    label: axis,
    badgeColor: "bg-gray-100 text-gray-800 border-gray-300",
  };

  return (
    <div className="flex flex-col">
      <span
        data-testid={`badge-axis-${axis.toLowerCase()}`}
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${meta.badgeColor}`}
      >
        {axis === "AXE_PROVINCE" && <span className="mr-1">🚌</span>}
        {meta.label}
      </span>
      {isManual && (
        <span data-testid="badge-axis-manual" className="text-[10px] text-blue-700 font-bold mt-0.5">
          ✏️ Modifié manuellement
        </span>
      )}
      {!isManual && isFallback && (
        <span data-testid="badge-axis-fallback" className="text-[10px] text-amber-600 font-semibold mt-0.5">
          ⚠️ Repli par défaut
        </span>
      )}
    </div>
  );
};
