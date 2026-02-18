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

type AddBoardItemInput = Omit<BoardItem, 'position'> & {
  position?: { x: number; y: number };
};

interface GameEvent {
  id: string;
  type:
    | 'doc_opened'
    | 'evidence_pinned'
    | 'evidence_unpinned'
    | 'suspect_marked'
    | 'suspect_unmarked'
    | 'board_added'
    | 'search'
    | 'aria'
    | 'hint'
    | 'submission';
  label: string;
  timestamp: number;
}

interface SubmissionStats {
  count: number;
  lastScore: number | null;
}

interface SubmissionTimelineItem {
  caseId: string;
  score: number;
  timestamp: number;
  hintsUsed: number;
  shieldProtected: boolean;
}

interface LegacyPersistedGameState {
  currentCaseId?: string | null;
  openedDocs?: string[];
  suspectedEntities?: string[];
  suspectConfidence?: Record<string, number>;
  hintsUsed?: number;
  searchesRun?: number;
  ariaQuestions?: number;
  submissionCount?: number;
  lastSubmissionScore?: number | null;
  recentEvents?: GameEvent[];
  submissionTimeline?: {
    caseId: string;
    score: number;
    timestamp: number;
    hintsUsed?: number;
    shieldProtected?: boolean;
  }[];
  claimedMetaRewards?: Record<string, number>;
}

type CaseStringListMap = Record<string, string[]>;
type CaseNumberMap = Record<string, number>;
type CaseConfidenceMap = Record<string, Record<string, number>>;
type CaseSubmissionMap = Record<string, SubmissionStats>;
type CaseEventMap = Record<string, GameEvent[]>;
type ClaimedMetaRewardsMap = Record<string, number>;

const EMPTY_STRING_LIST: string[] = [];
const EMPTY_EVENT_LIST: GameEvent[] = [];
const EMPTY_CONFIDENCE: Record<string, number> = {};
const EMPTY_SUBMISSION: SubmissionStats = { count: 0, lastScore: null };

// Calculate position for new board items: documents on left, entities on right
function calculateNextPosition(
  existingItems: BoardItem[],
  itemType: 'entity' | 'document',
): { x: number; y: number } {
  const baseX = itemType === 'document' ? 100 : 500;
  const baseY = 100;
  const spacing = 140;

  const typeItems = existingItems.filter(b => b.type === itemType);
  const col = typeItems.length % 3;
  const row = Math.floor(typeItems.length / 3);

  return {
    x: baseX + col * spacing,
    y: baseY + row * spacing,
  };
}

