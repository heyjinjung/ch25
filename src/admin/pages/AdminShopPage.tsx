import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, RefreshCw, Package, Ticket, Gift, Check, X, Plus, Trash2, Search, Edit2 } from "lucide-react";
import { useToast } from "../../components/common/ToastProvider";
import { fetchAdminShopOverrides, fetchAdminShopProducts, ShopProductsOverrides, upsertAdminShopOverrides, AdminShopProduct } from "../api/adminShopApi";
import { fetchEconomyStats } from "../api/adminEconomyApi";
import { fetchRewardTypes } from "../api/adminRewardTypesApi";

// ============================================================
// ?쒓? ?쇰꺼 ?곸닔 (?섎뱶肄붾뵫 ?쒓굅)
// ============================================================
const LABELS = {
  currency: "?ㅼ씠??,
  active: "?쒖꽦",
  inactive: "鍮꾪솢??,
  loading: "?곸젏 ?ㅼ젙??遺덈윭?ㅻ뒗 以?..",
  error: "?곸젏 ?곹뭹??遺덈윭?ㅼ? 紐삵뻽?듬땲??",
  noData: "?곗씠???놁쓬",
  save: "?꾩껜 ???,
  refresh: "?덈줈怨좎묠",
  priceHeader: "媛寃?(?ㅼ씠??",
  grantHeader: "吏湲?,
  statusHeader: "?곹깭",
  productName: "?곹뭹紐?,
} as const;

// ============================================================
// DB 媛????쒓? 留ㅽ븨 (item_type, reason, scope ??
// ============================================================
const ITEM_TYPE_LABELS: Record<string, string> = {
  // Fallbacks for types not in the standard Reward API
  TICKET_FREE: "臾대즺 ?곗폆",
  TICKET_PREMIUM: "?꾨━誘몄뾼 ?곗폆",
  PREMIUM_KEY: "?꾨━誘몄뾼 ??,
  VOUCHER: "諛붿슦泥?,
  GIFTCON: "湲고봽?곗퐯",
  GIFTICON: "湲고봽?곗퐯",
};

const COST_TOKEN_LABELS: Record<string, string> = {
  DIAMOND: "?ㅼ씠??,
  VAULT: "湲덇퀬(Vault)",
  ROULETTE_COIN: "猷곕젢 肄붿씤",
  DICE_TOKEN: "二쇱궗???좏겙",
  LOTTERY_TICKET: "蹂듦텒 ?곗폆",
  TRIAL_TOKEN: "泥댄뿕 ?좏겙",
  GOLD_KEY: "怨⑤뱶 ??,
  DIAMOND_KEY: "?ㅼ씠????,
};

const toSelectOptions = (m: Record<string, string>) =>
  Object.entries(m)
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "ko"));

const COST_TOKEN_OPTIONS = toSelectOptions(COST_TOKEN_LABELS);
const AMOUNT_OPTIONS = [1, 2, 3, 5, 10, 20, 50, 100];

const GIFTICON_BRAND_LABELS: Record<string, string> = {
  BAEMIN: "諛곕?",
  CC_COIN: "?⑥뵪肄붿씤",
};

