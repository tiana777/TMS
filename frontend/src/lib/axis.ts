import { LogisticAxis } from "../types";

export const PROVINCE_KEYWORDS = [
  // Major regional cities & provinces
  "toamasina", "tamatave", "mahajanga", "majunga", "antsirabe", "fianarantsoa",
  "toliara", "tulear", "diego", "antsiranana", "moramanga", "brickaville",
  "manakara", "sambava", "antalaha", "nosy be", "nosy-be", "fort-dauphin",
  "fort dauphin", "tolagnaro", "ambatondrazaka", "fenerive", "fenerive-est",
  "sainte-marie", "sainte marie", "ambositra", "ambalavao", "ihosy", "port-berge",
  "antsohihy", "ambanja", "maevatanana", "ambato-boeni", "mananjary", "morondava",
  // Stations (Gares)
  "gare ambodivona", "fasan'ny karana", "fasan ny karana", "fasankarana",
  "gare maki", "andohatapenaka", "gare andohatapenaka", "gare aranta",
  // National cooperatives
  "cotisse", "kofmad", "besady", "sonatra", "trans texpress", "trans tsiry",
  "soatrans", "fifafi", "trans mada", "kofiam", "chita express", "trans diego",
  "madatrans",
];

// Grille Tarifaire Officielle du CDC (Section 5.3)
export const FEE_5000_KEYWORDS = [
  // AVARADRANO (5 000 Ar)
  "sabotsy namehana", "sabotsy", "ambohimanambola tetezana", "ambohimanambola",
  "alasora alatsinainy", "alasora mahatsinjo", "alasora ambohitanety",
  // ATSIMONDRANO (5 000 Ar)
  "iavoloha galana", "iavoloha elgeco plus", "iavoloha elgeco", "iavoloha",
  "imerimanjaka bypass", "imerimanjaka", "ambohijanaka",
  "itaosy sinibeandrano", "sinibeandrano", "itaosy ambohidrapeto", "ambohidrapeto", "soavina",
  // AMBOHIDRATRIMO (5 000 Ar)
  "ivato aeroport", "aeroport ivato", "ambohidratrimo", "mandrosoa ivato", "ivato horizon", "ivato",
  // AMBOHIMANGAKELY (5 000 Ar)
  "ambodivoara", "rond point bypass", "rond-point bypass",
  // Corridors & extensions
  "antsofinondry", "croc farm", "tsarafara", "ambatofotsy",
];

export const FEE_4000_KEYWORDS = [
  // AVARADRANO (4 000 Ar)
  "ankadindratombo", "alasora commune", "rond point bypass alasora", "by pass cote alasora", "bypass alasora", "by-pass alasora",
  "ambohidrazaka", "ankadikely ilafy", "ankadikely", "ilafy", "ambohitrarahaba", "antanandrano", "ambatobe ambony", "ambolokandrina",
  // ATSIMONDRANO (4 000 Ar)
  "tanjombato", "andoharanofotsy", "mandrimena", "forello",
  "itaosy andranonahoatra", "andranonahoatra", "itaosy cite", "itaosy cité",
  "anosizato andrefana", "ampitatafika avaravohitra", "ampitatafika tetezana", "ampitatafika",
  "ankaraobato", "bemasoandro", "fenoarivo", "alakamisy fenoarivo", "ambodiafontsy", "ambohimangidy",
  // AMBOHIDRATRIMO (4 000 Ar)
  "ambohibao", "ambatolampy", "talatamaty", "antanetibe talatamaty", "antanetibe", "ambohidroa", "andranomena",
  // AMBOHIMANGAKELY (4 000 Ar)
  "ambohimangakely ankadilalana", "ambohimangaely eo cmt", "ambohimangakely eo cmt", "ambohimangakely cmt", "ambohimangakely", "antsobolo",
  // Communes périphériques 1ère couronne
  "behintsy", "soamanandrariny", "ambohibe", "antehiroka", "tongarivo", "bevalala",
  "ambohimanala", "ambohimanatrika", "marobiby", "itaosy horizon", "ambatolampy tsimahafotsy",
  "alasora",
];

