export interface DoctorCommissionConfig {
  commissionBasis: string | null;
  commissionRate: string | number | null;
  commissionFixedAmount: string | number | null;
  minSaleAmount: string | number | null;
}

/**
 * Returns 0 when the doctor has no commission configured (commissionBasis is
 * null), or when the sale's subtotal is below the doctor's minSaleAmount
 * threshold. Otherwise computes the commission per the doctor's basis:
 * a percentage of the pre-tax subtotal, a percentage of the GST-inclusive
 * total, or a flat fixed amount regardless of sale size.
 */
export function computeDoctorCommission(
  doctor: DoctorCommissionConfig,
  sale: { subtotal: number; total: number },
): number {
  if (!doctor.commissionBasis) return 0;

  const minSale = Number(doctor.minSaleAmount) || 0;
  if (sale.subtotal < minSale) return 0;

  if (doctor.commissionBasis === "fixed") {
    return Math.round((Number(doctor.commissionFixedAmount) || 0) * 100) / 100;
  }

  const rate = Number(doctor.commissionRate) || 0;
  if (rate <= 0) return 0;

  const base = doctor.commissionBasis === "total_with_gst" ? sale.total : sale.subtotal;
  return Math.round(((base * rate) / 100) * 100) / 100;
}
