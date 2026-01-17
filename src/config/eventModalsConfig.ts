export const EVENT_MODAL_KEYS = [
  "streak",
  "golden-hour",
  "vip-promo",
  "vip-eligibility",
  "new-user",
  "starter-missions",
  "inbox",
  "vault-info",
  "withdrawal-conditions",
  "withdrawal-progress",
  "lottery-collection",
  "limited-offer",
  "season-pass",
  "ticket-zero",
] as const;

export type ModalKey = (typeof EVENT_MODAL_KEYS)[number];

export type EventModalSectionConfig = {
  id: string;
  title: string;
  subtitle: string;
  order: number;
  enabled?: boolean;
};

export type EventModalCardConfig = {
  key: ModalKey;
  title: string;
  description: string;
  badge?: string;
  sectionId: string;
  order: number;
  enabled?: boolean;
};

export type EventModalsConfig = {
  version: 1;
  title: string;
  subtitle: string;
  kicker: string;
  note: string;
  sections: EventModalSectionConfig[];
  cards: EventModalCardConfig[];
};

export const DEFAULT_EVENT_MODALS_CONFIG: EventModalsConfig = {
  version: 1,
  title: "이벤트모음",
  subtitle: "내 이벤트 모달을 한 번에 확인하고 즉시 실행하세요.",
  kicker: "Event Hub",
  note: "카드 클릭 시 모달이 바로 열리며 실제 기능 흐름이 실행됩니다.",
  sections: [
    { id: "active", title: "진행 중 이벤트", subtitle: "지금 참여 가능한 핵심 이벤트 모음", order: 0, enabled: true },
    { id: "onboarding", title: "계정 & 온보딩", subtitle: "신규 사용자와 성장 단계 이벤트", order: 1, enabled: true },
    { id: "vault", title: "금고 & 출금", subtitle: "금고 적립/출금 관련 이벤트 모음", order: 2, enabled: true },
    { id: "rewards", title: "보상 & 컬렉션", subtitle: "미니게임 보상과 컬렉션 이벤트", order: 3, enabled: true },
    { id: "promotions", title: "프로모션 모음", subtitle: "테마별 프로모션/한정 이벤트", order: 4, enabled: true },
    { id: "inbox", title: "알림 & 메시지", subtitle: "내 소식함과 이벤트 알림", order: 5, enabled: true },
  ],
  cards: [
    {
      key: "streak",
      title: "출석 스트릭",
      description: "연속 출석 보상과 데일리 체크인을 한 번에 확인하세요.",
      sectionId: "active",
      order: 0,
      enabled: true,
    },
    {
      key: "golden-hour",
      title: "골든아워",
      description: "한정 시간 동안 금고 적립 배율이 상승합니다.",
      sectionId: "active",
      order: 1,
      enabled: true,
    },
    {
      key: "vip-promo",
      title: "VIP 프로모션",
      description: "VIP 대상 전용 혜택 및 리워드를 확인하세요.",
      badge: "PREMIUM",
      sectionId: "active",
      order: 3,
      enabled: true,
    },
    {
      key: "vip-eligibility",
      title: "VIP 자격 안내",
      description: "VIP 조건과 특별 혜택 기준을 상세히 확인합니다.",
      badge: "INFO",
      sectionId: "active",
      order: 4,
      enabled: true,
    },
    {
      key: "new-user",
      title: "신규 유저 웰컴",
      description: "첫 참여 유저 대상 보상과 안내를 제공합니다.",
      badge: "NEW",
      sectionId: "onboarding",
      order: 0,
      enabled: true,
    },
    {
      key: "starter-missions",
      title: "스타터 미션",
      description: "튜토리얼 미션을 완료하고 초기 보상을 획득하세요.",
      badge: "START",
      sectionId: "onboarding",
      order: 1,
      enabled: true,
    },
    {
      key: "vault-info",
      title: "금고 안내",
      description: "금고 프로그램, 락 조건, 안내 카피를 확인합니다.",
      badge: "GUIDE",
      sectionId: "vault",
      order: 0,
      enabled: true,
    },
    {
      key: "withdrawal-conditions",
      title: "출금 조건",
      description: "출금 요건과 일일 조건을 확인합니다.",
      badge: "CHECK",
      sectionId: "vault",
      order: 1,
      enabled: true,
    },
    {
      key: "withdrawal-progress",
      title: "출금 진행도",
      description: "현재 출금 진행 상태를 실시간으로 보여줍니다.",
      badge: "STATUS",
      sectionId: "vault",
      order: 2,
      enabled: true,
    },
    {
      key: "ticket-zero",
      title: "티켓 제로 리텐션",
      description: "티켓이 없을 때 빠르게 복귀할 수 있도록 지원합니다.",
      badge: "RECOVER",
      sectionId: "vault",
      order: 3,
      enabled: true,
    },
    {
      key: "lottery-collection",
      title: "로또 컬렉션",
      description: "퍼즐 조각 수집 현황과 교환 이벤트를 확인합니다.",
      badge: "COLLECT",
      sectionId: "rewards",
      order: 1,
      enabled: true,
    },
    {
      key: "limited-offer",
      title: "한정 오퍼 (준비중)",
      description: "기간 한정 패키지와 빠른 이동을 제공합니다.",
      badge: "SOON",
      sectionId: "promotions",
      order: 0,
      enabled: true,
    },
    {
      key: "season-pass",
      title: "시즌패스 프로모션",
      description: "시즌패스 혜택과 업그레이드를 안내합니다.",
      badge: "PASS",
      sectionId: "promotions",
      order: 1,
      enabled: true,
    },
    {
      key: "inbox",
      title: "알림함",
      description: "운영 공지, 혜택 알림, 이벤트 메시지를 확인하세요.",
      badge: "NEW",
      sectionId: "inbox",
      order: 0,
      enabled: true,
    },
  ],
};

