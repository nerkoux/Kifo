"use client";

import { create } from "zustand";

interface AppState {
  selectedBotId?: string;
  selectedWorkflowId?: string;
  setSelectedBotId: (value?: string) => void;
  setSelectedWorkflowId: (value?: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedBotId: undefined,
  selectedWorkflowId: undefined,
  setSelectedBotId: (value) => set({ selectedBotId: value }),
  setSelectedWorkflowId: (value) => set({ selectedWorkflowId: value }),
}));
