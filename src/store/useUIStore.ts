import { create } from "zustand";

interface UIState {
  selectedHabitId: string | null;
  isCreateOpen: boolean;
  setSelectedHabit: (id: string | null) => void;
  openCreate: () => void;
  closeCreate: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedHabitId: null,
  isCreateOpen: false,
  setSelectedHabit: (id) => set({ selectedHabitId: id }),
  openCreate: () => set({ isCreateOpen: true }),
  closeCreate: () => set({ isCreateOpen: false }),
}));
