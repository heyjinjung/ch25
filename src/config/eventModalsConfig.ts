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
  title: "?´ë²¤?¸ëª¨??,
  subtitle: "???´ë²¤??ëª¨ë‹¬????ë²ˆì— ?•ì¸?˜ê³  ì¦‰ì‹œ ?¤í–‰?˜ì„¸??",
  kicker: "Event Hub",
  note: "ì¹´ë“œ ?´ë¦­ ??ëª¨ë‹¬??ë°”ë¡œ ?´ë¦¬ë©??¤ì œ ê¸°ëŠ¥ ?ë¦„???¤í–‰?©ë‹ˆ??",
  sections: [
    { id: "active", title: "ì§„í–‰ ì¤??´ë²¤??, subtitle: "ì§€ê¸?ì°¸ì—¬ ê°€?¥í•œ ?µì‹¬ ?´ë²¤??ëª¨ìŒ", order: 0, enabled: true },
    { id: "onboarding", title: "ê³„ì • & ?¨ë³´??, subtitle: "? ê·œ ?¬ìš©?ì? ?±ìž¥ ?¨ê³„ ?´ë²¤??, order: 1, enabled: true },
    { id: "vault", title: "ê¸ˆê³  & ì¶œê¸ˆ", subtitle: "ê¸ˆê³  ?ë¦½/ì¶œê¸ˆ ê´€???´ë²¤??ëª¨ìŒ", order: 2, enabled: true },
    { id: "rewards", title: "ë³´ìƒ & ì»¬ë ‰??, subtitle: "ë¯¸ë‹ˆê²Œìž„ ë³´ìƒê³?ì»¬ë ‰???´ë²¤??, order: 3, enabled: true },
    { id: "promotions", title: "?„ë¡œëª¨ì…˜ ëª¨ìŒ", subtitle: "?Œë§ˆë³??„ë¡œëª¨ì…˜/?œì • ?´ë²¤??, order: 4, enabled: true },
    { id: "inbox", title: "?Œë¦¼ & ë©”ì‹œì§€", subtitle: "???Œì‹?¨ê³¼ ?´ë²¤???Œë¦¼", order: 5, enabled: true },
  ],
  cards: [
    {
      key: "streak",
      title: "ì¶œì„ ?¤íŠ¸ë¦?,
      description: "?°ì† ì¶œì„ ë³´ìƒê³??°ì¼ë¦?ì²´í¬?¸ì„ ??ë²ˆì— ?•ì¸?˜ì„¸??",
      sectionId: "active",
      order: 0,
      enabled: true,
    },
    {
      key: "golden-hour",
      title: "ê³¨ë“ ?„ì›Œ",
      description: "?œì • ?œê°„ ?™ì•ˆ ê¸ˆê³  ?ë¦½ ë°°ìœ¨???ìŠ¹?©ë‹ˆ??",
      sectionId: "active",
      order: 1,
      enabled: true,
    },
    {
      key: "vip-promo",
      title: "VIP ?„ë¡œëª¨ì…˜",
      description: "VIP ?€???„ìš© ?œíƒ ë°?ë¦¬ì›Œ?œë? ?•ì¸?˜ì„¸??",
      badge: "PREMIUM",
      sectionId: "active",
      order: 3,
      enabled: true,
    },
    {
      key: "vip-eligibility",
      title: "VIP ?ê²© ?ˆë‚´",
      description: "VIP ì¡°ê±´ê³??¹ë³„ ?œíƒ ê¸°ì????ì„¸???•ì¸?©ë‹ˆ??",
      badge: "INFO",
      sectionId: "active",
      order: 4,
      enabled: true,
    },
    {
      key: "new-user",
      title: "? ê·œ ? ì? ?°ì»´",
      description: "ì²?ì°¸ì—¬ ? ì? ?€??ë³´ìƒê³??ˆë‚´ë¥??œê³µ?©ë‹ˆ??",
      badge: "NEW",
      sectionId: "onboarding",
      order: 0,
      enabled: true,
    },
    {
      key: "starter-missions",
      title: "?¤í???ë¯¸ì…˜",
      description: "?œí† ë¦¬ì–¼ ë¯¸ì…˜???„ë£Œ?˜ê³  ì´ˆê¸° ë³´ìƒ???ë“?˜ì„¸??",
      badge: "START",
      sectionId: "onboarding",
      order: 1,
      enabled: true,
    },
    {
      key: "vault-info",
      title: "ê¸ˆê³  ?ˆë‚´",
      description: "ê¸ˆê³  ?„ë¡œê·¸ëž¨, ??ì¡°ê±´, ?ˆë‚´ ì¹´í”¼ë¥??•ì¸?©ë‹ˆ??",
      badge: "GUIDE",
      sectionId: "vault",
      order: 0,
      enabled: true,
    },
    {
      key: "withdrawal-conditions",
      title: "ì¶œê¸ˆ ì¡°ê±´",
      description: "ì¶œê¸ˆ ?”ê±´ê³??¼ì¼ ì¡°ê±´???•ì¸?©ë‹ˆ??",
      badge: "CHECK",
      sectionId: "vault",
      order: 1,
      enabled: true,
    },
    {
      key: "withdrawal-progress",
      title: "ì¶œê¸ˆ ì§„í–‰??,
      description: "?„ìž¬ ì¶œê¸ˆ ì§„í–‰ ?íƒœë¥??¤ì‹œê°„ìœ¼ë¡?ë³´ì—¬ì¤ë‹ˆ??",
      badge: "STATUS",
      sectionId: "vault",
      order: 2,
      enabled: false,
    },
    {
      key: "ticket-zero",
      title: "?°ì¼“???†ì„??",
      description: "?°ì¼“???†ì„ ??ë¹ ë¥´ê²?ë³µê??????ˆë„ë¡?ì§€?í•©?ˆë‹¤.",
      badge: "RECOVER",
      sectionId: "vault",
      order: 3,
      enabled: true,
    },
    {
      key: "lottery-collection",
      title: "ë¡œë˜ ì»¬ë ‰??,
      description: "?¼ì¦ ì¡°ê° ?˜ì§‘ ?„í™©ê³?êµí™˜ ?´ë²¤?¸ë? ?•ì¸?©ë‹ˆ??",
      badge: "COLLECT",
      sectionId: "rewards",
      order: 1,
      enabled: true,
    },
    {
      key: "limited-offer",
      title: "?œì • ?¤í¼ (ì¤€ë¹„ì¤‘)",
      description: "ê¸°ê°„ ?œì • ?¨í‚¤ì§€?€ ë¹ ë¥¸ ?´ë™???œê³µ?©ë‹ˆ??",
      badge: "SOON",
      sectionId: "promotions",
      order: 0,
      enabled: true,
    },
    {
      key: "season-pass",
      title: "?œì¦Œ?¨ìŠ¤ ?„ë¡œëª¨ì…˜",
      description: "?œì¦Œ?¨ìŠ¤ ?œíƒê³??…ê·¸?ˆì´?œë? ?ˆë‚´?©ë‹ˆ??",
      badge: "PASS",
      sectionId: "promotions",
      order: 1,
      enabled: true,
    },
    {
      key: "inbox",
      title: "?Œë¦¼??,
      description: "?´ì˜ ê³µì?, ?œíƒ ?Œë¦¼, ?´ë²¤??ë©”ì‹œì§€ë¥??•ì¸?˜ì„¸??",
      badge: "NEW",
      sectionId: "inbox",
      order: 0,
      enabled: false,
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