export const isModalKey = (value: unknown): value is ModalKey =>
  typeof value === "string" && (EVENT_MODAL_KEYS as readonly string[]).includes(value);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const normalizeSection = (
  raw: Record<string, unknown>,
  fallback: EventModalSectionConfig
): EventModalSectionConfig => ({
  id: typeof raw.id === "string" ? raw.id : fallback.id,
  title: typeof raw.title === "string" && raw.title.trim() ? raw.title : fallback.title,
  subtitle: typeof raw.subtitle === "string" ? raw.subtitle : fallback.subtitle,
  order: Number.isFinite(raw.order) ? Number(raw.order) : fallback.order,
  enabled: typeof raw.enabled === "boolean" ? raw.enabled : fallback.enabled,
});

const normalizeCard = (
  raw: Record<string, unknown>,
  fallback: EventModalCardConfig
): EventModalCardConfig => ({
  key: fallback.key,
  title: typeof raw.title === "string" && raw.title.trim() ? raw.title : fallback.title,
  description: typeof raw.description === "string" ? raw.description : fallback.description,
  badge: typeof raw.badge === "string" ? raw.badge : fallback.badge,
  sectionId: typeof raw.sectionId === "string" ? raw.sectionId : fallback.sectionId,
  order: Number.isFinite(raw.order) ? Number(raw.order) : fallback.order,
  enabled: typeof raw.enabled === "boolean" ? raw.enabled : fallback.enabled,
});

export const mergeEventModalsConfig = (raw: unknown): EventModalsConfig => {
  if (!isPlainObject(raw)) return DEFAULT_EVENT_MODALS_CONFIG;
  const value = raw as Partial<EventModalsConfig>;

  const title = typeof value.title === "string" && value.title.trim() ? value.title : DEFAULT_EVENT_MODALS_CONFIG.title;
  const subtitle =
    typeof value.subtitle === "string" && value.subtitle.trim()
      ? value.subtitle
      : DEFAULT_EVENT_MODALS_CONFIG.subtitle;
  const kicker = typeof value.kicker === "string" && value.kicker.trim() ? value.kicker : DEFAULT_EVENT_MODALS_CONFIG.kicker;
  const note = typeof value.note === "string" ? value.note : DEFAULT_EVENT_MODALS_CONFIG.note;

  const baseSections = DEFAULT_EVENT_MODALS_CONFIG.sections;
  const sectionMap = new Map(baseSections.map((section) => [section.id, section]));
  let sections = baseSections;
  if (Array.isArray(value.sections)) {
    const normalized = value.sections
      .filter((section) => isPlainObject(section) && typeof section.id === "string")
      .map((section) => {
        const fallback = sectionMap.get(String(section.id)) ?? {
          id: String(section.id),
          title: String(section.id),
          subtitle: "",
          order: baseSections.length + 1,
          enabled: true,
        };
        return normalizeSection(section as Record<string, unknown>, fallback);
      });

    const existing = new Set(normalized.map((section) => section.id));
    baseSections.forEach((section) => {
      if (!existing.has(section.id)) normalized.push(section);
    });
    sections = normalized;
  }

  const baseCards = DEFAULT_EVENT_MODALS_CONFIG.cards;
  const cardMap = new Map(baseCards.map((card) => [card.key, card]));
  let cards = baseCards;
  if (Array.isArray(value.cards)) {
    const normalized = value.cards
      .filter((card) => isPlainObject(card) && isModalKey(card.key))
      .map((card) => {
        const fallback = cardMap.get(card.key as ModalKey);
        if (!fallback) {
          return null;
        }
        return normalizeCard(card as Record<string, unknown>, fallback);
      })
      .filter((card): card is EventModalCardConfig => card !== null);

    const existing = new Set(normalized.map((card) => card.key));
    baseCards.forEach((card) => {
      if (!existing.has(card.key)) normalized.push(card);
    });
    cards = normalized;
  }

  return {
    version: 1,
    title,
    subtitle,
    kicker,
    note,
    sections,
    cards,
  };
};
