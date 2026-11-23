"""SQLAlchemy 2.0 Repository implementations conforming to Domain interfaces."""

from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.domain.models.courier import Courier
from backend.app.domain.models.dispute import CourierDebt, DebtStatus, IncidentType
from backend.app.domain.models.parcel import FluxType, Parcel
from backend.app.domain.models.tour import Tour, TourStatus
from backend.app.domain.models.vendor import SenderType, Vendor
from backend.app.domain.repositories.interfaces import (
    ICourierRepository,
    IDisputeRepository,
    IParcelRepository,
    ITourRepository,
    IVendorRepository,
)
from backend.app.domain.state_machine.parcel_fsm import ParcelStatus, PaymentMethod
from backend.app.domain.value_objects.axis import LogisticAxis
from backend.app.domain.value_objects.money import Money
from backend.app.domain.value_objects.phone_number import PhoneNumber
from backend.app.infrastructure.persistence.models import (
    CourierDebtORM,
    CourierORM,
    ParcelORM,
    TourORM,
    VendorORM,
)


class PostgresParcelRepository(IParcelRepository):
    def __init__(self, session: Session):
        self.session = session

    def _to_domain(self, orm: ParcelORM) -> Parcel:
        return Parcel(
            id=orm.id,
            tracking_number=orm.numero_bordereau,
            reception_date=orm.date_reception,
            vendor_id=orm.vendeur_id,
            tour_id=orm.tournee_id,
            courier_id=orm.livreur_id,
            partner_id=orm.partenaire_id,
            zone_id=orm.zone_id,
            recipient_name=orm.client_nom,
            recipient_phone=PhoneNumber(orm.client_tel),
            delivery_address=orm.lieu_detail,
            designation=orm.designation,
            axis=LogisticAxis(orm.axe),
            is_manual_axis=bool(orm.axe_modifie_manuellement) if getattr(orm, "axe_modifie_manuellement", None) else False,
            flux_type=FluxType(orm.type_flux) if orm.type_flux in [f.value for f in FluxType] else FluxType.COD,
            merchandise_amount=Money(orm.montant_marchandise),
            delivery_fee=Money(orm.frais_livraison),
            partner_fee=Money(orm.frais_partenaire),
            sender_type=SenderType(orm.expediteur_type) if orm.expediteur_type else SenderType.CYBERMARCHAND,
            sender_name=orm.expediteur_nom,
            sender_phone=PhoneNumber(orm.expediteur_tel) if orm.expediteur_tel else None,
            sender_address=orm.expediteur_adresse,
            status=ParcelStatus(orm.statut),
            reschedule_date=orm.date_report,
            incident_reason=orm.motif_incident,
            payment_method=PaymentMethod(orm.mode_paiement) if orm.mode_paiement else None,
            partner_reference=orm.reference_partenaire,
            partner_name=orm.nom_partenaire,
            driver_contact=orm.driver_contact,
            vehicle_plate=orm.vehicle_plate,
            encaissement_lieu=getattr(orm, "encaissement_lieu", "LIVREUR") or "LIVREUR",
            repartition_vendeur=getattr(orm, "repartition_vendeur", None),
            montant_encaisse_livreur=Money(orm.montant_encaisse_livreur) if getattr(orm, "montant_encaisse_livreur", None) is not None else None,
            montant_encaisse_vendeur=Money(orm.montant_encaisse_vendeur) if getattr(orm, "montant_encaisse_vendeur", None) is not None else None,
            remittance_id=orm.reversement_id,
            remittance_status=orm.statut_reversement if getattr(orm, "statut_reversement", None) else "NON_REVERSE",
            receptionniste_id=getattr(orm, "receptionniste_id", None),
            receptionniste_nom=getattr(orm, "receptionniste_nom", None),
            dernier_agent_id=getattr(orm, "dernier_agent_id", None),
            dernier_agent_nom=getattr(orm, "dernier_agent_nom", None),
            derniere_action=getattr(orm, "derniere_action", None),
            derniere_action_at=getattr(orm, "derniere_action_at", None),
            observation=orm.observation,
            active=bool(orm.actif),
            created_at=orm.created_at,
            updated_at=orm.updated_at,
        )

    def _to_orm(self, domain: Parcel) -> ParcelORM:
        return ParcelORM(
            id=domain.id,
            numero_bordereau=domain.tracking_number,
            date_reception=domain.reception_date,
            vendeur_id=domain.vendor_id,
            expediteur_type=domain.sender_type.value if hasattr(domain.sender_type, "value") else str(domain.sender_type),
            expediteur_nom=domain.sender_name,
            expediteur_tel=domain.sender_phone.raw_digits if domain.sender_phone else None,
            expediteur_adresse=domain.sender_address,
            tournee_id=domain.tour_id,
            livreur_id=domain.courier_id,
            partenaire_id=domain.partner_id,
            zone_id=domain.zone_id,
            client_nom=domain.recipient_name,
            client_tel=domain.recipient_phone.raw_digits,
            designation=domain.designation,
            lieu_detail=domain.delivery_address,
            axe=domain.axis.value,
            axe_modifie_manuellement=1 if domain.is_manual_axis else 0,
            type_flux=domain.flux_type.value,
            montant_marchandise=float(domain.merchandise_amount.amount),
            frais_livraison=float(domain.delivery_fee.amount),
            frais_partenaire=float(domain.partner_fee.amount),
            observation=domain.observation,
            statut=domain.status.value,
            date_report=domain.reschedule_date,
            motif_incident=domain.incident_reason,
            mode_paiement=domain.payment_method.value if domain.payment_method else None,
            reference_partenaire=domain.partner_reference,
            nom_partenaire=domain.partner_name,
            driver_contact=domain.driver_contact,
            vehicle_plate=domain.vehicle_plate,
            encaissement_lieu=domain.encaissement_lieu,
            repartition_vendeur=domain.repartition_vendeur,
            montant_encaisse_livreur=float(domain.montant_encaisse_livreur.amount) if domain.montant_encaisse_livreur else None,
            montant_encaisse_vendeur=float(domain.montant_encaisse_vendeur.amount) if domain.montant_encaisse_vendeur else None,
            reversement_id=domain.remittance_id,
            statut_reversement=domain.remittance_status,
            receptionniste_id=domain.receptionniste_id,
            receptionniste_nom=domain.receptionniste_nom,
            dernier_agent_id=domain.dernier_agent_id,
            dernier_agent_nom=domain.dernier_agent_nom,
            derniere_action=domain.derniere_action,
            derniere_action_at=domain.derniere_action_at,
            actif=1 if domain.active else 0,
        )

    def save(self, parcel: Parcel) -> Parcel:
        if parcel.id:
            orm = self.session.query(ParcelORM).filter(ParcelORM.id == parcel.id).first()
            if orm:
                orm.numero_bordereau = parcel.tracking_number
                orm.date_reception = parcel.reception_date
                orm.vendeur_id = parcel.vendor_id
                orm.expediteur_type = parcel.sender_type.value if hasattr(parcel.sender_type, "value") else str(parcel.sender_type)
                orm.expediteur_nom = parcel.sender_name
                orm.expediteur_tel = parcel.sender_phone.raw_digits if parcel.sender_phone else None
                orm.expediteur_adresse = parcel.sender_address
                orm.tournee_id = parcel.tour_id
                orm.livreur_id = parcel.courier_id
                orm.partenaire_id = parcel.partner_id
                orm.zone_id = parcel.zone_id
                orm.client_nom = parcel.recipient_name
                orm.client_tel = parcel.recipient_phone.raw_digits
                orm.designation = parcel.designation
                orm.lieu_detail = parcel.delivery_address
                orm.axe = parcel.axis.value
                orm.axe_modifie_manuellement = 1 if parcel.is_manual_axis else 0
                orm.type_flux = parcel.flux_type.value
                orm.montant_marchandise = float(parcel.merchandise_amount.amount)
                orm.frais_livraison = float(parcel.delivery_fee.amount)
                orm.frais_partenaire = float(parcel.partner_fee.amount)
                orm.observation = parcel.observation
                orm.statut = parcel.status.value
                orm.date_report = parcel.reschedule_date
                orm.motif_incident = parcel.incident_reason
                orm.mode_paiement = parcel.payment_method.value if parcel.payment_method else None
                orm.reference_partenaire = parcel.partner_reference
                orm.nom_partenaire = parcel.partner_name
                orm.driver_contact = parcel.driver_contact
                orm.vehicle_plate = parcel.vehicle_plate
                orm.encaissement_lieu = parcel.encaissement_lieu
                orm.repartition_vendeur = parcel.repartition_vendeur
                orm.montant_encaisse_livreur = float(parcel.montant_encaisse_livreur.amount) if parcel.montant_encaisse_livreur else None
                orm.montant_encaisse_vendeur = float(parcel.montant_encaisse_vendeur.amount) if parcel.montant_encaisse_vendeur else None
                orm.reversement_id = parcel.remittance_id
                orm.statut_reversement = parcel.remittance_status
                if parcel.receptionniste_id is not None:
                    orm.receptionniste_id = parcel.receptionniste_id
                if parcel.receptionniste_nom is not None:
                    orm.receptionniste_nom = parcel.receptionniste_nom
                if parcel.dernier_agent_id is not None:
                    orm.dernier_agent_id = parcel.dernier_agent_id
                if parcel.dernier_agent_nom is not None:
                    orm.dernier_agent_nom = parcel.dernier_agent_nom
                if parcel.derniere_action is not None:
                    orm.derniere_action = parcel.derniere_action
                if parcel.derniere_action_at is not None:
                    orm.derniere_action_at = parcel.derniere_action_at
                orm.actif = 1 if parcel.active else 0
                orm.updated_at = datetime.utcnow()
                self.session.commit()
                self.session.refresh(orm)
                return self._to_domain(orm)
        
        orm = self._to_orm(parcel)
        self.session.add(orm)
        self.session.commit()
        self.session.refresh(orm)
        return self._to_domain(orm)

    def save_batch(self, parcels: List[Parcel]) -> List[Parcel]:
        orms = [self._to_orm(p) for p in parcels]
        self.session.add_all(orms)
        self.session.commit()
        for o in orms:
            self.session.refresh(o)
        return [self._to_domain(o) for o in orms]

    def get_by_id(self, parcel_id: int) -> Optional[Parcel]:
        orm = self.session.query(ParcelORM).filter(ParcelORM.id == parcel_id, ParcelORM.actif == 1).first()
        return self._to_domain(orm) if orm else None

    def get_by_tracking_number(self, tracking_number: str) -> Optional[Parcel]:
        orm = self.session.query(ParcelORM).filter(
            ParcelORM.numero_bordereau == tracking_number,
            ParcelORM.actif == 1
        ).first()
        return self._to_domain(orm) if orm else None

    def list_by_status(self, status: ParcelStatus) -> List[Parcel]:
        orms = self.session.query(ParcelORM).filter(
            ParcelORM.statut == status.value,
            ParcelORM.actif == 1
        ).order_by(ParcelORM.id.asc()).all()
        return [self._to_domain(o) for o in orms]

    def list_by_date(self, date_str: str) -> List[Parcel]:
        orms = self.session.query(ParcelORM).filter(
            ParcelORM.date_reception == date_str,
            ParcelORM.actif == 1
        ).order_by(ParcelORM.id.asc()).all()
        return [self._to_domain(o) for o in orms]

    def list_by_axis(self, axis: LogisticAxis) -> List[Parcel]:
        orms = self.session.query(ParcelORM).filter(
            ParcelORM.axe == axis.value,
            ParcelORM.actif == 1
        ).order_by(ParcelORM.id.asc()).all()
        return [self._to_domain(o) for o in orms]

    def generate_next_bdr(self) -> str:
        """Finds max sequential 4-digit BDR in database and increments it."""
        max_id = self.session.query(func.max(ParcelORM.id)).scalar() or 0
        next_seq = max_id + 1
        return f"{next_seq:04d}"


