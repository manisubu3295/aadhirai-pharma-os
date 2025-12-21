-- Seed script for Menus and Menu Groups
-- Run this SQL script on your local database to populate the menu system

-- Clear existing menu data (optional - uncomment if you want to reset)
-- DELETE FROM user_menu_groups;
-- DELETE FROM user_menus;
-- DELETE FROM menu_group_menus;
-- DELETE FROM menu_groups;
-- DELETE FROM menus;

-- Insert Menus (only if they don't exist)
INSERT INTO menus (key, label, route_path, icon, display_order, is_active) VALUES
('dashboard', 'Dashboard', '/', 'LayoutDashboard', 1, true),
('sales.new', 'New Sale (POS)', '/new-sale', 'Plus', 2, true),
('sales.pos', 'Point of Sale', '/pos', 'ShoppingCart', 3, true),
('sales.credit', 'Credit Billing', '/credit-billing', 'Receipt', 4, true),
('sales.refund', 'Medicine Refund', '/medicine-refund', 'RotateCcw', 5, true),
('inventory.medicines', 'Medicines / Products', '/inventory', 'Package', 10, true),
('inventory.suppliers', 'Suppliers', '/suppliers', 'Truck', 11, true),
('inventory.rates', 'Rate Master', '/supplier-rates', 'Tags', 12, true),
('inventory.po', 'Purchase Orders', '/purchase-orders', 'ClipboardList', 13, true),
('inventory.grn', 'Goods Receipt (GRN)', '/goods-receipts', 'PackageCheck', 14, true),
('inventory.returns', 'Purchase Returns', '/purchase-returns', 'Undo2', 15, true),
('customers.accounts', 'Customer Accounts', '/customers', 'Users', 20, true),
('customers.doctors', 'Doctors', '/doctors', 'Stethoscope', 21, true),
('customers.collections', 'Collections', '/collections', 'CreditCard', 22, true),
('reports.sales', 'Sales Reports', '/reports', 'FileText', 30, true),
('reports.analytics', 'Owner Analytics', '/owner-dashboard', 'BarChart3', 31, true),
('admin.audit', 'Audit Log', '/audit-log', 'Shield', 40, true),
('admin.tally', 'Tally Export', '/tally-export', 'Calculator', 41, true),
('admin.day-closing', 'Day Closing', '/day-closing', 'CalendarCheck', 42, true),
('operations.expenses', 'Petty Cash / Expenses', '/expenses', 'Wallet', 43, true),
('operations.approvals', 'Approval Requests', '/approvals', 'CheckCircle', 44, true),
('operations.stock-adjustments', 'Stock Adjustments', '/stock-adjustments', 'RefreshCw', 45, true),
('operations.shift-handover', 'Shift Handover', '/shift-handover', 'Clock', 46, true),
('admin.locations', 'Storage Locations', '/locations', 'MapPin', 50, true),
('admin.settings', 'Settings', '/settings', 'Settings', 51, true),
('admin.menus', 'Menu Management', '/admin/menus', 'Menu', 53, true),
('admin.groups', 'Menu Groups', '/admin/menu-groups', 'FolderOpen', 54, true),
('admin.user-access', 'User Access', '/admin/user-access', 'Shield', 55, true),
('operations.my-sales', 'My Sales', '/my-sales', 'ShoppingCart', 94, true),
('operations.my-activity', 'My Activity', '/my-activity', 'Activity', 95, true)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

-- Insert Menu Groups (only if they don't exist)
INSERT INTO menu_groups (name, description, is_active) VALUES
('Operations', 'Day-to-day operations', true),
('Inventory & Purchase', 'Stock and purchasing', true),
('Customers & Credit', 'Customer management', true),
('Reports & Analytics', 'Business insights', true),
('Administration', 'System administration', true),
('Billing', 'Front office billing', true)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- Insert Menu Group Menus (link menus to groups)
-- First, get the IDs dynamically

-- Operations group
INSERT INTO menu_group_menus (menu_group_id, menu_id)
SELECT mg.id, m.id FROM menu_groups mg, menus m
WHERE mg.name = 'Operations' AND m.key IN ('dashboard', 'sales.new', 'sales.pos', 'sales.credit', 'sales.refund', 'operations.expenses', 'operations.approvals', 'operations.stock-adjustments', 'operations.shift-handover', 'operations.my-sales', 'operations.my-activity')
ON CONFLICT DO NOTHING;

-- Inventory & Purchase group
INSERT INTO menu_group_menus (menu_group_id, menu_id)
SELECT mg.id, m.id FROM menu_groups mg, menus m
WHERE mg.name = 'Inventory & Purchase' AND m.key IN ('inventory.medicines', 'inventory.suppliers', 'inventory.rates', 'inventory.po', 'inventory.grn', 'inventory.returns')
ON CONFLICT DO NOTHING;

-- Customers & Credit group
INSERT INTO menu_group_menus (menu_group_id, menu_id)
SELECT mg.id, m.id FROM menu_groups mg, menus m
WHERE mg.name = 'Customers & Credit' AND m.key IN ('customers.accounts', 'customers.doctors', 'customers.collections')
ON CONFLICT DO NOTHING;

-- Reports & Analytics group
INSERT INTO menu_group_menus (menu_group_id, menu_id)
SELECT mg.id, m.id FROM menu_groups mg, menus m
WHERE mg.name = 'Reports & Analytics' AND m.key IN ('reports.sales', 'reports.analytics')
ON CONFLICT DO NOTHING;

-- Administration group
INSERT INTO menu_group_menus (menu_group_id, menu_id)
SELECT mg.id, m.id FROM menu_groups mg, menus m
WHERE mg.name = 'Administration' AND m.key IN ('admin.audit', 'admin.tally', 'admin.day-closing', 'admin.locations', 'admin.settings', 'admin.menus', 'admin.groups', 'admin.user-access')
ON CONFLICT DO NOTHING;

-- Billing group (subset for cashiers)
INSERT INTO menu_group_menus (menu_group_id, menu_id)
SELECT mg.id, m.id FROM menu_groups mg, menus m
WHERE mg.name = 'Billing' AND m.key IN ('dashboard', 'sales.new', 'sales.pos', 'sales.credit')
ON CONFLICT DO NOTHING;

-- Verification queries (run these to check)
-- SELECT * FROM menus ORDER BY display_order;
-- SELECT * FROM menu_groups ORDER BY id;
-- SELECT mg.name as group_name, m.label as menu_label FROM menu_group_menus mgm JOIN menu_groups mg ON mgm.menu_group_id = mg.id JOIN menus m ON mgm.menu_id = m.id ORDER BY mg.name, m.display_order;
