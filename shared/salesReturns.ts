const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Refund for a (possibly partial) sales return of one sale line.
 *
 * The refund basis is the customer-paid line total (`sale_items.total`,
 * net of discounts and inclusive of GST) prorated by base-unit quantity —
 * NOT `sale_items.price`, which is per DISPLAY unit (per strip for pack
 * items) and would over-refund by the pack size when multiplied by a
 * base-unit quantity.
 *
 * Prorating is cumulative so partial returns never drift past the line
 * total: each return refunds the difference between the rounded cumulative
 * entitlement after and before it, and a full return refunds exactly the
 * line total.
 */
export function computeReturnRefund(input: {
  lineTotal: number;        // parseFloat(saleItem.total) — customer-paid, GST-inclusive
  quantitySold: number;     // base units on the sale line
  alreadyReturned: number;  // base units returned before this return
  quantityReturned: number; // base units in this return
}): { refundAmount: number; pricePerUnit: number } {
  const { lineTotal, quantitySold, alreadyReturned, quantityReturned } = input;
  if (!Number.isFinite(lineTotal) || quantitySold <= 0 || quantityReturned <= 0) {
    return { refundAmount: 0, pricePerUnit: 0 };
  }
  const before = round2((lineTotal * Math.max(0, alreadyReturned)) / quantitySold);
  const after = round2((lineTotal * (Math.max(0, alreadyReturned) + quantityReturned)) / quantitySold);
  const refundAmount = round2(after - before);
  // Display/audit figure only — refundAmount is authoritative.
  const pricePerUnit = round2(refundAmount / quantityReturned);
  return { refundAmount, pricePerUnit };
}
