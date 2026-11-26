"""Use cases for Vendor Payouts & Remittances (Reversements Cybermarchands & Donneurs d'Ordre).
Implements the exact accounting formula from CDC Section 13.3.
"""

from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.domain.exceptions import BusinessRuleViolationException, EntityNotFoundException
from backend.app.infrastructure.persistence.models import (
    ParcelORM,
    VendorORM,
    VendorPayoutORM,
)
from backend.app.application.dtos.payout_dtos import (
    CreatePayoutDTO,
    PayoutParcelSummaryDTO,
    PayoutResponseDTO,
    PendingPayoutSummaryDTO,
)


class PayoutUseCases:
    def __init__(self, session: Session):
        self.session = session

    def get_pending_payouts(self, vendor_id: Optional[int] = None) -> List[PendingPayoutSummaryDTO]:
        """Calculates pending payouts for vendors with delivered & cashed parcels."""
        query = self.session.query(ParcelORM).filter(
            ParcelORM.statut.in_(["LIVRE_ENCAISSE", "CLOTURE_CAISSE"]),
            ParcelORM.statut_reversement == "NON_REVERSE",
            ParcelORM.actif == 1,
        )
        if vendor_id:
            query = query.filter(ParcelORM.vendeur_id == vendor_id)

        parcels = query.all()

        # Group parcels by vendor
        by_vendor = {}
        for p in parcels:
            by_vendor.setdefault(p.vendeur_id, []).append(p)

        # Also get all vendors if specific vendor requested or list all with pending
        vendors_query = self.session.query(VendorORM).filter(VendorORM.actif == 1)
        if vendor_id:
            vendors_query = vendors_query.filter(VendorORM.id == vendor_id)
        vendors = {v.id: v for v in vendors_query.all()}

        results: List[PendingPayoutSummaryDTO] = []
        for vid, v_parcels in by_vendor.items():
            vendor = vendors.get(vid)
            if not vendor:
                continue

            tot_merch = int(sum(p.montant_marchandise for p in v_parcels))
            tot_fees = int(sum(p.frais_livraison for p in v_parcels))
            net = max(0, tot_merch - tot_fees)

            parcels_dto = [
                PayoutParcelSummaryDTO(
                    id=p.id,
                    tracking_number=p.numero_bordereau,
                    recipient_name=p.client_nom,
                    merchandise_amount=int(p.montant_marchandise),
                    delivery_fee=int(p.frais_livraison),
                    status=p.statut,
                    reception_date=p.date_reception,
                    frais_prepayes_vendeur=bool(getattr(p, "frais_prepayes_vendeur", False)),
                )
                for p in v_parcels
            ]

            results.append(
                PendingPayoutSummaryDTO(
                    vendor_id=vendor.id,
                    vendor_name=vendor.nom,
                    vendor_type=vendor.type_expediteur or "CYBERMARCHAND",
                    vendor_phone=vendor.telephone,
                    vendor_address=vendor.adresse,
                    eligible_parcels_count=len(v_parcels),
                    total_merchandise=tot_merch,
                    total_delivery_fees=tot_fees,
                    total_indemnisation_litiges=0,
                    net_payable=net,
                    net_payable_formatted=f"{net:,} Ar".replace(",", "\u00a0"),
                    eligible_parcels=parcels_dto,
                )
            )

        return results

    def create_payout(self, dto: CreatePayoutDTO, current_user_id: Optional[int] = None) -> PayoutResponseDTO:
        """Executes a formal remittance to a vendor, locking eligible parcels."""
        vendor = self.session.query(VendorORM).filter(VendorORM.id == dto.vendor_id).first()
        if not vendor:
            raise EntityNotFoundException("Vendor", dto.vendor_id)

        if not dto.parcel_ids:
            raise BusinessRuleViolationException("Au moins un colis doit être sélectionné pour le reversement.")

        parcels = (
            self.session.query(ParcelORM)
            .filter(
                ParcelORM.id.in_(dto.parcel_ids),
                ParcelORM.vendeur_id == dto.vendor_id,
            )
            .all()
        )

        if len(parcels) != len(dto.parcel_ids):
            raise BusinessRuleViolationException(
                "Un ou plusieurs colis sélectionnés sont invalides ou n'appartiennent pas à ce donneur d'ordre."
            )

        for p in parcels:
            if p.statut_reversement == "REVERSE":
                raise BusinessRuleViolationException(
                    f"Le colis {p.numero_bordereau} a déjà fait l'objet d'un reversement validé."
                )

        today_str = datetime.now().strftime("%Y-%m-%d")
        today_compact = datetime.now().strftime("%Y%m%d")

        count_today = (
            self.session.query(VendorPayoutORM)
            .filter(VendorPayoutORM.date_reversement == today_str)
            .count()
        )
        ref_seq = str(count_today + 1).zfill(4)
        reference_reversement = f"REV-{today_compact}-{ref_seq}"

        tot_merch = int(sum(p.montant_marchandise for p in parcels))
        tot_fees = int(sum(p.frais_livraison for p in parcels))
        # Formula CDC 13.3: Net = Total Merch - Delivery Fees + Disputes Compensation
        solde_net = max(0, tot_merch - tot_fees + dto.indemnisation_litiges)

        payout = VendorPayoutORM(
            reference_reversement=reference_reversement,
            vendeur_id=vendor.id,
            date_reversement=today_str,
            total_marchandise_encaissee=float(tot_merch),
            total_frais_livraison_deduits=float(tot_fees),
            total_indemnisation_litiges=float(dto.indemnisation_litiges),
            solde_net_verse=float(solde_net),
            mode_reglement=dto.payment_mode,
            reference_preuve=dto.payment_reference,
            statut="VALIDE",
            nombre_colis=len(parcels),
            notes=dto.notes,
            utilisateur_id=current_user_id,
        )
        self.session.add(payout)
        self.session.flush()

        for p in parcels:
            p.reversement_id = payout.id
            p.statut_reversement = "REVERSE"
            p.updated_at = datetime.utcnow()

        self.session.commit()
        self.session.refresh(payout)

        return self._to_dto(payout, vendor, parcels)

    def get_payouts(self, vendor_id: Optional[int] = None) -> List[PayoutResponseDTO]:
        query = self.session.query(VendorPayoutORM).order_by(VendorPayoutORM.id.desc())
        if vendor_id:
            query = query.filter(VendorPayoutORM.vendeur_id == vendor_id)
        payouts = query.all()

        results = []
        for p in payouts:
            vendor = self.session.query(VendorORM).filter(VendorORM.id == p.vendeur_id).first()
            parcels = self.session.query(ParcelORM).filter(ParcelORM.reversement_id == p.id).all()
            results.append(self._to_dto(p, vendor, parcels))
        return results

    def get_payout_by_id(self, payout_id: int) -> PayoutResponseDTO:
        payout = self.session.query(VendorPayoutORM).filter(VendorPayoutORM.id == payout_id).first()
        if not payout:
            raise EntityNotFoundException("VendorPayout", payout_id)
        vendor = self.session.query(VendorORM).filter(VendorORM.id == payout.vendeur_id).first()
        parcels = self.session.query(ParcelORM).filter(ParcelORM.reversement_id == payout.id).all()
        return self._to_dto(payout, vendor, parcels)

    def _to_dto(
        self,
        payout: VendorPayoutORM,
        vendor: Optional[VendorORM],
        parcels: List[ParcelORM],
    ) -> PayoutResponseDTO:
        net = int(payout.solde_net_verse)
        parcels_dto = [
            PayoutParcelSummaryDTO(
                id=p.id,
                tracking_number=p.numero_bordereau,
                recipient_name=p.client_nom,
                merchandise_amount=int(p.montant_marchandise),
                delivery_fee=int(p.frais_livraison),
                status=p.statut,
                reception_date=p.date_reception,
                frais_prepayes_vendeur=bool(getattr(p, "frais_prepayes_vendeur", False)),
            )
            for p in parcels
        ]

        return PayoutResponseDTO(
            id=payout.id,
            reference_reversement=payout.reference_reversement,
            vendor_id=payout.vendeur_id,
            vendor_name=vendor.nom if vendor else "Vendeur Inconnu",
            vendor_phone=vendor.telephone if vendor else None,
            vendor_address=vendor.adresse if vendor else None,
            date_reversement=payout.date_reversement,
            total_marchandise_encaissee=int(payout.total_marchandise_encaissee),
            total_frais_livraison_deduits=int(payout.total_frais_livraison_deduits),
            total_indemnisation_litiges=int(payout.total_indemnisation_litiges),
            solde_net_verse=net,
            solde_net_verse_formatted=f"{net:,} Ar".replace(",", "\u00a0"),
            mode_reglement=payout.mode_reglement,
            reference_preuve=payout.reference_preuve,
            statut=payout.statut,
            nombre_colis=payout.nombre_colis,
            notes=payout.notes,
            created_at=payout.created_at.strftime("%Y-%m-%d %H:%M:%S") if payout.created_at else "",
            colis=parcels_dto,
        )
