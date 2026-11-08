import { LogisticAxis } from "../types";

const PROVINCE_KEYWORDS = [
  "toamasina", "tamatave", "mahajanga", "majunga", "antsirabe", "fianarantsoa",
  "toliara", "tulear", "diego", "antsiranana", "moramanga", "brickaville",
  "manakara", "sambava", "antalaha", "nosy be", "fort-dauphin", "tolagnaro",
  "ambatondrazaka", "fenerive", "gare ambodivona", "fasan'ny karana",
  "andohatapenaka", "gare maki", "cotisse", "kofmad", "besady", "sonatra", "trans texpress",
];

const URBAN_KEYWORDS: Record<LogisticAxis, string[]> = {
  AXE_RN1: ["67ha", "ampefiloha", "anosizato", "ambodin'isotry", "itaosy", "seimad", "ampitatafika", "fenoarivo"],
  AXE_RN2: ["besarety", "mahavoky", "avaradoha", "ampasapito", "nanisana", "ankadindramamy", "mahazo", "ambohimangakely"],
  AXE_RN3: ["andravoahangy", "amboditsiry", "analamahitsy", "ilafy", "sabotsy", "manjakaray", "anjanahary"],
  AXE_RN4: ["antanimena", "ankorondrano", "andraharo", "galaxy", "alarobia", "ambohimanarina", "ambohibao", "talatamaty", "ivato"],
  AXE_RN7: ["ankadimbahoaka", "tanjombato", "andoharanofotsy", "iavoloha", "ambohimanambola"],
  AXE_SUD_EST: ["ambanidia", "mandroseza", "ankatso", "campus", "tsiadana", "ambatoroka", "alasora", "by-pass", "bypass"],
  AXE_CENTRE: ["analakely", "antaninarenina", "isoraka", "tsaralalana", "behoririka", "mahamasina", "faravohitra", "tsiazotafo"],
  AXE_PROVINCE: [],
};

export function detectAxisClient(address: string): { axis: LogisticAxis; isFallback: boolean } {
  if (!address) return { axis: "AXE_CENTRE", isFallback: true };
  const lower = address.toLowerCase();

  // 1. Province Priority
  for (const kw of PROVINCE_KEYWORDS) {
    if (lower.includes(kw)) {
      return { axis: "AXE_PROVINCE", isFallback: false };
    }
  }

  // 2. Urban Corridors
  const axes: LogisticAxis[] = [
    "AXE_RN1", "AXE_RN2", "AXE_RN3", "AXE_RN4", "AXE_RN7", "AXE_SUD_EST", "AXE_CENTRE"
  ];
  for (const axis of axes) {
    for (const kw of URBAN_KEYWORDS[axis]) {
      if (lower.includes(kw)) {
        return { axis, isFallback: false };
      }
    }
  }

  // 3. Fallback
  return { axis: "AXE_CENTRE", isFallback: true };
}

export const AXIS_METADATA: Record<LogisticAxis, { label: string; badgeColor: string }> = {
  AXE_CENTRE: { label: "Centre-Ville (Tsiazotafo)", badgeColor: "bg-amber-100 text-amber-800 border-amber-300" },
  AXE_RN1: { label: "RN1 Ouest (Itaosy / 67Ha)", badgeColor: "bg-blue-100 text-blue-800 border-blue-300" },
  AXE_RN2: { label: "RN2 Est (Ambohimangakely)", badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  AXE_RN3: { label: "RN3 Nord (Sabotsy Namehana)", badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-300" },
  AXE_RN4: { label: "RN4 / Digue (Ivato Aéroport)", badgeColor: "bg-violet-100 text-violet-800 border-violet-300" },
  AXE_RN7: { label: "RN7 Sud (Andoharanofotsy)", badgeColor: "bg-orange-100 text-orange-800 border-orange-300" },
  AXE_SUD_EST: { label: "Sud-Est (Ankatso / Alasora)", badgeColor: "bg-pink-100 text-pink-800 border-pink-300" },
  AXE_PROVINCE: { label: "Provinces & Gares Routières", badgeColor: "bg-purple-100 text-purple-800 border-purple-300" },
};
