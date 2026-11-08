describe("Module Dispatching, Tournées & Feuilles de Route (Écrans 03 & 04) - Tests E2E Cypress", () => {
  beforeEach(() => {
    // Intercept Couriers API
    cy.intercept("GET", "**/api/v1/couriers*", {
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
          id: 4,
          name: "RAZAFI Paul (Livreur)",
          phone: "0381020304",
          phone_formatted: "038 10 203 04",
          vehicle_type: "Moto 125cc",
          security_deposit: 150000,
          security_deposit_formatted: "150 000 Ar",
          active: true,
        },
      ],
    }).as("getCouriers");

    // Intercept Stock Parcels
    cy.intercept("GET", "**/api/v1/parcels*status=EN_DEPOT*", {
      statusCode: 200,
      body: [
        {
          id: 201,
          tracking_number: "0001",
          reception_date: "2026-11-08",
          vendor_id: 1,
          sender_name: "Mod'Tanà Boutique",
          sender_type: "CYBERMARCHAND",
          recipient_name: "Rasoa Nirina",
          recipient_phone: "0341234567",
          recipient_phone_formatted: "034 12 345 67",
          operator: "TELMA",
          delivery_address: "Itaosy Cité près Pharmacie",
          designation: "Robe de soirée en soie",
          axis: "AXE_RN1",
          axis_label: "AXE RN1 OUEST (Tsiazotafo ➔ Fenoarivo)",
          flux_type: "COD",
          merchandise_amount: 45000,
          delivery_fee: 5000,
          total_to_collect: 50000,
          total_to_collect_formatted: "50 000 Ar",
          partner_fee: 0,
          status: "EN_DEPOT",
          status_label: "En Dépôt (Stock Hub)",
          active: true,
        },
        {
          id: 202,
          tracking_number: "0002",
          reception_date: "2026-11-08",
          vendor_id: 2,
          sender_name: "Cabinet Juridique Tanà",
          sender_type: "ENTREPRISE",
          recipient_name: "Société Fiadanana",
          recipient_phone: "0325544332",
          recipient_phone_formatted: "032 55 443 32",
          operator: "ORANGE",
          delivery_address: "Zone Galaxy Andraharo Lot 4",
          designation: "Dossier audit & contrats",
          axis: "AXE_RN4",
          axis_label: "AXE RN4 / DIGUE (Tsiazotafo ➔ Ivato)",
          flux_type: "SIMPLE",
          merchandise_amount: 0,
          delivery_fee: 6000,
          total_to_collect: 6000,
          total_to_collect_formatted: "6 000 Ar",
          partner_fee: 0,
          status: "EN_DEPOT",
          status_label: "En Dépôt (Stock Hub)",
          active: true,
        },
        {
          id: 203,
          tracking_number: "0003",
          reception_date: "2026-11-08",
          vendor_id: 1,
          sender_name: "Mod'Tanà Boutique",
          sender_type: "CYBERMARCHAND",
          recipient_name: "M. Andry",
          recipient_phone: "0331122334",
          recipient_phone_formatted: "033 11 223 34",
          operator: "AIRTEL",
          delivery_address: "Gare Ambodivona Guichet Cotisse Toamasina",
          designation: "Colis prêt-à-porter 3 pièces",
          axis: "AXE_PROVINCE",
          axis_label: "AXE PROVINCES & GARES ROUTIÈRES",
          flux_type: "PROVINCE",
          merchandise_amount: 85000,
          delivery_fee: 10000,
          total_to_collect: 95000,
          total_to_collect_formatted: "95 000 Ar",
          partner_fee: 10000,
          status: "EN_DEPOT",
          status_label: "En Dépôt (Stock Hub)",
          active: true,
        },
      ],
    }).as("getStockParcels");

    // Intercept Tours List
    cy.intercept("GET", "**/api/v1/tours*", {
      statusCode: 200,
      body: [
        {
          id: 1,
          tour_date: "2026-11-08",
          courier_id: 1,
          courier_name: "RAKOTO Jean",
          courier_phone: "0341122233",
          courier_phone_formatted: "034 11 222 33",
          courier_vehicle: "Moto Cross 150cc",
          status: "ASSIGNE",
          theoretical_total: 56000,
          actual_remitted: 0,
          discrepancy: -56000,
          parcels_count: 2,
          parcels: [
            {
              id: 201,
              tracking_number: "0001",
              recipient_name: "Rasoa Nirina",
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
              recipient_phone_formatted: "032 55 443 32",
              operator: "ORANGE",
              delivery_address: "Zone Galaxy Andraharo Lot 4",
              designation: "Dossier audit & contrats",
              axis: "AXE_RN4",
              flux_type: "SIMPLE",
              total_to_collect: 6000,
              status: "ASSIGNE",
            },
          ],
        },
      ],
    }).as("getTours");

    // Intercept Tour Detail
    cy.intercept("GET", "**/api/v1/tours/1", {
      statusCode: 200,
      body: {
        id: 1,
        tour_date: "2026-11-08",
        courier_id: 1,
        courier_name: "RAKOTO Jean",
        courier_phone: "0341122233",
        courier_phone_formatted: "034 11 222 33",
        courier_vehicle: "Moto Cross 150cc",
        status: "ASSIGNE",
        theoretical_total: 56000,
        actual_remitted: 0,
        discrepancy: -56000,
        parcels_count: 2,
        parcels: [
          {
            id: 201,
            tracking_number: "0001",
            recipient_name: "Rasoa Nirina",
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
            recipient_phone_formatted: "032 55 443 32",
            operator: "ORANGE",
            delivery_address: "Zone Galaxy Andraharo Lot 4",
            designation: "Dossier audit & contrats",
            axis: "AXE_RN4",
            flux_type: "SIMPLE",
            total_to_collect: 6000,
            status: "ASSIGNE",
          },
        ],
      },
    }).as("getTourDetail");

    // Intercept Create Tour
    cy.intercept("POST", "**/api/v1/tours", {
      statusCode: 201,
      body: {
        id: 1,
        tour_date: "2026-11-08",
        courier_id: 1,
        status: "ASSIGNE",
        theoretical_total: 50000,
        actual_remitted: 0,
        discrepancy: -50000,
      },
    }).as("createTour");
  });

  it("devrait afficher Écran 03, filtrer par axe et gare, sélectionner et assigner des colis", () => {
    cy.visit("/dispatch");
    cy.wait(1000); // Pause pour observer l'arrivée sur l'écran

    // 1. Check title & Hub indicator
    cy.contains("03. Dispatching & Feuilles de Route").should("be.visible");
    cy.contains("Hub Tsiazotafo").should("be.visible");

    // 2. Check Tab 1 is active
    cy.get('[data-cy="tab-dispatch"]').should("be.visible").and("contain", "Dispatching Matinal");
    cy.get('[data-cy="stock-parcels-table"]').should("be.visible");
    cy.wait(1000);

    // 3. Check parcels in stock
    cy.contains("0001").should("be.visible");
    cy.contains("Rasoa Nirina").should("be.visible");
    cy.contains("50 000 Ar").should("be.visible");

    // 4. Test Axis filter pills - RN1
    cy.get('[data-cy="axis-filter-AXE_RN1"]').click();
    cy.wait(1200); // Observer le filtrage RN1
    cy.get('[data-cy="stock-parcels-table"]').within(() => {
      cy.contains("0001").should("be.visible");
      cy.contains("0002").should("not.exist");
      cy.contains("0003").should("not.exist");
    });

    // Test Province filter & Gares
    cy.get('[data-cy="axis-filter-AXE_PROVINCE"]').click();
    cy.wait(1200); // Observer les gares routières
    cy.contains("Gares d'Antananarivo").should("be.visible");
    cy.get('[data-cy="stock-parcels-table"]').within(() => {
      cy.contains("0003").should("be.visible");
      cy.contains("0001").should("not.exist");
    });

    // Back to ALL
    cy.get('[data-cy="axis-filter-ALL"]').click();
    cy.wait(1000);

    // 5. Test selection and counter
    cy.get('[data-cy="parcel-row-201"]').find('input[type="checkbox"]').check();
    cy.wait(800); // Observer la coche et la mise en surbrillance
    cy.get('[data-cy="selected-count"]').should("contain", "1 sélectionné(s)");
    cy.contains("50 000 Ar").should("be.visible");

    // Select courier
    cy.get('[data-cy="select-courier"]').select(0);
    cy.wait(1000); // Observer le choix du livreur

    // Click Assign button
    cy.get('[data-cy="assign-tour-btn"]').click();
    cy.wait("@createTour");

    // Check success notification banner appears
    cy.get('[data-cy="assign-success-banner"]').should("be.visible").and("contain", "assigné(s) avec succès");
    cy.wait(1500); // Laisser le bandeau visible
  });

  it("devrait afficher Écran 04, prévisualiser le ticket thermique 80 mm et générer la synthèse WhatsApp", () => {
    cy.visit("/dispatch");
    cy.wait(800);

    // Switch to Tab 2: Roadmaps
    cy.get('[data-cy="tab-roadmaps"]').click();
    cy.wait(1200); // Observer le passage aux feuilles de route

    // Verify tour card is displayed
    cy.get('[data-cy="tour-card-1"]').should("be.visible").and("contain", "RAKOTO Jean");
    cy.contains("Moto Cross 150cc").should("be.visible");
    cy.contains("56 000 Ar").should("be.visible");

    // Verify roadmap table
    cy.get('[data-cy="roadmap-parcels-table"]').should("be.visible").within(() => {
      cy.contains("0001").should("be.visible");
      cy.contains("Rasoa Nirina").should("be.visible");
      cy.contains("034 12 345 67").should("be.visible");
      cy.contains("TELMA").should("be.visible");
      cy.contains("Signature Dest.").should("be.visible");
    });
    cy.wait(1200);

    // 1. Test Thermal Ticket 80 mm Modal
    cy.get('[data-cy="open-thermal-btn"]').click();
    cy.wait(1200); // Observer l'ouverture du ticket thermique 80mm
    cy.get("#thermal-ticket-receipt").should("be.visible");
    cy.get("#thermal-ticket-receipt").within(() => {
      cy.contains("TMS EXPRESS", { matchCase: false }).should("be.visible");
      cy.contains("Tsiazotafo", { matchCase: false }).should("be.visible");
      cy.contains("FEUILLE DE ROUTE LIVREUR", { matchCase: false }).should("be.visible");
      cy.contains("TOTAL A ENCAISSER", { matchCase: false }).should("be.visible");
      cy.contains("56 000 Ar").should("be.visible");
      cy.contains("0001").should("be.visible");
      cy.contains("Signature Livreur", { matchCase: false }).scrollIntoView().should("be.visible");
    });
    cy.wait(1500); // Laisser le ticket visible
    cy.get('[data-cy="print-thermal-btn"]').should("be.visible");

    // Close Thermal Ticket
    cy.get('[data-cy="close-thermal-btn"]').click();
    cy.get("#thermal-ticket-receipt").should("not.exist");
    cy.wait(800);

    // 2. Test WhatsApp Modal
    cy.get('[data-cy="open-whatsapp-btn"]').click();
    cy.wait(1000); // Observer l'ouverture de la modal WhatsApp
    cy.contains("Synthèse WhatsApp Tournée").should("be.visible");
    cy.contains("TMS EXPRESS - FEUILLE DE ROUTE").should("be.visible");
    cy.contains("RAKOTO Jean").should("be.visible");
    cy.wait(1000);
    cy.get('[data-cy="copy-whatsapp-btn"]').should("be.visible").click();
    cy.contains("Texte Copié !").should("be.visible");
    cy.get('[data-cy="open-whatsapp-link"]').should("be.visible").and("have.attr", "href");
    cy.wait(1800); // Observer le badge Copié et le bouton vert WhatsApp
  });

  it("devrait permettre la sélection et la modification manuelle de l'axe logistique d'un colis (CDC 5.2)", () => {
    cy.intercept("PATCH", "**/api/v1/parcels/201/axis", {
      statusCode: 200,
      body: {
        id: 201,
        tracking_number: "0001",
        axis: "AXE_PROVINCE",
        axis_label: "AXE PROVINCES & GARES ROUTIÈRES",
        is_manual_axis: true,
        flux_type: "PROVINCE",
        recipient_name: "Rasoa Nirina",
        recipient_phone: "0341234567",
        recipient_phone_formatted: "034 12 345 67",
        delivery_address: "Itaosy Cité près Pharmacie",
        total_to_collect: 50000,
        status: "EN_DEPOT",
      },
    }).as("overrideAxisToProvince");

    cy.visit("/dispatch");
    cy.wait(800);

    // Initial check: parcel 201 has RN1 Ouest
    cy.get('[data-cy="parcel-row-201"]').should("be.visible").within(() => {
      cy.contains("RN1 Ouest").should("be.visible");
      // Click the edit axis button
      cy.get('[data-cy="edit-axis-btn-201"]').click();
    });

    // Check modal opens
    cy.get('[data-cy="modal-edit-axis"]').should("be.visible");
    cy.contains("Sélection Manuelle de l'Axe Logistique").should("be.visible");
    cy.contains("BDR-0001").should("be.visible");

    // Select AXE_PROVINCE
    cy.get('[data-cy="select-override-axis"]').select("AXE_PROVINCE");
    cy.get('[data-cy="btn-confirm-override-axis"]').click();
    cy.wait("@overrideAxisToProvince");

    // Check toast notification appears
    cy.get('[data-cy="axis-feedback-banner"]')
      .should("be.visible")
      .and("contain", "modifié avec succès vers AXE_PROVINCE");

    // Verify parcel row updated with Provinces and Choix Manuel badge
    cy.get('[data-cy="parcel-row-201"]').within(() => {
      cy.contains("Provinces").should("be.visible");
      cy.contains("Modifié manuellement").should("be.visible");
      cy.contains("PROVINCE").should("be.visible");
    });
  });
});
