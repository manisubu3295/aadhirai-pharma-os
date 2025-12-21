# Pharmacy Management System - Comprehensive Test Suite

## Document Information
- **Version**: 1.0
- **Created**: December 21, 2025
- **System**: Aadhirai Innovations Pharmacy Management System
- **Stack**: React + Express + PostgreSQL + Drizzle ORM

---

## 1. Test Strategy Summary

### 1.1 Objectives
- Validate all newly added/fixed features (Access Control, Expenses, Approvals, Stock Adjustments, Shift Management, Dashboards)
- Ensure regression testing covers existing functionality
- Verify role-based access control across all user types
- Confirm data integrity and audit trail completeness
- Validate security controls and error handling

### 1.2 Testing Approach
| Type | Description |
|------|-------------|
| Functional | Verify business logic, workflows, CRUD operations |
| Integration | API endpoints, database persistence, cross-module flows |
| Security | Authentication, authorization, API protection |
| Regression | Existing features still work after changes |
| Usability | UI responsiveness, error messages, navigation |

### 1.3 Entry/Exit Criteria

**Entry Criteria:**
- Application deployed to test environment
- Test data setup complete
- All test users created with appropriate roles

**Exit Criteria:**
- All P0/P1 test cases passed
- No S1 (Critical) defects open
- S2 defects documented with workarounds
- 95% test execution coverage

### 1.4 Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Access control bypass | High | Security testing, API validation |
| Data corruption on concurrent updates | High | Concurrency testing, transaction checks |
| Audit trail gaps | Medium | Verify all critical actions logged |
| Shift calculation errors | High | Manual reconciliation tests |

---

## 2. Test Roles & Permission Matrix

### 2.1 Role Definitions

| Role | Description | Default Access Level |
|------|-------------|---------------------|
| Owner | Business owner, full system access | All menus, all permissions |
| Admin | System administrator | All menus, all permissions |
| Pharmacist | Licensed pharmacist | POS, Inventory, Prescriptions |
| Cashier | Point of sale operations | POS, limited reports |
| Storekeeper/Purchase | Inventory & procurement | Inventory, Purchase Orders, GRN |
| Accountant | Financial operations | Reports, Expenses, Collections |

### 2.2 Permission Matrix

| Module | Owner | Admin | Pharmacist | Cashier | Storekeeper | Accountant |
|--------|-------|-------|------------|---------|-------------|------------|
| Dashboard | ✓ Full | ✓ Full | ✓ Limited | ✓ Limited | ✓ Limited | ✓ Limited |
| POS/Billing | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Inventory | ✓ | ✓ | ✓ View | ✗ | ✓ | ✗ |
| Customers | ✓ | ✓ | ✓ | ✓ View | ✗ | ✓ View |
| Reports | ✓ | ✓ | ✓ Limited | ✓ My Sales | ✓ Limited | ✓ |
| Expenses | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ |
| Approvals | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Stock Adjustments | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ |
| Shift Management | ✓ | ✓ | ✓ | ✓ Own | ✗ | ✓ View |
| User Access | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Settings | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |

---

## 3. Test Data Setup

### 3.1 Users

```sql
-- Test Users (create if not exists)
-- owner1 (role=owner)
-- admin1 (role=admin)  
-- cashier1 (role=cashier)
-- pharmacist1 (role=pharmacist)
-- purchase1 (role=purchase/storekeeper)
-- accountant1 (role=accountant)

SELECT id, username, name, role FROM users WHERE username IN 
('owner1', 'admin1', 'cashier1', 'pharmacist1', 'purchase1', 'accountant1');
```

### 3.2 Medicines

| Medicine | Quantity | Expiry Status | Purpose |
|----------|----------|---------------|---------|
| Paracetamol 500mg | 100 | Normal (6+ months) | Standard tests |
| Paracetamol 500mg (Near Expiry) | 50 | Near expiry (< 30 days) | Alert tests |
| Cetirizine 10mg | 5 | Normal | Low stock alert tests |
| Amoxicillin 250mg | 200 | Normal | Batch variation tests |
| Omeprazole 20mg | 0 | Normal | Zero stock tests |

### 3.3 Sales Test Data

| Invoice | Created By | Payment | Amount | Date | Purpose |
|---------|-----------|---------|--------|------|---------|
| INV-001 | cashier1 | Cash | ₹500 | Today | Current day tests |
| INV-002 | cashier1 | UPI | ₹1,200 | Today | Payment method tests |
| INV-003 | cashier1 | Credit | ₹3,500 | Yesterday | Credit/collection tests |
| INV-004 | pharmacist1 | Cash | ₹750 | Today-2 | Multi-user tests |
| INV-005 | pharmacist1 | Cash | ₹2,100 | Today-5 | Date range tests |

### 3.4 Suppliers

| Supplier | Contact | Email | Purpose |
|----------|---------|-------|---------|
| MedSupply Distributors | 9876543210 | medsupply@test.com | Primary supplier tests |
| PharmaCare Wholesale | 9123456789 | pharmacare@test.com | Secondary supplier tests |
| Quick Meds Ltd | 9988776655 | quickmeds@test.com | Purchase order tests |

```sql
SELECT id, name, contact_person, phone, email FROM suppliers 
WHERE name IN ('MedSupply Distributors', 'PharmaCare Wholesale', 'Quick Meds Ltd');
```

### 3.5 Menus & Menu Groups

| Menu Key | Display Name | Group | displayOrder |
|----------|--------------|-------|--------------|
| dashboard | Dashboard | - | 1 |
| pos | Point of Sale | Operations | 10 |
| inventory | Inventory | Masters | 20 |
| customers | Customers | Masters | 21 |
| reports.sales | Sales Report | Reports | 50 |
| reports.inventory | Inventory Report | Reports | 51 |
| settings | Settings | Admin | 100 |
| user-access | User Access | Admin | 101 |

