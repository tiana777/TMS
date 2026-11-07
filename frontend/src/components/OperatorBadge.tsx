import React from "react";
import { Operator } from "../types";

interface Props {
  operator: Operator | null;
  isValid?: boolean;
}

export const OperatorBadge: React.FC<Props> = ({ operator, isValid = true }) => {
  if (!operator) {
    return (
      <span
        data-testid="badge-operator-unknown"
        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200"
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
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${styles[operator]} transition-all`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current animate-pulse" />
      {operator}
    </span>
  );
};
