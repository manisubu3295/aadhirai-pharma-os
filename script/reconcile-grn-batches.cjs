const { Client } = require("pg");

const mode = process.argv.includes("--apply") ? "apply" : "dry-run";
const connectionString = process.env.DATABASE_URL || "postgresql://postgres:admin123@localhost:5432/aadhirai_pharma_db";

function calcStatus(quantity, reorderLevel) {
  if (quantity <= 0) return "Out of Stock";
  if (quantity < (reorderLevel || 50)) return "Low Stock";
  return "In Stock";
}

function medicineKey(name, manufacturer, batchNumber) {
  return `${name}||${manufacturer}||${batchNumber}`;
}

async function main() {
  const client = new Client({ connectionString });
  await client.connect();

  const mismatches = await client.query(`
    SELECT
      gri.id AS gri_id,
      gri.grn_id,
      gri.medicine_id AS source_medicine_id,
      gri.batch_number,
      COALESCE(gri.quantity, 0) + COALESCE(gri.free_quantity, 0) AS move_qty,
      m.name,
      m.manufacturer,
      m.batch_number AS source_batch,
      m.expiry_date,
      m.reorder_level,
      m.price,
      m.cost_price,
      m.mrp,
      m.gst_rate,
      m.hsn_code,
      m.category,
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
      AND TRIM(gri.batch_number) <> TRIM(m.batch_number)
    ORDER BY gri.id ASC
  `);

  if (mismatches.rows.length === 0) {
    console.log("No mismatched GRN batch links found. Nothing to reconcile.");
    await client.end();
    return;
  }

  const existing = await client.query(`SELECT id,name,manufacturer,batch_number FROM medicines`);
  const medicineByKey = new Map(existing.rows.map((row) => [medicineKey(row.name, row.manufacturer, row.batch_number), row.id]));

  const actions = [];
  for (const row of mismatches.rows) {
    const key = medicineKey(row.name, row.manufacturer, row.batch_number);
    const existingId = medicineByKey.get(key) || null;
    actions.push({
      griId: row.gri_id,
      grnId: row.grn_id,
      sourceMedicineId: row.source_medicine_id,
      sourceBatch: row.source_batch,
      targetBatch: row.batch_number,
      moveQty: Number(row.move_qty || 0),
      existingTargetMedicineId: existingId,
      medicineName: row.name,
      manufacturer: row.manufacturer,
    });
  }

  if (mode === "dry-run") {
    console.log(`Found ${actions.length} mismatched GRN item(s). Dry run only.`);
    console.table(actions);
    await client.end();
    return;
  }

  await client.query("BEGIN");
  try {
    const stockMoves = new Map();
    let createdMedicines = 0;
    let updatedItems = 0;

    for (const row of mismatches.rows) {
      const targetKey = medicineKey(row.name, row.manufacturer, row.batch_number);
      let targetId = medicineByKey.get(targetKey);

      if (!targetId) {
        const inserted = await client.query(
          `INSERT INTO medicines (
            name,batch_number,manufacturer,expiry_date,quantity,price,cost_price,mrp,gst_rate,hsn_code,category,status,reorder_level,barcode,min_stock,max_stock,location_id,base_unit,pack_size,price_per_unit
          ) VALUES (
            $1,$2,$3,$4,0,$5,$6,$7,$8,$9,$10,'Out of Stock',$11,$12,$13,$14,$15,$16,$17,$18
          ) RETURNING id`,
          [
            row.name,
            row.batch_number,
            row.manufacturer,
            row.expiry_date,
            row.price,
            row.cost_price,
            row.mrp,
            row.gst_rate,
            row.hsn_code,
            row.category,
            row.reorder_level,
            row.barcode,
            row.min_stock,
            row.max_stock,
            row.location_id,
            row.base_unit,
            row.pack_size,
            row.price_per_unit,
          ],
        );

        targetId = inserted.rows[0].id;
        medicineByKey.set(targetKey, targetId);
        createdMedicines += 1;
      }

      await client.query(`UPDATE goods_receipt_items SET medicine_id = $1 WHERE id = $2`, [targetId, row.gri_id]);
      updatedItems += 1;

      const moveQty = Number(row.move_qty || 0);
      if (moveQty > 0) {
        const sourceKey = `src:${row.source_medicine_id}`;
        const targetMoveKey = `tgt:${targetId}`;
        stockMoves.set(sourceKey, (stockMoves.get(sourceKey) || 0) - moveQty);
        stockMoves.set(targetMoveKey, (stockMoves.get(targetMoveKey) || 0) + moveQty);
      }
    }

    for (const [key, delta] of stockMoves.entries()) {
      const medicineId = Number(key.split(":")[1]);
      const medicineRes = await client.query(`SELECT id,quantity,reorder_level FROM medicines WHERE id = $1`, [medicineId]);
      if (!medicineRes.rows[0]) continue;

      const currentQty = Number(medicineRes.rows[0].quantity || 0);
      const newQty = currentQty + Number(delta || 0);
      const clampedQty = Math.max(0, newQty);
      const status = calcStatus(clampedQty, Number(medicineRes.rows[0].reorder_level || 50));

      await client.query(`UPDATE medicines SET quantity = $1, status = $2 WHERE id = $3`, [clampedQty, status, medicineId]);
    }

    await client.query(`UPDATE medicines SET quantity = 0, status = 'Out of Stock' WHERE quantity < 0`);

    await client.query("COMMIT");

    console.log("Batch reconciliation completed.");
    console.log(
      JSON.stringify(
        {
          mismatchesFound: mismatches.rows.length,
          goodsReceiptItemsUpdated: updatedItems,
          medicinesCreated: createdMedicines,
          medicinesAdjusted: stockMoves.size,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Reconciliation failed:", error);
  process.exit(1);
});
