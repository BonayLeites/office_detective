import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PinnedItem {
  id: string;
  type: 'document' | 'entity' | 'chunk';
  caseId: string;
  label: string;
  data: Record<string, unknown>;
}

interface BoardItem {
  id: string;
  type: 'entity' | 'document';
  caseId: string;
  label: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

interface GameState {
  // State (using arrays instead of Sets for better persist compatibility)
  currentCaseId: string | null;
  openedDocs: string[];
  pinnedItems: PinnedItem[];
  suspectedEntities: string[];
  boardItems: BoardItem[];
  hintsUsed: number;

  // Actions
  setCurrentCase: (caseId: string) => void;
  openDoc: (docId: string) => void;
  pinItem: (item: PinnedItem) => void;
  unpinItem: (itemId: string) => void;
  toggleSuspect: (entityId: string) => void;
  addToBoard: (item: Omit<BoardItem, 'position'>) => void;
  removeFromBoard: (id: string) => void;
  updateBoardPosition: (id: string, position: { x: number; y: number }) => void;
  clearBoard: () => void;
  useHint: () => void;
  resetCase: () => void;

  // Helpers
  isPinned: (itemId: string) => boolean;
  isSuspected: (entityId: string) => boolean;
  isOnBoard: (itemId: string) => boolean;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      currentCaseId: null,
      openedDocs: [],
      pinnedItems: [],
      suspectedEntities: [],
      boardItems: [],
      hintsUsed: 0,

      setCurrentCase: caseId => {
        const current = get().currentCaseId;
        if (current !== caseId) {
          set({
            currentCaseId: caseId,
            openedDocs: [],
            pinnedItems: [],
            suspectedEntities: [],
            boardItems: [],
            hintsUsed: 0,
          });
        }
      },

      openDoc: docId => {
        set(state => {
          if (state.openedDocs.includes(docId)) return state;
          return { openedDocs: [...state.openedDocs, docId] };
        });
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

      toggleSuspect: entityId => {
        set(state => {
          const exists = state.suspectedEntities.includes(entityId);
          if (exists) {
            return { suspectedEntities: state.suspectedEntities.filter(id => id !== entityId) };
          } else {
            return { suspectedEntities: [...state.suspectedEntities, entityId] };
          }
        });
      },

      addToBoard: item => {
        set(state => {
          const exists = state.boardItems.some(b => b.id === item.id);
          if (exists) return state;
          return {
            boardItems: [
              ...state.boardItems,
              {
                ...item,
                position: {
                  x: Math.random() * 400 + 100,
                  y: Math.random() * 300 + 100,
                },
              },
            ],
          };
        });
      },

      removeFromBoard: id => {
        set(state => ({
          boardItems: state.boardItems.filter(b => b.id !== id),
        }));
      },

      updateBoardPosition: (id, position) => {
        set(state => ({
          boardItems: state.boardItems.map(b => (b.id === id ? { ...b, position } : b)),
        }));
      },

      clearBoard: () => {
        set({ boardItems: [] });
      },

      useHint: () => {
        set(state => ({
          hintsUsed: state.hintsUsed + 1,
        }));
      },

      resetCase: () => {
        set({
          openedDocs: [],
          pinnedItems: [],
          suspectedEntities: [],
          boardItems: [],
          hintsUsed: 0,
        });
      },

      isPinned: itemId => get().pinnedItems.some(p => p.id === itemId),
      isSuspected: entityId => get().suspectedEntities.includes(entityId),
      isOnBoard: itemId => get().boardItems.some(b => b.id === itemId),
    }),
    {
      name: 'office-detective-game',
    },
  ),
);
