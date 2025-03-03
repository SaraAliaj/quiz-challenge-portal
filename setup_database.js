import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupDatabase() {
  console.log('Setting up database...');
  
  // Read database configuration from environment variables
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aischool',
    multipleStatements: true // Important for running multiple SQL statements
  };
  
  console.log(`Connecting to MySQL at ${dbConfig.host} as ${dbConfig.user}`);
  
  try {
    // Create connection
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      multipleStatements: true
    });
    
    // Create database if it doesn't exist
    console.log(`Creating database ${dbConfig.database} if it doesn't exist...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    
    // Use the database
    console.log(`Using database ${dbConfig.database}...`);
    await connection.query(`USE ${dbConfig.database}`);
    
    // Read SQL file for users table
    const usersSqlFilePath = path.join(__dirname, 'create_users_table.sql');
    console.log(`Reading users SQL file from ${usersSqlFilePath}...`);
    const usersSqlScript = fs.readFileSync(usersSqlFilePath, 'utf8');
    
    // Execute users SQL script
    console.log('Executing users SQL script...');
    await connection.query(usersSqlScript);
    
    // Read SQL file for other tables
    const tablesSqlFilePath = path.join(__dirname, 'create_tables.sql');
    console.log(`Reading tables SQL file from ${tablesSqlFilePath}...`);
    const tablesSqlScript = fs.readFileSync(tablesSqlFilePath, 'utf8');
    
    // Execute tables SQL script
    console.log('Executing tables SQL script...');
    await connection.query(tablesSqlScript);
    
    // Read SQL file for authentication tables
    const authTablesSqlFilePath = path.join(__dirname, 'auth_tables.sql');
    console.log(`Reading authentication tables SQL file from ${authTablesSqlFilePath}...`);
    const authTablesSqlScript = fs.readFileSync(authTablesSqlFilePath, 'utf8');
    
    // Execute authentication tables SQL script
    console.log('Executing authentication tables SQL script...');
    await connection.query(authTablesSqlScript);
    
    console.log('Database setup completed successfully!');
    
    // Close connection
    await connection.end();
    
    return { success: true, message: 'Database setup completed successfully!' };
  } catch (error) {
    console.error('Error setting up database:', error);
    return { success: false, error: error.message };
  }
}

// Run the setup function
setupDatabase()
  .then(result => {
    if (result.success) {
      console.log(result.message);
      process.exit(0);
    } else {
      console.error('Database setup failed:', result.error);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  }); 