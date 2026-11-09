// @ts-nocheck
/**
 * Test E2E Cypress - Séparation Stricte Dispatch Ville vs Province & Capacité Colis Paramétrable par Livreur
 * 
 * Spécifications validées :
 * 1. Séparation Stricte :
 *    - /dispatch (Écran 03A) : Distribution Urbaine Grand Tanà (7 axes radiaux), exclusion stricte des colis Province.
 *    - /dispatch/province (Écran 03B) : Expéditions Régionales & Gares Routières (Ambodivona, Fasan'ny Karana, Andohatapenaka),
 *      exclusion stricte des colis urbains.
 *    - Bandeau transversal de navigation haute permettant de basculer en 1 clic entre les deux modules.
 * 2. Capacité Paramétrable par Livreur :
 *    - Affichage de la jauge (ex: "X / Y max").
 *    - Dépassement de capacité : alerte rouge visible et désactivation bloquante du bouton d'assignation.
 *    - Ajustement du plafond en direct (mise à jour de la capacité paramétrée) débloquant l'assignation.
 */

describe("Dispatching - Séparation Ville vs Province & Capacité Paramétrable par Livreur", () => {
  const mockCouriers = [
    {
      id: 1,
      name: "RAKOTO Jean (Livreur Urbain)",
      phone: "0341122233",
      phone_formatted: "034 11 222 33",
      vehicle_type: "Moto Cross 150cc",
      security_deposit: 150000,
      security_deposit_formatted: "150 000 Ar",
      max_parcels: 2, // Plafond initial restreint à 2 colis
      active: true,
    },
    {
      id: 2,
      name: "ANDRY Nirina (Livreur)",
      phone: "0324455566",
      phone_formatted: "032 44 555 66",
      vehicle_type: "Scooter 125cc",
      security_deposit: 150000,
      security_deposit_formatted: "150 000 Ar",
      max_parcels: 15,
      active: true,
    },
  ];

  const urbanParcel1 = {
    id: 101,
    tracking_number: "URB-001",
    reception_date: "2026-11-08",
    vendor_id: 1,
    sender_name: "Mod'Tanà Boutique",
    sender_type: "CYBERMARCHAND",
    recipient_name: "Rasoa Nirina (Urbain Centre)",
    recipient_phone: "0341234567",
    recipient_phone_formatted: "034 12 345 67",
    operator: "TELMA",
    delivery_address: "Analakely près Pavillon",
    designation: "Robe de Soie Bleue",
    axis: "AXE_CENTRE_1",
    axis_label: "Axe Centre Ville 1 (Hyper-Centre & Analakely)",
    flux_type: "COD",
    merchandise_amount: 40000,
    delivery_fee: 5000,
    total_to_collect: 45000,
    total_to_collect_formatted: "45 000 Ar",
    partner_fee: 0,
    status: "EN_DEPOT",
    status_label: "En Dépôt (Stock Hub)",
    active: true,
  };

  const urbanParcel2 = {
    id: 102,
    tracking_number: "URB-002",
    reception_date: "2026-11-08",
    vendor_id: 1,
    sender_name: "TechMada Store",
    sender_type: "CYBERMARCHAND",
    recipient_name: "Rakoto Jean (Urbain RN1)",
    recipient_phone: "0324455566",
    recipient_phone_formatted: "032 44 555 66",
    operator: "ORANGE",
    delivery_address: "Itaosy Cité",
    designation: "Écouteurs Sans Fil",
    axis: "AXE_ITAOSY",
    axis_label: "Axe Itaosy (67Ha, Itaosy & Ouest)",
    flux_type: "COD",
    merchandise_amount: 35000,
    delivery_fee: 5000,
    total_to_collect: 40000,
    total_to_collect_formatted: "40 000 Ar",
    partner_fee: 0,
    status: "EN_DEPOT",
    status_label: "En Dépôt (Stock Hub)",
    active: true,
  };

  const urbanParcel3 = {
    id: 103,
    tracking_number: "URB-003",
    reception_date: "2026-11-08",
    vendor_id: 2,
    sender_name: "PharmaCare Tanà",
    sender_type: "ENTREPRISE",
    recipient_name: "Dr. Hery (Urbain Iavoloha)",
    recipient_phone: "0331122334",
    recipient_phone_formatted: "033 11 223 34",
    operator: "AIRTEL",
    delivery_address: "Tanjombato Rond-point",
    designation: "Produits Parapharmacie",
    axis: "AXE_IAVOLOHA",
    axis_label: "Axe Iavoloha (RN7 Sud & Atsimondrano)",
    flux_type: "SIMPLE",
    merchandise_amount: 0,
    delivery_fee: 6000,
    total_to_collect: 6000,
    total_to_collect_formatted: "6 000 Ar",
    partner_fee: 0,
    status: "EN_DEPOT",
    status_label: "En Dépôt (Stock Hub)",
    active: true,
  };

  const provinceParcel1 = {
    id: 201,
    tracking_number: "PRV-001",
    reception_date: "2026-11-08",
    vendor_id: 1,
    sender_name: "Boutique MadaStyle",
    sender_type: "CYBERMARCHAND",
    recipient_name: "M. Razafy (Province Tamatave)",
    recipient_phone: "0347788990",
    recipient_phone_formatted: "034 77 889 90",
    operator: "TELMA",
    delivery_address: "Gare Ambodivona Guichet Cotisse vers Tamatave",
    designation: "Colis Vêtements Régionaux",
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

  const allParcels = [urbanParcel1, urbanParcel2, urbanParcel3, provinceParcel1];

  beforeEach(() => {
    cy.intercept("GET", "**/api/v1/couriers*", {
      statusCode: 200,
      body: mockCouriers,
    }).as("getCouriers");

    cy.intercept("GET", "**/api/v1/parcels*", {
      statusCode: 200,
      body: allParcels,
    }).as("getAllParcels");

    cy.intercept("GET", "**/api/v1/tours*", {
      statusCode: 200,
      body: [],
    }).as("getTours");
  });

  it("1. Séparation Stricte : /dispatch n'affiche QUE les colis urbains et exclut Province", () => {
    cy.visit("/dispatch");
    cy.wait(800);

    // Vérifier le titre et le badge Grand Tanà
    cy.contains("03A. Dispatching Urbain — Livraison en Ville").should("be.visible");
    cy.contains("Grand Tanà").should("be.visible");

    // Vérifier la présence du bandeau de navigation transversal
    cy.get('[data-cy="nav-dispatch-urban"]').should("be.visible").and("contain", "LIVRAISON EN VILLE");
    cy.get('[data-cy="nav-dispatch-province"]').should("be.visible").and("contain", "EXPÉDITIONS PROVINCE");

    // Vérifier les colis urbains affichés dans le tableau
    cy.get('[data-cy="stock-parcels-table"]').within(() => {
      cy.contains("URB-001").should("be.visible");
      cy.contains("Rasoa Nirina (Urbain Centre)").should("be.visible");
      cy.contains("URB-002").should("be.visible");
      cy.contains("Rakoto Jean (Urbain RN1)").should("be.visible");
      cy.contains("URB-003").should("be.visible");
      cy.contains("Dr. Hery (Urbain Iavoloha)").should("be.visible");

      // Le colis province PRV-001 DOIT ÊTRE STRICTEMENT EXCLU de la distribution urbaine
      cy.contains("PRV-001").should("not.exist");
      cy.contains("M. Razafy (Province Tamatave)").should("not.exist");
    });

    // ⏸️ PAUSE DE 3 SECONDES : Observer la séparation stricte Urbain (exclusion province)
    cy.wait(3000);
  });

  it("2. Séparation Stricte : /dispatch/province n'affiche QUE les colis Province et exclut les colis urbains", () => {
    cy.visit("/dispatch");
    cy.wait(600);

    // Clic sur le bandeau de navigation pour basculer vers Province
    cy.get('[data-cy="nav-dispatch-province"]').click();
    cy.url().should("include", "/dispatch/province");
    cy.wait(800);

    // Vérifier le titre et le badge Gares Routières
    cy.contains("Dispatching Régional — Expéditions Province").should("be.visible");
    cy.contains("Écran 03B • Gares Routières").should("be.visible");

    // Vérifier les filtres par gare
    cy.get('[data-cy="gare-filter-ALL"]').should("be.visible");
    cy.get('[data-cy="gare-filter-Ambodivona"]').should("be.visible");
    cy.get('[data-cy="gare-filter-Fasan\'ny Karana"]').should("be.visible");

    // Vérifier le tableau Province
    cy.get('[data-cy="stock-parcels-table"]').within(() => {
      // Le colis province DOIT ÊTRE PRÉSENT
      cy.contains("PRV-001").should("be.visible");
      cy.contains("M. Razafy (Province Tamatave)").should("be.visible");
      cy.contains("95 000 Ar").should("be.visible");

      // Les colis urbains DOIVENT ÊTRE STRICTEMENT EXCLUS
      cy.contains("URB-001").should("not.exist");
      cy.contains("URB-002").should("not.exist");
      cy.contains("URB-003").should("not.exist");
    });

    // ⏸️ PAUSE DE 3 SECONDES : Observer la séparation stricte Gares Routières Province
    cy.wait(3000);
  });

  it("3. Plafond de Capacité Colis par Livreur : blocage strict en cas de dépassement (2 max)", () => {
    cy.visit("/dispatch");
    cy.wait(800);

    // Sélectionner le coursier RAKOTO Jean (limité à 2 colis max)
    cy.get('[data-cy="select-courier"]').select("1");
    cy.get('[data-cy="courier-capacity-display"]').should("contain", "0 / 2 max");

    // 1. Sélectionner 1 colis -> dans la limite
    cy.get('[data-cy="parcel-row-101"]').find('input[type="checkbox"]').check();
    cy.get('[data-cy="courier-capacity-display"]').should("contain", "1 / 2 max");
    cy.get('[data-cy="capacity-warning-banner"]').should("not.exist");
    cy.get('[data-cy="assign-tour-btn"]').should("not.be.disabled");

    // 2. Sélectionner un 2ème colis -> capacité atteinte (2/2) mais autorisée
    cy.get('[data-cy="parcel-row-102"]').find('input[type="checkbox"]').check();
    cy.get('[data-cy="courier-capacity-display"]').should("contain", "2 / 2 max");
    cy.get('[data-cy="capacity-warning-banner"]').should("not.exist");
    cy.get('[data-cy="assign-tour-btn"]').should("not.be.disabled");

    // 3. Sélectionner un 3ème colis -> DÉPASSEMENT DE CAPACITÉ (3/2)
    cy.get('[data-cy="parcel-row-103"]').find('input[type="checkbox"]').check();
    cy.get('[data-cy="courier-capacity-display"]').should("contain", "3 / 2 max");

    // La bannière d'alerte rouge doit apparaître
    cy.get('[data-cy="capacity-warning-banner"]')
      .should("be.visible")
      .and("contain", "Capacité maximale dépassée")
      .and("contain", "ne peut prendre que 2 colis maximum (3 sélectionnés)");

    // Le bouton d'assignation DOIT ÊTRE STRICTEMENT BLOQUÉ ET DÉSACTIVÉ
    cy.get('[data-cy="assign-tour-btn"]')
      .should("be.disabled")
      .and("contain", "Capacité dépassée");

    // ⏸️ PAUSE DE 3 SECONDES : Observer l'alerte rouge de blocage de capacité
    cy.wait(3000);

    // 4. Décocher le 3ème colis -> retour à 2/2 -> déblocage immédiat
    cy.get('[data-cy="parcel-row-103"]').find('input[type="checkbox"]').uncheck();
    cy.get('[data-cy="courier-capacity-display"]').should("contain", "2 / 2 max");
    cy.get('[data-cy="capacity-warning-banner"]').should("not.exist");
    cy.get('[data-cy="assign-tour-btn"]').should("not.be.disabled");

    // ⏸️ PAUSE DE 3 SECONDES : Observer le déblocage après retour dans la jauge
    cy.wait(3000);
  });

  it("4. Paramétrage dynamique de la capacité livreur : passage de 2 à 5 colis débloquant l'assignation", () => {
    // Intercepter la mise à jour de la capacité du livreur
    cy.intercept("PATCH", "**/api/v1/couriers/1/capacity", {
      statusCode: 200,
      body: {
        ...mockCouriers[0],
        max_parcels: 5,
      },
    }).as("updateCapacity");

    // Intercepter la création de la tournée
    cy.intercept("POST", "**/api/v1/tours", {
      statusCode: 201,
      body: {
        id: 15,
        tour_date: "2026-11-08",
        courier_id: 1,
        status: "ASSIGNE",
        theoretical_total: 91000,
        actual_remitted: 0,
        discrepancy: -91000,
        parcels_count: 3,
      },
    }).as("createExpandedTour");

    cy.visit("/dispatch");
    cy.wait(800);

    // Sélectionner les 3 colis urbains
    cy.get('[data-cy="parcel-row-101"]').find('input[type="checkbox"]').check();
    cy.get('[data-cy="parcel-row-102"]').find('input[type="checkbox"]').check();
    cy.get('[data-cy="parcel-row-103"]').find('input[type="checkbox"]').check();

    // Sélectionner le livreur 1 (initialement limité à 2 colis)
    cy.get('[data-cy="select-courier"]').select("1");
    cy.get('[data-cy="capacity-warning-banner"]').should("be.visible");
    cy.get('[data-cy="assign-tour-btn"]').should("be.disabled");

    // Modifier le plafond paramétrable : saisir 5 et cliquer sur OK
    cy.get('[data-cy="input-courier-capacity"]').type("{selectall}5");
    cy.get('[data-cy="btn-update-capacity"]').click();
    cy.wait("@updateCapacity").its("request.body.max_parcels").should("equal", 5);

    // L'indicateur affiche maintenant 3 / 5 max (en vert)
    cy.get('[data-cy="courier-capacity-display"]').should("contain", "3 / 5 max");
    cy.get('[data-cy="capacity-warning-banner"]').should("not.exist");

    // ⏸️ PAUSE DE 3 SECONDES : Observer la nouvelle capacité de 5 colis
    cy.wait(3000);

    // Le bouton d'assignation devient actif
    cy.get('[data-cy="assign-tour-btn"]').should("not.be.disabled").click();
    cy.wait("@createExpandedTour").its("request.body").should((body) => {
      expect(body.courier_id).to.equal(1);
      expect(body.parcel_ids).to.have.length(3);
    });

    // Confirmation d'assignation réussie
    cy.get('[data-cy="assign-success-banner"]')
      .should("be.visible")
      .and("contain", "assigné(s) avec succès");

    // ⏸️ PAUSE DE 3 SECONDES : Observer la confirmation d'assignation
    cy.wait(3000);
  });
});
