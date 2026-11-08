const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function fetchVendors(typeExpediteur?: string) {
  try {
    const url = typeExpediteur
      ? `${API_BASE_URL}/master/vendors?type_expediteur=${encodeURIComponent(typeExpediteur)}`
      : `${API_BASE_URL}/master/vendors`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Erreur chargement donneurs d'ordre");
    return await res.json();
  } catch (e) {
    console.warn("API offline, using fallback vendors", e);
    const fallbacks = [
      {
        id: 1,
        nom: "Mod'Tanà Boutique",
        type_expediteur: "CYBERMARCHAND",
        telephone: "0345566778",
        contact_responsable: "Madame Voahirana",
        adresse: "Box 14, Pavillon Analakely",
        modalite_paiement: "COMPTANT",
      },
      {
        id: 2,
        nom: "Cabinet Juridique & Audit Tanà",
        type_expediteur: "ENTREPRISE",
        telephone: "0329988776",
        contact_responsable: "Maître Andry Rabemananjara",
        adresse: "Immeuble ARO, Antsakaviro",
        nif_stat: "4001234567 / 2021",
        modalite_paiement: "FACTURE_MENSUELLE",
      },
      {
        id: 3,
        nom: "Rasoamalala Hanta (Particulier)",
        type_expediteur: "PARTICULIER",
        telephone: "0331234599",
        contact_responsable: "Hanta Rasoamalala",
        adresse: "Lot IVG 34 Ambohimanarina",
        modalite_paiement: "COMPTANT",
      },
    ];
    return typeExpediteur
      ? fallbacks.filter((v) => v.type_expediteur === typeExpediteur)
      : fallbacks;
  }
}

export async function fetchAxes() {
  try {
    const res = await fetch(`${API_BASE_URL}/master/axes`);
    if (!res.ok) throw new Error("Erreur chargement axes");
    return await res.json();
  } catch (e) {
    console.warn("API offline, using fallback axes", e);
    return [];
  }
}

export async function fetchCouriers() {
  try {
    const res = await fetch(`${API_BASE_URL}/couriers`);
    if (!res.ok) throw new Error("Erreur chargement livreurs");
    return await res.json();
  } catch (e) {
    console.warn("API offline, using fallback couriers", e);
    return [
      {
        id: 1,
        name: "RAKOTO Jean",
        phone: "0341122233",
        phone_formatted: "034 11 222 33",
        vehicle_type: "Moto Cross 150cc",
        security_deposit: 150000,
        security_deposit_formatted: "150 000 Ar",
        active: true,
      },
      {
        id: 2,
        name: "ANDRY Nirina",
        phone: "0324455566",
        phone_formatted: "032 44 555 66",
        vehicle_type: "Scooter 125cc",
        security_deposit: 150000,
        security_deposit_formatted: "150 000 Ar",
        active: true,
      },
      {
        id: 3,
        name: "SOLO Faneva",
        phone: "0337788899",
        phone_formatted: "033 77 888 99",
        vehicle_type: "Moto Trail 150cc",
        security_deposit: 150000,
        security_deposit_formatted: "150 000 Ar",
        active: true,
      },
      {
        id: 4,
        name: "NAVETTE Gares Routières",
        phone: "0381020304",
        phone_formatted: "038 10 203 04",
        vehicle_type: "Fourgonnette Transit",
        security_deposit: 300000,
        security_deposit_formatted: "300 000 Ar",
        active: true,
      },
    ];
  }
}

