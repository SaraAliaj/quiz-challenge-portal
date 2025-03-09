// Script to delete lessons with IDs between 3 and 500
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'Sara',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'aischool',
  connectionLimit: 10
};

console.log('Database configuration:', {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  hasPassword: !!dbConfig.password,
  connectionLimit: dbConfig.connectionLimit
});

async function deleteRecords() {
  try {
    // Create a connection pool
    const pool = mysql.createPool(dbConfig);
    
    console.log('Deleting lessons with IDs between 3 and 500...');
    
    // Execute the DELETE query
    const [result] = await pool.query('DELETE FROM lessons WHERE id BETWEEN 3 AND 500');
    
    console.log(`Deleted ${result.affectedRows} records successfully.`);
    
    // Close the pool
    await pool.end();
    
    console.log('Database connection closed.');
  } catch (error) {
    console.error('Error deleting records:', error);
  }
}

// Run the function
deleteRecords(); 