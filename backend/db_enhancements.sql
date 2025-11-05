-- Dynapharm Database Enhancements
-- Adds versioning, sync tracking, and realtime notifications

-- Add version and updated_at to existing tables if not present
DO $$ 
BEGIN
    -- Clients table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='version') THEN
        ALTER TABLE clients ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    
    -- Orders table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='version') THEN
        ALTER TABLE orders ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    
    -- Reports table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reports' AND column_name='version') THEN
        ALTER TABLE reports ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    
    -- Products table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='version') THEN
        ALTER TABLE products ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    
    -- Branches table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='branches' AND column_name='version') THEN
        ALTER TABLE branches ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
END $$;

-- Create sync log table for tracking changes
CREATE TABLE IF NOT EXISTS sync_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL,
    changed_by VARCHAR(50),
    branch_id VARCHAR(50),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data JSONB
);

CREATE INDEX IF NOT EXISTS idx_sync_log_changed_at ON sync_log(changed_at);
CREATE INDEX IF NOT EXISTS idx_sync_log_table_record ON sync_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_branch ON sync_log(branch_id);

-- Create function to notify on changes (PostgreSQL NOTIFY for realtime)
CREATE OR REPLACE FUNCTION notify_change()
RETURNS TRIGGER AS $$
DECLARE
    payload JSON;
BEGIN
    payload = json_build_object(
        'action', TG_OP,
        'id', COALESCE(NEW.id, OLD.id),
        'table', TG_TABLE_NAME,
        'data', CASE 
            WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
            ELSE row_to_json(NEW)
        END
    );
    
    PERFORM pg_notify(
        TG_TABLE_NAME || '_changes',
        payload::text
    );
    
    IF TG_OP = 'UPDATE' AND NEW.version IS NOT NULL THEN
        NEW.version = OLD.version + 1;
    END IF;
    
    IF TG_OP = 'UPDATE' AND NEW.updated_at IS NOT NULL THEN
        NEW.updated_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function for sync log
CREATE OR REPLACE FUNCTION log_sync_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO sync_log (table_name, record_id, action, changed_at, data)
    VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CURRENT_TIMESTAMP,
        CASE 
            WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
            ELSE row_to_json(NEW)
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to key tables
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'clients_notify') THEN
        CREATE TRIGGER clients_notify AFTER INSERT OR UPDATE OR DELETE ON clients
        FOR EACH ROW EXECUTE FUNCTION notify_change();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'orders_notify') THEN
        CREATE TRIGGER orders_notify AFTER INSERT OR UPDATE OR DELETE ON orders
        FOR EACH ROW EXECUTE FUNCTION notify_change();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'reports_notify') THEN
        CREATE TRIGGER reports_notify AFTER INSERT OR UPDATE OR DELETE ON reports
        FOR EACH ROW EXECUTE FUNCTION notify_change();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'products_notify') THEN
        CREATE TRIGGER products_notify AFTER INSERT OR UPDATE OR DELETE ON products
        FOR EACH ROW EXECUTE FUNCTION notify_change();
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_updated_at ON clients(updated_at);
CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON orders(updated_at);
CREATE INDEX IF NOT EXISTS idx_reports_updated_at ON reports(updated_at);
CREATE INDEX IF NOT EXISTS idx_clients_branch ON clients(branch);
CREATE INDEX IF NOT EXISTS idx_orders_branch ON orders(branch);
