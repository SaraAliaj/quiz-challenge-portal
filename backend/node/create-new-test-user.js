import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

async function createTestUser() {
  console.log('Creating test user...');
  
  // Database configuration
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aischool'
  };
  
  console.log('Database configuration:', {
    host: dbConfig.host,
    user: dbConfig.user,
    database: dbConfig.database,
    hasPassword: !!dbConfig.password
  });
  
  try {
    // Connect to the database
    const connection = await mysql.createConnection(dbConfig);
    console.log('Connected to the database');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Check if user already exists
    const [existingUsers] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      ['newtest@example.com']
    );
    
    if (existingUsers.length > 0) {
      console.log('Test user already exists');
      console.log('You can login with:');
      console.log('Email: newtest@example.com');
      console.log('Password: password123');
      
      // Update the password
      await connection.execute(
        'UPDATE users SET password = ? WHERE email = ?',
        [hashedPassword, 'newtest@example.com']
      );
      console.log('Password updated');
    } else {
      // Create a new user
      await connection.execute(
        'INSERT INTO users (username, surname, email, password, role) VALUES (?, ?, ?, ?, ?)',
        ['New Test', 'User', 'newtest@example.com', hashedPassword, 'admin']
      );
      console.log('New test user created');
      console.log('You can login with:');
      console.log('Email: newtest@example.com');
      console.log('Password: password123');
    }
    
    // Close the connection
    await connection.end();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the function
createTestUser(); 