export const FEE_3000_SPECIFIC_OVERRIDES = [
  "ambatobe ambany", "anosizato est",
];

export const URBAN_KEYWORDS: Record<string, string[]> = {
  AXE_CENTRE_1: [
    "ambatonakanga", "ambohitsorohitra", "ambatovinaky", "ambodifilao", "soarano",
    "amparibe", "avaratr'imahamasina", "ampasamadinika", "amboasarikely",
    "faravohitra", "isoraka", "tsaralalana", "ambondrona", "tsiazotafo",
    "andafiavaratra", "manjakamiadana", "behoririka", "analakely", "ankadilalana",
    "fiadanana", "mahamasina", "tsimialonjafy", "ambanin'ampamarinana",
    "ambohijatovo", "mananjara", "fort-voyron", "petite vitesse", "antaninandro",
    "ambohipotsy", "andohalo", "anjohy", "antaninarenina",
  ],
  AXE_CENTRE_2: [
    "ambatolampy tsimahafotsy", "ambodivoanjo", "amboniloha", "ivandry",
    "morarano alarobia", "soavimasoandro", "ambodivona", "ambatomitsangana",
    "ankadifotsy", "antanimena", "ankorondrano", "mandialaza", "tsaramasay",
    "ambodifasina", "mahatony",
  ],
  AXE_ITAOSY: [
    "sinibeandrano", "ambohidrapeto", "itaosy marobiby", "itaosy horizon",
    "ambavahaditokana", "itaosy andranonahoatra", "itaosy cite", "itaosy hopitaly",
    "itaosy ambodifasika", "itaosy ambohijanamasoandro", "itaosy andohatanjona",
    "itaosy ambodiapanga", "itaosy", "67ha", "67 ha", "ampasika", "ambodin'isotry",
    "ambodinisotry", "antohomadinika", "ambohitrimanjaka", "andohatapenaka", "ankasina",
    "manarintsoa", "anatihazo isotry", "andranomanalina", "bemasoandro",
  ],
  AXE_AMPITATAFIKA: [
    "ampitatafika ankaditany", "ampitatafika tetezana", "ampitatafika faliarivo",
    "ampitatafika", "alakamisy fenoarivo", "fenoarivo", "ambodiafontsy", "ambohimangidy",
    "anosizato andrefana", "ambohimamory", "ambalavao-isotry", "ambalavao isotry",
    "andavamamba", "avaratetezana-bekiraro", "avaratetezana", "bekiraro", "ampefiloha",
    "anosibe", "anosipatrana", "anosizato est", "anosizato ouest", "anosizato",
    "ilanivato", "namontana", "angarangarana", "anosy",
  ],
  AXE_AMBOHIMANGAKELY: [
    "ambodivoara", "ambohimangakely", "cmt", "antsobolo", "behintsy",
    "bypass ambohimangakely", "soamanandrariny", "ambohibe", "ankadiefajoro",
    "ambohitrakely", "ampahibe", "besarety", "soavinandriana", "ambatokaranana",
    "ambatomaro", "ankadindramamy", "ambohimirary", "ampanotokana", "andraisoro",
    "nanisana", "tsarahonenana", "avaradoha", "betongolo", "mahavoky", "mahazo",
  ],
  AXE_SABOTSY_NAMEHANA: [
    "sabotsy namehana", "sabotsy", "tsarafara", "manarintsoa sabotsy", "ambatofotsy",
    "antsofinondry", "ankadikely ilafy", "ankadikely", "ilafy", "ambohitrarahaba",
    "antanandrano", "ambatobe ambony", "ambatobe ambany", "ambatobe", "ambatomainty",
    "amboditsiry", "analamahintsy cite", "analamahintsy tanana", "analamahintsy",
    "androhibe", "anjanahary", "manjakaray", "andravoahangy", "anosy avaratra",
    "lazaina", "soavinimerina", "manjaka ilafy", "antsampandrano ilafy", "ambohipanja",
    "andranobevava", "masay",
  ],
  AXE_IVATO: [
    "ivato aeroport", "aeroport ivato", "ambohidratrimo", "mandrosoa ivato", "ivato horizon",
    "ivato tanana", "croc farm", "talatamaty", "antanetibe talatamaty", "ambohibao",
    "ambatolampy", "ambohidroa", "andranomena", "antehiroka", "ambohijanahary antehiroka",
    "andrahara", "andraharo", "zone galaxy", "galaxy", "alarobia", "ambodimita",
    "ambodivonkely", "ambohimanandray", "ambohimandroso", "ambohimitsinjo",
    "anosisoa", "anosivavaka", "antanety", "antanjombe", "ambodihady", "ankazomanga",
  ],
  AXE_IAVOLOHA: [
    "iavoloha galana", "iavoloha elgeco", "iavoloha", "imerimanjaka", "ambohijanaka",
    "soavina", "bypass gazety", "bypass iavoloha", "tongarivo", "bevalala",
    "ambohimanala", "ambohimanatrika", "tanjombato", "andoharanofotsy", "mandrimena",
    "forello", "ankaraobato", "fasan'ny karana", "manakambahiny", "ouest ambohijanahary",
    "ankaditoho", "marohoho", "soanierana", "tsarafaritra", "tsimbazaza", "saropody",
  ],
  AXE_ALASORA: [
    "ambohimanambola", "alasora alatsinainy", "alasora mahatsinjo", "alasora ambohitanety",
    "alasora commune", "alasora", "bypass alasora", "by-pass alasora", "ambohidrazaka",
    "ambolokandrina", "ankadindratombo", "ampandrana", "ambohipo", "androndra",
    "morarano ambohitsoa", "tsiadana", "ambohitsoa", "ambanidia", "mandroseza",
    "antanimora ampasanimalo", "ampasanimalo", "ambatoroka", "ambohimiandra",
    "miandrarivo", "mahazoarivo", "ampamantanana", "andohanimandroseza", "antsahabe",
    "volosarika", "ankazotokana", "antsakaviro", "ankatso", "antsahameva", "antsahamamy",
    "ankorahotra", "avaratr'antanimora", "androndrakely",
  ],
};

