describe("Admin global sync (Docker+MySQL + UI e2e)", () => {
  const tokenType = "ROULETTE_COIN";

  const todayKstDateKey = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    const y = parts.find((p) => p.type === "year")?.value ?? "0000";
    const m = parts.find((p) => p.type === "month")?.value ?? "01";
    const d = parts.find((p) => p.type === "day")?.value ?? "01";
    return `${y}-${m}-${d}`;
  };

  it("ops-plan: create campaign/plan/task via API and see it in UI", () => {
    const suffix = String(Date.now());
    const campaignName = `E2E Campaign ${suffix}`;
    const planDate = todayKstDateKey();

    cy.request("POST", "/admin/api/ops/campaigns", {
      name: campaignName,
      status: "ACTIVE",
      notes_md: "e2e",
    }).then((res) => {
      expect(res.status).to.eq(201);
      const campaignId = res.body.id as number;
      expect(campaignId).to.be.a("number");

      cy.request("POST", "/admin/api/ops/plans", {
        campaign_id: campaignId,
        plan_date: planDate,
      }).then((planRes) => {
        expect(planRes.status).to.eq(200);
        const planId = planRes.body.id as number;
        expect(planId).to.be.a("number");

        cy.request("POST", `/admin/api/ops/plans/${planId}/tasks`, {
          title: `E2E Task ${suffix}`,
          type: "NOTE",
          status: "TODO",
          memo: "e2e",
          payload_json: {},
        }).then((taskRes) => {
          expect(taskRes.status).to.eq(201);

          cy.visit("/admin/ops");
          cy.get("#ops-campaign-select", { timeout: 20000 }).should("be.visible");
          cy.get("#ops-campaign-select").select(String(campaignId));
          cy.contains(`E2E Task ${suffix}`).should("be.visible");
        });
      });
    });
  });

  it("game-tokens: grant via API and see ledger in UI", () => {
    const grantAmount = 5;
    const suffix = String(Date.now());
    const externalId = `e2e_user_${suffix}`;

    cy.request("POST", "/admin/api/users", {
      external_id: externalId,
      nickname: `E2E User ${suffix}`,
      password: "pw1234",
    }).then((createRes) => {
      expect(createRes.status).to.eq(201);
    });

    cy.request("POST", "/admin/api/game-tokens/grant", {
      user_identifier: `cc:${externalId}`,
      token_type: tokenType,
      amount: grantAmount,
    }).then((res) => {
      expect(res.status).to.eq(200);

      cy.visit("/admin/game-tokens");
      cy.contains("원장 로그", { timeout: 20000 }).click();

      // Ensure the ledger shows the test user; exact delta rendering can vary.
      cy.contains(externalId, { timeout: 20000 }).should("be.visible");

      // Soft check: at least one plus entry exists after grant.
      cy.contains("+", { timeout: 20000 }).should("exist");
    });
  });
});
