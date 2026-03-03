import "dotenv/config";
import pkg from "pg";

const { Pool } = pkg;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS goods_receipt_items (
      id SERIAL PRIMARY KEY,
      grn_id INTEGER,
      medicine_id INTEGER NOT NULL,
      medicine_name TEXT,
      batch_number TEXT,
      expiry_date TEXT,
      quantity INTEGER NOT NULL DEFAULT 0,
      free_quantity INTEGER DEFAULT 0,
      scheme_description TEXT,
      rate DECIMAL(10,2) DEFAULT 0,
      gst_rate DECIMAL(5,2) DEFAULT 0,
      tax_amount DECIMAL(10,2) DEFAULT 0,
      total_amount DECIMAL(10,2) DEFAULT 0,
      po_item_id INTEGER,
      location_id INTEGER
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS menus (
      id SERIAL PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      route_path TEXT NOT NULL,
      icon TEXT,
      parent_id INTEGER,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS menu_groups (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS menu_group_menus (
      id SERIAL PRIMARY KEY,
      menu_group_id INTEGER NOT NULL,
      menu_id INTEGER NOT NULL
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_menus (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      menu_id INTEGER NOT NULL,
      can_view BOOLEAN NOT NULL DEFAULT true,
      can_edit BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_menu_groups (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      menu_group_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS state TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS pincode TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS pharmacy_name TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS gst_number TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS drug_license TEXT;`);
  await pool.query(`ALTER TABLE medicines ADD COLUMN IF NOT EXISTS base_unit TEXT DEFAULT 'UNIT';`);
  await pool.query(`ALTER TABLE medicines ADD COLUMN IF NOT EXISTS pack_size INTEGER DEFAULT 1;`);
  await pool.query(`ALTER TABLE medicines ADD COLUMN IF NOT EXISTS price_per_unit DECIMAL(10,2);`);
  await pool.query(`ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS unit_type TEXT DEFAULT 'TABLET';`);
  await pool.query(`ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS display_qty INTEGER DEFAULT 1;`);
  await pool.query(`ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS pack_size INTEGER DEFAULT 1;`);
  await pool.query(`ALTER TABLE sequences ADD COLUMN IF NOT EXISTS name TEXT;`);
  await pool.query(`ALTER TABLE sequences ADD COLUMN IF NOT EXISTS current_value INTEGER NOT NULL DEFAULT 0;`);
  await pool.query(`ALTER TABLE sequences ADD COLUMN IF NOT EXISTS prefix TEXT NOT NULL DEFAULT 'INV';`);
  await pool.query(`ALTER TABLE sequences ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL;`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS sequences_name_unique_idx ON sequences (name);`);
  await pool.query(`INSERT INTO sequences (name, current_value, prefix, updated_at)
    SELECT 'invoice', 0, 'INV', NOW()
    WHERE NOT EXISTS (SELECT 1 FROM sequences WHERE name = 'invoice');`);
  const medicineCountResult = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM medicines;`);
  const medicineCount = Number(medicineCountResult.rows[0]?.count || "0");
  if (medicineCount === 0) {
    await pool.query(`
      INSERT INTO medicines (
        name, batch_number, manufacturer, expiry_date, quantity, price, cost_price, mrp, gst_rate,
        hsn_code, category, status, reorder_level, base_unit, pack_size, price_per_unit
      ) VALUES (
        'GST Test Medicine', 'GST001', 'Test Pharma', '2027-12-31', 100, 100.00, 80.00, 120.00, 12.00,
        '30049099', 'Test', 'In Stock', 10, 'UNIT', 1, 100.00
      );
    `);
  }
  console.log("required missing tables ensured");
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
