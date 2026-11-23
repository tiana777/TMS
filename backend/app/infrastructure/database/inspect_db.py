from backend.app.infrastructure.database.connection import SessionLocal
from backend.app.infrastructure.persistence.models import UserORM, CourierORM, ParcelORM, TourORM

db = SessionLocal()
print("=== USERS ===")
for u in db.query(UserORM).all():
    print(f"ID: {u.id:2d} | Username: {u.username:15s} | Role: {u.role:15s} | Nom: {u.nom_complet}")

print("\n=== COURIERS ===")
for c in db.query(CourierORM).all():
    print(f"ID: {c.id:2d} | Nom: {c.nom:30s} | Tel: {c.telephone:15s} | Véhicule: {c.type_vehicule:25s} | Actif: {c.actif}")

print("\n=== PARCELS & TOURS ===")
for p in db.query(ParcelORM).order_by(ParcelORM.id).all():
    print(f"Parcel #{p.id:2d} | BDR: {p.numero_bordereau:14s} | Date: {p.date_reception} | LivreurID: {p.livreur_id} | TourID: {p.tournee_id} | Statut: {p.statut}")

for t in db.query(TourORM).all():
    print(f"Tour #{t.id:2d} | Date: {t.date_tournee} | LivreurID: {t.livreur_id} | Statut: {t.statut}")

db.close()