export async function fetchParcels(filters?: {
  status?: string;
  axis?: string;
  date?: string;
  tour_id?: number;
}) {
  try {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.axis) params.append("axis", filters.axis);
    if (filters?.date) params.append("date", filters.date);
    if (filters?.tour_id !== undefined) params.append("tour_id", filters.tour_id.toString());

    const url = `${API_BASE_URL}/parcels${params.toString() ? `?${params.toString()}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Erreur chargement colis");
    return await res.json();
  } catch (e) {
    console.warn("API offline, using fallback parcels", e);
    const fallbacks = [
      {
        id: 101,
        tracking_number: "0001",
        reception_date: "2026-11-08",
        vendor_id: 1,
        sender_type: "CYBERMARCHAND",
        sender_name: "Mod'Tanà Boutique",
        sender_phone: "0345566778",
        sender_phone_formatted: "034 55 667 78",
        sender_operator: "TELMA",
        recipient_name: "Madame Rasoa",
        recipient_phone: "0341234567",
        recipient_phone_formatted: "034 12 345 67",
        operator: "TELMA",
        delivery_address: "Itaosy Cité près Pharmacie",
        designation: "Robe de soirée en soie",
        axis: "AXE_RN1",
        axis_label: "AXE RN1 OUEST (Tsiazotafo ➔ Fenoarivo)",
        flux_type: "COD",
        merchandise_amount: 45000,
        delivery_fee: 5000,
        total_to_collect: 50000,
        total_to_collect_formatted: "50 000 Ar",
        partner_fee: 0,
        status: "EN_DEPOT",
        status_label: "En Dépôt (Stock Hub)",
        active: true,
      },
      {
        id: 102,
        tracking_number: "0002",
        reception_date: "2026-11-08",
        vendor_id: 2,
        sender_type: "ENTREPRISE",
        sender_name: "Cabinet Juridique & Audit Tanà",
        sender_phone: "0329988776",
        sender_phone_formatted: "032 99 887 76",
        sender_operator: "ORANGE",
        recipient_name: "Société Fiadanana",
        recipient_phone: "0325544332",
        recipient_phone_formatted: "032 55 443 32",
        operator: "ORANGE",
        delivery_address: "Zone Galaxy Andraharo Lot 4",
        designation: "Dossier audit certifié & contrats",
        axis: "AXE_RN4",
        axis_label: "AXE RN4 / DIGUE (Tsiazotafo ➔ Ivato Aéroport)",
        flux_type: "SIMPLE",
        merchandise_amount: 0,
        delivery_fee: 6000,
        total_to_collect: 6000,
        total_to_collect_formatted: "6 000 Ar",
        partner_fee: 0,
        status: "EN_DEPOT",
        status_label: "En Dépôt (Stock Hub)",
        active: true,
      },
      {
        id: 103,
        tracking_number: "0003",
        reception_date: "2026-11-08",
        vendor_id: 1,
        sender_type: "CYBERMARCHAND",
        sender_name: "Mod'Tanà Boutique",
        sender_phone: "0345566778",
        sender_phone_formatted: "034 55 667 78",
        sender_operator: "TELMA",
        recipient_name: "M. Andry",
        recipient_phone: "0331122334",
        recipient_phone_formatted: "033 11 223 34",
        operator: "AIRTEL",
        delivery_address: "Gare Ambodivona Guichet Cotisse Toamasina",
        designation: "Colis prêt-à-porter 3 pièces",
        axis: "AXE_PROVINCE",
        axis_label: "AXE PROVINCES & GARES ROUTIÈRES",
        flux_type: "PROVINCE",
        merchandise_amount: 85000,
        delivery_fee: 10000,
        total_to_collect: 95000,
        total_to_collect_formatted: "95 000 Ar",
        partner_fee: 10000,
        status: "EN_DEPOT",
        status_label: "En Dépôt (Stock Hub)",
        active: true,
      },
      {
        id: 104,
        tracking_number: "0004",
        reception_date: "2026-11-08",
        vendor_id: 3,
        sender_type: "PARTICULIER",
        sender_name: "Rasoamalala Hanta",
        sender_phone: "0331234599",
        sender_phone_formatted: "033 12 345 99",
        sender_operator: "AIRTEL",
        recipient_name: "Rakotoniaina Paul",
        recipient_phone: "0348877665",
        recipient_phone_formatted: "034 88 776 65",
        operator: "TELMA",
        delivery_address: "Gare Fasan'ny Karana vers Antsirabe Kofmad",
        designation: "Effets personnels et panier d'artisanat",
        axis: "AXE_PROVINCE",
        axis_label: "AXE PROVINCES & GARES ROUTIÈRES",
        flux_type: "PROVINCE",
        merchandise_amount: 30000,
        delivery_fee: 8000,
        total_to_collect: 38000,
        total_to_collect_formatted: "38 000 Ar",
        partner_fee: 8000,
        status: "EN_DEPOT",
        status_label: "En Dépôt (Stock Hub)",
        active: true,
      },
    ];
    let res = fallbacks;
    if (filters?.status) res = res.filter((p) => p.status === filters.status);
    if (filters?.axis) res = res.filter((p) => p.axis === filters.axis);
    return res;
  }
}

