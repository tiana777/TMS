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

export async function fetchAxes(type_axe?: string) {
  try {
    const url = type_axe ? `${API_BASE_URL}/master/axes?type_axe=${encodeURIComponent(type_axe)}` : `${API_BASE_URL}/master/axes`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Erreur chargement axes");
    return await res.json();
  } catch (e) {
    console.warn("API offline, using fallback axes", e);
    return [];
  }
}

export async function fetchCouriers(axis?: string, includeInactive: boolean = false) {
  try {
    let url = `${API_BASE_URL}/couriers`;
    const params = new URLSearchParams();
    if (axis && axis !== "ALL") params.append("axis", axis);
    if (includeInactive) params.append("include_inactive", "true");
    const qs = params.toString();
    if (qs) url += `?${qs}`;

    const headers = getAuthHeaders();
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error("Erreur chargement livreurs");
    return await res.json();
  } catch (e) {
    console.warn("API offline or error loading couriers", e);
    return [];
  }
}

export async function createCourier(payload: {
  name: string;
  phone: string;
  vehicle_type: string;
  security_deposit?: number;
  max_parcels?: number;
  assigned_axis?: string | null;
}) {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/couriers`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la création du livreur.");
  }
  return await res.json();
}

export async function updateCourierProfile(
  courierId: number,
  payload: {
    name?: string;
    phone?: string;
    vehicle_type?: string;
    security_deposit?: number;
    max_parcels?: number;
    assigned_axis?: string | null;
    active?: boolean;
  }
) {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/couriers/${courierId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la mise à jour du profil du livreur.");
  }
  return await res.json();
}

export async function toggleCourierStatus(courierId: number) {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/couriers/${courierId}/toggle-status`, {
    method: "PATCH",
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la modification du statut du livreur.");
  }
  return await res.json();
}

export async function deleteCourier(courierId: number) {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/couriers/${courierId}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de l'archivage du livreur.");
  }
  return await res.json();
}

export async function updateCourierAxis(courierId: number, axis: string | null) {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/couriers/${courierId}/axis`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ assigned_axis: axis }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la mise à jour de l'axe du livreur.");
  }
  return await res.json();
}

export async function updateCourierCapacity(courierId: number, maxParcels: number) {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/couriers/${courierId}/capacity`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ max_parcels: maxParcels }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la mise à jour de la capacité du livreur.");
  }
  return await res.json();
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
    console.warn("API offline or error loading parcels", e);
    return [];
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
    console.warn("API offline or error loading disputes", e);
    return [];
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
    console.warn("API offline or error loading fleet leaderboard", e);
    return [];
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

export async function createAxis(data: { code: string; libelle: string; type_axe?: string; zones?: string[] }) {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/master/axes`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la création de l'axe.");
  }
  return await res.json();
}

export async function updateAxis(
  axisId: number,
  data: { code?: string; libelle?: string; type_axe?: string; actif?: number }
) {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/master/axes/${axisId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la modification de l'axe.");
  }
  return await res.json();
}

export async function deleteAxis(axisId: number) {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/master/axes/${axisId}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la suppression de l'axe.");
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

export async function removeZoneFromAxis(axisId: number, zoneId: number) {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/master/axes/${axisId}/zones/${zoneId}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors du retrait de la zone.");
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
    console.warn("API offline or error loading scorecard", e);
    return null;
  }
}

export async function fetchPendingPayouts(vendorId?: number) {
  const headers = getAuthHeaders();
  const url = vendorId
    ? `${API_BASE_URL}/payouts/pending?vendor_id=${vendorId}`
    : `${API_BASE_URL}/payouts/pending`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors du chargement des reversements en attente.");
  }
  return await res.json();
}

export async function fetchPendingPayoutByVendor(vendorId: number) {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/payouts/pending/${vendorId}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors du chargement du reversement.");
  }
  return await res.json();
}

export async function createPayout(payload: {
  vendor_id: number;
  parcel_ids: number[];
  payment_mode?: string;
  payment_reference?: string;
  notes?: string;
  indemnisation_litiges?: number;
}) {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/payouts`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la validation du reversement.");
  }
  return await res.json();
}

export async function fetchPayouts(vendorId?: number) {
  const headers = getAuthHeaders();
  const url = vendorId
    ? `${API_BASE_URL}/payouts?vendor_id=${vendorId}`
    : `${API_BASE_URL}/payouts`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors du chargement de l'historique des reversements.");
  }
  return await res.json();
}

export async function fetchPayoutById(payoutId: number) {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/payouts/${payoutId}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Bordereau de reversement introuvable.");
  }
  return await res.json();
}


