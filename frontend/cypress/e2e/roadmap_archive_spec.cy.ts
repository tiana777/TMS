describe("Feuille de route & Clôture livreur - Archives consultables (Priorité 2)", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/tours*", {
      statusCode: 200,
      body: [
        {
          id: 10,
          tour_date: "2026-11-26",
          courier_id: 1,
          courier_name: "Jean Rakoto",
          courier_vehicle: "Scooter",
          status: "EN_COURS",
          theoretical_total: 53000,
          actual_remitted: 0,
          discrepancy: 0,
          parcels_count: 2,
          parcels: [],
        },
        {
          id: 11,
          tour_date: "2026-11-26",
          courier_id: 2,
          courier_name: "Paul Rabe",
          courier_vehicle: "Moto",
          status: "CLOTURE",
          theoretical_total: 45000,
          actual_remitted: 45000,
          discrepancy: 0,
          parcels_count: 1,
          parcels: [],
        },
      ],
    }).as("getTours");

    cy.intercept("GET", "**/tours/11*", {
      statusCode: 200,
      body: {
        id: 11,
        tour_date: "2026-11-26",
        courier_id: 2,
        courier_name: "Paul Rabe",
        courier_vehicle: "Moto",
        status: "CLOTURE",
        theoretical_total: 45000,
        actual_remitted: 45000,
        discrepancy: 0,
        parcels_count: 1,
        parcels: [
          {
            id: 201,
            tracking_number: "BDR-201",
            recipient_name: "Client Archive",
            recipient_phone: "0340000001",
            delivery_address: "Analakely",
            axis: "AXE_CENTRE_1",
            status: "CLOTURE_CAISSE",
            merchandise_amount: 42000,
            delivery_fee: 3000,
            total_to_collect: 45000,
          },
        ],
      },
    }).as("getTour11Detail");

    cy.visit("/dispatch");
    cy.wait("@getTours");
    cy.get('[data-cy="tab-roadmaps"]').click();
  });

  it("conserve les tournées clôturées et permet de filtrer les archives", () => {
    cy.get('[data-cy="tour-card-10"]').should("exist");
    cy.get('[data-cy="tour-card-11"]').should("exist");

    // Filtrer sur Actives
    cy.contains("button", "Actives (1)").click();
    cy.get('[data-cy="tour-card-10"]').should("exist");
    cy.get('[data-cy="tour-card-11"]').should("not.exist");

    // Filtrer sur Archives Clôturées et consulter le détail
    cy.contains("button", "Archives Clôturées (1)").click();
    cy.get('[data-cy="tour-card-10"]').should("not.exist");
    cy.get('[data-cy="tour-card-11"]').should("exist").click();

    cy.wait("@getTour11Detail");
    cy.contains("Feuille de Route : Paul Rabe").should("exist");
    cy.contains("BDR-201").should("exist");
  });
});
