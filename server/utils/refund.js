const bad = (m, s = 400) => Object.assign(new Error(m), { status: s });
// Returns refund amount in minor units. Blank input = full remaining amount.
export function parseRefundAmount(input, remaining) {
  if (!(remaining > 0)) throw bad('Nothing left to refund', 409);
  if (input === undefined || input === null || input === '') return remaining;
  const n = Math.round(Number(input) * 100);
  if (!Number.isInteger(n) || n <= 0 || n > remaining) throw bad('Invalid refund amount');
  return n;
}
