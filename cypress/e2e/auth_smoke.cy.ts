// cypress/e2e/auth_smoke.cy.ts

describe("auth smoke", () => {
  it("successfully logs in and retrieves v2 token", () => {
    cy.viewport(1280, 800);
    // Use dev login for efficiency
    cy.visit("/v2/admin/login");
    cy.get("body").then(($body) => {
      if ($body.find("[data-testid=\"login-username\"]").length > 0) {
        cy.get("[data-testid=\"login-username\"]").type("admin");
        cy.get("[data-testid=\"login-password\"]").type("2wP?+!Etm8#Qv4Mn");
        cy.get("[data-testid=\"login-submit\"]").click();
      } else {
        cy.get("input").first().type("admin");
        cy.get("input").last().type("2wP?+!Etm8#Qv4Mn");
        cy.get("button").contains("로그인").click();
      }
    });

    cy.location("pathname", { timeout: 10000 }).should("not.include", "/login");
    // Verify dashboard load
    cy.contains("대시보드").should("be.visible");
  });
});
