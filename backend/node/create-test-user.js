import mysql from 'mysql2';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'Sara',
  password: process.env.DB_PASSWORD || 'Sara0330!!',
  database: process.env.DB_NAME || 'aischool'
};

// Create a connection to the database
const connection = mysql.createConnection(dbConfig);

// Connect to the database
connection.connect(async (err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    process.exit(1);
  }
  
  console.log('Connected to the database');
  
  try {
    // Test user credentials
    const testUser = {
      username: 'testuser',
      surname: 'User',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin',
      active: true
    };
    
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(testUser.password, saltRounds);
    
    // Check if the user already exists
    connection.query(
      'SELECT * FROM users WHERE email = ?',
      [testUser.email],
      (err, results) => {
        if (err) {
          console.error('Error checking for existing user:', err);
          connection.end();
          process.exit(1);
        }
        
        if (results.length > 0) {
          console.log('Test user already exists');
          console.log('You can login with:');
          console.log(`Email: ${testUser.email}`);
          console.log(`Password: ${testUser.password}`);
          connection.end();
          return;
        }
        
        // Insert the test user
        connection.query(
          'INSERT INTO users (username, surname, email, password, role, active) VALUES (?, ?, ?, ?, ?, ?)',
          [
            testUser.username,
            testUser.surname,
            testUser.email,
            hashedPassword,
            testUser.role,
            testUser.active
          ],
          (err, results) => {
            if (err) {
              console.error('Error creating test user:', err);
              connection.end();
              process.exit(1);
            }
            
            console.log('Test user created successfully');
            console.log('You can login with:');
            console.log(`Email: ${testUser.email}`);
            console.log(`Password: ${testUser.password}`);
            
            connection.end();
          }
        );
      }
    );
  } catch (error) {
    console.error('Error creating test user:', error);
    connection.end();
    process.exit(1);
  }
}); 