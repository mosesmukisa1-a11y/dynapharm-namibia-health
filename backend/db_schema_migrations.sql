-- Database Schema Enhancements for Real-Time Global Architecture
-- Add timestamps, versioning, and sync tracking

-- Add timestamps and versioning to all tables
DO $$ 
BEGIN
    -- Clients table enhancements
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='version') THEN
        ALTER TABLE clients ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='last_synced_at') THEN
        ALTER TABLE clients ADD COLUMN last_synced_at TIMESTAMP;
    END IF;
    
    -- Orders table enhancements
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='version') THEN
        ALTER TABLE orders ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='last_synced_at') THEN
        ALTER TABLE orders ADD COLUMN last_synced_at TIMESTAMP;
    END IF;
    
    -- Reports table enhancements
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reports' AND column_name='version') THEN
        ALTER TABLE reports ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reports' AND column_name='last_synced_at') THEN
        ALTER TABLE reports ADD COLUMN last_synced_at TIMESTAMP;
    END IF;
    
    -- Products table enhancements
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='version') THEN
        ALTER TABLE products ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='last_synced_at') THEN
        ALTER TABLE products ADD COLUMN last_synced_at TIMESTAMP;
    END IF;
    
    -- Employees table enhancements
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='version') THEN
        ALTER TABLE employees ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='last_synced_at') THEN
        ALTER TABLE employees ADD COLUMN last_synced_at TIMESTAMP;
    END IF;
    
    -- Stock Requests table enhancements
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_requests' AND column_name='version') THEN
        ALTER TABLE stock_requests ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_requests' AND column_name='last_synced_at') THEN
        ALTER TABLE stock_requests ADD COLUMN last_synced_at TIMESTAMP;
    END IF;
    
    -- Stock Transfers table enhancements
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_transfers' AND column_name='version') THEN
        ALTER TABLE stock_transfers ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_transfers' AND column_name='last_synced_at') THEN
        ALTER TABLE stock_transfers ADD COLUMN last_synced_at TIMESTAMP;
    END IF;
    
    -- Branch Stock table enhancements
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='branch_stock' AND column_name='version') THEN
        ALTER TABLE branch_stock ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='branch_stock' AND column_name='last_synced_at') THEN
        ALTER TABLE branch_stock ADD COLUMN last_synced_at TIMESTAMP;
    END IF;
END $$;

-- Create sync_log table for tracking all changes
CREATE TABLE IF NOT EXISTS sync_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'create', 'update', 'delete'
    changed_by VARCHAR(50),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    branch_id VARCHAR(50),
    data JSONB,
    version_before INTEGER,
    version_after INTEGER
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_log_changed_at ON sync_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_table_record ON sync_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_branch ON sync_log(branch_id);
CREATE INDEX IF NOT EXISTS idx_clients_updated_at ON clients(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON orders(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_updated_at ON reports(updated_at DESC);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.version = COALESCE(OLD.version, 0) + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reports_updated_at ON reports;
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stock_requests_updated_at ON stock_requests;
CREATE TRIGGER update_stock_requests_updated_at BEFORE UPDATE ON stock_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

