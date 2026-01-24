export type RewardLine = {
  text: string;
  fulfillmentHint?: string;
};

const BRAND_LABEL_OVERRIDES: Record<string, string> = {
  BAEMIN: "배�?",
  COMPOSE: "컴포�?,
  MEGA: "메�?",
  STARBUCKS: "?��?벅스",
  TWOSOME: "?�썸",
  GIFTICON: "기프?�콘",
};

const normalizeBrandLabel = (raw: string) => {
  const key = String(raw || "").trim();
  if (!key) return "";
  return BRAND_LABEL_OVERRIDES[key.toUpperCase()] ?? key;
};

export const parseGifticonRewardType = (rewardType?: string | null) => {
  const raw = String(rewardType ?? "").trim();
  if (!raw) return null;

  const upper = raw.toUpperCase();
  if (!upper.includes("GIFTICON")) return null;

  // Examples:
  // - CC_COIN_GIFTICON
  // - BAEMIN_GIFTICON_5000
  // - COMPOSE_GIFTICON_4500
  const match = /^([A-Z0-9]+)_GIFTICON(?:_(\d+))?$/i.exec(raw);
  if (match) {
    const brand = normalizeBrandLabel(match[1]);
    const faceValue = match[2] ? Number(match[2]) : null;
    return {
      brand: brand || "기프?�콘",
      faceValue: Number.isFinite(faceValue) ? faceValue : null,
      raw,
    };
  }

  // Fallback for any *GIFTICON* string
  return {
    brand: "기프?�콘",
    faceValue: null,
    raw,
  };
};

export const isGifticonRewardType = (rewardType?: string | null) => {
  return !!parseGifticonRewardType(rewardType);
};

export const formatRewardLine = (rewardType?: string | null, amount?: number | null): RewardLine | null => {
  const type = String(rewardType ?? "").trim();
  if (!type) return null;

  const safeAmount = Number(amount ?? 0);

  const gifticon = parseGifticonRewardType(type);
  if (gifticon) {
    const labelParts: string[] = [];
    if (gifticon.brand && gifticon.brand !== "기프?�콘") labelParts.push(gifticon.brand);

    const faceValue = gifticon.faceValue;
    const valueText = Number.isFinite(faceValue) && (faceValue ?? 0) > 0
      ? `${(faceValue as number).toLocaleString()}??
      : safeAmount > 0
        ? `${safeAmount.toLocaleString()}??
        : "";

    const inner = [labelParts.join(" "), valueText].filter(Boolean).join(" ");

    return {
      text: inner ? `기프?�콘(${inner})` : "기프?�콘",
      fulfillmentHint: "지급�?�?보상??,
    };
  }

  const upper = type.toUpperCase();

  if (upper === "POINT" || upper === "CC_POINT") {
    if (safeAmount <= 0) return { text: "금고 ?�립" };
    return { text: `금고 ?�립 ${safeAmount.toLocaleString()}?? };
  }

  if (upper === "GAME_XP") {
    if (safeAmount <= 0) return { text: "?�즌 XP" };
    return { text: `?�즌 XP +${safeAmount.toLocaleString()}` };
  }

  if (upper === "DIAMOND") {
    if (safeAmount <= 0) return { text: "?�이?? };
    return { text: `?�이??+${safeAmount.toLocaleString()}` };
  }

  const ticketLabels: Record<string, string> = {
    TICKET_ROULETTE: "룰렛 ?�켓",
    ROULETTE_TICKET: "룰렛 ?�켓",
    TICKET_DICE: "주사???�켓",
    DICE_TICKET: "주사???�켓",
    TICKET_LOTTERY: "복권 ?�켓",
    LOTTERY_TICKET: "복권 ?�켓",
  };

  if (ticketLabels[upper]) {
    if (safeAmount <= 0) return { text: ticketLabels[upper] };
    return { text: `${ticketLabels[upper]} ${safeAmount.toLocaleString()}?? };
  }

  const keyLabels: Record<string, string> = {
    GOLD_KEY: "골드 ??,
    DIAMOND_KEY: "?�이????,
  };

  if (keyLabels[upper]) {
    if (safeAmount <= 0) return { text: keyLabels[upper] };
    return { text: `${keyLabels[upper]} ${safeAmount.toLocaleString()}�? };
  }

  if (safeAmount > 0) {
    return { text: `${type} ${safeAmount.toLocaleString()}` };
  }

  return { text: type };
};
