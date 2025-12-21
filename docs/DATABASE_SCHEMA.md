# Pharmacy Management System - Database Schema & Sample Data

## Document Information
- **Generated**: December 21, 2025
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM

---

## Table of Contents
1. [Users & Authentication](#1-users--authentication)
2. [Inventory & Medicines](#2-inventory--medicines)
3. [Customers & Doctors](#3-customers--doctors)
4. [Sales & Billing](#4-sales--billing)
5. [Sales Returns](#5-sales-returns)
6. [Suppliers & Procurement](#6-suppliers--procurement)
7. [Goods Receipts](#7-goods-receipts)
8. [Purchase Returns](#8-purchase-returns)
9. [Credit & Payments](#9-credit--payments)
10. [Day Closing & Shifts](#10-day-closing--shifts)
11. [Audit & Activity Logs](#11-audit--activity-logs)
12. [Menu & Access Control](#12-menu--access-control)
13. [Approvals & Stock Adjustments](#13-approvals--stock-adjustments)
14. [Expenses](#14-expenses)
15. [Other Tables](#15-other-tables)

---

## 1. Users & Authentication

### Table: `users`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | VARCHAR | PRIMARY KEY | gen_random_uuid() | User unique identifier |
| username | TEXT | NOT NULL, UNIQUE | - | Login username |
| password | TEXT | NOT NULL | - | Hashed password |
| name | TEXT | NOT NULL | '' | Display name |
| role | TEXT | NOT NULL | 'staff' | Role: owner/admin/pharmacist/cashier/staff |
| email | TEXT | - | - | Email address |
| phone | TEXT | - | - | Phone number |
| photo_url | TEXT | - | - | Profile photo URL |
| address | TEXT | - | - | Address |
| city | TEXT | - | - | City |
| state | TEXT | - | - | State |
| pincode | TEXT | - | - | Postal code |
| pharmacy_name | TEXT | - | - | Pharmacy name |
| gst_number | TEXT | - | - | GST registration number |
| drug_license | TEXT | - | - | Drug license number |
| is_active | BOOLEAN | NOT NULL | true | Active status |
| created_at | TIMESTAMP | NOT NULL | NOW() | Creation timestamp |

#### Sample Data: users
| id | username | name | role | is_active |
|----|----------|------|------|-----------|
| 555de337-5f4c-47d9-b1de-888de09d8da2 | cashier | Anand Patel | cashier | true |
| 2d5d63f8-8fb8-4f2b-b059-bb91dbfe5444 | owner | AADHIRAI | owner | true |
| 5b809c4e-17a9-46c1-874d-d0d6da9ca881 | test001 | Test user | pharmacist | true |
| 61229afa-2dd9-4250-a105-d18b4d00bec5 | pharmacist | Dr. Priya Sharma | pharmacist | true |

---

## 2. Inventory & Medicines

### Table: `medicines`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | Medicine ID |
| name | TEXT | NOT NULL | - | Medicine name |
| batch_number | TEXT | NOT NULL | - | Batch number |
| manufacturer | TEXT | NOT NULL | - | Manufacturer name |
| expiry_date | TEXT | NOT NULL | - | Expiry date (YYYY-MM-DD) |
| quantity | INTEGER | NOT NULL | 0 | Current stock quantity |
| price | DECIMAL(10,2) | NOT NULL | - | Selling price |
| cost_price | DECIMAL(10,2) | - | - | Cost/purchase price |
| mrp | DECIMAL(10,2) | - | - | Maximum retail price |
| gst_rate | DECIMAL(5,2) | NOT NULL | 18 | GST rate percentage |
| hsn_code | TEXT | - | - | HSN code |
| category | TEXT | NOT NULL | - | Medicine category |
| status | TEXT | NOT NULL | 'In Stock' | Stock status |
| reorder_level | INTEGER | NOT NULL | 50 | Reorder level threshold |
| barcode | TEXT | - | - | Barcode |
| min_stock | INTEGER | - | 10 | Minimum stock level |
| max_stock | INTEGER | - | 500 | Maximum stock level |
| location_id | INTEGER | - | - | FK to locations |
| base_unit | TEXT | - | 'UNIT' | Base unit of measure |
| pack_size | INTEGER | - | 1 | Pack size |
| price_per_unit | DECIMAL(10,2) | - | - | Price per individual unit |

#### Sample Data: medicines
| id | name | batch_number | quantity | price | category |
|----|------|--------------|----------|-------|----------|
| 2 | Paracetamol 500mg | PCM-2024-089 | 5000 | 3.00 | Analgesics |
| 4 | Cetirizine 10mg | CTZ-2024-045 | 800 | 4.20 | Antihistamines |
| 5 | Metformin 500mg | MET-2024-022 | 0 | 8.00 | Antidiabetic |
| 6 | Omeprazole 20mg | OMP-2024-331 | 320 | 15.00 | Gastrointestinal |
| 8 | Paracetamol 500mg | PCM001 | 500 | 2.50 | Antipyretic |
| 9 | Paracetamol 500mg | PCM002 | 50 | 2.50 | Antipyretic |
| 13 | Omeprazole 20mg | OMP001 | 150 | 5.00 | Antacid |
| 15 | Metformin 500mg | MTF001 | 400 | 4.00 | Antidiabetic |
| 18 | Vitamin D3 60K IU | VTD001 | 40 | 35.00 | Vitamin |
| 20 | Test Medicine | TEST-001 | 100 | 50.00 | Tablets |

### Table: `locations`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | Location ID |
| rack | TEXT | NOT NULL | - | Rack identifier |
| row | TEXT | NOT NULL | - | Row identifier |
| bin | TEXT | NOT NULL | - | Bin identifier |
| description | TEXT | - | - | Location description |
| created_at | TIMESTAMP | NOT NULL | NOW() | Creation timestamp |

---

## 3. Customers & Doctors

### Table: `customers`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | Customer ID |
| name | TEXT | NOT NULL | - | Customer name |
| phone | TEXT | - | - | Phone number |
| email | TEXT | - | - | Email address |
| address | TEXT | - | - | Address |
| gstin | TEXT | - | - | GST identification number |
| credit_limit | DECIMAL(10,2) | - | 0 | Credit limit |
| outstanding_balance | DECIMAL(10,2) | - | 0 | Current outstanding balance |
| credit_period_days | INTEGER | - | 30 | Credit period in days |
| created_at | TIMESTAMP | NOT NULL | NOW() | Creation timestamp |

#### Sample Data: customers
| id | name | phone | credit_limit | outstanding_balance |
|----|------|-------|--------------|---------------------|
| 1 | Suresh Menon | 9898989898 | 10000.00 | 134.00 |
| 2 | Lakshmi Devi | 9797979797 | 0.00 | 74.00 |
| 3 | Mohammed Ismail | 9696969696 | 0.00 | 0.00 |
| 4 | Radha Krishnan | 9595959595 | 0.00 | 94.00 |
| 5 | Kavitha Sundaram | 9494949494 | 0.00 | 94.00 |
| 6 | Aadhirai Poonthendral | 99999999 | 0.00 | 282.00 |
| 7 | Helo | 1233333333 | 0.00 | 134.00 |

### Table: `doctors`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | Doctor ID |
| name | TEXT | NOT NULL | - | Doctor name |
| specialization | TEXT | - | - | Medical specialization |
| phone | TEXT | - | - | Phone number |
| registration_no | TEXT | - | - | Medical registration number |
| created_at | TIMESTAMP | NOT NULL | NOW() | Creation timestamp |

---

## 4. Sales & Billing

### Table: `sales`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | Sale ID |
| invoice_no | TEXT | - | - | Invoice number |
| customer_id | INTEGER | - | - | FK to customers |
| customer_name | TEXT | NOT NULL | - | Customer name |
| customer_phone | TEXT | - | - | Customer phone |
| customer_gstin | TEXT | - | - | Customer GSTIN |
| doctor_id | INTEGER | - | - | FK to doctors |
| doctor_name | TEXT | - | - | Doctor name |
| prescription_url | TEXT | - | - | Prescription image URL |
| subtotal | DECIMAL(10,2) | NOT NULL | - | Subtotal before tax/discount |
| discount | DECIMAL(10,2) | NOT NULL | 0 | Discount amount |
| discount_percent | DECIMAL(5,2) | - | 0 | Discount percentage |
| cgst | DECIMAL(10,2) | NOT NULL | 0 | CGST amount |
| sgst | DECIMAL(10,2) | NOT NULL | 0 | SGST amount |
| igst | DECIMAL(10,2) | - | 0 | IGST amount |
| tax | DECIMAL(10,2) | NOT NULL | - | Total tax amount |
| total | DECIMAL(10,2) | NOT NULL | - | Grand total |
| round_off | DECIMAL(10,2) | - | 0 | Round off amount |
| payment_method | TEXT | NOT NULL | - | Payment method (cash/upi/card/credit) |
| payment_reference | TEXT | - | - | Payment reference number |
| received_amount | DECIMAL(10,2) | NOT NULL | 0 | Amount received |
| change_amount | DECIMAL(10,2) | - | 0 | Change given |
| status | TEXT | NOT NULL | 'Completed' | Sale status |
| print_invoice | BOOLEAN | NOT NULL | false | Print invoice flag |
| send_via_email | BOOLEAN | NOT NULL | false | Email invoice flag |
| user_id | VARCHAR | - | - | FK to users (created by) |
| created_at | TIMESTAMP | NOT NULL | NOW() | Creation timestamp |

#### Sample Data: sales
| id | invoice_no | customer_name | total | payment_method | status | created_at |
|----|------------|---------------|-------|----------------|--------|------------|
| 35 | INV-5 | Suresh Menon | 94.00 | cash | Completed | 2025-12-13 |
| 34 | INV-4 | Helo | 1116.00 | cash | Completed | 2025-12-12 |
| 33 | INV-3 | Lakshmi Devi | 94.00 | upi | Completed | 2025-12-12 |
| 32 | INV-2 | Lakshmi Devi | 84.00 | cash | Completed | 2025-12-12 |
| 31 | INV-1 | Kavitha Sundaram | 94.00 | credit | Completed | 2025-12-12 |
| 30 | INV-1765575906523 | Helo | 84.00 | cash | Completed | 2025-12-12 |
| 29 | INV-1765560388929 | Suresh Menon | 134.00 | credit | Completed | 2025-12-12 |
| 28 | INV-1765560368434 | Lakshmi Devi | 94.00 | credit | Completed | 2025-12-12 |
| 27 | INV-1765560187026 | Radha Krishnan | 94.00 | credit | Completed | 2025-12-12 |
| 26 | INV-1765559964399 | Helo | 134.00 | credit | Completed | 2025-12-12 |

### Table: `sale_items`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | Sale item ID |
| sale_id | INTEGER | NOT NULL | - | FK to sales |
| medicine_id | INTEGER | NOT NULL | - | FK to medicines |
| medicine_name | TEXT | NOT NULL | - | Medicine name |
| batch_number | TEXT | NOT NULL | - | Batch number |
| expiry_date | TEXT | NOT NULL | - | Expiry date |
| hsn_code | TEXT | - | - | HSN code |
| quantity | INTEGER | NOT NULL | - | Quantity sold |
| price | DECIMAL(10,2) | NOT NULL | - | Unit price |
| mrp | DECIMAL(10,2) | - | - | MRP |
| gst_rate | DECIMAL(5,2) | NOT NULL | 18 | GST rate |
| cgst | DECIMAL(10,2) | - | 0 | CGST amount |
| sgst | DECIMAL(10,2) | - | 0 | SGST amount |
| discount | DECIMAL(10,2) | NOT NULL | 0 | Discount amount |
| total | DECIMAL(10,2) | NOT NULL | - | Line total |
| unit_type | TEXT | - | 'TABLET' | Unit type |
| display_qty | INTEGER | - | 1 | Display quantity |
| pack_size | INTEGER | - | 1 | Pack size |

---

## 5. Sales Returns

### Table: `sales_returns`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | Return ID |
| original_sale_id | INTEGER | NOT NULL | - | FK to original sale |
| invoice_no | TEXT | - | - | Return invoice number |
| return_date | TIMESTAMP | NOT NULL | NOW() | Return date |
| total_refund_amount | DECIMAL(10,2) | NOT NULL | - | Total refund amount |
| refund_mode | TEXT | NOT NULL | - | Refund mode (cash/credit) |
| reason | TEXT | - | - | Return reason |
| customer_id | INTEGER | - | - | FK to customers |
| customer_name | TEXT | - | - | Customer name |
| user_id | VARCHAR | - | - | FK to users |
| created_at | TIMESTAMP | NOT NULL | NOW() | Creation timestamp |

### Table: `sales_return_items`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | Return item ID |
| sales_return_id | INTEGER | NOT NULL | - | FK to sales_returns |
| sale_item_id | INTEGER | NOT NULL | - | FK to original sale_items |
| medicine_id | INTEGER | NOT NULL | - | FK to medicines |
| medicine_name | TEXT | NOT NULL | - | Medicine name |
| batch_number | TEXT | NOT NULL | - | Batch number |
| quantity_returned | INTEGER | NOT NULL | - | Quantity returned |
| price_per_unit | DECIMAL(10,2) | NOT NULL | - | Price per unit |
| refund_amount | DECIMAL(10,2) | NOT NULL | - | Refund amount |

---

## 6. Suppliers & Procurement

### Table: `suppliers`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | Supplier ID |
| name | TEXT | NOT NULL | - | Supplier name |
| code | TEXT | NOT NULL, UNIQUE | - | Supplier code |
| contact_person | TEXT | - | - | Contact person name |
| phone | TEXT | - | - | Phone number |
| email | TEXT | - | - | Email address |
| address | TEXT | - | - | Address |
| gstin | TEXT | - | - | GSTIN |
| pan_number | TEXT | - | - | PAN number |
| payment_terms_days | INTEGER | - | 30 | Payment terms in days |
| bank_name | TEXT | - | - | Bank name |
| bank_account | TEXT | - | - | Bank account number |
| ifsc_code | TEXT | - | - | Bank IFSC code |
| is_active | BOOLEAN | NOT NULL | true | Active status |
| created_at | TIMESTAMP | NOT NULL | NOW() | Creation timestamp |

### Table: `supplier_rates`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | Rate ID |
| supplier_id | INTEGER | NOT NULL | - | FK to suppliers |
| medicine_id | INTEGER | NOT NULL | - | FK to medicines |
| rate | DECIMAL(10,2) | NOT NULL | - | Purchase rate |
| mrp | DECIMAL(10,2) | - | - | MRP |
| discount_percent | DECIMAL(5,2) | - | 0 | Discount percentage |
| gst_rate | DECIMAL(5,2) | - | 18 | GST rate |
| min_order_qty | INTEGER | - | 1 | Minimum order quantity |
| lead_time_days | INTEGER | - | 3 | Lead time in days |
| is_active | BOOLEAN | NOT NULL | true | Active status |
| created_at | TIMESTAMP | NOT NULL | NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | NOW() | Last update timestamp |

### Table: `purchase_orders`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | PO ID |
| po_number | TEXT | NOT NULL, UNIQUE | - | PO number |
| supplier_id | INTEGER | NOT NULL | - | FK to suppliers |
| supplier_name | TEXT | NOT NULL | - | Supplier name |
| order_date | TIMESTAMP | NOT NULL | NOW() | Order date |
| expected_delivery_date | TIMESTAMP | - | - | Expected delivery date |
| status | TEXT | NOT NULL | 'Draft' | PO status |
| subtotal | DECIMAL(10,2) | NOT NULL | 0 | Subtotal |
| tax_amount | DECIMAL(10,2) | NOT NULL | 0 | Tax amount |
| discount_amount | DECIMAL(10,2) | - | 0 | Discount amount |
| total_amount | DECIMAL(10,2) | NOT NULL | 0 | Total amount |
| notes | TEXT | - | - | Notes |
| created_by | VARCHAR | - | - | FK to users |
| created_at | TIMESTAMP | NOT NULL | NOW() | Creation timestamp |

### Table: `purchase_order_items`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | PO item ID |
| po_id | INTEGER | NOT NULL | - | FK to purchase_orders |
| medicine_id | INTEGER | NOT NULL | - | FK to medicines |
| medicine_name | TEXT | NOT NULL | - | Medicine name |
| supplier_rate_id | INTEGER | - | - | FK to supplier_rates |
| quantity | INTEGER | NOT NULL | - | Order quantity |
| received_qty | INTEGER | NOT NULL | 0 | Received quantity |
| rate | DECIMAL(10,2) | NOT NULL | - | Unit rate |
| mrp | DECIMAL(10,2) | - | - | MRP |
| gst_rate | DECIMAL(5,2) | - | 18 | GST rate |
| discount_percent | DECIMAL(5,2) | - | 0 | Discount percentage |
| tax_amount | DECIMAL(10,2) | - | 0 | Tax amount |
| total_amount | DECIMAL(10,2) | NOT NULL | - | Line total |

---

## 7. Goods Receipts

### Table: `goods_receipts`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | GRN ID |
| grn_number | TEXT | NOT NULL, UNIQUE | - | GRN number |
| po_id | INTEGER | - | - | FK to purchase_orders |
| supplier_id | INTEGER | NOT NULL | - | FK to suppliers |
| supplier_name | TEXT | NOT NULL | - | Supplier name |
| supplier_invoice_no | TEXT | - | - | Supplier invoice number |
| supplier_invoice_date | TIMESTAMP | - | - | Supplier invoice date |
| receipt_date | TIMESTAMP | NOT NULL | NOW() | Receipt date |
| status | TEXT | NOT NULL | 'Completed' | GRN status |
| subtotal | DECIMAL(10,2) | NOT NULL | 0 | Subtotal |
| tax_amount | DECIMAL(10,2) | NOT NULL | 0 | Tax amount |
| total_amount | DECIMAL(10,2) | NOT NULL | 0 | Total amount |
| notes | TEXT | - | - | Notes |
| received_by | VARCHAR | - | - | FK to users |
| created_at | TIMESTAMP | NOT NULL | NOW() | Creation timestamp |

### Table: `goods_receipt_items`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | GRN item ID |
| grn_id | INTEGER | NOT NULL | - | FK to goods_receipts |
| po_item_id | INTEGER | - | - | FK to purchase_order_items |
| medicine_id | INTEGER | NOT NULL | - | FK to medicines |
| medicine_name | TEXT | NOT NULL | - | Medicine name |
| batch_number | TEXT | NOT NULL | - | Batch number |
| expiry_date | TEXT | NOT NULL | - | Expiry date |
| quantity | INTEGER | NOT NULL | - | Received quantity |
| free_quantity | INTEGER | - | 0 | Free quantity |
| scheme_description | TEXT | - | - | Scheme description |
| rate | DECIMAL(10,2) | NOT NULL | - | Unit rate |
| mrp | DECIMAL(10,2) | - | - | MRP |
| gst_rate | DECIMAL(5,2) | - | 18 | GST rate |
| tax_amount | DECIMAL(10,2) | - | 0 | Tax amount |
| total_amount | DECIMAL(10,2) | NOT NULL | - | Line total |
| pack_size | INTEGER | - | 1 | Pack size |
| unit_type | TEXT | - | 'STRIP' | Unit type |
| display_qty | INTEGER | - | - | Display quantity |
| location_id | INTEGER | - | - | FK to locations |

---

## 8. Purchase Returns

### Table: `purchase_returns`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | Return ID |
| return_number | TEXT | NOT NULL, UNIQUE | - | Return number |
| supplier_id | INTEGER | NOT NULL | - | FK to suppliers |
| supplier_name | TEXT | NOT NULL | - | Supplier name |
| original_grn_id | INTEGER | - | - | FK to original GRN |
| return_date | TIMESTAMP | NOT NULL | NOW() | Return date |
| subtotal | DECIMAL(10,2) | NOT NULL | 0 | Subtotal |
| tax_amount | DECIMAL(10,2) | NOT NULL | 0 | Tax amount |
| total_amount | DECIMAL(10,2) | NOT NULL | 0 | Total amount |
| reason | TEXT | - | - | Return reason |
| status | TEXT | NOT NULL | 'Completed' | Return status |
| created_by_user_id | VARCHAR | - | - | FK to users |
| created_at | TIMESTAMP | NOT NULL | NOW() | Creation timestamp |

### Table: `purchase_return_items`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | Return item ID |
| purchase_return_id | INTEGER | NOT NULL | - | FK to purchase_returns |
| grn_item_id | INTEGER | - | - | FK to goods_receipt_items |
| medicine_id | INTEGER | NOT NULL | - | FK to medicines |
| medicine_name | TEXT | NOT NULL | - | Medicine name |
| batch_number | TEXT | NOT NULL | - | Batch number |
| expiry_date | TEXT | NOT NULL | - | Expiry date |
| quantity_returned | INTEGER | NOT NULL | - | Quantity returned |
| rate | DECIMAL(10,2) | NOT NULL | - | Unit rate |
| gst_rate | DECIMAL(5,2) | - | 18 | GST rate |
| tax_amount | DECIMAL(10,2) | - | 0 | Tax amount |
| total_amount | DECIMAL(10,2) | NOT NULL | - | Line total |

---

## 9. Credit & Payments

### Table: `credit_payments`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | Payment ID |
| sale_id | INTEGER | NOT NULL | - | FK to sales |
| customer_id | INTEGER | NOT NULL | - | FK to customers |
| amount | DECIMAL(10,2) | NOT NULL | - | Payment amount |
| payment_method | TEXT | NOT NULL | - | Payment method |
| notes | TEXT | - | - | Payment notes |
| user_id | VARCHAR | - | - | FK to users |
| created_at | TIMESTAMP | NOT NULL | NOW() | Creation timestamp |

### Table: `supplier_transactions`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | Transaction ID |
| supplier_id | INTEGER | NOT NULL | - | FK to suppliers |
| type | TEXT | NOT NULL | - | Transaction type |
| reference_id | INTEGER | - | - | Reference ID |
| reference_number | TEXT | - | - | Reference number |
| txn_date | TIMESTAMP | NOT NULL | NOW() | Transaction date |
| debit_amount | DECIMAL(10,2) | - | 0 | Debit amount |
| credit_amount | DECIMAL(10,2) | - | 0 | Credit amount |
| remarks | TEXT | - | - | Remarks |
| created_by_user_id | VARCHAR | - | - | FK to users |
| created_at | TIMESTAMP | NOT NULL | NOW() | Creation timestamp |

### Table: `supplier_payments`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | Payment ID |
| supplier_id | INTEGER | NOT NULL | - | FK to suppliers |
| payment_date | TIMESTAMP | NOT NULL | NOW() | Payment date |
| amount | DECIMAL(10,2) | NOT NULL | - | Payment amount |
| payment_mode | TEXT | NOT NULL | - | Payment mode |
| reference_no | TEXT | - | - | Reference number |
| remarks | TEXT | - | - | Remarks |
| created_by_user_id | VARCHAR | - | - | FK to users |
| created_at | TIMESTAMP | NOT NULL | NOW() | Creation timestamp |

---

## 10. Day Closing & Shifts

### Table: `day_closings`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | Day closing ID |
| business_date | TEXT | NOT NULL, UNIQUE | - | Business date (YYYY-MM-DD) |
| opened_by_user_id | VARCHAR | - | - | FK to users (opened by) |
| opening_cash | DECIMAL(10,2) | - | 0 | Opening cash amount |
| opening_time | TIMESTAMP | - | - | Shift open time |
| closed_by_user_id | VARCHAR | - | - | FK to users (closed by) |
| expected_cash | DECIMAL(10,2) | - | - | Expected cash at closing |
| actual_cash | DECIMAL(10,2) | - | - | Actual cash counted |
| difference | DECIMAL(10,2) | - | - | Cash difference |
| closing_time | TIMESTAMP | - | - | Shift close time |
| notes | TEXT | - | - | Closing notes |
| status | TEXT | NOT NULL | 'OPEN' | Status: OPEN/CLOSED |
| created_at | TIMESTAMP | NOT NULL | NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | NOW() | Last update timestamp |

---

## 11. Audit & Activity Logs

### Table: `audit_logs`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | Log ID |
| action | TEXT | NOT NULL | - | Action performed |
| entity_type | TEXT | NOT NULL | - | Entity type |
| entity_id | INTEGER | NOT NULL | - | Entity ID |
| entity_name | TEXT | NOT NULL | - | Entity name |
| user_id | VARCHAR | NOT NULL | - | FK to users |
| user_name | TEXT | NOT NULL | - | User name |
| old_value | TEXT | - | - | Previous value (JSON) |
| new_value | TEXT | - | - | New value (JSON) |
| details | TEXT | - | - | Additional details |
| created_at | TIMESTAMP | NOT NULL | NOW() | Creation timestamp |

### Table: `activity_logs`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | Log ID |
| user_id | VARCHAR | NOT NULL | - | FK to users |
| user_name | TEXT | NOT NULL | - | User name |
| action | TEXT | NOT NULL | - | Action performed |
| entity_type | TEXT | NOT NULL | - | Entity type |
| entity_id | TEXT | NOT NULL | - | Entity ID |
| description | TEXT | NOT NULL | - | Action description |
| details_before | TEXT | - | - | State before (JSON) |
| details_after | TEXT | - | - | State after (JSON) |
| created_at | TIMESTAMP | NOT NULL | NOW() | Creation timestamp |

---

## 12. Menu & Access Control

### Table: `menus`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | Menu ID |
| key | TEXT | NOT NULL, UNIQUE | - | Menu key identifier |
| label | TEXT | NOT NULL | - | Display label |
| icon | TEXT | - | - | Icon name |
| route | TEXT | - | - | Route path |
| display_order | INTEGER | - | 0 | Sort order |
| is_active | BOOLEAN | NOT NULL | true | Active status |
| created_at | TIMESTAMP | NOT NULL | NOW() | Creation timestamp |

### Table: `menu_groups`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | Group ID |
| name | TEXT | NOT NULL, UNIQUE | - | Group name |
| description | TEXT | - | - | Group description |
| display_order | INTEGER | - | 0 | Sort order |
| is_active | BOOLEAN | NOT NULL | true | Active status |
| created_at | TIMESTAMP | NOT NULL | NOW() | Creation timestamp |

### Table: `menu_group_menus`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | Mapping ID |
| menu_group_id | INTEGER | NOT NULL | - | FK to menu_groups |
| menu_id | INTEGER | NOT NULL | - | FK to menus |
| created_at | TIMESTAMP | NOT NULL | NOW() | Creation timestamp |

### Table: `user_menus`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | User menu ID |
| user_id | VARCHAR | NOT NULL | - | FK to users |
| menu_id | INTEGER | NOT NULL | - | FK to menus |
| can_view | BOOLEAN | NOT NULL | false | View permission |
| can_edit | BOOLEAN | NOT NULL | false | Edit permission |
| created_at | TIMESTAMP | NOT NULL | NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | NOW() | Last update timestamp |

### Table: `user_menu_groups`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | User group ID |
| user_id | VARCHAR | NOT NULL | - | FK to users |
| menu_group_id | INTEGER | NOT NULL | - | FK to menu_groups |
| created_at | TIMESTAMP | NOT NULL | NOW() | Creation timestamp |

---

## 13. Approvals & Stock Adjustments

### Table: `approval_requests`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | Request ID |
| type | TEXT | NOT NULL | - | Type: discount/void/price_override |
| status | TEXT | NOT NULL | 'pending' | Status: pending/approved/rejected |
| reference_type | TEXT | NOT NULL | - | Reference entity type |
| reference_id | INTEGER | NOT NULL | - | Reference entity ID |
| requested_by | VARCHAR | NOT NULL | - | FK to users (requestor) |
| requested_at | TIMESTAMP | NOT NULL | NOW() | Request timestamp |
| approved_by | VARCHAR | - | - | FK to users (approver) |
| approved_at | TIMESTAMP | - | - | Approval timestamp |
| reason | TEXT | - | - | Request reason |
| approval_reason | TEXT | - | - | Approval/rejection reason |
| payload_before | TEXT | - | - | State before (JSON) |
| payload_after | TEXT | - | - | State after (JSON) |

### Table: `stock_adjustments`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | Adjustment ID |
| medicine_id | INTEGER | NOT NULL | - | FK to medicines |
| medicine_name | TEXT | NOT NULL | - | Medicine name |
| batch_number | TEXT | - | - | Batch number |
| quantity_change | INTEGER | NOT NULL | - | Quantity change (+/-) |
| reason_code | TEXT | NOT NULL | - | Reason code |
| reason_text | TEXT | - | - | Reason description |
| user_id | VARCHAR | NOT NULL | - | FK to users |
| user_name | TEXT | NOT NULL | - | User name |
| created_at | TIMESTAMP | NOT NULL | NOW() | Creation timestamp |

---

## 14. Expenses

### Table: `petty_cash_expenses`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | Expense ID |
| expense_date | TIMESTAMP | NOT NULL | NOW() | Expense date |
| category | TEXT | NOT NULL | - | Expense category |
| amount | DECIMAL(10,2) | NOT NULL | - | Expense amount |
| description | TEXT | - | - | Expense description |
| payment_mode | TEXT | NOT NULL | 'cash' | Payment mode |
| reference_no | TEXT | - | - | Reference number |
| user_id | VARCHAR | - | - | FK to users |
| user_name | TEXT | - | - | User name |
| created_at | TIMESTAMP | NOT NULL | NOW() | Creation timestamp |

---

## 15. Other Tables

### Table: `app_settings`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | Setting ID |
| key | TEXT | NOT NULL, UNIQUE | - | Setting key |
| value | TEXT | NOT NULL | - | Setting value |
| updated_at | TIMESTAMP | NOT NULL | NOW() | Last update timestamp |

### Table: `sequences`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | Sequence ID |
| name | TEXT | NOT NULL, UNIQUE | - | Sequence name |
| current_value | INTEGER | NOT NULL | 0 | Current value |
| prefix | TEXT | - | - | Prefix |
| updated_at | TIMESTAMP | NOT NULL | NOW() | Last update timestamp |

### Table: `held_bills`

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | SERIAL | PRIMARY KEY | - | Held bill ID |
| customer_name | TEXT | NOT NULL | - | Customer name |
| customer_phone | TEXT | - | - | Customer phone |
| customer_id | INTEGER | - | - | FK to customers |
| doctor_id | INTEGER | - | - | FK to doctors |
| doctor_name | TEXT | - | - | Doctor name |
| items | TEXT | NOT NULL | - | Items JSON |
| subtotal | DECIMAL(10,2) | NOT NULL | - | Subtotal |
| discount | DECIMAL(10,2) | - | 0 | Discount |
| discount_percent | DECIMAL(5,2) | - | 0 | Discount percent |
| tax | DECIMAL(10,2) | NOT NULL | - | Tax amount |
| total | DECIMAL(10,2) | NOT NULL | - | Total amount |
| notes | TEXT | - | - | Notes |
| user_id | VARCHAR | - | - | FK to users |
| created_at | TIMESTAMP | NOT NULL | NOW() | Creation timestamp |

---

## Entity Relationship Summary

### Core Relationships

```
users (1) ─────────< sales (many)
users (1) ─────────< activity_logs (many)
users (1) ─────────< user_menus (many)
users (1) ─────────< day_closings (many)

customers (1) ─────────< sales (many)
customers (1) ─────────< credit_payments (many)

medicines (1) ─────────< sale_items (many)
medicines (1) ─────────< stock_adjustments (many)
medicines (1) ─────────< supplier_rates (many)

sales (1) ─────────< sale_items (many)
sales (1) ─────────< sales_returns (many)

suppliers (1) ─────────< purchase_orders (many)
suppliers (1) ─────────< goods_receipts (many)
suppliers (1) ─────────< supplier_payments (many)

purchase_orders (1) ─────────< purchase_order_items (many)
goods_receipts (1) ─────────< goods_receipt_items (many)

menus (1) ─────────< user_menus (many)
menu_groups (1) ─────────< menu_group_menus (many)
menu_groups (1) ─────────< user_menu_groups (many)
```

---

*End of Database Schema Document*
