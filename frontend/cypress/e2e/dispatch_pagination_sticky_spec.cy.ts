describe("Écran 03 - Dispatching : Sticky Controls, Overflow Hidden et Pagination 10 Lignes Max", () => {
  beforeEach(() => {
    // Intercept parcels and couriers APIs
    cy.intercept("GET", "**/api/v1/parcels*").as("getParcels");
    cy.intercept("GET", "**/api/v1/couriers*").as("getCouriers");
    cy.intercept("GET", "**/api/v1/tours*").as("getTours");
  });

  it("1. Vérifie l'ancrage sticky et le conteneur overflow-hidden sur /dispatch", () => {
    cy.visit("http://localhost:3000/dispatch");
    cy.wait(["@getParcels", "@getCouriers"]);

    // Vérification de la barre de commandes sticky
    cy.get('[data-cy="sticky-dispatch-controls"]')
      .should("be.visible")
      .and("have.css", "position", "sticky")
      .and("have.css", "top", "0px");

    // Vérification du conteneur de tableau avec overflow-hidden
    cy.get('[data-cy="parcels-table-container"]')
      .should("be.visible")
      .and("have.css", "overflow-x", "hidden")
      .and("have.css", "overflow-y", "hidden");
  });

  it("2. Vérifie le plafonnement strict à 10 lignes max par page et la pagination sur /dispatch", () => {
    cy.visit("http://localhost:3000/dispatch");
    cy.wait(["@getParcels", "@getCouriers"]);

    // Vérification du nombre de lignes dans le tableau : au plus 10
    cy.get('[data-cy="stock-parcels-table"] tbody tr').then(($rows) => {
      expect($rows.length).to.be.at.most(10);
    });

    // Si le stock contient plus de 10 colis, tester les boutons de navigation
    cy.get("body").then(($body) => {
      if ($body.find('[data-cy="pagination-container"]').length > 0) {
        // Le badge 10 lignes max doit être affiché
        cy.get('[data-cy="pagination-container"]').contains("10 lignes max / page").should("be.visible");

        // Sur la première page, le bouton 'Début' et 'Précédent' doivent être désactivés
        cy.get('[data-cy="btn-page-first"]').should("be.disabled");
        cy.get('[data-cy="btn-page-prev"]').should("be.disabled");

        // Si plus d'une page
        if ($body.find('[data-cy="btn-page-2"]').length > 0) {
          cy.get('[data-cy="btn-page-next"]').should("not.be.disabled").click();
          cy.wait(300);

          // Page 2 : le bouton Précédent devient actif
          cy.get('[data-cy="btn-page-prev"]').should("not.be.disabled");
          cy.get('[data-cy="btn-page-first"]').should("not.be.disabled");

          // Nombre de lignes toujours <= 10
          cy.get('[data-cy="stock-parcels-table"] tbody tr').then(($page2Rows) => {
            expect($page2Rows.length).to.be.at.most(10);
          });

          // Retour à la page 1 via bouton Début
          cy.get('[data-cy="btn-page-first"]').click();
          cy.wait(300);
          cy.get('[data-cy="btn-page-first"]').should("be.disabled");
        }
      }
    });
  });

  it("3. Vérifie l'ancrage sticky, l'overflow-hidden et la pagination sur /dispatch/province", () => {
    cy.visit("http://localhost:3000/dispatch/province");
    cy.wait(["@getParcels", "@getCouriers"]);

    // Sticky barre de contrôle province
    cy.get('[data-cy="sticky-dispatch-controls"]')
      .should("be.visible")
      .and("have.css", "position", "sticky")
      .and("have.css", "top", "0px");

    // Table container overflow-hidden
    cy.get('[data-cy="parcels-table-container"]')
      .should("be.visible")
      .and("have.css", "overflow-x", "hidden")
      .and("have.css", "overflow-y", "hidden");

    // Maximum 10 lignes
    cy.get('[data-cy="stock-parcels-table"] tbody tr').then(($rows) => {
      expect($rows.length).to.be.at.most(10);
    });
  });
});
