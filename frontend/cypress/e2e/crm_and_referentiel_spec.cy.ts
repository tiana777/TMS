describe("Écran 09 : CRM Expéditeurs & Écran 10 : Référentiel Logistique - Tests E2E Cypress", () => {
  const mockVendors = [
    {
      id: 1,
      nom: "Mod'Tanà Boutique",
      type_expediteur: "CYBERMARCHAND",
      telephone: "0345566778",
      adresse: "Box 14, Pavillon Analakely",
      contact_responsable: "Madame Voahirana",
      modalite_paiement: "COMPTANT",
    },
    {
      id: 2,
      nom: "Cabinet Juridique & Audit Tanà",
      type_expediteur: "ENTREPRISE",
      telephone: "0329988776",
      adresse: "Immeuble ARO, Antsakaviro",
      contact_responsable: "Maître Andry Rabemananjara",
      nif_stat: "4001234567 / 2021",
      modalite_paiement: "FACTURE_MENSUELLE",
    },
  ];

  const mockAxes = [
    {
      id: 1,
      code: "AXE_ITAOSY",
      libelle: "Axe Itaosy (67Ha, Itaosy & Ouest)",
      zones: ["Analakely", "Ampefiloha", "Anosibe", "Itaosy"],
    },
    {
      id: 2,
      code: "AXE_PROVINCE",
      libelle: "AXE PROVINCES & GARES ROUTIÈRES",
      zones: ["Gare Ambodivona", "Gare Fasan'ny Karana", "Gare Andohatapenaka"],
    },
  ];

  const mockPartners = [
    {
      id: 1,
      nom: "Cotisse Transport",
      type: "COOPERATIVE",
      gare_rattachement: "Gare Routière Ambodivona",
      contact: "032 11 020 30",
    },
    {
      id: 2,
      nom: "Gare Routière Ambodivona",
      type: "GARE",
      gare_rattachement: "Ambodivona",
      contact: "Guichet Central",
    },
  ];

  beforeEach(() => {
    cy.intercept("GET", "**/api/v1/master/vendors*", {
      statusCode: 200,
      body: mockVendors,
    }).as("getVendors");

    cy.intercept("GET", "**/api/v1/parcels*", {
      statusCode: 200,
      body: [
        {
          id: 101,
          tracking_number: "0001",
          vendor_id: 1,
          recipient_name: "Client Test",
          delivery_address: "Analakely",
          axis: "AXE_CENTRE_1",
          status: "LIVRE_ENCAISSE",
          merchandise_amount: 30000,
          delivery_fee: 4000,
        },
      ],
    }).as("getParcels");

    cy.intercept("GET", "**/api/v1/master/axes*", {
      statusCode: 200,
      body: mockAxes,
    }).as("getAxes");

    cy.intercept("GET", "**/api/v1/master/partners*", {
      statusCode: 200,
      body: mockPartners,
    }).as("getPartners");

    cy.intercept("POST", "**/api/v1/master/vendors", {
      statusCode: 201,
      body: {
        id: 3,
        nom: "SuperStore Madagascar",
        type_expediteur: "CYBERMARCHAND",
        telephone: "0340011223",
        modalite_paiement: "COMPTANT",
      },
    }).as("createVendor");

    cy.intercept("POST", "**/api/v1/master/axes/1/zones", {
      statusCode: 200,
      body: {
        ...mockAxes[0],
        zones: [...mockAxes[0].zones, "Ampitatafika"],
      },
    }).as("addZone");
  });

  it("1. Écran 09 : Visualise le CRM, filtre et ouvre le relevé de compte", () => {
    cy.visit("/crm");
    cy.contains("Écran 09 : CRM Donneurs d'Ordre & Répertoire Expéditeurs").should("be.visible");
    cy.contains("Mod'Tanà Boutique").should("be.visible");
    cy.contains("Cabinet Juridique & Audit Tanà").should("be.visible");
    // ⏸️ PAUSE DE 3 SECONDES : Observer le répertoire des donneurs d'ordre
    cy.wait(3000);

    // Open Statement Modal
    cy.contains("Relevé de Compte").click();
    cy.contains("Bordereau Officiel de Reversement Financier").should("be.visible");
    cy.contains("NET À REVERSER AU DONNEUR D'ORDRE").should("be.visible");
    // ⏸️ PAUSE DE 3 SECONDES : Observer le bordereau officiel de reversement
    cy.wait(3000);
    cy.contains("button", "Fermer").click();
  });

  it("2. Écran 09 : Crée un nouveau donneur d'ordre", () => {
    cy.visit("/crm");
    cy.contains("Nouveau Donneur d'Ordre").click();
    cy.contains("Enregistrement d'un Nouveau Donneur d'Ordre").should("be.visible");

    cy.get("input[placeholder*='Mod\\'Tanà Boutique']").type("SuperStore Madagascar");
    cy.get("input[placeholder='034 XX XXX XX']").type("0340011223");
    // ⏸️ PAUSE DE 3 SECONDES : Observer le formulaire de création de donneur d'ordre
    cy.wait(3000);
    cy.contains("button", "Créer le Donneur d'Ordre").click();
    cy.wait("@createVendor");
  });

  it("3. Écran 10 : Visualise le Référentiel Logistique (Axes & Gares/Coopératives)", () => {
    cy.visit("/referentiel");
    cy.contains("10. Référentiel Logistique").should("be.visible");

    // Tab 1 : Axes & Quartiers
    cy.contains("AXE_ITAOSY").should("be.visible");
    cy.contains("Analakely").should("be.visible");
    // ⏸️ PAUSE DE 3 SECONDES : Observer la cartographie des axes urbains
    cy.wait(3000);

    // Add Zone to Axis 1
    cy.get('[data-cy="btn-manage-zones-1"]').click();
    cy.contains("Quartiers Rattachés").should("be.visible");
    cy.get('[data-cy="input-new-zone-name"]').type("Ampitatafika");
    cy.get('[data-cy="btn-submit-add-zone"]').click();
    cy.wait("@addZone");
    cy.contains("button", "Fermer").click();

    // Tab 2 : Partners
    cy.contains("Gares Routières & Coopératives").click();
    cy.contains("Cotisse Transport").should("be.visible");
    cy.contains("Gare Routière Ambodivona").should("be.visible");
    // ⏸️ PAUSE DE 3 SECONDES : Observer les gares routières et coopératives
    cy.wait(3000);
  });
});
