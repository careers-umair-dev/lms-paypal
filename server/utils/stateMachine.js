export const TRANSITIONS = {
  PENDING: ['CREATED', 'FAILED', 'CANCELLED'],
  CREATED: ['APPROVED', 'COMPLETED', 'FAILED', 'CANCELLED'],
  APPROVED: ['COMPLETED', 'FAILED', 'CANCELLED'],
  COMPLETED: ['REFUNDED', 'PARTIALLY_REFUNDED'],
  PARTIALLY_REFUNDED: ['REFUNDED', 'PARTIALLY_REFUNDED'],
  FAILED: [], CANCELLED: [], REFUNDED: [],
};
export const canTransition = (from, to) => !!TRANSITIONS[from]?.includes(to);
export const fromStates = (to) => Object.keys(TRANSITIONS).filter((k) => TRANSITIONS[k].includes(to));
