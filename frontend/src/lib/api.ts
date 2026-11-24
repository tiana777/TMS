import { CompanySettings, Parcel, ParcelHistoryItem, UserItem } from "@/types";

export const getApiBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname || "localhost";
    return `http://${host}:8000/api/v1`;
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
};

export const API_BASE_URL = getApiBaseUrl();

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: string;
  username: string;
  nom_complet: string;
  id: number;
  assigned_flux?: string | null;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  role: string;
  nom_complet: string;
  password: string;
  assigned_flux?: string | null;
}

export interface UpdateUserPayload {
  nom_complet?: string;
  email?: string;
  role?: string;
  password?: string;
  assigned_flux?: string | null;
  actif?: boolean;
}

export async function loginApi(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Identifiants incorrects (login ou mot de passe invalide).");
  }
  return await res.json();
}

export async function fetchUsers(role?: string, includeInactive: boolean = true): Promise<UserItem[]> {
  try {
    let url = `${getApiBaseUrl()}/auth/users`;
    const params = new URLSearchParams();
    if (role && role !== "ALL") params.append("role", role);
    if (!includeInactive) params.append("include_inactive", "false");
    const qs = params.toString();
    if (qs) url += `?${qs}`;

    const headers = getAuthHeaders();
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error("Erreur lors du chargement des utilisateurs.");
    return await res.json();
  } catch (e) {
    console.warn("API offline or error loading users", e);
    return [];
  }
}

export async function createUser(payload: CreateUserPayload): Promise<UserItem> {
  const headers = getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/auth/users`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la création de l'utilisateur.");
  }
  return await res.json();
}

export async function toggleUserStatus(userId: number): Promise<UserItem> {
  const headers = getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/auth/users/${userId}/toggle-status`, {
    method: "PATCH",
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la modification du statut du compte.");
  }
  return await res.json();
}

export async function updateUser(userId: number, payload: UpdateUserPayload): Promise<UserItem> {
  const headers = getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/auth/users/${userId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la mise à jour de l'utilisateur.");
  }
  return await res.json();
}

export async function deleteUser(userId: number) {
  const headers = getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/auth/users/${userId}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la suppression du compte.");
  }
  return await res.json();
}


export async function fetchVendors(typeExpediteur?: string) {
  try {
    const url = typeExpediteur
      ? `${getApiBaseUrl()}/master/vendors?type_expediteur=${encodeURIComponent(typeExpediteur)}`
      : `${getApiBaseUrl()}/master/vendors`;
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
    const url = type_axe ? `${getApiBaseUrl()}/master/axes?type_axe=${encodeURIComponent(type_axe)}` : `${getApiBaseUrl()}/master/axes`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Erreur chargement axes");
    return await res.json();
  } catch (e) {
    console.warn("API offline, using fallback axes", e);
    return [];
  }
}

export const DEFAULT_FALLBACK_COURIERS = [
  {
    id: 1,
    name: "Rakoto Jean (Livreur 01 - Moto)",
    phone: "0341234567",
    phone_formatted: "034 12 345 67",
    vehicle_type: "Scooter 110cc",
    security_deposit: 150000,
    security_deposit_formatted: "150 000 Ar",
    max_parcels: 30,
    assigned_axis: "AXE_AMPITATAFIKA",
    active: true,
    today_parcels_count: 0,
    disputes_count: 0,
  },
  {
    id: 2,
    name: "Rabe Michel (Livreur 02 - Moto)",
    phone: "0321122334",
    phone_formatted: "032 11 223 34",
    vehicle_type: "Scooter 125cc",
    security_deposit: 150000,
    security_deposit_formatted: "150 000 Ar",
    max_parcels: 30,
    assigned_axis: "AXE_AMBOHIMANGAKELY",
    active: true,
    today_parcels_count: 0,
    disputes_count: 0,
  },
  {
    id: 3,
    name: "Andry Nirina (Livreur 03 - Moto)",
    phone: "0334455667",
    phone_formatted: "033 44 556 67",
    vehicle_type: "Moto Cross 150cc",
    security_deposit: 150000,
    security_deposit_formatted: "150 000 Ar",
    max_parcels: 30,
    assigned_axis: "AXE_SABOTSY_NAMEHANA",
    active: true,
    today_parcels_count: 0,
    disputes_count: 0,
  },
  {
    id: 4,
    name: "Randria Paul (Livreur 04 - Fourgonnette)",
    phone: "0348899001",
    phone_formatted: "034 88 990 01",
    vehicle_type: "Fourgonnette Navette Transit",
    security_deposit: 150000,
    security_deposit_formatted: "150 000 Ar",
    max_parcels: 30,
    assigned_axis: "AXE_IVATO",
    active: true,
    today_parcels_count: 0,
    disputes_count: 0,
  },
];

