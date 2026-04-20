import { create } from "zustand";

interface UIState {
  selectedHabitId: string | null;
  isCreateOpen: boolean;
  showArchived: boolean;
  setSelectedHabit: (id: string | null) => void;
  openCreate: () => void;
  closeCreate: () => void;
  toggleShowArchived: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedHabitId: null,
  isCreateOpen: false,
  showArchived: false,
  setSelectedHabit: (id) => set({ selectedHabitId: id }),
  openCreate: () => set({ isCreateOpen: true }),
  closeCreate: () => set({ isCreateOpen: false }),
  toggleShowArchived: () =>
    set((s) => ({ showArchived: !s.showArchived, selectedHabitId: null })),
}));