```sql
SELECT m.id, m.key, m.label, mg.name as group_name, m.display_order 
FROM menus m 
LEFT JOIN menu_group_menus mgm ON m.id = mgm.menu_id
LEFT JOIN menu_groups mg ON mgm.menu_group_id = mg.id
ORDER BY m.display_order;
```

### 3.6 Additional Test Data

| Data Type | Details |
|-----------|---------|
| Refund | 1 refund for INV-003 (partial ₹500) |
| Expenses | 2 expenses: Delivery (₹100), Tea (₹50) |
| Pending Approval (Discount) | Sale with 25% discount override request |
| Pending Approval (Void) | Sale void request for INV-002 |
| Stock Adjustment (Damage) | -2 units Paracetamol 500mg |
| Stock Adjustment (Correction) | +5 units Cetirizine 10mg |

---

## 4. Detailed Test Cases

### 4.1 Access Control & Navigation (25 Test Cases)

| TC_ID | Module | Title | Req_ID | Role | Priority | Severity | Preconditions | Test Steps | Expected Results | Postconditions | DB Verification | Notes |
|-------|--------|-------|--------|------|----------|----------|---------------|------------|------------------|----------------|-----------------|-------|
| ACC-001 | Access | Admin grants menu access to user | ACCESS-01 | Admin | P0 | S1 | admin1 logged in, cashier1 exists with no custom access | 1. Navigate to User Access page 2. Select cashier1 3. Enable "Inventory" menu (canView=true) 4. Click Save | Success message shown, cashier1 can now see Inventory in sidebar | user_menus record created for cashier1+inventory with canView=true | `SELECT * FROM user_menus WHERE user_id='<cashier1_id>' AND menu_id=(SELECT id FROM menus WHERE key='inventory')` should show canView=true | |
| ACC-002 | Access | Access persists after page refresh | ACCESS-01 | Cashier | P0 | S1 | ACC-001 completed, cashier1 has Inventory access | 1. Login as cashier1 2. Verify Inventory in sidebar 3. Refresh page (F5) 4. Check sidebar again | Inventory menu still visible after refresh | No change to user_menus state | Same query as ACC-001 | |
| ACC-003 | Access | Access persists after logout/login | ACCESS-01 | Cashier | P0 | S1 | ACC-001 completed | 1. Login as cashier1 2. Logout 3. Login again as cashier1 4. Check sidebar | Inventory menu visible after re-login | Session recreated, user_menus unchanged | Same query as ACC-001 | |
| ACC-004 | Access | Admin revokes menu access | ACCESS-01 | Admin | P0 | S1 | cashier1 has Inventory access | 1. Login as admin1 2. Go to User Access 3. Select cashier1 4. Disable Inventory (canView=false) 5. Save | Success message, Inventory removed from cashier1 sidebar | `SELECT * FROM user_menus WHERE user_id='<cashier1_id>'` should show canView=false for inventory | |
| ACC-005 | Access | Sidebar shows only authorized menus | ACCESS-02 | Cashier | P0 | S1 | cashier1 has limited access (no Inventory) | 1. Login as cashier1 2. Observe sidebar menus | Only authorized menus visible (POS, My Sales, etc.). No Inventory or Settings | Compare against user_menus where canView=true | |
| ACC-006 | Access | Owner sees all menus | ACCESS-04 | Owner | P0 | S1 | owner1 exists | 1. Login as owner1 2. Observe sidebar | All system menus visible regardless of user_menus table | Owner role bypasses permission checks | |
| ACC-007 | Access | Admin sees all menus | ACCESS-04 | Admin | P0 | S1 | admin1 exists | 1. Login as admin1 2. Observe sidebar | All system menus visible | Admin role bypasses permission checks | |
| ACC-008 | Access | Login redirects to dashboard if accessible | ACCESS-03 | Pharmacist | P0 | S1 | pharmacist1 has dashboard access | 1. Login as pharmacist1 | Redirected to "/" (dashboard) | Check user_menus for dashboard menu canView=true | |
| ACC-009 | Access | Login redirects to first accessible menu | ACCESS-03 | Cashier | P0 | S1 | cashier1 has NO dashboard access but has POS access | 1. Remove dashboard access for cashier1 2. Login as cashier1 | Redirected to first menu by displayOrder (e.g., /pos) | `SELECT m.key FROM menus m JOIN user_menus um ON m.id=um.menu_id WHERE um.user_id='<id>' AND um.can_view=true ORDER BY m.display_order LIMIT 1` | |
| ACC-010 | Access | Login redirects to /no-access when no menus | ACCESS-03 | Cashier | P1 | S2 | Remove ALL menu access for cashier1 | 1. Login as cashier1 | Redirected to /no-access page | user_menus should have no canView=true entries | |
| ACC-011 | Access | Direct URL to unauthorized page shows Access Denied | ACCESS-05 | Cashier | P0 | S1 | cashier1 has no Inventory access | 1. Login as cashier1 2. Manually navigate to /inventory | Access Denied page shown, no crash | | |
| ACC-012 | Access | 404 page for invalid routes | ACCESS-06 | Any | P1 | S2 | User logged in | 1. Navigate to /invalid-route-xyz | Friendly 404 page shown, not blank screen | | |
| ACC-013 | Access | Grant menu group access | ACCESS-01 | Admin | P0 | S1 | cashier1 has no access, "Reports" menu group exists | 1. Login as admin1 2. User Access > cashier1 3. Enable "Reports" group 4. Save | All menus in Reports group now accessible to cashier1 | `SELECT * FROM user_menu_groups WHERE user_id='<id>'` AND check related menus | |
| ACC-014 | Access | Direct menu overrides group access | ACCESS-01 | Admin | P1 | S2 | cashier1 has Reports group access | 1. Explicitly disable "Sales Report" menu for cashier1 2. Save | cashier1 sees other Reports menus but NOT Sales Report | Check both user_menu_groups AND user_menus for override | |
| ACC-015 | Access | React Query invalidation after access change | ACCESS-07 | Admin | P0 | S1 | cashier1 logged in on browser A, admin1 on browser B | 1. Admin changes cashier1 access 2. cashier1 navigates to new page 3. Check sidebar | Sidebar updates to reflect new permissions | | Requires two browser sessions |
| ACC-016 | Access | Cannot access API without login | GENERAL-03 | None | P0 | S1 | Not logged in | 1. Call GET /api/medicines directly | 401 Unauthorized response | | Security test |
| ACC-017 | Access | Non-admin cannot call admin APIs | GENERAL-03 | Cashier | P0 | S1 | cashier1 logged in | 1. Call PUT /api/users/<admin_id>/access | 403 Forbidden response | | Security test |
| ACC-018 | Access | Bulk menu assignment | ACCESS-01 | Admin | P1 | S2 | pharmacist1 has default access | 1. Admin selects multiple menus 2. Enables all at once 3. Save | All selected menus accessible | Check user_menus for all selected menu_ids | |
| ACC-019 | Access | Access denied for edit when canView=true, canEdit=false | ACCESS-02 | Pharmacist | P1 | S2 | pharmacist1 has view-only on Customers | 1. Login as pharmacist1 2. View Customers list 3. Try to edit customer | Edit button disabled or edit attempt blocked | Check canEdit column in user_menus | |
| ACC-020 | Access | New user has no custom access initially | ACCESS-01 | Admin | P1 | S2 | Create new user testuser1 | 1. Create testuser1 (role=staff) 2. Check user_menus | No entries in user_menus for new user (inherits role defaults) | `SELECT * FROM user_menus WHERE user_id='<new_id>'` should be empty | |
| ACC-021 | Access | Deleted menu doesn't appear in sidebar | ACCESS-02 | Any | P2 | S3 | Menu exists in menus table | 1. Soft-delete a menu (if supported) 2. Refresh sidebar | Deleted menu not shown | Check menus table for active/deleted flag | |
| ACC-022 | Access | Menu displayOrder respected in sidebar | ACCESS-02 | Owner | P2 | S3 | Menus have different displayOrder values | 1. Login as owner1 2. Check sidebar order | Menus appear in displayOrder sequence | `SELECT key, display_order FROM menus ORDER BY display_order` | |
| ACC-023 | Access | Concurrent access changes don't corrupt data | GENERAL-02 | Admin | P1 | S2 | Two admin sessions open | 1. Admin1 changes cashier1 access 2. Simultaneously Admin2 changes same user 3. Check final state | Last write wins, no data corruption, DB consistent | Check user_menus has valid single state | Concurrency test |
| ACC-024 | Access | Long session doesn't lose access on refresh | ACCESS-01 | Any | P2 | S3 | User logged in for 30+ minutes | 1. Keep session idle 2. Refresh page | Session still valid, access maintained | Check session and user_menus | |
| ACC-025 | Access | Access changes don't affect other users | ACCESS-01 | Admin | P1 | S2 | cashier1 and cashier2 exist | 1. Change only cashier1 access 2. Check cashier2 | cashier2 access unchanged | Compare user_menus for both users | |