function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export interface CustomZone {
  name: string;
  axis: LogisticAxis;
  fee: number;
}

export const CUSTOM_ZONES: CustomZone[] = [];

export function registerCustomZone(name: string, axis: LogisticAxis, fee: number) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const existingIndex = CUSTOM_ZONES.findIndex(
    (z) => normalizeText(z.name) === normalizeText(trimmed)
  );
  if (existingIndex >= 0) {
    CUSTOM_ZONES[existingIndex] = { name: trimmed, axis, fee };
  } else {
    CUSTOM_ZONES.unshift({ name: trimmed, axis, fee });
  }

  // Push to urban keywords for instant auto-detection
  if (URBAN_KEYWORDS[axis]) {
    const lower = trimmed.toLowerCase();
    if (!URBAN_KEYWORDS[axis].includes(lower)) {
      URBAN_KEYWORDS[axis].unshift(lower);
    }
  }

  // Push to fee keywords
  const lowerName = trimmed.toLowerCase();
  if (fee === 5000 && !FEE_5000_KEYWORDS.includes(lowerName)) {
    FEE_5000_KEYWORDS.unshift(lowerName);
  } else if (fee === 4000 && !FEE_4000_KEYWORDS.includes(lowerName)) {
    FEE_4000_KEYWORDS.unshift(lowerName);
  } else if (fee === 3000 && !FEE_3000_SPECIFIC_OVERRIDES.includes(lowerName)) {
    FEE_3000_SPECIFIC_OVERRIDES.unshift(lowerName);
  }
}

