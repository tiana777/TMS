import { Operator } from "../types";

export interface PhoneDetectionResult {
  isValid: boolean;
  operator: Operator | null;
  cleaned: string;
  formatted: string;
  errorMessage?: string;
}

/**
 * Standard Malagasy mobile phone regex according to CDC Section 7.1:
 * Must start with '03', followed by operator prefix digit [2, 3, 4, 7, 8],
 * and exactly 7 subsequent digits (total 10 digits).
 *
 * Operators:
 * - Telma : 034, 038
 * - Orange: 032, 037
 * - Airtel: 033
 */
export const MALAGASY_PHONE_REGEX = /^03([2345678])\d{7}$/;

/** Operator-specific strict 10-digit regexes */
export const TELMA_PHONE_REGEX = /^03([458])\d{7}$/;
export const ORANGE_PHONE_REGEX = /^03([27])\d{7}$/;
export const AIRTEL_PHONE_REGEX = /^03([36])\d{7}$/;

export const MALAGASY_OPERATOR_PREFIXES: Record<string, Operator> = {
  "034": "TELMA",
  "038": "TELMA",
  "035": "TELMA",
  "032": "ORANGE",
  "037": "ORANGE",
  "033": "AIRTEL",
  "036": "AIRTEL",
};

/**
 * Cleans any raw phone string into a standard 10-digit Malagasy candidate.
 * Strips whitespace, dashes, dots, slashes, and handles +261 / 00261 / 261 prefixes.
 */
export function cleanMalagasyPhone(input: string): string {
  if (!input) return "";

  // Strip spaces, dashes, dots, parentheses, slashes
  let cleaned = input.replace(/[\s\.\-_/()]/g, "").trim();

  // Handle +261 / 00261 / 261 international variations (including accidental trailing 0 like +2610)
  if (cleaned.startsWith("+2610")) {
    cleaned = "0" + cleaned.slice(5);
  } else if (cleaned.startsWith("+261")) {
    cleaned = "0" + cleaned.slice(4);
  } else if (cleaned.startsWith("002610")) {
    cleaned = "0" + cleaned.slice(6);
  } else if (cleaned.startsWith("00261")) {
    cleaned = "0" + cleaned.slice(5);
  } else if (cleaned.startsWith("2610") && (cleaned.length === 13 || cleaned.length === 12)) {
    cleaned = "0" + cleaned.slice(4);
  } else if (cleaned.startsWith("261") && cleaned.length === 12) {
    cleaned = "0" + cleaned.slice(3);
  }

  return cleaned;
}

/**
 * Limits and sanitizes a phone input to at most 10 digits (digits only).
 * Handles +261 / 00261 / 261 paste, strips letters/symbols, and strictly caps length at 10 digits.
 */
export function sanitizePhoneInput(input: string): string {
  if (!input) return "";
  const cleaned = cleanMalagasyPhone(input);
  return cleaned.replace(/\D/g, "").slice(0, 10);
}

/**
 * Formats a 10-digit Malagasy phone string into '03X XX XXX XX'.
 */
export function formatMalagasyPhone(input: string): string {
  const cleaned = cleanMalagasyPhone(input);
  if (cleaned.length < 3) return cleaned;

  const p1 = cleaned.slice(0, 3);
  const p2 = cleaned.slice(3, 5);
  const p3 = cleaned.slice(5, 8);
  const p4 = cleaned.slice(8, 10);
  return [p1, p2, p3, p4].filter(Boolean).join(" ");
}

/**
 * Validates whether an input is a valid Malagasy phone number matching the official regex.
 */
export function isValidMalagasyPhone(input: string): boolean {
  const cleaned = cleanMalagasyPhone(input);
  return MALAGASY_PHONE_REGEX.test(cleaned);
}

/**
 * Full detection analysis returning validation status, operator, formatted value,
 * and detailed error explanation if invalid.
 */
export function detectMalagasyPhone(input: string): PhoneDetectionResult {
  if (!input || !input.trim()) {
    return {
      isValid: false,
      operator: null,
      cleaned: "",
      formatted: "",
      errorMessage: "Numéro de téléphone obligatoire",
    };
  }

  const cleaned = cleanMalagasyPhone(input);
  const prefix = cleaned.slice(0, 3);
  const operator: Operator | null = MALAGASY_OPERATOR_PREFIXES[prefix] || null;

  const isDigits = /^\d+$/.test(cleaned);
  const isValidRegex = MALAGASY_PHONE_REGEX.test(cleaned);
  const isValid = isValidRegex && operator !== null;

  const formatted = formatMalagasyPhone(cleaned);

  let errorMessage: string | undefined;
  if (cleaned.length > 0) {
    if (!isDigits) {
      errorMessage = "Le numéro doit comporter uniquement des chiffres décimaux.";
    } else if (cleaned.length < 10) {
      errorMessage = `${cleaned.length}/10 chiffres (exactement 10 chiffres requis)`;
    } else if (cleaned.length > 10) {
      errorMessage = `Trop long (${cleaned.length} chiffres détectés au lieu de 10)`;
    } else if (!operator) {
      errorMessage = `Préfixe '${prefix}' non valide (Telma: 034/038, Orange: 032/037, Airtel: 033)`;
    }
  }

  return { isValid, operator, cleaned, formatted, errorMessage };
}

/**
 * Checks if a given phone number matches the expected mobile operator.
 */
export function isOperatorMatching(
  phone: string,
  expectedOperator: "TELMA" | "ORANGE" | "AIRTEL" | string
): { matches: boolean; detected: Operator | null } {
  const res = detectMalagasyPhone(phone);
  if (!res.isValid || !res.operator) {
    return { matches: false, detected: null };
  }
  return {
    matches: res.operator.toUpperCase() === expectedOperator.toUpperCase(),
    detected: res.operator,
  };
}
