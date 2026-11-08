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

