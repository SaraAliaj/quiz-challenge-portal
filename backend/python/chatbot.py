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
                logger.info(f"Retrieved lesson with file path: {file_path}")
                
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
                        'qaPairs': qa_pairs if qa_pairs else json_content.get('qa_pairs', []),
                        'pdfUrl': self._get_pdf_url(lesson_id)  # Add PDF URL
                    }
                elif file_path.lower().endswith('.pdf'):
                    # Handle PDF files
                    if not os.path.exists(file_path):
                        logger.error(f"PDF file not found: {file_path}")
                        # Try to find the file in a different location
                        base_name = os.path.basename(file_path)
                        alternative_paths = [
                            os.path.join('uploads', base_name),
                            os.path.join('backend', 'node', 'uploads', base_name),
                            os.path.join('backend', 'python', 'uploads', base_name),
                            os.path.join('backend', 'python', 'pdfs', base_name)
                        ]
                        
                        for alt_path in alternative_paths:
                            if os.path.exists(alt_path):
                                file_path = alt_path
                                logger.info(f"Found PDF at alternative location: {file_path}")
                                break
                        else:
                            # If still not found, try to get a default lesson
                            try:
                                with open('backend/python/pdfs/deep_learning_intro.txt', 'r', encoding='utf-8') as f:
                                    default_content = f.read()
                                    # Create a sample PDF if it doesn't exist
                                    self._create_sample_pdf_if_needed()
                                    return {
                                        'id': lesson['id'],
                                        'title': lesson['lesson_name'],
                                        'content': default_content,
                                        'summary': "This is a default lesson about deep learning as the original PDF could not be found.",
                                        'pdfUrl': self._get_pdf_url(lesson_id)  # Add PDF URL
                                    }
                            except:
                                raise FileNotFoundError(f"Lesson file not found: {file_path}")
                    
                    try:
                        # Try to import fitz (PyMuPDF)
                        import fitz
                        
                        # Extract text from PDF
                        pdf_text = ""
                        pdf_document = fitz.open(file_path)
                        
                        # Extract text from each page
                        for page_num in range(len(pdf_document)):
                            page = pdf_document[page_num]
                            pdf_text += page.get_text()
                        
                        # Generate a simple summary (first 500 characters)
                        summary = pdf_text[:500] + "..." if len(pdf_text) > 500 else pdf_text
                        
                        return {
                            'id': lesson['id'],
                            'title': lesson['lesson_name'],
                            'content': pdf_text,
                            'summary': summary,
                            'fileType': 'pdf',
                            'fileName': os.path.basename(file_path),
                            'pdfUrl': self._get_pdf_url(lesson_id)  # Add PDF URL
                        }
                    except ImportError:
                        logger.error("PyMuPDF (fitz) not installed. Cannot extract text from PDF.")
                        # Create a sample PDF if it doesn't exist
                        self._create_sample_pdf_if_needed()
                        return {
                            'id': lesson['id'],
                            'title': lesson['lesson_name'],
                            'content': "This is a PDF document. The text could not be extracted because PyMuPDF is not installed.",
                            'summary': "PDF text extraction not available.",
                            'fileType': 'pdf',
                            'fileName': os.path.basename(file_path),
                            'pdfUrl': self._get_pdf_url(lesson_id)  # Add PDF URL
                        }
                    except Exception as e:
                        logger.error(f"Error extracting text from PDF: {str(e)}")
                        # Create a sample PDF if it doesn't exist
                        self._create_sample_pdf_if_needed()
                        return {
                            'id': lesson['id'],
                            'title': lesson['lesson_name'],
                            'content': f"Error extracting text from PDF: {str(e)}",
                            'summary': "Error processing PDF document.",
                            'fileType': 'pdf',
                            'fileName': os.path.basename(file_path),
                            'pdfUrl': self._get_pdf_url(lesson_id)  # Add PDF URL
                        }
                else:
                    # Regular file, just read the content
                    if not os.path.exists(file_path):
                        logger.error(f"File not found: {file_path}")
                        # Try to find the file in a different location
                        base_name = os.path.basename(file_path)
                        alternative_paths = [
                            os.path.join('uploads', base_name),
                            os.path.join('backend', 'node', 'uploads', base_name),
                            os.path.join('backend', 'python', 'uploads', base_name)
                        ]
                        
                        for alt_path in alternative_paths:
                            if os.path.exists(alt_path):
                                file_path = alt_path
                                logger.info(f"Found file at alternative location: {file_path}")
                                break
                        else:
                            # Create a sample PDF if it doesn't exist
                            self._create_sample_pdf_if_needed()
                            raise FileNotFoundError(f"Lesson file not found: {file_path}")
                    
                    with open(file_path, 'r', encoding='utf-8') as f:
                        file_content = f.read()
                    
                    # Generate a simple summary (first 500 characters)
                    summary = file_content[:500] + "..." if len(file_content) > 500 else file_content
                    
                    return {
                        'id': lesson['id'],
                        'title': lesson['lesson_name'],
                        'content': file_content,
                        'summary': summary,
                        'fileType': os.path.splitext(file_path)[1][1:] or 'txt',
                        'fileName': os.path.basename(file_path),
                        'pdfUrl': self._get_pdf_url(lesson_id)  # Add PDF URL
                    }
        except Exception as e:
            logger.error(f"Error getting lesson content: {str(e)}")
            raise
        finally:
            if 'connection' in locals():
                connection.close()
    
    def _get_pdf_url(self, lesson_id: int) -> str:
        """Get the URL for the PDF file"""
        # Use the Node.js backend URL for PDF download
        return f"http://localhost:3001/api/lessons/{lesson_id}/download"
    
    def _create_sample_pdf_if_needed(self):
        """Create a sample PDF file if it doesn't exist"""
        try:
            # Check if reportlab is installed
            import reportlab
            from reportlab.pdfgen import canvas
            from reportlab.lib.pagesizes import letter
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import SimpleDocTemplate, Paragraph
            
            # Create pdfs directory if it doesn't exist
            pdfs_dir = os.path.join('backend', 'node', 'uploads')
            os.makedirs(pdfs_dir, exist_ok=True)
            
            # Path to the sample PDF
            sample_pdf_path = os.path.join(pdfs_dir, 'deep_learning_intro.pdf')
            
            # Check if the sample PDF already exists
            if os.path.exists(sample_pdf_path):
                logger.info(f"Sample PDF already exists at {sample_pdf_path}")
                return
            
            # Create a new PDF
            doc = SimpleDocTemplate(sample_pdf_path, pagesize=letter)
            styles = getSampleStyleSheet()
            story = []
            
            # Add title
            title_style = styles['Title']
            story.append(Paragraph("Introduction to Deep Learning", title_style))
            
            # Add content from the text file
            try:
                with open('backend/python/pdfs/deep_learning_intro.txt', 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                    # Split content by sections
                    sections = content.split('##')
                    
                    # Add introduction
                    intro = sections[0].strip()
                    for paragraph in intro.split('\n\n'):
                        if paragraph.strip():
                            story.append(Paragraph(paragraph.strip(), styles['Normal']))
                    
                    # Add sections
                    for section in sections[1:]:
                        if section.strip():
                            lines = section.strip().split('\n')
                            section_title = lines[0].strip()
                            section_content = '\n'.join(lines[1:]).strip()
                            
                            story.append(Paragraph(section_title, styles['Heading2']))
                            
                            for paragraph in section_content.split('\n\n'):
                                if paragraph.strip():
                                    story.append(Paragraph(paragraph.strip(), styles['Normal']))
            except Exception as e:
                logger.error(f"Error reading content file: {str(e)}")
                # Add default content
                story.append(Paragraph("Deep learning is a subset of machine learning that uses neural networks with multiple layers to analyze various forms of data.", styles['Normal']))
            
            # Build the PDF
            doc.build(story)
            logger.info(f"Created sample PDF at {sample_pdf_path}")
            
            # Update the database to point to this file
            try:
                connection = self.get_connection()
                with connection.cursor() as cursor:
                    cursor.execute(
                        "UPDATE lessons SET file_path = %s WHERE id = 2",
                        (sample_pdf_path,)
                    )
                    connection.commit()
                    logger.info("Updated lesson 2 with sample PDF path")
            except Exception as e:
                logger.error(f"Error updating database: {str(e)}")
            finally:
                if 'connection' in locals():
                    connection.close()
                    
        except ImportError:
            logger.error("ReportLab not installed. Cannot create sample PDF.")
        except Exception as e:
            logger.error(f"Error creating sample PDF: {str(e)}")

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
            lesson_id = data.get('lessonId')
            
            if not user_text:
                return {
                    'text': 'I received an empty message. Please try again.',
                    'sender': 'bot'
                }
            
            logger.info(f"Processing message for lesson {lesson_id}: {user_text}")
            
            # If we have a lesson ID, try to get lesson content
            if lesson_id:
                try:
                    # Convert lesson_id to integer if it's a string
                    if isinstance(lesson_id, str):
                        lesson_id = int(lesson_id)
                    
                    # Get lesson content from database
                    lesson_data = self.pdf_integration.get_lesson_content(lesson_id)
                    
                    # Extract relevant information
                    title = lesson_data.get('title', 'Unknown Lesson')
                    content = lesson_data.get('content', '')
                    summary = lesson_data.get('summary', '')
                    
                    # Normalize the user's question and the content for better matching
                    user_text_lower = user_text.lower()
                    content_lower = content.lower()
                    
                    # Check if we have QA pairs to match against
                    if lesson_data.get('qaPairs') and len(lesson_data['qaPairs']) > 0:
                        # Try to find a direct match in QA pairs
                        for qa_pair in lesson_data['qaPairs']:
                            question = qa_pair.get('question', '').lower()
                            if question and (question in user_text_lower or user_text_lower in question):
                                return {
                                    'text': qa_pair.get('answer', 'I found this question but no answer is available.'),
                                    'sender': 'bot',
                                    'matched': True
                                }
                    
                    # Parse the content into sections based on markdown headers
                    sections = self._parse_content_into_sections(content)
                    
                    # Define question types and their keywords
                    question_types = {
                        'definition': ['what is', 'define', 'meaning of', 'definition of', 'explain what'],
                        'explanation': ['explain', 'how does', 'tell me about', 'describe', 'elaborate on'],
                        'examples': ['example', 'examples of', 'instance of', 'show me', 'give me an example'],
                        'advantages': ['advantage', 'benefit', 'pro', 'good thing', 'positive'],
                        'disadvantages': ['disadvantage', 'challenge', 'con', 'drawback', 'negative', 'problem'],
                        'applications': ['application', 'use case', 'used for', 'applied in', 'where is it used'],
                        'comparison': ['compare', 'difference', 'versus', 'vs', 'similar to', 'different from'],
                        'process': ['process', 'step', 'how to', 'procedure', 'method', 'technique'],
                        'components': ['component', 'part', 'element', 'consist of', 'made up of', 'structure']
                    }
                    
                    # Identify the question type
                    identified_types = []
                    for q_type, keywords in question_types.items():
                        for keyword in keywords:
                            if keyword in user_text_lower:
                                identified_types.append(q_type)
                                break
                    
                    # If no specific question type is identified, default to explanation
                    if not identified_types:
                        identified_types = ['explanation']
                    
                    # Extract key terms from the user's question (excluding common words)
                    stop_words = {'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 
                                 'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could', 'will', 
                                 'would', 'should', 'may', 'might', 'must', 'to', 'of', 'in', 'on', 
                                 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 
                                 'through', 'during', 'before', 'after', 'above', 'below', 'from', 
                                 'up', 'down', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 
                                 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 
                                 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 
                                 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 
                                 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'and', 'or', 
                                 'but', 'if', 'because', 'as', 'until', 'while', 'i', 'how', 'why', 
                                 'when', 'where', 'who', 'whom', 'which', 'what'}
                    
                    # Extract key terms from the question
                    key_terms = [word for word in user_text_lower.split() if word not in stop_words]
                    
                    # Find the most relevant section based on question type and key terms
                    relevant_section = self._find_relevant_section(sections, identified_types, key_terms, content_lower)
                    
                    # If asking about the topic or for a general explanation
                    if ('what is' in user_text_lower and any(term in user_text_lower for term in ['deep learning', 'topic', 'lesson'])) or \
                       ('explain' in user_text_lower and any(term in user_text_lower for term in ['deep learning', 'topic', 'lesson'])):
                        if summary:
                            response = f"**{title}**\n\n{summary}"
                        else:
                            # Extract introduction section
                            intro_section = next((s for s in sections if 'introduction' in s['title'].lower()), None)
                            if intro_section:
                                response = f"**{title}**\n\n{intro_section['content']}"
                            else:
                                # Extract first few paragraphs if no introduction section
                                paragraphs = content.split('\n\n')
                                intro = '\n\n'.join(paragraphs[:3]) if len(paragraphs) > 3 else content
                                response = f"**{title}**\n\n{intro}"
                    
                    # If we found a relevant section
                    elif relevant_section:
                        response = f"**{relevant_section['title']}**\n\n{relevant_section['content']}"
                    
                    # For database-related queries
                    elif 'database' in user_text_lower or 'db' in user_text_lower:
                        return await self.check_database()
                    
                    # Default response with lesson context
                    else:
                        response = f"I'm here to help you with '{title}'. You can ask me to explain specific concepts like neural networks, activation functions, or applications of deep learning."
                    
                    return {
                        'text': response,
                        'sender': 'bot',
                        'lesson_title': title
                    }
                    
                except ValueError as e:
                    logger.error(f"Error processing lesson data: {str(e)}")
                    return {
                        'text': f"I couldn't find information for lesson {lesson_id}. Please try another lesson.",
                        'sender': 'bot',
                        'error': True
                    }
                except Exception as e:
                    logger.error(f"Error retrieving lesson content: {str(e)}")
                    return {
                        'text': f"I'm sorry, I encountered an error retrieving the lesson content: {str(e)}",
                        'sender': 'bot',
                        'error': True
                    }
            
            # Check if the message is asking about database
            if 'database' in user_text.lower() or 'db' in user_text.lower():
                return await self.check_database()
            
            # Default response
            return {
                'text': f"You said: {user_text}\n\nI'm a simple chatbot. I can help you with information about your lessons and courses. Please select a lesson to get more specific information.",
                'sender': 'bot'
            }
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            return {
                'text': f"I'm sorry, I encountered an error processing your message: {str(e)}",
                'sender': 'bot',
                'error': True
            }
    
    def _parse_content_into_sections(self, content: str) -> List[Dict[str, str]]:
        """Parse markdown content into sections based on headers"""
        sections = []
        lines = content.split('\n')
        current_section = {'title': 'Introduction', 'content': ''}
        
        for line in lines:
            # Check if line is a header
            if line.startswith('# '):
                # If we have content in the current section, add it to sections
                if current_section['content'].strip():
                    sections.append(current_section)
                # Start a new section with the header as title
                current_section = {'title': line[2:].strip(), 'content': ''}
            elif line.startswith('## '):
                # If we have content in the current section, add it to sections
                if current_section['content'].strip():
                    sections.append(current_section)
                # Start a new section with the header as title
                current_section = {'title': line[3:].strip(), 'content': ''}
            elif line.startswith('### '):
                # If we have content in the current section, add it to sections
                if current_section['content'].strip():
                    sections.append(current_section)
                # Start a new section with the header as title
                current_section = {'title': line[4:].strip(), 'content': ''}
            else:
                # Add line to current section content
                current_section['content'] += line + '\n'
        
        # Add the last section if it has content
        if current_section['content'].strip():
            sections.append(current_section)
        
        return sections
    
    def _find_relevant_section(self, sections: List[Dict[str, str]], question_types: List[str], key_terms: List[str], content_lower: str) -> Optional[Dict[str, str]]:
        """Find the most relevant section based on question type and key terms"""
        # Map question types to likely section titles
        type_to_section_mapping = {
            'definition': ['introduction', 'what is', 'definition', 'overview'],
            'explanation': ['introduction', 'key concepts', 'how it works', 'overview'],
            'examples': ['examples', 'applications', 'use cases', 'instance'],
            'advantages': ['advantages', 'benefits', 'pros', 'strengths'],
            'disadvantages': ['challenges', 'disadvantages', 'cons', 'limitations', 'drawbacks'],
            'applications': ['applications', 'use cases', 'where', 'industry'],
            'comparison': ['comparison', 'versus', 'differences', 'similarities'],
            'process': ['process', 'steps', 'how to', 'procedure', 'method', 'training process'],
            'components': ['components', 'parts', 'elements', 'structure', 'architecture', 'layers']
        }
        
        # Score each section based on relevance to question type and key terms
        section_scores = []
        
        for section in sections:
            score = 0
            section_title_lower = section['title'].lower()
            section_content_lower = section['content'].lower()
            
            # Score based on question type match with section title
            for q_type in question_types:
                if q_type in type_to_section_mapping:
                    for related_title in type_to_section_mapping[q_type]:
                        if related_title in section_title_lower:
                            score += 5
            
            # Score based on key terms in section title
            for term in key_terms:
                if term in section_title_lower:
                    score += 3
            
            # Score based on key terms in section content
            for term in key_terms:
                if term in section_content_lower:
                    score += 1
                    # Bonus for multiple occurrences
                    score += min(section_content_lower.count(term) * 0.2, 2)
            
            section_scores.append((section, score))
        
        # Sort sections by score in descending order
        section_scores.sort(key=lambda x: x[1], reverse=True)
        
        # Return the highest scoring section if it has a score > 0
        if section_scores and section_scores[0][1] > 0:
            return section_scores[0][0]
        
        # If no good match, return None
        return None
    
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