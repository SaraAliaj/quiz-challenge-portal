import mysql from 'mysql2';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

// Check for required environment variables
if (!process.env.DB_USER || !process.env.DB_PASSWORD) {
  console.error('Error: DB_USER and DB_PASSWORD environment variables must be set');
  process.exit(1);
}

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    process.exit(1);
  }

  // Create database if it doesn't exist
  connection.query('CREATE DATABASE IF NOT EXISTS aischool', (err) => {
    if (err) {
      console.error('Error creating database:', err);
      process.exit(1);
    }
    console.log('Database created or already exists');

    // Use the database
    connection.query('USE aischool', (err) => {
      if (err) {
        console.error('Error using database:', err);
        process.exit(1);
      }

      // Create users table if it doesn't exist
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(255) NOT NULL,
          surname VARCHAR(255),
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'user',
          active BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      connection.query(createTableQuery, (err) => {
        if (err) {
          console.error('Error creating table:', err);
          process.exit(1);
        }
        console.log('Table created or already exists');
        connection.end();
      });
    });
  });
}); 