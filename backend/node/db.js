import mysql from 'mysql2/promise';
import 'dotenv/config';

// Validate database connection parameters
const dbHost = process.env.DB_HOST || 'localhost';
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbName = process.env.DB_NAME || 'aischool';

if (!dbUser || !dbPassword) {
  console.error('Error: DB_USER and DB_PASSWORD must be set in environment variables.');
  process.exit(1);
}

// Create a connection pool
const pool = mysql.createPool({
  host: dbHost,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

export const promisePool = pool; 