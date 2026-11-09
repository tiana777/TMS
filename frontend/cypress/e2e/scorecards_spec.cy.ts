describe("Écran 11 : Suivi de Performance & Scorecard Livreurs - Tests E2E Cypress", () => {
  const mockLeaderboard = [
    {
      livreur_id: 1,
      courier_name: "RAKOTO Jean",
      period: "2026-11",
      total_assigned: 50,
      total_delivered: 48,
      success_rate: 96.0,
      punctuality_rate: 94.0,
      quality_rate: 100.0,
      cash_rigor_rate: 100.0,
      global_score: 96.8,
      tier: "OR",
      bonus_amount: 150000,
      bonus_formatted: "150 000 Ar",
    },
    {
      livreur_id: 2,
      courier_name: "ANDRY Nirina",
      period: "2026-11",
      total_assigned: 45,
      total_delivered: 41,
      success_rate: 91.1,
      punctuality_rate: 88.0,
      quality_rate: 98.0,
      cash_rigor_rate: 90.0,
      global_score: 91.4,
      tier: "ARGENT",
      bonus_amount: 80000,
      bonus_formatted: "80 000 Ar",
    },
    {
      livreur_id: 3,
      courier_name: "SOLO Faneva",
      period: "2026-11",
      total_assigned: 40,
      total_delivered: 29,
      success_rate: 72.5,
      punctuality_rate: 70.0,
      quality_rate: 90.0,
      cash_rigor_rate: 75.0,
      global_score: 75.0,
      tier: "ALERTE",
      bonus_amount: 0,
      bonus_formatted: "0 Ar",
    },
  ];

  beforeEach(() => {
    cy.intercept("GET", "**/api/v1/couriers/scorecards/leaderboard*", {
      statusCode: 200,
      body: mockLeaderboard,
    }).as("getLeaderboard");

    cy.intercept("GET", "**/api/v1/couriers", {
      statusCode: 200,
      body: [
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
        {
          id: 3,
          name: "SOLO Faneva",
          phone: "0337788899",
          phone_formatted: "033 77 888 99",
          vehicle_type: "Moto Trail 150cc",
          security_deposit: 150000,
          security_deposit_formatted: "150 000 Ar",
          active: true,
        },
      ],
    }).as("getCouriers");

    cy.visit("/scorecards");
  });

  it("1. Affiche l'entête, les KPI macro de la flotte et le classement mensuel", () => {
    cy.contains("Écran 11 : Suivi de Performance & Scorecard Livreurs").should("be.visible");
    cy.contains("Classement Mensuel de la Flotte").should("be.visible");

    // Leaderboard entries in table
    cy.get("table").within(() => {
      cy.contains("RAKOTO Jean").should("be.visible");
      cy.contains("ANDRY Nirina").should("be.visible");
      cy.contains("SOLO Faneva").should("be.visible");
      cy.contains("OR").should("be.visible");
      cy.contains("ARGENT").should("be.visible");
    });
    // ⏸️ PAUSE DE 3 SECONDES : Observer le classement général de la flotte
    cy.wait(3000);
  });

  it("2. Affiche la fiche individuelle de notation détaillée lors de la sélection", () => {
    // Click on RAKOTO Jean
    cy.get("table").contains("RAKOTO Jean").click();

    // Verify 4 Pillars
    cy.contains("1. Taux de Succès Livraison (50%)").should("be.visible");
    cy.contains("2. Respect des Créneaux Horaires (20%)").should("be.visible");
    cy.contains("3. Taux de Zéro Litige & Intégrité (15%)").should("be.visible");
    cy.contains("4. Rigueur Reddition Caisse (15%)").should("be.visible");

    // Verify Prime Or badge
    cy.contains("PALIER OR").should("be.visible");
    cy.contains("Prime d'Excellence Débloquée : +150 000 Ar").should("be.visible");
    // ⏸️ PAUSE DE 3 SECONDES : Observer la scorecard individuelle avec les 4 piliers et la prime
    cy.wait(3000);
  });

  it("3. Filtre par palier incitatif et recherche", () => {
    // Filter by ALERTE
    cy.get("select").eq(0).select("ALERTE");
    cy.get("table").within(() => {
      cy.contains("SOLO Faneva").should("be.visible");
      cy.contains("RAKOTO Jean").should("not.exist");
    });

    // Reset filter
    cy.get("select").eq(0).select("ALL");
    cy.get("table").contains("RAKOTO Jean").should("be.visible");

    // Filter by Search input
    cy.get("input[placeholder='Rechercher...']").type("ANDRY");
    cy.get("table").within(() => {
      cy.contains("ANDRY Nirina").should("be.visible");
      cy.contains("RAKOTO Jean").should("not.exist");
    });
    // ⏸️ PAUSE DE 3 SECONDES : Observer le filtrage interactif
    cy.wait(3000);
  });
});
