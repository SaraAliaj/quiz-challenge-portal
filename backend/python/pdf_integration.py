#!/usr/bin/env python3
import os
import sys
import json
import subprocess
import logging
from pathlib import Path
import pymysql
import pymysql.cursors
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("pdf_integration")

# Load environment variables
load_dotenv()

class PDFIntegration:
    """
    Class to handle PDF processing and integration with the database.
    This is a Python version of the JavaScript pdf_integration.js module.
    """
    
    def __init__(self):
        """Initialize the PDF integration module"""
        # Database connection configuration
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'user': os.getenv('DB_USER', 'Sara'),
            'password': os.getenv('DB_PASSWORD', 'Sara0330!!'),
            'database': os.getenv('DB_NAME', 'aischool'),
            'cursorclass': pymysql.cursors.DictCursor
        }
        
        # Create directories if they don't exist
        self.pdf_dir = Path(os.getcwd()) / 'uploads' / 'pdfs'
        self.json_dir = Path(os.getcwd()) / 'uploads' / 'processed'
        
        self.pdf_dir.mkdir(parents=True, exist_ok=True)
        self.json_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"PDF directory: {self.pdf_dir}")
        logger.info(f"JSON directory: {self.json_dir}")
    
    def get_connection(self):
        """Create and return a database connection"""
        try:
            connection = pymysql.connect(**self.db_config)
            return connection
        except Exception as e:
            logger.error(f"Database connection error: {str(e)}")
            raise
    
    def process_pdf(self, pdf_path):
        """
        Process a PDF file using the Python script
        
        Args:
            pdf_path (str): Path to the PDF file
            
        Returns:
            str: Path to the processed JSON file
        """
        try:
            # Generate output path
            file_name = Path(pdf_path).stem
            json_path = str(self.json_dir / f"{file_name}.json")
            
            logger.info(f"Processing PDF: {pdf_path}")
            logger.info(f"Output will be saved to: {json_path}")
            
            # Run the Python script
            process = subprocess.Popen(
                ['python', 'pdf_processor.py', pdf_path, '--output', json_path],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Capture output
            stdout, stderr = process.communicate()
            
            # Log output
            if stdout:
                logger.info(f"Python output: {stdout}")
            if stderr:
                logger.error(f"Python error: {stderr}")
            
            # Check return code
            if process.returncode != 0:
                logger.error(f"Python process exited with code {process.returncode}")
                logger.error(f"Error: {stderr}")
                raise Exception(f"PDF processing failed with code {process.returncode}: {stderr}")
            
            # Check if the output file exists
            if not os.path.exists(json_path):
                raise FileNotFoundError("PDF processing completed but output file was not created")
            
            logger.info(f"PDF processing completed successfully: {json_path}")
            return json_path
        except Exception as e:
            logger.error(f"Error processing PDF: {str(e)}")
            raise
    
    def add_to_database(self, json_path, lesson_info):
        """
        Add a processed PDF to the database
        
        Args:
            json_path (str): Path to the processed JSON file
            lesson_info (dict): Information about the lesson
            
        Returns:
            int: ID of the inserted lesson
        """
        try:
            # Read the processed JSON file
            with open(json_path, 'r', encoding='utf-8') as f:
                json_content = json.load(f)
            
            # Get a database connection
            connection = self.get_connection()
            
            try:
                with connection.cursor() as cursor:
                    # Insert into the database
                    cursor.execute(
                        """
                        INSERT INTO lessons 
                        (course_id, week_id, day_id, lesson_name, file_path, summary, ai_enhanced) 
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            lesson_info['courseId'],
                            lesson_info['weekId'],
                            lesson_info['dayId'],
                            lesson_info.get('title', json_content.get('title', '')),
                            json_path,
                            json_content.get('summary', ''),
                            1  # Flag to indicate this is an AI-enhanced lesson
                        )
                    )
                    
                    # Get the inserted ID
                    lesson_id = cursor.lastrowid
                    logger.info(f"Lesson added to database with ID: {lesson_id}")
                    
                    # Add QA pairs to a separate table if it exists
                    if json_content.get('qa_pairs') and len(json_content['qa_pairs']) > 0:
                        try:
                            # Check if the qa_pairs table exists
                            cursor.execute("SHOW TABLES LIKE 'lesson_qa_pairs'")
                            if not cursor.fetchone():
                                # Create the table if it doesn't exist
                                cursor.execute("""
                                    CREATE TABLE lesson_qa_pairs (
                                        id INT AUTO_INCREMENT PRIMARY KEY,
                                        lesson_id INT NOT NULL,
                                        question TEXT NOT NULL,
                                        answer TEXT NOT NULL,
                                        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
                                    )
                                """)
                                logger.info("Created lesson_qa_pairs table")
                            
                            # Insert QA pairs
                            for pair in json_content['qa_pairs']:
                                cursor.execute(
                                    "INSERT INTO lesson_qa_pairs (lesson_id, question, answer) VALUES (%s, %s, %s)",
                                    (lesson_id, pair['question'], pair['answer'])
                                )
                            
                            logger.info(f"Added {len(json_content['qa_pairs'])} QA pairs for lesson {lesson_id}")
                        except Exception as e:
                            logger.error(f"Error adding QA pairs: {str(e)}")
                            # Continue even if QA pairs couldn't be added
                    
                    # Commit the transaction
                    connection.commit()
                    
                    return lesson_id
            finally:
                connection.close()
        except Exception as e:
            logger.error(f"Error adding to database: {str(e)}")
            raise
    
    def process_and_add_lesson(self, pdf_path, lesson_info):
        """
        Process a PDF file and add it to the database
        
        Args:
            pdf_path (str): Path to the PDF file
            lesson_info (dict): Information about the lesson
            
        Returns:
            dict: Information about the processed lesson
        """
        try:
            # Process the PDF
            json_path = self.process_pdf(pdf_path)
            
            # Add to database
            lesson_id = self.add_to_database(json_path, lesson_info)
            
            return {
                'lessonId': lesson_id,
                'jsonPath': json_path,
                'success': True
            }
        except Exception as e:
            logger.error(f"Error in process_and_add_lesson: {str(e)}")
            return {
                'error': str(e),
                'success': False
            }
    
    def get_lesson_content(self, lesson_id):
        """
        Get lesson content from a processed JSON file
        
        Args:
            lesson_id (int): ID of the lesson
            
        Returns:
            dict: Lesson content
        """
        try:
            # Get a database connection
            connection = self.get_connection()
            
            try:
                with connection.cursor() as cursor:
                    # Get the lesson from the database
                    cursor.execute(
                        "SELECT * FROM lessons WHERE id = %s",
                        (lesson_id,)
                    )
                    lesson = cursor.fetchone()
                    
                    if not lesson:
                        raise ValueError("Lesson not found")
                    
                    file_path = lesson['file_path']
                    
                    # Check if this is an AI-enhanced lesson (JSON file)
                    if lesson.get('ai_enhanced') and file_path.endswith('.json'):
                        # Read the JSON file
                        if not os.path.exists(file_path):
                            raise FileNotFoundError("Lesson file not found")
                        
                        with open(file_path, 'r', encoding='utf-8') as f:
                            json_content = json.load(f)
                        
                        # Get QA pairs if available
                        qa_pairs = []
                        try:
                            cursor.execute("SHOW TABLES LIKE 'lesson_qa_pairs'")
                            if cursor.fetchone():
                                cursor.execute(
                                    "SELECT question, answer FROM lesson_qa_pairs WHERE lesson_id = %s",
                                    (lesson_id,)
                                )
                                qa_pairs = cursor.fetchall()
                        except Exception as e:
                            logger.error(f"Error fetching QA pairs: {str(e)}")
                        
                        return {
                            'id': lesson['id'],
                            'title': lesson['lesson_name'],
                            'summary': json_content.get('summary', lesson.get('summary', '')),
                            'content': json_content.get('full_text', ''),
                            'sections': json_content.get('sections', []),
                            'qaPairs': qa_pairs if qa_pairs else json_content.get('qa_pairs', [])
                        }
                    else:
                        # Regular file, just read the content
                        if not os.path.exists(file_path):
                            raise FileNotFoundError("Lesson file not found")
                        
                        with open(file_path, 'r', encoding='utf-8') as f:
                            file_content = f.read()
                        
                        return {
                            'id': lesson['id'],
                            'title': lesson['lesson_name'],
                            'content': file_content
                        }
            finally:
                connection.close()
        except Exception as e:
            logger.error(f"Error getting lesson content: {str(e)}")
            raise

# Create a singleton instance
pdf_integration = PDFIntegration()

# Export functions for direct use
def process_pdf(pdf_path):
    return pdf_integration.process_pdf(pdf_path)

def add_to_database(json_path, lesson_info):
    return pdf_integration.add_to_database(json_path, lesson_info)

def process_and_add_lesson(pdf_path, lesson_info):
    return pdf_integration.process_and_add_lesson(pdf_path, lesson_info)

def get_lesson_content(lesson_id):
    return pdf_integration.get_lesson_content(lesson_id)

# For direct execution
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python pdf_integration.py <pdf_path> [--lesson-id <id>]")
        sys.exit(1)
    
    if sys.argv[1] == "--lesson-id" and len(sys.argv) >= 3:
        # Get lesson content
        lesson_id = int(sys.argv[2])
        try:
            content = get_lesson_content(lesson_id)
            print(json.dumps(content, indent=2))
        except Exception as e:
            print(f"Error: {str(e)}")
            sys.exit(1)
    else:
        # Process PDF
        pdf_path = sys.argv[1]
        if not os.path.exists(pdf_path):
            print(f"Error: PDF file not found: {pdf_path}")
            sys.exit(1)
        
        try:
            json_path = process_pdf(pdf_path)
            print(f"PDF processed successfully: {json_path}")
        except Exception as e:
            print(f"Error: {str(e)}")
            sys.exit(1) 