import 'dotenv/config';
import mysql from 'mysql2/promise';
import path from 'path';
import fs from 'fs';

async function createSampleCurriculum() {
  console.log('Creating Sample Curriculum');
  console.log('=========================');
  
  let connection;
  
  try {
    // Connect to the database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'aischool'
    });
    
    console.log('Successfully connected to MySQL');
    
    // Create sample courses
    console.log('Creating sample courses...');
    const courses = [
      { name: 'Deep Learning Fundamentals' },
      { name: 'Web Development' },
      { name: 'Data Science' }
    ];
    
    for (const course of courses) {
      const [result] = await connection.query(
        'INSERT INTO courses (name) VALUES (?)',
        [course.name]
      );
      console.log(`Created course: ${course.name} with ID: ${result.insertId}`);
    }
    
    // Get all courses
    const [coursesResult] = await connection.query('SELECT * FROM courses');
    console.log('Courses:', coursesResult);
    
    // Create sample weeks
    console.log('Creating sample weeks...');
    const weeks = [
      { name: 'Week 1: Introduction' },
      { name: 'Week 2: Fundamentals' },
      { name: 'Week 3: Advanced Topics' }
    ];
    
    for (const week of weeks) {
      const [result] = await connection.query(
        'INSERT INTO weeks (name) VALUES (?)',
        [week.name]
      );
      console.log(`Created week: ${week.name} with ID: ${result.insertId}`);
    }
    
    // Get all weeks
    const [weeksResult] = await connection.query('SELECT * FROM weeks');
    console.log('Weeks:', weeksResult);
    
    // Create sample days
    console.log('Creating sample days...');
    const days = [
      { day_name: 'Day 1: Introduction' },
      { day_name: 'Day 2: Core Concepts' },
      { day_name: 'Day 3: Practical Applications' },
      { day_name: 'Day 4: Advanced Techniques' },
      { day_name: 'Day 5: Project Work' }
    ];
    
    for (const day of days) {
      const [result] = await connection.query(
        'INSERT INTO days (day_name) VALUES (?)',
        [day.day_name]
      );
      console.log(`Created day: ${day.day_name} with ID: ${result.insertId}`);
    }
    
    // Get all days
    const [daysResult] = await connection.query('SELECT * FROM days');
    console.log('Days:', daysResult);
    
    // Create sample lessons
    console.log('Creating sample lessons...');
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Create a sample text file for lessons
    const sampleFilePath = path.join(uploadsDir, 'sample_lesson.txt');
    fs.writeFileSync(sampleFilePath, 'This is a sample lesson content.\n\nIt contains multiple paragraphs of text that would normally be part of a lesson.');
    
    // Create lessons for each course, week, and day combination
    for (const course of coursesResult) {
      for (const week of weeksResult) {
        for (const day of daysResult) {
          const lessonName = `${course.name} - ${week.name} - ${day.day_name}`;
          const [result] = await connection.query(
            'INSERT INTO lessons (course_id, week_id, day_id, lesson_name, file_path) VALUES (?, ?, ?, ?, ?)',
            [course.id, week.id, day.id, lessonName, sampleFilePath]
          );
          console.log(`Created lesson: ${lessonName} with ID: ${result.insertId}`);
        }
      }
    }
    
    console.log('Sample curriculum created successfully!');
    
  } catch (error) {
    console.error('Error creating sample curriculum:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

createSampleCurriculum(); 