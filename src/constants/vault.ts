// src/constants/vault.ts
// V2 Vault Constants (SoT)

/**
 * Vault limit thresholds
 * Source: docs/v2_specs/01_core/v2_strict_vault_policy_sot_ko.md
 */
export const VAULT_LIMITS = {
  /**
   * Maximum vault balance for INACTIVE users (7+ days inactive)
   * INACTIVE users cannot exceed this limit
   */
  INACTIVE_LIMIT: 30000,

  /**
   * Minimum daily deposit for Tier 1 withdrawal eligibility
   * Users must deposit at least this amount on the same day to withdraw
   */
  WITHDRAWAL_TIER_1: 10000,
} as const;

/**
 * Activity status thresholds (days since last play)
 */
export const ACTIVITY_THRESHOLDS = {
  /**
   * ACTIVE status: 0-3 days inactive
   * Full benefits, no restrictions
   */
  ACTIVE_MAX_DAYS: 3,

  /**
   * WARNING status: 4-6 days inactive
   * Warning issued, benefits at risk
   */
  WARNING_MIN_DAYS: 4,
  WARNING_MAX_DAYS: 6,

  /**
   * INACTIVE status: 7+ days inactive
   * Benefits suspended, vault limit enforced
   */
  INACTIVE_MIN_DAYS: 7,
} as const;

export type VaultLimitKey = keyof typeof VAULT_LIMITS;
export type ActivityThresholdKey = keyof typeof ACTIVITY_THRESHOLDS;