function createEvent(type: GameEvent['type'], label: string): GameEvent {
  return {
    id: `${Date.now().toString()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    label,
    timestamp: Date.now(),
  };
}

function appendEvent(events: GameEvent[], event: GameEvent): GameEvent[] {
  return [event, ...events].slice(0, 24);
}

function appendSubmissionTimeline(
  entries: SubmissionTimelineItem[],
  item: SubmissionTimelineItem,
): SubmissionTimelineItem[] {
  return [...entries, item].slice(-120);
}

function getCaseStringList(byCase: CaseStringListMap, caseId: string): string[] {
  return byCase[caseId] ?? EMPTY_STRING_LIST;
}

function getCaseNumber(byCase: CaseNumberMap, caseId: string): number {
  return byCase[caseId] ?? 0;
}

function getCaseConfidence(byCase: CaseConfidenceMap, caseId: string): Record<string, number> {
  return byCase[caseId] ?? EMPTY_CONFIDENCE;
}

function getCaseSubmission(byCase: CaseSubmissionMap, caseId: string): SubmissionStats {
  return byCase[caseId] ?? EMPTY_SUBMISSION;
}

function getCaseEvents(byCase: CaseEventMap, caseId: string): GameEvent[] {
  return byCase[caseId] ?? EMPTY_EVENT_LIST;
}

function isLegacyState(value: unknown): value is LegacyPersistedGameState {
  return typeof value === 'object' && value !== null;
}

function migrateState(persistedState: unknown, version: number): unknown {
  if (!isLegacyState(persistedState)) {
    return persistedState;
  }

  let nextState: unknown = persistedState;

  if (version < 2) {
    const currentCaseId =
      typeof persistedState.currentCaseId === 'string' ? persistedState.currentCaseId : null;
    if (!currentCaseId) return persistedState;

    nextState = {
      ...persistedState,
      openedDocsByCase: Array.isArray(persistedState.openedDocs)
        ? { [currentCaseId]: persistedState.openedDocs }
        : {},
      suspectedEntitiesByCase: Array.isArray(persistedState.suspectedEntities)
        ? { [currentCaseId]: persistedState.suspectedEntities }
        : {},
      suspectConfidenceByCase:
        persistedState.suspectConfidence && typeof persistedState.suspectConfidence === 'object'
          ? { [currentCaseId]: persistedState.suspectConfidence }
          : {},
      hintsUsedByCase:
        typeof persistedState.hintsUsed === 'number'
          ? { [currentCaseId]: persistedState.hintsUsed }
          : {},
      searchesRunByCase:
        typeof persistedState.searchesRun === 'number'
          ? { [currentCaseId]: persistedState.searchesRun }
          : {},
      ariaQuestionsByCase:
        typeof persistedState.ariaQuestions === 'number'
          ? { [currentCaseId]: persistedState.ariaQuestions }
          : {},
      submissionByCase: {
        [currentCaseId]: {
          count:
            typeof persistedState.submissionCount === 'number' ? persistedState.submissionCount : 0,
          lastScore:
            typeof persistedState.lastSubmissionScore === 'number'
              ? persistedState.lastSubmissionScore
              : null,
        },
      },
      recentEventsByCase: Array.isArray(persistedState.recentEvents)
        ? { [currentCaseId]: persistedState.recentEvents }
        : {},
    };
  }

  if (!isLegacyState(nextState)) return nextState;

  if (version < 3) {
    nextState = {
      ...nextState,
      submissionTimeline: Array.isArray(nextState.submissionTimeline)
        ? nextState.submissionTimeline
        : [],
    };
  }

  if (!isLegacyState(nextState)) return nextState;

  if (version < 4) {
    nextState = {
      ...nextState,
      claimedMetaRewards:
        nextState.claimedMetaRewards && typeof nextState.claimedMetaRewards === 'object'
          ? nextState.claimedMetaRewards
          : {},
    };
  }

  if (!isLegacyState(nextState)) return nextState;

  if (version < 5) {
    nextState = {
      ...nextState,
      submissionTimeline: Array.isArray(nextState.submissionTimeline)
        ? nextState.submissionTimeline.map(entry => ({
            caseId: entry.caseId,
            score: entry.score,
            timestamp: entry.timestamp,
            hintsUsed:
              typeof entry.hintsUsed === 'number' ? Math.max(0, Math.round(entry.hintsUsed)) : 0,
            shieldProtected: false,
          }))
        : [],
    };
  }

  if (!isLegacyState(nextState)) return nextState;

  if (version < 6) {
    nextState = {
      ...nextState,
      submissionTimeline: Array.isArray(nextState.submissionTimeline)
        ? nextState.submissionTimeline.map(entry => ({
            caseId: entry.caseId,
            score: entry.score,
            timestamp: entry.timestamp,
            hintsUsed:
              typeof entry.hintsUsed === 'number' ? Math.max(0, Math.round(entry.hintsUsed)) : 0,
            shieldProtected: entry.shieldProtected === true,
          }))
        : [],
    };
  }

  return nextState;
}

interface GameState {
  // State
  currentCaseId: string | null;
  openedDocsByCase: CaseStringListMap;
  pinnedItems: PinnedItem[];
  suspectedEntitiesByCase: CaseStringListMap;
  suspectConfidenceByCase: CaseConfidenceMap;
  boardItems: BoardItem[];
  hintsUsedByCase: CaseNumberMap;
  searchesRunByCase: CaseNumberMap;
  ariaQuestionsByCase: CaseNumberMap;
  submissionByCase: CaseSubmissionMap;
  submissionTimeline: SubmissionTimelineItem[];
  claimedMetaRewards: ClaimedMetaRewardsMap;
  recentEventsByCase: CaseEventMap;

  // Actions
  setCurrentCase: (caseId: string) => void;
  openDoc: (caseId: string, docId: string) => void;
  pinItem: (item: PinnedItem) => void;
  unpinItem: (caseId: string, itemId: string) => void;
  toggleSuspect: (caseId: string, entityId: string) => void;
  setSuspectConfidence: (caseId: string, entityId: string, confidence: number) => void;
  addToBoard: (item: AddBoardItemInput) => void;
  setBoardItems: (caseId: string, items: BoardItem[]) => void;
  removeFromBoard: (caseId: string, id: string) => void;
  updateBoardPosition: (caseId: string, id: string, position: { x: number; y: number }) => void;
  clearBoard: (caseId: string) => void;
  recordSearch: (caseId: string, query: string, total: number) => void;
  recordAriaQuestion: (caseId: string, message: string) => void;
  recordSubmission: (
    caseId: string,
    score: number,
    hintsUsedAtSubmission?: number,
    shieldProtected?: boolean,
  ) => void;
  claimMetaMissionReward: (claimKey: string, rewardXp: number) => boolean;
  useHint: (caseId: string) => void;
  resetCase: (caseId: string) => void;

  // Helpers
  getOpenedDocs: (caseId: string) => string[];
  getSuspectedEntities: (caseId: string) => string[];
  getSuspectConfidenceMap: (caseId: string) => Record<string, number>;
  getHintsUsed: (caseId: string) => number;
  getSearchesRun: (caseId: string) => number;
  getAriaQuestions: (caseId: string) => number;
  getSubmissionStats: (caseId: string) => SubmissionStats;
  getClaimedMetaXp: () => number;
  isMetaMissionClaimed: (claimKey: string) => boolean;
  getRecentEvents: (caseId: string) => GameEvent[];
  isPinned: (caseId: string, itemId: string) => boolean;
  isSuspected: (caseId: string, entityId: string) => boolean;
  isOnBoard: (caseId: string, itemId: string) => boolean;
  getSuspectConfidence: (caseId: string, entityId: string) => number;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      currentCaseId: null,
      openedDocsByCase: {},
      pinnedItems: [],
      suspectedEntitiesByCase: {},
      suspectConfidenceByCase: {},
      boardItems: [],
      hintsUsedByCase: {},
      searchesRunByCase: {},
      ariaQuestionsByCase: {},
      submissionByCase: {},
      submissionTimeline: [],
      claimedMetaRewards: {},
      recentEventsByCase: {},

      setCurrentCase: caseId => {
        if (get().currentCaseId === caseId) return;
        set({ currentCaseId: caseId });
      },

      openDoc: (caseId, docId) => {
        set(state => {
          const caseOpenedDocs = getCaseStringList(state.openedDocsByCase, caseId);
          if (caseOpenedDocs.includes(docId)) return state;
          const caseEvents = getCaseEvents(state.recentEventsByCase, caseId);
          return {
            openedDocsByCase: {
              ...state.openedDocsByCase,
              [caseId]: [...caseOpenedDocs, docId],
            },
            recentEventsByCase: {
              ...state.recentEventsByCase,
              [caseId]: appendEvent(
                caseEvents,
                createEvent('doc_opened', `Opened document ${docId.slice(0, 8)}`),
              ),
            },
          };
        });
      },

      pinItem: item => {
        set(state => {
          const exists = state.pinnedItems.some(p => p.caseId === item.caseId && p.id === item.id);
          if (exists) return state;

          // Also add to board (documents and entities only, not chunks)
          const boardType: 'entity' | 'document' = item.type === 'entity' ? 'entity' : 'document';
          const boardId = item.type === 'entity' ? `entity-${item.id}` : `document-${item.id}`;
          const caseBoardItems = state.boardItems.filter(
            boardItem => boardItem.caseId === item.caseId,
          );
          const boardExists = caseBoardItems.some(b => b.id === boardId);
          const position = calculateNextPosition(caseBoardItems, boardType);
          const caseEvents = getCaseEvents(state.recentEventsByCase, item.caseId);

          return {
            pinnedItems: [...state.pinnedItems, item],
            recentEventsByCase: {
              ...state.recentEventsByCase,
              [item.caseId]: appendEvent(
                caseEvents,
                createEvent('evidence_pinned', `Pinned evidence: ${item.label}`),
              ),
            },
            boardItems: boardExists
              ? state.boardItems
              : [
                  ...state.boardItems,
                  {
                    id: boardId,
                    type: boardType,
                    caseId: item.caseId,
                    label: item.label,
                    position,
                    data: item.data,
                  },
                ],
          };
        });
      },

      unpinItem: (caseId, itemId) => {
        set(state => {
          // Also remove from board
          const boardIdDoc = `document-${itemId}`;
          const boardIdEntity = `entity-${itemId}`;
          const nextPinnedItems = state.pinnedItems.filter(
            p => !(p.caseId === caseId && p.id === itemId),
          );
          const nextBoardItems = state.boardItems.filter(
            b => !(b.caseId === caseId && (b.id === boardIdDoc || b.id === boardIdEntity)),
          );
          if (
            nextPinnedItems.length === state.pinnedItems.length &&
            nextBoardItems.length === state.boardItems.length
          ) {
            return state;
          }
          const caseEvents = getCaseEvents(state.recentEventsByCase, caseId);

          return {
            pinnedItems: nextPinnedItems,
            boardItems: nextBoardItems,
            recentEventsByCase: {
              ...state.recentEventsByCase,
              [caseId]: appendEvent(
                caseEvents,
                createEvent('evidence_unpinned', `Removed evidence ${itemId.slice(0, 8)}`),
              ),
            },
          };
        });
      },

      toggleSuspect: (caseId, entityId) => {
        set(state => {
          const caseSuspects = getCaseStringList(state.suspectedEntitiesByCase, caseId);
          const caseConfidence = getCaseConfidence(state.suspectConfidenceByCase, caseId);
          const caseEvents = getCaseEvents(state.recentEventsByCase, caseId);
          const exists = caseSuspects.includes(entityId);

          if (exists) {
            const restConfidence = Object.fromEntries(
              Object.entries(caseConfidence).filter(([id]) => id !== entityId),
            ) as Record<string, number>;
            return {
              suspectedEntitiesByCase: {
                ...state.suspectedEntitiesByCase,
                [caseId]: caseSuspects.filter(id => id !== entityId),
              },
              suspectConfidenceByCase: {
                ...state.suspectConfidenceByCase,
                [caseId]: restConfidence,
              },
              recentEventsByCase: {
                ...state.recentEventsByCase,
                [caseId]: appendEvent(
                  caseEvents,
                  createEvent('suspect_unmarked', `Cleared suspect ${entityId.slice(0, 8)}`),
                ),
              },
            };
          }

          return {
            suspectedEntitiesByCase: {
              ...state.suspectedEntitiesByCase,
              [caseId]: [...caseSuspects, entityId],
            },
            suspectConfidenceByCase: {
              ...state.suspectConfidenceByCase,
              [caseId]: {
                ...caseConfidence,
                [entityId]: caseConfidence[entityId] ?? 60,
              },
            },
            recentEventsByCase: {
              ...state.recentEventsByCase,
              [caseId]: appendEvent(
                caseEvents,
                createEvent('suspect_marked', `Marked suspect ${entityId.slice(0, 8)}`),
              ),
            },
          };
        });
      },

      setSuspectConfidence: (caseId, entityId, confidence) => {
        set(state => ({
          suspectConfidenceByCase: {
            ...state.suspectConfidenceByCase,
            [caseId]: {
              ...getCaseConfidence(state.suspectConfidenceByCase, caseId),
              [entityId]: Math.max(0, Math.min(100, Math.round(confidence))),
            },
          },
        }));
      },

      addToBoard: item => {
        set(state => {
          const exists = state.boardItems.some(b => b.caseId === item.caseId && b.id === item.id);
          if (exists) return state;
          const caseBoardItems = state.boardItems.filter(
            boardItem => boardItem.caseId === item.caseId,
          );
          const caseEvents = getCaseEvents(state.recentEventsByCase, item.caseId);
          return {
            boardItems: [
              ...state.boardItems,
              {
                ...item,
                position: item.position ?? calculateNextPosition(caseBoardItems, item.type),
              },
            ],
            recentEventsByCase: {
              ...state.recentEventsByCase,
              [item.caseId]: appendEvent(
                caseEvents,
                createEvent('board_added', `Added to board: ${item.label}`),
              ),
            },
          };
        });
      },

      setBoardItems: (caseId, items) => {
        set(state => ({
          boardItems: [
            ...state.boardItems.filter(existing => existing.caseId !== caseId),
            ...items,
          ],
        }));
      },

      removeFromBoard: (caseId, id) => {
        set(state => ({
          boardItems: state.boardItems.filter(b => !(b.caseId === caseId && b.id === id)),
        }));
      },

      updateBoardPosition: (caseId, id, position) => {
        set(state => ({
          boardItems: state.boardItems.map(b =>
            b.caseId === caseId && b.id === id ? { ...b, position } : b,
          ),
        }));
      },

      clearBoard: caseId => {
        set(state => ({
          boardItems: state.boardItems.filter(item => item.caseId !== caseId),
        }));
      },

      recordSearch: (caseId, query, total) => {
        set(state => {
          const nextCount = getCaseNumber(state.searchesRunByCase, caseId) + 1;
          const caseEvents = getCaseEvents(state.recentEventsByCase, caseId);
          return {
            searchesRunByCase: {
              ...state.searchesRunByCase,
              [caseId]: nextCount,
            },
            recentEventsByCase: {
              ...state.recentEventsByCase,
              [caseId]: appendEvent(
                caseEvents,
                createEvent('search', `Searched "${query.slice(0, 24)}" (${String(total)} hits)`),
              ),
            },
          };
        });
      },

      recordAriaQuestion: (caseId, message) => {
        set(state => {
          const nextCount = getCaseNumber(state.ariaQuestionsByCase, caseId) + 1;
          const caseEvents = getCaseEvents(state.recentEventsByCase, caseId);
          return {
            ariaQuestionsByCase: {
              ...state.ariaQuestionsByCase,
              [caseId]: nextCount,
            },
            recentEventsByCase: {
              ...state.recentEventsByCase,
              [caseId]: appendEvent(
                caseEvents,
                createEvent('aria', `Asked ARIA: ${message.slice(0, 28)}`),
              ),
            },
          };
        });
      },

      recordSubmission: (caseId, score, hintsUsedAtSubmission, shieldProtected = false) => {
        set(state => {
          const currentSubmission = getCaseSubmission(state.submissionByCase, caseId);
          const caseEvents = getCaseEvents(state.recentEventsByCase, caseId);
          const timestamp = Date.now();
          return {
            submissionByCase: {
              ...state.submissionByCase,
              [caseId]: {
                count: currentSubmission.count + 1,
                lastScore: score,
              },
            },
            submissionTimeline: appendSubmissionTimeline(state.submissionTimeline, {
              caseId,
              score,
              timestamp,
              hintsUsed: Math.max(0, Math.round(hintsUsedAtSubmission ?? 0)),
              shieldProtected,
            }),
            recentEventsByCase: {
              ...state.recentEventsByCase,
              [caseId]: appendEvent(
                caseEvents,
                createEvent('submission', `Submitted report (${String(score)}/100)`),
              ),
            },
          };
        });
      },

      claimMetaMissionReward: (claimKey, rewardXp) => {
        const existing = get().claimedMetaRewards[claimKey];
        if (typeof existing === 'number') {
          return false;
        }

        set(state => ({
          claimedMetaRewards: {
            ...state.claimedMetaRewards,
            [claimKey]: Math.max(0, Math.round(rewardXp)),
          },
        }));
        return true;
      },

      useHint: caseId => {
        set(state => {
          const nextCount = getCaseNumber(state.hintsUsedByCase, caseId) + 1;
          const caseEvents = getCaseEvents(state.recentEventsByCase, caseId);
          return {
            hintsUsedByCase: {
              ...state.hintsUsedByCase,
              [caseId]: nextCount,
            },
            recentEventsByCase: {
              ...state.recentEventsByCase,
              [caseId]: appendEvent(
                caseEvents,
                createEvent('hint', `Requested hint #${String(nextCount)}`),
              ),
            },
          };
        });
      },

      resetCase: caseId => {
        set(state => ({
          openedDocsByCase: {
            ...state.openedDocsByCase,
            [caseId]: [],
          },
          pinnedItems: state.pinnedItems.filter(item => item.caseId !== caseId),
          suspectedEntitiesByCase: {
            ...state.suspectedEntitiesByCase,
            [caseId]: [],
          },
          suspectConfidenceByCase: {
            ...state.suspectConfidenceByCase,
            [caseId]: {},
          },
          boardItems: state.boardItems.filter(item => item.caseId !== caseId),
          hintsUsedByCase: {
            ...state.hintsUsedByCase,
            [caseId]: 0,
          },
          searchesRunByCase: {
            ...state.searchesRunByCase,
            [caseId]: 0,
          },
          ariaQuestionsByCase: {
            ...state.ariaQuestionsByCase,
            [caseId]: 0,
          },
          submissionByCase: {
            ...state.submissionByCase,
            [caseId]: { count: 0, lastScore: null },
          },
          recentEventsByCase: {
            ...state.recentEventsByCase,
            [caseId]: [],
          },
        }));
      },

      getOpenedDocs: caseId => getCaseStringList(get().openedDocsByCase, caseId),
      getSuspectedEntities: caseId => getCaseStringList(get().suspectedEntitiesByCase, caseId),
      getSuspectConfidenceMap: caseId => getCaseConfidence(get().suspectConfidenceByCase, caseId),
      getHintsUsed: caseId => getCaseNumber(get().hintsUsedByCase, caseId),
      getSearchesRun: caseId => getCaseNumber(get().searchesRunByCase, caseId),
      getAriaQuestions: caseId => getCaseNumber(get().ariaQuestionsByCase, caseId),
      getSubmissionStats: caseId => getCaseSubmission(get().submissionByCase, caseId),
      getClaimedMetaXp: () =>
        Object.values(get().claimedMetaRewards).reduce((sum, value) => sum + value, 0),
      isMetaMissionClaimed: claimKey => typeof get().claimedMetaRewards[claimKey] === 'number',
      getRecentEvents: caseId => getCaseEvents(get().recentEventsByCase, caseId),
      isPinned: (caseId, itemId) =>
        get().pinnedItems.some(item => item.caseId === caseId && item.id === itemId),
      isSuspected: (caseId, entityId) =>
        getCaseStringList(get().suspectedEntitiesByCase, caseId).includes(entityId),
      isOnBoard: (caseId, itemId) =>
        get().boardItems.some(item => item.caseId === caseId && item.id === itemId),
      getSuspectConfidence: (caseId, entityId) => {
        const caseConfidence = getCaseConfidence(get().suspectConfidenceByCase, caseId);
        return caseConfidence[entityId] ?? 50;
      },
    }),
    {
      name: 'office-detective-game',
      version: 6,
      migrate: migrateState,
    },
  ),
);
