export function resolvePaymentProvider(mode, requestedProvider) {
  const activeProvider = String(mode || 'paypal').toLowerCase();
  const requested = String(requestedProvider || activeProvider).toLowerCase();

  if (requested !== activeProvider) {
    throw Object.assign(new Error(`Payments are configured for ${activeProvider}`), { status: 400 });
  }

  return activeProvider;
}