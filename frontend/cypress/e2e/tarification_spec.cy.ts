describe("Écran 01 : Tarification Automatique par Zone & Saisie Immédiate (CDC 5.3) - Tests E2E Cypress", () => {
  beforeEach(() => {
    cy.intercept("POST", "**/master/axes/*/zones", {
      statusCode: 200,
      body: { success: true },
    }).as("addZone");
    cy.visit("/inbound");
  });

  it("devrait auto-saisir automatiquement le prix selon la zone avec vitesse lente d'observation (3 secondes)", () => {
    // 1. Initialisation des coordonnées expéditeur
    cy.get('[data-testid="sender-name-input"]').clear().type("Boutique Chic Tanà");
    cy.get('[data-testid="sender-phone-input"]').clear().type("0345566778");
    cy.wait(500);

    // Initialisation destinataire
    cy.get('[data-testid="input-name-0"]').type("Rasoa Soa");
    cy.get('[data-testid="input-phone-0"]').type("0341234567");
    cy.get('[data-testid="input-designation-0"]').type("Robe & Accessoires de Mode");

    // ==========================================
    // PALIER 1 : ZONES INTRA-URBAINES À 3 000 AR (CUA 1er au 6ème Arrondissement)
    // ==========================================
    cy.log(">>> Test Zone 3 000 Ar : Analakely (1er Arrondissement CUA)");
    cy.get('[data-testid="input-address-0"]').clear().type("Analakely, Box 14 Pavillon");
    cy.wait(500);
    cy.get('[data-testid="input-fee-0"]').should("have.value", "3000");
    cy.contains("3 000 Ar • CUA").should("be.visible");
    // ⏸️ PAUSE DE 3 SECONDES : Observer la saisie automatique du tarif CUA à 3 000 Ar (Analakely)
    cy.wait(3000);

    cy.log(">>> Test Zone 3 000 Ar : 67ha (1er Arrondissement CUA)");
    cy.get('[data-testid="input-address-0"]').clear().type("67ha Sud, près du bureau postal");
    cy.wait(500);
    cy.get('[data-testid="input-fee-0"]').should("have.value", "3000");
    cy.contains("3 000 Ar • CUA").should("be.visible");
    // ⏸️ PAUSE DE 3 SECONDES : Observer 67ha auto-saisi à 3 000 Ar
    cy.wait(3000);

    cy.log(">>> Test Zone 3 000 Ar : Ambatobe Ambany (5ème Arrondissement CUA vs Ambony)");
    cy.get('[data-testid="input-address-0"]').clear().type("Ambatobe Ambany, en contrebas");
    cy.wait(500);
    cy.get('[data-testid="input-fee-0"]').should("have.value", "3000");
    cy.contains("3 000 Ar • CUA").should("be.visible");
    // ⏸️ PAUSE DE 3 SECONDES : Observer Ambatobe Ambany résolu à 3 000 Ar
    cy.wait(3000);

    // ==========================================
    // PALIER 2 : ZONES PÉRI-URBAINES PROCHES À 4 000 AR (1ère Couronne)
    // ==========================================
    cy.log(">>> Test Zone 4 000 Ar : Itaosy Cité (Atsimondrano)");
    cy.get('[data-testid="input-address-0"]').clear().type("Itaosy Cité Seimad, Lot 45");
    cy.wait(500);
    cy.get('[data-testid="input-fee-0"]').should("have.value", "4000");
    cy.contains("4 000 Ar • Péri-Urbain").should("be.visible");
    // ⏸️ PAUSE DE 3 SECONDES : Observer le passage automatique du tarif à 4 000 Ar (Itaosy Cité)
    cy.wait(3000);

    cy.log(">>> Test Zone 4 000 Ar : Tanjombato (Atsimondrano)");
    cy.get('[data-testid="input-address-0"]').clear().type("Tanjombato, près du pont");
    cy.wait(500);
    cy.get('[data-testid="input-fee-0"]').should("have.value", "4000");
    cy.contains("4 000 Ar • Péri-Urbain").should("be.visible");
    // ⏸️ PAUSE DE 3 SECONDES : Observer Tanjombato auto-saisi à 4 000 Ar
    cy.wait(3000);

    cy.log(">>> Test Zone 4 000 Ar : Bypass Alasora (Avaradrano)");
    cy.get('[data-testid="input-address-0"]').clear().type("Rond point Bypass Alasora");
    cy.wait(500);
    cy.get('[data-testid="input-fee-0"]').should("have.value", "4000");
    cy.contains("4 000 Ar • Péri-Urbain").should("be.visible");
    // ⏸️ PAUSE DE 3 SECONDES : Observer Bypass Alasora résolu à 4 000 Ar
    cy.wait(3000);

    cy.log(">>> Test Zone 4 000 Ar : Ambohibao (Ambohidratrimo)");
    cy.get('[data-testid="input-address-0"]').clear().type("Ambohibao Antehiroka");
    cy.wait(500);
    cy.get('[data-testid="input-fee-0"]').should("have.value", "4000");
    cy.contains("4 000 Ar • Péri-Urbain").should("be.visible");
    // ⏸️ PAUSE DE 3 SECONDES : Observer Ambohibao auto-saisi à 4 000 Ar
    cy.wait(3000);

    // ==========================================
    // PALIER 3 : ZONES GRANDE COURONNE À 5 000 AR (Périphérie)
    // ==========================================
    cy.log(">>> Test Zone 5 000 Ar : Ivato Aéroport (Ambohidratrimo)");
    cy.get('[data-testid="input-address-0"]').clear().type("Ivato Aéroport, Terminal Fret");
    cy.wait(500);
    cy.get('[data-testid="input-fee-0"]').should("have.value", "5000");
    cy.contains("5 000 Ar • Couronne").should("be.visible");
    // ⏸️ PAUSE DE 3 SECONDES : Observer le passage automatique du tarif à 5 000 Ar (Ivato Aéroport)
    cy.wait(3000);

    cy.log(">>> Test Zone 5 000 Ar : Sabotsy Namehana (Avaradrano)");
    cy.get('[data-testid="input-address-0"]').clear().type("Sabotsy Namehana, Marché communal");
    cy.wait(500);
    cy.get('[data-testid="input-fee-0"]').should("have.value", "5000");
    cy.contains("5 000 Ar • Couronne").should("be.visible");
    // ⏸️ PAUSE DE 3 SECONDES : Observer Sabotsy Namehana auto-saisi à 5 000 Ar
    cy.wait(3000);

    cy.log(">>> Test Zone 5 000 Ar : Iavoloha Galana (Atsimondrano)");
    cy.get('[data-testid="input-address-0"]').clear().type("Iavoloha Galana RN7");
    cy.wait(500);
    cy.get('[data-testid="input-fee-0"]').should("have.value", "5000");
    cy.contains("5 000 Ar • Couronne").should("be.visible");
    // ⏸️ PAUSE DE 3 SECONDES : Observer Iavoloha Galana auto-saisi à 5 000 Ar
    cy.wait(3000);

    cy.log(">>> Test Zone 5 000 Ar : Ambodivoara (Ambohimangakely)");
    cy.get('[data-testid="input-address-0"]').clear().type("Ambodivoara Ambohimangakely");
    cy.wait(500);
    cy.get('[data-testid="input-fee-0"]').should("have.value", "5000");
    cy.contains("5 000 Ar • Couronne").should("be.visible");
    // ⏸️ PAUSE DE 3 SECONDES : Observer Ambodivoara auto-saisi à 5 000 Ar
    cy.wait(3000);

    // ==========================================
    // RECALCUL EN DIRECT DU TOTAL À ENCAISSER
    // ==========================================
    cy.get('[data-testid="input-merch-0"]').type("{selectall}45000");
    cy.wait(500);
    cy.get('[data-testid="total-to-collect"]').should(($el) => {
      const text = $el.text().replace(/\s+/g, " ").trim();
      expect(text).to.contain("50 000 Ar");
    });
    // ⏸️ PAUSE DE 3 SECONDES : Observer le recalcul en direct du total bordereau (50 000 Ar)
    cy.wait(3000);
  });

  it("devrait ouvrir la modale pour rattacher un nouveau quartier inconnu à un axe et définir son tarif avec pauses de 3s", () => {
    // 1. Saisie d'un quartier totalement nouveau / inconnu du référentiel
    cy.get('[data-testid="input-address-0"]').clear().type("Ambohitrandriana");
    cy.wait(500);

    // L'indicateur de repli apparaît avec le bouton d'action
    cy.contains("Lieu non répertorié").should("be.visible");
    cy.get('[data-cy="btn-quick-add-zone-0"]').should("be.visible");
    // ⏸️ PAUSE DE 3 SECONDES : Observer la détection du quartier inconnu et le bouton de rattachement
    cy.wait(3000);

    // 2. Clic sur le bouton pour ouvrir la modale
    cy.get('[data-cy="btn-quick-add-zone-0"]').click();

    // 3. Vérification de l'ouverture de la modale interactive
    cy.get('[data-cy="modal-add-zone-to-axis"]').should("be.visible");
    cy.contains("Rattacher un Nouveau Quartier").should("be.visible");
    cy.get('[data-cy="input-modal-zone-name"]').should("have.value", "Ambohitrandriana");
    // ⏸️ PAUSE DE 3 SECONDES : Observer la modale ouverte avec le nom pré-rempli
    cy.wait(3000);

    // 4. Sélection de l'Axe de rattachement (ex : Axe 7 Ivato)
    cy.get('[data-cy="select-modal-axis"]').select("AXE_IVATO");
    cy.wait(500);

    // 5. Sélection du tarif applicable (ex : 4 000 Ar - 1ère Couronne)
    cy.get('[data-cy="btn-select-fee-4000"]').click();
    cy.wait(500);
    // ⏸️ PAUSE DE 3 SECONDES : Observer l'axe Ivato et le tarif 4 000 Ar sélectionnés dans la modale
    cy.wait(3000);

    // 6. Validation et enregistrement dans la modale
    cy.get('[data-cy="btn-submit-add-new-zone"]').click();

    // 7. Vérification de la fermeture de la modale et de l'application immédiate
    cy.get('[data-cy="modal-add-zone-to-axis"]').should("not.exist");
    cy.get('[data-cy="alert-zone-success"]').should("be.visible").and("contain", "Ambohitrandriana");
    cy.get('[data-testid="badge-axis-axe_ivato"]').should("be.visible");
    cy.get('[data-testid="input-fee-0"]').should("have.value", "4000");
    cy.contains("4 000 Ar • Péri-Urbain").should("be.visible");
    // ⏸️ PAUSE DE 3 SECONDES : Observer la mise à jour immédiate du bordereau avec l'axe Ivato et le tarif 4 000 Ar
    cy.wait(3000);

    // 8. Vérification que la saisie future de ce nouveau quartier auto-détecte l'axe et le tarif
    cy.get('[data-testid="add-row-btn"]').click();
    cy.wait(500);
    cy.get('[data-testid="input-address-1"]').type("Ambohitrandriana Lot B12");
    cy.wait(500);
    cy.get('[data-testid="badge-axis-axe_ivato"]').should("be.visible");
    cy.get('[data-testid="input-fee-1"]').should("have.value", "4000");
    // ⏸️ PAUSE DE 3 SECONDES : Observer la mémorisation et l'auto-détection du nouveau quartier sur la ligne suivante
    cy.wait(3000);
  });
});
