import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PinnedItem {
  id: string;
  type: 'document' | 'entity' | 'chunk';
  caseId: string;
  label: string;
  data: Record<string, unknown>;
}

interface GameState {
  // State
  currentCaseId: string | null;
  openedDocs: Set<string>;
  pinnedItems: PinnedItem[];
  hintsUsed: number;

  // Actions
  setCurrentCase: (caseId: string) => void;
  openDoc: (docId: string) => void;
  pinItem: (item: PinnedItem) => void;
  unpinItem: (itemId: string) => void;
  useHint: () => void;
  resetCase: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      currentCaseId: null,
      openedDocs: new Set(),
      pinnedItems: [],
      hintsUsed: 0,

      setCurrentCase: caseId => {
        const current = get().currentCaseId;
        if (current !== caseId) {
          set({
            currentCaseId: caseId,
            openedDocs: new Set(),
            pinnedItems: [],
            hintsUsed: 0,
          });
        }
      },

      openDoc: docId => {
        set(state => ({
          openedDocs: new Set([...state.openedDocs, docId]),
        }));
      },

      pinItem: item => {
        set(state => {
          const exists = state.pinnedItems.some(p => p.id === item.id);
          if (exists) return state;
          return {
            pinnedItems: [...state.pinnedItems, item],
          };
        });
      },

      unpinItem: itemId => {
        set(state => ({
          pinnedItems: state.pinnedItems.filter(p => p.id !== itemId),
        }));
      },

      useHint: () => {
        set(state => ({
          hintsUsed: state.hintsUsed + 1,
        }));
      },

      resetCase: () => {
        set({
          openedDocs: new Set(),
          pinnedItems: [],
          hintsUsed: 0,
        });
      },
    }),
    {
      name: 'office-detective-game',
      partialize: state => ({
        currentCaseId: state.currentCaseId,
        openedDocs: Array.from(state.openedDocs),
        pinnedItems: state.pinnedItems,
        hintsUsed: state.hintsUsed,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as Record<string, unknown>;
        const openedDocsArray = Array.isArray(persistedState['openedDocs'])
          ? (persistedState['openedDocs'] as string[])
          : [];
        return {
          ...current,
          ...persistedState,
          openedDocs: new Set<string>(openedDocsArray),
        };
      },
    },
  ),
);
