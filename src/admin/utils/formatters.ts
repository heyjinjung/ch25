import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/ko";

dayjs.extend(relativeTime);
dayjs.locale("ko");

/**
 * Formats a number with comma separators.
 * @param num - The number to format.
 * @returns The formatted string (e.g., "1,234").
 */
export const formatNumber = (num?: number | string | null): string => {
    if (num === undefined || num === null) return "0";
    const n = typeof num === "string" ? parseFloat(num) : num;
    return isNaN(n) ? "0" : n.toLocaleString("ko-KR");
};

/**
 * Formats a date using dayjs.
 * @param date - Date string or object.
 * @param template - Format template (default: "YYYY-MM-DD").
 * @returns Formatted date string.
 */
export const formatDate = (date?: string | Date | null, template: string = "YYYY-MM-DD"): string => {
    if (!date) return "-";
    return dayjs(date).format(template);
};

/**
 * Returns a relative time string (e.g., "방금 전", "3시간 전").
 * @param date - Date string or object.
 * @returns Relative time string.
 */
export const formatRelativeTime = (date?: string | Date | null): string => {
    if (!date) return "-";
    return dayjs(date).fromNow();
};

/**
 * Formats a currency value.
 * @param amount - The amount to format.
 * @param currency - The currency code (default: "KRW").
 * @returns Formatted currency string.
 */
export const formatCurrency = (amount?: number | string | null, currency: string = "KRW"): string => {
    if (amount === undefined || amount === null) return "0";
    const n = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("ko-KR", { style: "currency", currency }).format(isNaN(n) ? 0 : n);
};
