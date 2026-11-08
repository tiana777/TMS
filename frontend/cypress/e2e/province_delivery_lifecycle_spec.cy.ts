// @ts-nocheck
/**
 * Test E2E Cypress - Cycle Complet de Livraison Province (Ralenti pour observation visuelle en direct)
 *
 * Scénario métier couvert :
 * 1. Écran Inbound (01) : Saisie expéditeur, destinataire en province avec sélection manuelle
 *    de l'Axe Province (8. AXE_PROVINCE) et calcul automatique du COD (Marchandise 80 000 + Frais 15 000 = 95 000 Ar).
 * 2. Écran Dispatch (03) : Affichage dans le stock Province et affectation à la Navette Gares Routières (Tournée #10).
 * 3. Écran Pointage (05) : Démarrage tournée, dépôt physique en gare coopérative (Cotisse Transport),
 *    saisie obligatoire du récépissé (COT-TMV-88412), du n° de véhicule (2841 TAB), du contact chauffeur
 *    (Rivo Chauffeur 034 22 334 45) et des frais fret (20 000 Ar).
 * 4. Écran Pointage (05) - Encaissement COD : Bouton dédié "Encaisser COD", saisie et validation du numéro
 *    Mobile Money MVola (034 12 345 67) et mise à jour du statut vers ENCAISSE.
 * 5. Écran Caisse Centrale (07) : Rapprochement bancaire Mobile Money, sélection et validation en lot
 *    avec clôture scellée (statut CLOTURE_CAISSE).
 */

// ============================================================================
// COMMANDES CYPRESS RALENTIES (SLOW-MO & HIGHLIGHT) POUR DÉMONSTRATION VISUELLE
// ============================================================================

Cypress.Commands.add("slowClick", { prevSubject: "element" }, (subject, pauseAfter = 800) => {
  cy.wrap(subject)
    .scrollIntoView({ duration: 250 })
    .then(($el) => {
      $el.css({
        outline: "3px solid #f59e0b",
        boxShadow: "0 0 16px rgba(245, 158, 11, 0.9)",
        transition: "all 0.2s ease-in-out",
      });
    });
  cy.wait(600);
  cy.wrap(subject).click();
  cy.wait(pauseAfter);
  cy.wrap(subject).then(($el) => {
    if ($el && $el.length && document.body.contains($el[0])) {
      $el.css({ outline: "none", boxShadow: "none" });
    }
  });
});

Cypress.Commands.add("slowType", { prevSubject: "element" }, (subject, text, delay = 75, pauseAfter = 700) => {
  cy.wrap(subject)
    .scrollIntoView({ duration: 250 })
    .then(($el) => {
      $el.css({
        outline: "3px solid #3b82f6",
        boxShadow: "0 0 16px rgba(59, 130, 246, 0.8)",
        transition: "all 0.2s ease-in-out",
      });
    });
  cy.wait(400);
  cy.wrap(subject).type(text, { delay });
  cy.wait(pauseAfter);
  cy.wrap(subject).then(($el) => {
    if ($el && $el.length && document.body.contains($el[0])) {
      $el.css({ outline: "none", boxShadow: "none" });
    }
  });
});

Cypress.Commands.add("slowSelect", { prevSubject: "element" }, (subject, valueOrText, pauseAfter = 800) => {
  cy.wrap(subject)
    .scrollIntoView({ duration: 250 })
    .then(($el) => {
      $el.css({
        outline: "3px solid #8b5cf6",
        boxShadow: "0 0 16px rgba(139, 92, 246, 0.8)",
        transition: "all 0.2s ease-in-out",
      });
    });
  cy.wait(500);
  cy.wrap(subject).select(valueOrText);
  cy.wait(pauseAfter);
  cy.wrap(subject).then(($el) => {
    if ($el && $el.length && document.body.contains($el[0])) {
      $el.css({ outline: "none", boxShadow: "none" });
    }
  });
});

Cypress.Commands.add("slowCheck", { prevSubject: "element" }, (subject, pauseAfter = 800) => {
  cy.wrap(subject)
    .scrollIntoView({ duration: 250 })
    .then(($el) => {
      $el.css({
        outline: "3px solid #10b981",
        boxShadow: "0 0 16px rgba(16, 185, 129, 0.8)",
        transition: "all 0.2s ease-in-out",
      });
    });
  cy.wait(500);
  cy.wrap(subject).check();
  cy.wait(pauseAfter);
  cy.wrap(subject).then(($el) => {
    if ($el && $el.length && document.body.contains($el[0])) {
      $el.css({ outline: "none", boxShadow: "none" });
    }
  });
});

