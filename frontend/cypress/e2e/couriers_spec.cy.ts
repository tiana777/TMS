describe("Écran 04 : Gestion de la Flotte & Livreurs (CDC 11.5) - RBAC & Logique Métier", () => {
  beforeEach(() => {
    // Start by default as Superviseur
    cy.visit("/couriers", {
      onBeforeLoad(win) {
        win.localStorage.setItem("tms_user_role", "SUPERVISEUR");
      },
    });
  });

  it("1. Devrait appliquer strictement les restrictions du profil SUPERVISEUR (Actions Opérationnelles autorisées, Contractuelles verrouillées)", () => {
    // Vérification du badge de rôle
    cy.get('[data-cy="role-badge-indicator"]').should("contain", "Superviseur Logistique");
    cy.get('[data-cy="rbac-explanation-card"]').should("contain", "Habilitations Opérationnelles Superviseur");

    // Bouton Nouveau Livreur désactivé / restreint pour le superviseur
    cy.get('[data-cy="btn-open-create-courier-disabled"]').should("be.visible");
    cy.get('[data-cy="btn-open-create-courier-disabled"]').click();
    cy.get('[data-cy="alert-error"]').should("be.visible").and("contain", "réservée à la Direction");

    // Cadenas présent sur les outils d'administration
    cy.get('[data-cy^="locked-admin-tools-"]').first().should("be.visible");

    // Action opérationnelle 1 : Réaffecter l'Axe de tournée
    cy.get('[data-cy^="btn-reassign-axis-"]').first().click();
    cy.get('[data-cy="modal-reassign-axis"]').should("be.visible");
    cy.get('[data-cy="select-target-axis"]').select("AXE_AMBOHIMANGAKELY");
    cy.get('[data-cy="btn-submit-reassign-axis"]').click();
    cy.get('[data-cy="modal-reassign-axis"]').should("not.exist");
    cy.get('[data-cy="alert-success"]').should("be.visible").and("contain", "réaffecté");

    // Action opérationnelle 2 : Ajuster la capacité quotidienne
    cy.get('[data-cy^="btn-adjust-cap-"]').first().click();
    cy.get('[data-cy="modal-adjust-capacity"]').should("be.visible");
    cy.contains("20 colis").click();
    cy.get('[data-cy="target-capacity-display"]').should("contain", "20");
    cy.get('[data-cy="btn-submit-adjust-capacity"]').click();
    cy.get('[data-cy="modal-adjust-capacity"]').should("not.exist");
    cy.get('[data-cy="alert-success"]').should("be.visible").and("contain", "20 colis");
  });

  it("2. Devrait débloquer tous les privilèges contractuels pour le profil SUPER_ADMIN (Création, Édition contrat, Caution, Statut)", () => {
    // Bascule en Super Admin
    cy.visit("/couriers", {
      onBeforeLoad(win) {
        win.localStorage.setItem("tms_user_role", "SUPER_ADMIN");
      },
    });

    cy.get('[data-cy="role-badge-indicator"]').should("contain", "Super Admin (Direction)");
    cy.get('[data-cy="rbac-explanation-card"]').should("contain", "Habilitations Super Admin Débloquées");

    // Bouton Nouveau Livreur actif
    cy.get('[data-cy="btn-open-create-courier"]').should("be.visible").click();
    cy.get('[data-cy="modal-create-courier"]').should("be.visible");

    // Saisie des données du nouveau coursier
    const uniqueSuffix = Date.now().toString().slice(-4);
    const newCourierName = `Livreur Direction ${uniqueSuffix}`;
    cy.get('[data-cy="input-courier-name"]').type(newCourierName);
    cy.get('[data-cy="input-courier-phone"]').type("0349911223");
    cy.get('[data-cy="select-courier-vehicle"]').select("Moto Trail 150cc");
    cy.get('[data-cy="input-courier-deposit"]').type("{selectall}250000");
    cy.get('[data-cy="input-courier-capacity"]').type("{selectall}22");
    cy.get('[data-cy="select-courier-axis"]').select("AXE_IVATO");

    cy.get('[data-cy="btn-submit-create-courier"]').click();

    // Vérification de la création
    cy.get('[data-cy="modal-create-courier"]').should("not.exist");
    cy.get('[data-cy="alert-success"]').should("be.visible").and("contain", newCourierName);

    // Recherche et affichage de la fiche créée
    cy.get('[data-cy="search-courier-input"]').type(newCourierName);
    cy.contains(newCourierName).should("be.visible");
    cy.contains("250 000 Ar").should("be.visible");
    cy.contains("22").should("be.visible");

    // Boutons de gouvernance Direction visibles (Édition Contrat, Bascule Statut)
    cy.get('[data-cy^="btn-edit-contract-"]').first().should("be.visible");
    cy.get('[data-cy^="btn-toggle-status-"]').first().should("be.visible");
  });
});
