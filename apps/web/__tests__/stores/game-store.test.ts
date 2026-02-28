import { beforeEach, describe, expect, it } from 'vitest';

import { useGameStore } from '@/stores/game-store';

function resetGameStore(): void {
  useGameStore.setState({
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
  });

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('office-detective-game');
  }
}

describe('game-store case isolation', () => {
  beforeEach(() => {
    resetGameStore();
  });

  it('keeps opened documents isolated per case', () => {
    const store = useGameStore.getState();

    store.openDoc('case-a', 'doc-1');
    store.openDoc('case-a', 'doc-1'); // dedupe
    store.openDoc('case-b', 'doc-2');

    expect(useGameStore.getState().getOpenedDocs('case-a')).toEqual(['doc-1']);
    expect(useGameStore.getState().getOpenedDocs('case-b')).toEqual(['doc-2']);
    expect(useGameStore.getState().getRecentEvents('case-a')[0]?.type).toBe('doc_opened');
    expect(useGameStore.getState().getRecentEvents('case-b')[0]?.type).toBe('doc_opened');
  });

  it('does not wipe case state when switching current case', () => {
    const store = useGameStore.getState();

    store.setCurrentCase('case-a');
    store.openDoc('case-a', 'doc-a');
    store.recordSearch('case-a', 'supplier', 3);
    store.setCurrentCase('case-b');

    expect(useGameStore.getState().currentCaseId).toBe('case-b');
    expect(useGameStore.getState().getOpenedDocs('case-a')).toEqual(['doc-a']);
    expect(useGameStore.getState().getSearchesRun('case-a')).toBe(1);
  });

  it('keeps suspects and confidence isolated per case', () => {
    const store = useGameStore.getState();

    store.toggleSuspect('case-a', 'entity-1');
    store.setSuspectConfidence('case-a', 'entity-1', 85);
    store.toggleSuspect('case-b', 'entity-2');

    expect(useGameStore.getState().isSuspected('case-a', 'entity-1')).toBe(true);
    expect(useGameStore.getState().isSuspected('case-b', 'entity-1')).toBe(false);
    expect(useGameStore.getState().isSuspected('case-b', 'entity-2')).toBe(true);
    expect(useGameStore.getState().getSuspectConfidence('case-a', 'entity-1')).toBe(85);
    expect(useGameStore.getState().getSuspectConfidence('case-b', 'entity-1')).toBe(50);
  });

  it('applies board operations only to the target case', () => {
    const store = useGameStore.getState();

    store.addToBoard({
      id: 'entity-1',
      type: 'entity',
      caseId: 'case-a',
      label: 'Alice',
      data: {},
    });
    store.addToBoard({
      id: 'entity-1',
      type: 'entity',
      caseId: 'case-b',
      label: 'Bob',
      data: {},
    });

    store.updateBoardPosition('case-a', 'entity-1', { x: 10, y: 20 });

    const aItem = useGameStore
      .getState()
      .boardItems.find(item => item.caseId === 'case-a' && item.id === 'entity-1');
    const bItem = useGameStore
      .getState()
      .boardItems.find(item => item.caseId === 'case-b' && item.id === 'entity-1');

    expect(aItem?.position).toEqual({ x: 10, y: 20 });
    expect(bItem?.position).not.toEqual({ x: 10, y: 20 });
    expect(aItem?.reliability).toBe('uncertain');
    expect(bItem?.reliability).toBe('uncertain');

    store.clearBoard('case-a');
    expect(useGameStore.getState().boardItems.some(item => item.caseId === 'case-a')).toBe(false);
    expect(useGameStore.getState().boardItems.some(item => item.caseId === 'case-b')).toBe(true);

    store.removeFromBoard('case-b', 'entity-1');
    expect(useGameStore.getState().boardItems.some(item => item.caseId === 'case-b')).toBe(false);
  });

  it('updates reliability for a board item without affecting other cases', () => {
    const store = useGameStore.getState();

    store.addToBoard({
      id: 'entity-1',
      type: 'entity',
      caseId: 'case-a',
      label: 'Alice',
      data: {},
    });
    store.addToBoard({
      id: 'entity-1',
      type: 'entity',
      caseId: 'case-b',
      label: 'Bob',
      data: {},
    });

    store.setBoardItemReliability('case-a', 'entity-1', 'reliable');

    const aItem = useGameStore
      .getState()
      .boardItems.find(item => item.caseId === 'case-a' && item.id === 'entity-1');
    const bItem = useGameStore
      .getState()
      .boardItems.find(item => item.caseId === 'case-b' && item.id === 'entity-1');

    expect(aItem?.reliability).toBe('reliable');
    expect(bItem?.reliability).toBe('uncertain');
  });

  it('supports hypothesis nodes and label updates', () => {
    const store = useGameStore.getState();

    store.addToBoard({
      id: 'hypothesis-1',
      type: 'hypothesis',
      caseId: 'case-a',
      label: 'Initial theory',
      data: { hypothesis: 'Initial theory' },
    });
    store.setBoardItemLabel('case-a', 'hypothesis-1', 'Updated theory');

    const item = useGameStore
      .getState()
      .boardItems.find(
        boardItem => boardItem.caseId === 'case-a' && boardItem.id === 'hypothesis-1',
      );

    expect(item?.type).toBe('hypothesis');
    expect(item?.label).toBe('Updated theory');
    expect(item?.data).toMatchObject({ hypothesis: 'Updated theory' });
  });

  it('tracks counters and submissions independently per case', () => {
    const store = useGameStore.getState();

    store.recordSearch('case-a', 'invoice', 4);
    store.recordSearch('case-b', 'payment', 2);
    store.recordAriaQuestion('case-a', 'who approved this?');
    store.useHint('case-a');
    store.recordSubmission('case-a', 78, 1);
    store.recordSubmission('case-b', 91);

    expect(useGameStore.getState().getSearchesRun('case-a')).toBe(1);
    expect(useGameStore.getState().getSearchesRun('case-b')).toBe(1);
    expect(useGameStore.getState().getAriaQuestions('case-a')).toBe(1);
    expect(useGameStore.getState().getAriaQuestions('case-b')).toBe(0);
    expect(useGameStore.getState().getHintsUsed('case-a')).toBe(1);
    expect(useGameStore.getState().getHintsUsed('case-b')).toBe(0);
    expect(useGameStore.getState().getSubmissionStats('case-a')).toEqual({
      count: 1,
      lastScore: 78,
    });
    expect(useGameStore.getState().getSubmissionStats('case-b')).toEqual({
      count: 1,
      lastScore: 91,
    });
    expect(useGameStore.getState().submissionTimeline).toHaveLength(2);
    expect(useGameStore.getState().submissionTimeline[0]?.caseId).toBe('case-a');
    expect(useGameStore.getState().submissionTimeline[0]?.hintsUsed).toBe(1);
    expect(useGameStore.getState().submissionTimeline[0]?.shieldProtected).toBe(false);
    expect(useGameStore.getState().submissionTimeline[1]?.caseId).toBe('case-b');
    expect(useGameStore.getState().submissionTimeline[1]?.hintsUsed).toBe(0);
    expect(useGameStore.getState().submissionTimeline[1]?.shieldProtected).toBe(false);
  });

  it('resetCase only clears data for the requested case', () => {
    const store = useGameStore.getState();

    store.openDoc('case-a', 'doc-a');
    store.openDoc('case-b', 'doc-b');
    store.pinItem({
      id: 'entity-a',
      type: 'entity',
      caseId: 'case-a',
      label: 'Entity A',
      data: {},
    });
    store.pinItem({
      id: 'entity-b',
      type: 'entity',
      caseId: 'case-b',
      label: 'Entity B',
      data: {},
    });
    store.toggleSuspect('case-a', 'entity-a');
    store.toggleSuspect('case-b', 'entity-b');
    store.recordSearch('case-a', 'a', 1);
    store.recordSearch('case-b', 'b', 1);

    store.resetCase('case-a');

    expect(useGameStore.getState().getOpenedDocs('case-a')).toEqual([]);
    expect(useGameStore.getState().getOpenedDocs('case-b')).toEqual(['doc-b']);
    expect(useGameStore.getState().getSuspectedEntities('case-a')).toEqual([]);
    expect(useGameStore.getState().getSuspectedEntities('case-b')).toEqual(['entity-b']);
    expect(useGameStore.getState().getSearchesRun('case-a')).toBe(0);
    expect(useGameStore.getState().getSearchesRun('case-b')).toBe(1);
    expect(useGameStore.getState().pinnedItems.some(item => item.caseId === 'case-a')).toBe(false);
    expect(useGameStore.getState().pinnedItems.some(item => item.caseId === 'case-b')).toBe(true);
    expect(useGameStore.getState().boardItems.some(item => item.caseId === 'case-a')).toBe(false);
    expect(useGameStore.getState().boardItems.some(item => item.caseId === 'case-b')).toBe(true);
  });

  it('claims meta rewards once and accumulates claimed XP', () => {
    const store = useGameStore.getState();

    expect(store.claimMetaMissionReward('daily_closer:1', 24)).toBe(true);
    expect(store.claimMetaMissionReward('daily_closer:1', 24)).toBe(false);
    expect(useGameStore.getState().isMetaMissionClaimed('daily_closer:1')).toBe(true);
    expect(useGameStore.getState().getClaimedMetaXp()).toBe(24);
  });
});
