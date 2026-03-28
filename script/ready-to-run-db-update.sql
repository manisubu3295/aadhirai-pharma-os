BEGIN;

ALTER TABLE medicines
  ADD COLUMN IF NOT EXISTS generic_name TEXT,
  ADD COLUMN IF NOT EXISTS sku_name TEXT;

CREATE TABLE IF NOT EXISTS generic_names (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_generic_names_name_lower
  ON generic_names (LOWER(name));

INSERT INTO generic_names (name, is_active, created_at, updated_at)
SELECT DISTINCT
  TRIM(m.generic_name) AS name,
  TRUE AS is_active,
  NOW() AS created_at,
  NOW() AS updated_at
FROM medicines m
WHERE COALESCE(TRIM(m.generic_name), '') <> ''
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  IF to_regclass('public.purchase_order_items') IS NOT NULL THEN
    ALTER TABLE purchase_order_items
      ADD COLUMN IF NOT EXISTS quantity INTEGER,
      ADD COLUMN IF NOT EXISTS received_qty INTEGER,
      ADD COLUMN IF NOT EXISTS units_per_strip INTEGER,
      ADD COLUMN IF NOT EXISTS unit_type TEXT,
      ADD COLUMN IF NOT EXISTS gst_rate DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS ordered_qty_base INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS received_qty_base INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS pending_qty_base INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS line_status TEXT NOT NULL DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS conversion_factor_snapshot INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS unit_snapshot TEXT NOT NULL DEFAULT 'STRIP',
      ADD COLUMN IF NOT EXISTS gst_percent_snapshot DECIMAL(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS tax_mode TEXT NOT NULL DEFAULT 'EXCLUSIVE';

    UPDATE purchase_order_items
    SET
      conversion_factor_snapshot = GREATEST(COALESCE(units_per_strip, 1), 1),
      unit_snapshot = COALESCE(unit_type, 'STRIP'),
      ordered_qty_base = CASE
        WHEN UPPER(COALESCE(unit_type, 'STRIP')) = 'STRIP'
          THEN COALESCE(quantity, 0) * GREATEST(COALESCE(units_per_strip, 1), 1)
        ELSE COALESCE(quantity, 0)
      END,
      received_qty_base = CASE
        WHEN UPPER(COALESCE(unit_type, 'STRIP')) = 'STRIP'
          THEN COALESCE(received_qty, 0) * GREATEST(COALESCE(units_per_strip, 1), 1)
        ELSE COALESCE(received_qty, 0)
      END,
      pending_qty_base = GREATEST(
        CASE
          WHEN UPPER(COALESCE(unit_type, 'STRIP')) = 'STRIP'
            THEN COALESCE(quantity, 0) * GREATEST(COALESCE(units_per_strip, 1), 1)
          ELSE COALESCE(quantity, 0)
        END
        -
        CASE
          WHEN UPPER(COALESCE(unit_type, 'STRIP')) = 'STRIP'
            THEN COALESCE(received_qty, 0) * GREATEST(COALESCE(units_per_strip, 1), 1)
          ELSE COALESCE(received_qty, 0)
        END,
        0
      ),
      line_status = CASE
        WHEN COALESCE(received_qty, 0) <= 0 THEN 'PENDING'
        WHEN COALESCE(received_qty, 0) >= COALESCE(quantity, 0) THEN 'COMPLETED'
        ELSE 'PARTIAL'
      END,
      gst_percent_snapshot = COALESCE(gst_rate, 0);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.goods_receipt_items') IS NOT NULL THEN
    ALTER TABLE goods_receipt_items
      ADD COLUMN IF NOT EXISTS po_id INTEGER,
      ADD COLUMN IF NOT EXISTS po_line_id INTEGER,
      ADD COLUMN IF NOT EXISTS po_item_id INTEGER,
      ADD COLUMN IF NOT EXISTS quantity INTEGER,
      ADD COLUMN IF NOT EXISTS free_quantity INTEGER,
      ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS units_per_strip INTEGER,
      ADD COLUMN IF NOT EXISTS pack_size INTEGER,
      ADD COLUMN IF NOT EXISTS location_id INTEGER,
      ADD COLUMN IF NOT EXISTS display_qty INTEGER,
      ADD COLUMN IF NOT EXISTS mrp DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS purchase_unit TEXT,
      ADD COLUMN IF NOT EXISTS unit_type TEXT,
      ADD COLUMN IF NOT EXISTS gst_rate DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS rate DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS received_qty_base INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS free_qty_base INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS inward_qty_base INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS conversion_factor_snapshot INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS gst_percent_snapshot DECIMAL(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS tax_mode TEXT NOT NULL DEFAULT 'EXCLUSIVE',
      ADD COLUMN IF NOT EXISTS ptr DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS purchase_rate_snapshot DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS default_sale_rate_snapshot DECIMAL(10,2);

    UPDATE goods_receipt_items
    SET
      po_line_id = COALESCE(po_line_id, po_item_id),
      conversion_factor_snapshot = GREATEST(COALESCE(units_per_strip, pack_size, 1), 1),
      received_qty_base = CASE
        WHEN UPPER(COALESCE(purchase_unit, unit_type, 'STRIP')) = 'STRIP'
          THEN COALESCE(quantity, 0) * GREATEST(COALESCE(units_per_strip, pack_size, 1), 1)
        ELSE COALESCE(quantity, 0)
      END,
      free_qty_base = CASE
        WHEN UPPER(COALESCE(purchase_unit, unit_type, 'STRIP')) = 'STRIP'
          THEN COALESCE(free_quantity, 0) * GREATEST(COALESCE(units_per_strip, pack_size, 1), 1)
        ELSE COALESCE(free_quantity, 0)
      END,
      inward_qty_base =
        CASE
          WHEN UPPER(COALESCE(purchase_unit, unit_type, 'STRIP')) = 'STRIP'
            THEN COALESCE(quantity, 0) * GREATEST(COALESCE(units_per_strip, pack_size, 1), 1)
          ELSE COALESCE(quantity, 0)
        END
        +
        CASE
          WHEN UPPER(COALESCE(purchase_unit, unit_type, 'STRIP')) = 'STRIP'
            THEN COALESCE(free_quantity, 0) * GREATEST(COALESCE(units_per_strip, pack_size, 1), 1)
          ELSE COALESCE(free_quantity, 0)
        END,
      gst_percent_snapshot = COALESCE(gst_rate, 0),
      purchase_rate_snapshot = COALESCE(purchase_rate_snapshot, rate),
      default_sale_rate_snapshot = COALESCE(default_sale_rate_snapshot, selling_price);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.sale_items') IS NOT NULL THEN
    ALTER TABLE sale_items
      ADD COLUMN IF NOT EXISTS hsn_code TEXT,
      ADD COLUMN IF NOT EXISTS unit_type TEXT,
      ADD COLUMN IF NOT EXISTS display_qty INTEGER,
      ADD COLUMN IF NOT EXISTS pack_size INTEGER,
      ADD COLUMN IF NOT EXISTS sold_unit_qty INTEGER,
      ADD COLUMN IF NOT EXISTS sold_qty_base INTEGER,
      ADD COLUMN IF NOT EXISTS conversion_factor_snapshot INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS tax_mode TEXT NOT NULL DEFAULT 'EXCLUSIVE';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS inventory_batches (
  id SERIAL PRIMARY KEY,
  medicine_id INTEGER NOT NULL,
  warehouse_id INTEGER,
  batch_number TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  grn_id INTEGER,
  grn_item_id INTEGER,
  purchase_rate_snapshot DECIMAL(10,2),
  ptr_snapshot DECIMAL(10,2),
  mrp_snapshot DECIMAL(10,2),
  default_sale_rate_snapshot DECIMAL(10,2),
  gst_percent_snapshot DECIMAL(5,2) DEFAULT 0,
  tax_mode TEXT NOT NULL DEFAULT 'EXCLUSIVE',
  unit_snapshot TEXT NOT NULL DEFAULT 'STRIP',
  conversion_factor_snapshot INTEGER NOT NULL DEFAULT 1,
  total_inward_qty_base INTEGER NOT NULL DEFAULT 0,
  total_outward_qty_base INTEGER NOT NULL DEFAULT 0,
  available_qty_base INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_inventory_batch UNIQUE (medicine_id, warehouse_id, batch_number, expiry_date)
);

CREATE INDEX IF NOT EXISTS idx_inventory_batches_fefo
  ON inventory_batches (medicine_id, warehouse_id, expiry_date, available_qty_base)
  WHERE available_qty_base > 0;

CREATE TABLE IF NOT EXISTS inventory_ledger (
  id SERIAL PRIMARY KEY,
  medicine_id INTEGER NOT NULL,
  warehouse_id INTEGER,
  batch_id INTEGER,
  txn_type TEXT NOT NULL,
  txn_source TEXT NOT NULL,
  source_id INTEGER,
  source_line_id INTEGER,
  qty_base INTEGER NOT NULL,
  balance_after_base INTEGER,
  unit_snapshot TEXT NOT NULL DEFAULT 'TABLET',
  conversion_factor_snapshot INTEGER NOT NULL DEFAULT 1,
  purchase_rate_snapshot DECIMAL(10,2),
  ptr_snapshot DECIMAL(10,2),
  mrp_snapshot DECIMAL(10,2),
  gst_percent_snapshot DECIMAL(5,2) DEFAULT 0,
  tax_mode_snapshot TEXT NOT NULL DEFAULT 'EXCLUSIVE',
  remarks TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_ledger_source
  ON inventory_ledger (txn_source, source_id, source_line_id);

CREATE TABLE IF NOT EXISTS sale_batch_allocations (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER NOT NULL,
  sale_item_id INTEGER NOT NULL,
  medicine_id INTEGER NOT NULL,
  warehouse_id INTEGER,
  batch_id INTEGER NOT NULL,
  batch_number TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  requested_qty INTEGER NOT NULL,
  requested_unit TEXT NOT NULL,
  sold_qty_base INTEGER NOT NULL,
  conversion_factor_snapshot INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sale_batch_allocations_sale
  ON sale_batch_allocations (sale_id, medicine_id);

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id SERIAL PRIMARY KEY,
  medicine_id INTEGER NOT NULL,
  medicine_name TEXT NOT NULL,
  batch_number TEXT NOT NULL,
  adjustment_qty INTEGER NOT NULL,
  adjustment_type TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  notes TEXT,
  created_by_user_id VARCHAR(255) NOT NULL,
  created_by_user_name TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF to_regclass('public.stock_adjustments') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'stock_adjustments'
        AND column_name = 'quantity'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'stock_adjustments'
        AND column_name = 'adjustment_qty'
    ) THEN
      ALTER TABLE stock_adjustments RENAME COLUMN quantity TO adjustment_qty;
    END IF;

    ALTER TABLE stock_adjustments
      ADD COLUMN IF NOT EXISTS medicine_id INTEGER,
      ADD COLUMN IF NOT EXISTS medicine_name TEXT,
      ADD COLUMN IF NOT EXISTS batch_number TEXT,
      ADD COLUMN IF NOT EXISTS adjustment_qty INTEGER,
      ADD COLUMN IF NOT EXISTS adjustment_type TEXT,
      ADD COLUMN IF NOT EXISTS reason_code TEXT,
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS created_by_user_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS created_by_user_name TEXT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();

    UPDATE stock_adjustments
    SET adjustment_qty = 0
    WHERE adjustment_qty IS NULL;
  END IF;
END $$;

INSERT INTO inventory_batches (
  medicine_id,
  warehouse_id,
  batch_number,
  expiry_date,
  purchase_rate_snapshot,
  ptr_snapshot,
  mrp_snapshot,
  default_sale_rate_snapshot,
  gst_percent_snapshot,
  tax_mode,
  unit_snapshot,
  conversion_factor_snapshot,
  total_inward_qty_base,
  total_outward_qty_base,
  available_qty_base
)
SELECT
  m.id AS medicine_id,
  NULL::INTEGER AS warehouse_id,
  COALESCE(NULLIF(TRIM(m.batch_number), ''), CONCAT('LEGACY-', m.id::TEXT)) AS batch_number,
  COALESCE(NULLIF(TRIM(m.expiry_date), ''), '2099-12-31') AS expiry_date,
  m.cost_price AS purchase_rate_snapshot,
  NULL::DECIMAL(10,2) AS ptr_snapshot,
  m.mrp AS mrp_snapshot,
  m.price AS default_sale_rate_snapshot,
  COALESCE(m.gst_rate, 0) AS gst_percent_snapshot,
  'EXCLUSIVE' AS tax_mode,
  CASE
    WHEN UPPER(COALESCE(m.base_unit, 'TABLET')) IN ('STRIP', 'TABLET', 'BOTTLE') THEN UPPER(COALESCE(m.base_unit, 'TABLET'))
    ELSE 'TABLET'
  END AS unit_snapshot,
  GREATEST(COALESCE(m.pack_size, 1), 1) AS conversion_factor_snapshot,
  GREATEST(COALESCE(m.quantity, 0), 0) AS total_inward_qty_base,
  0 AS total_outward_qty_base,
  GREATEST(COALESCE(m.quantity, 0), 0) AS available_qty_base
FROM medicines m
LEFT JOIN (
  SELECT medicine_id, COUNT(*)::INT AS batch_count
  FROM inventory_batches
  GROUP BY medicine_id
) ib ON ib.medicine_id = m.id
WHERE COALESCE(m.quantity, 0) > 0
  AND COALESCE(ib.batch_count, 0) = 0;

COMMIT;
