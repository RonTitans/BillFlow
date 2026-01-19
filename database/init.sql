-- BillFlow - Electricity Billing System
-- PostgreSQL Database Schema

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE TABLE IF NOT EXISTS file_uploads (
    id SERIAL PRIMARY KEY,
    original_filename VARCHAR(500) NOT NULL,
    standardized_name VARCHAR(500),
    processed_filename VARCHAR(500),
    tsv_filename VARCHAR(500),
    file_path TEXT NOT NULL,
    excel_path TEXT,
    tsv_path TEXT,
    file_size BIGINT,
    processing_status VARCHAR(50) DEFAULT 'pending',
    csv_total DECIMAL(15,2),
    excel_total DECIMAL(15,2),
    tsv_total DECIMAL(15,2),
    gap_amount DECIMAL(15,2),
    gap_percentage DECIMAL(5,2),
    total_rows INTEGER,
    included_rows INTEGER,
    perfect_match BOOLEAN DEFAULT false,
    processing_errors TEXT,
    processing_logs TEXT,
    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_time TIMESTAMP,
    tsv_converted_time TIMESTAMP,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    billing_month INTEGER,
    billing_year INTEGER,
    billing_period VARCHAR(10),
    metadata JSONB
);

CREATE TABLE IF NOT EXISTS processing_logs (
    id SERIAL PRIMARY KEY,
    file_upload_id INTEGER REFERENCES file_uploads(id) ON DELETE CASCADE,
    log_level VARCHAR(20),
    message TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_file_uploads_user_id ON file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_billing_period ON file_uploads(billing_period);
CREATE INDEX IF NOT EXISTS idx_file_uploads_processing_status ON file_uploads(processing_status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
