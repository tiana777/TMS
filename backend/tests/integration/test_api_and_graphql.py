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
        assert len(axes) == 8
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
