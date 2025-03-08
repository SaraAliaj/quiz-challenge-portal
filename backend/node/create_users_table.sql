-- Drop existing tables if they exist
DROP TABLE IF EXISTS logins;
DROP TABLE IF EXISTS users;

-- Create the 'users' table
CREATE TABLE IF NOT EXISTS users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert a test admin user (password is 'admin123' hashed with bcrypt)
-- You should change this in production
INSERT INTO users (username, email, password_hash) 
VALUES ('admin', 'admin@example.com', '$2b$10$3euPcmQFCiblsZeEu5s7p.9MQICjYJ7ogs/Xr4OZ.1nUsZnKCvv4W')
ON DUPLICATE KEY UPDATE user_id = user_id; 