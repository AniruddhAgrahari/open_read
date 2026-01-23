import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ViewMode = 'normal' | 'dark' | 'eye-comfort' | 'focus';

interface TextBox {
  id: string;
  page: number;
  x: number;
  y: number;
  content: string;
  type: string; // 'title', 'h1', 'h2', 'h3', 'text', 'rect', 'circle', 'oval', 'arrow', 'highlight'
  width?: number;
  height?: number;
  rotation?: number;
  color?: string;
  rects?: Array<{ x: number; y: number; width: number; height: number }>; // For multi-line highlights
}

interface Tab {
  id: string;
  name: string;
  path: string;
  isActive: boolean;
  isSuspended: boolean;
  scrollPosition: { x: number; y: number };
  zoom: number;
  lastAccessed: number;
  edits: Record<string, string>;
  textBoxes: TextBox[];
  history: TextBox[][]; // History of textBoxes states
  historyIndex: number; // Current position in history
}

interface TabState {
  tabs: Tab[];
  activeTabId: string | null;
  isEditMode: boolean;
  viewMode: ViewMode;
  maxActiveTabs: number;
  shapeColor: string;
  addTab: (name: string, path: string) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<Tab>) => void;
  saveEdit: (tabId: string, spanId: string, content: string) => void;
  suspendTab: (id: string) => void;
  toggleEditMode: () => void;
  setViewMode: (mode: ViewMode) => void;
  setMaxActiveTabs: (count: number) => void;
  addTextBox: (tabId: string, box: Omit<TextBox, 'id'>) => void;
  updateTextBox: (tabId: string, boxId: string, content: string) => void;
  updateBox: (tabId: string, boxId: string, updates: Partial<TextBox>) => void;
  deleteTextBox: (tabId: string, boxId: string) => void;
  undo: (tabId: string) => void;
  redo: (tabId: string) => void;
  setShapeColor: (color: string) => void;
}

export const useTabStore = create<TabState>()(
  persist(
    (set) => ({
      tabs: [],
      activeTabId: null,
      isEditMode: false,
      viewMode: 'dark',
      maxActiveTabs: 3,
      shapeColor: '#ef4444', // Default red
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
          textBoxes: [],
          history: [[]],
          historyIndex: 0,
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
      setViewMode: (viewMode) => set({ viewMode }),
      setMaxActiveTabs: (maxActiveTabs) => set({ maxActiveTabs }),
      setShapeColor: (shapeColor) => set({ shapeColor }),
      addTextBox: (tabId, box) => set((state) => {
        const MAX_HISTORY = 50;
        return {
          tabs: state.tabs.map((t) => {
            if (t.id === tabId) {
              const newTextBoxes = [...t.textBoxes, { ...box, id: Math.random().toString(36).substr(2, 9) }];
              const newHistory = [...t.history.slice(0, t.historyIndex + 1), newTextBoxes].slice(-MAX_HISTORY);
              return {
                ...t,
                textBoxes: newTextBoxes,
                history: newHistory,
                historyIndex: newHistory.length - 1
              };
            }
            return t;
          })
        };
      }),
      updateTextBox: (tabId, boxId, content) => set((state) => {
        const MAX_HISTORY = 50;
        return {
          tabs: state.tabs.map((t) => {
            if (t.id === tabId) {
              const newTextBoxes = t.textBoxes.map(b => b.id === boxId ? { ...b, content } : b);
              const newHistory = [...t.history.slice(0, t.historyIndex + 1), newTextBoxes].slice(-MAX_HISTORY);
              return {
                ...t,
                textBoxes: newTextBoxes,
                history: newHistory,
                historyIndex: newHistory.length - 1
              };
            }
            return t;
          })
        };
      }),
      updateBox: (tabId, boxId, updates) => set((state) => {
        const MAX_HISTORY = 50;
        return {
          tabs: state.tabs.map((t) => {
            if (t.id === tabId) {
              const newTextBoxes = t.textBoxes.map(b => b.id === boxId ? { ...b, ...updates } : b);
              const newHistory = [...t.history.slice(0, t.historyIndex + 1), newTextBoxes].slice(-MAX_HISTORY);
              return {
                ...t,
                textBoxes: newTextBoxes,
                history: newHistory,
                historyIndex: newHistory.length - 1
              };
            }
            return t;
          })
        };
      }),
      deleteTextBox: (tabId, boxId) => set((state) => {
        const MAX_HISTORY = 50;
        return {
          tabs: state.tabs.map((t) => {
            if (t.id === tabId) {
              const newTextBoxes = t.textBoxes.filter(b => b.id !== boxId);
              const newHistory = [...t.history.slice(0, t.historyIndex + 1), newTextBoxes].slice(-MAX_HISTORY);
              return {
                ...t,
                textBoxes: newTextBoxes,
                history: newHistory,
                historyIndex: newHistory.length - 1
              };
            }
            return t;
          })
        };
      }),
      undo: (tabId) => set((state) => ({
        tabs: state.tabs.map((t) => {
          if (t.id === tabId && t.historyIndex > 0) {
            const newIndex = t.historyIndex - 1;
            return {
              ...t,
              textBoxes: t.history[newIndex],
              historyIndex: newIndex
            };
          }
          return t;
        })
      })),
      redo: (tabId) => set((state) => ({
        tabs: state.tabs.map((t) => {
          if (t.id === tabId && t.historyIndex < t.history.length - 1) {
            const newIndex = t.historyIndex + 1;
            return {
              ...t,
              textBoxes: t.history[newIndex],
              historyIndex: newIndex
            };
          }
          return t;
        })
      })),
    }),
    {
      name: 'pdf-tabs-storage',
      migrate: (persistedState: any) => {
        // Migrate old tabs to include history fields
        if (persistedState?.tabs) {
          persistedState.tabs = persistedState.tabs.map((tab: any) => ({
            ...tab,
            history: tab.history || [tab.textBoxes || []],
            historyIndex: tab.historyIndex ?? 0
          }));
        }
        return persistedState;
      }
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