### 4.2 Expenses / Petty Cash (15 Test Cases)

| TC_ID | Module | Title | Req_ID | Role | Priority | Severity | Preconditions | Test Steps | Expected Results | DB Verification | Notes |
|-------|--------|-------|--------|------|----------|----------|---------------|------------|------------------|-----------------|-------|
| EXP-001 | Expenses | Create new expense | EXP-01 | Accountant | P0 | S1 | accountant1 logged in, Expenses accessible | 1. Navigate to Expenses 2. Click Add Expense 3. Enter: Category=Delivery, Amount=100, Description="Courier charges" 4. Save | Expense created, appears in list | `SELECT * FROM petty_cash_expenses ORDER BY id DESC LIMIT 1` | |
| EXP-002 | Expenses | Expense list shows all expenses | EXP-01 | Accountant | P0 | S1 | Multiple expenses exist | 1. Navigate to Expenses 2. View list | All expenses shown with date, category, amount, description | `SELECT COUNT(*) FROM petty_cash_expenses` matches UI count | |
| EXP-003 | Expenses | Filter expenses by date range | EXP-01 | Accountant | P1 | S2 | Expenses across different dates | 1. Set From/To date 2. Apply filter | Only expenses within range shown | SQL with WHERE expense_date BETWEEN | |
| EXP-004 | Expenses | Filter expenses by category | EXP-01 | Owner | P1 | S2 | Expenses in different categories | 1. Select category filter 2. Apply | Only matching category shown | | |
| EXP-005 | Expenses | Summary totals accurate | EXP-01 | Accountant | P0 | S1 | Multiple expenses exist | 1. View Expenses page 2. Check total amount | Total matches sum of all visible expenses | `SELECT SUM(amount) FROM petty_cash_expenses WHERE ...` | |
| EXP-006 | Expenses | Expense recorded in activity log | EXP-03 | Owner | P1 | S2 | Create new expense | 1. Create expense 2. Check Activity Logs | Expense creation logged with user, timestamp, details | `SELECT * FROM activity_logs WHERE action='expense_created' ORDER BY created_at DESC LIMIT 1` | |
| EXP-007 | Expenses | Expense affects shift cash calculation | EXP-02 | Owner | P0 | S1 | Shift open, expense created during shift | 1. Open shift with ₹1000 cash 2. Make ₹500 cash sale 3. Create ₹100 expense 4. View shift summary | Expected cash = 1000 + 500 - 100 = ₹1400 | Check day_closings calculation | |
| EXP-008 | Expenses | Cannot create expense with zero amount | EXP-01 | Accountant | P1 | S2 | On expense form | 1. Enter amount = 0 2. Try to save | Validation error: "Amount must be greater than 0" | | Negative test |
| EXP-009 | Expenses | Cannot create expense with negative amount | EXP-01 | Accountant | P1 | S2 | On expense form | 1. Enter amount = -50 2. Try to save | Validation error | | Negative test |
| EXP-010 | Expenses | Description field accepts long text | EXP-01 | Accountant | P2 | S3 | On expense form | 1. Enter 500 character description 2. Save | Expense saved with full description | | Boundary test |
| EXP-011 | Expenses | Cashier cannot access Expenses | EXP-01 | Cashier | P0 | S1 | cashier1 logged in | 1. Try to navigate to Expenses | Access denied or menu not visible | | Permission test |
| EXP-012 | Expenses | Edit existing expense | EXP-01 | Accountant | P1 | S2 | Expense exists | 1. Select expense 2. Click Edit 3. Change amount 4. Save | Expense updated | Check petty_cash_expenses for updated values | |
| EXP-013 | Expenses | Delete expense | EXP-01 | Owner | P1 | S2 | Expense exists | 1. Select expense 2. Click Delete 3. Confirm | Expense removed from list | Record deleted or soft-deleted | |
| EXP-014 | Expenses | Expense date defaults to today | EXP-01 | Accountant | P2 | S3 | On expense form | 1. Open Add Expense form 2. Check date field | Date pre-filled with current date | | Usability |
| EXP-015 | Expenses | Large amount handled correctly | EXP-01 | Accountant | P2 | S3 | On expense form | 1. Enter amount = 999999.99 2. Save | Expense saved without truncation | Check exact amount in DB | Boundary test |