class PostgresCourierRepository(ICourierRepository):
    def __init__(self, session: Session):
        self.session = session

    def _to_domain(self, orm: CourierORM) -> Courier:
        return Courier(
            id=orm.id,
            name=orm.nom,
            phone=PhoneNumber(orm.telephone),
            vehicle_type=orm.type_vehicule,
            security_deposit=Money(orm.caution_garantie),
            max_parcels=orm.capacite_max_colis or 30,
            assigned_axis=orm.assigned_axis,
            active=bool(orm.actif),
            created_at=orm.created_at,
            updated_at=orm.updated_at,
        )

    def _to_orm(self, domain: Courier) -> CourierORM:
        return CourierORM(
            id=domain.id,
            nom=domain.name,
            telephone=domain.phone.raw_digits,
            type_vehicule=domain.vehicle_type,
            caution_garantie=float(domain.security_deposit.amount),
            capacite_max_colis=domain.max_parcels,
            assigned_axis=domain.assigned_axis,
            actif=1 if domain.active else 0,
        )

    def save(self, courier: Courier) -> Courier:
        if courier.id:
            orm = self.session.query(CourierORM).filter(CourierORM.id == courier.id).first()
            if orm:
                orm.nom = courier.name
                orm.telephone = courier.phone.raw_digits
                orm.type_vehicule = courier.vehicle_type
                orm.caution_garantie = float(courier.security_deposit.amount)
                orm.capacite_max_colis = courier.max_parcels
                orm.assigned_axis = courier.assigned_axis
                orm.actif = 1 if courier.active else 0
                self.session.commit()
                self.session.refresh(orm)
                return self._to_domain(orm)

        orm = self._to_orm(courier)
        self.session.add(orm)
        self.session.commit()
        self.session.refresh(orm)
        return self._to_domain(orm)

    def get_by_id(self, courier_id: int) -> Optional[Courier]:
        orm = self.session.query(CourierORM).filter(CourierORM.id == courier_id).first()
        return self._to_domain(orm) if orm else None

    def list_all(self, active_only: bool = True) -> List[Courier]:
        q = self.session.query(CourierORM)
        if active_only:
            q = q.filter(CourierORM.actif == 1)
        orms = q.order_by(CourierORM.nom.asc()).all()
        return [self._to_domain(o) for o in orms]

    def delete(self, courier_id: int) -> bool:
        orm = self.session.query(CourierORM).filter(CourierORM.id == courier_id).first()
        if not orm:
            return False
        orm.actif = 0
        self.session.commit()
        return True