export async function fetchCouriers(axis?: string, includeInactive: boolean = false) {
  try {
    let url = `${getApiBaseUrl()}/couriers`;
    const params = new URLSearchParams();
    if (axis && axis !== "ALL") params.append("axis", axis);
    if (includeInactive) params.append("include_inactive", "true");
    const qs = params.toString();
    if (qs) url += `?${qs}`;

    const headers = getAuthHeaders();
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error("Erreur chargement livreurs");
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data : DEFAULT_FALLBACK_COURIERS;
  } catch (e) {
    console.warn("API offline or error loading couriers, using fallback couriers", e);
    return DEFAULT_FALLBACK_COURIERS;
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
  const res = await fetch(`${getApiBaseUrl()}/couriers`, {
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
  const res = await fetch(`${getApiBaseUrl()}/couriers/${courierId}`, {
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
  const res = await fetch(`${getApiBaseUrl()}/couriers/${courierId}/toggle-status`, {
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
  const res = await fetch(`${getApiBaseUrl()}/couriers/${courierId}`, {
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
  const res = await fetch(`${getApiBaseUrl()}/couriers/${courierId}/axis`, {
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
  const res = await fetch(`${getApiBaseUrl()}/couriers/${courierId}/capacity`, {
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
  courier_id?: number;
  flux_type?: string;
  receptionniste_id?: number;
}) {
  try {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.axis) params.append("axis", filters.axis);
    if (filters?.date) params.append("date", filters.date);
    if (filters?.tour_id !== undefined) params.append("tour_id", filters.tour_id.toString());
    if (filters?.courier_id !== undefined) params.append("courier_id", filters.courier_id.toString());
    if (filters?.flux_type) params.append("flux_type", filters.flux_type);
    if (filters?.receptionniste_id !== undefined) params.append("receptionniste_id", filters.receptionniste_id.toString());

    const url = `${getApiBaseUrl()}/parcels${params.toString() ? `?${params.toString()}` : ""}`;
    const headers = getAuthHeaders();
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error("Erreur chargement colis");
    return await res.json();
  } catch (e) {
    console.warn("API offline or error loading parcels", e);
    return [];
  }
}

export async function fetchTours(date?: string) {
  try {
    const url = date ? `${getApiBaseUrl()}/tours?date=${encodeURIComponent(date)}` : `${getApiBaseUrl()}/tours`;
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
    const res = await fetch(`${getApiBaseUrl()}/tours/${tourId}`);
    if (!res.ok) throw new Error("Erreur chargement détail de la tournée");
    return await res.json();
  } catch (e) {
    console.warn("API offline, using fallback tour detail", e);
    return null;
  }
}

function getAuthHeaders(): Record<string, string> {
  let token = typeof window !== "undefined" ? localStorage.getItem("tms_token") : null;
  const userRole = typeof window !== "undefined" ? localStorage.getItem("tms_user_role") || "SUPERVISEUR" : "SUPERVISEUR";
  const userId = typeof window !== "undefined" ? localStorage.getItem("tms_user_id") : null;
  const username = typeof window !== "undefined" ? localStorage.getItem("tms_username") : null;

  // Check if JWT token is expired, clean up automatically to avoid 401 cascade
  if (token) {
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        let payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const rem = payloadB64.length % 4;
        if (rem) payloadB64 += "=".repeat(4 - rem);
        const payload = JSON.parse(atob(payloadB64));
        if (payload.exp && payload.exp < Date.now() / 1000) {
          localStorage.removeItem("tms_token");
          token = null;
        }
      }
    } catch {
      localStorage.removeItem("tms_token");
      token = null;
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-User-Role": userRole,
  };
  if (userId) headers["X-User-Id"] = userId;
  if (username) headers["X-Username"] = username;
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export async function createOrAssignTour(courierId: number, tourDate: string, parcelIds: number[]) {
  const headers = getAuthHeaders();

  const res = await fetch(`${getApiBaseUrl()}/tours`, {
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

  const res = await fetch(`${getApiBaseUrl()}/parcels/${parcelId}/reassign`, {
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

  const res = await fetch(`${getApiBaseUrl()}/tours/${tourId}/unassign/${parcelId}`, {
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

  const res = await fetch(`${getApiBaseUrl()}/parcels/batch`, {
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

  const res = await fetch(`${getApiBaseUrl()}/tours/${tourId}/start`, {
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
  encaissement_lieu?: string;
  repartition_vendeur?: string;
  montant_encaisse_livreur?: number;
  montant_encaisse_vendeur?: number;
}

export async function updateParcelStatus(parcelId: number, payload: UpdateParcelStatusPayload) {
  const headers = getAuthHeaders();

  const res = await fetch(`${getApiBaseUrl()}/parcels/${parcelId}/status`, {
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
  payload: {
    recipient_phone?: string;
    recipient_name?: string;
    delivery_address?: string;
    designation?: string;
    observation?: string;
    merchandise_amount?: number;
    delivery_fee?: number;
    encaissement_lieu?: string;
  }
) {
  const headers = getAuthHeaders();

  const res = await fetch(`${getApiBaseUrl()}/parcels/${parcelId}/contact`, {
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

  const res = await fetch(`${getApiBaseUrl()}/parcels/${parcelId}/prepaid`, {
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

  const res = await fetch(`${getApiBaseUrl()}/parcels/${parcelId}/axis`, {
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

export async function deleteParcel(parcelId: number): Promise<{ success: boolean; message: string }> {
  const headers = getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/parcels/${parcelId}`, {
    method: "DELETE",
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la suppression du colis.");
  }

  return await res.json();
}

export async function bulkDeleteParcels(parcelIds: number[]): Promise<{
  success: boolean;
  deleted_count: number;
  deleted_ids: number[];
  errors: string[];
}> {
  const headers = getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/parcels/bulk-delete`, {
    method: "POST",
    headers,
    body: JSON.stringify({ parcel_ids: parcelIds }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la suppression groupée des colis.");
  }

  return await res.json();
}

export async function fetchParcelDetail(parcelId: number): Promise<Parcel> {
  const headers = getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/parcels/${parcelId}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors du chargement du colis.");
  }
  return await res.json();
}

export async function fetchParcelHistory(parcelId: number): Promise<ParcelHistoryItem[]> {
  const headers = getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/parcels/${parcelId}/history`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors du chargement de l'historique.");
  }
  return await res.json();
}

export async function closeTour(tourId: number, cashAndMobileRemitted: number) {
  const headers = getAuthHeaders();

  const res = await fetch(`${getApiBaseUrl()}/tours/${tourId}/close`, {
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

  const res = await fetch(`${getApiBaseUrl()}/parcels/bulk-close-cash`, {
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
    const url = `${getApiBaseUrl()}/disputes${courierId ? `?courier_id=${courierId}` : ""}`;
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
  const res = await fetch(`${getApiBaseUrl()}/disputes`, {
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
  const res = await fetch(`${getApiBaseUrl()}/disputes/${debtId}/repay`, {
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
  const res = await fetch(`${getApiBaseUrl()}/disputes/${debtId}/force-majeure`, {
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
    const res = await fetch(`${getApiBaseUrl()}/couriers/scorecards/leaderboard?period=${period}`, { headers });
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
  const res = await fetch(`${getApiBaseUrl()}/master/vendors`, {
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
  const res = await fetch(`${getApiBaseUrl()}/master/vendors/${vendorId}`, {
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
      ? `${getApiBaseUrl()}/master/partners?type=${encodeURIComponent(type)}`
      : `${getApiBaseUrl()}/master/partners`;
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
  const res = await fetch(`${getApiBaseUrl()}/master/partners`, {
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

export async function updatePartner(
  partnerId: number,
  payload: {
    nom: string;
    contact?: string;
    type: string;
    gare_rattachement?: string;
  }
) {
  const headers = getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/master/partners/${partnerId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la mise à jour du partenaire.");
  }
  return await res.json();
}

export async function deletePartner(partnerId: number) {
  const headers = getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/master/partners/${partnerId}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la suppression du partenaire.");
  }
  return await res.json();
}

export async function createAxis(data: { code: string; libelle: string; type_axe?: string; zones?: string[] }) {
  const headers = getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/master/axes`, {
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
  const res = await fetch(`${getApiBaseUrl()}/master/axes/${axisId}`, {
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
  const res = await fetch(`${getApiBaseUrl()}/master/axes/${axisId}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la suppression de l'axe.");
  }
  return await res.json();
}

export async function fetchMasterZones(params?: { axe_code?: string; type?: string; search?: string }) {
  try {
    const q = new URLSearchParams();
    if (params?.axe_code) q.append("axe_code", params.axe_code);
    if (params?.type) q.append("type", params.type);
    if (params?.search) q.append("search", params.search);
    const qs = q.toString() ? `?${q.toString()}` : "";
    const res = await fetch(`${getApiBaseUrl()}/master/zones${qs}`);
    if (!res.ok) throw new Error("Erreur chargement zones");
    return await res.json();
  } catch (err) {
    console.warn("fetchMasterZones warning:", err);
    return [];
  }
}

export async function createMasterZone(data: {
  nom: string;
  axe_code?: string;
  axe_id?: number;
  type?: "quartier" | "gare" | "cooperative";
  tarif_livraison?: number;
  destinations?: string;
}) {
  const headers = getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/master/zones`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de l'enregistrement de la gare/zone.");
  }
  return await res.json();
}

export async function addZoneToAxis(axisId: number, nom: string) {
  const headers = getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/master/axes/${axisId}/zones`, {
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
  const res = await fetch(`${getApiBaseUrl()}/master/axes/${axisId}/zones/${zoneId}`, {
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
    const res = await fetch(`${getApiBaseUrl()}/couriers/${courierId}/scorecard?period=${period}`, { headers });
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
    ? `${getApiBaseUrl()}/payouts/pending?vendor_id=${vendorId}`
    : `${getApiBaseUrl()}/payouts/pending`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors du chargement des reversements en attente.");
  }
  return await res.json();
}

export async function fetchPendingPayoutByVendor(vendorId: number) {
  const headers = getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/payouts/pending/${vendorId}`, { headers });
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
  const res = await fetch(`${getApiBaseUrl()}/payouts`, {
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
    ? `${getApiBaseUrl()}/payouts?vendor_id=${vendorId}`
    : `${getApiBaseUrl()}/payouts`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors du chargement de l'historique des reversements.");
  }
  return await res.json();
}

export async function fetchPayoutById(payoutId: number) {
  const headers = getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/payouts/${payoutId}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Bordereau de reversement introuvable.");
  }
  return await res.json();
}

export async function fetchCompanySettings(): Promise<CompanySettings> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/master/company-settings`);
    if (!res.ok) throw new Error("Erreur chargement paramètres entreprise");
    return await res.json();
  } catch (e) {
    return {
      id: 1,
      app_name: process.env.NEXT_PUBLIC_APP_NAME || "TMS EXPRESS 5.0",
      company_name: process.env.NEXT_PUBLIC_COMPANY_NAME || "TMS EXPRESS MADAGASCAR",
      nif: process.env.NEXT_PUBLIC_COMPANY_NIF || "4001234567",
      stat: process.env.NEXT_PUBLIC_COMPANY_STAT || "52291 11 2021 0 10245",
      rcs: "RCS Antananarivo 2021 B 00123",
      cif: "0123456/DGI-J",
      address: "Tsiazotafo / Analakely, Antananarivo 101",
      phone: "+261 34 00 000 00",
      email: "contact@tmsexpress.mg",
      website: "www.tmsexpress.mg",
      currency: "MGA",
      footer_text: "Merci pour votre confiance. Envois garantis et tracés.",
    };
  }
}

export async function updateCompanySettings(data: Partial<CompanySettings>): Promise<CompanySettings> {
  const headers = getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/master/company-settings`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la mise à jour des paramètres entreprise");
  }
  return await res.json();
}

export interface AIRecognizedParcel {
  tracking_number?: string;
  recipient_name: string;
  recipient_phone: string;
  delivery_address: string;
  merchandise_amount: number;
  delivery_fee: number;
  observation?: string;
}

export interface AIRecognitionResult {
  status: string;
  engine: string;
  model: string;
  parcels: AIRecognizedParcel[];
  count: number;
  message: string;
  has_api_key: boolean;
}

export async function recognizeManifestAI(params: {
  imageBase64?: string;
  customApiKey?: string;
}): Promise<AIRecognitionResult> {
  const headers = getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/manifests/recognize-ai-json`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      image_base64: params.imageBase64,
      custom_api_key: params.customApiKey,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erreur lors de la reconnaissance IA du bordereau");
  }

  return await res.json();
}