### 4.3 Approvals Workflow (25 Test Cases)

| TC_ID | Module | Title | Req_ID | Role | Priority | Severity | Preconditions | Test Steps | Expected Results | DB Verification | Notes |
|-------|--------|-------|--------|------|----------|----------|---------------|------------|------------------|-----------------|-------|
| APP-001 | Approvals | Discount override request created automatically | APP-01 | Cashier | P0 | S1 | Discount threshold set to 15% | 1. Login as cashier1 2. Create sale 3. Apply 25% discount 4. Complete sale | Approval request created, sale marked pending | `SELECT * FROM approval_requests WHERE type='discount' ORDER BY requested_at DESC LIMIT 1` | |
| APP-002 | Approvals | Approval queue visible to owner | APP-02 | Owner | P0 | S1 | Pending approval exists | 1. Login as owner1 2. Navigate to Approvals | Pending requests visible with details | | |
| APP-003 | Approvals | Approval queue visible to admin | APP-02 | Admin | P0 | S1 | Pending approval exists | 1. Login as admin1 2. Navigate to Approvals | Pending requests visible | | |
| APP-004 | Approvals | Approve discount request | APP-03 | Owner | P0 | S1 | Pending discount approval exists | 1. Select pending request 2. Click Approve 3. Enter reason 4. Confirm | Request approved, sale updated with discount | Check approval_requests status='approved', sales record updated | |
| APP-005 | Approvals | Reject discount request | APP-03 | Owner | P0 | S1 | Pending discount approval exists | 1. Select pending request 2. Click Reject 3. Enter reason 4. Confirm | Request rejected, sale unchanged (no discount or original discount) | Check approval_requests status='rejected' | |
| APP-006 | Approvals | Void request created | APP-04 | Pharmacist | P0 | S1 | Sale exists that can be voided | 1. Login as pharmacist1 2. Find sale 3. Request Void 4. Enter reason | Void request created with pending status | `SELECT * FROM approval_requests WHERE type='void' ORDER BY requested_at DESC LIMIT 1` | |
| APP-007 | Approvals | Approve void request | APP-04 | Owner | P0 | S1 | Pending void request exists | 1. Select void request 2. Approve | Sale marked VOID, stock restored | Check sales.status='VOID', medicine quantities increased | |
| APP-008 | Approvals | Stock restored on void approval | APP-04 | Owner | P0 | S1 | Void approved for sale with 3x Paracetamol | After void approval | Paracetamol quantity increased by 3 | `SELECT quantity FROM medicines WHERE name LIKE '%Paracetamol%'` before/after | |
| APP-009 | Approvals | Reject void request | APP-04 | Owner | P1 | S2 | Pending void request exists | 1. Reject void request | Request rejected, sale status unchanged | | |
| APP-010 | Approvals | Audit record shows requestor | APP-05 | Owner | P0 | S1 | Approval processed | 1. View audit/activity logs | Record shows who requested | `SELECT * FROM activity_logs WHERE action LIKE '%approval%'` | |
| APP-011 | Approvals | Audit record shows approver | APP-05 | Owner | P0 | S1 | Approval processed | 1. View audit/activity logs | Record shows who approved/rejected | | |
| APP-012 | Approvals | Audit shows timestamps | APP-05 | Owner | P1 | S2 | Approval processed | Check audit logs | Request time and decision time recorded | | |
| APP-013 | Approvals | Audit shows before/after values | APP-05 | Owner | P1 | S2 | Discount approval processed | Check audit logs | Original price and discounted price recorded | | |
| APP-014 | Approvals | Cashier cannot approve requests | APP-02 | Cashier | P0 | S1 | cashier1 logged in, pending approval exists | 1. Try to access Approvals | Access denied or hidden | | Permission test |
| APP-015 | Approvals | Cannot approve already processed request | APP-02 | Owner | P1 | S2 | Approval already approved/rejected | 1. Try to approve again | Error or button disabled | | Idempotency |
| APP-016 | Approvals | Approval reason mandatory | APP-02 | Owner | P1 | S2 | Approving request | 1. Leave reason blank 2. Try to submit | Validation error: "Reason required" | | |
| APP-017 | Approvals | Filter approvals by type | APP-02 | Owner | P1 | S2 | Multiple approval types exist | 1. Filter by "Discount" | Only discount requests shown | | |
| APP-018 | Approvals | Filter approvals by status | APP-02 | Owner | P1 | S2 | Approved and pending exist | 1. Filter by "Pending" | Only pending shown | | |
| APP-019 | Approvals | Approval notification to requestor | APP-02 | Cashier | P2 | S3 | Request approved | 1. Login as requestor 2. Check alerts/notifications | Notification about approval decision | | If implemented |
| APP-020 | Approvals | Concurrent approval handling | GENERAL-02 | Owner | P1 | S2 | Two owners open same pending approval | 1. Both click Approve simultaneously | One succeeds, other gets error, no double-processing | Check only one approval record | Concurrency |
| APP-021 | Approvals | Price override request flow | APP-01 | Cashier | P1 | S2 | Price override requires approval | 1. Modify item price beyond threshold 2. Complete sale | Approval request created | | |
| APP-022 | Approvals | Void request includes sale details | APP-04 | Owner | P1 | S2 | View void request | Approval shows invoice number, items, amounts | All sale details visible for decision | | |
| APP-023 | Approvals | Bulk approval not allowed | APP-02 | Owner | P2 | S3 | Multiple pending approvals | 1. Try to select multiple 2. Approve all | Must approve individually (if designed this way) | | Business rule |
| APP-024 | Approvals | Approval request expires (if implemented) | APP-02 | Owner | P2 | S3 | Old pending request | Check if auto-expired | Per business rules | | If applicable |
| APP-025 | Approvals | API rejects unauthorized approval | GENERAL-03 | Cashier | P0 | S1 | cashier1 logged in | 1. Call PUT /api/approvals/<id>/approve | 403 Forbidden | | Security test |