const formatGifticonItemType = (itemType: string): string | null => {
  const withAmount = itemType.match(/^(.+)_GIFTICON_(\d+)$/);
  if (withAmount) {
    const rawBrand = withAmount[1];
    const amount = Number(withAmount[2]);
    const brand = GIFTICON_BRAND_LABELS[rawBrand] ?? rawBrand;
    const amountLabel = Number.isFinite(amount) ? `${amount.toLocaleString()}?? : withAmount[2];
    return `${brand} 湲고봽?곗퐯 ${amountLabel}`;
  }

  const withoutAmount = itemType.match(/^(.+)_GIFTICON$/);
  if (withoutAmount) {
    const rawBrand = withoutAmount[1];
    const brand = GIFTICON_BRAND_LABELS[rawBrand] ?? rawBrand;
    return `${brand} 湲고봽?곗퐯`;
  }

  return null;
};

const SKU_TOKEN_LABELS: Record<string, string> = {
  PROD: "?곹뭹",
  SHOP: "?곸젏",
  TICKET: "?곗폆",
  FREE: "臾대즺",
  PREMIUM: "?꾨━誘몄뾼",
  KEY: "??,
  DIAMOND: "?ㅼ씠??,
  GOLD: "怨⑤뱶",
  ROULETTE: "猷곕젢",
  DICE: "二쇱궗??,
  LOTTERY: "蹂듦텒",
  VOUCHER: "諛붿슦泥?,
  GIFTICON: "湲고봽?곗퐯",
};

const formatSkuLabel = (sku: string): string => {
  const tokens = sku
    .split(/[_-]/g)
    .filter(Boolean)
    .map((t) => SKU_TOKEN_LABELS[t] ?? t);
  const joined = tokens.join(" ").trim();
  return joined || sku;
};

const formatDateYYYYMMDD = (d: Date): string => {
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
};

const sanitizeSkuToken = (raw: string): string => {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
};

const buildAutoSku = (params: {
  costToken: string;
  itemType: string;
  costAmount: number;
  itemAmount: number;
  date?: Date;
}): string => {
  const date = params.date ?? new Date();
  const costToken = sanitizeSkuToken(params.costToken || "DIAMOND");
  const itemType = sanitizeSkuToken(params.itemType || "ITEM");
  const costAmount = Math.max(0, Math.floor(Number(params.costAmount) || 0));
  const itemAmount = Math.max(0, Math.floor(Number(params.itemAmount) || 0));
  const ymd = formatDateYYYYMMDD(date);
  return `SHOP_${costToken}_${itemType}_${costAmount}_X${itemAmount}_${ymd}`;
};

// reason ?⑦꽩 ???쒓? ?쇰꺼
const formatReason = (reason: string, skuTitleMap?: Record<string, string>): string => {
  if (reason.startsWith("SHOP_PURCHASE:")) {
    const sku = reason.replace("SHOP_PURCHASE:", "");
    const title = skuTitleMap?.[sku];
    if (title) return `?곸젏 援щℓ: ${title}`;
    return `?곸젏 援щℓ: ${formatSkuLabel(sku)}`;
  }
  if (reason.startsWith("ADMIN_GRANT")) return "愿由ъ옄 吏湲?;
  if (reason.startsWith("ADMIN_REVOKE")) return "愿由ъ옄 ?뚯닔";
  if (reason.startsWith("GAME_REWARD")) return "寃뚯엫 蹂댁긽";
  if (reason.startsWith("MISSION_REWARD")) return "誘몄뀡 蹂댁긽";
  if (reason.startsWith("USE_VOUCHER")) return "諛붿슦泥??ъ슜";
  if (reason.startsWith("STREAK_REWARD")) return "?곗냽 異쒖꽍 蹂댁긽";
  return reason; // 留ㅽ븨 ?놁쑝硫??먮낯
};

// scope ???쒓? ?쇰꺼
const SCOPE_LABELS: Record<string, string> = {
  shop_purchase: "?곸젏 援щℓ",
  game_play: "寃뚯엫 ?뚮젅??,
  mission_claim: "誘몄뀡 蹂댁긽 ?섎졊",
  streak_claim: "?곗냽 異쒖꽍 ?섎졊",
  vault_unlock: "湲덇퀬 ?댁젣",
  admin_grant: "愿由ъ옄 吏湲?,
};

const formatScope = (scope: string): string => SCOPE_LABELS[scope] ?? scope;

// item_type ???쒓? ?쇰꺼
const formatItemType = (itemType: string, rewardMap?: Record<string, string>): string => {
  if (!itemType) return itemType;
  return formatGifticonItemType(itemType) ?? rewardMap?.[itemType] ?? ITEM_TYPE_LABELS[itemType] ?? itemType;
};

// item_type 湲곕컲 ?숈쟻 洹몃９???ㅼ젙 (?섎뱶肄붾뵫 PROD_TICKET_ ?쒓굅)
const GROUP_CONFIG: Record<string, { label: string; description: string; icon: React.ReactNode }> = {
  TICKET: { label: "?곗폆 ?곹뭹", description: "寃뚯엫 李몄뿬???곗폆 ?곹뭹?낅땲??", icon: <Ticket size={18} className="text-admin-brand" /> },
  KEY: { label: "?꾨━誘몄뾼 ??, description: "?밸퀎 肄섑뀗痢??닿툑?????곹뭹?낅땲??", icon: <Gift size={18} className="text-admin-accent" /> },
  DEFAULT: { label: "湲고? ?곹뭹", description: "?쇰컲 ?곹뭹?낅땲??", icon: <Package size={18} className="text-admin-text-secondary" /> },
};

// item_type?먯꽌 洹몃９ ??異붿텧 (?숈쟻 留ㅽ븨)
const getGroupKey = (itemType: string): string => {
  if (itemType.includes("TICKET")) return "TICKET";
  if (itemType.includes("KEY")) return "KEY";
  return "DEFAULT";
};

type RowState = {
  sku: string;
  title: string;
  cost_token: string;
  cost_amount: number;
  item_type: string;
  item_amount: number;
  is_active: boolean;
};

type ProductFormModalProps = {
  mode: "create" | "edit";
  sku?: string;
  initialData: RowState | null;
  rewardTypeOptions: Array<{ value: string; label: string }>;
  reservedSkuSet: Set<string>;
  addToast: (message: string, type: any) => void;
  onSubmit: (row: RowState) => void;
  onClose: () => void;
};

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  mode,
  sku,
  initialData,
  rewardTypeOptions,
  reservedSkuSet,
  addToast,
  onSubmit,
  onClose,
}) => {
  const isEdit = mode === "edit";

  const [formSku, setFormSku] = useState(sku || "");
  const [formTitle, setFormTitle] = useState(initialData?.title || "");
  const [formCostToken, setFormCostToken] = useState(initialData?.cost_token || "DIAMOND");
  const [formCostAmount, setFormCostAmount] = useState(initialData?.cost_amount || 1);
  const [formItemType, setFormItemType] = useState(initialData?.item_type || "");
  const [formItemAmount, setFormItemAmount] = useState(initialData?.item_amount || 1);
  const [formIsActive, setFormIsActive] = useState(initialData?.is_active ?? true);
  const [keepAdding, setKeepAdding] = useState<boolean>(mode === "create");

  const localReservedSkusRef = React.useRef<Set<string>>(new Set());
  const isReserved = React.useCallback(
    (candidate: string) => reservedSkuSet.has(candidate) || localReservedSkusRef.current.has(candidate),
    [reservedSkuSet]
  );

  // ?대┃ 吏곸쟾 蹂寃쎄컪源뚯? 諛섏쁺?섍린 ?꾪빐 理쒖떊 ?낅젰媛믪쓣 ref濡?蹂닿?
  const latestSkuParamsRef = React.useRef({
    costToken: initialData?.cost_token || "DIAMOND",
    costAmount: Number(initialData?.cost_amount || 1),
    itemType: initialData?.item_type || "",
    itemAmount: Number(initialData?.item_amount || 1),
  });

  const handleAutoGenerateSku = React.useCallback(() => {
    const latest = latestSkuParamsRef.current;
    if (!String(latest.itemType || "").trim()) {
      addToast("吏湲??꾩씠?쒖쓣 癒쇱? ?좏깮?섏꽭??", "error");
      return;
    }
    const base = buildAutoSku({
      costToken: latest.costToken,
      itemType: latest.itemType,
      costAmount: latest.costAmount,
      itemAmount: latest.itemAmount,
    });

    let candidate = base;
    let version = 2;
    while (isReserved(candidate)) {
      candidate = `${base}_V${version}`;
      version += 1;
      if (version > 99) break;
    }

    setFormSku(candidate);
    addToast(`SKU ?먮룞 ?앹꽦: ${candidate}`, "success");
  }, [addToast, isReserved]);

  const [itemTypeMode, setItemTypeMode] = useState<"select" | "custom">(
    isEdit && !rewardTypeOptions.some((o) => o.value === initialData?.item_type) ? "custom" : "select"
  );
  const [costAmountMode, setCostAmountMode] = useState<"select" | "custom">(
    initialData?.cost_amount && !AMOUNT_OPTIONS.includes(initialData?.cost_amount) ? "custom" : "select"
  );
  const [itemAmountMode, setItemAmountMode] = useState<"select" | "custom">(
    initialData?.item_amount && !AMOUNT_OPTIONS.includes(initialData?.item_amount) ? "custom" : "select"
  );

  const handleSubmit = () => {
    const trimmedSku = formSku.trim();
    const trimmedTitle = formTitle.trim();
    if (!trimmedSku) {
      addToast("?곹뭹肄붾뱶瑜??낅젰?섏꽭??", "error");
      return;
    }
    if (!trimmedTitle) {
      addToast("?곹뭹紐낆쓣 ?낅젰?섏꽭??", "error");
      return;
    }
    if (!formItemType) {
      addToast("吏湲??꾩씠?쒖쓣 ?좏깮?섏꽭??", "error");
      return;
    }
    if (!isEdit && isReserved(trimmedSku)) {
      addToast("?대? 議댁옱?섎뒗 SKU?낅땲??", "error");
      return;
    }

    onSubmit({
      sku: trimmedSku,
      title: trimmedTitle,
      cost_token: formCostToken,
      cost_amount: formCostAmount,
      item_type: formItemType,
      item_amount: formItemAmount,
      is_active: formIsActive,
    });

    addToast(isEdit ? "?섏젙?섏뿀?듬땲??" : "異붽??섏뿀?듬땲??", "success");

    if (isEdit || !keepAdding) {
      onClose();
      return;
    }

    // 怨꾩냽 異붽?: ?좏깮媛??좎? + ??댄?留?珥덇린??+ SKU???덈줈 ?앹꽦
    localReservedSkusRef.current.add(trimmedSku);
    setFormTitle("");
    setFormSku("");
    handleAutoGenerateSku();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#1e1e24] w-full max-w-lg rounded-2xl border border-white/5 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">{isEdit ? "?곹뭹 ?섏젙" : "???곹뭹 異붽?"}</h2>
            <p className="text-xs text-zinc-500 uppercase font-black tracking-widest">
              {isEdit ? "Update Product Details" : "Create New Item"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-all text-zinc-500 hover:text-white"
            aria-label="?リ린"
            title="?リ린"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* ?곹뭹 肄붾뱶 */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-zinc-500 uppercase tracking-wider ml-1">?곹뭹肄붾뱶 (SKU)</label>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-admin-brand/50 transition-all disabled:opacity-50 font-mono"
                value={formSku}
                onChange={(e) => !isEdit && setFormSku(e.target.value)}
                disabled={isEdit}
                placeholder="SHOP_VAULT_VOUCHER_ROULETTE_COIN_1_3000_X5_20260114"
              />
              {!isEdit && (
                <button
                  type="button"
                  onClick={handleAutoGenerateSku}
                  className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs font-black text-white/80 hover:bg-white/10"
                  title="?낅젰媛?湲곕컲?쇰줈 SKU ?먮룞 ?앹꽦"
                >
                  ?먮룞 ?앹꽦
                </button>
              )}
            </div>
            {!isEdit && (
              <p className="text-[11px] text-white/35">
                寃곗젣 ?좏겙/吏湲??꾩씠??媛寃??섎웾 湲곗??쇰줈 ?앹꽦?섎ŉ, 以묐났?대㈃ <span className="font-mono">_V2</span> 媛숈? suffix媛 遺숈뒿?덈떎.
              </p>
            )}
          </div>

          {/* ?곹뭹紐?*/}
          <div className="space-y-2">
            <label className="block text-xs font-black text-zinc-500 uppercase tracking-wider ml-1">?곹뭹紐?(Title)</label>
            <input
              className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-admin-brand/50 transition-all"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="?? ?ㅼ씠??10媛??곹뭹"
            />
          </div>

          {/* 媛寃??ㅼ젙 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-black text-zinc-500 uppercase tracking-wider ml-1">寃곗젣 ?좏겙</label>
              <select
                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-admin-brand/50 transition-all appearance-none"
                value={formCostToken}
                onChange={(e) => {
                  const next = e.target.value;
                  latestSkuParamsRef.current.costToken = next;
                  setFormCostToken(next);
                }}
              >
                {COST_TOKEN_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-zinc-900">
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-black text-zinc-500 uppercase tracking-wider ml-1">媛寃?(Amount)</label>
              <div className="flex flex-col gap-2">
                <select
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-admin-brand/50 transition-all appearance-none"
                  value={costAmountMode === "custom" ? "__CUSTOM__" : formCostAmount}
                  onChange={(e) => {
                    if (e.target.value === "__CUSTOM__") setCostAmountMode("custom");
                    else {
                      const next = Number(e.target.value);
                      latestSkuParamsRef.current.costAmount = next;
                      setCostAmountMode("select");
                      setFormCostAmount(next);
                    }
                  }}
                >
                  {AMOUNT_OPTIONS.map((n) => (
                    <option key={n} value={n} className="bg-zinc-900">
                      {n.toLocaleString()}
                    </option>
                  ))}
                  <option value="__CUSTOM__" className="bg-zinc-900">
                    吏곸젒 ?낅젰
                  </option>
                </select>
                {costAmountMode === "custom" && (
                  <input
                    type="number"
                    className="w-full bg-black/20 border border-admin-brand/30 rounded-xl px-4 py-2 text-sm text-white animate-in slide-in-from-top-1 duration-200"
                    value={formCostAmount}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      latestSkuParamsRef.current.costAmount = next;
                      setFormCostAmount(next);
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* 吏湲??꾩씠???ㅼ젙 */}
          <div className="p-6 bg-admin-brand/5 rounded-2xl border border-admin-brand/10 space-y-4">
            <div className="flex items-center gap-2 text-admin-brand mb-2">
              <Gift size={14} className="animate-bounce" />
              <span className="text-xs font-black uppercase tracking-widest">吏湲?蹂댁긽 (Reward)</span>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-admin-brand/60 uppercase tracking-wider">?꾩씠??醫낅쪟</label>
              <select
                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-admin-brand/50 transition-all appearance-none"
                value={itemTypeMode === "custom" ? "__CUSTOM__" : formItemType}
                onChange={(e) => {
                  if (e.target.value === "__CUSTOM__") setItemTypeMode("custom");
                  else {
                    const next = e.target.value;
                    latestSkuParamsRef.current.itemType = next;
                    setItemTypeMode("select");
                    setFormItemType(next);
                  }
                }}
              >
                <option value="" className="bg-zinc-900">
                  ?좏깮?섏꽭??
                </option>
                {rewardTypeOptions.map((o) => (
                  <option key={o.value} value={o.value} className="bg-zinc-900">
                    {o.label}
                  </option>
                ))}
                <option value="__CUSTOM__" className="bg-zinc-900">
                  吏곸젒 ?낅젰
                </option>
              </select>
              {itemTypeMode === "custom" && (
                <input
                  className="w-full bg-black/20 border border-admin-brand/30 rounded-xl px-4 py-2 text-sm text-white mt-2"
                  value={formItemType}
                  onChange={(e) => {
                    const next = e.target.value;
                    latestSkuParamsRef.current.itemType = next;
                    setFormItemType(next);
                  }}
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-admin-brand/60 uppercase tracking-wider">?섎웾 (Quantity)</label>
              <div className="flex flex-col gap-2">
                <select
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-admin-brand/50 transition-all appearance-none"
                  value={itemAmountMode === "custom" ? "__CUSTOM__" : formItemAmount}
                  onChange={(e) => {
                    if (e.target.value === "__CUSTOM__") setItemAmountMode("custom");
                    else {
                      const next = Number(e.target.value);
                      latestSkuParamsRef.current.itemAmount = next;
                      setItemAmountMode("select");
                      setFormItemAmount(next);
                    }
                  }}
                >
                  {AMOUNT_OPTIONS.map((n) => (
                    <option key={n} value={n} className="bg-zinc-900">
                      {n}
                    </option>
                  ))}
                  <option value="__CUSTOM__" className="bg-zinc-900">
                    吏곸젒 ?낅젰
                  </option>
                </select>
                {itemAmountMode === "custom" && (
                  <input
                    type="number"
                    className="w-full bg-black/20 border border-admin-brand/30 rounded-xl px-4 py-2 text-sm text-white"
                    value={formItemAmount}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      latestSkuParamsRef.current.itemAmount = next;
                      setFormItemAmount(next);
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* ?쒖꽦 ?곹깭 */}
          <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-white">?먮ℓ ?쒖꽦??/span>
              <span className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">ACTIVE STATUS</span>
            </div>
            <button
              type="button"
              onClick={() => setFormIsActive((v) => !v)}
              aria-label="?먮ℓ ?쒖꽦???좉?"
              title={formIsActive ? "鍮꾪솢?깆쑝濡??꾪솚" : "?쒖꽦?쇰줈 ?꾪솚"}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${formIsActive ? "bg-admin-brand" : "bg-zinc-700"
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition duration-300 ${formIsActive ? "translate-x-6" : "translate-x-1"
                  }`}
              />
            </button>
          </div>
        </div>

        <div className="p-6 bg-white/5 border-t border-white/5 flex items-center gap-4">
          {mode === "create" && (
            <button
              type="button"
              onClick={() => setKeepAdding((v) => !v)}
              className={`h-12 px-4 rounded-xl border text-sm font-bold transition-all ${keepAdding
                ? "bg-admin-brand/10 border-admin-brand/30 text-white"
                : "bg-zinc-900/20 border-white/10 text-white/70 hover:bg-white/5"
                }`}
              title="異붽? ??紐⑤떖???レ? ?딄퀬 怨꾩냽 ?앹꽦"
            >
              怨꾩냽 異붽?: {keepAdding ? "ON" : "OFF"}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 h-12 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-white transition-all uppercase tracking-widest"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 h-12 rounded-xl bg-admin-brand hover:brightness-110 text-sm font-bold text-white transition-all shadow-lg shadow-admin-brand/20 uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <Check size={18} /> {isEdit ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
};

export const AdminShopPage: React.FC = () => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ["admin", "shop", "products"],
    queryFn: fetchAdminShopProducts,
    staleTime: 5 * 60 * 1000,
  });

  const overridesQuery = useQuery({
    queryKey: ["admin", "shop", "overrides"],
    queryFn: fetchAdminShopOverrides,
    staleTime: 5 * 60 * 1000,
  });

  const statsQuery = useQuery({
    queryKey: ["admin", "economy", "stats"],
    queryFn: fetchEconomyStats,
    staleTime: 60 * 1000,
  });

  const rewardTypesQuery = useQuery({
    queryKey: ["admin", "reward-types"],
    queryFn: fetchRewardTypes,
    staleTime: 30 * 60 * 1000,
  });

  const rewardTypeOptions = useMemo(() => {
    const list = rewardTypesQuery.data ?? [];
    const fromApi = list.map(rt => ({ value: rt.key, label: rt.display_name }));
    const fromFallbacks = Object.entries(ITEM_TYPE_LABELS).map(([value, label]) => ({ value, label }));
    const combined = [...fromApi, ...fromFallbacks];

    // Sort and Deduplicate
    return combined
      .filter((item, index, self) => index === self.findIndex(t => t.value === item.value))
      .sort((a, b) => a.label.localeCompare(b.label, "ko"));
  }, [rewardTypesQuery.data]);

  const rewardTypeMap = useMemo(() => {
    const map: Record<string, string> = {};
    rewardTypesQuery.data?.forEach(rt => { map[rt.key] = rt.display_name; });
    Object.entries(ITEM_TYPE_LABELS).forEach(([k, v]) => { if (!map[k]) map[k] = v; });
    return map;
  }, [rewardTypesQuery.data]);

  const initialRows = useMemo(() => {
    const products = productsQuery.data ?? [];
    return new Map<string, RowState>(
      products.map((p) => [
        p.sku,
        {
          sku: p.sku,
          title: p.title,
          cost_token: String(p.cost?.token ?? "DIAMOND"),
          cost_amount: Number(p.cost?.amount ?? 0),
          item_type: String(p.grant?.item_type ?? ""),
          item_amount: Number(p.grant?.amount ?? 0),
          is_active: p.is_active !== false,
        },
      ])
    );
  }, [productsQuery.data]);

  const [rows, setRows] = useState<Map<string, RowState>>(new Map());
  const [deletedSkus, setDeletedSkus] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);

  React.useEffect(() => {
    setRows(new Map(initialRows));
    setDeletedSkus(new Set());
  }, [initialRows]);

  const saveMutation = useMutation({
    mutationFn: (value: ShopProductsOverrides) => upsertAdminShopOverrides(value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "shop", "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "shop", "overrides"] });
      setDeletedSkus(new Set());
      addToast("?곸젏 ?ㅼ젙????λ릺?덉뒿?덈떎.", "success");
    },
    onError: (err: Error & { response?: { data?: { detail?: string } } }) => {
      addToast(`????ㅽ뙣: ${err.response?.data?.detail || err.message}`, "error");
    },
  });

  const effectiveProducts: AdminShopProduct[] = useMemo(() => {
    const fromServer = (productsQuery.data ?? []).filter((p) => !deletedSkus.has(p.sku));
    const known = new Set(fromServer.map((p) => p.sku));

    const drafts: AdminShopProduct[] = [];
    for (const [sku, r] of rows.entries()) {
      if (known.has(sku)) continue;
      if (deletedSkus.has(sku)) continue;
      drafts.push({
        sku,
        title: r.title,
        cost: { token: r.cost_token, amount: r.cost_amount },
        grant: { item_type: r.item_type, amount: r.item_amount },
        is_active: r.is_active,
        source: "custom",
      });
    }

    return [...fromServer, ...drafts];
  }, [productsQuery.data, rows, deletedSkus]);

  const skuTitleMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of effectiveProducts) {
      const sku = p.sku;
      const title = rows.get(sku)?.title ?? p.title;
      if (title) map[sku] = title;
    }
    return map;
  }, [effectiveProducts, rows]);

  const changedCount = useMemo(() => {
    let count = 0;
    const serverSkus = new Set((productsQuery.data ?? []).map(p => p.sku));

    for (const p of effectiveProducts) {
      const r = rows.get(p.sku);
      if (!r) continue;

      // New draft products (not from server) always count as "changed"
      if (!serverSkus.has(p.sku)) {
        count += 1;
        continue;
      }

      const baseTitle = p.title;
      const baseToken = String(p.cost?.token ?? "DIAMOND");
      const baseCost = Number(p.cost?.amount ?? 0);
      const baseItemType = String(p.grant?.item_type ?? "");
      const baseItemAmount = Number(p.grant?.amount ?? 0);
      const baseActive = p.is_active !== false;
      if (
        r.title !== baseTitle ||
        r.cost_token !== baseToken ||
        r.cost_amount !== baseCost ||
        r.item_type !== baseItemType ||
        r.item_amount !== baseItemAmount ||
        r.is_active !== baseActive
      )
        count += 1;
    }

    // Also count deleted items
    count += deletedSkus.size;

    return count;
  }, [effectiveProducts, rows, productsQuery.data, deletedSkus]);

  const buildOverrides = (): ShopProductsOverrides => {
    const products: Record<
      string,
      { title: string; cost_token: string; cost_amount: number; item_type: string; item_amount: number; is_active: boolean }
    > = {};
    for (const p of effectiveProducts) {
      const r = rows.get(p.sku);
      if (!r) continue;
      products[p.sku] = {
        title: r.title,
        cost_token: r.cost_token,
        cost_amount: r.cost_amount,
        item_type: r.item_type,
        item_amount: r.item_amount,
        is_active: r.is_active,
      };
    }
    return { products, deleted_skus: Array.from(deletedSkus) };
  };

  const handleSaveAll = () => {
    saveMutation.mutate(buildOverrides());
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "shop", "products"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "economy", "stats"] });
  };

  const handleEditProduct = (sku: string) => {
    setEditingSku(sku);
  };

  const filteredProducts = useMemo(() => {
    const all = effectiveProducts;
    if (!searchTerm.trim()) return all;
    const lower = searchTerm.toLowerCase();
    return all.filter(p =>
      p.sku.toLowerCase().includes(lower) ||
      p.title.toLowerCase().includes(lower) ||
      (rows.get(p.sku)?.title.toLowerCase().includes(lower))
    );
  }, [effectiveProducts, searchTerm, rows]);

  // item_type 湲곕컲 ?숈쟻 洹몃９??(?섎뱶肄붾뵫 ?쒓굅)
  const groupedProducts = useMemo(() => {
    const groups: Record<string, AdminShopProduct[]> = {};
    for (const p of filteredProducts) {
      const groupKey = getGroupKey(p.grant?.item_type ?? "");
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(p);
    }
    return groups;
  }, [filteredProducts]);

  // ?뚯씠釉????뚮뜑留??⑥닔 (?붿빟 酉?
  const renderProductRow = (p: AdminShopProduct) => {
    const r = rows.get(p.sku);
    if (!r) return null;

    const isChanged = (() => {
      const baseTitle = p.title;
      const baseToken = String(p.cost?.token ?? "DIAMOND");
      const baseCost = Number(p.cost?.amount ?? 0);
      const baseItemType = String(p.grant?.item_type ?? "");
      const baseItemAmount = Number(p.grant?.amount ?? 0);
      const baseActive = p.is_active !== false;
      return (
        r.title !== baseTitle ||
        r.cost_token !== baseToken ||
        r.cost_amount !== baseCost ||
        r.item_type !== baseItemType ||
        r.item_amount !== baseItemAmount ||
        r.is_active !== baseActive
      );
    })();

    const canDelete = p.source === "custom";

    return (
      <tr key={p.sku} className={`admin-tr group transition-all hover:bg-white/5 ${isChanged ? "bg-admin-brand/5 border-l-2 border-l-admin-brand" : ""}`}>
        <td className="admin-td py-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold text-admin-text-primary">{r.title}</span>
            <span className="text-[11px] text-admin-text-muted font-mono tracking-tighter uppercase">{p.sku}</span>
          </div>
        </td>
        <td className="admin-td py-4">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black text-admin-brand">
              {r.cost_amount.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-admin-text-secondary">
              {COST_TOKEN_LABELS[r.cost_token] || r.cost_token}
            </span>
          </div>
        </td>
        <td className="admin-td py-4">
          <div className="flex items-center gap-2">
            <Gift size={14} className="text-admin-brand/60" />
            <span className="text-sm font-bold text-zinc-200">
              {formatItemType(r.item_type, rewardTypeMap)}
            </span>
            <span className="text-xs font-black text-admin-brand bg-admin-brand/10 px-1.5 py-0.5 rounded">
              {r.item_amount.toLocaleString()}
            </span>
          </div>
        </td>
        <td className="admin-td py-4">
          <div className={`
            inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider
            ${r.is_active ? "bg-admin-accent/10 text-admin-accent border border-admin-accent/20" : "bg-admin-danger/10 text-admin-danger border border-admin-danger/20"}
          `}>
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${r.is_active ? "bg-admin-accent" : "bg-admin-danger"}`} />
            {r.is_active ? "ACTIVE" : "INACTIVE"}
          </div>
        </td>
        <td className="admin-td text-right">
          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => handleEditProduct(p.sku)}
              className="p-2 rounded-lg bg-admin-sidebar hover:bg-admin-hover text-admin-text-secondary hover:text-admin-brand transition-colors"
              title="?몄쭛"
            >
              <Edit2 size={16} />
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => {
                  setRows((prev) => {
                    const next = new Map(prev);
                    next.delete(p.sku);
                    return next;
                  });
                  setDeletedSkus((prev) => {
                    const next = new Set(prev);
                    next.add(p.sku);
                    return next;
                  });
                  addToast("??젣 ?덉빟?? ?????諛섏쁺?⑸땲??", "success");
                }}
                className="p-2 rounded-lg bg-admin-sidebar hover:bg-admin-danger/10 text-admin-text-secondary hover:text-admin-danger transition-colors"
                title="??젣"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  // ============================================================
  // 紐⑤떖?먯꽌 SKU 以묐났 泥댄겕???ъ슜
  const reservedSkuSet = useMemo(() => {
    const set = new Set<string>();
    for (const p of effectiveProducts) set.add(p.sku);
    for (const key of rows.keys()) set.add(key);
    for (const key of deletedSkus) set.add(key);
    return set;
  }, [effectiveProducts, rows, deletedSkus]);


  // 濡쒕뵫/?먮윭 ?곹깭
  const isLoading = productsQuery.isLoading || overridesQuery.isLoading || rewardTypesQuery.isLoading;
  if (isLoading) {
    return <div className="admin-page-container text-admin-text-secondary">{LABELS.loading}</div>;
  }
  if (productsQuery.error) {
    return <div className="admin-page-container text-admin-danger">{LABELS.error}</div>;
  }

  return (
    <div className="admin-page-container">
      {/* ?ㅻ뜑 ?뱀뀡 */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-admin-text-base tracking-tight uppercase">
            ?곸젏 愿由?<span className="text-admin-brand/40">Shop Admin</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-muted" size={14} />
            <input
              className="admin-input pl-10 w-64 h-10 text-sm"
              placeholder="?곹뭹紐??먮뒗 SKU 寃??
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button type="button" onClick={() => setIsAddingNew(true)} className="btn-admin-secondary h-10 px-4 flex items-center gap-2">
            <Plus size={14} /> ?곹뭹 異붽?
          </button>
          <button type="button" onClick={handleRefresh} className="btn-admin-secondary h-10 px-4 flex items-center gap-2">
            <RefreshCw size={14} /> {LABELS.refresh}
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saveMutation.isPending || changedCount === 0}
            className="btn-admin-primary h-10 px-4 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={14} /> {LABELS.save}
            {changedCount > 0 ? ` (${changedCount})` : ""}
          </button>
        </div>
      </header>

      {/* 湲곗〈 ?곷떒 Add Form ?쒓굅??(紐⑤떖濡??泥??덉젙) */}

      {/* ?숈쟻 洹몃９蹂??뚯씠釉?(item_type 湲곕컲) */}
      {Object.entries(groupedProducts).map(([groupKey, products]) => {
        const config = GROUP_CONFIG[groupKey] ?? GROUP_CONFIG.DEFAULT;
        return (
          <section key={groupKey} className="space-y-3">
            <div className="flex items-center gap-2">
              {config.icon}
              <div>
                <h2 className="text-lg font-semibold text-admin-text-primary">{config.label}</h2>
                <p className="text-sm text-admin-text-secondary">{config.description}</p>
              </div>
              <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium bg-admin-sidebar text-admin-text-muted">
                {products.length}媛?
              </span>
            </div>

            <div className="admin-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th className="admin-th w-[300px] text-sm font-bold text-zinc-500 uppercase tracking-wider">?곹뭹 ?뺣낫 (Product Info)</th>
                      <th className="admin-th w-[140px] text-sm font-bold text-zinc-500 uppercase tracking-wider">媛寃?(Price)</th>
                      <th className="admin-th w-[200px] text-sm font-bold text-zinc-500 uppercase tracking-wider">吏湲??댁슜 (Grants)</th>
                      <th className="admin-th w-[120px] text-sm font-bold text-zinc-500 uppercase tracking-wider">?곹깭 (Status)</th>
                      <th className="admin-th w-[100px] text-sm font-bold text-zinc-500 uppercase tracking-wider text-right">愿由?(Actions)</th>
                    </tr>
                  </thead>
                  <tbody>{products.map(renderProductRow)}</tbody>
                </table>
              </div>
            </div>
          </section>
        );
      })}

      {/* ?듦퀎 移대뱶 ?뱀뀡 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="admin-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-admin-text-primary">理쒓렐 援щℓ (?먯옣 湲곕컲)</h3>
            {statsQuery.isLoading && <RefreshCw size={14} className="animate-spin text-admin-text-muted" />}
          </div>
          <div className="space-y-2">
            {statsQuery.isLoading ? (
              <div className="text-sm text-admin-text-muted">{LABELS.loading}</div>
            ) : statsQuery.error ? (
              <div className="text-sm text-admin-danger">遺덈윭?ㅺ린 ?ㅽ뙣</div>
            ) : (statsQuery.data?.shop_purchases ?? []).length === 0 ? (
              <div className="text-sm text-admin-text-muted">{LABELS.noData}</div>
            ) : (
              (statsQuery.data?.shop_purchases ?? []).slice(0, 6).map((r) => (
                <div key={r.reason} className="flex justify-between items-center text-sm">
                  <span className="text-admin-text-secondary truncate max-w-[160px]" title={r.reason}>
                    {formatReason(r.reason, skuTitleMap)}
                  </span>
                  <span className="text-admin-text-primary font-medium">{r.count}嫄?/span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="admin-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-admin-text-primary">諛붿슦泥??ъ슜</h3>
            {statsQuery.isLoading && <RefreshCw size={14} className="animate-spin text-admin-text-muted" />}
          </div>
          <div className="space-y-2">
            {statsQuery.isLoading ? (
              <div className="text-sm text-admin-text-muted">{LABELS.loading}</div>
            ) : statsQuery.error ? (
              <div className="text-sm text-admin-danger">遺덈윭?ㅺ린 ?ㅽ뙣</div>
            ) : (statsQuery.data?.voucher_uses ?? []).length === 0 ? (
              <div className="text-sm text-admin-text-muted">{LABELS.noData}</div>
            ) : (
              (statsQuery.data?.voucher_uses ?? []).slice(0, 6).map((r) => (
                <div key={r.item_type} className="flex justify-between items-center text-sm">
                  <span className="text-admin-text-secondary truncate max-w-[160px]" title={r.item_type}>
                    {formatItemType(r.item_type, rewardTypeMap)}
                  </span>
                  <span className="text-admin-text-primary font-medium">{r.count}嫄?/span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="admin-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-admin-text-primary">硫깅벑???곹깭</h3>
            {statsQuery.isLoading && <RefreshCw size={14} className="animate-spin text-admin-text-muted" />}
          </div>
          <div className="space-y-2">
            {statsQuery.isLoading ? (
              <div className="text-sm text-admin-text-muted">{LABELS.loading}</div>
            ) : statsQuery.error ? (
              <div className="text-sm text-admin-danger">遺덈윭?ㅺ린 ?ㅽ뙣</div>
            ) : (statsQuery.data?.idempotency ?? []).length === 0 ? (
              <div className="text-sm text-admin-text-muted">{LABELS.noData}</div>
            ) : (
              (statsQuery.data?.idempotency ?? []).slice(0, 6).map((r) => (
                <div key={r.scope} className="flex justify-between items-center text-sm">
                  <span className="text-admin-text-secondary truncate max-w-[120px]" title={r.scope}>
                    {formatScope(r.scope)}
                  </span>
                  <span className="text-admin-text-primary font-medium">
                    {r.completed}/{r.count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ?곹뭹 異붽?/?섏젙 紐⑤떖 */}
      {isAddingNew && (
        <ProductFormModal
          mode="create"
          initialData={null}
          rewardTypeOptions={rewardTypeOptions}
          reservedSkuSet={reservedSkuSet}
          addToast={addToast}
          onSubmit={(row) => {
            setRows((prev) => {
              const next = new Map(prev);
              next.set(row.sku, row);
              return next;
            });
          }}
          onClose={() => setIsAddingNew(false)}
        />
      )}
      {editingSku && (
        <ProductFormModal
          mode="edit"
          sku={editingSku}
          initialData={rows.get(editingSku) ?? null}
          rewardTypeOptions={rewardTypeOptions}
          reservedSkuSet={reservedSkuSet}
          addToast={addToast}
          onSubmit={(row) => {
            setRows((prev) => {
              const next = new Map(prev);
              next.set(row.sku, row);
              return next;
            });
          }}
          onClose={() => setEditingSku(null)}
        />
      )}
    </div>
  );
};



