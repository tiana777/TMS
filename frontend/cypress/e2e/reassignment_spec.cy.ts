describe("Habilitations RBAC & Réassignation de Colis (Écrans 03, 04, 05) - Tests E2E Cypress", () => {
  const mockCouriers = [
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
  ];

  const mockTour = {
    id: 1,
    tour_date: "2026-11-08",
    courier_id: 1,
    courier_name: "RAKOTO Jean",
    courier_phone: "0341122233",
    courier_phone_formatted: "034 11 222 33",
    courier_vehicle: "Moto Cross 150cc",
    status: "EN_COURS",
    theoretical_total: 56000,
    actual_remitted: 0,
    discrepancy: -56000,
    parcels_count: 2,
    parcels: [
      {
        id: 201,
        tracking_number: "0001",
        recipient_name: "Rasoa Nirina",
        recipient_phone: "0341234567",
        recipient_phone_formatted: "034 12 345 67",
        operator: "TELMA",
        delivery_address: "Itaosy Cité près Pharmacie",
        designation: "Robe de soirée en soie",
        axis: "AXE_RN1",
        flux_type: "COD",
        total_to_collect: 50000,
        status: "ASSIGNE",
      },
      {
        id: 202,
        tracking_number: "0002",
        recipient_name: "Société Fiadanana",
        recipient_phone: "0325544332",
        recipient_phone_formatted: "032 55 443 32",
        operator: "ORANGE",
        delivery_address: "Zone Galaxy Andraharo Lot 4",
        designation: "Dossier audit & contrats",
        axis: "AXE_RN4",
        flux_type: "SIMPLE",
        total_to_collect: 6000,
        status: "EN_COURS",
      },
    ],
  };

  beforeEach(() => {
    // Intercept Couriers
    cy.intercept("GET", "**/api/v1/couriers*", {
      statusCode: 200,
      body: mockCouriers,
    }).as("getCouriers");

    // Intercept Stock Parcels
    cy.intercept("GET", "**/api/v1/parcels*status=EN_DEPOT*", {
      statusCode: 200,
      body: [],
    }).as("getStockParcels");

    // Intercept Tours List
    cy.intercept("GET", "**/api/v1/tours*", {
      statusCode: 200,
      body: [mockTour],
    }).as("getTours");

    // Intercept Tour Detail
    cy.intercept("GET", "**/api/v1/tours/1", {
      statusCode: 200,
      body: mockTour,
    }).as("getTourDetail");

    // Intercept Tracking Parcels
    cy.intercept("GET", "**/api/v1/parcels*", (req) => {
      if (!req.url.includes("status=EN_DEPOT")) {
        req.reply({
          statusCode: 200,
          body: mockTour.parcels,
        });
      }
    }).as("getTrackingParcels");
  });

  it("1. Devrait basculer entre les profils RBAC (Réceptionniste, Superviseur, Super Admin)", () => {
    cy.visit("/dispatch");
    cy.wait("@getCouriers");

    // Open Role Switcher Dropdown
    cy.get('[data-cy="role-switcher-btn"]').click();
    cy.get('[data-cy="role-switcher-dropdown"]').should("be.visible");

    // Select RECEPTIONNISTE
    cy.get('[data-cy="select-role-receptionniste"]').click();
    cy.get('[data-cy="active-role-badge"]').should("contain", "Accueil Hub");
    cy.window().then((win) => {
      expect(win.localStorage.getItem("tms_user_role")).to.eq("RECEPTIONNISTE");
    });

    // Select SUPER_ADMIN
    cy.get('[data-cy="role-switcher-btn"]').click();
    cy.get('[data-cy="select-role-super_admin"]').click();
    cy.get('[data-cy="active-role-badge"]').should("contain", "Super-Privilège");
    cy.window().then((win) => {
      expect(win.localStorage.getItem("tms_user_role")).to.eq("SUPER_ADMIN");
    });
  });

  it("2. [Écran 03/04] Réceptionniste peut réassigner un colis ASSIGNE mais est bloqué sur EN_COURS", () => {
    // Set role to RECEPTIONNISTE before visiting
    cy.visit("/dispatch", {
      onBeforeLoad(win) {
        win.localStorage.setItem("tms_user_role", "RECEPTIONNISTE");
      },
    });
    cy.wait("@getCouriers");
    cy.wait("@getTours");

    // Switch to Roadmaps tab
    cy.get('[data-cy="tab-roadmaps"]').click();
    cy.wait("@getTourDetail");

    // 2a. Reassign ASSIGNE parcel (Colis 201)
    cy.intercept("POST", "**/api/v1/parcels/201/reassign", {
      statusCode: 200,
      body: {
        id: 201,
        tracking_number: "0001",
        status: "ASSIGNE",
        courier_id: 2,
      },
    }).as("reassignAssignee");

    cy.get('[data-cy="reassign-btn-201"]').click();
    cy.get('[data-cy="reassign-modal"]').should("be.visible");
    cy.get('[data-cy="reassign-modal"]').should("contain", "Réassignation de Colis");

    // Select Courier 2 (ANDRY Nirina)
    cy.get('[data-cy="reassign-courier-select"]').select("2");
    cy.get('[data-cy="btn-confirm-reassign"]').click();

    cy.wait("@reassignAssignee").then((interception) => {
      expect(interception.request.headers["x-user-role"]).to.eq("RECEPTIONNISTE");
      expect(interception.request.body.courier_id).to.eq(2);
    });

    cy.get('[data-cy="reassign-modal"]').should("not.exist");

    // 2b. Attempt to reassign EN_COURS parcel (Colis 202) as RECEPTIONNISTE
    const alertStub = cy.stub();
    cy.on("window:alert", alertStub);

    cy.get('[data-cy="reassign-btn-202"]').click().then(() => {
      expect(alertStub).to.have.been.calledWithMatch(/Seul le Super Admin est habilité/);
    });

    // Modal must NOT be opened
    cy.get('[data-cy="reassign-modal"]').should("not.exist");
  });

  it("3. [Écran 03/04] Super Admin peut réassigner d'urgence un colis EN_COURS avec motif obligatoire", () => {
    // Set role to SUPER_ADMIN before visiting
    cy.visit("/dispatch", {
      onBeforeLoad(win) {
        win.localStorage.setItem("tms_user_role", "SUPER_ADMIN");
      },
    });
    cy.wait("@getCouriers");
    cy.wait("@getTours");

    // Switch to Roadmaps tab
    cy.get('[data-cy="tab-roadmaps"]').click();
    cy.wait("@getTourDetail");

    // Button should display 👑 Urgence
    cy.get('[data-cy="reassign-btn-202"]').should("contain", "👑 Urgence");

    cy.intercept("POST", "**/api/v1/parcels/202/reassign", {
      statusCode: 200,
      body: {
        id: 202,
        tracking_number: "0002",
        status: "ASSIGNE",
        courier_id: 2,
      },
    }).as("emergencyReassign");

    cy.get('[data-cy="reassign-btn-202"]').click();

    // Modal with Urgence title and mandatory reason input
    cy.get('[data-cy="reassign-modal"]').should("be.visible");
    cy.get('[data-cy="reassign-modal"]').should("contain", "Réassignation d'Urgence Terrain (Super Admin)");
    cy.get('[data-cy="reassign-reason-input"]').should("be.visible");

    // Fill in target courier and emergency reason
    cy.get('[data-cy="reassign-courier-select"]').select("2");
    cy.get('[data-cy="reassign-reason-input"]')
      .clear()
      .type("Panne moto coursier RAKOTO Jean - axe RN4");

    cy.get('[data-cy="btn-confirm-reassign"]').click();

    cy.wait("@emergencyReassign").then((interception) => {
      expect(interception.request.headers["x-user-role"]).to.eq("SUPER_ADMIN");
      expect(interception.request.body.courier_id).to.eq(2);
      expect(interception.request.body.reason).to.eq("Panne moto coursier RAKOTO Jean - axe RN4");
    });

    cy.get('[data-cy="reassign-modal"]').should("not.exist");
  });

  it("4. [Écran 05 - Pointage Terrain] Contrôle RBAC sur la réassignation de colis en cours", () => {
    // Visit tracking as RECEPTIONNISTE
    cy.visit("/tracking", {
      onBeforeLoad(win) {
        win.localStorage.setItem("tms_user_role", "RECEPTIONNISTE");
      },
    });
    cy.wait("@getTrackingParcels");
    cy.wait("@getCouriers");

    // Try to reassign EN_COURS parcel (Colis 202) as RECEPTIONNISTE
    cy.get('[data-cy="btn-reassign-202"]').click();
    cy.get('[data-cy="feedback-banner"]')
      .should("be.visible")
      .and("contain", "Seul le Super Admin est habilité");
    cy.get('[data-cy="modal-reassign"]').should("not.exist");

    // Switch role to SUPER_ADMIN via header
    cy.get('[data-cy="role-switcher-btn"]').click();
    cy.get('[data-cy="select-role-super_admin"]').click();

    // Now reassign button has Urgence title and allows modal opening
    cy.get('[data-cy="btn-reassign-202"]').should("contain", "👑 Urgence");
    cy.get('[data-cy="btn-reassign-202"]').click();

    cy.get('[data-cy="modal-reassign"]').should("be.visible");
    cy.get('[data-cy="modal-reassign"]').should("contain", "👑 Réassignation d'Urgence Terrain (Super Admin)");
    cy.get('[data-cy="reassign-reason-input"]').should("be.visible");

    cy.intercept("POST", "**/api/v1/parcels/202/reassign", {
      statusCode: 200,
      body: {
        id: 202,
        tracking_number: "0002",
        status: "ASSIGNE",
        courier_id: 2,
      },
    }).as("trackingReassign");

    cy.get('[data-cy="reassign-courier-select"]').select("2");
    cy.get('[data-cy="reassign-reason-input"]')
      .clear()
      .type("Accident léger - coursier remplacé");
    cy.get('[data-cy="btn-confirm-reassign"]').click();

    cy.wait("@trackingReassign").then((interception) => {
      expect(interception.request.headers["x-user-role"]).to.eq("SUPER_ADMIN");
      expect(interception.request.body.courier_id).to.eq(2);
      expect(interception.request.body.reason).to.eq("Accident léger - coursier remplacé");
    });

    cy.get('[data-cy="modal-reassign"]').should("not.exist");
  });
});
