/// <reference types="cypress" />

const activeSurveys = {
  items: [
    {
      id: 101,
      title: "Holiday Survey",
      description: "연말 피드백 설문",
      channel: "GLOBAL",
      status: "ACTIVE",
      reward_json: { reward_type: "TICKET_DICE", amount: 1, toast_message: "주사위 티켓 지급" },
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
    description: "연말 피드백 설문",
    channel: "GLOBAL",
    status: "ACTIVE",
    reward_json: { reward_type: "TICKET_DICE", amount: 1, toast_message: "주사위 티켓 지급" },
    questions: [
      {
        id: 201,
        order_index: 1,
        question_type: "SINGLE_CHOICE",
        title: "어떤 보상을 선호하나요?",
        helper_text: "중복 선택 불가",
        is_required: true,
        config_json: null,
        options: [
          { id: 301, value: "token", label: "토큰", order_index: 1, weight: 1 },
          { id: 302, value: "coupon", label: "쿠폰", order_index: 2, weight: 1 },
        ],
      },
    ],
  },
  answers: [],
};

const setAuthStorage = (win: Window) => {
  win.localStorage.setItem("xmas_auth_version", "v2");
  win.localStorage.setItem("xmas_access_token", "cypress-token");
  win.localStorage.setItem("token", "cypress-token");
  win.localStorage.setItem("xmas_user", JSON.stringify({ id: 1, external_id: "cypress" }));
};

describe("Survey prompt and resume flow", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/api/surveys/active", activeSurveys).as("getActiveSurveys");
  });

  it("surfaces pending survey, fires toast, and completes without backend", () => {
    cy.intercept("POST", "**/api/surveys/101/responses", surveySession).as("createSurveySession");

    cy.intercept("PATCH", "**/api/surveys/101/responses/555", (req) => {
      req.reply({ ...surveySession, answers: [{ question_id: 201, option_id: 301 }] });
    }).as("saveSurveyAnswers");

    cy.intercept("POST", "**/api/surveys/101/responses/555/complete", {
      response: { ...surveySession.response, status: "COMPLETED", reward_status: "GRANTED" },
      reward_applied: true,
      toast_message: "주사위 티켓 지급",
    }).as("completeSurvey");

    cy.visit("/home", { onBeforeLoad: setAuthStorage });
    cy.wait("@getActiveSurveys");

    cy.contains("Holiday Survey").should("be.visible");
    cy.contains("설문을 이어서 진행하세요").should("be.visible");

    cy.contains("참여하기").click();
    cy.wait("@createSurveySession");

    cy.contains("어떤 보상을 선호하나요?").should("be.visible");
    cy.contains("label", "토큰").click();

    cy.contains("제출하고 보상 받기").click();
    cy.wait("@saveSurveyAnswers");
    cy.wait("@completeSurvey");

    cy.contains("주사위 티켓 지급").should("be.visible");
    cy.url().should("include", "/surveys");
  });
});
