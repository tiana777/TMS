describe("Écran 05 : Pointage Terrain & Écran 06 : Cockpit KPIs - Tests E2E Cypress", () => {
  const mockParcels = [
    {
      id: 301,
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
      status: "ASSIGNE",
      status_label: "Assigné en Tournée",
      tour_id: 1,
      courier_id: 1,
      active: true,
    },
    {
      id: 302,
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
      status: "EN_COURS",
      status_label: "En Cours de Livraison",
      tour_id: 1,
      courier_id: 1,
      active: true,
    },
    {
      id: 303,
      tracking_number: "0003",
      reception_date: "2026-11-08",
      vendor_id: 1,
      sender_name: "Mod'Tanà Boutique",
      sender_type: "CYBERMARCHAND",
      recipient_name: "M. Rakoto Andry",
      recipient_phone: "0331122334",
      recipient_phone_formatted: "033 11 223 34",
      operator: "AIRTEL",
      delivery_address: "Ankorondrano près BNI",
      designation: "Chaussures en cuir",
      axis: "AXE_RN3",
      axis_label: "AXE RN3 NORD (Tsiazotafo ➔ Sabotsy)",
      flux_type: "COD",
      merchandise_amount: 60000,
      delivery_fee: 5000,
      total_to_collect: 65000,
      total_to_collect_formatted: "65 000 Ar",
      partner_fee: 0,
      status: "EN_COURS",
      status_label: "En Cours de Livraison",
      tour_id: 1,
      courier_id: 1,
      active: true,
    },
    {
      id: 304,
      tracking_number: "0004",
      reception_date: "2026-11-08",
      vendor_id: 3,
      sender_name: "Rasoamalala Hanta",
      sender_type: "PARTICULIER",
      recipient_name: "Paul Hery (Toamasina)",
      recipient_phone: "0348877665",
      recipient_phone_formatted: "034 88 776 65",
      operator: "TELMA",
      delivery_address: "Gare Ambodivona Guichet Cotisse vers Toamasina",
      designation: "Effets personnels et panier d'artisanat",
      axis: "AXE_PROVINCE",
      axis_label: "AXE PROVINCES & GARES ROUTIÈRES",
      flux_type: "PROVINCE",
      merchandise_amount: 30000,
      delivery_fee: 10000,
      total_to_collect: 40000,
      total_to_collect_formatted: "40 000 Ar",
      partner_fee: 10000,
      status: "ASSIGNE",
      status_label: "Assigné en Tournée",
      tour_id: 2,
      courier_id: 4,
      active: true,
    },
  ];

  const mockTours = [
    {
      id: 1,
      tour_date: "2026-11-08",
      courier_id: 1,
      courier_name: "RAKOTO Jean",
      courier_phone: "0341122233",
      courier_phone_formatted: "034 11 222 33",
      courier_vehicle: "Moto Cross 150cc",
      status: "ASSIGNE",
      theoretical_total: 121000,
      actual_remitted: 0,
      discrepancy: -121000,
      parcels_count: 3,
    },
    {
      id: 2,
      tour_date: "2026-11-08",
      courier_id: 4,
      courier_name: "NAVETTE Gares Routières",
      courier_phone: "0381020304",
      courier_phone_formatted: "038 10 203 04",
      courier_vehicle: "Fourgonnette Transit",
      status: "ASSIGNE",
      theoretical_total: 40000,
      actual_remitted: 0,
      discrepancy: -40000,
      parcels_count: 1,
    },
  ];

  const mockCouriers = [
    {
      id: 1,
      name: "RAKOTO Jean",
      phone: "0341122233",
      phone_formatted: "034 11 222 33",
      vehicle_type: "Moto Cross 150cc",
      active: true,
    },
    {
      id: 4,
      name: "NAVETTE Gares Routières",
      phone: "0381020304",
      phone_formatted: "038 10 203 04",
      vehicle_type: "Fourgonnette Transit",
      active: true,
    },
  ];

  beforeEach(() => {
    // Intercept common endpoints
    cy.intercept("GET", "**/api/v1/parcels*", {
      statusCode: 200,
      body: mockParcels,
    }).as("getParcels");

    cy.intercept("GET", "**/api/v1/tours*", {
      statusCode: 200,
      body: mockTours,
    }).as("getTours");

    cy.intercept("GET", "**/api/v1/couriers*", {
      statusCode: 200,
      body: mockCouriers,
    }).as("getCouriers");

    cy.intercept("POST", "**/api/v1/tours/1/start", {
      statusCode: 200,
      body: {
        ...mockTours[0],
        status: "EN_COURS",
      },
    }).as("startTour");

    cy.intercept("PATCH", "**/api/v1/parcels/301/status", (req) => {
      req.reply({
        statusCode: 200,
        body: {
          ...mockParcels[0],
          status: req.body.status,
          payment_method: req.body.payment_method || "MVOLA",
        },
      });
    }).as("deliverParcel");

    cy.intercept("POST", "**/api/v1/parcels/301/prepaid", (req) => {
      req.reply({
        statusCode: 200,
        body: {
          ...mockParcels[0],
          merchandise_amount: 0,
          delivery_fee: 0,
          total_to_collect: 0,
          total_to_collect_formatted: "0 Ar",
          flux_type: "SIMPLE",
          payment_method: req.body.payment_method || "MVOLA",
          observation: "Paiement anticipé intégral MVOLA (COD neutralisé)",
        },
      });
    }).as("prepayParcel301");

    cy.intercept("PATCH", "**/api/v1/parcels/302/status", {
      statusCode: 200,
      body: {
        ...mockParcels[1],
        status: "REPORTE",
        reschedule_date: "2026-11-10",
        incident_reason: "Client absent au rendez-vous",
      },
    }).as("rescheduleParcel");

    cy.intercept("PATCH", "**/api/v1/parcels/303/status", (req) => {
      if (req.body.status === "LIVRE") {
        req.reply({
          statusCode: 200,
          body: {
            ...mockParcels[2],
            status: "LIVRE",
            payment_method: null,
          },
        });
      } else if (req.body.status === "ENCAISSE") {
        req.reply({
          statusCode: 200,
          body: {
            ...mockParcels[2],
            status: "ENCAISSE",
            payment_method: req.body.payment_method || "ESPECES",
          },
        });
      } else {
        req.reply({
          statusCode: 200,
          body: {
            ...mockParcels[2],
            status: "ANNULE_RETOUR",
            incident_reason: req.body.incident_reason || "Refus client : article non conforme",
          },
        });
      }
    }).as("cancelParcel");

    cy.intercept("PATCH", "**/api/v1/parcels/304/status", {
      statusCode: 200,
      body: {
        ...mockParcels[3],
        status: "SOUS_TRAITE",
        partner_name: "Cotisse Transport",
        partner_reference: "COT-99482",
        partner_fee: 10000,
      },
    }).as("outsourceParcel");

    cy.intercept("PATCH", "**/api/v1/parcels/*/contact", (req) => {
      req.reply({
        statusCode: 200,
        body: {
          ...mockParcels[2],
          recipient_phone: req.body.recipient_phone || "0349988776",
          recipient_phone_formatted: "034 99 887 76",
          operator: "TELMA",
        },
      });
    }).as("updateParcelContact");
  });

  it("Test 1: Écran 06 Cockpit - Vérification de la Barre de Progression Segmentée et des 4 Métriques d'Activité", () => {
    cy.visit("/");
    cy.wait(["@getParcels", "@getTours", "@getCouriers"]);

    // Vérifier le titre et le statut opérationnel
    cy.contains("Cockpit d'Exploitation Logistique").should("be.visible");
    cy.contains("Direct GMT+3").should("be.visible");

    // Vérifier la présence de la section de progression segmentée (CDC Écran 06)
    cy.get('[data-cy="segmented-progress-section"]').should("be.visible");
    cy.contains("Progression Globale de la Journée").should("be.visible");

    // Vérifier les 4 cartes de métriques d'activité
    cy.get('[data-cy="metric-total-shipments"]').within(() => {
      cy.contains("Expéditions Totales").should("be.visible");
      cy.contains("4").should("be.visible");
    });

    cy.get('[data-cy="metric-success-rate"]').within(() => {
      cy.contains("Taux de Succès").should("be.visible");
    });

    cy.get('[data-cy="metric-in-progress"]').within(() => {
      cy.contains("Colis en Distribution").should("be.visible");
      cy.contains("4").should("be.visible");
    });

    cy.get('[data-cy="metric-cod-recovered"]').within(() => {
      cy.contains("Montant COD Recouvré").should("be.visible");
    });

    // Vérifier les cartes des tournées en direct
    cy.get('[data-cy="tour-card-1"]').should("be.visible");
    cy.get('[data-cy="tour-card-1"]').within(() => {
      cy.contains("RAKOTO Jean").should("be.visible");
      cy.contains("Moto Cross 150cc").should("be.visible");
      cy.contains("Tournée #1").should("be.visible");
    });

    cy.get('[data-cy="tour-card-2"]').should("be.visible");
    cy.get('[data-cy="tour-card-2"]').within(() => {
      cy.contains("NAVETTE Gares Routières").should("be.visible");
    });
  });

  it("Test 2: Écran 05 Pointage - Démarrage de Tournée et Validation de Livraison (LIVRE_ENCAISSE)", () => {
    cy.visit("/tracking");
    cy.wait(["@getParcels", "@getTours", "@getCouriers"]);

    cy.contains("Écran 05 : Pointage Terrain & Suivi en Direct").should("be.visible");

    // Sélectionner la Tournée #1
    cy.get('[data-cy="tour-selector"]').select("1");

    // Le bouton de lancement de tournée est présent car la tournée est ASSIGNE
    cy.get('[data-cy="btn-start-tour"]').should("be.visible").click();
    cy.wait("@startTour");

    // Bannière de confirmation
    cy.get('[data-cy="feedback-banner"]')
      .should("be.visible")
      .and("contain", "Tournée #1 démarrée avec succès");

    // Cliquer sur le bouton Livré & Encaissé pour le colis 301
    cy.get('[data-cy="btn-deliver-301"]').should("be.visible").click();

    // Modal de validation
    cy.get('[data-cy="modal-deliver"]').should("be.visible");
    cy.get('[data-cy="modal-deliver"]').within(() => {
      cy.contains("50 000 Ar").should("be.visible");
      // Sélectionner Telma MVola
      cy.get('[data-cy="payment-method-mvola"]').click();
      cy.get('[data-cy="btn-confirm-deliver"]').click();
    });

    cy.wait("@deliverParcel").its("request.body").should((body) => {
      expect(body.status).to.equal("LIVRE_ENCAISSE");
      expect(body.payment_method).to.equal("MVOLA");
    });

    // Vérifier la bannière et le badge mis à jour
    cy.get('[data-cy="feedback-banner"]')
      .should("be.visible")
      .and("contain", "Pointage validé");
    cy.get('[data-cy="parcel-row-301"]').within(() => {
      cy.contains("Livré & Encaissé").should("be.visible");
      cy.contains("Encaissé via MVOLA").should("be.visible");
    });
  });

  it("Test 3: Écran 05 Pointage - Signalement de Report avec Date et Motif Circonstancié (REPORTE)", () => {
    cy.visit("/tracking");
    cy.wait(["@getParcels", "@getTours", "@getCouriers"]);

    // Cliquer sur Reporter pour le colis 302
    cy.get('[data-cy="btn-reschedule-302"]').should("be.visible").click();

    cy.get('[data-cy="modal-reschedule"]').should("be.visible");
    cy.get('[data-cy="modal-reschedule"]').within(() => {
      cy.get('[data-cy="reschedule-date-input"]').clear().type("2026-11-10");
      cy.get('[data-cy="reschedule-reason-select"]').select("Client absent au rendez-vous");
      cy.get('[data-cy="btn-confirm-reschedule"]').click();
    });

    cy.wait("@rescheduleParcel").its("request.body").should((body) => {
      expect(body.status).to.equal("REPORTE");
      expect(body.reschedule_date).to.equal("2026-11-10");
      expect(body.incident_reason).to.equal("Client absent au rendez-vous");
    });

    cy.get('[data-cy="parcel-row-302"]').within(() => {
      cy.contains("Reporté").should("be.visible");
      cy.contains("Reporté au 2026-11-10").should("be.visible");
    });
  });

  it("Test 4: Écran 05 Pointage - Signalement de Refus / Annulation (ANNULE_RETOUR)", () => {
    cy.visit("/tracking");
    cy.wait(["@getParcels", "@getTours", "@getCouriers"]);

    // Cliquer sur Refus pour le colis 303
    cy.get('[data-cy="btn-cancel-303"]').should("be.visible").click();

    cy.get('[data-cy="modal-cancel"]').should("be.visible");
    cy.get('[data-cy="modal-cancel"]').within(() => {
      cy.get('[data-cy="cancel-reason-select"]').select("Refus client : article non conforme");
      cy.get('[data-cy="btn-confirm-cancel"]').click();
    });

    cy.wait("@cancelParcel").its("request.body").should((body) => {
      expect(body.status).to.equal("ANNULE_RETOUR");
      expect(body.incident_reason).to.equal("Refus client : article non conforme");
    });

    cy.get('[data-cy="parcel-row-303"]').within(() => {
      cy.contains("Annulé / Retour").should("be.visible");
      cy.contains("Motif annulation : Refus client : article non conforme").should("be.visible");
    });
  });

  it("Test 5: Écran 05 Pointage - Dépôt en Gare Routière Province (SOUS_TRAITE)", () => {
    cy.visit("/tracking");
    cy.wait(["@getParcels", "@getTours", "@getCouriers"]);

    // Cliquer sur Gare pour le colis 304 (Province)
    cy.get('[data-cy="btn-outsource-304"]').should("be.visible").click();

    cy.get('[data-cy="modal-outsource"]').should("be.visible");
    cy.get('[data-cy="modal-outsource"]').within(() => {
      cy.get('[data-cy="outsource-partner-select"]').select("Cotisse Transport");
      cy.get('[data-cy="outsource-ref-input"]').clear().type("COT-99482");
      cy.get('[data-cy="outsource-fee-input"]').clear().type("10000");
      cy.get('[data-cy="btn-confirm-outsource"]').click();
    });

    cy.wait("@outsourceParcel").its("request.body").should((body) => {
      expect(body.status).to.equal("SOUS_TRAITE");
      expect(body.partner_name).to.equal("Cotisse Transport");
      expect(body.partner_reference).to.equal("COT-99482");
      expect(body.partner_fee).to.be.at.least(10000);
    });

    cy.get('[data-cy="parcel-row-304"]').within(() => {
      cy.contains("Sous-traité Gare").should("be.visible");
      cy.contains("Cotisse Transport").should("be.visible");
      cy.contains("COT-99482").should("be.visible");
    });
  });

  it("Test 6: Écran 05 - Création Dynamique et Persistance d'un Nouveau Motif de Refus (Non codé en dur)", () => {
    cy.visit("/tracking");
    cy.wait(["@getParcels", "@getTours", "@getCouriers"]);

    // Ouvrir la modale Refus sur le colis 303
    cy.get('[data-cy="btn-cancel-303"]').should("be.visible").click();
    cy.get('[data-cy="modal-cancel"]').should("be.visible");

    // Cliquer sur le bouton de création d'un motif
    cy.get('[data-cy="btn-toggle-create-cancel-reason"]').should("be.visible").click();
    cy.get('[data-cy="input-new-cancel-reason"]')
      .should("be.visible")
      .type("Client parti en voyage imprévu à Antsirabe");

    cy.get('[data-cy="btn-save-new-cancel-reason"]').click();

    // Vérifier que le nouveau motif est maintenant sélectionné dans le menu déroulant
    cy.get('[data-cy="cancel-reason-select"]').should(
      "have.value",
      "Client parti en voyage imprévu à Antsirabe"
    );

    // Valider le refus avec ce nouveau motif
    cy.get('[data-cy="btn-confirm-cancel"]').click();

    cy.wait("@cancelParcel").its("request.body").should((body) => {
      expect(body.status).to.equal("ANNULE_RETOUR");
      expect(body.incident_reason).to.equal("Client parti en voyage imprévu à Antsirabe");
    });
  });

  it("Test 7: Écran 05 - Vérification Regex Stricte des Numéros Malgaches (CDC 7.1) & Correction en Direct", () => {
    cy.visit("/tracking");
    cy.wait(["@getParcels", "@getTours", "@getCouriers"]);

    // Ouvrir la modale de refus sur le colis 303
    cy.get('[data-cy="btn-cancel-303"]').should("be.visible").click();
    cy.get('[data-cy="phone-verification-box"]').should("be.visible");

    // 1. Tester un numéro avec préfixe invalide (039)
    cy.get('[data-cy="test-recipient-phone-input"]')
      .clear()
      .type("0391234567");
    cy.get('[data-cy="phone-regex-error"]')
      .should("be.visible")
      .and("contain", "039")
      .and("contain", "non valide");
    cy.get('[data-cy="btn-update-parcel-phone"]').should("be.disabled");

    // 2. Tester un numéro incomplet (trop court : 7 chiffres)
    cy.get('[data-cy="test-recipient-phone-input"]')
      .clear()
      .type("0341234");
    cy.get('[data-cy="phone-regex-error"]')
      .should("be.visible")
      .and("contain", "7/10 chiffres");
    cy.get('[data-cy="btn-update-parcel-phone"]').should("be.disabled");

    // 3. Tester un numéro valide Telma avec espaces et international (+261 34 99 887 76)
    cy.get('[data-cy="test-recipient-phone-input"]')
      .clear()
      .type("+261 34 99 887 76");
    cy.get('[data-cy="phone-regex-success"]')
      .should("be.visible")
      .and("contain", "034 99 887 76")
      .and("contain", "TELMA");
    cy.get('[data-cy="btn-update-parcel-phone"]').should("not.be.disabled");

    // 4. Appliquer la correction du numéro sur le colis
    cy.get('[data-cy="btn-update-parcel-phone"]').click();
    cy.wait("@updateParcelContact");

    cy.get('[data-cy="phone-update-success"]')
      .should("be.visible")
      .and("contain", "034 99 887 76");
  });

  it("Test 8: Écran 05 - Encaissement Mobile Money avec Détection de l'Opérateur (Telma/Orange/Airtel)", () => {
    cy.visit("/tracking");
    cy.wait(["@getParcels", "@getTours", "@getCouriers"]);

    // Ouvrir la modale d'encaissement sur le colis 301
    cy.get('[data-cy="btn-deliver-301"]').should("be.visible").click();
    cy.get('[data-cy="payment-method-mvola"]').click();

    // La boîte de vérification Mobile Money s'affiche
    cy.get('[data-cy="mobile-money-verification-box"]').should("be.visible");

    // Saisir un numéro Orange (032) alors qu'on encaisse par MVola (Telma)
    cy.get('[data-cy="mobile-money-phone-input"]')
      .clear()
      .type("0321122334");
    cy.get('[data-cy="mm-phone-success"]')
      .should("be.visible")
      .and("contain", "ORANGE")
      .and("contain", "Attention");

    // Saisir un numéro Telma (034) conforme
    cy.get('[data-cy="mobile-money-phone-input"]')
      .clear()
      .type("0341234567");
    cy.get('[data-cy="mm-phone-success"]')
      .should("be.visible")
      .and("contain", "034 12 345 67")
      .and("contain", "TELMA");
  });

  it("Test 9: Écran 05 - Remise physique seule (LIVRÉ) puis encaissement ultérieur (ENCAISSÉ)", () => {
    cy.visit("/tracking");
    cy.wait(["@getParcels", "@getTours", "@getCouriers"]);

    // Sur le colis 303 (EN_COURS), cliquer sur le bouton "Livré"
    cy.get('[data-cy="btn-deliver-only-303"]').should("be.visible").click();

    // La modale de confirmation physique s'affiche
    cy.get('[data-cy="modal-mark-delivered"]').should("be.visible");
    cy.get('[data-cy="modal-mark-delivered"]').within(() => {
      cy.contains("Confirmation de Livraison Physique").should("be.visible");
      cy.get('[data-cy="btn-confirm-mark-delivered"]').click();
    });

    cy.wait("@cancelParcel").its("request.body").should((body) => {
      expect(body.status).to.equal("LIVRE");
    });

    // Le colis passe au statut Livré et affiche le bouton Encaisser
    cy.get('[data-cy="parcel-row-303"]').within(() => {
      cy.contains("Livré").should("be.visible");
      cy.get('[data-cy="btn-deliver-303"]').should("be.visible").and("contain", "Encaisser");
    });

    // Cliquer sur le bouton Encaisser
    cy.get('[data-cy="btn-deliver-303"]').click();
    cy.get('[data-cy="modal-deliver"]').should("be.visible");
    cy.get('[data-cy="modal-deliver"]').within(() => {
      cy.contains("Validation d'Encaissement").should("be.visible");
      cy.get('[data-cy="payment-method-especes"]').click();
      cy.get('[data-cy="btn-confirm-deliver"]').click();
    });

    cy.wait("@cancelParcel").its("request.body").should((body) => {
      expect(body.status).to.equal("ENCAISSE");
      expect(body.payment_method).to.equal("ESPECES");
    });

    cy.get('[data-cy="parcel-row-303"]').within(() => {
      cy.contains("Encaissé").should("be.visible");
    });
  });

  it("Test 10: Écran 05 - Neutralisation du COD en cours de livraison (Paiement anticipé au siège) puis remise physique à 0 Ar", () => {
    cy.visit("/tracking");
    cy.wait(["@getParcels", "@getTours", "@getCouriers"]);

    // Le colis 301 a initialement 50 000 Ar à recouvrer et affiche le bouton "Déjà Réglé"
    cy.get('[data-cy="btn-prepaid-301"]').should("be.visible").click();

    // La modale de règlement anticipé s'affiche
    cy.get('[data-cy="modal-prepaid"]').should("be.visible");
    cy.get('[data-cy="modal-prepaid"]').within(() => {
      cy.contains("Règlement Anticipé Reçu").should("be.visible");
      cy.get('[data-cy="btn-prepaid-all"]').should("be.visible").click();
      cy.get('[data-cy="prepaid-channel-mvola"]').click();
      cy.get('[data-cy="prepaid-reference-input"]').type("REF-MVOLA-7788");
      cy.get('[data-cy="btn-confirm-prepaid"]').click();
    });

    cy.wait("@prepayParcel301").its("request.body").should((body) => {
      expect(body.prepaid_type).to.equal("ALL");
      expect(body.payment_method).to.equal("MVOLA");
      expect(body.payment_reference).to.equal("REF-MVOLA-7788");
    });

    // Le montant à recouvrer est maintenant à 0 Ar (Déjà Réglé)
    cy.get('[data-cy="prepaid-zero-badge-301"]')
      .should("be.visible")
      .and("contain", "0 Ar (Déjà Réglé)");

    // Le bouton "Encaisser" a disparu pour ce colis car plus aucun COD à percevoir
    cy.get('[data-cy="btn-deliver-301"]').should("not.exist");

    // Le livreur clique sur "Livré"
    cy.get('[data-cy="btn-deliver-only-301"]').should("be.visible").click();
    cy.get('[data-cy="modal-mark-delivered"]').should("be.visible");
    cy.get('[data-cy="modal-mark-delivered"]').within(() => {
      cy.contains("0 Ar (Déjà Réglé)").should("be.visible");
      cy.get('[data-cy="btn-confirm-mark-delivered"]').click();
    });

    cy.wait("@deliverParcel").its("request.body").should((body) => {
      expect(body.status).to.equal("LIVRE");
    });

    // La ligne indique maintenant "Livré & Réglé (0 Ar)"
    cy.get('[data-cy="parcel-row-301"]').within(() => {
      cy.contains("Livré & Réglé (0 Ar)").should("be.visible");
    });
  });
});
