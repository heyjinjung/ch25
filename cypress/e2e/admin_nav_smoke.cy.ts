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
      // Robust navigation: Try data-testid, fallback to text matching
      const testId = item.path.split("/").pop() || "dashboard";
      const label = {
        "dashboard": "대시보드",
        "messages": "연락관리",
        "users": "유저통합",
        "level": "레벨관리",
        "vault": "금고현황",
        "deposits": "입금관리",
        "tickets": "티켓/토큰관리",
        "shop": "상점/미션",
        "roulette": "룰렛",
        "dice": "주사위",
        "lottery": "복권",
        "team-battle": "팀배틀"
      }[testId] || testId;

      cy.get("body").then(($body) => {
        const selector = `[data-testid="admin-nav:${testId}"]`;
        if ($body.find(selector).length > 0) {
          cy.get(selector).scrollIntoView().should("be.visible").click();
        } else {
          // Find button contains label, ensure it's scrolled to
          cy.contains("button", label).scrollIntoView().should("be.visible").click();
        }
      });

      cy.location("pathname").should("eq", item.path);
      cy.location("pathname").should("not.include", "/login");
    }
  });
});
