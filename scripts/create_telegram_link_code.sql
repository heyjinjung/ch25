-- Migration: Create telegram_link_code table
-- Run via: docker exec xmas-db mysql -u root -p2026 xmas_event -e "source /tmp/create_telegram_link_code.sql"

CREATE TABLE IF NOT EXISTS telegram_link_code (
    code VARCHAR(16) PRIMARY KEY,
    user_id INT NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    client_ip VARCHAR(50) NULL,
    user_agent TEXT NULL,
    
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at),
    
    CONSTRAINT fk_link_code_user FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);
