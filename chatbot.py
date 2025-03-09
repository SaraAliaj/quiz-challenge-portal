#!/usr/bin/env python3
import asyncio
import json
import logging
import os
import sys
from typing import Dict, List, Optional, Any

import websockets
import pymysql
import pymysql.cursors
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("chatbot")

# Load environment variables
load_dotenv()

class PDFIntegration:
    """Python implementation of the PDF integration functionality"""
    
    def __init__(self):
        # Database connection configuration
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'user': os.getenv('DB_USER', 'Sara'),
            'password': os.getenv('DB_PASSWORD', 'Sara0330!!'),
            'database': os.getenv('DB_NAME', 'aischool'),
            'cursorclass': pymysql.cursors.DictCursor
        }
        logger.info(f"Database configuration: {self.db_config['host']}, {self.db_config['user']}, {self.db_config['database']}")
    
    def get_connection(self):
        """Create and return a database connection"""
        try:
            connection = pymysql.connect(**self.db_config)
            return connection
        except Exception as e:
            logger.error(f"Database connection error: {str(e)}")
            raise
    
    def get_lesson_content(self, lesson_id: int) -> Dict[str, Any]:
        """Get lesson content from the database"""
        try:
            connection = self.get_connection()
            with connection.cursor() as cursor:
                # Get the lesson from the database
                cursor.execute(
                    "SELECT * FROM lessons WHERE id = %s",
                    (lesson_id,)
                )
                lesson = cursor.fetchone()
                
                if not lesson:
                    raise ValueError(f"Lesson with ID {lesson_id} not found")
                
                file_path = lesson['file_path']
                
                # Check if this is an AI-enhanced lesson (JSON file)
                if lesson.get('ai_enhanced') and file_path.endswith('.json'):
                    # Read the JSON file
                    if not os.path.exists(file_path):
                        raise FileNotFoundError(f"Lesson file not found: {file_path}")
                    
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
                        raise FileNotFoundError(f"Lesson file not found: {file_path}")
                    
                    with open(file_path, 'r', encoding='utf-8') as f:
                        file_content = f.read()
                    
                    return {
                        'id': lesson['id'],
                        'title': lesson['lesson_name'],
                        'content': file_content
                    }
        except Exception as e:
            logger.error(f"Error getting lesson content: {str(e)}")
            raise
        finally:
            if 'connection' in locals():
                connection.close()

class ChatbotServer:
    """WebSocket server for the chatbot"""
    
    def __init__(self, host: str = 'localhost', port: int = 8081):
        self.host = host
        self.port = port
        self.pdf_integration = PDFIntegration()
        self.clients = set()
    
    async def handle_client(self, websocket, path):
        """Handle a client connection"""
        self.clients.add(websocket)
        try:
            logger.info(f"Client connected: {websocket.remote_address}")
            
            # Send welcome message
            welcome_message = {
                'text': 'Welcome to the AI School Chatbot! How can I help you today?',
                'sender': 'bot'
            }
            await websocket.send(json.dumps(welcome_message))
            
            async for message in websocket:
                try:
                    data = json.loads(message)
                    logger.info(f"Received message: {data}")
                    
                    # Process the message
                    response = await self.process_message(data)
                    
                    # Send the response
                    await websocket.send(json.dumps(response))
                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON received: {message}")
                    error_response = {
                        'text': 'Sorry, I received an invalid message format. Please try again.',
                        'sender': 'bot'
                    }
                    await websocket.send(json.dumps(error_response))
        except websockets.exceptions.ConnectionClosed as e:
            logger.info(f"Client disconnected: {websocket.remote_address} - {str(e)}")
        finally:
            self.clients.remove(websocket)
    
    async def process_message(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process a message from a client"""
        try:
            user_text = data.get('text', '')
            
            if not user_text:
                return {
                    'text': 'I received an empty message. Please try again.',
                    'sender': 'bot'
                }
            
            # Simple echo response for now
            # In a real implementation, you would process the message and generate a response
            # This could involve querying a database, calling an API, etc.
            
            # Check if the message is asking about database
            if 'database' in user_text.lower() or 'db' in user_text.lower():
                return await self.check_database()
            
            # Default response
            return {
                'text': f"You said: {user_text}\n\nI'm a simple chatbot. I can help you with information about your lessons and courses.",
                'sender': 'bot'
            }
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            return {
                'text': f"I'm sorry, I encountered an error processing your message: {str(e)}",
                'sender': 'bot',
                'error': True
            }
    
    async def check_database(self) -> Dict[str, Any]:
        """Check the database connection and return information"""
        try:
            # Get a database connection
            connection = self.pdf_integration.get_connection()
            
            # Test the connection with a simple query
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1 + 1 AS result")
                result = cursor.fetchone()
                
                # Get all tables
                cursor.execute("SHOW TABLES")
                tables = [list(table.values())[0] for table in cursor.fetchall()]
                
                # Check if lessons table exists
                lessons_table_exists = 'lessons' in tables
                
                # Get lesson count if the table exists
                lesson_count = 0
                if lessons_table_exists:
                    cursor.execute("SELECT COUNT(*) as count FROM lessons")
                    lesson_count = cursor.fetchone()['count']
                
                # Format the response
                response = (
                    f"Database connection successful!\n\n"
                    f"Database: {self.pdf_integration.db_config['database']}\n"
                    f"Host: {self.pdf_integration.db_config['host']}\n"
                    f"User: {self.pdf_integration.db_config['user']}\n\n"
                    f"Tables in database: {', '.join(tables)}\n"
                    f"Lessons table exists: {lessons_table_exists}\n"
                    f"Total lessons: {lesson_count}"
                )
                
                return {
                    'text': response,
                    'sender': 'bot'
                }
        except Exception as e:
            logger.error(f"Database check error: {str(e)}")
            return {
                'text': f"Database connection failed: {str(e)}",
                'sender': 'bot',
                'error': True
            }
        finally:
            if 'connection' in locals():
                connection.close()
    
    async def start_server(self):
        """Start the WebSocket server"""
        server = await websockets.serve(self.handle_client, self.host, self.port)
        logger.info(f"WebSocket server started on ws://{self.host}:{self.port}")
        return server

async def main():
    """Main entry point"""
    # Create and start the chatbot server
    chatbot = ChatbotServer()
    server = await chatbot.start_server()
    
    # Keep the server running
    await server.wait_closed()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {str(e)}") 