function showStepBanner(stepNumber: number, title: string, subtitle: string) {
  cy.window({ log: false }).then((win) => {
    let banner = win.document.getElementById("cypress-demo-banner");
    if (!banner) {
      banner = win.document.createElement("div");
      banner.id = "cypress-demo-banner";
      banner.style.position = "fixed";
      banner.style.top = "16px";
      banner.style.left = "50%";
      banner.style.transform = "translateX(-50%)";
      banner.style.zIndex = "999999";
      banner.style.backgroundColor = "rgba(15, 23, 42, 0.96)";
      banner.style.color = "#ffffff";
      banner.style.padding = "10px 24px";
      banner.style.borderRadius = "9999px";
      banner.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 20px rgba(59, 130, 246, 0.5)";
      banner.style.border = "2px solid #3b82f6";
      banner.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      banner.style.fontSize = "13px";
      banner.style.fontWeight = "600";
      banner.style.display = "flex";
      banner.style.alignItems = "center";
      banner.style.gap = "10px";
      banner.style.pointerEvents = "none";
      banner.style.transition = "all 0.3s ease";
      win.document.body.appendChild(banner);
    }
    banner.innerHTML = `<span style="background-color: #2563eb; color: #fff; padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Étape ${stepNumber}/5</span> <span style="color: #93c5fd; font-weight: 700;">${title}</span> <span style="color: #cbd5e1; font-weight: 400;">— ${subtitle}</span>`;
  });
  cy.wait(800, { log: false });
}

