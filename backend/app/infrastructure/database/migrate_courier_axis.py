"""Migration script to add assigned_axis column to livreurs table."""

from backend.app.infrastructure.database.connection import engine
from sqlalchemy import text

def run_migration():
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE livreurs ADD COLUMN IF NOT EXISTS assigned_axis VARCHAR(50);"))
        conn.execute(text("UPDATE livreurs SET assigned_axis = 'AXE_CENTRE' WHERE id = 1;"))
        conn.execute(text("UPDATE livreurs SET assigned_axis = 'AXE_RN1' WHERE id = 2;"))
        conn.execute(text("UPDATE livreurs SET assigned_axis = 'AXE_PROVINCE' WHERE id = 3;"))
        # Distribute remaining couriers across axes
        axes = [
            "AXE_CENTRE",
            "AXE_RN1",
            "AXE_RN2",
            "AXE_RN3",
            "AXE_RN4",
            "AXE_RN7",
            "AXE_SUD_EST",
            "AXE_PROVINCE",
        ]
        result = conn.execute(text("SELECT id FROM livreurs WHERE id > 3 ORDER BY id;"))
        rows = result.fetchall()
        for idx, row in enumerate(rows):
            axis = axes[idx % len(axes)]
            conn.execute(text(f"UPDATE livreurs SET assigned_axis = '{axis}' WHERE id = {row[0]};"))
        conn.commit()
    print("Migration successful! Couriers assigned to axes.")

if __name__ == "__main__":
    run_migration()
