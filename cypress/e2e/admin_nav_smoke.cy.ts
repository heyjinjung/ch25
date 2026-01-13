// cypress/e2e/admin_nav_smoke.cy.ts

const NAV_ITEMS: Array<{ slug: string; path: string }> = [
  { slug: "dashboard", path: "/admin" },
  { slug: "marketing", path: "/admin/marketing" },
  { slug: "ops", path: "/admin/ops" },

  { slug: "vault", path: "/admin/vault" },
  { slug: "users", path: "/admin/users" },
  { slug: "game-tokens", path: "/admin/game-tokens" },
  { slug: "missions", path: "/admin/missions" },
  { slug: "seasons", path: "/admin/seasons" },
  { slug: "shop", path: "/admin/shop" },
  { slug: "user-segments", path: "/admin/user-segments" },
  { slug: "surveys", path: "/admin/surveys" },
  { slug: "external-ranking", path: "/admin/external-ranking" },

  { slug: "messages", path: "/admin/messages" },
  { slug: "team-battle", path: "/admin/team-battle" },
  { slug: "streak-rewards", path: "/admin/streak-rewards" },
  { slug: "roulette", path: "/admin/roulette" },
  { slug: "dice", path: "/admin/dice" },
  { slug: "lottery", path: "/admin/lottery" },
  { slug: "ui-config", path: "/admin/ui-config" },
];

describe("admin nav smoke", () => {
  it("navigates to all sidebar pages from dashboard", () => {
    cy.viewport(1280, 800);

    cy.visit("/admin");
    cy.location("pathname").should("not.include", "/admin/login");

    for (const item of NAV_ITEMS) {
      cy.get(`[data-testid="admin-nav:${item.slug}"]`).should("be.visible").click();
      cy.location("pathname").should("eq", item.path);
      cy.location("pathname").should("not.include", "/admin/login");

      cy.get(".admin-page-container")
        .should("be.visible")
        .find("h1, h2, table, form, input, select, [role=\"heading\"]")
        .should("exist");
    }
  });
});