export async function fetchTours(date?: string) {
  try {
    const url = date ? `${API_BASE_URL}/tours?date=${encodeURIComponent(date)}` : `${API_BASE_URL}/tours`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Erreur chargement tournées");
    return await res.json();
  } catch (e) {
    console.warn("API offline, using fallback tours", e);
    return [];
  }
}

export async function fetchTourDetail(tourId: number) {
  try {
    const res = await fetch(`${API_BASE_URL}/tours/${tourId}`);
    if (!res.ok) throw new Error("Erreur chargement détail de la tournée");
    return await res.json();
  } catch (e) {
    console.warn("API offline, using fallback tour detail", e);
    return null;
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("tms_token") : null;
  const userRole = typeof window !== "undefined" ? localStorage.getItem("tms_user_role") || "SUPERVISEUR" : "SUPERVISEUR";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-User-Role": userRole,
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export async function createOrAssignTour(courierId: number, tourDate: string, parcelIds: number[]) {
  const headers = getAuthHeaders();

  const res = await fetch(`${API_BASE_URL}/tours`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      courier_id: courierId,
      tour_date: tourDate,
      parcel_ids: parcelIds,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de l'assignation de la tournée.");
  }

  return await res.json();
}

export async function reassignParcel(
  parcelId: number,
  courierId: number,
  options?: { tourId?: number; tourDate?: string; reason?: string }
) {
  const headers = getAuthHeaders();

  const res = await fetch(`${API_BASE_URL}/parcels/${parcelId}/reassign`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      courier_id: courierId,
      tour_id: options?.tourId,
      tour_date: options?.tourDate,
      reason: options?.reason,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la réassignation du colis.");
  }

  return await res.json();
}

export async function unassignParcelFromTour(tourId: number, parcelId: number) {
  const headers = getAuthHeaders();

  const res = await fetch(`${API_BASE_URL}/tours/${tourId}/unassign/${parcelId}`, {
    method: "POST",
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors du retrait du colis de la tournée.");
  }

  return await res.json();
}

export async function createParcelBatch(parcels: any[]) {
  const headers = getAuthHeaders();

  const res = await fetch(`${API_BASE_URL}/parcels/batch`, {
    method: "POST",
    headers,
    body: JSON.stringify({ parcels }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Erreur lors de l'enregistrement du lot.");
  }

  return await res.json();
}

export async function startTour(tourId: number) {
  const headers = getAuthHeaders();

  const res = await fetch(`${API_BASE_URL}/tours/${tourId}/start`, {
    method: "POST",
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors du démarrage de la tournée.");
  }

  return await res.json();
}

export interface UpdateParcelStatusPayload {
  status: string;
  payment_method?: string; // ESPECES, MVOLA, AIRTEL, ORANGE_MONEY
  reschedule_date?: string; // YYYY-MM-DD
  incident_reason?: string;
  partner_name?: string;
  partner_reference?: string;
  partner_fee?: number;
  driver_contact?: string;
  vehicle_plate?: string;
}

export async function updateParcelStatus(parcelId: number, payload: UpdateParcelStatusPayload) {
  const headers = getAuthHeaders();

  const res = await fetch(`${API_BASE_URL}/parcels/${parcelId}/status`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la mise à jour du statut du colis.");
  }

  return await res.json();
}

export async function updateParcelContact(
  parcelId: number,
  payload: { recipient_phone?: string; recipient_name?: string; delivery_address?: string }
) {
  const headers = getAuthHeaders();

  const res = await fetch(`${API_BASE_URL}/parcels/${parcelId}/contact`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la mise à jour des coordonnées.");
  }

  return await res.json();
}

export interface MarkPrepaidPayload {
  prepaid_type: "ALL" | "MERCHANDISE_ONLY";
  payment_method: string;
  payment_reference?: string;
}

export async function markParcelPrepaid(parcelId: number, payload: MarkPrepaidPayload) {
  const headers = getAuthHeaders();

  const res = await fetch(`${API_BASE_URL}/parcels/${parcelId}/prepaid`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de l'enregistrement du paiement anticipé.");
  }

  return await res.json();
}

export async function overrideParcelAxis(parcelId: number, axis: string) {
  const headers = getAuthHeaders();

  const res = await fetch(`${API_BASE_URL}/parcels/${parcelId}/axis`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ axis }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la modification de l'axe logistique.");
  }

  return await res.json();
}

export async function closeTour(tourId: number, cashAndMobileRemitted: number) {
  const headers = getAuthHeaders();

  const res = await fetch(`${API_BASE_URL}/tours/${tourId}/close`, {
    method: "POST",
    headers,
    body: JSON.stringify({ cash_and_mobile_remitted: cashAndMobileRemitted }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la clôture de la tournée.");
  }

  return await res.json();
}

export async function bulkCloseCash(parcelIds: number[]) {
  const headers = getAuthHeaders();

  const res = await fetch(`${API_BASE_URL}/parcels/bulk-close-cash`, {
    method: "POST",
    headers,
    body: JSON.stringify({ parcel_ids: parcelIds }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la validation groupée en caisse.");
  }

  return await res.json();
}

export async function fetchDisputes(courierId?: number) {
  try {
    const headers = getAuthHeaders();
    const url = `${API_BASE_URL}/disputes${courierId ? `?courier_id=${courierId}` : ""}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error("Erreur chargement des litiges");
    return await res.json();
  } catch (e) {
    console.warn("API offline, fallback disputes", e);
    return [
      {
        id: 1,
        reference_litige: "LIT-2026-0001",
        livreur_id: 1,
        tournee_id: 1,
        incident_type: "DEFICIT_COD",
        initial_amount: 15000,
        refunded_amount: 0,
        remaining_balance: 15000,
        status: "OUVERTE",
        reason: "Déficit de caisse constaté lors de la clôture de tournée",
        incident_date: "2026-11-08",
      },
    ];
  }
}

export async function createDispute(payload: {
  livreur_id: number;
  incident_type: string;
  initial_amount: number;
  reason: string;
  incident_date: string;
  colis_id?: number;
  tournee_id?: number;
}) {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/disputes`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la création du dossier de litige.");
  }
  return await res.json();
}

export async function repayDebt(
  debtId: number,
  amount: number,
  mode: string = "COMPTANT",
  closureDate?: string
) {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/disputes/${debtId}/repay`, {
    method: "POST",
    headers,
    body: JSON.stringify({ amount, mode, closure_date: closureDate }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de l'enregistrement de l'apurement.");
  }
  return await res.json();
}

export async function cancelDebtForceMajeure(debtId: number, policeReport: string) {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/disputes/${debtId}/force-majeure`, {
    method: "POST",
    headers,
    body: JSON.stringify({ police_report: policeReport }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de l'annulation pour force majeure.");
  }
  return await res.json();
}

export async function fetchFleetLeaderboard(period: string) {
  try {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/couriers/scorecards/leaderboard?period=${period}`, { headers });
    if (!res.ok) throw new Error("Erreur chargement du leaderboard");
    return await res.json();
  } catch (e) {
    console.warn("API offline, fallback fleet leaderboard", e);
    return [
      {
        livreur_id: 1,
        courier_name: "RAKOTO Jean",
        period,
        total_assigned: 45,
        total_delivered: 43,
        success_rate: 95.6,
        punctuality_rate: 93.3,
        quality_rate: 100.0,
        cash_rigor_rate: 100.0,
        global_score: 96.5,
        tier: "OR",
        bonus_amount: 150000,
        bonus_formatted: "150 000 Ar",
      },
      {
        livreur_id: 2,
        courier_name: "ANDRY Nirina",
        period,
        total_assigned: 40,
        total_delivered: 36,
        success_rate: 90.0,
        punctuality_rate: 88.0,
        quality_rate: 98.0,
        cash_rigor_rate: 95.0,
        global_score: 91.6,
        tier: "ARGENT",
        bonus_amount: 80000,
        bonus_formatted: "80 000 Ar",
      },
      {
        livreur_id: 3,
        courier_name: "SOLO Faneva",
        period,
        total_assigned: 38,
        total_delivered: 31,
        success_rate: 81.6,
        punctuality_rate: 80.0,
        quality_rate: 95.0,
        cash_rigor_rate: 85.0,
        global_score: 83.8,
        tier: "BRONZE",
        bonus_amount: 0,
        bonus_formatted: "0 Ar",
      },
    ];
  }
}

export async function createVendor(payload: {
  nom: string;
  type_expediteur: string;
  telephone?: string;
  adresse?: string;
  email?: string;
  contact_responsable?: string;
  nif_stat?: string;
  modalite_paiement: string;
}) {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/master/vendors`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la création de l'expéditeur.");
  }
  return await res.json();
}

export async function updateVendor(
  vendorId: number,
  payload: {
    nom?: string;
    type_expediteur?: string;
    telephone?: string;
    adresse?: string;
    email?: string;
    contact_responsable?: string;
    nif_stat?: string;
    modalite_paiement?: string;
    actif?: number;
  }
) {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/master/vendors/${vendorId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la mise à jour de l'expéditeur.");
  }
  return await res.json();
}

export async function fetchPartners(type?: string) {
  try {
    const url = type
      ? `${API_BASE_URL}/master/partners?type=${encodeURIComponent(type)}`
      : `${API_BASE_URL}/master/partners`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Erreur chargement des partenaires");
    return await res.json();
  } catch (e) {
    console.warn("API offline, fallback partners", e);
    return [
      {
        id: 1,
        nom: "Cotisse Transport",
        contact: "032 11 020 30",
        type: "COOPERATIVE",
        gare_rattachement: "Gare Routière Ambodivona",
      },
      {
        id: 2,
        nom: "Kofmad Province",
        contact: "034 22 334 45",
        type: "COOPERATIVE",
        gare_rattachement: "Gare Fasan'ny Karana",
      },
      {
        id: 3,
        nom: "Trans Tsiry RN7",
        contact: "033 44 556 67",
        type: "COOPERATIVE",
        gare_rattachement: "Gare Fasan'ny Karana",
      },
      {
        id: 4,
        nom: "Gare Routière Ambodivona",
        contact: "Guichet Central",
        type: "GARE",
        gare_rattachement: "Ambodivona",
      },
      {
        id: 5,
        nom: "Gare Routière Fasan'ny Karana",
        contact: "Guichet Central",
        type: "GARE",
        gare_rattachement: "Fasan'ny Karana",
      },
      {
        id: 6,
        nom: "Gare Routière Andohatapenaka",
        contact: "Guichet Central",
        type: "GARE",
        gare_rattachement: "Andohatapenaka",
      },
    ];
  }
}

export async function createPartner(payload: {
  nom: string;
  contact?: string;
  type: string;
  gare_rattachement?: string;
}) {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/master/partners`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la création du partenaire.");
  }
  return await res.json();
}

export async function addZoneToAxis(axisId: number, nom: string) {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/master/axes/${axisId}/zones`, {
    method: "POST",
    headers,
    body: JSON.stringify({ nom }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de l'ajout de la zone.");
  }
  return await res.json();
}

export async function fetchScorecard(courierId: number, period: string) {
  try {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/couriers/${courierId}/scorecard?period=${period}`, { headers });
    if (!res.ok) throw new Error("Erreur chargement du scorecard");
    return await res.json();
  } catch (e) {
    console.warn("API offline, fallback scorecard", e);
    return {
      livreur_id: courierId,
      period,
      total_assigned: 20,
      total_delivered: 19,
      success_rate: 95.0,
      punctuality_rate: 96.0,
      quality_rate: 100.0,
      cash_rigor_rate: 100.0,
      global_score: 96.5,
      tier: "OR",
      bonus_amount: 50000,
      bonus_formatted: "50 000 Ar",
    };
  }
}

