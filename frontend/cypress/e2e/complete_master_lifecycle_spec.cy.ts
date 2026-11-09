// @ts-nocheck
/**
 * Test E2E Cypress - Cycle Intégral du Système TMS Express (Grand Tanà & Province)
 * ==============================================================================
 * Exécution ralentie avec pauses de 3 SECONDES à chaque étape clé pour observation visuelle
 * en direct dans le Cypress Runner (headed mode).
 *
 * Modules & Écrans couverts (Les 12 modules du Cahier des Charges) :
 * ------------------------------------------------------------------
 * 1.  Écran 01 : Inbound Quai & Saisie Multi-Colis (Détection auto Telma/Orange, Corridor RN1 & Province) [Pause 3s]
 * 2.  Écran 02 : Inbound Digital & Import Fichiers Donneurs d'Ordre (Contrôle anomalies) [Pause 3s]
 * 3.  Écran 03A : Dispatching Urbain Grand Tanà (Contrôle capacité coursier & assignation) [Pause 3s]
 * 4.  Écran 03B : Dispatching Régional Province (Routage gare Ambodivona & navette) [Pause 3s]
 * 5.  Écran 04 : Feuilles de Route & Impression Thermique (Ticket 80 mm & Export WhatsApp) [Pause 3s]
 * 6.  Écran 06 : Cockpit & KPIs Temps Réel (Barre pastel de progression & taux d'aboutissement) [Pause 3s]
 * 7.  Écran 05 : Pointage Terrain & Encaissement COD (Mobile Money MVola certifié) [Pause 3s]
 * 8.  Écran 07 : Caisse Centrale & Rapprochement Bancaire (Validation en lot) [Pause 3s]
 * 9.  Écran 08 : Décharge de Tournée & Clôture Comptable Quotidienne (Écart = 0 Ar, CDC §13.1) [Pause 3s]
 * 10. Écran 09 : CRM Donneurs d'Ordre & Bordereau Officiel de Reversement (CDC §13.3) [Pause 3s]
 * 11. Écran 10 : Administration du Référentiel Logistique (14 Axes & Coopératives) [Pause 3s]
 * 12. Écran 11 & 12 : Scorecard Livreurs (Palier OR) & Registre des Litiges [Pause 3s]
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
        boxShadow: "0 0 18px rgba(245, 158, 11, 0.95)",
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

Cypress.Commands.add("slowType", { prevSubject: "element" }, (subject, text, delay = 60, pauseAfter = 700) => {
  cy.wrap(subject)
    .scrollIntoView({ duration: 250 })
    .then(($el) => {
      $el.css({
        outline: "3px solid #3b82f6",
        boxShadow: "0 0 18px rgba(59, 130, 246, 0.85)",
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
        boxShadow: "0 0 18px rgba(139, 92, 246, 0.85)",
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
        boxShadow: "0 0 18px rgba(16, 185, 129, 0.85)",
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
    let banner = win.document.getElementById("cypress-master-banner");
    if (!banner) {
      banner = win.document.createElement("div");
      banner.id = "cypress-master-banner";
      banner.style.position = "fixed";
      banner.style.top = "16px";
      banner.style.left = "50%";
      banner.style.transform = "translateX(-50%)";
      banner.style.zIndex = "999999";
      banner.style.backgroundColor = "rgba(15, 23, 42, 0.96)";
      banner.style.color = "#ffffff";
      banner.style.padding = "10px 26px";
      banner.style.borderRadius = "9999px";
      banner.style.boxShadow = "0 10px 30px rgba(0, 0, 0, 0.7), 0 0 25px rgba(59, 130, 246, 0.6)";
      banner.style.border = "2px solid #3b82f6";
      banner.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      banner.style.fontSize = "13px";
      banner.style.fontWeight = "600";
      banner.style.display = "flex";
      banner.style.alignItems = "center";
      banner.style.gap = "12px";
      banner.style.pointerEvents = "none";
      banner.style.transition = "all 0.3s ease";
      win.document.body.appendChild(banner);
    }
    banner.innerHTML = `
      <span style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 2px 8px rgba(37,99,235,0.4);">
        Étape ${stepNumber}/12
      </span>
      <span style="color: #93c5fd; font-weight: 700;">${title}</span>
      <span style="color: #cbd5e1; font-weight: 400;">— ${subtitle}</span>
    `;
  });
}

// ============================================================================
// SUITE DE TESTS COMPLÈTE AVEC PAUSES DE 3 SECONDES
// ============================================================================

describe("TMS EXPRESS - Cycle Complet du Système avec Pauses de 3 Secondes (12 Modules CDC)", () => {
  const mockVendors = [
    {
      id: 1,
      nom: "Chic & Glam Tana",
      type_expediteur: "CYBERMARCHAND",
      telephone: "0345566778",
      adresse: "Box 14, Pavillon Analakely",
      contact_responsable: "Madame Voahirana",
      modalite_paiement: "COMPTANT",
    },
    {
      id: 2,
      nom: "Société Pharmaceutique Malgache (SPM)",
      type_expediteur: "ENTREPRISE",
      telephone: "0329988776",
      adresse: "Zone Industrielle Ankorondrano",
      contact_responsable: "Dr. Rakoto",
      nif_stat: "4001234567 / 2021",
      modalite_paiement: "FACTURE_MENSUELLE",
    },
  ];

  const mockCouriers = [
    {
      id: 1,
      name: "RAKOTO Jean",
      phone: "0341122233",
      phone_formatted: "034 11 222 33",
      vehicle_type: "Scooter 125cc",
      security_deposit: 150000,
      security_deposit_formatted: "150 000 Ar",
      max_parcels: 15,
      active: true,
    },
    {
      id: 2,
      name: "ANDRY Nirina (Navette Province)",
      phone: "0324455566",
      phone_formatted: "032 44 555 66",
      vehicle_type: "Fourgonnette",
      security_deposit: 200000,
      security_deposit_formatted: "200 000 Ar",
      max_parcels: 30,
      active: true,
    },
  ];

  const mockParcels = [
    {
      id: 101,
      tracking_number: "0001",
      reception_date: "2026-11-09",
      vendor_id: 1,
      sender_name: "Chic & Glam Tana",
      sender_type: "CYBERMARCHAND",
      sender_phone: "0345566778",
      recipient_name: "Rasoa Nirina",
      recipient_phone: "0341234567",
      recipient_phone_formatted: "034 12 345 67",
      operator: "TELMA",
      delivery_address: "Itaosy Cité Seimad",
      designation: "Robe de Soie Bleue",
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
      id: 102,
      tracking_number: "0002",
      reception_date: "2026-11-09",
      vendor_id: 1,
      sender_name: "Chic & Glam Tana",
      sender_type: "CYBERMARCHAND",
      sender_phone: "0345566778",
      recipient_name: "Jean Marc Toamasina",
      recipient_phone: "0329988776",
      recipient_phone_formatted: "032 99 887 76",
      operator: "ORANGE",
      delivery_address: "Gare Ambodivona Guichet Cotisse vers Tamatave",
      designation: "Pièces Détachées Scooter",
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
    },
  ];

  const mockAxes = [
    { id: 1, code: "AXE_CENTRE", libelle: "AXE CENTRE (Analakely, Antaninarenina)", zones: ["Analakely", "Ambohijatovo"] },
    { id: 2, code: "AXE_RN1", libelle: "AXE RN1 OUEST (Itaosy, Fenoarivo)", zones: ["Itaosy", "Ampefiloha", "Anosibe"] },
    { id: 8, code: "AXE_PROVINCE", libelle: "AXE PROVINCES & GARES ROUTIÈRES", zones: ["Gare Ambodivona", "Gare Fasan'ny Karana", "Gare Andohatapenaka"] },
  ];

  const mockPartners = [
    { id: 1, nom: "Cotisse Transport", type: "COOPERATIVE", gare_rattachement: "Gare Routière Ambodivona", contact: "032 11 020 30" },
    { id: 2, nom: "Gare Routière Ambodivona", type: "GARE", gare_rattachement: "Ambodivona", contact: "Guichet Central" },
  ];

  const mockTours = [
    {
      id: 1,
      tour_date: "2026-11-09",
      courier_id: 1,
      courier_name: "RAKOTO Jean",
      courier_phone: "0341122233",
      courier_phone_formatted: "034 11 222 33",
      courier_vehicle: "Scooter 125cc",
      status: "ASSIGNE",
      theoretical_total: 50000,
      actual_remitted: 50000,
      discrepancy: 0,
      parcels_count: 1,
      parcels: [
        {
          ...mockParcels[0],
          status: "ASSIGNE",
          tour_id: 1,
          courier_id: 1,
        },
      ],
    },
  ];

  beforeEach(() => {
    // Intercept standard APIs
    cy.intercept("GET", "**/api/v1/master/vendors*", { statusCode: 200, body: mockVendors }).as("getVendors");
    cy.intercept("GET", "**/api/v1/master/axes*", { statusCode: 200, body: mockAxes }).as("getAxes");
    cy.intercept("GET", "**/api/v1/master/partners*", { statusCode: 200, body: mockPartners }).as("getPartners");
    cy.intercept("GET", "**/api/v1/couriers*", { statusCode: 200, body: mockCouriers }).as("getCouriers");
    cy.intercept("GET", "**/api/v1/parcels*", { statusCode: 200, body: mockParcels }).as("getParcels");
    cy.intercept("GET", "**/api/v1/tours*", { statusCode: 200, body: mockTours }).as("getTours");
    cy.intercept("GET", "**/api/v1/tours/1", { statusCode: 200, body: mockTours[0] }).as("getTourDetail");

    cy.intercept("POST", "**/api/v1/parcels/batch", {
      statusCode: 201,
      body: mockParcels,
    }).as("createBatch");

    cy.intercept("POST", "**/api/v1/tours", {
      statusCode: 201,
      body: mockTours[0],
    }).as("createTour");

    cy.intercept("POST", "**/api/v1/tours/1/start", {
      statusCode: 200,
      body: { ...mockTours[0], status: "EN_COURS" },
    }).as("startTour");

    cy.intercept("PATCH", "**/api/v1/parcels/101/status", {
      statusCode: 200,
      body: { ...mockParcels[0], status: "LIVRE_ENCAISSE", payment_method: "MVOLA" },
    }).as("deliverParcel");

    cy.intercept("POST", "**/api/v1/cash/bulk-close", {
      statusCode: 200,
      body: { closed_count: 1, total_amount: 50000 },
    }).as("bulkCloseCash");

    cy.intercept("POST", "**/api/v1/tours/1/close", {
      statusCode: 200,
      body: { ...mockTours[0], status: "CLOTURE", discrepancy: 0 },
    }).as("closeTour");

    cy.intercept("GET", "**/api/v1/payouts*", {
      statusCode: 200,
      body: [],
    }).as("getPayouts");

    cy.intercept("POST", "**/api/v1/payouts", {
      statusCode: 201,
      body: {
        id: 1,
        reference_reversement: "REV-20261109-0001",
        vendor_id: 1,
        vendor_name: "Chic & Glam Tana",
        date_reversement: "2026-11-09",
        total_marchandise_encaissee: 45000,
        total_frais_livraison_deduits: 5000,
        total_indemnisation_litiges: 0,
        solde_net_verse: 40000,
        solde_net_verse_formatted: "40 000 Ar",
        mode_reglement: "MVOLA",
        reference_preuve: "MV-20261109-0881",
        statut: "VALIDE",
        nombre_colis: 1,
        created_at: "2026-11-09 10:30:00",
        colis: [],
      },
    }).as("createPayout");

    cy.intercept("GET", "**/api/v1/couriers/1/scorecard*", {
      statusCode: 200,
      body: {
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
    }).as("getScorecard");

    cy.intercept("GET", "**/api/v1/couriers/leaderboard*", {
      statusCode: 200,
      body: [
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
      ],
    }).as("getLeaderboard");

    cy.intercept("GET", "**/api/v1/disputes*", {
      statusCode: 200,
      body: [
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
      ],
    }).as("getDisputes");
  });

  // ==========================================================================
  // SCÉNARIO 1 : INBOUND QUAI & SAISIE MULTI-COLIS (ÉCRAN 01)
  // ==========================================================================
  it("01. Écran 01 : Saisie Inbound Multi-Colis avec Auto-détection & Choix d'Axe", () => {
    showStepBanner(1, "Écran 01 : Inbound Quai", "Saisie multi-colis, détection opérateur & corridors logistiques");
    cy.visit("/inbound");

    cy.contains("Réception Quai").should("be.visible");
    cy.get('[data-testid="type-cybermarchand"]').should("be.visible").slowClick(500);

    // Saisie de l'expéditeur Cybermarchand
    cy.get('[data-testid="sender-name-input"]').should("be.visible").slowType("Chic & Glam Tana", 40, 500);
    cy.get('[data-testid="sender-phone-input"]').should("be.visible").slowType("0345566778", 40, 500);

    // Ligne 1 : Colis Urbain COD (Itaosy / AXE_RN1)
    cy.get('[data-testid="input-name-0"]').slowType("Rasoa Nirina", 40, 400);
    cy.get('[data-testid="input-phone-0"]').slowType("0341234567", 40, 400);
    cy.get('[data-testid="badge-operator-telma"]').should("be.visible");

    cy.get('[data-testid="input-designation-0"]').slowType("Robe de Soie Bleue", 35, 400);
    cy.get('[data-testid="input-address-0"]').slowType("Itaosy Cité Seimad", 35, 400);
    cy.get('[data-testid="badge-axis-axe_rn1"]').should("be.visible");

    cy.get('[data-testid="input-merch-0"]').slowType("{selectall}45000", 30, 400);
    cy.get('[data-testid="input-fee-0"]').slowType("{selectall}5000", 30, 400);

    // Ligne 2 : Colis Province (Gare Ambodivona / AXE_PROVINCE)
    cy.get('[data-testid="add-row-btn"]').slowClick(600);
    cy.get('[data-testid="input-name-1"]').slowType("Jean Marc Toamasina", 40, 400);
    cy.get('[data-testid="input-phone-1"]').slowType("0329988776", 40, 400);
    cy.get('[data-testid="badge-operator-orange"]').should("be.visible");

    cy.get('[data-testid="input-designation-1"]').slowType("Pièces Détachées Scooter", 35, 400);
    cy.get('[data-testid="input-address-1"]').slowType("Gare Ambodivona vers Tamatave", 35, 400);
    cy.get('[data-testid="badge-axis-axe_province"]').should("be.visible");

    cy.get('[data-testid="input-merch-1"]').slowType("{selectall}80000", 30, 400);
    cy.get('[data-testid="input-fee-1"]').slowType("{selectall}15000", 30, 400);

    // ⏸️ PAUSE DE 3 SECONDES : Observer le formulaire Inbound complet avec calculs et badges
    cy.wait(3000);

    // Soumission du lot
    cy.get('[data-testid="submit-batch-btn"]').slowClick(1000);
    cy.wait("@createBatch");

    // Modal de confirmation des BDRs
    cy.get('[data-testid="success-modal"]').should("be.visible");
    cy.contains("BDR-0001").should("be.visible");
    cy.contains("BDR-0002").should("be.visible");

    // ⏸️ PAUSE DE 3 SECONDES : Observer la modal de confirmation avec BDR générés
    cy.wait(3000);
  });

  // ==========================================================================
  // SCÉNARIO 2 : IMPORT EN MASSE DE FICHIERS (ÉCRAN 02)
  // ==========================================================================
  it("02. Écran 02 : Importation en Masse de Fichiers Donneurs d'Ordre", () => {
    showStepBanner(2, "Écran 02 : Import Fichiers", "Prévisualisation du jeu d'essai et contrôle qualité automatique");
    cy.visit("/import");

    cy.contains("Import de Fichiers Cybermarchands").should("be.visible");

    // Charger les données échantillons
    cy.get('[data-testid="load-sample-btn"]').should("be.visible").slowClick(800);

    cy.contains("Prévisualisation des Données Ingestées").should("be.visible");
    cy.contains("Rasoa Nirina").should("be.visible");

    // ⏸️ PAUSE DE 3 SECONDES : Observer le tableau d'ingestion avec détection des anomalies
    cy.wait(3000);
  });

  // ==========================================================================
  // SCÉNARIO 3 : DISPATCHING URBAIN & CONTRÔLE CAPACITÉ (ÉCRAN 03A)
  // ==========================================================================
  it("03. Écran 03A : Dispatching Urbain Grand Tanà & Jauge de Capacité Coursier", () => {
    showStepBanner(3, "Écran 03A : Dispatching Urbain", "Séparation stricte Grand Tanà & plafond max de 15 colis");
    cy.visit("/dispatch");

    cy.contains("03A. Dispatching Urbain").should("be.visible");
    cy.contains("🛵 1. LIVRAISON EN VILLE").should("be.visible");

    // Sélection du livreur urbain
    cy.get("select").first().should("be.visible").slowSelect("1", 700);

    // Sélection du colis urbain
    cy.get('input[type="checkbox"]').first().should("be.visible").slowCheck(600);

    // ⏸️ PAUSE DE 3 SECONDES : Observer la sélection du coursier et la jauge de charge
    cy.wait(3000);

    // Validation du dispatching
    cy.contains("button", "Assigner").first().slowClick(1000);

    // ⏸️ PAUSE DE 3 SECONDES : Observer la tournée créée avec succès
    cy.wait(3000);
  });

  // ==========================================================================
  // SCÉNARIO 4 : DISPATCHING PROVINCE & GARES ROUTIÈRES (ÉCRAN 03B)
  // ==========================================================================
  it("04. Écran 03B : Dispatching Régional Province & Gares Routières", () => {
    showStepBanner(4, "Écran 03B : Dispatching Province", "Aiguillage exclusif vers les gares d'Antananarivo (Ambodivona)");
    cy.visit("/dispatch/province");

    cy.contains("03B. Dispatching Régional").should("be.visible");
    cy.contains("🚌 2. EXPÉDITIONS PROVINCE").should("be.visible");

    // ⏸️ PAUSE DE 3 SECONDES : Observer le stock province filtré par gare
    cy.wait(3000);

    // Sélection du colis province
    cy.get('input[type="checkbox"]').first().should("be.visible").slowCheck(600);

    // ⏸️ PAUSE DE 3 SECONDES : Observer le colis coché pour la navette gare
    cy.wait(3000);
  });

  // ==========================================================================
  // SCÉNARIO 5 : FEUILLE DE ROUTE & IMPRESSION THERMIQUE 80MM (ÉCRAN 04)
  // ==========================================================================
  it("05. Écran 04 : Feuilles de Route, Ticket Thermique 80 mm & WhatsApp", () => {
    showStepBanner(5, "Écran 04 : Feuilles de Route", "Format ticket thermique 80 mm et partage direct WhatsApp");
    cy.visit("/dispatch");

    // Ouvrir le détail de la tournée
    cy.contains("button", "Feuille de Route").first().slowClick(800);

    cy.contains("RAKOTO Jean").should("be.visible");
    cy.contains("034 11 222 33").should("be.visible");

    // ⏸️ PAUSE DE 3 SECONDES : Observer le ticket thermique 80 mm prêt à l'impression
    cy.wait(3000);

    // Fermer la modal
    cy.contains("button", "Fermer").click();
  });

  // ==========================================================================
  // SCÉNARIO 6 : COCKPIT LOGISTIQUE & KPIS TEMPS RÉEL (ÉCRAN 06)
  // ==========================================================================
  it("06. Écran 06 : Cockpit d'Exploitation Logistique & Barre Pastel", () => {
    showStepBanner(6, "Écran 06 : Cockpit KPIs", "Supervision temps réel GMT+3 et indicateurs de performance");
    cy.visit("/");

    cy.contains("Cockpit d'Exploitation Logistique").should("be.visible");
    cy.contains("Direct GMT+3 (Indian/Antananarivo)").should("be.visible");

    // ⏸️ PAUSE DE 3 SECONDES : Observer les jauges de progression et métriques consolidées
    cy.wait(3000);
  });

  // ==========================================================================
  // SCÉNARIO 7 : POINTAGE TERRAIN & ENCAISSEMENT COD (ÉCRAN 05)
  // ==========================================================================
  it("07. Écran 05 : Pointage Terrain & Encaissement COD Mobile Money (MVola)", () => {
    showStepBanner(7, "Écran 05 : Pointage Terrain", "Démarrage tournée, remise au destinataire et encaissement");
    cy.visit("/tracking");

    cy.contains("Pointage Terrain").should("be.visible");

    // Démarrage de tournée
    cy.contains("button", "Démarrer Tournée").first().slowClick(800);

    // ⏸️ PAUSE DE 3 SECONDES : Observer le statut passé à EN COURS DE LIVRAISON
    cy.wait(3000);

    // Ouvrir encaissement / livraison
    cy.contains("button", "Encaisser").first().slowClick(800);

    // ⏸️ PAUSE DE 3 SECONDES : Observer la modale d'encaissement Mobile Money
    cy.wait(3000);

    // Fermer modal
    cy.contains("button", "Annuler").click();
  });

  // ==========================================================================
  // SCÉNARIO 8 : CAISSE CENTRALE & DÉCHARGE DE TOURNÉE (ÉCRANS 07 & 08)
  // ==========================================================================
  it("08. Écrans 07 & 08 : Caisse Centrale, Rapprochement & Décharge Livreur", () => {
    showStepBanner(8, "Écrans 07 & 08 : Caisse & Décharge", "Rapprochement des fonds COD et clôture de tournée sans écart (CDC §13.1)");
    cy.visit("/cash");

    cy.contains("Caisse Centrale & Clôture").should("be.visible");

    // ⏸️ PAUSE DE 3 SECONDES : Observer les encaissements à rapprocher
    cy.wait(3000);

    // Tab Décharge de Tournée
    cy.contains("button", "Décharge de Tournée").slowClick(700);
    cy.contains("RAKOTO Jean").should("be.visible");

    // ⏸️ PAUSE DE 3 SECONDES : Observer la fiche de décharge financière avec formule d'écart
    cy.wait(3000);
  });

  // ==========================================================================
  // SCÉNARIO 9 : CRM DONNEURS D'ORDRE & BORDEREAU DE REVERSEMENT (ÉCRAN 09)
  // ==========================================================================
  it("09. Écran 09 : CRM Donneurs d'Ordre & Bordereau Officiel de Reversement", () => {
    showStepBanner(9, "Écran 09 : CRM Expéditeurs", "Calcul du solde net (CDC §13.3) et bordereau officiel de reversement");
    cy.visit("/crm");

    cy.contains("Écran 09 : CRM Donneurs d'Ordre").should("be.visible");
    cy.contains("Chic & Glam Tana").should("be.visible");

    // Ouvrir Relevé de Compte
    cy.contains("button", "Relevé de Compte").slowClick(800);

    cy.contains("Bordereau Officiel de Reversement Financier").should("be.visible");
    cy.contains("NET À REVERSER AU DONNEUR D'ORDRE").should("be.visible");

    // Saisie référence preuve Mobile Money
    cy.get('input[placeholder*="MV-"]').should("be.visible").slowType("MV-20261109-0881", 40, 500);

    // ⏸️ PAUSE DE 3 SECONDES : Observer le bordereau officiel complet avec le net à reverser
    cy.wait(3000);

    // Valider le reversement
    cy.contains("button", "Valider & Émettre le Reversement").slowClick(1000);

    // ⏸️ PAUSE DE 3 SECONDES : Observer la confirmation avec le numéro REV-20261109-0001
    cy.wait(3000);

    cy.contains("button", "Fermer").click();
  });

  // ==========================================================================
  // SCÉNARIO 10 : ADMINISTRATION DU RÉFÉRENTIEL LOGISTIQUE (ÉCRAN 10)
  // ==========================================================================
  it("10. Écran 10 : Administration du Référentiel Logistique (14 Axes & Gares)", () => {
    showStepBanner(10, "Écran 10 : Référentiel Logistique", "Corridors urbains, lignes nationales et coopératives homologuées");
    cy.visit("/referentiel");

    cy.contains("10. Référentiel Logistique").should("be.visible");
    cy.contains("AXE RN1 OUEST").should("be.visible");

    // ⏸️ PAUSE DE 3 SECONDES : Observer la cartographie des corridors urbains
    cy.wait(3000);

    // Onglet Gares & Coopératives
    cy.contains("button", "Gares Routières & Coopératives").slowClick(700);
    cy.contains("Cotisse Transport").should("be.visible");
    cy.contains("Gare Routière Ambodivona").should("be.visible");

    // ⏸️ PAUSE DE 3 SECONDES : Observer le répertoire des coopératives nationales
    cy.wait(3000);
  });

  // ==========================================================================
  // SCÉNARIO 11 : SUIVI DE PERFORMANCE & SCORECARDS LIVREURS (ÉCRAN 11)
  // ==========================================================================
  it("11. Écran 11 : Suivi de Performance, Classement & Primes de Productivité", () => {
    showStepBanner(11, "Écran 11 : Performance Flotte", "Leaderboard mensuel, taux de succès & attribution des primes");
    cy.visit("/scorecards");

    cy.contains("Écran 11 : Suivi de Performance & Scorecard Livreurs").should("be.visible");
    cy.contains("RAKOTO Jean").should("be.visible");
    cy.contains("OR").should("be.visible");

    // ⏸️ PAUSE DE 3 SECONDES : Observer le palier OR et la prime calculée (150 000 Ar)
    cy.wait(3000);
  });

  // ==========================================================================
  // SCÉNARIO 12 : REGISTRE DES LITIGES & PLANS DE RECOUVREMENT (ÉCRAN 12)
  // ==========================================================================
  it("12. Écran 12 : Registre des Litiges, Dettes Livreurs & Plans d'Apurement", () => {
    showStepBanner(12, "Écran 12 : Gouvernance & Litiges", "Recouvrement des déficits COD, avaries et suivi d'apurement (CDC §11)");
    cy.visit("/disputes");

    cy.contains("Écran 12 : Registre des Litiges").should("be.visible");
    cy.contains("LIT-2026-0001").should("be.visible");
    cy.contains("DEFICIT_COD").should("be.visible");

    // ⏸️ PAUSE DE 3 SECONDES : Observer le dossier de litige et le solde restant dû
    cy.wait(3000);
  });
});
