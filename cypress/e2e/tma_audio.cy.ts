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
    cy.intercept("POST", "**/api/telegram/auth", {
      access_token: "cypress-access-token",
      token_type: "bearer",
      is_new_user: false,
      linked_to_existing: false,
      user: { id: 1, external_id: "tg_cypress", nickname: "Cypress", status: "ACTIVE", level: 1, telegram_id: 123456789 },
    }).as("telegramAuth");

    cy.intercept("GET", "**/api/new-user/status", {
      eligible: false,
      reason: "EXTERNAL_DEPOSIT_HISTORY",
      is_new_user_window_active: true,
      window_ends_at_utc: null,
      seconds_left: null,
      telegram_linked: true,
      existing_member_by_external_deposit: true,
      deposit_amount: 1,
      total_play_count: 0,
      bonus_cap: 10000,
      progress: {
        deposit_confirmed: true,
        play_1: false,
        play_3: false,
        share_or_join: false,
        next_day_login: false,
      },
    }).as("newUserStatus");

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

    // Some layouts fetch surveys; keep it deterministic.
    cy.intercept("GET", "**/api/surveys/active", { items: [] }).as("activeSurveys");
  });

  it("records audio events on entry and tab click", () => {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.setItem("sound_muted", "false");
        (win as any).__e2eSoundEvents = [];
        mockTelegramWebApp(win);
      },
    });

    cy.wait("@telegramAuth");
    cy.wait("@newUserStatus");

    cy.url().should("include", "/landing");

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

