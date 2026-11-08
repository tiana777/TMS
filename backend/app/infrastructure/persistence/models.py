"""SQLAlchemy 2.0 ORM Models matching CDC Section 12 (3NF Relational Schema)."""

from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
    CheckConstraint,
    Text,
    Index,
)
from sqlalchemy.orm import relationship
from backend.app.infrastructure.database.connection import Base


class UserORM(Base):
    __tablename__ = "utilisateurs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    role = Column(
        String(30),
        CheckConstraint("role IN ('RECEPTIONNISTE', 'SUPERVISEUR', 'SUPER_ADMIN')"),
        nullable=False,
    )
    nom_complet = Column(String(100), nullable=False)
    mot_de_passe_hash = Column(String(255), nullable=False)
    actif = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class CourierORM(Base):
    __tablename__ = "livreurs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nom = Column(String(100), nullable=False)
    telephone = Column(String(20), nullable=False, index=True)
    type_vehicule = Column(String(50), nullable=False)
    caution_garantie = Column(Float, default=0.0, nullable=False)
    capacite_max_colis = Column(Integer, default=15, nullable=False)
    actif = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    tournees = relationship("TourORM", back_populates="livreur")
    dettes = relationship("CourierDebtORM", back_populates="livreur")
    evaluations = relationship("PerformanceEvaluationORM", back_populates="livreur")


class VendorORM(Base):
    __tablename__ = "vendeurs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nom = Column(String(100), unique=True, nullable=False, index=True)
    type_expediteur = Column(
        String(30),
        CheckConstraint("type_expediteur IN ('CYBERMARCHAND', 'PARTICULIER', 'ENTREPRISE')"),
        default="CYBERMARCHAND",
        nullable=False,
    )
    telephone = Column(String(20), nullable=True)
    adresse = Column(String(255), nullable=True)
    email = Column(String(100), nullable=True)
    contact_responsable = Column(String(100), nullable=True)
    nif_stat = Column(String(50), nullable=True)
    modalite_paiement = Column(String(50), default="COMPTANT", nullable=False)
    actif = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    colis = relationship("ParcelORM", back_populates="vendeur")


class AxisORM(Base):
    __tablename__ = "axes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(30), unique=True, nullable=False, index=True)
    libelle = Column(String(150), nullable=False)
    type_axe = Column(String(30), default="URBAIN", nullable=True)  # URBAIN or PROVINCE
    actif = Column(Integer, default=1, nullable=False)

    zones = relationship("ZoneORM", back_populates="axe", cascade="all, delete-orphan")


class ZoneORM(Base):
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True, autoincrement=True)
    axe_id = Column(Integer, ForeignKey("axes.id"), nullable=False, index=True)
    nom = Column(String(100), unique=True, nullable=False, index=True)

    axe = relationship("AxisORM", back_populates="zones")


class PartnerORM(Base):
    __tablename__ = "partenaires"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nom = Column(String(100), unique=True, nullable=False, index=True)
    contact = Column(String(100), nullable=True)
    type = Column(
        String(30),
        CheckConstraint("type IN ('COOPERATIVE', 'GARE', 'CONFRERE')"),
        nullable=False,
    )
    gare_rattachement = Column(String(100), nullable=True)
    actif = Column(Integer, default=1, nullable=False)


class TourORM(Base):
    __tablename__ = "tournees"

    id = Column(Integer, primary_key=True, autoincrement=True)
    date_tournee = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    livreur_id = Column(Integer, ForeignKey("livreurs.id"), nullable=False, index=True)
    statut = Column(
        String(30),
        CheckConstraint("statut IN ('ASSIGNE', 'EN_COURS', 'CLOTURE')"),
        default="ASSIGNE",
        nullable=False,
    )
    total_theorique_caisse = Column(Float, default=0.0, nullable=False)
    total_reel_verse = Column(Float, default=0.0, nullable=False)
    ecart_constate = Column(Float, default=0.0, nullable=False)
    cloture_a = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    livreur = relationship("CourierORM", back_populates="tournees")
    colis = relationship("ParcelORM", back_populates="tournee")


