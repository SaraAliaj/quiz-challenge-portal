#!/usr/bin/env python3
import os
import sys
import pymysql
from dotenv import load_dotenv

def init_database():
    """
    Initialize the database by creating it if it doesn't exist
    and setting up the required tables.
    This is a Python version of the JavaScript init-db.js script.
    """
    # Load environment variables
    load_dotenv()
    
    # Database configuration
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'user': os.getenv('DB_USER', 'Sara'),
        'password': os.getenv('DB_PASSWORD', 'Sara0330!!')
    }
    
    # Database name
    db_name = os.getenv('DB_NAME', 'aischool')
    
    connection = None
    
    try:
        # Connect to MySQL server (without specifying a database)
        connection = pymysql.connect(
            host=db_config['host'],
            user=db_config['user'],
            password=db_config['password']
        )
        
        print(f"Connected to MySQL server at {db_config['host']}")
        
        # Create a cursor
        with connection.cursor() as cursor:
            # Create database if it doesn't exist
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
            print(f"Database '{db_name}' created or already exists")
            
            # Use the database
            cursor.execute(f"USE {db_name}")
            print(f"Using database '{db_name}'")
            
            # Create users table if it doesn't exist
            create_table_query = """
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(255) NOT NULL,
                    surname VARCHAR(255),
                    email VARCHAR(255) NOT NULL UNIQUE,
                    password VARCHAR(255) NOT NULL
                )
            """
            cursor.execute(create_table_query)
            print("Users table created or already exists")
            
            # Check if the table has the required columns
            cursor.execute("DESCRIBE users")
            columns = [row[0] for row in cursor.fetchall()]
            
            # Add role column if it doesn't exist
            if 'role' not in columns:
                cursor.execute("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user'")
                print("Added 'role' column to users table")
            
            # Add active column if it doesn't exist
            if 'active' not in columns:
                cursor.execute("ALTER TABLE users ADD COLUMN active BOOLEAN DEFAULT FALSE")
                print("Added 'active' column to users table")
            
            # Add created_at column if it doesn't exist
            if 'created_at' not in columns:
                cursor.execute("ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
                print("Added 'created_at' column to users table")
            
            # Add last_activity column if it doesn't exist
            if 'last_activity' not in columns:
                cursor.execute("""
                    ALTER TABLE users 
                    ADD COLUMN last_activity TIMESTAMP 
                    DEFAULT CURRENT_TIMESTAMP 
                    ON UPDATE CURRENT_TIMESTAMP
                """)
                print("Added 'last_activity' column to users table")
            
            # Commit the changes
            connection.commit()
            
            print("Database initialization completed successfully")
    except Exception as e:
        print(f"Error initializing database: {str(e)}")
        sys.exit(1)
    finally:
        if connection:
            connection.close()
            print("Database connection closed")

if __name__ == "__main__":
    init_database() 