### 4.4 Stock Adjustments (15 Test Cases)

| TC_ID | Module | Title | Req_ID | Role | Priority | Severity | Preconditions | Test Steps | Expected Results | DB Verification | Notes |
|-------|--------|-------|--------|------|----------|----------|---------------|------------|------------------|-----------------|-------|
| STK-001 | Stock Adj | Create negative adjustment (damage) | STK-01 | Pharmacist | P0 | S1 | Medicine qty=100 | 1. Navigate to Stock Adjustments 2. Select medicine 3. Enter qty=-5 4. Select reason="Damage" 5. Save | Stock reduced to 95 | `SELECT quantity FROM medicines WHERE id=<id>` = 95 | |
| STK-002 | Stock Adj | Create positive adjustment (correction) | STK-01 | Pharmacist | P0 | S1 | Medicine qty=95 | 1. Create adjustment qty=+10 2. Reason="Stock correction" | Stock increased to 105 | | |
| STK-003 | Stock Adj | Reason code mandatory | STK-02 | Pharmacist | P0 | S1 | On adjustment form | 1. Enter quantity 2. Leave reason blank 3. Save | Validation error: "Reason is required" | | |
| STK-004 | Stock Adj | Adjustment history correct | STK-02 | Owner | P0 | S1 | Multiple adjustments made | 1. View adjustment history | All adjustments listed with date, medicine, qty, reason, user | `SELECT * FROM stock_adjustments ORDER BY created_at DESC` | |
| STK-005 | Stock Adj | Audit log created | STK-02 | Owner | P0 | S1 | Adjustment made | 1. Check activity logs | Adjustment logged with all details | `SELECT * FROM activity_logs WHERE action='stock_adjustment'` | |
| STK-006 | Stock Adj | Cannot adjust below zero | STK-03 | Pharmacist | P1 | S2 | Medicine qty=5 | 1. Try adjustment qty=-10 | Error: "Cannot reduce below zero" OR allowed with warning | Document expected behavior | |
| STK-007 | Stock Adj | Large quantity adjustment | STK-01 | Pharmacist | P2 | S3 | On adjustment form | 1. Enter qty=+99999 | Saved correctly without overflow | Check DB for exact value | Boundary |
| STK-008 | Stock Adj | Zero quantity adjustment blocked | STK-01 | Pharmacist | P1 | S2 | On adjustment form | 1. Enter qty=0 | Validation error | | |
| STK-009 | Stock Adj | Cashier cannot make adjustments | STK-01 | Cashier | P0 | S1 | cashier1 logged in | 1. Try to access Stock Adjustments | Access denied | | Permission |
| STK-010 | Stock Adj | Storekeeper can make adjustments | STK-01 | Storekeeper | P0 | S1 | purchase1 logged in | 1. Create adjustment | Adjustment saved successfully | | |
| STK-011 | Stock Adj | Adjustment atomic (no partial updates) | STK-01 | Pharmacist | P1 | S2 | Adjustment in progress | If error occurs during save | No partial update to medicine qty | Check before/after qty | |
| STK-012 | Stock Adj | Filter adjustments by date | STK-02 | Owner | P1 | S2 | Adjustments across dates | 1. Filter by date range | Only matching records shown | | |
| STK-013 | Stock Adj | Filter adjustments by medicine | STK-02 | Owner | P1 | S2 | Adjustments for different medicines | 1. Filter by medicine name | Only that medicine's adjustments shown | | |
| STK-014 | Stock Adj | Concurrent adjustments handled | GENERAL-02 | Pharmacist | P1 | S2 | Two sessions adjusting same medicine | 1. Both adjust simultaneously | Both succeed or one fails, qty consistent | Final qty = initial + adj1 + adj2 or error | Concurrency |
| STK-015 | Stock Adj | API rejects unauthorized adjustment | GENERAL-03 | Cashier | P0 | S1 | cashier1 logged in | 1. Call POST /api/stock-adjustments | 403 Forbidden | | Security |