class PostgresTourRepository(ITourRepository):
    def __init__(self, session: Session):
        self.session = session

    def _to_domain(self, orm: TourORM) -> Tour:
        return Tour(
            id=orm.id,
            tour_date=orm.date_tournee,
            courier_id=orm.livreur_id,
            status=TourStatus(orm.statut),
            theoretical_total=Money(orm.total_theorique_caisse),
            actual_remitted=Money(orm.total_reel_verse),
            closed_at=orm.cloture_a,
            created_at=orm.created_at,
        )

    def _to_orm(self, domain: Tour) -> TourORM:
        return TourORM(
            id=domain.id,
            date_tournee=domain.tour_date,
            livreur_id=domain.courier_id,
            statut=domain.status.value,
            total_theorique_caisse=float(domain.theoretical_total.amount),
            total_reel_verse=float(domain.actual_remitted.amount),
            ecart_constate=float(domain.actual_remitted.amount - domain.theoretical_total.amount),
            cloture_a=domain.closed_at,
        )

    def save(self, tour: Tour) -> Tour:
        if tour.id:
            orm = self.session.query(TourORM).filter(TourORM.id == tour.id).first()
            if orm:
                orm.date_tournee = tour.tour_date
                orm.livreur_id = tour.courier_id
                orm.statut = tour.status.value
                orm.total_theorique_caisse = float(tour.theoretical_total.amount)
                orm.total_reel_verse = float(tour.actual_remitted.amount)
                orm.ecart_constate = float(tour.actual_remitted.amount - tour.theoretical_total.amount)
                orm.cloture_a = tour.closed_at
                self.session.commit()
                self.session.refresh(orm)
                return self._to_domain(orm)

        orm = self._to_orm(tour)
        self.session.add(orm)
        self.session.commit()
        self.session.refresh(orm)
        return self._to_domain(orm)

    def get_by_id(self, tour_id: int) -> Optional[Tour]:
        orm = self.session.query(TourORM).filter(TourORM.id == tour_id).first()
        return self._to_domain(orm) if orm else None

    def get_by_courier_and_date(self, courier_id: int, tour_date: str) -> Optional[Tour]:
        orm = self.session.query(TourORM).filter(
            TourORM.livreur_id == courier_id,
            TourORM.date_tournee == tour_date
        ).first()
        return self._to_domain(orm) if orm else None

    def list_by_date(self, tour_date: str) -> List[Tour]:
        orms = self.session.query(TourORM).filter(TourORM.date_tournee == tour_date).all()
        return [self._to_domain(o) for o in orms]


