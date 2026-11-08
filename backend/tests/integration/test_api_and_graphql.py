"""Integration tests for FastAPI REST API & Strawberry GraphQL endpoints."""

import pytest
from fastapi.testclient import TestClient
from backend.app.infrastructure.database.seed import seed_master_data
from backend.app.main import app

client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    seed_master_data()


class TestRESTandGraphQLAPI:
    def test_health_check(self):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["timezone"] == "Indian/Antananarivo"
        assert data["currency"] == "MGA"

    def test_auth_login_and_me(self):
        # 1. Login with admin
        login_res = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        assert login_res.status_code == 200
        auth_data = login_res.json()
        assert "access_token" in auth_data
        assert auth_data["role"] == "SUPER_ADMIN"
        token = auth_data["access_token"]

        # 2. Access protected endpoint /me
        headers = {"Authorization": f"Bearer {token}"}
        me_res = client.get("/api/v1/auth/me", headers=headers)
        assert me_res.status_code == 200
        me_data = me_res.json()
        assert me_data["username"] == "admin"
        assert me_data["role"] == "SUPER_ADMIN"

    def test_parcel_creation_and_lifecycle_via_rest(self):
        # Login as reception agent
        login_res = client.post(
            "/api/v1/auth/login",
            json={"username": "reception", "password": "recep123"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Create parcel (auto-detects AXE_RN1 from Itaosy)
        payload = {
            "vendor_id": 1,
            "recipient_name": "Madame Rasoa",
            "recipient_phone": "0341234567",
            "delivery_address": "Itaosy Cité Seimad",
            "flux_type": "COD",
            "merchandise_amount": 50000,
            "delivery_fee": 5000,
        }
        res = client.post("/api/v1/parcels", json=payload, headers=headers)
        assert res.status_code == 201
        parcel = res.json()
        assert parcel["id"] is not None
        assert parcel["axis"] == "AXE_RN1"
        assert parcel["operator"] == "TELMA"
        assert parcel["total_to_collect"] == 55000
        assert parcel["total_to_collect_formatted"] == "55 000 Ar"
        p_id = parcel["id"]

        # 2. Login as superviseur to assign parcel
        sup_login = client.post(
            "/api/v1/auth/login",
            json={"username": "superviseur", "password": "super123"},
        )
        sup_token = sup_login.json()["access_token"]
        sup_headers = {"Authorization": f"Bearer {sup_token}"}

        # Assign to courier 1
        assign_res = client.patch(
            f"/api/v1/parcels/{p_id}/status",
            json={"status": "ASSIGNE", "courier_id": 1},
            headers=sup_headers,
        )
        assert assign_res.status_code == 200
        assert assign_res.json()["status"] == "ASSIGNE"

        # Start delivery
        start_res = client.patch(
            f"/api/v1/parcels/{p_id}/status",
            json={"status": "EN_COURS"},
            headers=sup_headers,
        )
        assert start_res.status_code == 200
        assert start_res.json()["status"] == "EN_COURS"

        # Deliver with Mobile Money (MVola)
        deliver_res = client.patch(
            f"/api/v1/parcels/{p_id}/status",
            json={"status": "LIVRE_ENCAISSE", "payment_method": "MVOLA"},
            headers=sup_headers,
        )
        assert deliver_res.status_code == 200
        assert deliver_res.json()["status"] == "LIVRE_ENCAISSE"
        assert deliver_res.json()["payment_method"] == "MVOLA"

    def test_parcel_separated_livre_and_encaisse_via_rest(self):
        # 1. Login as reception
        login_res = client.post(
            "/api/v1/auth/login",
            json={"username": "reception", "password": "recep123"},
        )
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create parcel
        payload = {
            "vendor_id": 1,
            "recipient_name": "Monsieur Andry",
            "recipient_phone": "0329988776",
            "delivery_address": "Analakely Centre",
            "merchandise_amount": 35000,
            "delivery_fee": 5000,
        }
        create_res = client.post("/api/v1/parcels", json=payload, headers=headers)
        assert create_res.status_code == 201
        p_id = create_res.json()["id"]

        # 2. Login as supervisor
        sup_login = client.post(
            "/api/v1/auth/login",
            json={"username": "superviseur", "password": "super123"},
        )
        sup_token = sup_login.json()["access_token"]
        sup_headers = {"Authorization": f"Bearer {sup_token}"}

        # Assign to courier 1
        client.patch(
            f"/api/v1/parcels/{p_id}/status",
            json={"status": "ASSIGNE", "courier_id": 1},
            headers=sup_headers,
        )

        # Step 3: Transition to LIVRE (no payment required)
        livre_res = client.patch(
            f"/api/v1/parcels/{p_id}/status",
            json={"status": "LIVRE"},
            headers=sup_headers,
        )
        assert livre_res.status_code == 200
        assert livre_res.json()["status"] == "LIVRE"
        assert livre_res.json()["payment_method"] is None

        # Step 4: Transition from LIVRE to ENCAISSE (with payment method)
        encaisse_res = client.patch(
            f"/api/v1/parcels/{p_id}/status",
            json={"status": "ENCAISSE", "payment_method": "ORANGE_MONEY"},
            headers=sup_headers,
        )
        assert encaisse_res.status_code == 200
        assert encaisse_res.json()["status"] == "ENCAISSE"
        assert encaisse_res.json()["payment_method"] == "ORANGE_MONEY"

    def test_parcel_prepaid_cancels_cod_via_rest(self):
        # 1. Login as reception & create COD parcel
        login_res = client.post(
            "/api/v1/auth/login",
            json={"username": "reception", "password": "recep123"},
        )
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        payload = {
            "vendor_id": 1,
            "recipient_name": "Madame Voahirana",
            "recipient_phone": "0342233445",
            "delivery_address": "Isoraka Lot 12",
            "merchandise_amount": 75000,
            "delivery_fee": 5000,
        }
        create_res = client.post("/api/v1/parcels", json=payload, headers=headers)
        assert create_res.status_code == 201
        p_id = create_res.json()["id"]
        assert create_res.json()["total_to_collect"] == 80000

        # 2. Login as supervisor
        sup_login = client.post(
            "/api/v1/auth/login",
            json={"username": "superviseur", "password": "super123"},
        )
        sup_token = sup_login.json()["access_token"]
        sup_headers = {"Authorization": f"Bearer {sup_token}"}

        # Put parcel in course
        client.patch(
            f"/api/v1/parcels/{p_id}/status",
            json={"status": "ASSIGNE", "courier_id": 2},
            headers=sup_headers,
        )
        client.patch(
            f"/api/v1/parcels/{p_id}/status",
            json={"status": "EN_COURS"},
            headers=sup_headers,
        )

        # 3. Customer pays shop directly by MVola: neutralize COD
        prepaid_res = client.post(
            f"/api/v1/parcels/{p_id}/prepaid",
            json={
                "prepaid_type": "ALL",
                "payment_method": "MVOLA",
                "payment_reference": "REF-MV-8877",
            },
            headers=sup_headers,
        )
        assert prepaid_res.status_code == 200
        p_data = prepaid_res.json()
        assert p_data["total_to_collect"] == 0
        assert p_data["merchandise_amount"] == 0
        assert p_data["delivery_fee"] == 0
        assert p_data["flux_type"] == "SIMPLE"
        assert p_data["payment_method"] == "MVOLA"

        # 4. Courier delivers parcel physically with 0 Ar collection
        deliver_res = client.patch(
            f"/api/v1/parcels/{p_id}/status",
            json={"status": "LIVRE"},
            headers=sup_headers,
        )
        assert deliver_res.status_code == 200
        assert deliver_res.json()["status"] == "LIVRE"
        assert deliver_res.json()["total_to_collect"] == 0

    def test_graphql_queries(self):
        # 1. Query axes
        query = """
        query {
            axes {
                code
                libelle
                zones
            }
        }
        """
        response = client.post("/graphql", json={"query": query})
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        axes = data["data"]["axes"]
        assert len(axes) >= 8
        codes = [a["code"] for a in axes]
        assert "AXE_CENTRE" in codes
        assert "AXE_PROVINCE" in codes

        # 2. Query couriers
        query_couriers = """
        query {
            couriers {
                id
                name
                phoneFormatted
                vehicleType
            }
        }
        """
        res_c = client.post("/graphql", json={"query": query_couriers})
        assert res_c.status_code == 200
        couriers = res_c.json()["data"]["couriers"]
        assert len(couriers) >= 3

    def test_graphql_mutation_create_parcel(self):
        mutation = """
        mutation {
            createParcel(input: {
                vendorId: 1,
                recipientName: "Test GraphQL Client",
                recipientPhone: "0329988776",
                deliveryAddress: "Gare Ambodivona vers Tamatave",
                fluxType: "PROVINCE",
                merchandiseAmount: 120000,
                deliveryFee: 10000
            }) {
                id
                trackingNumber
                axis
                operator
                totalToCollect
                status
            }
        }
        """
        response = client.post("/graphql", json={"query": mutation})
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        parcel = data["data"]["createParcel"]
        assert parcel["id"] is not None
        assert parcel["axis"] == "AXE_PROVINCE"
        assert parcel["operator"] == "ORANGE"
        assert parcel["totalToCollect"] == 130000
        assert parcel["status"] == "EN_DEPOT"

    def test_tour_dispatching_and_roadmap_lifecycle(self):
        login_res = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Create two parcels for dispatch
        p1_res = client.post(
            "/api/v1/parcels",
            json={
                "vendor_id": 1,
                "recipient_name": "Dispatch Client 1",
                "recipient_phone": "0341234567",
                "delivery_address": "Itaosy Cité",
                "designation": "Robe Soie Bleue",
                "flux_type": "COD",
                "merchandise_amount": 40000,
                "delivery_fee": 5000,
            },
            headers=headers,
        )
        assert p1_res.status_code == 201
        p1_id = p1_res.json()["id"]

        p2_res = client.post(
            "/api/v1/parcels",
            json={
                "vendor_id": 1,
                "recipient_name": "Dispatch Client 2",
                "recipient_phone": "0328877665",
                "delivery_address": "Ambohimanarina",
                "designation": "Smartphone Accessoire",
                "flux_type": "COD",
                "merchandise_amount": 60000,
                "delivery_fee": 5000,
            },
            headers=headers,
        )
        assert p2_res.status_code == 201
        p2_id = p2_res.json()["id"]

        # 2. Assign both parcels to a courier on a unique date
        import uuid
        unique_date = f"{2035 + (uuid.uuid4().int % 50):04d}-{uuid.uuid4().int % 12 + 1:02d}-{uuid.uuid4().int % 28 + 1:02d}"
        tour_res = client.post(
            "/api/v1/tours",
            json={
                "courier_id": 3,
                "tour_date": unique_date,
                "parcel_ids": [p1_id, p2_id],
            },
            headers=headers,
        )
        assert tour_res.status_code == 201
        tour_id = tour_res.json()["id"]

        # 3. Fetch tour detail roadmap
        detail_res = client.get(f"/api/v1/tours/{tour_id}", headers=headers)
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert detail["courier_name"] is not None
        assert detail["courier_phone_formatted"] is not None
        assert detail["parcels_count"] == 2
        assert len(detail["parcels"]) == 2
        p_ids = [p["id"] for p in detail["parcels"]]
        assert p1_id in p_ids and p2_id in p_ids

        # 4. Unassign parcel 2
        unassign_res = client.post(f"/api/v1/tours/{tour_id}/unassign/{p2_id}", headers=headers)
        assert unassign_res.status_code == 200
        updated = unassign_res.json()
        assert updated["parcels_count"] == 1
        assert len(updated["parcels"]) == 1

        # Verify parcel 2 is back in stock EN_DEPOT
        p2_check = client.get(f"/api/v1/parcels/{p2_id}", headers=headers).json()
        assert p2_check["status"] == "EN_DEPOT"
        assert p2_check["tour_id"] is None

        # 5. Start tour
        start_res = client.post(f"/api/v1/tours/{tour_id}/start", headers=headers)
        assert start_res.status_code == 200
        assert start_res.json()["status"] == "EN_COURS"

        # Verify parcel 1 is EN_COURS
        p1_check = client.get(f"/api/v1/parcels/{p1_id}", headers=headers).json()
        assert p1_check["status"] == "EN_COURS"

        # 6. Test GraphQL query for tour
        gql_res = client.post(
            "/graphql",
            json={
                "query": f"""
                query {{
                    tour(id: {tour_id}) {{
                        id
                        status
                        courierName
                        parcelsCount
                        parcels {{
                            id
                            trackingNumber
                            status
                            recipientName
                        }}
                    }}
                }}
                """
            },
        )
        assert gql_res.status_code == 200
        gql_data = gql_res.json()["data"]["tour"]
        assert gql_data["id"] == tour_id
        assert gql_data["status"] == "EN_COURS"
        assert gql_data["parcelsCount"] == 1
        assert len(gql_data["parcels"]) == 1

    def test_courier_capacity_constraint_and_parameter_update(self):
        login_res = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        assert login_res.status_code == 200
        headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

        # 1. Create a courier with custom limit of 2 parcels
        import uuid
        c_name = f"Test Courier {uuid.uuid4().hex[:6]}"
        c_res = client.post(
            "/api/v1/couriers",
            json={
                "name": c_name,
                "phone": "0349988776",
                "vehicle_type": "Scooter 125cc",
                "security_deposit": 100000,
                "max_parcels": 2,
            },
            headers=headers,
        )
        assert c_res.status_code == 201
        courier_id = c_res.json()["id"]
        assert c_res.json()["max_parcels"] == 2

        # 2. Create 3 parcels
        p_ids = []
        for i in range(3):
            p_res = client.post(
                "/api/v1/parcels",
                json={
                    "vendor_id": 1,
                    "recipient_name": f"Client Capacity {i}",
                    "recipient_phone": "0341122334",
                    "delivery_address": "Tsiazotafo",
                    "designation": f"Colis {i}",
                    "flux_type": "COD",
                    "merchandise_amount": 10000,
                    "delivery_fee": 3000,
                },
                headers=headers,
            )
            assert p_res.status_code == 201
            p_ids.append(p_res.json()["id"])

        # 3. Attempt to assign 3 parcels to courier who is limited to 2 -> Must fail with 400
        date_str = f"{2045 + (uuid.uuid4().int % 20):04d}-05-15"
        fail_res = client.post(
            "/api/v1/tours",
            json={
                "courier_id": courier_id,
                "tour_date": date_str,
                "parcel_ids": p_ids,
            },
            headers=headers,
        )
        assert fail_res.status_code == 400
        assert "Capacité maximale dépassée" in fail_res.json()["detail"]

        # 4. Assigning 2 parcels (within limit) -> Must succeed
        ok_res = client.post(
            "/api/v1/tours",
            json={
                "courier_id": courier_id,
                "tour_date": date_str,
                "parcel_ids": p_ids[:2],
            },
            headers=headers,
        )
        assert ok_res.status_code == 201

        # 5. Parameterize/Update courier capacity from 2 to 5
        patch_res = client.patch(
            f"/api/v1/couriers/{courier_id}/capacity",
            json={"max_parcels": 5},
            headers=headers,
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["max_parcels"] == 5

        # 6. Now assign the 3rd parcel -> Must succeed
        add_res = client.post(
            "/api/v1/tours",
            json={
                "courier_id": courier_id,
                "tour_date": date_str,
                "parcel_ids": [p_ids[2]],
            },
            headers=headers,
        )
        assert add_res.status_code == 201

    def test_caisse_centrale_bulk_close_and_tour_closure_reconciliation(self):
        # 1. Login as admin
        login_res = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Create two parcels with COD
        import uuid
        uid1 = uuid.uuid4().hex[:4]
        p1_res = client.post(
            "/api/v1/parcels",
            json={
                "tracking_number": f"CSH-{uid1}",
                "reception_date": "2026-11-08",
                "vendor_id": 1,
                "recipient_name": "Madame Caisse 1",
                "recipient_phone": "0341122334",
                "delivery_address": "Analakely",
                "axis": "AXE_CENTRE",
                "flux_type": "COD",
                "merchandise_amount": 20000,
                "delivery_fee": 3000,
            },
            headers=headers,
        )
        assert p1_res.status_code == 201
        p1_id = p1_res.json()["id"]

        uid2 = uuid.uuid4().hex[:4]
        p2_res = client.post(
            "/api/v1/parcels",
            json={
                "tracking_number": f"CSH-{uid2}",
                "reception_date": "2026-11-08",
                "vendor_id": 1,
                "recipient_name": "Monsieur Caisse 2",
                "recipient_phone": "0329988776",
                "delivery_address": "Ambohijatovo",
                "axis": "AXE_CENTRE",
                "flux_type": "COD",
                "merchandise_amount": 40000,
                "delivery_fee": 5000,
            },
            headers=headers,
        )
        assert p2_res.status_code == 201
        p2_id = p2_res.json()["id"]

        # 3. Create tour and assign parcels
        unique_date = f"{2040 + (uuid.uuid4().int % 50):04d}-{uuid.uuid4().int % 12 + 1:02d}-{uuid.uuid4().int % 28 + 1:02d}"
        tour_res = client.post(
            "/api/v1/tours",
            json={
                "courier_id": 2,
                "tour_date": unique_date,
                "parcel_ids": [p1_id, p2_id],
            },
            headers=headers,
        )
        assert tour_res.status_code == 201
        tour_id = tour_res.json()["id"]

        # Start tour
        start_res = client.post(f"/api/v1/tours/{tour_id}/start", headers=headers)
        assert start_res.status_code == 200

        # 4. Mark parcel 1 as ENCAISSE (ESPECES)
        s1 = client.patch(
            f"/api/v1/parcels/{p1_id}/status",
            json={"status": "ENCAISSE", "payment_method": "ESPECES"},
            headers=headers,
        )
        assert s1.status_code == 200
        assert s1.json()["status"] == "ENCAISSE"

        # 5. Mark parcel 2 as LIVRE then ENCAISSE (MVOLA)
        s2 = client.patch(
            f"/api/v1/parcels/{p2_id}/status",
            json={"status": "LIVRE"},
            headers=headers,
        )
        assert s2.status_code == 200
        assert s2.json()["status"] == "LIVRE"

        s2_cash = client.patch(
            f"/api/v1/parcels/{p2_id}/status",
            json={"status": "ENCAISSE", "payment_method": "MVOLA"},
            headers=headers,
        )
        assert s2_cash.status_code == 200
        assert s2_cash.json()["status"] == "ENCAISSE"

        # 6. Bulk close cash on both parcels (Écran 07)
        bulk_res = client.post(
            "/api/v1/parcels/bulk-close-cash",
            json={"parcel_ids": [p1_id, p2_id]},
            headers=headers,
        )
        assert bulk_res.status_code == 200
        closed_list = bulk_res.json()
        assert len(closed_list) == 2
        assert all(p["status"] == "CLOTURE_CAISSE" for p in closed_list)

        # 7. Close tour with discrepancy = 0 (Total theorique = 23000 + 45000 = 68000) (Écran 08)
        close_res = client.post(
            f"/api/v1/tours/{tour_id}/close",
            json={"cash_and_mobile_remitted": 68000},
            headers=headers,
        )
        assert close_res.status_code == 200
        closed_tour = close_res.json()
        assert closed_tour["status"] == "CLOTURE"
        assert closed_tour["theoretical_total"] == 68000
        assert closed_tour["actual_remitted"] == 68000
        assert closed_tour["discrepancy"] == 0

    def test_scorecards_fleet_leaderboard(self):
        login_res = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        res = client.get("/api/v1/couriers/scorecards/leaderboard?period=2026-11", headers=headers)
        assert res.status_code == 200
        board = res.json()
        assert isinstance(board, list)
        if len(board) > 0:
            top = board[0]
            assert "global_score" in top
            assert "tier" in top
            assert "courier_name" in top

    def test_dispute_creation_repayment_and_force_majeure(self):
        login_res = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Create a dispute for courier 1
        create_res = client.post(
            "/api/v1/disputes",
            json={
                "livreur_id": 1,
                "incident_type": "FAUX_BILLET",
                "initial_amount": 20000,
                "reason": "Faux billet de 20 000 Ar accepté à Analakely",
                "incident_date": "2026-11-08",
            },
            headers=headers,
        )
        assert create_res.status_code == 201
        dispute_data = create_res.json()
        debt_id = dispute_data["id"]
        assert dispute_data["remaining_balance"] == 20000
        assert dispute_data["status"] == "OUVERTE"
        assert dispute_data["livreur_name"] is not None

        # 2. Repay partially (5 000 Ar) with Option B Retenue Salaire
        repay_res = client.post(
            f"/api/v1/disputes/{debt_id}/repay",
            json={"amount": 5000, "mode": "RETENUE_SALAIRE"},
            headers=headers,
        )
        assert repay_res.status_code == 200
        partially_paid = repay_res.json()
        assert partially_paid["remaining_balance"] == 15000
        assert partially_paid["refunded_amount"] == 5000
        assert partially_paid["status"] == "EN_COURS"

        # 3. Create a dispute and exonerate under Force Majeure with police PV
        pv_res = client.post(
            "/api/v1/disputes",
            json={
                "livreur_id": 1,
                "incident_type": "PERTE_COLIS",
                "initial_amount": 50000,
                "reason": "Agression avec vol armé en tournée",
                "incident_date": "2026-11-08",
            },
            headers=headers,
        )
        assert pv_res.status_code == 201
        pv_debt_id = pv_res.json()["id"]

        cancel_res = client.post(
            f"/api/v1/disputes/{pv_debt_id}/force-majeure",
            json={"police_report": "PV-POLICE-0921-2026"},
            headers=headers,
        )
        assert cancel_res.status_code == 200
        cancelled = cancel_res.json()
        assert cancelled["status"] == "ANNULEE_FORCE_MAJEURE"

    def test_master_data_zones_partners_and_vendor_updates(self):
        login_res = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Create a partner cooperative
        import uuid
        uid = uuid.uuid4().hex[:4]
        partner_res = client.post(
            "/api/v1/master/partners",
            json={
                "nom": f"Coopérative Test {uid}",
                "type": "COOPERATIVE",
                "contact": "034 00 111 22",
                "gare_rattachement": "Gare Ambodivona",
            },
            headers=headers,
        )
        assert partner_res.status_code == 201
        p_data = partner_res.json()
        assert p_data["nom"] == f"Coopérative Test {uid}"
        assert p_data["type"] == "COOPERATIVE"

        # 2. Add zone to axis 1
        zone_res = client.post(
            "/api/v1/master/axes/1/zones",
            json={"nom": f"Quartier Test {uid}"},
            headers=headers,
        )
        assert zone_res.status_code == 200
        axis_data = zone_res.json()
        assert f"Quartier Test {uid}" in axis_data["zones"]

        # 3. Update a vendor
        vendor_res = client.patch(
            "/api/v1/master/vendors/1",
            json={
                "adresse": "Pavillon Analakely Box 99",
                "modalite_paiement": "FACTURE_MENSUELLE",
            },
            headers=headers,
        )
        assert vendor_res.status_code == 200
        v_data = vendor_res.json()
        assert v_data["adresse"] == "Pavillon Analakely Box 99"
        assert v_data["modalite_paiement"] == "FACTURE_MENSUELLE"

    def test_province_outsource_with_vehicle_and_driver_and_cod_collection(self):
        login_res = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Create a province parcel with COD
        import uuid
        uid = uuid.uuid4().hex[:4]
        res = client.post(
            "/api/v1/parcels",
            json={
                "tracking_number": f"PRV-{uid}",
                "reception_date": "2026-11-08",
                "vendor_id": 1,
                "recipient_name": "Rabe Province",
                "recipient_phone": "0345566778",
                "delivery_address": "Gare Ambodivona vers Tamatave",
                "axis": "AXE_PROVINCE",
                "flux_type": "PROVINCE",
                "merchandise_amount": 75000,
                "delivery_fee": 10000,
            },
            headers=headers,
        )
        assert res.status_code == 201
        p_id = res.json()["id"]

        # 2. Outsource to province with vehicle plate & driver contact
        outsource_res = client.patch(
            f"/api/v1/parcels/{p_id}/status",
            json={
                "status": "SOUS_TRAITE",
                "partner_name": "Cotisse Transport",
                "partner_reference": f"COT-{uid}",
                "partner_fee": 12000,
                "vehicle_plate": "1234 TAB",
                "driver_contact": "Rakoto 034 11 222 33",
            },
            headers=headers,
        )
        assert outsource_res.status_code == 200
        data = outsource_res.json()
        assert data["status"] == "SOUS_TRAITE"
        assert data["vehicle_plate"] == "1234 TAB"
        assert data["driver_contact"] == "Rakoto 034 11 222 33"
        assert data["partner_reference"] == f"COT-{uid}"

        # 3. Upon receiving driver & vehicle proof, recipient pays COD via MVola
        pay_res = client.patch(
            f"/api/v1/parcels/{p_id}/status",
            json={
                "status": "ENCAISSE",
                "payment_method": "MVOLA",
            },
            headers=headers,
        )
        assert pay_res.status_code == 200
        paid_data = pay_res.json()
        assert paid_data["status"] == "ENCAISSE"
        assert paid_data["payment_method"] == "MVOLA"

    def test_axis_management_crud_and_rbac(self):
        import uuid
        uid = uuid.uuid4().hex[:6].upper()
        urban_code = f"AXE_BYPASS_{uid}"
        prov_code = f"AXE_PROV_{uid}"
        zone_name = f"Zone_{uid}"

        # 1. Login as RECEPTIONNISTE and attempt to create an axis -> 403
        rec_res = client.post("/api/v1/auth/login", json={"username": "reception", "password": "recep123"})
        assert rec_res.status_code == 200
        rec_token = rec_res.json()["access_token"]
        rec_headers = {"Authorization": f"Bearer {rec_token}"}

        forbidden_res = client.post(
            "/api/v1/master/axes",
            json={"code": f"AXE_FORBID_{uid}", "libelle": "Axe interdit", "type_axe": "URBAIN"},
            headers=rec_headers,
        )
        assert forbidden_res.status_code == 403

        # 2. Login as SUPERVISEUR -> can create an Urban and a Province axis
        sup_res = client.post("/api/v1/auth/login", json={"username": "superviseur", "password": "super123"})
        assert sup_res.status_code == 200
        sup_token = sup_res.json()["access_token"]
        sup_headers = {"Authorization": f"Bearer {sup_token}"}

        # Create urban axis
        create_urban = client.post(
            "/api/v1/master/axes",
            json={
                "code": urban_code,
                "libelle": "Axe By-Pass Sud (Alasora / Iavoloha)",
                "type_axe": "URBAIN",
                "zones": [zone_name, f"PK10_{uid}"],
            },
            headers=sup_headers,
        )
        assert create_urban.status_code == 201
        urban_data = create_urban.json()
        assert urban_data["code"] == urban_code
        assert urban_data["type_axe"] == "URBAIN"
        assert zone_name in urban_data["zones"]
        urban_id = urban_data["id"]

        # Create province axis
        create_prov = client.post(
            "/api/v1/master/axes",
            json={
                "code": prov_code,
                "libelle": "Axe Province Sud (RN7 Fianarantsoa / Tuléar)",
                "type_axe": "PROVINCE",
                "zones": [f"Antsirabe_{uid}", f"Ambositra_{uid}"],
            },
            headers=sup_headers,
        )
        assert create_prov.status_code == 201
        prov_data = create_prov.json()
        assert prov_data["code"] == prov_code
        assert prov_data["type_axe"] == "PROVINCE"
        prov_id = prov_data["id"]

        # 3. Superviseur updates urban axis
        patch_res = client.patch(
            f"/api/v1/master/axes/{urban_id}",
            json={"libelle": "Axe By-Pass Sud Réaménagé"},
            headers=sup_headers,
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["libelle"] == "Axe By-Pass Sud Réaménagé"

        # 4. Superviseur adds and deletes a zone
        new_z_name = f"Ambohimiadana_{uid}"
        add_zone = client.post(
            f"/api/v1/master/axes/{urban_id}/zones",
            json={"nom": new_z_name},
            headers=sup_headers,
        )
        assert add_zone.status_code == 200
        assert new_z_name in add_zone.json()["zones"]
        new_zone_id = [z["id"] for z in add_zone.json()["zones_detail"] if z["nom"] == new_z_name][0]

        del_zone = client.delete(
            f"/api/v1/master/axes/{urban_id}/zones/{new_zone_id}",
            headers=sup_headers,
        )
        assert del_zone.status_code == 200
        assert new_z_name not in del_zone.json()["zones"]

        # 5. Superviseur deletes (soft-delete) the urban axis
        del_axis = client.delete(f"/api/v1/master/axes/{urban_id}", headers=sup_headers)
        assert del_axis.status_code == 200
        assert del_axis.json()["success"] is True

        # Verify active axes list does not include the soft-deleted axis
        list_res = client.get("/api/v1/master/axes")
        assert list_res.status_code == 200
        active_codes = [a["code"] for a in list_res.json()]
        assert urban_code not in active_codes

        # 6. Admin can also manage all axes
        admin_res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
        assert admin_res.status_code == 200
        admin_headers = {"Authorization": f"Bearer {admin_res.json()['access_token']}"}

        admin_del_prov = client.delete(f"/api/v1/master/axes/{prov_id}", headers=admin_headers)
        assert admin_del_prov.status_code == 200

        # Cleanup test records
        from backend.app.infrastructure.database.connection import SessionLocal
        from backend.app.infrastructure.persistence.models import AxisORM, ZoneORM
        clean_db = SessionLocal()
        try:
            clean_db.query(ZoneORM).filter(ZoneORM.axe_id.in_([urban_id, prov_id])).delete(synchronize_session=False)
            clean_db.query(AxisORM).filter(AxisORM.id.in_([urban_id, prov_id])).delete(synchronize_session=False)
            clean_db.commit()
        finally:
            clean_db.close()

