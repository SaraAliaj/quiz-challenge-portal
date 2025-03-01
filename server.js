import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const app = express();

// Enable CORS with specific options
app.use(cors({
  origin: ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Database configuration
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'aischool'
});

// Replace with a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'aischool',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Create a promise-based wrapper for the pool
const promisePool = pool.promise();

console.log('Database configuration:', {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  database: process.env.DB_NAME || 'aischool',
  hasPassword: !!process.env.DB_PASSWORD,
  connectionLimit: 10
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Improved database connection handling
const connectToDatabase = async () => {
  try {
    // Test the connection with a simple query
    const [results] = await promisePool.query('SELECT 1 + 1 AS result');
    console.log('Successfully connected to MySQL');
    console.log('Database test query successful:', results);
    
    // Check if lessons table exists
    const [lessonsCheck] = await promisePool.query('SHOW TABLES LIKE "lessons"');
    if (lessonsCheck.length === 0) {
      console.error('WARNING: lessons table does not exist!');
      
      // Create the lessons table
      try {
        await promisePool.query(`
          CREATE TABLE IF NOT EXISTS lessons (
            id INT AUTO_INCREMENT PRIMARY KEY,
            course_id INT NOT NULL,
            week_id INT NOT NULL,
            day_id INT NOT NULL,
            lesson_name VARCHAR(255) NOT NULL,
            file_path VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('Lessons table created successfully');
      } catch (error) {
        console.error('Failed to create lessons table:', error);
      }
    } else {
      // Check lessons table structure
      const [structure] = await promisePool.query('DESCRIBE lessons');
      console.log('Lessons table structure:', structure);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to connect to MySQL:', error);
    throw error;
  }
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Database check endpoint
app.get('/api/db-check', async (req, res) => {
  try {
    console.log('Running database check...');
    
    // Check database connection
    const [connectionTest] = await promisePool.query('SELECT 1 + 1 AS result');
    console.log('Database connection test:', connectionTest);
    
    // Check if lessons table exists
    const [tablesCheck] = await promisePool.query('SHOW TABLES');
    const tables = tablesCheck.map(row => Object.values(row)[0]);
    console.log('Tables in database:', tables);
    
    const lessonsTableExists = tables.includes('lessons');
    
    let lessonsStructure = null;
    let createLessonsTable = false;
    
    if (lessonsTableExists) {
      // Check lessons table structure
      const [structure] = await promisePool.query('DESCRIBE lessons');
      lessonsStructure = structure;
      console.log('Lessons table structure:', structure);
      
      // Check if required columns exist
      const columns = structure.map(col => col.Field);
      const requiredColumns = ['course_id', 'week_id', 'day_id', 'lesson_name', 'file_path'];
      const missingColumns = requiredColumns.filter(col => !columns.includes(col));
      
      if (missingColumns.length > 0) {
        console.log('Missing columns in lessons table:', missingColumns);
        
        // Add missing columns
        for (const column of missingColumns) {
          let columnType = '';
          if (['course_id', 'week_id', 'day_id'].includes(column)) {
            columnType = 'INT NOT NULL';
          } else {
            columnType = 'VARCHAR(255) NOT NULL';
          }
          
          await promisePool.query(`ALTER TABLE lessons ADD COLUMN ${column} ${columnType}`);
          console.log(`Added column ${column} to lessons table`);
        }
      }
    } else {
      console.log('Lessons table does not exist, creating it...');
      createLessonsTable = true;
      
      // Create lessons table
      await promisePool.query(`
        CREATE TABLE lessons (
          id INT AUTO_INCREMENT PRIMARY KEY,
          course_id INT NOT NULL,
          week_id INT NOT NULL,
          day_id INT NOT NULL,
          lesson_name VARCHAR(255) NOT NULL,
          file_path VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('Lessons table created successfully');
      
      // Check the newly created table
      const [newStructure] = await promisePool.query('DESCRIBE lessons');
      lessonsStructure = newStructure;
    }
    
    // Check related tables
    const relatedTables = ['courses', 'weeks', 'days'];
    const relatedTablesStatus = {};
    
    for (const table of relatedTables) {
      const exists = tables.includes(table);
      relatedTablesStatus[table] = { exists };
      
      if (exists) {
        const [count] = await promisePool.query(`SELECT COUNT(*) as count FROM ${table}`);
        relatedTablesStatus[table].count = count[0].count;
      }
    }
    
    res.json({
      status: 'ok',
      databaseConnection: true,
      tables,
      lessons: {
        exists: lessonsTableExists,
        created: createLessonsTable,
        structure: lessonsStructure
      },
      relatedTables: relatedTablesStatus
    });
  } catch (error) {
    console.error('Database check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Database check failed',
      error: {
        message: error.message,
        code: error.code,
        sqlMessage: error.sqlMessage
      }
    });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await promisePool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        surname: user.surname
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  const { username, surname, email, password } = req.body;

  console.log('Received registration request:', {
    username,
    surname,
    email,
    hasPassword: !!password
  });

  // Validate input
  if (!username || !email || !password) {
    console.log('Missing required fields:', {
      username: !username,
      email: !email,
      password: !password
    });
    return res.status(400).json({ 
      message: 'Please provide all required fields',
      missing: {
        username: !username,
        email: !email,
        password: !password
      }
    });
  }

  try {
    // Check database connection
    await promisePool.query('SELECT 1');
    
    // Log the registration attempt
    console.log('Registration attempt for:', { username, email });

    // Check if email already exists
    const [existing] = await promisePool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      console.log('Email already exists:', email);
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');

    // Insert new user
    const [result] = await promisePool.query(
      'INSERT INTO users (username, surname, email, password) VALUES (?, ?, ?, ?)',
      [username, surname, email, hashedPassword]
    );

    console.log('User registered successfully:', { id: result.insertId });

    const token = jwt.sign(
      { userId: result.insertId, email },
      JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: result.insertId,
        username,
        email,
        surname
      }
    });
  } catch (error) {
    console.error('Registration error details:', {
      error: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      stack: error.stack
    });
    
    // Send more specific error messages
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ message: 'Email already registered' });
    } else if (error.code === 'ER_NO_SUCH_TABLE') {
      console.error('Database table not found');
      res.status(500).json({ 
        message: 'Database configuration error',
        details: 'Table not found'
      });
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Database connection failed');
      res.status(500).json({ 
        message: 'Database connection error',
        details: 'Could not connect to database'
      });
    } else {
      res.status(500).json({ 
        message: 'Server error during registration',
        details: error.message 
      });
    }
  }
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Token verification endpoint
app.get('/api/auth/verify', verifyToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Middleware for handling file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      console.log(`Creating upload directory: ${uploadDir}`);
      fs.mkdirSync(uploadDir, { recursive: true });
    } else {
      console.log(`Upload directory exists: ${uploadDir}`);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + ext;
    console.log(`Generated filename for upload: ${filename}`);
    cb(null, filename);
  }
});

