// src/admin/utils/piiGuard.ts

export type PiiHit = { type: "PHONE" | "EMAIL" | "ACCOUNT"; match: string };

const PHONE_RE = /(01[016789])[- ]?\d{3,4}[- ]?\d{4}/g;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
// Very loose "account-like" pattern; final validation should be server-side.
const ACCOUNT_RE = /\b\d{2,4}[- ]?\d{2,4}[- ]?\d{4,8}\b/g;

/**
 * Scans the provided text for Potential Personally Identifiable Information (PII).
 * Detecting patterns like Phone Numbers, Emails, and Account Numbers.
 * 
 * @param text - The input string to scan.
 * @returns An array of detected PiiHit objects.
 */
export function findPiiHits(text: string): PiiHit[] {
  const hits: PiiHit[] = [];

  for (const match of text.matchAll(PHONE_RE)) {
    hits.push({ type: "PHONE", match: String(match[0]) });
  }
  for (const match of text.matchAll(EMAIL_RE)) {
    hits.push({ type: "EMAIL", match: String(match[0]) });
  }
  for (const match of text.matchAll(ACCOUNT_RE)) {
    hits.push({ type: "ACCOUNT", match: String(match[0]) });
  }

  // De-dup by type+match
  const unique = new Map<string, PiiHit>();
  for (const h of hits) unique.set(`${h.type}:${h.match}`, h);
  return Array.from(unique.values());
}

/**
 * Checks if the text contains any PII.
 * @param text - The input string to check.
 * @returns True if PII is found, otherwise false.
 */
export function hasPii(text: string): boolean {
  return findPiiHits(text).length > 0;
}
