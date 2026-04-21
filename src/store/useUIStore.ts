import { create } from "zustand";
import type { Habit } from "@/db/schema";

export type ActiveView = "today" | "habit";

interface UIState {
  activeView: ActiveView;
  selectedHabitId: string | null;
  isCreateOpen: boolean;
  showArchived: boolean;
  editingHabit: Habit | null;
  shortcutsOpen: boolean;
  sidebarOpen: boolean; // mobile drawer
  setView: (v: ActiveView) => void;
  setSelectedHabit: (id: string | null) => void;
  openCreate: () => void;
  closeCreate: () => void;
  toggleShowArchived: () => void;
  setEditing: (h: Habit | null) => void;
  setShortcutsOpen: (open: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeView: "today",
  selectedHabitId: null,
  isCreateOpen: false,
  showArchived: false,
  editingHabit: null,
  shortcutsOpen: false,
  sidebarOpen: false,
  setView: (v) => set({ activeView: v }),
  setSelectedHabit: (id) => set({ selectedHabitId: id }),
  openCreate: () => set({ isCreateOpen: true }),
  closeCreate: () => set({ isCreateOpen: false }),
  toggleShowArchived: () =>
    set((s) => ({
      showArchived: !s.showArchived,
      selectedHabitId: null,
      activeView: "today",
    })),
  setEditing: (h) => set({ editingHabit: h }),
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
