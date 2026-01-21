import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Tab {
  id: string;
  name: string;
  path: string;
  isActive: boolean;
  isSuspended: boolean;
  scrollPosition: { x: number; y: number };
  zoom: number;
  lastAccessed: number;
  edits: Record<string, string>; // Map of unique span ID -> new text content
}

interface TabState {
  tabs: Tab[];
  activeTabId: string | null;
  isEditMode: boolean;
  isDarkMode: boolean;
  maxActiveTabs: number;
  addTab: (name: string, path: string) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<Tab>) => void;
  saveEdit: (tabId: string, spanId: string, content: string) => void;
  suspendTab: (id: string) => void;
  toggleEditMode: () => void;
  toggleDarkMode: () => void;
  setMaxActiveTabs: (count: number) => void;
}

export const useTabStore = create<TabState>()(
  persist(
    (set) => ({
      tabs: [],
      activeTabId: null,
      isEditMode: false,
      isDarkMode: true,
      maxActiveTabs: 3,
      addTab: (name, path) => set((state) => {
        const id = Math.random().toString(36).substr(2, 9);
        const now = Date.now();
        const newTab = {
          id,
          name,
          path,
          isActive: true,
          isSuspended: false,
          scrollPosition: { x: 0, y: 0 },
          zoom: 1.0,
          lastAccessed: now,
          edits: {},
        };

        const updatedTabs = state.tabs.map(t => ({ ...t, isActive: false }));
        const newState = {
          tabs: [...updatedTabs, newTab],
          activeTabId: id,
        };

        return applySuspension(newState, state.maxActiveTabs);
      }),
      removeTab: (id) => set((state) => {
        const newTabs = state.tabs.filter((t) => t.id !== id);
        let newActiveId = state.activeTabId;
        if (state.activeTabId === id) {
          newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
          if (newActiveId) {
            newTabs[newTabs.length - 1].isActive = true;
            newTabs[newTabs.length - 1].lastAccessed = Date.now();
          }
        }
        return { tabs: newTabs, activeTabId: newActiveId };
      }),
      setActiveTab: (id) => set((state) => {
        const now = Date.now();
        const updatedTabs = state.tabs.map((t) => ({
          ...t,
          isActive: t.id === id,
          isSuspended: t.id === id ? false : t.isSuspended,
          lastAccessed: t.id === id ? now : t.lastAccessed,
        }));

        const newState = {
          tabs: updatedTabs,
          activeTabId: id,
        };

        return applySuspension(newState, state.maxActiveTabs);
      }),
      updateTab: (id, updates) => set((state) => ({
        tabs: state.tabs.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      })),
      saveEdit: (tabId, spanId, content) => set((state) => {
        const updatedTabs = state.tabs.map((t) => {
          if (t.id === tabId) {
            return {
              ...t,
              edits: {
                ...t.edits,
                [spanId]: content
              }
            };
          }
          return t;
        });
        return { tabs: updatedTabs };
      }),
      suspendTab: (id) => set((state) => ({
        tabs: state.tabs.map((t) => (t.id === id ? { ...t, isSuspended: true } : t)),
      })),
      toggleEditMode: () => set((state) => ({ isEditMode: !state.isEditMode })),
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      setMaxActiveTabs: (maxActiveTabs) => set({ maxActiveTabs }),
    }),
    {
      name: 'pdf-tabs-storage',
    }
  )
);

function applySuspension(state: { tabs: any[], activeTabId: string | null }, maxActive: number) {
  if (state.tabs.length <= maxActive) return state;

  const activeCount = state.tabs.filter(t => !t.isSuspended).length;
  if (activeCount <= maxActive) return state;

  const tabsToConsider = state.tabs
    .filter(t => !t.isActive && !t.isSuspended)
    .sort((a, b) => a.lastAccessed - b.lastAccessed);

  if (tabsToConsider.length > 0) {
    const tabToSuspend = tabsToConsider[0];
    return {
      ...state,
      tabs: state.tabs.map(t => t.id === tabToSuspend.id ? { ...t, isSuspended: true } : t)
    };
  }

  return state;
}