// ============================================================================
// SUITE DE TESTS E2E LIVRAISON PROVINCE
// ============================================================================

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
    showStepBanner(1, "INBOUND (PRISE EN CHARGE)", "Sélection manuelle Axe Province & Calcul COD 95 000 Ar");

    // Saisie ralentie de l'expéditeur
    cy.get('[data-testid="type-cybermarchand"]').slowClick(600);
    cy.get('[data-testid="sender-name-input"]').clear().slowType("Boutique MadaStyle", 70, 500);
    cy.get('[data-testid="sender-phone-input"]').clear().slowType("0341122334", 70, 500);

    // Saisie ralentie du destinataire
    cy.get('[data-testid="input-name-0"]').slowType("M. Razafy Toamasina", 70, 500);
    cy.get('[data-testid="input-phone-0"]').slowType("0347788990", 70, 500);
    cy.get('[data-testid="input-designation-0"]').slowType("Colis Vêtements & Produits Beauté", 60, 500);
    cy.get('[data-testid="input-address-0"]').slowType("Itaosy Cité - Expédition spéciale vers Province", 60, 500);

    // Sélection manuelle de l'Axe Province (8. AXE_PROVINCE)
    cy.get('[data-testid="select-axis-0"]').slowSelect("AXE_PROVINCE", 800);
    cy.get('[data-testid="badge-axis-axe_province"]').should("be.visible");
    cy.contains("Choix Manuel").should("be.visible");

    // Saisie financière : Montant Marchandise COD + Frais
    cy.get('[data-testid="input-merch-0"]').slowType("{selectall}80000", 60, 400);
    cy.get('[data-testid="input-fee-0"]').slowType("{selectall}15000", 60, 400);

    // Vérifier le total à encaisser (80 000 + 15 000 = 95 000 Ar)
    cy.get('[data-testid="total-to-collect"]').should(($el) => {
      const text = $el.text().replace(/\s+/g, " ").trim();
      expect(text).to.contain("95 000 Ar");
    });

    // ⏸️ PAUSE DE 3 SECONDES : Observer le formulaire rempli
    cy.wait(3000);

    // Soumission du lot
    cy.get('[data-testid="submit-batch-btn"]').slowClick(1000);
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
    showStepBanner(2, "DISPATCH HUB", "Stock colis Province & Affectation à la Navette Gares");

    // Présence du colis province dans le stock en dépôt
    cy.contains("M. Razafy Toamasina").should("be.visible");
    cy.contains("Provinces & Gares Routières").should("be.visible");
    cy.contains("PROVINCE").should("be.visible");

    // ⏸️ PAUSE DE 3 SECONDES : Observer le stock avant sélection
    cy.wait(3000);

    // Sélectionner le colis
    cy.get(`[data-cy="parcel-row-${provinceParcelId}"]`).slowClick(800);

    // Sélectionner le livreur navette gares
    cy.get('[data-cy="select-courier"]').slowSelect("4", 800);

    // ⏸️ PAUSE DE 3 SECONDES : Observer le colis coché et la navette sélectionnée
    cy.wait(3000);

    // Valider la tournée
    cy.get('[data-cy="assign-tour-btn"]').should("not.be.disabled").slowClick(1000);
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
    showStepBanner(3, "POINTAGE TERRAIN", "Dépôt Gare Cotisse, N° Voiture 2841 TAB & Contact Chauffeur");

    // Sélectionner la tournée Navette Gares #10
    cy.get('[data-cy="tour-selector"]').slowSelect("10", 800);

    // Démarrer la tournée
    cy.get('[data-cy="btn-start-tour"]').should("be.visible").slowClick(1000);
    cy.wait("@startTour10");

    // ⏸️ PAUSE DE 3 SECONDES : Observer la tournée démarrée (EN_COURS)
    cy.wait(3000);

    // Cliquer sur le bouton Gare
    cy.get(`[data-cy="btn-outsource-${provinceParcelId}"]`).should("be.visible").slowClick(800);

    // Remplir les données de dépôt et d'embarquement
    cy.get('[data-cy="modal-outsource"]').should("be.visible");
    cy.get('[data-cy="modal-outsource"]').within(() => {
      cy.get('[data-cy="outsource-partner-select"]').slowSelect("Cotisse Transport", 600);
      cy.get('[data-cy="outsource-ref-input"]').clear().slowType("COT-TMV-88412", 70, 500);
      cy.get('[data-cy="outsource-plate-input"]').clear().slowType("2841 TAB", 70, 500);
      cy.get('[data-cy="outsource-driver-input"]').clear().slowType("Rivo Chauffeur 034 22 334 45", 70, 500);
      cy.get('[data-cy="outsource-fee-input"]').slowType("{selectall}20000", 60, 500);
    });

    // ⏸️ PAUSE DE 3 SECONDES : Observer la modale remplie avec récépissé, n° voiture et contact chauffeur
    cy.wait(3000);

    cy.get('[data-cy="btn-confirm-outsource"]').slowClick(1000);

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
    showStepBanner(4, "ENCAISSEMENT COD", "Validation paiement Mobile Money MVola du destinataire");

    // Le bouton d'encaissement COD est actif pour le colis sous-traité
    cy.get(`[data-cy="btn-collect-province-cod-${provinceParcelId}"]`)
      .should("be.visible")
      .and("contain", "Encaisser COD");

    // ⏸️ PAUSE DE 3 SECONDES : Observer le bouton clignotant d'encaissement COD
    cy.wait(3000);

    cy.get(`[data-cy="btn-collect-province-cod-${provinceParcelId}"]`).slowClick(800);

    // Modale d'encaissement
    cy.get('[data-cy="modal-deliver"]').should("be.visible");
    cy.get('[data-cy="modal-deliver"]').within(() => {
      cy.contains("95 000 Ar").should("be.visible");
      cy.get('[data-cy="payment-method-mvola"]').slowClick(600);
      cy.get('[data-cy="mobile-money-phone-input"]').clear().slowType("034 12 345 67", 80, 500);
      cy.get('[data-cy="mm-phone-success"]').should("be.visible").and("contain", "TELMA");
    });

    // ⏸️ PAUSE DE 3 SECONDES : Observer la saisie Mobile Money MVola avec validation regex
    cy.wait(3000);

    cy.get('[data-cy="modal-deliver"]').within(() => {
      cy.get('[data-cy="btn-confirm-deliver"]').slowClick(1000);
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
    showStepBanner(5, "CAISSE CENTRALE", "Rapprochement bancaire & Clôture scellée des fonds");

    // Le colis province avec COD Mobile Money apparaît dans la caisse centrale
    cy.contains("M. Razafy Toamasina").should("be.visible");
    cy.contains("95 000 Ar").should("be.visible");
    cy.contains("MVola (Telma)").should("be.visible");

    // ⏸️ PAUSE DE 3 SECONDES : Observer le colis en attente de validation caisse
    cy.wait(3000);

    // Valider la clôture de caisse
    cy.get(`[data-cy="select-cash-parcel-${provinceParcelId}"]`).slowCheck(1000);

    // ⏸️ PAUSE DE 3 SECONDES : Observer la case cochée
    cy.wait(3000);

    cy.get('[data-cy="btn-bulk-validate-cash"]').should("be.visible").slowClick(1000);

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
