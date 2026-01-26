
import { create } from "zustand";

interface V2UIState {
  isInboxOpen: boolean;
  isMusicSettingsOpen: boolean;
  toggleInbox: () => void;
  openInbox: () => void;
  closeInbox: () => void;
  toggleMusicSettings: () => void;
  openMusicSettings: () => void;
  closeMusicSettings: () => void;
}

export const useV2UIStore = create<V2UIState>((set) => ({
  isInboxOpen: false,
  isMusicSettingsOpen: false,
  toggleInbox: () => set((state) => ({ isInboxOpen: !state.isInboxOpen })),
  openInbox: () => set({ isInboxOpen: true }),
  closeInbox: () => set({ isInboxOpen: false }),
  toggleMusicSettings: () => set((state) => ({ isMusicSettingsOpen: !state.isMusicSettingsOpen })),
  openMusicSettings: () => set({ isMusicSettingsOpen: true }),
  closeMusicSettings: () => set({ isMusicSettingsOpen: false }),
}));
