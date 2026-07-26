"use client";

import { create } from "zustand";

type UIStore = {
  activeApplicationId: string | null;
  setActiveApplicationId: (id: string | null) => void;
};

export const useUIStore = create<UIStore>((set) => ({
  activeApplicationId: null,
  setActiveApplicationId: (id) => set({ activeApplicationId: id }),
}));
