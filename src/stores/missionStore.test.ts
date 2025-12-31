import { expect, test, vi, describe, beforeEach } from 'vitest';
import { useMissionStore } from './missionStore';
import apiClient from '../api/apiClient';

vi.mock('../api/apiClient', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn()
    }
}));

describe('MissionStore', () => {
    beforeEach(() => {
        useMissionStore.setState({ missions: [], isLoading: false, error: null, hasUnclaimed: false });
        vi.clearAllMocks();
    });

    test('claimReward success updates local state and returns detail', async () => {
        const mockMission: any = {
            mission: { id: 1, reward_amount: 100, reward_type: 'DIAMOND', target_value: 1 },
            progress: { current_value: 1, is_completed: true, is_claimed: false }
        };
        useMissionStore.setState({ missions: [mockMission] });

        (apiClient.post as any).mockResolvedValue({
            data: { success: true, reward_type: 'DIAMOND', amount: 100 }
        });

        const result = await useMissionStore.getState().claimReward(1);

        expect(result.success).toBe(true);
        expect(result.amount).toBe(100);
        expect(useMissionStore.getState().missions[0].progress.is_claimed).toBe(true);
    });

    test('claimReward failure handles error', async () => {
        const mockMission: any = {
            mission: { id: 1 },
            progress: { is_completed: true, is_claimed: false }
        };
        useMissionStore.setState({ missions: [mockMission] });

        (apiClient.post as any).mockRejectedValue(new Error("Network Error"));

        const result = await useMissionStore.getState().claimReward(1);

        expect(result.success).toBe(false);
        expect(result.message).toBe("Network Error");
        expect(useMissionStore.getState().missions[0].progress.is_claimed).toBe(false);
    });
});