### 4.5 Shift / Day Closing (15 Test Cases)

| TC_ID | Module | Title | Req_ID | Role | Priority | Severity | Preconditions | Test Steps | Expected Results | DB Verification | Notes |
|-------|--------|-------|--------|------|----------|----------|---------------|------------|------------------|-----------------|-------|
| SFT-001 | Shift | Open shift | SHIFT-01 | Cashier | P0 | S1 | No shift open for today | 1. Navigate to Shift 2. Enter opening cash = ₹5000 3. Open Shift | Shift opened, timestamp recorded | `SELECT * FROM day_closings WHERE business_date=CURRENT_DATE` status='open' | |
| SFT-002 | Shift | Cannot open duplicate shift | SHIFT-01 | Cashier | P0 | S1 | Shift already open for today | 1. Try to open another shift | Error: "Shift already open for today" | | |
| SFT-003 | Shift | Expected cash calculation correct | SHIFT-02 | Cashier | P0 | S1 | Shift open with ₹5000, made sales | 1. ₹1000 cash sale 2. ₹500 cash collection 3. ₹200 cash refund 4. ₹100 expense 5. View shift summary | Expected = 5000 + 1000 + 500 - 200 - 100 = ₹6200 | Check day_closings expected_cash | |
| SFT-004 | Shift | Close shift with matching cash | SHIFT-02 | Cashier | P0 | S1 | Expected cash = ₹6200 | 1. Enter actual cash = ₹6200 2. Close Shift | Shift closed, difference = ₹0 | day_closings status='closed', difference=0 | |
| SFT-005 | Shift | Close shift with shortage | SHIFT-02 | Cashier | P0 | S1 | Expected = ₹6200 | 1. Enter actual = ₹6100 2. Add note "₹100 short, counting error" 3. Close | Shift closed, shortage = -₹100 noted | Check difference and notes columns | |
| SFT-006 | Shift | Close shift with excess | SHIFT-02 | Cashier | P1 | S2 | Expected = ₹6200 | 1. Enter actual = ₹6250 2. Close | Shift closed, excess = +₹50 noted | | |
| SFT-007 | Shift | Handover report prints | SHIFT-03 | Cashier | P0 | S1 | Shift closed | 1. Click Print Handover Report | Report generates with all totals | | |
| SFT-008 | Shift | Handover report matches computed totals | SHIFT-03 | Owner | P0 | S1 | Shift closed, report printed | 1. Compare report totals with system | All numbers match | Cross-check with day_closings record | |
| SFT-009 | Shift | Difference notes recorded | SHIFT-04 | Owner | P1 | S2 | Shift closed with difference | 1. View shift details | Notes explaining difference visible | day_closings.notes column | |
| SFT-010 | Shift | Cannot close already closed shift | SHIFT-04 | Cashier | P1 | S2 | Shift already closed | 1. Try to close again | Button disabled or error message | | Idempotency |
| SFT-011 | Shift | Owner can view all shifts | SHIFT-03 | Owner | P1 | S2 | Multiple shifts across dates | 1. View shift history | All shifts visible with user, date, status | | |
| SFT-012 | Shift | Cashier sees only own shifts | SHIFT-03 | Cashier | P1 | S2 | Shifts by different cashiers | 1. Login as cashier1 2. View shifts | Only cashier1's shifts visible | | |
| SFT-013 | Shift | Shift summary includes UPI/Card breakup | SHIFT-02 | Cashier | P1 | S2 | Sales with different payment methods | View shift summary | Breakdown by payment method shown | | |
| SFT-014 | Shift | Opening cash validation | SHIFT-01 | Cashier | P1 | S2 | On shift open | 1. Enter negative opening cash | Validation error | | |
| SFT-015 | Shift | Shift open persists after refresh | SHIFT-01 | Cashier | P1 | S2 | Shift open | 1. Refresh page | Shift still shows as open | day_closings status='open' | |

### 4.6 Dashboards / Activity / Alerts (15 Test Cases)

