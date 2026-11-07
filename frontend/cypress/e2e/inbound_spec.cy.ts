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
          axis: "AXE_RN1",
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

    // Click Particulier tab and verify sender contact updates
    cy.get('[data-testid="type-particulier"]').click();
    cy.wait(400);
    cy.get('[data-testid="sender-name-input"]').should("be.visible").and("not.have.value", "");

    // Click Entreprise tab
    cy.get('[data-testid="type-entreprise"]').click();
    cy.wait(400);
    cy.get('[data-testid="sender-name-input"]').should("be.visible").and("not.have.value", "");

    // Click back to Cybermarchand for parcel entry
    cy.get('[data-testid="type-cybermarchand"]').click();
    cy.wait(400);
    cy.get('[data-testid="sender-name-input"]').clear().type("Mod'Tanà Boutique");
    cy.get('[data-testid="sender-phone-input"]').clear().type("0345566778");

    // 2. Fill Row 1 (Urban COD Itaosy)
    cy.wait(500);
    cy.get('[data-testid="input-name-0"]').type("Rasoa Nirina");
    cy.get('[data-testid="input-phone-0"]').type("0341234567");
    cy.wait(500);

    // Check real-time Telma badge appears
    cy.get('[data-testid="badge-operator-telma"]').should("be.visible").and("contain", "TELMA");

    // Type address and verify axis auto-detection to AXE_RN1
    cy.get('[data-testid="input-address-0"]').type("Itaosy Cité Seimad");
    cy.wait(500);
    cy.get('[data-testid="badge-axis-axe_rn1"]').should("be.visible");

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

    // 4. Submit the batch
    cy.get('[data-testid="submit-batch-btn"]').click();
    cy.wait("@createBatch");
    cy.wait(1000);

    // 5. Verify success modal with generated BDRs
    cy.get('[data-testid="success-modal"]').should("be.visible");
    cy.contains("BDR-0001").should("be.visible");
    cy.contains("BDR-0002").should("be.visible");
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
  });
});
