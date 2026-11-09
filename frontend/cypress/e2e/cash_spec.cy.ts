describe("Écran 07 : Caisse Centrale & Écran 08 : Décharge de Tournée - Tests E2E Cypress", () => {
  const mockParcels = [
    {
      id: 501,
      tracking_number: "0501",
      reception_date: "2026-11-08",
      vendor_id: 1,
      sender_name: "Mod'Tanà Boutique",
      recipient_name: "Rasoa Nirina",
      recipient_phone: "0341234567",
      recipient_phone_formatted: "034 12 345 67",
      delivery_address: "Itaosy Cité",
      axis: "AXE_RN1",
      flux_type: "COD",
      merchandise_amount: 50000,
      delivery_fee: 5000,
      total_to_collect: 55000,
      total_to_collect_formatted: "55 000 Ar",
      status: "ENCAISSE",
      payment_method: "ESPECES",
      tour_id: 1,
    },
    {
      id: 502,
      tracking_number: "0502",
      reception_date: "2026-11-08",
      vendor_id: 1,
      sender_name: "Mod'Tanà Boutique",
      recipient_name: "Koto Félix",
      recipient_phone: "0325544332",
      recipient_phone_formatted: "032 55 443 32",
      delivery_address: "Analamahitsy",
      axis: "AXE_RN3",
      flux_type: "COD",
      merchandise_amount: 30000,
      delivery_fee: 4000,
      total_to_collect: 34000,
      total_to_collect_formatted: "34 000 Ar",
      status: "LIVRE_ENCAISSE",
      payment_method: "MVOLA",
      tour_id: 1,
    },
    {
      id: 503,
      tracking_number: "0503",
      reception_date: "2026-11-08",
      vendor_id: 2,
      sender_name: "Cabinet Juridique & Audit",
      recipient_name: "Maître Hery",
      recipient_phone: "0331122334",
      recipient_phone_formatted: "033 11 223 34",
      delivery_address: "Antsakaviro",
      axis: "AXE_CENTRE",
      flux_type: "SIMPLE",
      merchandise_amount: 0,
      delivery_fee: 5000,
      total_to_collect: 0,
      total_to_collect_formatted: "0 Ar",
      status: "CLOTURE_CAISSE",
      payment_method: "ESPECES",
      tour_id: 1,
    },
  ];

  const mockTours = [
    {
      id: 1,
      tour_date: "2026-11-08",
      courier_id: 1,
      courier_name: "Rakoto Jean (Livreur 01)",
      courier_phone: "0341234567",
      courier_phone_formatted: "034 12 345 67",
      courier_vehicle: "Scooter 110cc",
      status: "EN_COURS",
      theoretical_total: 89000,
      actual_remitted: 0,
      discrepancy: -89000,
      parcels_count: 3,
      parcels: mockParcels,
    },
  ];

  beforeEach(() => {
    cy.intercept("GET", "**/api/v1/parcels*", {
      statusCode: 200,
      body: mockParcels,
    }).as("getParcels");

    cy.intercept("GET", "**/api/v1/tours?date=*", {
      statusCode: 200,
      body: mockTours,
    }).as("getTours");

    cy.intercept("GET", "**/api/v1/tours/1", {
      statusCode: 200,
      body: mockTours[0],
    }).as("getTourDetail");

    cy.intercept("GET", "**/api/v1/couriers", {
      statusCode: 200,
      body: [
        {
          id: 1,
          name: "Rakoto Jean (Livreur 01)",
          phone: "0341234567",
          phone_formatted: "034 12 345 67",
          vehicle_type: "Scooter 110cc",
          security_deposit: 150000,
          security_deposit_formatted: "150 000 Ar",
          active: true,
        },
      ],
    }).as("getCouriers");

    cy.intercept("PATCH", "**/api/v1/parcels/501/status", {
      statusCode: 200,
      body: {
        ...mockParcels[0],
        status: "CLOTURE_CAISSE",
      },
    }).as("closeParcel501");

    cy.intercept("POST", "**/api/v1/parcels/bulk-close-cash", {
      statusCode: 200,
      body: [
        { ...mockParcels[0], status: "CLOTURE_CAISSE" },
        { ...mockParcels[1], status: "CLOTURE_CAISSE" },
      ],
    }).as("bulkCloseCash");

    cy.intercept("POST", "**/api/v1/tours/1/close", (req) => {
      const remitted = req.body.cash_and_mobile_remitted;
      const discrepancy = remitted - 89000;
      req.reply({
        statusCode: 200,
        body: {
          ...mockTours[0],
          status: "CLOTURE",
          actual_remitted: remitted,
          discrepancy: discrepancy,
          closed_at: "2026-11-08T18:30:00Z",
        },
      });
    }).as("closeTour");
  });

  it("Test 1: Écran 07 - Affichage des KPIs de caisse et filtrage des paiements", () => {
    cy.visit("/cash");
    cy.wait(["@getParcels", "@getTours", "@getCouriers"]);

    // Vérifier les onglets
    cy.get('[data-cy="tab-caisse"]').should("be.visible").and("contain", "07. Caisse Centrale COD");
    cy.get('[data-cy="tab-decharge"]').should("be.visible").and("contain", "08. Décharge & Clôture");

    // Vérifier la présence du tableau
    cy.get('[data-cy="cash-parcels-table"]').should("be.visible");
    cy.get('[data-cy="cash-parcel-row-501"]').should("contain", "BDR-0501").and("contain", "55 000 Ar");
    cy.get('[data-cy="cash-parcel-row-502"]').should("contain", "BDR-0502").and("contain", "34 000 Ar");

    // Filtrer par mode de paiement MVola
    cy.get('[data-cy="payment-cash-filter"]').select("MVOLA");
    cy.get('[data-cy="cash-parcel-row-502"]').should("be.visible");
    cy.get('[data-cy="cash-parcel-row-501"]').should("not.exist");

    // Remettre tous les modes
    cy.get('[data-cy="payment-cash-filter"]').select("ALL");
    cy.get('[data-cy="cash-parcel-row-501"]').should("be.visible");
  });

  it("Test 2: Écran 07 - Validation individuelle d'un colis en caisse centrale", () => {
    cy.visit("/cash");
    cy.wait(["@getParcels", "@getTours", "@getCouriers"]);

    // Cliquer sur le bouton Valider Caisse pour le colis 501
    cy.get('[data-cy="btn-validate-cash-501"]').should("be.visible").click();
    cy.wait("@closeParcel501").its("request.body").should((body) => {
      expect(body.status).to.equal("CLOTURE_CAISSE");
    });

    cy.get('[data-cy="cash-success-banner"]')
      .should("be.visible")
      .and("contain", "validé et clôturé en caisse");
  });

  it("Test 3: Écran 07 - Validation groupée de plusieurs colis en caisse centrale", () => {
    cy.visit("/cash");
    cy.wait(["@getParcels", "@getTours", "@getCouriers"]);

    // Cocher le select all
    cy.get('[data-cy="select-all-cash-checkbox"]').click();

    // Le bouton d'action groupée apparaît
    cy.get('[data-cy="btn-bulk-validate-cash"]')
      .should("be.visible")
      .and("contain", "Valider la Caisse (2 colis)")
      .click();

    cy.wait("@bulkCloseCash").its("request.body").should((body) => {
      expect(body.parcel_ids).to.deep.equal([501, 502]);
    });

    cy.get('[data-cy="cash-success-banner"]')
      .should("be.visible")
      .and("contain", "2 colis validé(s) avec succès");
    // ⏸️ PAUSE DE 3 SECONDES : Observer la validation de caisse réussie
    cy.wait(3000);
  });

  it("Test 4: Écran 08 - Décharge de tournée, calcul d'écart parfait et clôture équilibrée", () => {
    cy.visit("/cash");
    cy.wait(["@getParcels", "@getTours", "@getCouriers"]);

    // Basculer vers l'onglet Décharge
    cy.get('[data-cy="tab-decharge"]').click();
    cy.wait("@getTourDetail");

    // Vérifier la décharge de la tournée 1
    cy.get('[data-cy="tour-reconciliation-panel"]').should("be.visible");
    cy.contains("Décharge Financière — Tournée #1").should("be.visible");
    cy.contains("Rakoto Jean (Livreur 01)").should("be.visible");

    // Total théorique attendu = 55 000 + 34 000 + 0 = 89 000 Ar
    cy.contains("89 000 Ar").should("be.visible");

    // Ajuster le cash à 55 000 et le mobile à 34 000 (total = 89 000 Ar, écart = 0 Ar)
    cy.get('[data-cy="input-remitted-cash"]').clear().type("55000");
    cy.get('[data-cy="input-remitted-mobile"]').clear().type("34000");
    cy.get('[data-cy="input-remitted-expenses"]').clear().type("0");

    // Alerte Caisse Parfaitement Équilibrée
    cy.get('[data-cy="alert-balance-perfect"]').should("be.visible");
    cy.get('[data-cy="cash-discrepancy-value"]').should("contain", "0 Ar");
    // ⏸️ PAUSE DE 3 SECONDES : Observer la caisse parfaitement équilibrée (Écart = 0 Ar)
    cy.wait(3000);

    // Valider la clôture
    cy.get('[data-cy="btn-confirm-close-tour"]').click();
    cy.wait("@closeTour").its("request.body").should((body) => {
      expect(body.cash_and_mobile_remitted).to.equal(89000);
    });

    // Le reçu de décharge s'ouvre
    cy.get('[data-cy="modal-discharge-receipt"]').should("be.visible");
    cy.get('[data-cy="modal-discharge-receipt"]').within(() => {
      cy.contains("Bordereau de Décharge de Tournée").should("be.visible");
      cy.contains("89 000 Ar").should("be.visible");
      // ⏸️ PAUSE DE 3 SECONDES : Observer le reçu officiel de décharge
      cy.wait(3000);
      cy.get('[data-cy="btn-close-receipt-modal"]').click();
    });
    cy.get('[data-cy="modal-discharge-receipt"]').should("not.exist");
  });

  it("Test 5: Écran 08 - Décharge avec déficit de caisse déclenchant l'alerte litige DEFICIT_COD", () => {
    cy.visit("/cash");
    cy.wait(["@getParcels", "@getTours", "@getCouriers"]);

    // Basculer vers l'onglet Décharge
    cy.get('[data-cy="tab-decharge"]').click();
    cy.wait("@getTourDetail");

    // Le livreur ne remet que 70 000 Ar au lieu de 89 000 Ar (déficit de -19 000 Ar)
    cy.get('[data-cy="input-remitted-cash"]').clear().type("50000");
    cy.get('[data-cy="input-remitted-mobile"]').clear().type("20000");
    cy.get('[data-cy="input-remitted-expenses"]').clear().type("0");

    // Alerte rouge de déficit
    cy.get('[data-cy="alert-balance-deficit"]')
      .should("be.visible")
      .and("contain", "Déficit de Caisse : 19 000 Ar")
      .and("contain", "DEFICIT_COD");

    cy.get('[data-cy="cash-discrepancy-value"]').should("contain", "-19 000 Ar");
    // ⏸️ PAUSE DE 3 SECONDES : Observer l'alerte de déficit et calcul du litige
    cy.wait(3000);

    // Clôture avec litige
    cy.get('[data-cy="btn-confirm-close-tour"]').click();
    cy.wait("@closeTour").its("request.body").should((body) => {
      expect(body.cash_and_mobile_remitted).to.equal(70000);
    });

    // Reçu avec mention de l'écart
    cy.get('[data-cy="modal-discharge-receipt"]').should("be.visible").within(() => {
      cy.contains("-19 000 Ar").should("be.visible");
      cy.get('[data-cy="btn-close-receipt-modal"]').click();
    });
  });
});