export function detectFeeClient(address: string): number {
  if (!address) return 3000;
  const norm = normalizeText(address);
  const lower = address.toLowerCase();

  // 0. Custom registered zones priority
  for (const cz of CUSTOM_ZONES) {
    if (lower.includes(cz.name.toLowerCase()) || norm.includes(normalizeText(cz.name))) {
      return cz.fee;
    }
  }

  // 1. Spécifique 3 000 Ar (ex: Ambatobe Ambany vs Ambatobe Ambony, Anosizato Est vs Ouest)
  for (const kw of FEE_3000_SPECIFIC_OVERRIDES) {
    if (norm.includes(normalizeText(kw))) return 3000;
  }

  // 2. Bypass Alasora (4 000 Ar) prioritaire sur Bypass générique (5 000 Ar)
  if (norm.includes("bypassalasora") || norm.includes("alasora")) {
    if (
      norm.includes("alatsinainy") ||
      norm.includes("mahatsinjo") ||
      norm.includes("ambohitanety")
    ) {
      return 5000;
    }
    return 4000;
  }

  // 3. Grille 5 000 Ar
  for (const kw of FEE_5000_KEYWORDS) {
    if (norm.includes(normalizeText(kw))) return 5000;
  }

  // 4. Grille 4 000 Ar
  for (const kw of FEE_4000_KEYWORDS) {
    if (norm.includes(normalizeText(kw))) return 4000;
  }

  // 5. Défaut Intra-Urbain (CUA 1er au 6ème Arrondissement)
  return 3000;
}

export function detectAxisClient(address: string): {
  axis: LogisticAxis;
  isFallback: boolean;
  fee: number;
} {
  const fee = detectFeeClient(address);
  if (!address) return { axis: "AXE_CENTRE_1", isFallback: true, fee };
  const lower = address.toLowerCase();
  const norm = normalizeText(address);

  // 0. Custom registered zones priority
  for (const cz of CUSTOM_ZONES) {
    if (lower.includes(cz.name.toLowerCase()) || norm.includes(normalizeText(cz.name))) {
      return { axis: cz.axis, isFallback: false, fee: cz.fee };
    }
  }

  // 1. Province Priority (Gares Routières, Coopératives et Villes Régionales)
  for (const kw of PROVINCE_KEYWORDS) {
    if (lower.includes(kw) || norm.includes(normalizeText(kw))) {
      return { axis: "AXE_PROVINCE", isFallback: false, fee: 10000 };
    }
  }

  // Real Urban Axes in Priority Order
  const realAxes: LogisticAxis[] = [
    "AXE_IVATO",
    "AXE_SABOTSY_NAMEHANA",
    "AXE_AMBOHIMANGAKELY",
    "AXE_ALASORA",
    "AXE_IAVOLOHA",
    "AXE_AMPITATAFIKA",
    "AXE_ITAOSY",
    "AXE_CENTRE_2",
    "AXE_CENTRE_1",
  ];

  for (const axis of realAxes) {
    const keywords = URBAN_KEYWORDS[axis] || [];
    for (const kw of keywords) {
      if (lower.includes(kw) || norm.includes(normalizeText(kw))) {
        return { axis, isFallback: false, fee };
      }
    }
  }

  // 3. Fallback -> Centre 1
  return { axis: "AXE_CENTRE_1", isFallback: true, fee };
}

