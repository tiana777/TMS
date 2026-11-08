export type Operator = "TELMA" | "ORANGE" | "AIRTEL";

export type SenderType = "CYBERMARCHAND" | "PARTICULIER" | "ENTREPRISE";

export type FluxType = "COD" | "SIMPLE" | "RETOUR" | "PROVINCE";

export type ParcelStatus =
  | "EN_DEPOT"
  | "ASSIGNE"
  | "EN_COURS"
  | "SOUS_TRAITE"
  | "LIVRE_ENCAISSE"
  | "REPORTE"
  | "ANNULE_RETOUR"
  | "RETOUR_BOUTIQUE"
  | "CLOTURE_CAISSE";

export type LogisticAxis =
  | "AXE_CENTRE"
  | "AXE_RN1"
  | "AXE_RN2"
  | "AXE_RN3"
  | "AXE_RN4"
  | "AXE_RN7"
  | "AXE_SUD_EST"
  | "AXE_PROVINCE";

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

export interface AxisInfo {
  id: number;
  code: LogisticAxis;
  libelle: string;
  zones: string[];
}
