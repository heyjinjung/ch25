describe("v2 auth + dice smoke", () => {
  it("dev login then dice play", () => {
    cy.request("POST", "http://localhost:8000/api/v2/dev/login", {
      external_id: "dev_web_user",
      nickname: "Web Dev User",
      create_if_missing: true,
    }).then((resp) => {
      expect(resp.status).to.eq(200);
      const token = resp.body?.access_token;
      expect(token).to.be.a("string");

      cy.request({
        method: "POST",
        url: "http://localhost:8000/api/v2/dice/play",
        headers: { Authorization: `Bearer ${token}` },
        body: { bet_amount: 1, prediction: "HIGH" },
      }).then((diceResp) => {
        expect(diceResp.status).to.eq(200);
        expect(diceResp.body).to.have.property("result");
      });
    });

    cy.visit("about:blank");
    cy.screenshot("v2_auth_dice_smoke");
  });
});
