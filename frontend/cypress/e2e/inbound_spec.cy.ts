describe("Module Inbound & Import - Simulation Automatique Cypress", () => {
  beforeEach(() => {
    // Intercept batch parcel creation API call
    cy.intercept("POST", "**/api/v1/parcels/batch", {
      statusCode: 201,
      body: [
        {
          id: 101,
          tracking_number: "0001",
          reception_date: "2026-11-07",
          vendor_id: 1,
          recipient_name: "Rasoa Nirina",
          recipient_phone: "0341234567",
          recipient_phone_formatted: "034 12 345 67",
          operator: "TELMA",
          delivery_address: "Itaosy Cité Seimad",
          axis: "AXE_ITAOSY",
          flux_type: "COD",
          total_to_collect: 50000,
          total_to_collect_formatted: "50 000 Ar",
          status: "EN_DEPOT",
        },
        {
          id: 102,
          tracking_number: "0002",
          reception_date: "2026-11-07",
          vendor_id: 1,
          recipient_name: "Randria Paul",
          recipient_phone: "0321122334",
          recipient_phone_formatted: "032 11 223 34",
          operator: "ORANGE",
          delivery_address: "Gare Ambodivona vers Tamatave",
          axis: "AXE_PROVINCE",
          flux_type: "PROVINCE",
          total_to_collect: 130000,
          total_to_collect_formatted: "130 000 Ar",
          status: "EN_DEPOT",
        },
      ],
    }).as("createBatch");
  });

  it("devrait afficher l'écran Inbound, détecter les opérateurs et auto-détecter les 8 axes", () => {
    cy.visit("/inbound");

    // 1. Check title and default state
    cy.contains("Réception Quai").should("be.visible");
    cy.get('[data-testid="vendor-select"]').should("be.visible");

    // 1.1 Verify and switch sender categories (Cybermarchand, Particulier, Entreprise)
    cy.get('[data-testid="type-cybermarchand"]').should("be.visible");
    cy.get('[data-testid="type-particulier"]').should("be.visible");
    cy.get('[data-testid="type-entreprise"]').should("be.visible");

    // Senders fields are empty by default (user requirement: vider par defaut)
    cy.get('[data-testid="sender-name-input"]').should("be.visible").and("have.value", "");
    cy.get('[data-testid="sender-phone-input"]').should("be.visible").and("have.value", "");

    // Click Particulier tab
    cy.get('[data-testid="type-particulier"]').click();
    cy.wait(300);

    // Click Entreprise tab
    cy.get('[data-testid="type-entreprise"]').click();
    cy.wait(300);

    // Click back to Cybermarchand for parcel entry and test auto-suggestion
    cy.get('[data-testid="type-cybermarchand"]').click();
    cy.wait(300);
    cy.get('[data-testid="sender-name-input"]').clear().type("Mod");
    cy.get('[data-testid="sender-suggestions-popup"]').should("be.visible").and("contain", "Mod'Tanà Boutique");
    cy.get('[data-testid="sender-suggestions-popup"]').contains("Mod'Tanà Boutique").click();
    cy.get('[data-testid="sender-name-input"]').should("have.value", "Mod'Tanà Boutique");

    // 2. Fill Row 1 (Urban COD Itaosy)
    cy.wait(500);
    cy.get('[data-testid="input-name-0"]').type("Rasoa Nirina");
    cy.get('[data-testid="input-phone-0"]').type("0341234567");
    cy.wait(500);

    // Check real-time Telma badge appears
    cy.get('[data-testid="badge-operator-telma"]').should("be.visible").and("contain", "TELMA");

    // Fill Designation of merchandise (user requirement: designation marchandise / colis)
    cy.get('[data-testid="input-designation-0"]').type("Chaussures & Vêtements Mode");
    cy.get('[data-testid="input-observation-0"]').type("Livraison le matin avant 12h");

    // Type address and verify axis auto-detection to AXE_ITAOSY and auto fee 4 000 Ar
    cy.get('[data-testid="input-address-0"]').type("Itaosy Cité Seimad");
    cy.wait(500);
    cy.get('[data-testid="badge-axis-axe_itaosy"]').should("be.visible");
    cy.get('[data-testid="input-fee-0"]').should("have.value", "4000");
    cy.contains("4 000 Ar • Péri-Urbain").should("be.visible");

    // ⏸️ PAUSE DE 3 SECONDES : Observer la détection automatique Opérateur Telma, Axe Itaosy et Tarif 4 000 Ar
    cy.wait(3000);

    // Verify manual axis override (CDC Section 5.2 : adaptation aux nouveaux lieux)
    cy.get('[data-testid="select-axis-0"]').select("AXE_IAVOLOHA");
    cy.wait(400);
    cy.get('[data-testid="badge-axis-axe_iavoloha"]').should("be.visible");
    cy.get('[data-testid="badge-axis-manual"]').should("be.visible").and("contain", "Manuel");

    // ⏸️ PAUSE DE 3 SECONDES : Observer la surcharge manuelle Axe Iavoloha
    cy.wait(3000);

    // Re-select AXE_ITAOSY
    cy.get('[data-testid="select-axis-0"]').select("AXE_ITAOSY");
    cy.wait(400);
    cy.get('[data-testid="badge-axis-axe_itaosy"]').should("be.visible");

    // Fill amounts
    cy.get('[data-testid="input-merch-0"]').type("{selectall}45000");
    cy.get('[data-testid="input-fee-0"]').type("{selectall}5000");
    cy.wait(500);

    // Verify row calculation and total to collect (normalize any unicode space)
    cy.get('[data-testid="total-to-collect"]').should(($el) => {
      const text = $el.text().replace(/\s+/g, " ").trim();
      expect(text).to.contain("50 000 Ar");
    });

    // 3. Add a second row (Province via Gare Ambodivona)
    cy.get('[data-testid="add-row-btn"]').click();
    cy.wait(500);

    cy.get('[data-testid="input-name-1"]').type("Randria Paul");
    cy.get('[data-testid="input-phone-1"]').type("0321122334");
    cy.wait(500);

    // Fill Designation for row 2
    cy.get('[data-testid="input-designation-1"]').type("Carton de Quincaillerie");
    cy.get('[data-testid="input-observation-1"]').type("Dépôt au quai Cotisse avant 15h");

    // Check real-time Orange badge appears
    cy.get('[data-testid="badge-operator-orange"]').should("be.visible").and("contain", "ORANGE");

    // Type address with province/station keyword
    cy.get('[data-testid="input-address-1"]').type("Gare Ambodivona vers Tamatave");
    cy.wait(500);
    cy.get('[data-testid="badge-axis-axe_province"]').should("be.visible");

    cy.get('[data-testid="input-merch-1"]').type("{selectall}120000");
    cy.get('[data-testid="input-fee-1"]').type("{selectall}10000");
    cy.wait(500);

    // Total should now be 50 000 + 130 000 = 180 000 Ar
    cy.get('[data-testid="total-to-collect"]').should(($el) => {
      const text = $el.text().replace(/\s+/g, " ").trim();
      expect(text).to.contain("180 000 Ar");
    });

    // ⏸️ PAUSE DE 3 SECONDES : Observer la grille Inbound avec les 2 lignes (Urbain + Province)
    cy.wait(3000);

    // 4. Submit the batch
    cy.get('[data-testid="submit-batch-btn"]').click();
    cy.wait("@createBatch");
    cy.wait(1000);

    // 5. Verify success modal with generated BDRs
    cy.get('[data-testid="success-modal"]').should("be.visible");
    cy.contains("BDR-0001").should("be.visible");
    cy.contains("BDR-0002").should("be.visible");

    // ⏸️ PAUSE DE 3 SECONDES : Observer le modal de succès avec les bordereaux générés
    cy.wait(3000);
  });

  it("devrait charger et prévisualiser un fichier d'importation avec anomalies", () => {
    cy.visit("/import");

    cy.contains("Import de Fichiers Cybermarchands").should("be.visible");

    // Click sample CSV button
    cy.get('[data-testid="load-sample-btn"]').click();

    // Verify parsed rows table
    cy.contains("Prévisualisation des Données Ingestées").should("be.visible");
    cy.contains("Rasoa Nirina").should("be.visible");
    cy.contains("Client Invalide").should("be.visible");
    cy.contains("anomalies", { matchCase: false }).should("be.visible");

    // Button to confirm import
    cy.get('[data-testid="confirm-import-btn"]').should("be.visible");

    // ⏸️ PAUSE DE 3 SECONDES : Observer la prévisualisation de l'import CSV avec anomalies
    cy.wait(3000);
  });

  it("3. Auto-saisie automatique des Frais de Livraison (3 000, 4 000, 5 000 Ar) avec vitesse lente d'observation", () => {
    cy.visit("/inbound");
    cy.wait(1000);

    // Initialisation expéditeur
    cy.get('[data-testid="sender-name-input"]').clear().type("Boutique Mode Tanà");
    cy.get('[data-testid="sender-phone-input"]').clear().type("0345566778");
    cy.wait(500);

    // Destinataire ligne 1
    cy.get('[data-testid="input-name-0"]').type("Rabe Jean");
    cy.get('[data-testid="input-phone-0"]').type("0341122334");
    cy.get('[data-testid="input-designation-0"]').type("Colis Test Tarification");

    // ==========================================
    // PALIER 1 : ZONES INTRA-URBAINES À 3 000 AR (CUA 1er au 6ème Arrondissement)
    // ==========================================
    cy.get('[data-testid="input-address-0"]').clear().type("Analakely, Box 14 Pavillon");
    cy.wait(500);
    cy.get('[data-testid="input-fee-0"]').should("have.value", "3000");
    cy.contains("3 000 Ar • CUA").should("be.visible");
    // ⏸️ PAUSE DE 3 SECONDES : Observer la saisie automatique du tarif CUA à 3 000 Ar
    cy.wait(3000);

    // Quartier 67ha (Zone CUA - 3 000 Ar)
    cy.get('[data-testid="input-address-0"]').clear().type("67ha Sud, près du bureau postal");
    cy.wait(500);
    cy.get('[data-testid="input-fee-0"]').should("have.value", "3000");
    cy.contains("3 000 Ar • CUA").should("be.visible");
    // ⏸️ PAUSE DE 3 SECONDES : Observer 67ha auto-saisi à 3 000 Ar
    cy.wait(3000);

    // Cas d'arbitrage fin : Ambatobe Ambany (3 000 Ar)
    cy.get('[data-testid="input-address-0"]').clear().type("Ambatobe Ambany, en contrebas");
    cy.wait(500);
    cy.get('[data-testid="input-fee-0"]').should("have.value", "3000");
    cy.contains("3 000 Ar • CUA").should("be.visible");
    // ⏸️ PAUSE DE 3 SECONDES : Observer Ambatobe Ambany résolu à 3 000 Ar
    cy.wait(3000);

    // ==========================================
    // PALIER 2 : ZONES PÉRI-URBAINES À 4 000 AR (1ère Couronne)
    // ==========================================
    // Secteur Itaosy Cité (4 000 Ar)
    cy.get('[data-testid="input-address-0"]').clear().type("Itaosy Cité Seimad, Lot 45");
    cy.wait(500);
    cy.get('[data-testid="input-fee-0"]').should("have.value", "4000");
    cy.contains("4 000 Ar • Péri-Urbain").should("be.visible");
    // ⏸️ PAUSE DE 3 SECONDES : Observer le passage automatique du tarif à 4 000 Ar (Itaosy Cité)
    cy.wait(3000);

    // Secteur Tanjombato (4 000 Ar)
    cy.get('[data-testid="input-address-0"]').clear().type("Tanjombato, près du pont");
    cy.wait(500);
    cy.get('[data-testid="input-fee-0"]').should("have.value", "4000");
    cy.contains("4 000 Ar • Péri-Urbain").should("be.visible");
    // ⏸️ PAUSE DE 3 SECONDES : Observer Tanjombato auto-saisi à 4 000 Ar
    cy.wait(3000);

    // Secteur Alasora Commune / Bypass Alasora (4 000 Ar)
    cy.get('[data-testid="input-address-0"]').clear().type("Rond point Bypass Alasora");
    cy.wait(500);
    cy.get('[data-testid="input-fee-0"]').should("have.value", "4000");
    cy.contains("4 000 Ar • Péri-Urbain").should("be.visible");
    // ⏸️ PAUSE DE 3 SECONDES : Observer Bypass Alasora résolu à 4 000 Ar
    cy.wait(3000);

    // Secteur Ambohibao (4 000 Ar)
    cy.get('[data-testid="input-address-0"]').clear().type("Ambohibao Antehiroka");
    cy.wait(500);
    cy.get('[data-testid="input-fee-0"]').should("have.value", "4000");
    cy.contains("4 000 Ar • Péri-Urbain").should("be.visible");
    // ⏸️ PAUSE DE 3 SECONDES : Observer Ambohibao auto-saisi à 4 000 Ar
    cy.wait(3000);

    // ==========================================
    // PALIER 3 : ZONES GRANDE COURONNE À 5 000 AR (Périphérie)
    // ==========================================
    // Secteur Ivato Aéroport (5 000 Ar)
    cy.get('[data-testid="input-address-0"]').clear().type("Ivato Aéroport, Terminal Fret");
    cy.wait(500);
    cy.get('[data-testid="input-fee-0"]').should("have.value", "5000");
    cy.contains("5 000 Ar • Couronne").should("be.visible");
    // ⏸️ PAUSE DE 3 SECONDES : Observer le passage automatique du tarif à 5 000 Ar (Ivato Aéroport)
    cy.wait(3000);

    // Secteur Sabotsy Namehana (5 000 Ar)
    cy.get('[data-testid="input-address-0"]').clear().type("Sabotsy Namehana, Marché communal");
    cy.wait(500);
    cy.get('[data-testid="input-fee-0"]').should("have.value", "5000");
    cy.contains("5 000 Ar • Couronne").should("be.visible");
    // ⏸️ PAUSE DE 3 SECONDES : Observer Sabotsy Namehana auto-saisi à 5 000 Ar
    cy.wait(3000);

    // Secteur Iavoloha Galana (5 000 Ar)
    cy.get('[data-testid="input-address-0"]').clear().type("Iavoloha Galana RN7");
    cy.wait(500);
    cy.get('[data-testid="input-fee-0"]').should("have.value", "5000");
    cy.contains("5 000 Ar • Couronne").should("be.visible");
    // ⏸️ PAUSE DE 3 SECONDES : Observer Iavoloha Galana auto-saisi à 5 000 Ar
    cy.wait(3000);

    // Secteur Ambodivoara (5 000 Ar)
    cy.get('[data-testid="input-address-0"]').clear().type("Ambodivoara Ambohimangakely");
    cy.wait(500);
    cy.get('[data-testid="input-fee-0"]').should("have.value", "5000");
    cy.contains("5 000 Ar • Couronne").should("be.visible");
    // ⏸️ PAUSE DE 3 SECONDES : Observer Ambodivoara auto-saisi à 5 000 Ar
    cy.wait(3000);

    // ==========================================
    // IMPACT TEMPS RÉEL SUR LE TOTAL DU BORDEREAU
    // ==========================================
    cy.get('[data-testid="input-merch-0"]').type("{selectall}45000");
    cy.wait(500);
    // Total : 45 000 Ar marchandise + 5 000 Ar frais de livraison = 50 000 Ar
    cy.get('[data-testid="total-to-collect"]').should(($el) => {
      const text = $el.text().replace(/\s+/g, " ").trim();
      expect(text).to.contain("50 000 Ar");
    });
    // ⏸️ PAUSE DE 3 SECONDES : Observer le recalcul automatique du Total à Encaisser (50 000 Ar)
    cy.wait(3000);
  });
});
