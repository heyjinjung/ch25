// cypress/e2e/v2_admin_auth.cy.ts

describe("v2 admin login smoke", () => {
  it("successfully redirects to v2 dashboard after login", () => {
    cy.viewport(1280, 800);
    cy.visit("/v2/admin/login");
    
    // Explicitly target V2 login inputs
    cy.get("[data-testid=\"login-username\"]").type("admin");
    cy.get("[data-testid=\"login-password\"]").type("2wP?+!Etm8#Qv4Mn");
    cy.get("[data-testid=\"login-submit\"]").click();

    // Verify path isolation
    cy.url().should("include", "/v2/admin/dashboard");
    cy.contains("대시보드").should("be.visible");
  });
});
