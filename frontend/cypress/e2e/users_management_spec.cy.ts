describe("Écran 10 : Référentiel - Gestion des Comptes Utilisateurs & Livreurs", () => {
  const uniqueId = Date.now().toString().slice(-4);

  it("1. Superviseur peut consulter la liste des utilisateurs et filtrer", () => {
    cy.visit("/referentiel", {
      onBeforeLoad(win) {
        win.localStorage.setItem("tms_user_role", "SUPERVISEUR");
        win.localStorage.setItem("tms_username", "superviseur");
      },
    });

    // Onglet Comptes & Utilisateurs
    cy.get('[data-cy="tab-users"]').should("be.visible").click();

    // Vérifier les compteurs de cockpit
    cy.contains("Total Comptes").should("be.visible");
    cy.contains("utilisateurs").should("be.visible");

    // Vérifier le tableau des utilisateurs
    cy.contains("Personnel & Droits d'Accès Plateforme").should("be.visible");
    cy.contains("admin").should("be.visible");
    cy.contains("superviseur").should("be.visible");

    // Bouton Nouvel Utilisateur accessible
    cy.get('[data-cy="btn-open-add-user-modal"]').should("be.visible").click();
    cy.get('[data-cy="modal-create-user-referentiel"]').should("be.visible");

    // Fermer le modal
    cy.get('[data-cy="btn-close-user-modal"]').click();
    cy.get('[data-cy="modal-create-user-referentiel"]').should("not.exist");
  });

  it("2. Superviseur ou Super Admin peut créer un nouvel utilisateur", () => {
    cy.visit("/referentiel", {
      onBeforeLoad(win) {
        win.localStorage.setItem("tms_user_role", "SUPER_ADMIN");
        win.localStorage.setItem("tms_username", "admin");
      },
    });

    cy.get('[data-cy="tab-users"]').click();
    cy.get('[data-cy="btn-open-add-user-modal"]').click();

    const testLogin = `agent_${uniqueId}`;
    const testEmail = `agent_${uniqueId}@tmsexpress.mg`;
    const testNom = `Agent Test ${uniqueId}`;

    cy.get('[data-cy="input-user-username"]').type(testLogin);
    cy.get('[data-cy="input-user-fullname"]').type(testNom);
    cy.get('[data-cy="input-user-email"]').type(testEmail);
    cy.get('[data-cy="select-user-role"]').select("RECEPTIONNISTE");
    cy.get('[data-cy="input-user-password"]').type("secret123");

    cy.get('[data-cy="btn-submit-create-user"]').click();

    // Notification succès
    cy.get('[data-cy="referentiel-feedback-banner"]')
      .should("be.visible")
      .and("contain", testLogin);

    // Vérification de la présence dans la table
    cy.contains(testNom).should("be.visible");
    cy.contains(testLogin).should("be.visible");
  });

  it("3. Vérification de l'onglet Livreurs dans le Référentiel", () => {
    cy.visit("/referentiel", {
      onBeforeLoad(win) {
        win.localStorage.setItem("tms_user_role", "SUPERVISEUR");
        win.localStorage.setItem("tms_username", "superviseur");
      },
    });

    cy.get('[data-cy="tab-couriers"]').should("be.visible").click();
    cy.contains("Flotte des Livreurs & Rattachement par Axe").should("be.visible");

    // Bouton Nouveau Livreur présent
    cy.get('[data-cy="btn-open-add-courier-modal"]').should("be.visible").click();
    cy.get('[data-cy="modal-create-courier-referentiel"]').should("be.visible");

    // Fermeture du modal livreur
    cy.get('[data-cy="btn-close-courier-modal"]').click();
    cy.get('[data-cy="modal-create-courier-referentiel"]').should("not.exist");
  });
});
