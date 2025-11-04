-- Dynapharm PostgreSQL Database Schema
-- Core tables for 15 branches

-- Branches table
CREATE TABLE IF NOT EXISTS branches (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location TEXT,
    phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL,
    branch VARCHAR(50) REFERENCES branches(id),
    branches TEXT[], -- Array of branch IDs user can access
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    sku VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    unit VARCHAR(50),
    dp DECIMAL(10, 2) NOT NULL, -- Distributor Price
    cp DECIMAL(10, 2) NOT NULL, -- Customer Price
    bv DECIMAL(10, 2) NOT NULL, -- Business Value
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    branch VARCHAR(50) REFERENCES branches(id),
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Price History table
CREATE TABLE IF NOT EXISTS price_history (
    id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(50) REFERENCES products(id),
    effective_from TIMESTAMP NOT NULL,
    effective_to TIMESTAMP,
    dp DECIMAL(10, 2) NOT NULL,
    cp DECIMAL(10, 2) NOT NULL,
    bv DECIMAL(10, 2) NOT NULL,
    changed_by VARCHAR(50),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR(50) PRIMARY KEY,
    reference_number VARCHAR(100) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    nb_number VARCHAR(100), -- Namibia Business Number
    branch VARCHAR(50) REFERENCES branches(id),
    first_visit TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock Batches (for barcode tracking)
CREATE TABLE IF NOT EXISTS stock_batches (
    id VARCHAR(50) PRIMARY KEY,
    barcode VARCHAR(100) UNIQUE,
    carton_no VARCHAR(50),
    description TEXT,
    batch_no VARCHAR(100),
    expiry_date DATE,
    quantity INTEGER NOT NULL,
    total_ctns INTEGER,
    import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    location VARCHAR(50),
    status VARCHAR(50) DEFAULT 'available',
    dispatched_quantity INTEGER DEFAULT 0,
    remaining_quantity INTEGER NOT NULL,
    product_id VARCHAR(50),
    warehouse_id VARCHAR(50)
);

-- Branch Stock Inventory
CREATE TABLE IF NOT EXISTS branch_stock (
    id SERIAL PRIMARY KEY,
    branch_id VARCHAR(50) REFERENCES branches(id),
    product_id VARCHAR(50) REFERENCES products(id),
    quantity INTEGER DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(branch_id, product_id)
);

-- Stock Movements
CREATE TABLE IF NOT EXISTS stock_movements (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) REFERENCES products(id),
    batch_no VARCHAR(100),
    quantity INTEGER NOT NULL,
    source VARCHAR(50),
    destination VARCHAR(50),
    branch_id VARCHAR(50) REFERENCES branches(id),
    reference VARCHAR(100),
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    meta JSONB
);

-- Reports (sales transactions)
CREATE TABLE IF NOT EXISTS reports (
    id VARCHAR(50) PRIMARY KEY,
    client_id VARCHAR(50) REFERENCES clients(id),
    client_name VARCHAR(255),
    branch VARCHAR(50) REFERENCES branches(id),
    date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'completed',
    products JSONB,
    total_amount DECIMAL(10, 2),
    notes TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(50) PRIMARY KEY,
    client_id VARCHAR(50) REFERENCES clients(id),
    branch VARCHAR(50) REFERENCES branches(id),
    status VARCHAR(50) DEFAULT 'pending',
    items JSONB,
    total_amount DECIMAL(10, 2),
    payment_status VARCHAR(50) DEFAULT 'pending',
    payment_provider VARCHAR(50),
    transaction_id VARCHAR(100),
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(100) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50),
    branch VARCHAR(50) REFERENCES branches(id),
    branches TEXT[],
    supervisor_id VARCHAR(50),
    email VARCHAR(255),
    phone VARCHAR(50),
    hire_date DATE,
    employment_status VARCHAR(50) DEFAULT 'active',
    leave_entitlements JSONB, -- {annual: 24, sick: 10}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock Requests
CREATE TABLE IF NOT EXISTS stock_requests (
    id VARCHAR(50) PRIMARY KEY,
    request_number VARCHAR(100) UNIQUE,
    requesting_branch VARCHAR(50) REFERENCES branches(id),
    request_type VARCHAR(50), -- internal, sales_replenishment
    priority VARCHAR(50) DEFAULT 'normal',
    items JSONB,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    requested_by VARCHAR(50),
    requested_by_role VARCHAR(50),
    branch_manager_approval JSONB,
    warehouse_manager_approval JSONB,
    gm_approval JSONB,
    fulfilled_at TIMESTAMP,
    fulfilled_by VARCHAR(50),
    transfer_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock Transfers
CREATE TABLE IF NOT EXISTS stock_transfers (
    id VARCHAR(50) PRIMARY KEY,
    request_id VARCHAR(50) REFERENCES stock_requests(id),
    request_number VARCHAR(100),
    from_warehouse VARCHAR(50),
    to_branch VARCHAR(50) REFERENCES branches(id),
    items JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    driver VARCHAR(100),
    vehicle VARCHAR(100),
    dispatch_notes TEXT,
    dispatched_at TIMESTAMP,
    delivered_at TIMESTAMP,
    received_at TIMESTAMP,
    dispatched_by VARCHAR(50),
    received_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id VARCHAR(50) PRIMARY KEY,
    employee_id VARCHAR(50) REFERENCES employees(id),
    branch VARCHAR(50) REFERENCES branches(id),
    date DATE NOT NULL,
    check_in TIMESTAMP,
    check_out TIMESTAMP,
    status VARCHAR(50), -- present, absent, late, on_leave
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, date)
);

-- Leave requests
CREATE TABLE IF NOT EXISTS leave_requests (
    id VARCHAR(50) PRIMARY KEY,
    employee_id VARCHAR(50) REFERENCES employees(id),
    leave_type VARCHAR(50), -- annual, sick, emergency, unpaid
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested INTEGER,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    approved_by VARCHAR(50),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shifts
CREATE TABLE IF NOT EXISTS shifts (
    id VARCHAR(50) PRIMARY KEY,
    employee_id VARCHAR(50) REFERENCES employees(id),
    branch VARCHAR(50) REFERENCES branches(id),
    shift_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    break_duration INTEGER DEFAULT 0, -- minutes
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, completed, cancelled
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bonus payments
CREATE TABLE IF NOT EXISTS bonus_payments (
    id VARCHAR(50) PRIMARY KEY,
    employee_id VARCHAR(50) REFERENCES employees(id),
    period VARCHAR(10), -- YYYY-MM format
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, paid
    approved_by VARCHAR(50),
    approved_at TIMESTAMP,
    paid_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cash requests
CREATE TABLE IF NOT EXISTS cash_requests (
    id VARCHAR(50) PRIMARY KEY,
    branch VARCHAR(50) REFERENCES branches(id),
    requested_by VARCHAR(50),
    amount DECIMAL(10, 2) NOT NULL,
    purpose TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, fulfilled
    approved_by VARCHAR(50),
    approved_at TIMESTAMP,
    fulfilled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50),
    title VARCHAR(255),
    message TEXT,
    type VARCHAR(50), -- info, warning, error, success
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appointments (consultations)
CREATE TABLE IF NOT EXISTS appointments (
    id VARCHAR(50) PRIMARY KEY,
    client_id VARCHAR(50) REFERENCES clients(id),
    consultant_id VARCHAR(50),
    branch VARCHAR(50) REFERENCES branches(id),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    type VARCHAR(50), -- consultation, full_body_checkup
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, completed, cancelled
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
