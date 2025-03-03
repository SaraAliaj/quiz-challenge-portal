-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS login_attempts;
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS user_profiles;
DROP TABLE IF EXISTS users;

-- Create users table (core authentication table)
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'teacher', 'admin') DEFAULT 'student',
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login DATETIME NULL,
    INDEX idx_email (email),
    INDEX idx_username (username)
);

-- Create user profiles table (extended user information)
CREATE TABLE IF NOT EXISTS user_profiles (
    profile_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    bio TEXT,
    avatar_url VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    date_of_birth DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

-- Create user sessions table (for managing active sessions)
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id VARCHAR(128) PRIMARY KEY,
    user_id INT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_valid BOOLEAN DEFAULT TRUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
);

-- Create password resets table (for password recovery)
CREATE TABLE IF NOT EXISTS password_resets (
    reset_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_token (token)
);

-- Create login attempts table (for security monitoring and rate limiting)
CREATE TABLE IF NOT EXISTS login_attempts (
    attempt_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    email VARCHAR(100) NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    success BOOLEAN DEFAULT FALSE,
    attempt_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    failure_reason VARCHAR(100) NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_email (email),
    INDEX idx_ip_address (ip_address),
    INDEX idx_attempt_time (attempt_time),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Insert a default admin user (password: admin123)
INSERT INTO users (username, email, password_hash, role, is_active, email_verified) 
VALUES ('admin', 'admin@example.com', '$2b$10$3euPcmQFCiblsZeEu5s7p.9MQICjYJ7ogs/Xr4OZ.1nUsZnKCvv4W', 'admin', TRUE, TRUE)
ON DUPLICATE KEY UPDATE user_id = user_id;

-- Insert admin profile
INSERT INTO user_profiles (user_id, first_name, last_name)
SELECT user_id, 'Admin', 'User' FROM users WHERE username = 'admin'
ON DUPLICATE KEY UPDATE profile_id = profile_id;

-- Insert a test student user (password: student123)
INSERT INTO users (username, email, password_hash, role, is_active, email_verified) 
VALUES ('student', 'student@example.com', '$2b$10$JwRxI.ZzQvXA9iiS6DGw9.vzwWqjXmwFKcKnV2pKUuS/JsrT0WlMm', 'student', TRUE, TRUE)
ON DUPLICATE KEY UPDATE user_id = user_id;

-- Insert student profile
INSERT INTO user_profiles (user_id, first_name, last_name)
SELECT user_id, 'Test', 'Student' FROM users WHERE username = 'student'
ON DUPLICATE KEY UPDATE profile_id = profile_id; 