class ParcelORM(Base):
    __tablename__ = "colis"

    id = Column(Integer, primary_key=True, autoincrement=True)
    numero_bordereau = Column(String(30), unique=True, nullable=False, index=True)
    date_reception = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    vendeur_id = Column(Integer, ForeignKey("vendeurs.id"), nullable=False, index=True)
    expediteur_type = Column(
        String(30),
        CheckConstraint("expediteur_type IN ('CYBERMARCHAND', 'PARTICULIER', 'ENTREPRISE')"),
        default="CYBERMARCHAND",
        nullable=False,
    )
    expediteur_nom = Column(String(100), nullable=True)
    expediteur_tel = Column(String(20), nullable=True)
    expediteur_adresse = Column(String(255), nullable=True)
    tournee_id = Column(Integer, ForeignKey("tournees.id"), nullable=True, index=True)
    livreur_id = Column(Integer, ForeignKey("livreurs.id"), nullable=True, index=True)
    partenaire_id = Column(Integer, ForeignKey("partenaires.id"), nullable=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=True, index=True)
    client_nom = Column(String(100), nullable=False)
    client_tel = Column(String(20), nullable=False, index=True)
    designation = Column(String(255), nullable=True)
    lieu_detail = Column(Text, nullable=False)
    axe = Column(String(30), nullable=False, index=True)
    axe_modifie_manuellement = Column(Integer, default=0, nullable=False)
    type_flux = Column(
        String(20),
        CheckConstraint("type_flux IN ('COD', 'SIMPLE', 'RETOUR', 'PROVINCE')"),
        default="COD",
        nullable=False,
    )
    montant_marchandise = Column(Float, default=0.0, nullable=False)
    frais_livraison = Column(Float, default=0.0, nullable=False)
    frais_partenaire = Column(Float, default=0.0, nullable=False)
    observation = Column(Text, nullable=True)
    statut = Column(
        String(30),
        CheckConstraint(
            "statut IN ('EN_DEPOT', 'ASSIGNE', 'EN_COURS', 'SOUS_TRAITE', "
            "'LIVRE', 'ENCAISSE', 'LIVRE_ENCAISSE', 'REPORTE', 'ANNULE_RETOUR', 'RETOUR_BOUTIQUE', 'CLOTURE_CAISSE')"
        ),
        default="EN_DEPOT",
        nullable=False,
        index=True,
    )
    date_report = Column(String(10), nullable=True)
    motif_incident = Column(Text, nullable=True)
    mode_paiement = Column(
        String(30),
        CheckConstraint("mode_paiement IS NULL OR mode_paiement IN ('ESPECES', 'MVOLA', 'AIRTEL', 'ORANGE_MONEY', 'VIREMENT')"),
        nullable=True,
    )
    reference_partenaire = Column(String(50), nullable=True)
    nom_partenaire = Column(String(100), nullable=True)
    driver_contact = Column(String(100), nullable=True)
    vehicle_plate = Column(String(50), nullable=True)
    actif = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    vendeur = relationship("VendorORM", back_populates="colis")
    tournee = relationship("TourORM", back_populates="colis")
    historique_statuts = relationship("ParcelStatusHistoryORM", back_populates="colis", cascade="all, delete-orphan")
    encaissements = relationship("CashCollectionORM", back_populates="colis", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_colis_date_axe", "date_reception", "axe"),
        Index("idx_colis_statut_date", "statut", "date_reception"),
    )


class ParcelStatusHistoryORM(Base):
    __tablename__ = "colis_statut_historique"

    id = Column(Integer, primary_key=True, autoincrement=True)
    colis_id = Column(Integer, ForeignKey("colis.id"), nullable=False, index=True)
    utilisateur_id = Column(Integer, ForeignKey("utilisateurs.id"), nullable=True)
    statut_precedent = Column(String(30), nullable=True)
    statut_nouveau = Column(String(30), nullable=False)
    motif = Column(Text, nullable=True)
    horodatage = Column(DateTime, default=datetime.utcnow, nullable=False)

    colis = relationship("ParcelORM", back_populates="historique_statuts")


