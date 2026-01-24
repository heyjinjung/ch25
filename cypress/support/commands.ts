/// <reference types="cypress" />

Cypress.Commands.add("loginAdmin", (username = "admin", password = "admin1234") => {
  cy.visit("/v2/admin/login");
  
  // Try data-testid first, then fallback to placeholders/tags
  cy.get("body").then(($body) => {
    if ($body.find("[data-testid=\"login-username\"]").length > 0) {
      cy.get("[data-testid=\"login-username\"]").type(username);
      cy.get("[data-testid=\"login-password\"]").type(password);
      cy.get("[data-testid=\"login-submit\"]").click();
    } else {
      // Fallback for V1 remnants or un-rebuilt V2
      cy.get("input").first().type(username);
      cy.get("input").last().type(password);
      cy.get("button").contains("로그인").click();
    }
  });

  cy.location("pathname", { timeout: 10000 }).should("not.include", "/login");
});
