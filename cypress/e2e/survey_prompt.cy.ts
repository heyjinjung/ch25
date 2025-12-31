/// <reference types="cypress" />

const activeSurveys = {
  items: [
    {
      id: 101,
      title: "Holiday Survey",
      description: "Seasonal survey",
      channel: "GLOBAL",
      status: "ACTIVE",
      reward_json: { reward_type: "TICKET_DICE", amount: 1, toast_message: "Granted: Dice Ticket" },
      pending_response_id: 555,
    },
  ],
};

const surveySession = {
  response: {
    id: 555,
    survey_id: 101,
    status: "PENDING",
    reward_status: "NONE",
    last_question_id: null,
    started_at: null,
    completed_at: null,
  },
  survey: {
    id: 101,
    title: "Holiday Survey",
    description: "Seasonal survey",
    channel: "GLOBAL",
    status: "ACTIVE",
    reward_json: { reward_type: "TICKET_DICE", amount: 1, toast_message: "Granted: Dice Ticket" },
    questions: [
      {
        id: 201,
        order_index: 1,
        question_type: "SINGLE_CHOICE",
        title: "Which reward do you prefer?",
        helper_text: "Choose one",
        is_required: true,
        config_json: null,
        options: [
          { id: 301, value: "token", label: "Token", order_index: 1, weight: 1 },
          { id: 302, value: "coupon", label: "Coupon", order_index: 2, weight: 1 },
        ],
      },
    ],
  },
  answers: [],
};

const setAuthStorage = (win: Window) => {
  win.localStorage.setItem("xmas_auth_version", "v3");
  win.localStorage.setItem("xmas_access_token", "cypress-token");
  win.localStorage.setItem("token", "cypress-token");
  win.localStorage.setItem("xmas_user", JSON.stringify({ id: 1, external_id: "cypress" }));
};

describe("Survey prompt and resume flow", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/api/surveys/active", activeSurveys).as("getActiveSurveys");
  });

  it("surfaces survey list and completes without backend", () => {
    cy.intercept("POST", "**/api/surveys/101/responses", surveySession).as("createSurveySession");

    cy.intercept("PATCH", "**/api/surveys/101/responses/555", (req) => {
      req.reply({ ...surveySession, answers: [{ question_id: 201, option_id: 301 }] });
    }).as("saveSurveyAnswers");

    cy.intercept("POST", "**/api/surveys/101/responses/555/complete", {
      response: { ...surveySession.response, status: "COMPLETED", reward_status: "GRANTED" },
      reward_applied: true,
      toast_message: "Granted: Dice Ticket",
    }).as("completeSurvey");

    cy.visit("/surveys", { onBeforeLoad: setAuthStorage });
    cy.wait("@getActiveSurveys");

    cy.contains("Holiday Survey").should("be.visible");

    cy.contains("article", "Holiday Survey").within(() => {
      cy.get("button").click();
    });
    cy.wait("@createSurveySession");

    cy.contains("Which reward do you prefer?").should("be.visible");
    cy.contains("label", "Token").click();

    cy.get("button.bg-emerald-500").click();
    cy.wait("@saveSurveyAnswers");
    cy.wait("@completeSurvey");

    cy.contains("Granted: Dice Ticket").should("be.visible");
    cy.url().should("include", "/surveys");
  });
});

