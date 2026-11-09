export type Operator = "TELMA" | "ORANGE" | "AIRTEL";

export type SenderType = "CYBERMARCHAND" | "PARTICULIER" | "ENTREPRISE";

export type FluxType = "COD" | "SIMPLE" | "RETOUR" | "PROVINCE";

export type ParcelStatus =
  | "EN_DEPOT"
  | "ASSIGNE"
  | "EN_COURS"
  | "SOUS_TRAITE"
  | "LIVRE"
  | "ENCAISSE"
  | "LIVRE_ENCAISSE"
  | "REPORTE"
  | "ANNULE_RETOUR"
  | "RETOUR_BOUTIQUE"
  | "CLOTURE_CAISSE";

export type LogisticAxis =
  | "AXE_CENTRE_1"
  | "AXE_CENTRE_2"
  | "AXE_ITAOSY"
  | "AXE_AMPITATAFIKA"
  | "AXE_AMBOHIMANGAKELY"
  | "AXE_SABOTSY_NAMEHANA"
  | "AXE_IVATO"
  | "AXE_IAVOLOHA"
  | "AXE_ALASORA"
  | "AXE_CENTRE"
  | "AXE_RN1"
  | "AXE_RN2"
  | "AXE_RN3"
  | "AXE_RN4"
  | "AXE_RN7"
  | "AXE_SUD_EST"
  | "AXE_PROVINCE"
  | "AXE_PROV_RN2_EST"
  | "AXE_PROV_RN4_OUEST"
  | "AXE_PROV_RN6_NORD"
  | "AXE_PROV_RN7_SUD"
  | "AXE_PROV_RN7_SUD_OUEST"
  | "AXE_PROV_SUD_EST"
  | "AXE_PROV_RN44_ALAOTRA"
  | string;

export interface Parcel {
  id: number;
  tracking_number: string;
  reception_date: string;
  vendor_id: number;
  sender_type?: SenderType;
  sender_name?: string | null;
  sender_phone?: string | null;
  sender_phone_formatted?: string | null;
  sender_operator?: Operator | null;
  sender_address?: string | null;
  recipient_name: string;
  recipient_phone: string;
  recipient_phone_formatted: string;
  operator: Operator;
  delivery_address: string;
  designation?: string | null;
  axis: LogisticAxis;
  axis_label: string;
  is_manual_axis?: boolean;
  flux_type: FluxType;
  merchandise_amount: number;
  delivery_fee: number;
  total_to_collect: number;
  total_to_collect_formatted: string;
  partner_fee: number;
  status: ParcelStatus;
  status_label: string;
  courier_id?: number | null;
  tour_id?: number | null;
  payment_method?: string | null;
  reschedule_date?: string | null;
  incident_reason?: string | null;
  partner_name?: string | null;
  partner_reference?: string | null;
  driver_contact?: string | null;
  vehicle_plate?: string | null;
  remittance_id?: number | null;
  remittance_status?: string;
  observation?: string | null;
  active: boolean;
}

export interface Vendor {
  id: number;
  nom: string;
  type_expediteur?: SenderType;
  telephone?: string | null;
  adresse?: string | null;
  email?: string | null;
  contact_responsable?: string | null;
  nif_stat?: string | null;
  modalite_paiement: string;
}

export interface ZoneDetail {
  id: number;
  nom: string;
}

export interface AxisInfo {
  id: number;
  code: LogisticAxis | string;
  libelle: string;
  type_axe?: "URBAIN" | "PROVINCE" | string;
  actif?: number;
  zones: string[];
  zones_detail?: ZoneDetail[];
}

export interface Partner {
  id: number;
  nom: string;
  contact?: string | null;
  type: "COOPERATIVE" | "GARE" | "CONFRERE";
  gare_rattachement?: string | null;
  actif?: number;
}

export interface Courier {
  id: number;
  name: string;
  phone: string;
  phone_formatted: string;
  vehicle_type: string;
  security_deposit: number;
  security_deposit_formatted: string;
  max_parcels?: number;
  assigned_axis?: LogisticAxis | string | null;
  active: boolean;
  today_parcels_count?: number;
  active_tour_id?: number | null;
  disputes_count?: number;
}

export interface Tour {
  id: number;
  tour_date: string;
  courier_id: number;
  status: "ASSIGNE" | "EN_COURS" | "CLOTURE";
  theoretical_total: number;
  actual_remitted: number;
  discrepancy: number;
  closed_at?: string | null;
  courier_name?: string | null;
  courier_phone?: string | null;
  courier_phone_formatted?: string | null;
  courier_vehicle?: string | null;
  parcels_count?: number;
  parcels?: Parcel[];
}

export interface Dispute {
  id: number;
  reference_litige: string;
  livreur_id: number;
  colis_id?: number | null;
  tournee_id?: number | null;
  incident_type: string;
  initial_amount: number;
  refunded_amount: number;
  remaining_balance: number;
  status: "OUVERTE" | "EN_COURS" | "SOLDEE" | "ANNULEE_FORCE_MAJEURE";
  reason: string;
  incident_date: string;
  closure_date?: string | null;
  livreur_name?: string;
}

export interface Scorecard {
  livreur_id: number;
  courier_name?: string;
  period: string;
  total_assigned: number;
  total_delivered: number;
  success_rate: number;
  punctuality_rate: number;
  quality_rate: number;
  cash_rigor_rate: number;
  global_score: number;
  tier: "OR" | "ARGENT" | "BRONZE" | "ALERTE";
  bonus_amount: number;
  bonus_formatted: string;
}

export interface PayoutParcelSummary {
  id: number;
  tracking_number: string;
  recipient_name: string;
  merchandise_amount: number;
  delivery_fee: number;
  status: string;
  reception_date: string;
}

export interface Payout {
  id: number;
  reference_reversement: string;
  vendor_id: number;
  vendor_name: string;
  vendor_phone?: string | null;
  vendor_address?: string | null;
  date_reversement: string;
  total_marchandise_encaissee: number;
  total_frais_livraison_deduits: number;
  total_indemnisation_litiges: number;
  solde_net_verse: number;
  solde_net_verse_formatted: string;
  mode_reglement: string;
  reference_preuve?: string | null;
  statut: string;
  nombre_colis: number;
  notes?: string | null;
  created_at: string;
  colis: PayoutParcelSummary[];
}

export interface PendingPayoutSummary {
  vendor_id: number;
  vendor_name: string;
  vendor_type: string;
  vendor_phone?: string | null;
  vendor_address?: string | null;
  eligible_parcels_count: number;
  total_merchandise: number;
  total_delivery_fees: number;
  total_indemnisation_litiges: number;
  net_payable: number;
  net_payable_formatted: string;
  eligible_parcels: PayoutParcelSummary[];
}