class PostgresDisputeRepository(IDisputeRepository):
    def __init__(self, session: Session):
        self.session = session

    def _to_domain(self, orm: CourierDebtORM) -> CourierDebt:
        return CourierDebt(
            id=orm.id,
            reference_litige=orm.reference_litige,
            livreur_id=orm.livreur_id,
            colis_id=orm.colis_id,
            tournee_id=orm.tournee_id,
            incident_type=IncidentType(orm.type_incident),
            initial_amount=Money(orm.montant_initial_dette),
            refunded_amount=Money(orm.montant_rembourse),
            status=DebtStatus(orm.statut_dette),
            reason=orm.motif_circonstancie,
            incident_date=orm.date_incident,
            closure_date=orm.date_cloture,
        )

    def _to_orm(self, domain: CourierDebt) -> CourierDebtORM:
        return CourierDebtORM(
            id=domain.id,
            reference_litige=domain.reference_litige,
            livreur_id=domain.livreur_id,
            colis_id=domain.colis_id,
            tournee_id=domain.tournee_id,
            type_incident=domain.incident_type.value,
            montant_initial_dette=float(domain.initial_amount.amount),
            montant_rembourse=float(domain.refunded_amount.amount),
            solde_restant=float(domain.remaining_balance.amount),
            statut_dette=domain.status.value,
            motif_circonstancie=domain.reason,
            date_incident=domain.incident_date,
            date_cloture=domain.closure_date,
        )

    def save(self, debt: CourierDebt) -> CourierDebt:
        if debt.id:
            orm = self.session.query(CourierDebtORM).filter(CourierDebtORM.id == debt.id).first()
            if orm:
                orm.montant_rembourse = float(debt.refunded_amount.amount)
                orm.solde_restant = float(debt.remaining_balance.amount)
                orm.statut_dette = debt.status.value
                orm.date_cloture = debt.closure_date
                self.session.commit()
                self.session.refresh(orm)
                return self._to_domain(orm)

        orm = self._to_orm(debt)
        self.session.add(orm)
        self.session.commit()
        self.session.refresh(orm)
        return self._to_domain(orm)

    def get_by_id(self, debt_id: int) -> Optional[CourierDebt]:
        orm = self.session.query(CourierDebtORM).filter(CourierDebtORM.id == debt_id).first()
        return self._to_domain(orm) if orm else None

    def get_by_reference(self, reference: str) -> Optional[CourierDebt]:
        orm = self.session.query(CourierDebtORM).filter(CourierDebtORM.reference_litige == reference).first()
        return self._to_domain(orm) if orm else None

    def list_by_courier(self, courier_id: int) -> List[CourierDebt]:
        orms = self.session.query(CourierDebtORM).filter(CourierDebtORM.livreur_id == courier_id).all()
        return [self._to_domain(o) for o in orms]

    def generate_next_litige_ref(self) -> str:
        year = datetime.now().year
        count = self.session.query(func.count(CourierDebtORM.id)).scalar() or 0
        return f"LIT-{year}-{count + 1:04d}"


