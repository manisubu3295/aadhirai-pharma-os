-- GRN Batch Reconciliation SQL (PostgreSQL)
-- Purpose:
-- 1) Create missing medicine rows for GRN batches
-- 2) Re-link GRN items to correct batch-wise medicine row
-- 3) Transfer stock from wrong medicine row to correct batch row
-- 4) Recalculate stock status
--
-- Run this in maintenance window with backup.

BEGIN;

-- Find mismatched GRN links where GRN batch != linked medicine batch
CREATE TEMP TABLE _batch_fix AS
SELECT
  gri.id AS gri_id,
  gri.grn_id,
  gri.medicine_id AS source_medicine_id,
  TRIM(gri.batch_number) AS target_batch_number,
  (COALESCE(gri.quantity, 0) + COALESCE(gri.free_quantity, 0))::int AS move_qty,
  m.name,
  m.manufacturer,
  COALESCE(NULLIF(TRIM(gri.expiry_date), ''), m.expiry_date) AS expiry_date,
  m.price,
  m.cost_price,
  m.mrp,
  m.gst_rate,
  m.hsn_code,
  m.category,
  m.reorder_level,
  m.barcode,
  m.min_stock,
  m.max_stock,
  m.location_id,
  m.base_unit,
  m.pack_size,
  m.price_per_unit
FROM goods_receipt_items gri
JOIN medicines m ON m.id = gri.medicine_id
WHERE TRIM(COALESCE(gri.batch_number, '')) <> ''
  AND TRIM(gri.batch_number) <> TRIM(m.batch_number);

-- Create missing medicine batch rows
INSERT INTO medicines (
  name,
  batch_number,
  manufacturer,
  expiry_date,
  quantity,
  price,
  cost_price,
  mrp,
  gst_rate,
  hsn_code,
  category,
  status,
  reorder_level,
  barcode,
  min_stock,
  max_stock,
  location_id,
  base_unit,
  pack_size,
  price_per_unit
)
SELECT DISTINCT
  f.name,
  f.target_batch_number,
  f.manufacturer,
  f.expiry_date,
  0,
  f.price,
  f.cost_price,
  f.mrp,
  f.gst_rate,
  f.hsn_code,
  f.category,
  'Out of Stock',
  COALESCE(f.reorder_level, 50),
  f.barcode,
  f.min_stock,
  f.max_stock,
  f.location_id,
  f.base_unit,
  f.pack_size,
  f.price_per_unit
FROM _batch_fix f
LEFT JOIN medicines m2
  ON m2.name = f.name
 AND m2.manufacturer = f.manufacturer
 AND m2.batch_number = f.target_batch_number
WHERE m2.id IS NULL;

-- Resolve target medicine id for each mismatch row
ALTER TABLE _batch_fix ADD COLUMN target_medicine_id int;

UPDATE _batch_fix f
SET target_medicine_id = m2.id
FROM medicines m2
WHERE m2.name = f.name
  AND m2.manufacturer = f.manufacturer
  AND m2.batch_number = f.target_batch_number;

-- Re-link GRN item to correct medicine batch row
UPDATE goods_receipt_items gri
SET medicine_id = f.target_medicine_id
FROM _batch_fix f
WHERE gri.id = f.gri_id;

-- Stock transfer: subtract from source, add to target
WITH deltas AS (
  SELECT source_medicine_id AS medicine_id, -SUM(move_qty)::int AS qty_delta
  FROM _batch_fix
  GROUP BY source_medicine_id

  UNION ALL

  SELECT target_medicine_id AS medicine_id, SUM(move_qty)::int AS qty_delta
  FROM _batch_fix
  GROUP BY target_medicine_id
),
agg AS (
  SELECT medicine_id, SUM(qty_delta)::int AS qty_delta
  FROM deltas
  GROUP BY medicine_id
)
UPDATE medicines m
SET quantity = GREATEST(0, COALESCE(m.quantity, 0) + a.qty_delta)
FROM agg a
WHERE m.id = a.medicine_id;

-- Status recalc for impacted rows
UPDATE medicines m
SET status = CASE
  WHEN COALESCE(m.quantity, 0) <= 0 THEN 'Out of Stock'
  WHEN COALESCE(m.quantity, 0) < COALESCE(m.reorder_level, 50) THEN 'Low Stock'
  ELSE 'In Stock'
END
WHERE m.id IN (
  SELECT source_medicine_id FROM _batch_fix
  UNION
  SELECT target_medicine_id FROM _batch_fix
);

COMMIT;

-- Optional hardening indexes (safe, idempotent)
CREATE INDEX IF NOT EXISTS idx_medicines_name_manufacturer_batch
  ON medicines(name, manufacturer, batch_number);

CREATE INDEX IF NOT EXISTS idx_goods_receipt_items_batch
  ON goods_receipt_items(batch_number);
