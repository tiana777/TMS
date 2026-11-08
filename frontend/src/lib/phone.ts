import { Operator } from "../types";

export interface PhoneDetectionResult {
  isValid: boolean;
  operator: Operator | null;
  cleaned: string;
  formatted: string;
  errorMessage?: string;
}

export function detectMalagasyPhone(input: string): PhoneDetectionResult {
  if (!input) {
    return { isValid: false, operator: null, cleaned: "", formatted: "" };
  }

  // Strip spaces, dashes, dots, parentheses
  let cleaned = input.replace(/[\s\.\-_/()]/g, "").trim();

  // Handle +261 / 00261 / 261 conversions
  if (cleaned.startsWith("+261")) {
    cleaned = "0" + cleaned.slice(4);
  } else if (cleaned.startsWith("00261")) {
    cleaned = "0" + cleaned.slice(5);
  } else if (cleaned.startsWith("261") && cleaned.length === 12) {
    cleaned = "0" + cleaned.slice(3);
  }

  const prefix = cleaned.slice(0, 3);
  let operator: Operator | null = null;

  if (prefix === "034" || prefix === "038") {
    operator = "TELMA";
  } else if (prefix === "032" || prefix === "037") {
    operator = "ORANGE";
  } else if (prefix === "033") {
    operator = "AIRTEL";
  }

  const isDigits = /^\d+$/.test(cleaned);
  const isValidLength = cleaned.length === 10;
  const isValid = isDigits && isValidLength && operator !== null;

  let formatted = cleaned;
  if (cleaned.length >= 3) {
    const p1 = cleaned.slice(0, 3);
    const p2 = cleaned.slice(3, 5);
    const p3 = cleaned.slice(5, 8);
    const p4 = cleaned.slice(8, 10);
    formatted = [p1, p2, p3, p4].filter(Boolean).join(" ");
  }

  let errorMessage: string | undefined;
  if (cleaned.length > 0) {
    if (!isDigits) {
      errorMessage = "Doit contenir uniquement des chiffres";
    } else if (cleaned.length < 10) {
      errorMessage = `${cleaned.length}/10 chiffres`;
    } else if (cleaned.length > 10) {
      errorMessage = "Trop long (10 chiffres max)";
    } else if (!operator) {
      errorMessage = "Préfixe non reconnu (032, 033, 034, 037, 038)";
    }
  }

  return { isValid, operator, cleaned, formatted, errorMessage };
}