class PostgresVendorRepository(IVendorRepository):
    def __init__(self, session: Session):
        self.session = session

    def _to_domain(self, orm: VendorORM) -> Vendor:
        return Vendor(
            id=orm.id,
            name=orm.nom,
            sender_type=SenderType(orm.type_expediteur) if orm.type_expediteur else SenderType.CYBERMARCHAND,
            phone=PhoneNumber(orm.telephone) if orm.telephone else None,
            address=orm.adresse,
            email=orm.email,
            contact_person=orm.contact_responsable,
            nif_stat=orm.nif_stat,
            payment_terms=orm.modalite_paiement,
            active=bool(orm.actif),
            created_at=orm.created_at,
            updated_at=orm.updated_at,
        )

    def _to_orm(self, domain: Vendor) -> VendorORM:
        return VendorORM(
            id=domain.id,
            nom=domain.name,
            type_expediteur=domain.sender_type.value if hasattr(domain.sender_type, "value") else str(domain.sender_type),
            telephone=domain.phone.raw_digits if domain.phone else None,
            adresse=domain.address,
            email=domain.email,
            contact_responsable=domain.contact_person,
            nif_stat=domain.nif_stat,
            modalite_paiement=domain.payment_terms,
            actif=1 if domain.active else 0,
        )

    def save(self, vendor: Vendor) -> Vendor:
        if vendor.id:
            orm = self.session.query(VendorORM).filter(VendorORM.id == vendor.id).first()
            if orm:
                orm.nom = vendor.name
                orm.type_expediteur = vendor.sender_type.value if hasattr(vendor.sender_type, "value") else str(vendor.sender_type)
                orm.telephone = vendor.phone.raw_digits if vendor.phone else None
                orm.adresse = vendor.address
                orm.email = vendor.email
                orm.contact_responsable = vendor.contact_person
                orm.nif_stat = vendor.nif_stat
                orm.modalite_paiement = vendor.payment_terms
                orm.actif = 1 if vendor.active else 0
                self.session.commit()
                self.session.refresh(orm)
                return self._to_domain(orm)

        orm = self._to_orm(vendor)
        self.session.add(orm)
        self.session.commit()
        self.session.refresh(orm)
        return self._to_domain(orm)

    def get_by_id(self, vendor_id: int) -> Optional[Vendor]:
        orm = self.session.query(VendorORM).filter(VendorORM.id == vendor_id).first()
        return self._to_domain(orm) if orm else None

    def get_by_name(self, name: str) -> Optional[Vendor]:
        orm = self.session.query(VendorORM).filter(VendorORM.nom == name).first()
        return self._to_domain(orm) if orm else None

    def list_all(self, active_only: bool = True) -> List[Vendor]:
        q = self.session.query(VendorORM)
        if active_only:
            q = q.filter(VendorORM.actif == 1)
        orms = q.order_by(VendorORM.nom.asc()).all()
        return [self._to_domain(o) for o in orms]
