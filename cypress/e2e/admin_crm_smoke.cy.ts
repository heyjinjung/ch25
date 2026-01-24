// cypress/e2e/admin_crm_smoke.cy.ts

describe("Admin CRM Smoke", () => {
  it("sends a marketing message", () => {
    // 0. Cleanup
    cy.clearLocalStorage();
    
    // 1. Login
    cy.visit("/admin/login");
    cy.contains("관리자 로그인").should("be.visible"); // Wait for text
    cy.get("[data-testid=\"login-username\"]").should("be.visible").type("admin");
    cy.get("[data-testid=\"login-password\"]").type("2026");
    cy.get("[data-testid=\"login-submit\"]").click();
    
    // 2. Nav to CRM
    cy.visit("/admin/marketing/messages");
    cy.contains("메시지 발송").should("be.visible");

    // 3. Fill Form
    cy.get("input[placeholder=\"메시지 제목 입력\"]").type("Cypress Test Message");
    cy.get("textarea").type("This is an automated smoke test message.");
    
    // 4. Send
    // Intercept to verify V2 endpoint usage
    cy.intercept("POST", "/api/v2/admin/marketing/messages").as("sendMessage");
    cy.contains("button", "즉시 발송").click();

    // 5. Verify Request & UI Update
    cy.wait("@sendMessage").its("response.statusCode").should("eq", 200);
    cy.contains("Cypress Test Message").should("be.visible"); // Assuming list updates or success toast
  });
});
