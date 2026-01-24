// cypress/e2e/admin_nav_smoke.cy.ts

const NAV_ITEMS: Array<{ slug: string; path: string }> = [
  { slug: "dashboard", path: "/v2/admin/dashboard" },
  { slug: "marketing/messages", path: "/v2/admin/marketing/messages" },
  { slug: "users", path: "/v2/admin/users" },
  { slug: "game/level", path: "/v2/admin/game/level" },
  { slug: "economy/vault", path: "/v2/admin/economy/vault" },
  { slug: "economy/deposits", path: "/v2/admin/economy/deposits" },
  { slug: "inventory/tickets", path: "/v2/admin/inventory/tickets" },
  { slug: "economy/shop", path: "/v2/admin/economy/shop" },
  { slug: "game/roulette", path: "/v2/admin/game/roulette" },
  { slug: "game/dice", path: "/v2/admin/game/dice" },
  { slug: "game/lottery", path: "/v2/admin/game/lottery" },
  { slug: "game/team-battle", path: "/v2/admin/game/team-battle" },
];

describe("admin nav smoke", () => {
  it("navigates to all sidebar pages from dashboard", () => {
    cy.viewport(1280, 800);

    // Initial check for /v2 prefix
    cy.loginAdmin();
    
    cy.visit("/v2/admin/dashboard");
    cy.location("pathname").should("not.include", "/admin/login");

    for (const item of NAV_ITEMS) {
      // Find the button with data-testid. Note: slug has slashes for path matching here.
      // But split().pop() logic in AdminLayout means we need to match the testid properly.
      const testId = item.path.split("/").pop() || "dashboard";
      cy.get(`[data-testid="admin-nav:${testId}"]`).should("be.visible").click();
      cy.location("pathname").should("eq", item.path);
      cy.location("pathname").should("not.include", "/login");
    }
  });
});
