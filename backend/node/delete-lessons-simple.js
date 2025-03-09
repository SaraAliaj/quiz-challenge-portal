// Simple script to delete lessons with IDs between 3 and 500
require('dotenv').config();
const mysql = require('mysql2/promise');

// Database configuration from .env file
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'Sara',
  password: process.env.DB_PASSWORD || 'Sara0330!!',
  database: process.env.DB_NAME || 'aischool',
  connectionLimit: 1
};

console.log('Using database configuration:', {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  hasPassword: !!dbConfig.password
});

async function deleteRecords() {
  let connection;
  try {
    // Create a connection
    connection = await mysql.createConnection(dbConfig);
    
    console.log('Connected to database. Deleting lessons with IDs between 3 and 500...');
    
    // Execute the DELETE query
    const [result] = await connection.execute('DELETE FROM lessons WHERE id BETWEEN 3 AND 500');
    
    console.log(`Deleted ${result.affectedRows} records successfully.`);
  } catch (error) {
    console.error('Error deleting records:', error);
  } finally {
    if (connection) {
      // Close the connection
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

// Run the function
deleteRecords(); 