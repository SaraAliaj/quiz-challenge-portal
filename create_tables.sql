-- Drop existing tables if they exist
DROP TABLE IF EXISTS lessons;
DROP TABLE IF EXISTS days;
DROP TABLE IF EXISTS weeks;
DROP TABLE IF EXISTS courses;

-- Create the courses table
CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the weeks table
CREATE TABLE IF NOT EXISTS weeks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the days table
CREATE TABLE IF NOT EXISTS days (
    id INT AUTO_INCREMENT PRIMARY KEY,
    day_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the lessons table
CREATE TABLE IF NOT EXISTS lessons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    week_id INT NOT NULL,
    day_id INT NOT NULL,
    lesson_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (week_id) REFERENCES weeks(id) ON DELETE CASCADE,
    FOREIGN KEY (day_id) REFERENCES days(id) ON DELETE CASCADE
);

-- Insert sample data for courses
INSERT INTO courses (name, description) VALUES
('Web Development', 'Full-stack web development course'),
('Data Science', 'Data science and machine learning course'),
('Mobile Development', 'Mobile app development course');

-- Insert sample data for weeks
INSERT INTO weeks (name, description) VALUES
('Week 1', 'Introduction and basics'),
('Week 2', 'Intermediate concepts'),
('Week 3', 'Advanced topics'),
('Week 4', 'Project work');

-- Insert sample data for days
INSERT INTO days (day_name) VALUES
('Monday'),
('Tuesday'),
('Wednesday'),
('Thursday'),
('Friday'); 