export const AXIS_METADATA: Record<string, { label: string; badgeColor: string }> = {
  // 9 Real Urban Axes
  AXE_CENTRE_1: {
    label: "Centre Ville 1 (Analakely / Tsaralalana)",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
  },
  AXE_CENTRE_2: {
    label: "Centre Ville 2 (Antanimena / Ankorondrano)",
    badgeColor: "bg-orange-100 text-orange-800 border-orange-300",
  },
  AXE_ITAOSY: {
    label: "Axe Itaosy (67Ha / Itaosy / Bemasoandro)",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
  },
  AXE_AMPITATAFIKA: {
    label: "Axe Ampitatafika (Ampefiloha / Anosibe / Fenoarivo)",
    badgeColor: "bg-sky-100 text-sky-800 border-sky-300",
  },
  AXE_AMBOHIMANGAKELY: {
    label: "Axe Ambohimangakely (Besarety / Nanisana / RN2)",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  AXE_SABOTSY_NAMEHANA: {
    label: "Axe Sabotsy Namehana (Ankadikely / Ilafy / RN3)",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-300",
  },
  AXE_IVATO: {
    label: "Axe Ivato (Andraharo / Galaxy / RN4 Aéroport)",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-300",
  },
  AXE_IAVOLOHA: {
    label: "Axe Iavoloha (Tanjombato / Andoharanofotsy / RN7)",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-300",
  },
  AXE_ALASORA: {
    label: "Axe Alasora (Ambanidia / Mandroseza / By-pass)",
    badgeColor: "bg-pink-100 text-pink-800 border-pink-300",
  },

  // Provinces & Gares
  AXE_PROVINCE: {
    label: "Provinces & Gares Routières",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
  },
  AXE_PROV_RN2_EST: {
    label: "RN2 Est (Tamatave / Moramanga)",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
  },
  AXE_PROV_RN4_OUEST: {
    label: "RN4 Nord-Ouest (Majunga / Maevatanana)",
    badgeColor: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300",
  },
  AXE_PROV_RN6_NORD: {
    label: "RN6 Grand Nord (Diego / Nosy Be)",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-300",
  },
  AXE_PROV_RN7_SUD: {
    label: "RN7 Sud (Antsirabe / Fianar)",
    badgeColor: "bg-violet-100 text-violet-800 border-violet-300",
  },
  AXE_PROV_RN7_SUD_OUEST: {
    label: "RN7 Sud-Ouest (Tuléar / Morondava)",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
  },
  AXE_PROV_SUD_EST: {
    label: "Sud-Est & Anosy (Manakara / Fort-Dauphin)",
    badgeColor: "bg-pink-100 text-pink-800 border-pink-300",
  },
  AXE_PROV_RN44_ALAOTRA: {
    label: "RN44 (Ambatondrazaka / Alaotra)",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-300",
  },

  // Compatibility aliases for legacy data
  AXE_CENTRE: {
    label: "Centre-Ville (Tsiazotafo)",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
  },
  AXE_RN1: {
    label: "RN1 Ouest (Itaosy / Ampitatafika)",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
  },
  AXE_RN2: {
    label: "RN2 Est (Ambohimangakely)",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  AXE_RN3: {
    label: "RN3 Nord (Sabotsy Namehana)",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-300",
  },
  AXE_RN4: {
    label: "RN4 / Digue (Ivato Aéroport)",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-300",
  },
  AXE_RN7: {
    label: "RN7 Sud (Iavoloha / Tanjombato)",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-300",
  },
  AXE_SUD_EST: {
    label: "Sud-Est (Ankatso / Alasora)",
    badgeColor: "bg-pink-100 text-pink-800 border-pink-300",
  },
};

export interface RegisteredProvinceAxis {
  code: string;
  label: string;
}

export const DYNAMIC_PROVINCE_AXES: RegisteredProvinceAxis[] = [];

export function registerProvinceAxisClient(code: string, label: string) {
  const normCode = code.trim().toUpperCase();
  if (!normCode) return;
  const existing = DYNAMIC_PROVINCE_AXES.find((a) => a.code === normCode);
  if (!existing) {
    DYNAMIC_PROVINCE_AXES.push({ code: normCode, label: label.trim() || normCode });
  }
}

export function getAxisMetadata(axis?: string | null): { label: string; badgeColor: string } {
  if (!axis) return { label: "Non défini", badgeColor: "bg-slate-100 text-slate-700 border-slate-200" };
  const normalized = axis.trim().toUpperCase();
  if (AXIS_METADATA[normalized]) {
    return AXIS_METADATA[normalized];
  }
  const dynamicProv = DYNAMIC_PROVINCE_AXES.find((a) => a.code === normalized);
  if (dynamicProv) {
    return {
      label: dynamicProv.label,
      badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
    };
  }
  if (normalized.includes("PROV")) {
    const rawName = normalized
      .replace("AXE_PROVINCE_", "")
      .replace("AXE_PROV_", "")
      .replace("AXE_", "")
      .replace(/_/g, " ");
    return {
      label: `Axe Province ${rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase()}`,
      badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
    };
  }
  return {
    label: normalized.replace("AXE_", "Axe ").replace(/_/g, " "),
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
  };
}
