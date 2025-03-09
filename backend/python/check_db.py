#!/usr/bin/env python3
import os
import sys
import json
import pymysql
import pymysql.cursors
from dotenv import load_dotenv

def check_database():
    """
    Check the database connection and configuration.
    This is a Python version of the JavaScript check-db.js script.
    """
    print('Database Check Script')
    print('=====================')
    
    # Load environment variables
    load_dotenv()
    
    # Log database configuration
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'user': os.getenv('DB_USER', 'Sara'),
        'database': os.getenv('DB_NAME', 'aischool'),
        'password': os.getenv('DB_PASSWORD', 'Sara0330!!')
    }
    
    print('Database configuration:', {
        'host': db_config['host'],
        'user': db_config['user'],
        'database': db_config['database'],
        'hasPassword': bool(db_config['password'])
    })
    
    connection = None
    
    try:
        # Connect to the database
        connection = pymysql.connect(
            host=db_config['host'],
            user=db_config['user'],
            password=db_config['password'],
            database=db_config['database'],
            cursorclass=pymysql.cursors.DictCursor
        )
        
        print('Successfully connected to MySQL')
        
        # Test the connection with a simple query
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1 + 1 AS result')
            test_result = cursor.fetchone()
            print('Database test query successful:', test_result)
            
            # Get all tables
            cursor.execute('SHOW TABLES')
            tables_result = cursor.fetchall()
            tables = [list(row.values())[0] for row in tables_result]
            print('Tables in database:', tables)
            
            # Check if lessons table exists
            lessons_table_exists = 'lessons' in tables
            print('Lessons table exists:', lessons_table_exists)
            
            if not lessons_table_exists:
                print('Creating lessons table...')
                
                # Create lessons table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS lessons (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        course_id INT NOT NULL,
                        week_id INT NOT NULL,
                        day_id INT NOT NULL,
                        lesson_name VARCHAR(255) NOT NULL,
                        file_path VARCHAR(255) NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                connection.commit()
                print('Lessons table created successfully')
            
            # Check lessons table structure
            cursor.execute('DESCRIBE lessons')
            lessons_structure = cursor.fetchall()
            print('Lessons table structure:')
            for col in lessons_structure:
                print(f"  {col['Field']}: {col['Type']} {col['Null']} {col['Key']} {col['Default']} {col['Extra']}")
            
            # Check if required columns exist
            columns = [col['Field'] for col in lessons_structure]
            required_columns = ['course_id', 'week_id', 'day_id', 'lesson_name', 'file_path']
            missing_columns = [col for col in required_columns if col not in columns]
            
            if missing_columns:
                print('Missing columns in lessons table:', missing_columns)
                
                # Add missing columns
                for column in missing_columns:
                    column_type = ''
                    if column in ['course_id', 'week_id', 'day_id']:
                        column_type = 'INT NOT NULL'
                    else:
                        column_type = 'VARCHAR(255) NOT NULL'
                    
                    cursor.execute(f"ALTER TABLE lessons ADD COLUMN {column} {column_type}")
                    print(f"Added column {column} to lessons table")
                
                connection.commit()
                
                # Check the updated structure
                cursor.execute('DESCRIBE lessons')
                updated_structure = cursor.fetchall()
                print('Updated lessons table structure:')
                for col in updated_structure:
                    print(f"  {col['Field']}: {col['Type']} {col['Null']} {col['Key']} {col['Default']} {col['Extra']}")
            
            # Check uploads directory
            upload_dir = './uploads'
            if not os.path.exists(upload_dir):
                print(f"Creating upload directory: {upload_dir}")
                os.makedirs(upload_dir, exist_ok=True)
            else:
                print(f"Upload directory exists: {upload_dir}")
                
                # Check if directory is writable
                try:
                    test_file = f"{upload_dir}/test-{os.getpid()}.txt"
                    with open(test_file, 'w') as f:
                        f.write('test')
                    os.remove(test_file)
                    print('Upload directory is writable')
                except Exception as e:
                    print('Upload directory is not writable:', str(e))
            
            # Count records in lessons table
            cursor.execute('SELECT COUNT(*) as count FROM lessons')
            lessons_count = cursor.fetchone()
            print(f"Total lessons in database: {lessons_count['count']}")
            
            # Check related tables
            related_tables = ['courses', 'weeks', 'days']
            for table in related_tables:
                if table in tables:
                    cursor.execute(f"SELECT COUNT(*) as count FROM {table}")
                    count = cursor.fetchone()
                    print(f"Total {table} in database: {count['count']}")
                    
                    # Show sample data
                    cursor.execute(f"SELECT * FROM {table} LIMIT 5")
                    sample = cursor.fetchall()
                    print(f"Sample {table} data:")
                    for row in sample:
                        print(f"  {row}")
                else:
                    print(f"{table} table does not exist!")
            
            print('Database check completed successfully')
    except Exception as e:
        print('Database check error:', {
            'message': str(e),
            'code': getattr(e, 'code', None),
            'sqlMessage': getattr(e, 'sqlMessage', None),
            'stack': getattr(e, '__traceback__', None)
        })
    finally:
        if connection:
            connection.close()
            print('Database connection closed')

if __name__ == "__main__":
    try:
        check_database()
    except Exception as e:
        print('Unhandled error:', str(e))
        sys.exit(1) 