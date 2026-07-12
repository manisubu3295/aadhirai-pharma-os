export interface SalePaymentRow {
  method: string;
  amount: number;
  reference?: string | null;
}

/** Shape as it comes back from the DB (decimal columns serialize as strings). */
export interface RawSalePaymentRow {
  method: string;
  amount: string | number;
  reference?: string | null;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Builds the sale_payments row set for a SPLIT-mode sale (2+ entered
 * cash/upi/card rows). Entered rows must never use method "credit" — credit
 * is always the implicit shortfall, appended automatically when a customer
 * is present. For the legacy single-method radio (including the "credit"
 * radio), do not use this function — see buildLegacyPaymentPlan below.
 */
export function buildSalePaymentPlan(input: {
  total: number;
  rows: Array<{ method: string; amount: number; reference?: string | null }>;
  hasCustomer: boolean;
}): {
  paymentMethod: string;
  rows: SalePaymentRow[];
  receivedAmount: number;
  changeAmount: number;
  creditPortion: number;
  error: string | null;
} {
  const rows: SalePaymentRow[] = input.rows
    .filter((r) => r.amount > 0)
    .map((r) => ({ method: r.method.toLowerCase(), amount: round2(r.amount), reference: r.reference ?? null }));

  const total = round2(input.total);
  const receivedAmount = round2(rows.reduce((sum, r) => sum + r.amount, 0));
  const changeAmount = round2(Math.max(0, receivedAmount - total));
  const creditPortion = round2(Math.max(0, total - receivedAmount));

  let error: string | null = null;
  if (changeAmount > 0 && !rows.some((r) => r.method === "cash")) {
    error = "Change can only be returned for cash payments — add or increase a cash payment row.";
  } else if (creditPortion > 0 && !input.hasCustomer) {
    error = "Select a customer to record a credit remainder.";
  }

  const finalRows = [...rows];
  if (creditPortion > 0) {
    finalRows.push({ method: "credit", amount: creditPortion, reference: null });
  }

  const paymentMethod =
    finalRows.length === 0 ? "cash" : finalRows.length === 1 ? finalRows[0].method : "Split";

  return { paymentMethod, rows: finalRows, receivedAmount, changeAmount, creditPortion, error };
}

/**
 * Builds the sale_payments row set for the legacy single-method radio
 * (cash/upi/card/credit), preserving today's exact sales-row semantics
 * (paymentMethod/receivedAmount/changeAmount/credit-ledger unchanged).
 * The UI never records HOW an advance payment on a credit bill was
 * collected, so — purely for sale_payments bookkeeping — any amount
 * actually received on a "credit" bill is conventionally attributed to
 * "cash". This keeps SUM(sale_payments.amount) === total without changing
 * any user-visible behavior.
 */
export function buildLegacyPaymentPlan(input: {
  total: number;
  paymentMethod: string;
  receivedAmount: number;
  reference?: string | null;
}): { rows: SalePaymentRow[]; changeAmount: number; creditPortion: number } {
  const method = input.paymentMethod.toLowerCase();
  const total = round2(input.total);
  const received = round2(input.receivedAmount);

  if (method === "credit") {
    const creditPortion = round2(Math.max(0, total - received));
    const rows: SalePaymentRow[] = [];
    if (received > 0) rows.push({ method: "cash", amount: received, reference: input.reference ?? null });
    if (creditPortion > 0) rows.push({ method: "credit", amount: creditPortion, reference: null });
    return { rows, changeAmount: 0, creditPortion };
  }

  const changeAmount = round2(Math.max(0, received - total));
  const rows: SalePaymentRow[] = received > 0 ? [{ method, amount: received, reference: input.reference ?? null }] : [];
  return { rows, changeAmount, creditPortion: 0 };
}

/**
 * Synthesizes an effective row set for sales that predate this feature
 * (zero real sale_payments rows). Real rows are returned as-is.
 */
export function resolveSalePayments(
  sale: {
    paymentMethod: string;
    receivedAmount: string | number;
    total: string | number;
    customerId?: number | null;
  },
  payments: RawSalePaymentRow[] | undefined,
): SalePaymentRow[] {
  if (payments && payments.length > 0) {
    return payments.map((p) => ({ method: p.method, amount: Number(p.amount) || 0, reference: p.reference ?? null }));
  }

  const received = round2(Number(sale.receivedAmount) || 0);
  const total = round2(Number(sale.total) || 0);
  const method = (sale.paymentMethod || "cash").toLowerCase();
  const rows: SalePaymentRow[] = [];

  if (method === "credit") {
    if (received > 0) rows.push({ method: "cash", amount: received, reference: null });
    const unpaid = round2(Math.max(0, total - received));
    if (unpaid > 0) rows.push({ method: "credit", amount: unpaid, reference: null });
    if (rows.length === 0) rows.push({ method: "credit", amount: total, reference: null });
  } else {
    rows.push({ method, amount: received > 0 ? received : total, reference: null });
  }

  return rows;
}

export function getSaleCreditPortion(
  sale: {
    paymentMethod: string;
    receivedAmount: string | number;
    total: string | number;
    customerId?: number | null;
  },
  payments: RawSalePaymentRow[] | undefined,
): number {
  return round2(
    resolveSalePayments(sale, payments)
      .filter((p) => p.method.toLowerCase() === "credit")
      .reduce((sum, p) => sum + p.amount, 0),
  );
}

export function isSaleCreditBill(
  sale: {
    paymentMethod: string;
    receivedAmount: string | number;
    total: string | number;
    customerId?: number | null;
  },
  payments: RawSalePaymentRow[] | undefined,
): boolean {
  return getSaleCreditPortion(sale, payments) > 0;
}
