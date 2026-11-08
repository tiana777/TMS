describe("Livraison Province E2E - Cycle Complet Inbound Gare Chauffeur COD Caisse", () => {
  const provinceParcelId = 701;
  const trackingNumber = "PRV-001";

  const mockProvinceParcel = {
    id: provinceParcelId,
    tracking_number: trackingNumber,
    reception_date: "2026-11-08",
    vendor_id: 1,
    sender_name: "Boutique MadaStyle",
    sender_type: "CYBERMARCHAND",
    sender_phone: "0341122334",
    recipient_name: "M. Razafy Toamasina",
    recipient_phone: "0347788990",
    recipient_phone_formatted: "034 77 889 90",
    operator: "TELMA",
    delivery_address: "Gare Ambodivona Guichet Cotisse vers Tamatave",
    designation: "Colis Vêtements & Produits Beauté",
    axis: "AXE_PROVINCE",
    axis_label: "AXE PROVINCES & GARES ROUTIÈRES",
    flux_type: "PROVINCE",
    merchandise_amount: 80000,
    delivery_fee: 15000,
    total_to_collect: 95000,
    total_to_collect_formatted: "95 000 Ar",
    partner_fee: 0,
    status: "EN_DEPOT",
    status_label: "En Dépôt (Stock Hub)",
    active: true,
  };

  const mockNavetteCourier = {
    id: 4,
    name: "NAVETTE Gares Routières",
    phone: "0381020304",
    phone_formatted: "038 10 203 04",
    vehicle_type: "Fourgonnette Transit",
    security_deposit: 300000,
    security_deposit_formatted: "300 000 Ar",
    active: true,
  };

  const mockNavetteTour = {
    id: 10,
    tour_date: "2026-11-08",
    courier_id: 4,
    courier_name: "NAVETTE Gares Routières",
    courier_phone: "0381020304",
    courier_phone_formatted: "038 10 203 04",
    courier_vehicle: "Fourgonnette Transit",
    status: "ASSIGNE",
    theoretical_total: 95000,
    actual_remitted: 0,
    discrepancy: -95000,
    parcels_count: 1,
    parcels: [{ ...mockProvinceParcel, status: "ASSIGNE", tour_id: 10, courier_id: 4 }],
  };

  beforeEach(() => {
    cy.intercept("GET", "**/api/v1/couriers*", {
      statusCode: 200,
      body: [mockNavetteCourier],
    }).as("getCouriers");

    cy.intercept("GET", "**/api/v1/vendors*", {
      statusCode: 200,
      body: [
        {
          id: 1,
          nom: "Boutique MadaStyle",
          type_expediteur: "CYBERMARCHAND",
          telephone: "0341122334",
          adresse: "Tsiazotafo Lot 12",
          modalite_paiement: "FACTURE_MENSUELLE",
        },
      ],
    }).as("getVendors");

    cy.intercept("GET", "**/api/v1/master/axes*", {
      statusCode: 200,
      body: [
        { id: 1, code: "AXE_CENTRE", libelle: "Axe Centre", zones: [] },
        { id: 8, code: "AXE_PROVINCE", libelle: "Axe Province", zones: [] },
      ],
    }).as("getMasterAxes");

    cy.intercept("GET", "**/api/v1/tours*", {
      statusCode: 200,
      body: [mockNavetteTour],
    }).as("getTours");

    cy.intercept("GET", "**/api/v1/tours/10", {
      statusCode: 200,
      body: mockNavetteTour,
    }).as("getTour10Detail");
  });

  it("1. Prise en charge Inbound avec Sélection Manuelle de l'Axe Province", () => {
    cy.intercept("POST", "**/api/v1/parcels/batch", {
      statusCode: 201,
      body: [mockProvinceParcel],
    }).as("createProvinceBatch");

    cy.visit("/inbound");
    cy.wait(1000);

    // Saisie de l'expéditeur
    cy.get('[data-testid="type-cybermarchand"]').click();
    cy.get('[data-testid="sender-name-input"]').clear().type("Boutique MadaStyle");
    cy.get('[data-testid="sender-phone-input"]').clear().type("0341122334");

    // Saisie des données du destinataire
    cy.get('[data-testid="input-name-0"]').type("M. Razafy Toamasina");
    cy.get('[data-testid="input-phone-0"]').type("0347788990");
    cy.wait(500);

    cy.get('[data-testid="input-designation-0"]').type("Colis Vêtements & Produits Beauté");
    cy.get('[data-testid="input-address-0"]').type("Itaosy Cité - Expédition spéciale vers Province");
    cy.wait(500);

    // Sélection manuelle de l'Axe Province (8. AXE_PROVINCE)
    cy.get('[data-testid="select-axis-0"]').select("AXE_PROVINCE");
    cy.wait(500);
    cy.get('[data-testid="badge-axis-axe_province"]').should("be.visible");
    cy.contains("Choix Manuel").should("be.visible");

    // Saisie financière : Montant Marchandise COD + Frais
    cy.get('[data-testid="input-merch-0"]').type("{selectall}80000");
    cy.get('[data-testid="input-fee-0"]').type("{selectall}15000");
    cy.wait(500);

    // Vérifier le total à encaisser (80 000 + 15 000 = 95 000 Ar)
    cy.get('[data-testid="total-to-collect"]').should(($el) => {
      const text = $el.text().replace(/\s+/g, " ").trim();
      expect(text).to.contain("95 000 Ar");
    });

    // ⏸️ PAUSE DE 3 SECONDES : Observer le formulaire rempli avec l'axe province
    cy.wait(3000);

    // Soumission du lot
    cy.get('[data-testid="submit-batch-btn"]').click();
    cy.wait("@createProvinceBatch").its("request.body").should((body) => {
      const p = body.parcels ? body.parcels[0] : body[0];
      expect(p.axis).to.equal("AXE_PROVINCE");
      expect(p.is_manual_axis).to.be.true;
      expect(p.flux_type).to.equal("PROVINCE");
      expect(p.merchandise_amount).to.equal(80000);
      expect(p.delivery_fee).to.equal(15000);
    });

    // Confirmation du succès et affichage du bordereau généré
    cy.get('[data-testid="success-modal"]').should("be.visible");
    cy.contains("BDR-PRV-001").should("be.visible");

    // ⏸️ PAUSE DE 3 SECONDES : Observer le modal de confirmation BDR
    cy.wait(3000);
  });

  it("2. Dispatching & Affectation à la Navette Gares Routières", () => {
    cy.intercept("GET", "**/api/v1/parcels*", {
      statusCode: 200,
      body: [mockProvinceParcel],
    }).as("getStockParcels");

    cy.intercept("POST", "**/api/v1/tours", {
      statusCode: 201,
      body: mockNavetteTour,
    }).as("createNavetteTour");

    cy.visit("/dispatch");
    cy.wait(1000);

    // Présence du colis province dans le stock en dépôt
    cy.contains("M. Razafy Toamasina").should("be.visible");
    cy.contains("Provinces & Gares Routières").should("be.visible");
    cy.contains("PROVINCE").should("be.visible");

    // ⏸️ PAUSE DE 3 SECONDES : Observer le stock avant sélection
    cy.wait(3000);

    // Sélectionner le colis
    cy.get(`[data-cy="parcel-row-${provinceParcelId}"]`).click();

    // Sélectionner le livreur navette gares
    cy.get('[data-cy="select-courier"]').select("4");

    // ⏸️ PAUSE DE 3 SECONDES : Observer le colis coché et la navette sélectionnée
    cy.wait(3000);

    // Valider la tournée
    cy.get('[data-cy="assign-tour-btn"]').should("not.be.disabled").click();
    cy.wait("@createNavetteTour").its("request.body").should((body) => {
      expect(body.courier_id).to.equal(4);
      expect(body.parcel_ids).to.include(provinceParcelId);
    });

    // Confirmation d'assignation
    cy.contains("assigné(s) avec succès").should("be.visible");

    // ⏸️ PAUSE DE 3 SECONDES : Observer la confirmation de dispatch
    cy.wait(3000);
  });

  it("3. Pointage Terrain - Dépôt en Gare avec Récépissé, Immatriculation Voiture & Chauffeur", () => {
    cy.intercept("GET", "**/api/v1/parcels*", {
      statusCode: 200,
      body: [
        {
          ...mockProvinceParcel,
          status: "ASSIGNE",
          tour_id: 10,
          courier_id: 4,
        },
      ],
    }).as("getAllParcels");

    cy.intercept("POST", "**/api/v1/tours/10/start", {
      statusCode: 200,
      body: {
        ...mockNavetteTour,
        status: "EN_COURS",
      },
    }).as("startTour10");

    cy.intercept("PATCH", `**/api/v1/parcels/${provinceParcelId}/status`, (req) => {
      if (req.body.status === "SOUS_TRAITE") {
        req.reply({
          statusCode: 200,
          body: {
            ...mockProvinceParcel,
            status: "SOUS_TRAITE",
            partner_name: req.body.partner_name || "Cotisse Transport",
            partner_reference: req.body.partner_reference || "COT-TMV-88412",
            partner_fee: req.body.partner_fee || 20000,
            vehicle_plate: req.body.vehicle_plate || "2841 TAB",
            driver_contact: req.body.driver_contact || "Rivo Chauffeur 034 22 334 45",
          },
        });
      }
    }).as("outsourceHandover");

    cy.visit("/tracking");
    cy.wait(1000);

    // Sélectionner la tournée Navette Gares #10
    cy.get('[data-cy="tour-selector"]').select("10");

    // Démarrer la tournée
    cy.get('[data-cy="btn-start-tour"]').should("be.visible").click();
    cy.wait("@startTour10");

    // ⏸️ PAUSE DE 3 SECONDES : Observer la tournée démarrée (EN_COURS)
    cy.wait(3000);

    // Cliquer sur le bouton Gare
    cy.get(`[data-cy="btn-outsource-${provinceParcelId}"]`).should("be.visible").click();

    // Remplir les données de dépôt et d'embarquement
    cy.get('[data-cy="modal-outsource"]').should("be.visible");
    cy.get('[data-cy="modal-outsource"]').within(() => {
      cy.get('[data-cy="outsource-partner-select"]').select("Cotisse Transport");
      cy.get('[data-cy="outsource-ref-input"]').clear().type("COT-TMV-88412");
      cy.get('[data-cy="outsource-plate-input"]').clear().type("2841 TAB");
      cy.get('[data-cy="outsource-driver-input"]').clear().type("Rivo Chauffeur 034 22 334 45");
      cy.get('[data-cy="outsource-fee-input"]').type("{selectall}20000");
    });

    // ⏸️ PAUSE DE 3 SECONDES : Observer la modale remplie avec récépissé, n° voiture et contact chauffeur
    cy.wait(3000);

    cy.get('[data-cy="btn-confirm-outsource"]').click();

    cy.wait("@outsourceHandover").its("request.body").should((body) => {
      expect(body.status).to.equal("SOUS_TRAITE");
      expect(body.partner_name).to.equal("Cotisse Transport");
      expect(body.partner_reference).to.equal("COT-TMV-88412");
      expect(body.vehicle_plate).to.equal("2841 TAB");
      expect(body.driver_contact).to.equal("Rivo Chauffeur 034 22 334 45");
      expect(body.partner_fee).to.equal(20000);
    });

    // Vérifier les preuves visibles sur la ligne du colis
    cy.get(`[data-cy="parcel-row-${provinceParcelId}"]`).within(() => {
      cy.contains("Sous-traité Gare").should("be.visible");
      cy.contains("Cotisse Transport").should("be.visible");
      cy.contains("COT-TMV-88412").should("be.visible");
      cy.contains("2841 TAB").should("be.visible");
      cy.contains("Rivo Chauffeur 034 22 334 45").should("be.visible");
    });

    // ⏸️ PAUSE DE 3 SECONDES : Observer la ligne avec toutes les coordonnées du chauffeur et du véhicule
    cy.wait(3000);
  });

  it("4. Déclenchement & Validation de l'Encaissement COD Mobile Money dès Réception des Preuves", () => {
    cy.intercept("GET", "**/api/v1/parcels*", {
      statusCode: 200,
      body: [
        {
          ...mockProvinceParcel,
          status: "SOUS_TRAITE",
          partner_name: "Cotisse Transport",
          partner_reference: "COT-TMV-88412",
          vehicle_plate: "2841 TAB",
          driver_contact: "Rivo Chauffeur 034 22 334 45",
          partner_fee: 20000,
          tour_id: 10,
          courier_id: 4,
        },
      ],
    }).as("getSousTraiteParcels");

    cy.intercept("PATCH", `**/api/v1/parcels/${provinceParcelId}/status`, (req) => {
      if (req.body.status === "ENCAISSE" || req.body.status === "LIVRE_ENCAISSE") {
        req.reply({
          statusCode: 200,
          body: {
            ...mockProvinceParcel,
            status: "ENCAISSE",
            payment_method: "MVOLA",
            partner_name: "Cotisse Transport",
            partner_reference: "COT-TMV-88412",
            vehicle_plate: "2841 TAB",
            driver_contact: "Rivo Chauffeur 034 22 334 45",
          },
        });
      }
    }).as("collectProvinceCOD");

    cy.visit("/tracking");
    cy.wait(1000);

    // Le bouton d'encaissement COD est actif pour le colis sous-traité
    cy.get(`[data-cy="btn-collect-province-cod-${provinceParcelId}"]`)
      .should("be.visible")
      .and("contain", "Encaisser COD");

    // ⏸️ PAUSE DE 3 SECONDES : Observer le bouton clignotant d'encaissement COD
    cy.wait(3000);

    cy.get(`[data-cy="btn-collect-province-cod-${provinceParcelId}"]`).click();

    // Modale d'encaissement
    cy.get('[data-cy="modal-deliver"]').should("be.visible");
    cy.get('[data-cy="modal-deliver"]').within(() => {
      cy.contains("95 000 Ar").should("be.visible");
      cy.get('[data-cy="payment-method-mvola"]').click();
      cy.get('[data-cy="mobile-money-phone-input"]').clear().type("034 12 345 67");
      cy.get('[data-cy="mm-phone-success"]').should("be.visible").and("contain", "TELMA");
    });

    // ⏸️ PAUSE DE 3 SECONDES : Observer la saisie Mobile Money MVola avec validation regex
    cy.wait(3000);

    cy.get('[data-cy="modal-deliver"]').within(() => {
      cy.get('[data-cy="btn-confirm-deliver"]').click();
    });

    cy.wait("@collectProvinceCOD").its("request.body").should((body) => {
      expect(body.status).to.equal("ENCAISSE");
      expect(body.payment_method).to.equal("MVOLA");
    });

    // Statut mis à jour sur la ligne
    cy.get(`[data-cy="parcel-row-${provinceParcelId}"]`).within(() => {
      cy.contains("Encaissé").should("be.visible");
    });

    // ⏸️ PAUSE DE 3 SECONDES : Observer le passage au statut Encaissé
    cy.wait(3000);
  });

  it("5. Rapprochement Comptable & Clôture Définitive en Caisse Centrale", () => {
    const cashedProvinceParcel = {
      ...mockProvinceParcel,
      status: "ENCAISSE",
      payment_method: "MVOLA",
      partner_name: "Cotisse Transport",
      partner_reference: "COT-TMV-88412",
      tour_id: 10,
      courier_id: 4,
    };

    cy.intercept("GET", "**/api/v1/parcels*", {
      statusCode: 200,
      body: [cashedProvinceParcel],
    }).as("getCashedParcels");

    cy.intercept("POST", "**/api/v1/parcels/bulk-close-cash", {
      statusCode: 200,
      body: [
        {
          ...cashedProvinceParcel,
          status: "CLOTURE_CAISSE",
        },
      ],
    }).as("closeCashProvince");

    cy.visit("/cash");
    cy.wait(1000);

    // Le colis province avec COD Mobile Money apparaît dans la caisse centrale
    cy.contains("M. Razafy Toamasina").should("be.visible");
    cy.contains("95 000 Ar").should("be.visible");
    cy.contains("MVola (Telma)").should("be.visible");

    // ⏸️ PAUSE DE 3 SECONDES : Observer le colis en attente de validation caisse
    cy.wait(3000);

    // Valider la clôture de caisse
    cy.get(`[data-cy="select-cash-parcel-${provinceParcelId}"]`).check();

    // ⏸️ PAUSE DE 3 SECONDES : Observer la case cochée
    cy.wait(3000);

    cy.get('[data-cy="btn-bulk-validate-cash"]').should("be.visible").click();

    cy.wait("@closeCashProvince").its("request.body").should((body) => {
      expect(body.parcel_ids).to.include(provinceParcelId);
    });

    // Confirmation de clôture
    cy.get('[data-cy="cash-success-banner"]')
      .should("be.visible")
      .and("contain", "validé(s) avec succès et clôturé(s)");

    // ⏸️ PAUSE DE 3 SECONDES : Observer la confirmation de clôture scellée
    cy.wait(3000);
  });
});
