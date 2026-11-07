import React from "react";
import { Operator } from "../types";

interface Props {
  operator: Operator | null;
  isValid?: boolean;
  isSmall?: boolean;
}

export const OperatorBadge: React.FC<Props> = ({ operator, isValid = true, isSmall = false }) => {
  if (!operator) {
    return (
      <span
        data-testid="badge-operator-unknown"
        className={`inline-flex items-center rounded font-semibold bg-gray-100 text-gray-500 border border-gray-200 ${
          isSmall ? "px-1.5 py-0.2 text-[10px]" : "px-2 py-0.5 text-xs"
        }`}
      >
        ---
      </span>
    );
  }

  const styles: Record<Operator, string> = {
    TELMA: "bg-emerald-100 text-emerald-800 border-emerald-400 font-bold",
    ORANGE: "bg-orange-100 text-orange-800 border-orange-400 font-bold",
    AIRTEL: "bg-red-100 text-red-800 border-red-400 font-bold",
  };

  return (
    <span
      data-testid={`badge-operator-${operator.toLowerCase()}`}
      className={`inline-flex items-center rounded-full border ${styles[operator]} transition-all ${
        isSmall ? "px-2 py-0.2 text-[10px]" : "px-2.5 py-0.5 text-xs"
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current animate-pulse" />
      {operator}
    </span>
  );
};
