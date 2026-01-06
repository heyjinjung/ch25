export type RewardLine = {
  text: string;
  fulfillmentHint?: string;
};

const BRAND_LABEL_OVERRIDES: Record<string, string> = {
  BAEMIN: "배민",
  COMPOSE: "컴포즈",
  MEGA: "메가",
  STARBUCKS: "스타벅스",
  TWOSOME: "투썸",
  GIFTICON: "기프티콘",
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
      brand: brand || "기프티콘",
      faceValue: Number.isFinite(faceValue) ? faceValue : null,
      raw,
    };
  }

  // Fallback for any *GIFTICON* string
  return {
    brand: "기프티콘",
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
    if (gifticon.brand && gifticon.brand !== "기프티콘") labelParts.push(gifticon.brand);

    const faceValue = gifticon.faceValue;
    const valueText = Number.isFinite(faceValue) && (faceValue ?? 0) > 0
      ? `${(faceValue as number).toLocaleString()}원`
      : safeAmount > 0
        ? `${safeAmount.toLocaleString()}원`
        : "";

    const inner = [labelParts.join(" "), valueText].filter(Boolean).join(" ");

    return {
      text: inner ? `기프티콘(${inner})` : "기프티콘",
      fulfillmentHint: "지급대기/보상함",
    };
  }

  const upper = type.toUpperCase();

  if (upper === "POINT" || upper === "CC_POINT") {
    if (safeAmount <= 0) return { text: "금고 적립" };
    return { text: `금고 적립 ${safeAmount.toLocaleString()}원` };
  }

  if (upper === "GAME_XP") {
    if (safeAmount <= 0) return { text: "시즌 XP" };
    return { text: `시즌 XP +${safeAmount.toLocaleString()}` };
  }

  if (upper === "DIAMOND") {
    if (safeAmount <= 0) return { text: "다이아" };
    return { text: `다이아 +${safeAmount.toLocaleString()}` };
  }

  const ticketLabels: Record<string, string> = {
    TICKET_ROULETTE: "룰렛 티켓",
    ROULETTE_TICKET: "룰렛 티켓",
    TICKET_DICE: "주사위 티켓",
    DICE_TICKET: "주사위 티켓",
    TICKET_LOTTERY: "복권 티켓",
    LOTTERY_TICKET: "복권 티켓",
  };

  if (ticketLabels[upper]) {
    if (safeAmount <= 0) return { text: ticketLabels[upper] };
    return { text: `${ticketLabels[upper]} ${safeAmount.toLocaleString()}장` };
  }

  const keyLabels: Record<string, string> = {
    GOLD_KEY: "골드 키",
    DIAMOND_KEY: "다이아 키",
  };

  if (keyLabels[upper]) {
    if (safeAmount <= 0) return { text: keyLabels[upper] };
    return { text: `${keyLabels[upper]} ${safeAmount.toLocaleString()}개` };
  }

  if (safeAmount > 0) {
    return { text: `${type} ${safeAmount.toLocaleString()}` };
  }

  return { text: type };
};
