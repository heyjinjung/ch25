-- Migration: Create telegram_unlink_request table
-- Run via: docker exec xmas-db mysql -u root -p2026 xmas_event -e "source /tmp/create_telegram_unlink_request.sql"

CREATE TABLE IF NOT EXISTS telegram_unlink_request (
    id INT AUTO_INCREMENT PRIMARY KEY,
    telegram_id VARCHAR(50) NOT NULL,
    current_user_id INT NULL,
    requester_user_id INT NULL,
    reason TEXT NULL,
    evidence TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    processed_by INT NULL,
    processed_at DATETIME NULL,
    admin_memo TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_telegram_id (telegram_id),
    INDEX idx_status (status),
    
    CONSTRAINT fk_unlink_current_user FOREIGN KEY (current_user_id) REFERENCES user(id) ON DELETE SET NULL,
    CONSTRAINT fk_unlink_requester FOREIGN KEY (requester_user_id) REFERENCES user(id) ON DELETE SET NULL,
    CONSTRAINT fk_unlink_processed_by FOREIGN KEY (processed_by) REFERENCES user(id) ON DELETE SET NULL
);