| TC_ID | Module | Title | Req_ID | Role | Priority | Severity | Preconditions | Test Steps | Expected Results | DB Verification | Notes |
|-------|--------|-------|--------|------|----------|----------|---------------|------------|------------------|-----------------|-------|
| DSH-001 | Dashboard | User sees own invoices | DASH-01 | Cashier | P0 | S1 | cashier1 has sales | 1. Login as cashier1 2. View My Sales | Only cashier1's sales shown | `SELECT * FROM sales WHERE user_id='<cashier1_id>'` | |
| DSH-002 | Dashboard | Date range filter works | DASH-01 | Cashier | P0 | S1 | Sales across different dates | 1. Set date range 2. Apply | Only sales within range shown | | |
| DSH-003 | Dashboard | Owner sees all users' data | DASH-01 | Owner | P0 | S1 | Sales by multiple users | 1. Login as owner1 2. View Sales History | All users' sales visible, user filter available | | |
| DSH-004 | Dashboard | My Refunds shows user's refunds | DASH-01 | Cashier | P1 | S2 | cashier1 processed refunds | 1. View My Refunds | Only own refunds shown | | |
| DSH-005 | Dashboard | My Collections shows credit payments | DASH-01 | Cashier | P1 | S2 | cashier1 collected credit payments | 1. View My Collections | Own collections listed | | |
| DSH-006 | Dashboard | My Expenses for accountant | DASH-01 | Accountant | P1 | S2 | accountant1 created expenses | 1. View My Expenses | Own expenses listed | | |
| DSH-007 | Exceptions | Owner sees voids | DASH-02 | Owner | P0 | S1 | Void approvals processed | 1. View Exceptions Dashboard | Voided sales listed | | |
| DSH-008 | Exceptions | Owner sees high discounts | DASH-02 | Owner | P0 | S1 | High discount sales exist | View exceptions | High discount sales flagged | | |
| DSH-009 | Exceptions | Owner sees stock edits | DASH-02 | Owner | P1 | S2 | Stock adjustments made | View exceptions | Stock adjustments listed | | |
| DSH-010 | Activity | My Activity shows correct actions | DASH-03 | Cashier | P0 | S1 | cashier1 performed actions | 1. View My Activity | Own actions listed (sales, returns, etc.) | `SELECT * FROM activity_logs WHERE user_id='<id>'` | |
| DSH-011 | Alerts | Low stock alert shown | ALERT-01 | Pharmacist | P0 | S1 | Medicine with qty < reorder level | View Alerts | Low stock alert visible | | |
| DSH-012 | Alerts | Near expiry alert shown | ALERT-01 | Pharmacist | P0 | S1 | Medicine expiring in < 30 days | View Alerts | Near expiry alert visible | | |
| DSH-013 | Alerts | Pending approvals alert (Owner) | ALERT-01 | Owner | P1 | S2 | Pending approvals exist | View Alerts | Pending approvals notification | | |
| DSH-014 | Alerts | Cashier doesn't see admin alerts | ALERT-02 | Cashier | P1 | S2 | Admin-only alerts exist | 1. Login as cashier1 2. View Alerts | Admin alerts not visible | | |
| DSH-015 | Alerts | Credit overdue alert | ALERT-01 | Accountant | P1 | S2 | Overdue credit exists | View Alerts | Overdue credit customers flagged | | |

### 4.7 Security & Negative Tests (15 Test Cases)

| TC_ID | Module | Title | Req_ID | Role | Priority | Severity | Preconditions | Test Steps | Expected Results | DB Verification | Notes |
|-------|--------|-------|--------|------|----------|----------|---------------|------------|------------------|-----------------|-------|
| SEC-001 | Security | Unauthenticated API blocked | GENERAL-03 | None | P0 | S1 | Not logged in | 1. Call any protected API | 401 Unauthorized | | |
| SEC-002 | Security | Cannot escalate own role | GENERAL-03 | Cashier | P0 | S1 | cashier1 logged in | 1. Call PUT /api/users/<own_id> with role="owner" | 403 Forbidden | | |
| SEC-003 | Security | Cannot access other user data | GENERAL-03 | Cashier | P0 | S1 | cashier1 logged in | 1. Call GET /api/users/<admin_id>/permissions | 403 Forbidden | | |
| SEC-004 | Security | SQL injection blocked | GENERAL-03 | Any | P0 | S1 | Logged in | 1. Enter "'; DROP TABLE users;--" in search | No SQL execution, proper escaping | DB tables intact | |
| SEC-005 | Security | XSS prevented | GENERAL-03 | Any | P0 | S1 | Logged in | 1. Enter "<script>alert('xss')</script>" in name field | Script not executed, properly escaped | | |
| SEC-006 | Negative | Invalid sale payload rejected | GENERAL-02 | Cashier | P1 | S2 | Creating sale | 1. POST sale with negative total | 400 Bad Request, validation error | | |
| SEC-007 | Negative | Duplicate invoice prevention | GENERAL-02 | Cashier | P1 | S2 | Invoice INV-001 exists | 1. Try to create sale with same invoiceNo | Error: "Invoice number already exists" | | |
| SEC-008 | Negative | Refresh doesn't duplicate transaction | GENERAL-02 | Cashier | P0 | S1 | Just completed a sale | 1. Press browser back 2. Try to resubmit | Warning or prevented | Check sales count unchanged | |
| SEC-009 | Security | Session timeout works | GENERAL-03 | Any | P1 | S2 | Session timeout configured | 1. Login 2. Wait for timeout 3. Try action | Redirected to login | | |
| SEC-010 | Negative | Cannot delete medicine with sales | GENERAL-02 | Admin | P1 | S2 | Medicine has associated sale_items | 1. Try to delete medicine | Error: "Cannot delete, medicine has sales history" | | |
| SEC-011 | Negative | Missing required fields rejected | GENERAL-02 | Cashier | P1 | S2 | Creating customer | 1. POST customer without name | 400 Bad Request | | |
| SEC-012 | Security | Rate limiting (if implemented) | GENERAL-03 | Any | P2 | S3 | Rapid API calls | 1. Make 100 requests/second | 429 Too Many Requests | | If applicable |
| SEC-013 | Negative | Invalid date format rejected | GENERAL-02 | Any | P2 | S3 | Filter with invalid date | 1. Enter date "32/13/2025" | Validation error or handled gracefully | | |
| SEC-014 | Concurrency | Race condition - same medicine | GENERAL-02 | Cashier | P1 | S2 | Two cashiers selling same item | 1. Both add item to cart 2. Both checkout | Stock correctly decremented OR one fails | Final qty = initial - qty1 - qty2 | |
| SEC-015 | Security | Password not exposed in API | GENERAL-03 | Admin | P0 | S1 | Call GET /api/users | Response doesn't include password/hash | | |

