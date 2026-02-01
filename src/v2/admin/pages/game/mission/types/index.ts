/**
 * Mission 관련 타입 정의
 */

export interface StreakGrant {
  kind: "WALLET" | "INVENTORY";
  token_type: string;
  amount: number;
}

export interface StreakRule {
  day: number;
  enabled: boolean;
  grants: StreakGrant[];
}

export interface CreateMissionForm {
  category: string;
  title: string;
  condition: string;
  rewardType: string;
  rewardAmount: number;
  targetValue: number;
  logicKey: string;
  actionType: string;
}
