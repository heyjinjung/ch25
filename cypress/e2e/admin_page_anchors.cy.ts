// cypress/e2e/admin_page_anchors.cy.ts

type AnchorCheck =
  | { kind: "contains"; selector: string; text: RegExp }
  | { kind: "selector"; selector: string };

type PageCheck = {
  path: string;
  sidebarSlug?: string;
  anchor: AnchorCheck;
};

const PAGES: PageCheck[] = [
  {
    path: "/admin",
    sidebarSlug: "dashboard",
    anchor: {
      kind: "contains",
      selector: ".admin-page-container",
      text: /운영\s*지표\s*요약|Current\s*Season/i,
    },
  },
  {
    path: "/admin/marketing",
    sidebarSlug: "marketing",
    anchor: { kind: "contains", selector: ".admin-page-container", text: /마케팅\s*센터|Marketing/i },
  },
  {
    path: "/admin/ops",
    sidebarSlug: "ops",
    anchor: { kind: "contains", selector: ".admin-page-container", text: /운영계획|Playbook/i },
  },
  {
    path: "/admin/ops/logs",
    anchor: { kind: "contains", selector: ".admin-page-container", text: /운영\s*기록\s*감시|Ops\s*Log/i },
  },
  {
    path: "/admin/vault",
    sidebarSlug: "vault",
    anchor: { kind: "contains", selector: ".admin-page-container", text: /금고\s*자산\s*관리|금고|Vault/i },
  },
  {
    path: "/admin/users",
    sidebarSlug: "users",
    anchor: { kind: "contains", selector: ".admin-page-container", text: /회원\s*관리|User\s*Admin/i },
  },
  {
    path: "/admin/game-tokens",
    sidebarSlug: "game-tokens",
    anchor: { kind: "contains", selector: ".admin-page-container", text: /코인|티켓|COIN|TICKET/i },
  },
  {
    path: "/admin/missions",
    sidebarSlug: "missions",
    anchor: { kind: "contains", selector: ".admin-page-container", text: /미션\s*관리|미션/i },
  },
  {
    path: "/admin/seasons",
    sidebarSlug: "seasons",
    anchor: { kind: "contains", selector: ".admin-page-container", text: /시즌\s*관리|Season/i },
  },
  {
    path: "/admin/shop",
    sidebarSlug: "shop",
    anchor: { kind: "contains", selector: ".admin-page-container", text: /상점\s*상품\s*설정|상점|Shop/i },
  },
  {
    path: "/admin/user-segments",
    sidebarSlug: "user-segments",
    anchor: { kind: "contains", selector: ".admin-page-container", text: /세그먼트\s*관리|세그먼트/i },
  },
  {
    path: "/admin/surveys",
    sidebarSlug: "surveys",
    anchor: { kind: "contains", selector: ".admin-page-container", text: /설문\s*관리|설문/i },
  },
  {
    path: "/admin/surveys/new",
    anchor: { kind: "contains", selector: ".admin-page-container", text: /새\s*설문\s*생성|설문\s*수정|Survey\s*Editor/i },
  },
  {
    path: "/admin/external-ranking",
    sidebarSlug: "external-ranking",
    anchor: { kind: "contains", selector: ".admin-page-container", text: /외부\s*랜킹|랭킹/i },
  },
  {
    path: "/admin/messages",
    sidebarSlug: "messages",
    anchor: { kind: "contains", selector: ".admin-page-container", text: /메시지\s*센터|메시지/i },
  },
  {
    path: "/admin/team-battle",
    sidebarSlug: "team-battle",
    anchor: { kind: "contains", selector: ".admin-page-container", text: /팀\s*배틀|BATTLE/i },
  },
  {
    path: "/admin/streak-rewards",
    sidebarSlug: "streak-rewards",
    anchor: { kind: "contains", selector: ".admin-page-container", text: /스트릭|보상/i },
  },
  {
    path: "/admin/roulette",
    sidebarSlug: "roulette",
    anchor: { kind: "contains", selector: ".admin-page-container", text: /룰렛|ROULETTE/i },
  },
  {
    path: "/admin/dice",
    sidebarSlug: "dice",
    anchor: { kind: "contains", selector: ".admin-page-container", text: /주사위|DICE/i },
  },
  {
    path: "/admin/lottery",
    sidebarSlug: "lottery",
    anchor: { kind: "contains", selector: ".admin-page-container", text: /복권|LOTTERY/i },
  },
  {
    path: "/admin/ui-config",
    sidebarSlug: "ui-config",
    anchor: { kind: "contains", selector: ".admin-page-container", text: /UI\s*문구|CTA|UI/i },
  },
  {
    path: "/admin/segment-rules",
    anchor: { kind: "contains", selector: ".admin-page-container", text: /세그먼트\s*규칙|세그먼트/i },
  },
  {
    path: "/admin/system-health",
    anchor: { kind: "contains", selector: ".admin-page-container", text: /시스템\s*상태|System\s*Health/i },
  },
  {
    path: "/admin/reward-types",
    // NOTE: 이 페이지는 현재 인코딩 깨짐(모지바케) 흔적이 있어도 '보상' 텍스트는 남아있음.
    anchor: { kind: "contains", selector: ".admin-page-container", text: /보상|Reward/i },
  },
  {
    path: "/admin/games",
    anchor: { kind: "contains", selector: ".admin-page-container", text: /게임\s*허브|게임/i },
  },
  {
    path: "/admin/features",
    anchor: { kind: "contains", selector: ".admin-page-container", text: /이벤트\s*일정|국가\s*관리/i },
  },
  {
    path: "/admin/config",
    anchor: { kind: "contains", selector: ".admin-page-container", text: /시스템\s*전역\s*설정|전역\s*설정/i },
  },
];

describe("admin page anchors", () => {
  it("renders a stable anchor per page", () => {
    cy.viewport(1280, 800);

    cy.visit("/admin");
    cy.location("pathname").should("not.include", "/admin/login");

    for (const page of PAGES) {
      if (page.sidebarSlug) {
        cy.get(`[data-testid="admin-nav:${page.sidebarSlug}"]`).should("be.visible").click();
      } else {
        cy.visit(page.path);
      }

      cy.location("pathname").should("eq", page.path);
      cy.location("pathname").should("not.include", "/admin/login");

      cy.get(".admin-page-container").should("be.visible");

      if (page.anchor.kind === "contains") {
        cy.contains(page.anchor.selector, page.anchor.text).should("be.visible");
      } else {
        cy.get(page.anchor.selector).should("be.visible");
      }
    }
  });
});
