describe("Import CSV/Excel - Colonnes COD, Fee et Axe éditables (Priorité 10)", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/master/axes*", {
      statusCode: 200,
      body: [
        { code: "AXE_CENTRE_1", libelle: "Axe Centre 1", type_axe: "URBAIN", tarif_livraison: 3000 },
        { code: "AXE_NORD", libelle: "Axe Nord", type_axe: "URBAIN", tarif_livraison: 4500 },
      ],
    }).as("getAxes");

    cy.intercept("GET", "**/vendors*", {
      statusCode: 200,
      body: [{ id: 1, nom: "Boutique Test", type_expediteur: "CYBERMARCHAND" }],
    }).as("getVendors");

    cy.intercept("POST", "**/parcels/batch", {
      statusCode: 200,
      body: [{ id: 101, tracking_number: "BDR-001" }],
    }).as("batchImport");

    cy.visit("/import");
    cy.wait(["@getAxes", "@getVendors"]);
  });

  it("remplit cod=0 et fee depuis l'axe, permet de modifier axe/cod/fee avant enregistrement", () => {
    const csvContent = "nom,telephone,adresse,cod,fee\nJean Rakoto,0341234567,Analakely,,\n";

    cy.get('input[type="file"]').selectFile(
      {
        contents: Cypress.Buffer.from(csvContent, "utf-8"),
        fileName: "test_import.csv",
        mimeType: "text/csv",
      },
      { force: true }
    );

    // Vérifier cod = 0 et fee = 3000 (tarif_livraison de AXE_CENTRE_1)
    cy.get("tbody tr").first().within(() => {
      cy.get("select").should("have.value", "AXE_CENTRE_1");
      cy.get('input[type="number"]').eq(0).should("have.value", "0");
      cy.get('input[type="number"]').eq(1).should("have.value", "3000");

      // Changer d'axe -> fee passe à 4500
      cy.get("select").select("AXE_NORD");
      cy.get('input[type="number"]').eq(1).should("have.value", "4500");

      // Modifier cod et fee manuellement
      cy.get('input[type="number"]').eq(0).clear().type("25000");
      cy.get('input[type="number"]').eq(1).clear().type("5000");
      cy.contains("30 000 Ar").should("exist");
    });

    // Valider l'importation et vérifier le payload envoyé
    cy.contains("button", "Valider l'Importation").click();
    cy.wait("@batchImport").its("request.body").should((body) => {
      expect(body).to.have.length(1);
      expect(body[0].axis).to.eq("AXE_NORD");
      expect(body[0].merchandise_amount).to.eq(25000);
      expect(body[0].delivery_fee).to.eq(5000);
    });
  });
});
