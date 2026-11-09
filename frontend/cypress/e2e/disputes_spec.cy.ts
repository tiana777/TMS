describe("Écran 12 : Registre des Litiges & Plans de Recouvrement - Tests E2E Cypress", () => {
  const mockDisputes = [
    {
      id: 1,
      reference_litige: "LIT-2026-0001",
      livreur_id: 1,
      livreur_name: "RAKOTO Jean",
      tournee_id: 1,
      incident_type: "DEFICIT_COD",
      initial_amount: 30000,
      refunded_amount: 10000,
      remaining_balance: 20000,
      status: "EN_COURS",
      reason: "Déficit physique constaté lors de la clôture de caisse du soir",
      incident_date: "2026-11-08",
    },
    {
      id: 2,
      reference_litige: "LIT-2026-0002",
      livreur_id: 2,
      livreur_name: "ANDRY Nirina",
      tournee_id: 2,
      incident_type: "CASSE_MARCHANDISE",
      initial_amount: 45000,
      refunded_amount: 45000,
      remaining_balance: 0,
      status: "SOLDEE",
      reason: "Flacons de parfum brisés lors d'une chute sur pavés",
      incident_date: "2026-11-07",
      closure_date: "2026-11-08",
    },
    {
      id: 3,
      reference_litige: "LIT-2026-0003",
      livreur_id: 3,
      livreur_name: "SOLO Faneva",
      tournee_id: 3,
      incident_type: "PERTE_COLIS",
      initial_amount: 80000,
      refunded_amount: 0,
      remaining_balance: 80000,
      status: "OUVERTE",
      reason: "Colis smartphone dérobé lors d'un arrêt livraison",
      incident_date: "2026-11-08",
    },
  ];

  beforeEach(() => {
    cy.intercept("GET", "**/api/v1/disputes*", {
      statusCode: 200,
      body: mockDisputes,
    }).as("getDisputes");

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
      ],
    }).as("getCouriers");

    cy.intercept("POST", "**/api/v1/disputes", {
      statusCode: 201,
      body: {
        id: 4,
        reference_litige: "LIT-2026-0004",
        livreur_id: 1,
        livreur_name: "RAKOTO Jean",
        incident_type: "FAUX_BILLET",
        initial_amount: 20000,
        refunded_amount: 0,
        remaining_balance: 20000,
        status: "OUVERTE",
        reason: "Faux billet de 20 000 Ar accepté à Analakely",
        incident_date: "2026-11-08",
      },
    }).as("createDispute");

    cy.intercept("POST", "**/api/v1/disputes/1/repay", {
      statusCode: 200,
      body: {
        ...mockDisputes[0],
        refunded_amount: 30000,
        remaining_balance: 0,
        status: "SOLDEE",
      },
    }).as("repayDebt");

    cy.intercept("POST", "**/api/v1/disputes/3/force-majeure", {
      statusCode: 200,
      body: {
        ...mockDisputes[2],
        status: "ANNULEE_FORCE_MAJEURE",
      },
    }).as("forceMajeure");

    cy.visit("/disputes");
  });

  it("1. Affiche le registre des contentieux avec les statuts et montants", () => {
    cy.contains("Écran 12 : Registre des Litiges, Dettes Livreurs & Recouvrement").should("be.visible");
    cy.get("table").within(() => {
      cy.contains("LIT-2026-0001").should("be.visible");
      cy.contains("LIT-2026-0002").should("be.visible");
      cy.contains("LIT-2026-0003").should("be.visible");

      // Check status badges
      cy.contains("EN_COURS").scrollIntoView().should("be.visible");
      cy.contains("SOLDEE").scrollIntoView().should("be.visible");
      cy.contains("OUVERTE").scrollIntoView().should("be.visible");
    });
    // ⏸️ PAUSE DE 3 SECONDES : Observer le registre des contentieux et les statuts
    cy.wait(3000);
  });

  it("2. Ouvre un nouveau litige via le formulaire modal", () => {
    cy.contains("Ouvrir un Dossier de Litige").click();
    cy.contains("Ouverture d'un Dossier de Litige & Dette").should("be.visible");

    // Fill form inside modal
    cy.get("form").within(() => {
      cy.get("select").eq(1).select("FAUX_BILLET");
      cy.get("input[placeholder='ex: 35000']").type("20000");
      cy.get("textarea").type("Faux billet de 20 000 Ar accepté à Analakely");
      // ⏸️ PAUSE DE 3 SECONDES : Observer le formulaire de litige rempli
      cy.wait(3000);
      cy.contains("button", "Créer le Dossier de Litige").click();
    });
    cy.wait("@createDispute");
  });

  it("3. Effectue un remboursement avec modalité Option B Retenue sur Paie", () => {
    // Click Rembourser on LIT-2026-0001
    cy.contains("LIT-2026-0001").parents("tr").contains("Rembourser").click();
    cy.contains("Règlement / Apurement de la Dette").should("be.visible");

    // Select Option B
    cy.contains("Option B : Retenue Paie").click();
    cy.contains("Plafond Légal Malgache : 30% Max du Salaire Net").should("be.visible");

    // ⏸️ PAUSE DE 3 SECONDES : Observer la modalité Option B (plafond 30% Code du Travail)
    cy.wait(3000);

    // Submit repayment
    cy.contains("button", "Valider le Remboursement").click();
    cy.wait("@repayDebt");
  });

  it("4. Applique l'exonération pour Force Majeure avec PV Police", () => {
    // Click Force Majeure on LIT-2026-0003
    cy.contains("LIT-2026-0003").parents("tr").contains("Force Majeure").click();
    cy.contains("Exonération pour Force Majeure").should("be.visible");

    cy.get("input[placeholder*='PV-COMMISSARIAT']").type("PV-COMMISSARIAT-CENTRAL-2026/0998");
    // ⏸️ PAUSE DE 3 SECONDES : Observer la saisie du PV officiel de police
    cy.wait(3000);
    cy.contains("button", "Annuler la Dette (Force Majeure)").click();
    cy.wait("@forceMajeure");
  });
});
