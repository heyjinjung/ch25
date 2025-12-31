/// <reference types="cypress" />

const mockTelegramWebApp = (win: Window) => {
  const tgUser = { id: 123456789, username: "cypress_tg" };
  (win as any).Telegram = {
    WebApp: {
      initData: "query_id=AAE_CYPRESS&user=%7B%22id%22%3A123456789%2C%22username%22%3A%22cypress_tg%22%7D&auth_date=1700000000&hash=deadbeef",
      initDataUnsafe: {
        user: tgUser,
        start_param: "",
      },
      colorScheme: "dark",
      ready: () => undefined,
      expand: () => undefined,
      HapticFeedback: {
        impactOccurred: () => undefined,
        notificationOccurred: () => undefined,
        selectionChanged: () => undefined,
      },
    },
  };
};

describe("TMA entry → UI action → audio call (E2E)", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/api/season-pass/status", {
      progress: { current_level: 1, current_xp: 0, next_level_xp: 0, total_stamps: 0, last_stamp_date: null },
      levels: [],
      season: { id: 1, season_name: "CYPRESS", start_date: "2025-01-01", end_date: "2025-12-31", max_level: 1, base_xp_per_stamp: 0 },
      today: { stamped: false, date: "2025-01-01" },
    }).as("seasonPassStatus");

    cy.intercept("GET", "**/api/crm/messages/inbox", []).as("inbox");

    cy.intercept("GET", "**/api/vault/status", {
      eligible: false,
      vault_balance: 0,
      locked_balance: 0,
      available_balance: 0,
      cash_balance: 0,
      vault_fill_used_at: null,
      seeded: false,
      expires_at: null,
      recommended_action: null,
      cta_payload: null,
      program_key: null,
      unlock_rules_json: null,
      ui_copy_json: null,
      accrual_multiplier: null,
    }).as("vaultStatus");

    cy.intercept("GET", "**/api/roulette/status*", { token_balance: 0 }).as("rouletteStatus");
    cy.intercept("GET", "**/api/dice/status", { token_balance: 0 }).as("diceStatus");
    cy.intercept("GET", "**/api/lottery/status", { token_balance: 0 }).as("lotteryStatus");

    cy.intercept("POST", "**/api/trial-grant", { result: "SKIP", granted: 0, balance: 0, label: "cypress" }).as(
      "trialGrant"
    );

    // Some layouts fetch surveys; keep it deterministic.
    cy.intercept("GET", "**/api/surveys/active", { items: [] }).as("activeSurveys");
  });

  it("records audio events on entry and tab click", () => {
    cy.visit("/landing", {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.sessionStorage.clear();
        win.localStorage.setItem("xmas_auth_version", "v3");
        win.localStorage.setItem("xmas_access_token", "cypress-access-token");
        win.localStorage.setItem("token", "cypress-access-token");
        win.localStorage.setItem(
          "xmas_user",
          JSON.stringify({ id: 1, external_id: "tg_cypress", nickname: "Cypress", status: "ACTIVE", level: 1 })
        );
        win.localStorage.setItem("sound_muted", "false");
        (win as any).__e2eSoundEvents = [];
        mockTelegramWebApp(win);
      },
    });

    cy.wait("@seasonPassStatus");
    cy.wait("@vaultStatus");
    cy.wait("@rouletteStatus");
    cy.wait("@diceStatus");
    cy.wait("@lotteryStatus");
    cy.wait("@inbox");

    cy.window()
      .its("__e2eSoundEvents")
      .should("be.an", "array")
      .then((events: any[]) => {
        const hasAnySoundAttempt = events.some((e) => e?.kind === "sfx" || e?.kind === "bgm");
        expect(hasAnySoundAttempt).to.eq(true);
      });

    cy.contains("ALL GAMES").click();

    cy.window()
      .its("__e2eSoundEvents")
      .then((events: any[]) => {
        const sfxEvents = events.filter((e) => e?.kind === "sfx");
        expect(sfxEvents.length).to.be.greaterThan(0);
      });
  });
});
