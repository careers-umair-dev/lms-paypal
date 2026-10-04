const makeId = (prefix = 'MOCK-PAY') =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

export default {
  async createPayment({ referenceId }) {
    return {
      providerOrderId: `MOCK-ORDER-${String(referenceId)}`,
      checkoutUrl: null,
    };
  },

  async getPayment(id) {
    return { id, status: 'COMPLETED' };
  },

  async capturePayment(id) {
    return {
      status: 'COMPLETED',
      amountMinor: null,
      currency: null,
      transactionId: makeId(),
    };
  },

  async refundPayment(transactionId, amountMinor) {
    return { id: `MOCK-REFUND-${transactionId}-${Date.now()}`, amountMinor };
  },
};