---

## 5. Regression Checklist (Sanity - 10 Tests)

| # | Area | Quick Check | Pass/Fail |
|---|------|-------------|-----------|
| 1 | Login | User can login with valid credentials | |
| 2 | POS | Can create a simple cash sale | |
| 3 | Inventory | Medicine list loads correctly | |
| 4 | Customer | Can view customer list | |
| 5 | Dashboard | Dashboard loads without errors | |
| 6 | Reports | Sales report generates for today | |
| 7 | Sidebar | Navigation works between modules | |
| 8 | Search | Global search returns results | |
| 9 | Logout | User can logout successfully | |
| 10 | Responsive | Key pages work on mobile viewport | |

---

## 6. Non-Functional Tests

### 6.1 Performance Tests

| Test | Description | Acceptance Criteria |
|------|-------------|-------------------|
| Page Load | Dashboard initial load | < 3 seconds |
| API Response | GET /api/medicines | < 500ms for 1000 items |
| Report Generation | Sales report for 30 days | < 5 seconds |
| Concurrent Users | 10 simultaneous users | No errors, < 2s response |

### 6.2 Security Tests

| Test | Description | Method |
|------|-------------|--------|
| Authentication | All APIs require auth | Test without token |
| Authorization | Role-based access enforced | Test cross-role access |
| Input Validation | All inputs sanitized | SQL injection, XSS tests |
| Session Security | Secure session handling | Check httpOnly, secure flags |

### 6.3 Audit & Logging Tests

| Test | Description | Verification |
|------|-------------|--------------|
| Critical actions logged | Approvals, voids, stock edits, permission changes | Check activity_logs table |
| User attribution | All logs have user_id | Query logs for null user_id |
| Timestamp accuracy | Logs have correct timestamps | Compare with system time |
| No log gaps | All expected actions appear | Compare action count with log count |

---

## 7. Defect Reporting Template

### Defect Report Format

```
DEFECT ID: DEF-XXXX
TITLE: [Brief description]
SEVERITY: S1 (Critical) / S2 (Major) / S3 (Minor)
PRIORITY: P0 (Immediate) / P1 (High) / P2 (Medium) / P3 (Low)
MODULE: [Module name]
TEST CASE: [TC_ID that found this]
REQUIREMENT: [Req_ID violated]

ENVIRONMENT:
- Browser: [Chrome/Edge version]
- Date/Time: [When found]
- User Role: [Role used during test]

STEPS TO REPRODUCE:
1. [Step 1]
2. [Step 2]
3. [Step N]

EXPECTED RESULT:
[What should happen]

ACTUAL RESULT:
[What actually happened]

SCREENSHOTS/LOGS:
[Attach relevant evidence]

DATABASE STATE:
[Relevant SQL query and results]

WORKAROUND:
[If any workaround exists]

ASSIGNED TO: [Developer name]
STATUS: Open / In Progress / Fixed / Verified / Closed
```

### Severity Definitions

| Severity | Definition | Examples |
|----------|------------|----------|
| S1 - Critical | System crash, data loss, security breach, complete feature failure | Login broken, data corruption, unauthorized access |
| S2 - Major | Major feature broken, significant functionality loss | Cannot create sales, reports incorrect, approval workflow broken |
| S3 - Minor | Minor feature issue, workaround exists | UI alignment, minor calculation variance, cosmetic issues |

### Priority Definitions

| Priority | Definition | SLA |
|----------|------------|-----|
| P0 - Immediate | Production blocker | Fix within 4 hours |
| P1 - High | Major impact, no workaround | Fix within 24 hours |
| P2 - Medium | Moderate impact, workaround exists | Fix within 1 week |
| P3 - Low | Minor impact | Fix in next release |

---

## Appendix: SQL Verification Queries

```sql
-- User Access Verification
SELECT u.username, m.key, um.can_view, um.can_edit
FROM users u
CROSS JOIN menus m
LEFT JOIN user_menus um ON um.user_id = u.id AND um.menu_id = m.id
WHERE u.username = 'cashier1'
ORDER BY m.display_order;

-- Approval Requests
SELECT ar.*, u1.username as requestor, u2.username as approver
FROM approval_requests ar
JOIN users u1 ON ar.requested_by = u1.id
LEFT JOIN users u2 ON ar.approved_by = u2.id
ORDER BY ar.requested_at DESC;

-- Stock Adjustment Audit
SELECT sa.*, m.name as medicine_name, u.username
FROM stock_adjustments sa
JOIN medicines m ON sa.medicine_id = m.id
JOIN users u ON sa.user_id = u.id
ORDER BY sa.created_at DESC;

-- Shift/Day Closing
SELECT dc.*, u.username
FROM day_closings dc
JOIN users u ON dc.user_id = u.id
WHERE dc.business_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY dc.business_date DESC;

-- Expense Summary
SELECT category, SUM(amount) as total, COUNT(*) as count
FROM petty_cash_expenses
WHERE expense_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY category;

-- Activity Log Check
SELECT action, COUNT(*) as count
FROM activity_logs
WHERE created_at >= CURRENT_DATE
GROUP BY action
ORDER BY count DESC;
```

---

*End of Test Suite Document*