// Configure multer with more detailed logging
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: function (req, file, cb) {
    console.log(`Received file in multer:`, {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname,
      size: file.size
    });
    // Accept all file types for now to debug the issue
    cb(null, true);
  }
});

// API endpoints for course management
// Get all courses
app.get('/api/courses', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT id, name FROM courses ORDER BY name');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ message: 'Failed to fetch courses' });
  }
});

app.get('/api/weeks', async (req, res) => {
  console.log('connection sucess');

  try {
    
    const [rows] = await promisePool.query(
      'SELECT id, name FROM weeks'
    );
    console.log('hi');
    res.json(rows); // Send all weeks to the client
  } catch (error) {
    console.error('Error fetching weeks 2:', error);
    res.status(500).json({ message: 'Failed to fetch weeks' });
  }
});

// Get all days
app.get('/api/days', async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      'SELECT id, day_name AS name FROM days'
    );
    res.json(rows); // Send all days to the client
  } catch (error) {
    console.error('Error fetching days:', error);
    res.status(500).json({ message: 'Failed to fetch days' });
  }
});

// Upload lesson with materials - Simplified approach
app.post('/api/lessons', (req, res) => {
  console.log('Received lesson upload request');
  console.log('Request headers:', req.headers);
  
  // Use single middleware function for file upload
  upload.array('files', 10)(req, res, async function(err) {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ message: 'File upload error', error: err.message });
    }
    
    console.log('Files received:', req.files?.length || 0);
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        console.log(`File ${index + 1}:`, {
          originalname: file.originalname,
          filename: file.filename,
          path: file.path,
          mimetype: file.mimetype,
          size: file.size
        });
      });
    } else {
      console.error('No files were received by multer');
      // Check if files field exists in the request
      console.log('Request body keys:', Object.keys(req.body));
      console.log('Request files field:', req.body.files);
      console.log('Request content-type:', req.headers['content-type']);
      
      // Check if the request is multipart/form-data
      if (!req.headers['content-type'] || !req.headers['content-type'].includes('multipart/form-data')) {
        return res.status(400).json({
          message: 'Invalid content type',
          expected: 'multipart/form-data',
          received: req.headers['content-type']
        });
      }
    }
    
    console.log('Body fields:', req.body);
    
    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      console.error('No files were uploaded');
      return res.status(400).json({ 
        message: 'Missing required fields', 
        missingFields: ['files'] 
      });
    }
    
    const { courseId, weekId, dayId, title } = req.body;
    
    // Validate other required fields
    const missingFields = [];
    if (!courseId) missingFields.push('courseId');
    if (!weekId) missingFields.push('weekId');
    if (!dayId) missingFields.push('dayId');
    if (!title) missingFields.push('title');
    
    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields);
      return res.status(400).json({ 
        message: 'Missing required fields', 
        missingFields 
      });
    }
    
    // Convert IDs to integers
    const courseIdInt = parseInt(courseId, 10);
    const weekIdInt = parseInt(weekId, 10);
    const dayIdInt = parseInt(dayId, 10);
    
    if (isNaN(courseIdInt) || isNaN(weekIdInt) || isNaN(dayIdInt)) {
      return res.status(400).json({ 
        message: 'Invalid ID values', 
        details: {
          courseId: isNaN(courseIdInt) ? 'Invalid' : 'Valid',
          weekId: isNaN(weekIdInt) ? 'Invalid' : 'Valid',
          dayId: isNaN(dayIdInt) ? 'Invalid' : 'Valid'
        }
      });
    }
    
    let connection;
    try {
      // First, check if the lessons table exists
      try {
        const [tableCheck] = await promisePool.query('SHOW TABLES LIKE "lessons"');
        if (tableCheck.length === 0) {
          console.error('ERROR: lessons table does not exist in the database!');
          
          // Try to create the lessons table
          try {
            console.log('Attempting to create lessons table...');
            await promisePool.query(`
              CREATE TABLE IF NOT EXISTS lessons (
                id INT AUTO_INCREMENT PRIMARY KEY,
                course_id INT NOT NULL,
                week_id INT NOT NULL,
                day_id INT NOT NULL,
                lesson_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
            `);
            console.log('Lessons table created successfully');
          } catch (createError) {
            console.error('Failed to create lessons table:', createError);
            return res.status(500).json({ 
              message: 'Database error', 
              error: 'Failed to create lessons table',
              details: createError.message
            });
          }
        } else {
          console.log('Lessons table exists');
        }
        
        // Check the structure of the lessons table
        const [tableStructure] = await promisePool.query('DESCRIBE lessons');
        console.log('Lessons table structure:', tableStructure);
        
        // Check if required columns exist
        const columns = tableStructure.map(col => col.Field);
        const requiredColumns = ['course_id', 'week_id', 'day_id', 'lesson_name', 'file_path'];
        const missingColumns = requiredColumns.filter(col => !columns.includes(col));
        
        if (missingColumns.length > 0) {
          console.log('Missing columns in lessons table:', missingColumns);
          
          // Add missing columns
          for (const column of missingColumns) {
            let columnType = '';
            if (['course_id', 'week_id', 'day_id'].includes(column)) {
              columnType = 'INT NOT NULL';
            } else {
              columnType = 'VARCHAR(255) NOT NULL';
            }
            
            await promisePool.query(`ALTER TABLE lessons ADD COLUMN ${column} ${columnType}`);
            console.log(`Added column ${column} to lessons table`);
          }
        }
      } catch (tableError) {
        console.error('Error checking lessons table:', tableError);
        return res.status(500).json({ 
          message: 'Database error', 
          error: 'Failed to check lessons table structure',
          details: tableError.message
        });
      }
      
      // Check if the related tables exist and have data
      try {
        const relatedTables = ['courses', 'weeks', 'days'];
        for (const table of relatedTables) {
          const [tableCheck] = await promisePool.query(`SHOW TABLES LIKE '${table}'`);
          if (tableCheck.length === 0) {
            console.error(`ERROR: ${table} table does not exist!`);
            return res.status(500).json({
              message: 'Database error',
              error: `${table} table does not exist`
            });
          }
          
          // Check if the ID exists in the related table
          let idToCheck;
          let columnName;
          
          if (table === 'courses') {
            idToCheck = courseIdInt;
            columnName = 'id';
          } else if (table === 'weeks') {
            idToCheck = weekIdInt;
            columnName = 'id';
          } else if (table === 'days') {
            idToCheck = dayIdInt;
            columnName = 'id';
          }
          
          const [idCheck] = await promisePool.query(
            `SELECT * FROM ${table} WHERE ${columnName} = ?`,
            [idToCheck]
          );
          
          if (idCheck.length === 0) {
            console.error(`ERROR: ${table} with ID ${idToCheck} does not exist!`);
            return res.status(500).json({
              message: 'Database error',
              error: `${table} with ID ${idToCheck} does not exist`
            });
          }
        }
      } catch (relatedTableError) {
        console.error('Error checking related tables:', relatedTableError);
        return res.status(500).json({
          message: 'Database error',
          error: 'Failed to check related tables',
          details: relatedTableError.message
        });
      }
      
      // Get a connection from the pool for transaction
      connection = await promisePool.getConnection();
      
      // Start transaction
      await connection.beginTransaction();
      
      // Process each file as a separate lesson
      for (const file of req.files) {
        console.log(`Processing file for database insertion:`, {
          originalname: file.originalname,
          path: file.path
        });
        
        try {
          // Normalize the file path for database storage
          const normalizedPath = file.path.replace(/\\/g, '/');
          console.log(`Normalized file path: ${normalizedPath}`);
          
          // Insert lesson with the new table structure
          const [result] = await connection.query(
            'INSERT INTO lessons (course_id, week_id, day_id, lesson_name, file_path) VALUES (?, ?, ?, ?, ?)',
            [
              courseIdInt,
              weekIdInt,
              dayIdInt,
              title,
              normalizedPath // Save the normalized file path in the database
            ]
          );
          
          console.log(`Lesson record inserted for file: ${file.originalname}`, {
            insertId: result.insertId,
            affectedRows: result.affectedRows
          });
        } catch (insertError) {
          console.error(`Error inserting lesson for file ${file.originalname}:`, {
            error: insertError.message,
            code: insertError.code,
            sqlMessage: insertError.sqlMessage,
            sql: insertError.sql
          });
          throw insertError; // Re-throw to trigger rollback
        }
      }
      
      await connection.commit();
      console.log('Transaction committed successfully');
      
      res.status(201).json({ 
        message: 'Lesson uploaded successfully',
        fileCount: req.files.length
      });
    } catch (error) {
      console.error('Database error:', {
        message: error.message,
        code: error.code,
        sqlMessage: error.sqlMessage,
        sql: error.sql,
        stack: error.stack
      });
      
      if (connection) {
        try {
          await connection.rollback();
          console.log('Transaction rolled back due to error');
        } catch (rollbackError) {
          console.error('Error during rollback:', rollbackError);
        } finally {
          connection.release(); // Release the connection back to the pool
        }
      }
      
      res.status(500).json({ 
        message: 'Failed to upload lesson',
        error: error.message,
        sqlError: error.sqlMessage
      });
    }
  });
});

const PORT = process.env.PORT || 3002;

// Start server with better error handling
const startServer = async () => {
  try {
    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      console.log(`Creating upload directory: ${uploadDir}`);
      fs.mkdirSync(uploadDir, { recursive: true });
    } else {
      console.log(`Upload directory exists: ${uploadDir}`);
      
      // Check if directory is writable
      try {
        const testFile = `${uploadDir}/test-${Date.now()}.txt`;
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        console.log('Upload directory is writable');
      } catch (error) {
        console.error('Upload directory is not writable:', error.message);
      }
    }
    
    await connectToDatabase();
    
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer().catch(err => {
  console.error('Startup error:', err);
  process.exit(1);
});

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
}); 