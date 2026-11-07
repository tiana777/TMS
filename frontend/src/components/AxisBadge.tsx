import React from "react";
import { AXIS_METADATA } from "../lib/axis";
import { LogisticAxis } from "../types";

interface Props {
  axis: LogisticAxis;
  isFallback?: boolean;
}

export const AxisBadge: React.FC<Props> = ({ axis, isFallback = false }) => {
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
      {isFallback && (
        <span className="text-[10px] text-amber-600 font-semibold mt-0.5">
          ⚠️ Repli par défaut
        </span>
      )}
    </div>
  );
};