class CashCollectionORM(Base):
    __tablename__ = "encaissements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    colis_id = Column(Integer, ForeignKey("colis.id"), nullable=False, index=True)
    utilisateur_id = Column(Integer, ForeignKey("utilisateurs.id"), nullable=True)
    montant_encaisse = Column(Float, nullable=False)
    canal = Column(
        String(30),
        CheckConstraint("canal IN ('ESPECES', 'MVOLA', 'AIRTEL', 'ORANGE_MONEY')"),
        nullable=False,
    )
    reference_transaction = Column(String(100), nullable=True)
    horodatage = Column(DateTime, default=datetime.utcnow, nullable=False)

    colis = relationship("ParcelORM", back_populates="encaissements")


class CourierDebtORM(Base):
    __tablename__ = "dettes_livreurs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    reference_litige = Column(String(50), unique=True, nullable=False, index=True)
    livreur_id = Column(Integer, ForeignKey("livreurs.id"), nullable=False, index=True)
    colis_id = Column(Integer, ForeignKey("colis.id"), nullable=True)
    tournee_id = Column(Integer, ForeignKey("tournees.id"), nullable=True)
    type_incident = Column(
        String(40),
        CheckConstraint(
            "type_incident IN ('DEFICIT_COD', 'CASSE_MARCHANDISE', 'PERTE_COLIS', "
            "'FAUX_BILLET', 'CREDIT_NON_AUTORISE', 'LITIGE_GARE')"
        ),
        nullable=False,
    )
    montant_initial_dette = Column(Float, nullable=False)
    montant_rembourse = Column(Float, default=0.0, nullable=False)
    solde_restant = Column(Float, nullable=False)
    statut_dette = Column(
        String(30),
        CheckConstraint("statut_dette IN ('OUVERTE', 'EN_COURS', 'SOLDEE', 'ANNULEE_FORCE_MAJEURE')"),
        default="OUVERTE",
        nullable=False,
        index=True,
    )
    motif_circonstancie = Column(Text, nullable=False)
    date_incident = Column(String(10), nullable=False)  # YYYY-MM-DD
    date_cloture = Column(String(10), nullable=True)

    livreur = relationship("CourierORM", back_populates="dettes")
    remboursements = relationship("DebtRepaymentORM", back_populates="dette", cascade="all, delete-orphan")


class DebtRepaymentORM(Base):
    __tablename__ = "remboursements_dettes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dette_id = Column(Integer, ForeignKey("dettes_livreurs.id"), nullable=False, index=True)
    utilisateur_validateur_id = Column(Integer, ForeignKey("utilisateurs.id"), nullable=True)
    montant_verse = Column(Float, nullable=False)
    mode_remboursement = Column(
        String(30),
        CheckConstraint("mode_remboursement IN ('COMPTANT', 'RETENUE_SALAIRE', 'CAUTION')"),
        nullable=False,
    )
    reference_piece_comptable = Column(String(100), nullable=True)
    horodatage = Column(DateTime, default=datetime.utcnow, nullable=False)

    dette = relationship("CourierDebtORM", back_populates="remboursements")


class PerformanceEvaluationORM(Base):
    __tablename__ = "evaluations_performance"

    id = Column(Integer, primary_key=True, autoincrement=True)
    livreur_id = Column(Integer, ForeignKey("livreurs.id"), nullable=False, index=True)
    mois = Column(String(7), nullable=False, index=True)  # YYYY-MM
    total_assignes = Column(Integer, nullable=False)
    total_livres = Column(Integer, nullable=False)
    taux_succes = Column(Float, nullable=False)
    taux_ponctualite = Column(Float, nullable=False)
    taux_qualite = Column(Float, nullable=False)
    score_global = Column(Float, nullable=False)
    palier = Column(
        String(20),
        CheckConstraint("palier IN ('OR', 'ARGENT', 'BRONZE', 'ALERTE')"),
        nullable=False,
    )
    montant_prime = Column(Float, default=0.0, nullable=False)
    calcule_a = Column(DateTime, default=datetime.utcnow, nullable=False)

    livreur = relationship("CourierORM", back_populates="evaluations")
