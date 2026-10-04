const bad = (m) => Object.assign(new Error(m), { status: 400 });
// Pure discount math (integer minor units). Throws 400-style errors on invalid combos.
export function applyCoupon(c, list, currency) {
  let d;
  if (c.type === 'percent') d = Math.floor((list * c.value) / 100);
  else { if (c.currency !== currency) throw bad('Coupon not valid for this currency'); d = c.value; }
  d = Math.min(d, list);
  if (list - d < 50) throw bad('Discount too large for paid checkout');
  return { amountMinor: list - d, discountMinor: d };
}
