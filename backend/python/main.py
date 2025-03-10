import os
import json
import fitz  # PyMuPDF
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Response
import requests
import pymysql
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from openai import OpenAI
import string
import re
from fastapi.responses import FileResponse
from pathlib import Path
from pydantic import BaseModel
from typing import Optional

# Load environment variables from .env file
load_dotenv()

# Get API key from environment variables
XAI_API_KEY = os.getenv("XAI_API_KEY")
if not XAI_API_KEY:
    print("Warning: XAI_API_KEY environment variable not set. Some features will be limited.")

# Database configuration
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME", "aischool")

# Check if database credentials are provided
if not DB_USER or not DB_PASSWORD:
    print("Warning: DB_USER or DB_PASSWORD environment variables not set. Database functionality will be limited.")

# Initialize OpenAI client if API key is available
try:
    if XAI_API_KEY:
        try:
            # Try initializing with minimal parameters
            client = OpenAI(
                api_key=XAI_API_KEY,
                base_url="https://api.x.ai/v1",
            )
            print("Grok API client initialized successfully")
        except Exception as e:
            print(f"Error initializing API client: {e}")
            # Fallback to a more basic initialization if needed
            try:
                import openai
                openai.api_key = XAI_API_KEY
                openai.base_url = "https://api.x.ai/v1"
                client = openai
                print("Grok API client initialized using legacy method")
            except Exception as inner_e:
                print(f"Failed to initialize API client with legacy method: {inner_e}")
                client = None
    else:
        client = None
except Exception as e:
    print(f"Error initializing API client: {e}")
    client = None

# Initialize FastAPI app
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Allow frontend origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# Keep track of connected WebSockets
active_connections = {}

# List of stop words to remove
STOP_WORDS = {'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', "you're", "you've", "you'll", 
              "you'd", 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', "she's", 
              'her', 'hers', 'herself', 'it', "it's", 'its', 'itself', 'they', 'them', 'their', 'theirs', 
              'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', "that'll", 'these', 'those', 'am', 
              'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 
              'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 
              'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 
              'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 
              'under', 'again', 'further', 'then', 'once'}

def clean_text(text):
    """Remove punctuation and stop words from text"""
    # Convert to lowercase
    text = text.lower()
    
    # Remove punctuation
    text = text.translate(str.maketrans('', '', string.punctuation))
    
    # Remove numbers
    text = re.sub(r'\d+', '', text)
    
    # Split into words
    words = text.split()
    
    # Remove stop words
    words = [word for word in words if word not in STOP_WORDS]
    
    # Join words back together
    return ' '.join(words)

def get_db_connection():
    """Get a connection to the database"""
    try:
        # Create a connection to the database
        connection = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )
        
        print(f"Successfully connected to database {DB_NAME}")
        return connection
    except Exception as e:
        print(f"Error connecting to database: {e}")
        print(f"Database connection parameters: host={DB_HOST}, user={DB_USER}, database={DB_NAME}")
        return None

def get_lesson_info(lesson_id):
    """Get lesson information from the database"""
    try:
        # Connect to the database
        conn = get_db_connection()
        if not conn:
            print("Failed to connect to database")
            return get_mock_lesson_content(lesson_id)
            
        cursor = conn.cursor()  # Use DictCursor to get results as dictionaries
        
        # Query to get lesson information based on the actual schema
        query = """
        SELECT 
            l.id, l.lesson_name, l.file_path, 
            l.course_id, c.name as course_name,
            l.week_id, w.name as week_name,
            l.day_id, d.name as day_name
        FROM lessons l
        JOIN courses c ON l.course_id = c.id
        JOIN weeks w ON l.week_id = w.id
        JOIN days d ON l.day_id = d.id
        WHERE l.id = %s
        """
        
        try:
            cursor.execute(query, (lesson_id,))
            lesson = cursor.fetchone()
            
            cursor.close()
            conn.close()
            
            if lesson:
                # Try to extract text from PDF if file_path exists
                content = ""
                if lesson["file_path"] and os.path.exists(lesson["file_path"]):
                    content = extract_text_from_pdf(lesson["file_path"])
                else:
                    content = f"No content available for lesson {lesson_id}"
                
                # Return lesson info
                return {
                    "id": lesson["id"],
                    "title": lesson["lesson_name"],
                    "course_name": lesson["course_name"],
                    "week_name": lesson["week_name"],
                    "day_name": lesson["day_name"],
                    "file_path": lesson["file_path"],
                    "content": content
                }
            else:
                # If lesson not found in database, return mock data
                print(f"Lesson {lesson_id} not found in database")
                return get_mock_lesson_content(lesson_id)
        except Exception as e:
            cursor.close()
            conn.close()
            print(f"Database query error: {e}")
            return get_mock_lesson_content(lesson_id)
            
    except Exception as e:
        print(f"Failed to get lesson information: {e}")
        # If there's an error, return mock data
        return get_mock_lesson_content(lesson_id)

def get_mock_lesson_content(lesson_id):
    """Get mock lesson content for testing"""
    lesson_id_int = int(lesson_id) if lesson_id.isdigit() else 1
    
    # Sample lesson data
    lessons = {
        1: {
            "id": 1,
            "title": "Introduction to Deep Learning",
            "course_name": "Deep Learning",
            "week_name": "Week 1",
            "day_name": "Monday",
            "file_path": "backend/python/pdfs/lesson_1.pdf",
            "content": """
            Deep Learning is a subset of machine learning that uses neural networks with multiple layers.
            
            Key concepts include:
            1. Neural Networks
            2. Backpropagation
            3. Activation Functions
            4. Training and Testing
            
            Neural networks are inspired by the human brain and consist of interconnected nodes (neurons).
            Each connection has a weight that determines its importance.
            """
        },
        2: {
            "id": 2,
            "title": "Neural Networks Basics",
            "course_name": "Deep Learning",
            "week_name": "Week 1",
            "day_name": "Tuesday",
            "file_path": "backend/python/pdfs/lesson_2.pdf",
            "content": """
            Neural Networks Basics
            
            A neural network consists of:
            - Input layer
            - Hidden layers
            - Output layer
            
            Each neuron applies an activation function to the weighted sum of its inputs.
            Common activation functions include ReLU, sigmoid, and tanh.
            """
        },
        3: {
            "id": 3,
            "title": "Convolutional Neural Networks",
            "course_name": "Deep Learning",
            "week_name": "Week 1",
            "day_name": "Wednesday",
            "file_path": "backend/python/pdfs/lesson_3.pdf",
            "content": """
            Convolutional Neural Networks (CNNs)
            
            CNNs are specialized neural networks for processing grid-like data such as images.
            
            Key components:
            - Convolutional layers
            - Pooling layers
            - Fully connected layers
            
            CNNs use filters to detect features in the input data.
            """
        }
    }
    
    # Return the lesson if it exists, otherwise return a default lesson
    return lessons.get(lesson_id_int, {
        "id": lesson_id_int,
        "title": f"Lesson {lesson_id}",
        "course_name": "Sample Course",
        "week_name": "Sample Week",
        "day_name": "Sample Day",
        "file_path": f"backend/python/pdfs/lesson_{lesson_id}.pdf",
        "content": f"This is sample content for lesson {lesson_id}."
    })

def extract_text_from_pdf(file_path):
    """Extract text from a PDF file"""
    try:
        # Check if file exists
        if not os.path.exists(file_path):
            return f"Error: PDF file not found at {file_path}"
        
        # Open the PDF file
        document = fitz.open(file_path)
        text = ""
        
        # Extract text from each page
        for page in document:
            text += page.get_text()
        
        return text
    except Exception as e:
        print(f"PDF extraction error: {e}")
        return f"Error extracting text from PDF: {str(e)}"

def chat_with_grok(user_input, lesson_info):
    """Chat with Grok API or provide a smart response if API is not available"""
    try:
        # Check if lesson info indicates file not found
        if "Lesson file not found" in lesson_info:
            return "I'm sorry, I can only respond to questions about the lesson content, but the lesson file could not be found."
            
        # Check if the question is about the lesson content
        # Convert lesson_info and user_input to lowercase for case-insensitive matching
        lesson_info_lower = lesson_info.lower()
        user_input_lower = user_input.lower()
        
        # Extract key topics from the lesson
        # This is a simple approach - we're looking for capitalized words or phrases that might be topics
        potential_topics = re.findall(r'[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*', lesson_info)
        potential_topics = [topic.lower() for topic in potential_topics]
        
        # Add common educational terms that might not be capitalized
        common_terms = ['deep learning', 'machine learning', 'neural networks', 'ai', 'artificial intelligence', 
                        'data science', 'algorithm', 'model', 'training', 'dataset', 'classification', 
                        'regression', 'supervised', 'unsupervised', 'reinforcement', 'computer vision',
                        'natural language processing', 'nlp', 'cnn', 'rnn', 'lstm', 'gan', 'transformer',
                        'attention mechanism', 'backpropagation', 'gradient descent', 'activation function',
                        'loss function', 'overfitting', 'underfitting', 'bias', 'variance', 'regularization',
                        'dropout', 'batch normalization', 'transfer learning', 'fine-tuning']
        
        # Check if any of these terms are in the lesson
        lesson_topics = []
        for term in common_terms:
            if term in lesson_info_lower:
                lesson_topics.append(term)
                
        # Add the potential topics we extracted
        lesson_topics.extend([topic for topic in potential_topics if len(topic) > 3])  # Filter out short words
        
        # Check if the user's question is about any of these topics
        is_relevant_question = False
        for topic in lesson_topics:
            if topic in user_input_lower:
                is_relevant_question = True
                break
                
        # If Grok API client is available, use it
        if client:
            # Create a prompt with the lesson information and user question
            prompt = f"""
            You are an AI teaching assistant helping a student understand a lesson.
            
            Here is the lesson content:
            {lesson_info}
            
            The student asks: {user_input}
            
            IMPORTANT INSTRUCTIONS:
            1. ONLY answer questions that are directly related to the lesson content provided above.
            2. If the question is about topics that are covered in the lesson, provide a helpful, detailed, and accurate response based on the lesson material.
            3. If the question is not related to the lesson content, respond with: "I'm sorry, I can only respond to questions about the lesson content. Please ask a question related to the material we're covering."
            4. Do not make up information or answer questions outside the scope of the lesson.
            5. Be helpful, accurate, and thorough for questions that are about the lesson.
            6. Use examples and analogies when appropriate to make complex concepts easier to understand.
            7. If the question is vague but potentially related to the lesson, try to interpret it in the context of the lesson and provide a relevant response.
            """
            
            # Call the Grok API
            response = client.chat.completions.create(
                model="grok-1",
                messages=[
                    {"role": "system", "content": "You are a helpful AI teaching assistant that ONLY answers questions related to the lesson content."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=800
            )
            
            # Extract and return the response
            return response.choices[0].message.content
        else:
            # If API is not available, provide a smart response based on the lesson content
            print("Grok API not available, using enhanced response system")
            
            # If we've determined the question is not relevant to the lesson topics
            if not is_relevant_question and len(user_input_lower.split()) > 2:  # Ignore very short queries
                return "I'm sorry, I can only respond to questions about the lesson content. Please ask a question related to the material we're covering."
            
            # Extract key terms from the user input
            user_terms = set(clean_text(user_input).split())
            
            # Extract sentences from the lesson that might be relevant
            lesson_sentences = re.split(r'(?<=[.!?])\s+', lesson_info)
            relevant_sentences = []
            
            # Score each sentence based on term overlap with user query
            sentence_scores = []
            for sentence in lesson_sentences:
                if len(sentence.strip()) < 10:  # Skip very short sentences
                    continue
                    
                sentence_lower = sentence.lower()
                # Count how many user terms appear in this sentence
                term_matches = sum(1 for term in user_terms if len(term) > 3 and term in sentence_lower)
                # Also check for topic matches
                topic_matches = sum(1 for topic in lesson_topics if topic in sentence_lower)
                
                # Calculate a relevance score
                score = term_matches + (topic_matches * 2)  # Weight topic matches more heavily
                
                if score > 0:
                    sentence_scores.append((sentence.strip(), score))
            
            # Sort sentences by relevance score (highest first)
            sentence_scores.sort(key=lambda x: x[1], reverse=True)
            relevant_sentences = [s[0] for s in sentence_scores[:5]]  # Take top 5 most relevant sentences
            
            # If we found relevant sentences, use them in the response
            if relevant_sentences:
                # Determine the question type to provide a more tailored response
                question_type = "informational"  # Default
                
                if any(w in user_input_lower for w in ["what is", "what are", "define", "meaning of"]):
                    question_type = "definition"
                elif any(w in user_input_lower for w in ["how to", "how do", "steps", "process"]):
                    question_type = "process"
                elif any(w in user_input_lower for w in ["why", "reason", "explain why"]):
                    question_type = "explanation"
                elif any(w in user_input_lower for w in ["example", "instance", "case study"]):
                    question_type = "example"
                elif any(w in user_input_lower for w in ["compare", "difference", "versus", "vs"]):
                    question_type = "comparison"
                
                # Craft a response based on question type
                if question_type == "definition":
                    response = f"Based on the lesson content, I can provide this definition:\n\n"
                elif question_type == "process":
                    response = f"The lesson describes this process as follows:\n\n"
                elif question_type == "explanation":
                    response = f"According to the lesson material, here's why:\n\n"
                elif question_type == "example":
                    response = f"Here are some examples from the lesson:\n\n"
                elif question_type == "comparison":
                    response = f"The lesson makes these distinctions:\n\n"
                else:
                    response = f"Based on the lesson content, here's what I can tell you:\n\n"
                
                # Add the relevant sentences
                for i, sentence in enumerate(relevant_sentences):
                    response += f"{i+1}. {sentence}\n\n"
                
                # Add a contextual closing based on question type
                if question_type == "definition":
                    response += f"I hope this clarifies what {' '.join(user_input_lower.split()[-3:])} means in this context."
                elif question_type == "process":
                    response += "These steps should help you understand the process described in the lesson."
                elif question_type == "explanation":
                    response += "This explanation is based directly on the lesson material."
                elif question_type == "example":
                    response += "These examples illustrate the concepts discussed in the lesson."
                elif question_type == "comparison":
                    response += "Understanding these distinctions is important for mastering this topic."
                else:
                    response += "Is there a specific aspect of this information you'd like me to elaborate on?"
                
                return response
            else:
                # If no relevant sentences found but the question seems related to lesson topics
                if is_relevant_question:
                    # Try to provide a more helpful response based on the topic
                    matching_topics = [topic for topic in lesson_topics if topic in user_input_lower]
                    
                    if matching_topics:
                        topic_sentences = []
                        for topic in matching_topics:
                            # Find sentences that mention this topic
                            for sentence in lesson_sentences:
                                if topic in sentence.lower() and sentence.strip() not in topic_sentences:
                                    topic_sentences.append(sentence.strip())
                                    if len(topic_sentences) >= 3:  # Limit to 3 sentences per topic
                                        break
                        
                        if topic_sentences:
                            response = f"Your question is about {', '.join(matching_topics)}, which is covered in the lesson. Here's what the lesson says:\n\n"
                            for sentence in topic_sentences[:5]:  # Limit to 5 sentences total
                                response += f"- {sentence}\n\n"
                            return response
                    
                    return f"""
                    Your question about {user_input} relates to topics covered in the lesson.
                    
                    Could you please be more specific about what aspect of this topic you'd like to understand better?
                    
                    I'm here to help you understand the lesson material.
                    """
                else:
                    # If we get here, the question is probably not related to the lesson
                    return "I'm sorry, I can only respond to questions about the lesson content. Please ask a question related to the material we're covering."
    except Exception as e:
        print(f"Error in chat processing: {e}")
        return "I'm sorry, I can only respond to questions about the lesson content. Please ask a question related to the material we're covering."

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for chat communication"""
    await websocket.accept()
    print("WebSocket connection established")
    
    try:
        # Send welcome message
        welcome_msg = {"response": "I'm your AI teaching assistant for this lesson. I can answer questions related to the lesson content and help you understand the material better. What would you like to know about the lesson?"}
        await websocket.send_text(json.dumps(welcome_msg))
        
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            print(f"Received message: {data}")
            
            try:
                # Parse message
                if '|' not in data:
                    error_msg = {"error": "Invalid message format. Expected 'lessonId|question'"}
                    await websocket.send_text(json.dumps(error_msg))
                    continue
                
                lesson_id, question = data.split('|', 1)  # Split only on first '|'
                print(f"Processing question for lesson {lesson_id}: {question}")
                
                # Get lesson info
                lesson_info = get_lesson_info(lesson_id)
                
                # Check if there was an error getting lesson info
                if isinstance(lesson_info, str) and lesson_info.startswith("Error:"):
                    error_msg = {"error": lesson_info}
                    await websocket.send_text(json.dumps(error_msg))
                    continue
                
                # Extract lesson content
                lesson_content = lesson_info.get("content", "")
                lesson_title = lesson_info.get("title", f"Lesson {lesson_id}")
                
                # Try to use Grok API if available
                if client:
                    try:
                        # Create a prompt with the lesson content and question
                        prompt = f"""
                        You are an AI teaching assistant for the lesson: "{lesson_title}".
                        
                        Here is the lesson content:
                        {lesson_content}
                        
                        Please answer the following question based on the lesson content.
                        If the question is not related to the lesson content, politely explain that you can only answer questions about this specific lesson.
                        
                        Question: {question}
                        """
                        
                        # Call the Grok API
                        response = client.chat.completions.create(
                            model="grok-1",
                            messages=[
                                {"role": "system", "content": "You are a helpful AI teaching assistant."},
                                {"role": "user", "content": prompt}
                            ],
                            temperature=0.7,
                            max_tokens=500
                        )
                        
                        # Extract the response
                        ai_response = response.choices[0].message.content
                        
                        # Send response back to client
                        await websocket.send_text(json.dumps({"response": ai_response}))
                        continue
                    except Exception as e:
                        print(f"Error using Grok API: {e}")
                        # Fall back to simple response if API fails
                
                # If Grok API is not available or fails, use a simple response
                simple_response = f"""Based on the lesson '{lesson_title}', I can provide the following information:

This lesson covers topics related to {lesson_title}.

Regarding your question: "{question}"

The lesson content includes information about {lesson_content[:150]}...

I hope this helps! Feel free to ask more specific questions about the lesson content."""
                
                # Send response back to client
                await websocket.send_text(json.dumps({"response": simple_response}))
                
            except Exception as e:
                print(f"Error processing message: {e}")
                error_msg = {"error": f"Failed to process your question: {str(e)}"}
                await websocket.send_text(json.dumps(error_msg))
    except WebSocketDisconnect:
        print("WebSocket connection closed")

# Add a health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    # Check database connection
    connection = get_db_connection()
    db_status = "connected" if connection else "disconnected"
    if connection:
        connection.close()
    
    # Check Grok API status
    api_status = "available" if client else "unavailable"
    
    return {
        "status": "ok",
        "database": db_status,
        "grok_api": api_status
    }

# Add endpoints for lesson content and PDF download
@app.get("/api/lessons/{lesson_id}/content")
async def get_lesson_content(lesson_id: str):
    """Get lesson content by ID"""
    try:
        # Get lesson info
        lesson_info = get_lesson_info(lesson_id)
        
        # Check if there was an error getting lesson info
        if isinstance(lesson_info, str) and lesson_info.startswith("Error:"):
            return {"error": lesson_info}
        
        # Return lesson content
        return {
            "id": lesson_id,
            "title": f"Lesson {lesson_id}",
            "content": lesson_info
        }
    except Exception as e:
        print(f"Error getting lesson content: {e}")
        return {"error": f"Failed to get lesson content: {str(e)}"}

@app.get("/api/lessons/{lesson_id}/download")
async def download_lesson_file(lesson_id: str):
    """Download lesson file"""
    try:
        # First try to get the lesson from the database
        try:
            conn = get_db_connection()
            if not conn:
                print("Failed to connect to database")
                raise Exception("Database connection failed")
                
            cursor = conn.cursor()
            
            # Query to get the file path
            query = "SELECT file_path FROM lessons WHERE id = %s"
            cursor.execute(query, (lesson_id,))
            result = cursor.fetchone()
            
            cursor.close()
            conn.close()
            
            if result and result["file_path"]:
                file_path = result["file_path"]
                # Check if the file exists
                if os.path.exists(file_path):
                    print(f"Serving PDF from database path: {file_path}")
                    return FileResponse(
                        path=file_path,
                        media_type="application/pdf",
                        filename=f"lesson_{lesson_id}.pdf"
                    )
                else:
                    print(f"File not found at path: {file_path}")
        except Exception as e:
            print(f"Database error when fetching file path: {e}")
        
        # If we get here, either the lesson wasn't found or the file doesn't exist
        # Check if we have a PDF for this lesson in our pdfs directory
        pdf_path = Path(f"backend/python/pdfs/lesson_{lesson_id}.pdf")
        
        # If the PDF doesn't exist, create a sample PDF
        if not pdf_path.exists():
            print(f"Creating sample PDF for lesson {lesson_id}")
            # Create a simple PDF with PyMuPDF
            doc = fitz.open()
            
            # Add a title page
            page = doc.new_page()
            title_text = f"Lesson {lesson_id}: Deep Learning Fundamentals"
            page.insert_text((50, 50), title_text, fontsize=24, color=(0, 0, 0))
            page.insert_text((50, 100), "AI School", fontsize=18, color=(0, 0, 0))
            
            # Add content pages
            page = doc.new_page()
            content_text = """
            Introduction to Deep Learning
            
            Deep Learning is a subset of machine learning that uses neural networks with multiple layers.
            
            Key concepts include:
            1. Neural Networks
            2. Backpropagation
            3. Activation Functions
            4. Training and Testing
            
            Neural networks are inspired by the human brain and consist of interconnected nodes (neurons).
            Each connection has a weight that determines its importance.
            """
            page.insert_text((50, 50), content_text, fontsize=12, color=(0, 0, 0))
            
            # Add another page with more content
            page = doc.new_page()
            more_content = """
            Types of Neural Networks:
            
            1. Feedforward Neural Networks
            2. Convolutional Neural Networks (CNNs)
            3. Recurrent Neural Networks (RNNs)
            4. Transformers
            
            Applications of Deep Learning:
            
            - Computer Vision
            - Natural Language Processing
            - Speech Recognition
            - Recommendation Systems
            """
            page.insert_text((50, 50), more_content, fontsize=12, color=(0, 0, 0))
            
            # Save the PDF
            os.makedirs(pdf_path.parent, exist_ok=True)
            doc.save(str(pdf_path))
            doc.close()
            
            print(f"Created sample PDF at {pdf_path}")
        else:
            print(f"Serving existing sample PDF from {pdf_path}")
        
        # Return the PDF file
        return FileResponse(
            path=pdf_path,
            media_type="application/pdf",
            filename=f"lesson_{lesson_id}.pdf"
        )
    except Exception as e:
        print(f"Error downloading lesson file: {e}")
        return {"error": f"Failed to download lesson file: {str(e)}"}

# Add endpoint to fetch all lessons
@app.get("/api/lessons")
async def get_all_lessons():
    """Get all lessons with their course and week information"""
    try:
        # Connect to the database
        conn = get_db_connection()
        if not conn:
            print("Failed to connect to database")
            # Return sample data if database connection fails
            return {
                "status": "error",
                "message": "Database connection failed",
                "data": get_sample_lessons()
            }
            
        cursor = conn.cursor(pymysql.cursors.DictCursor)  # Use DictCursor to get results as dictionaries
        
        # Query to get all lessons with their course and week information
        query = """
        SELECT 
            l.id, l.lesson_name, l.file_path, 
            l.course_id, c.name as course_name,
            l.week_id, w.name as week_name
        FROM lessons l
        LEFT JOIN courses c ON l.course_id = c.id
        LEFT JOIN weeks w ON l.week_id = w.id
        ORDER BY c.id, w.id, l.id
        """
        
        try:
            cursor.execute(query)
            lessons = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            if not lessons:
                print("No lessons found in database")
                # If no lessons found, return sample data
                return {
                    "status": "success",
                    "message": "Sample data returned",
                    "data": get_sample_lessons()
                }
            
            # Return the lessons
            return {
                "status": "success",
                "message": "Lessons retrieved successfully",
                "data": lessons
            }
        except Exception as e:
            cursor.close()
            conn.close()
            print(f"Database query error: {e}")
            return {
                "status": "error",
                "message": f"Database query error: {str(e)}",
                "data": get_sample_lessons()
            }
    except Exception as e:
        print(f"Error getting all lessons: {e}")
        # Return sample data in case of error
        return {
            "status": "error",
            "message": f"Failed to get lessons: {str(e)}",
            "data": get_sample_lessons()
        }

def get_sample_lessons():
    """Return sample lesson data for testing"""
    return [
        {
            "id": 1,
            "lesson_name": "Introduction to Deep Learning",
            "file_path": "backend/python/pdfs/lesson_1.pdf",
            "course_id": 1,
            "course_name": "Deep Learning",
            "week_id": 1,
            "week_name": "Week 1",
            "day_id": 1,
            "day_name": "Monday"
        },
        {
            "id": 2,
            "lesson_name": "Neural Networks Basics",
            "file_path": "backend/python/pdfs/lesson_2.pdf",
            "course_id": 1,
            "course_name": "Deep Learning",
            "week_id": 1,
            "week_name": "Week 1",
            "day_id": 2,
            "day_name": "Tuesday"
        },
        {
            "id": 3,
            "lesson_name": "Convolutional Neural Networks",
            "file_path": "backend/python/pdfs/lesson_3.pdf",
            "course_id": 1,
            "course_name": "Deep Learning",
            "week_id": 1,
            "week_name": "Week 1",
            "day_id": 3,
            "day_name": "Wednesday"
        },
        {
            "id": 4,
            "lesson_name": "Recurrent Neural Networks",
            "file_path": "backend/python/pdfs/lesson_4.pdf",
            "course_id": 1,
            "course_name": "Deep Learning",
            "week_id": 1,
            "week_name": "Week 1",
            "day_id": 4,
            "day_name": "Thursday"
        },
        {
            "id": 5,
            "lesson_name": "Transformers",
            "file_path": "backend/python/pdfs/lesson_5.pdf",
            "course_id": 1,
            "course_name": "Deep Learning",
            "week_id": 1,
            "week_name": "Week 1",
            "day_id": 5,
            "day_name": "Friday"
        }
    ]

# Add this class for the request body
class ChatbotRequest(BaseModel):
    message: str
    model: str = "grok-beta"
    context: Optional[str] = None

# Add this endpoint for the Grok API
@app.post("/api/chatbot/grok")
async def chatbot_grok(request: ChatbotRequest):
    try:
        print(f"Processing Grok API request: {request.message}")
        
        # Define better responses for common deep learning questions
        common_responses = {
            "deep learning": """Deep learning is a subfield of machine learning that uses neural networks with multiple layers (hence 'deep') to progressively extract higher-level features from raw input. 

Unlike traditional machine learning algorithms that require manual feature extraction, deep learning models can automatically discover the representations needed for feature detection or classification from raw data. This capability makes them particularly powerful for tasks like image recognition, natural language processing, and speech recognition.

Key characteristics of deep learning include:
1. Use of neural networks with many layers (deep neural networks)
2. Ability to learn hierarchical features automatically
3. Requires large amounts of data for training
4. Often requires significant computational resources
5. Has achieved state-of-the-art results in many domains""",

            "neural network": """A neural network is a computational model inspired by the structure and function of the human brain. It consists of interconnected nodes (neurons) organized in layers that process information.

The basic structure includes:
1. Input layer: Receives the initial data
2. Hidden layers: Process the information through weighted connections
3. Output layer: Produces the final result

Each neuron applies an activation function to the weighted sum of its inputs, and the network learns by adjusting these weights through a process called backpropagation during training.

Neural networks can model complex non-linear relationships and are the foundation of deep learning. They're used for tasks like classification, regression, pattern recognition, and decision-making.""",

            "activation function": """An activation function in neural networks determines the output of a neuron given an input or set of inputs. It introduces non-linearity into the network, which is crucial for learning complex patterns.

Common activation functions include:
1. Sigmoid: Maps input to a value between 0 and 1
2. ReLU (Rectified Linear Unit): Returns x if x > 0, otherwise returns 0
3. Tanh: Maps input to a value between -1 and 1
4. Softmax: Used in output layers for multi-class classification

The choice of activation function significantly impacts the neural network's training dynamics and performance.""",

            "backpropagation": """Backpropagation is the primary algorithm used to train neural networks. It's a supervised learning method that calculates the gradient of the loss function with respect to the network's weights.

The process works as follows:
1. Forward pass: Input data passes through the network to generate an output
2. Error calculation: The difference between the predicted output and actual target is measured
3. Backward pass: The error is propagated backwards through the network
4. Weight update: Network weights are adjusted to minimize the error

This process is repeated many times with different training examples, gradually improving the network's accuracy."""
        }
        
        # Check if the question is about a common deep learning topic
        response = None
        lower_message = request.message.lower()
        
        for key, value in common_responses.items():
            if key in lower_message:
                response = value
                break
        
        # If no predefined response, try to use the Grok API
        if not response:
            try:
                # Try to use the Grok API client if available
                if client:
                    print(f"Using Grok API with model: {request.model}")
                    context = request.context if request.context else ""
                    
                    # Call the Grok API
                    grok_response = client.chat.completions.create(
                        model=request.model,
                        messages=[
                            {"role": "system", "content": f"You are a helpful AI assistant for a deep learning course. {context}"},
                            {"role": "user", "content": request.message}
                        ],
                        temperature=0.7,
                        max_tokens=1000
                    )
                    
                    # Extract the response
                    if grok_response and grok_response.choices and len(grok_response.choices) > 0:
                        response = grok_response.choices[0].message.content
                    else:
                        response = "I received your question but couldn't generate a response. Please try again."
                else:
                    # Fallback to a general response if Grok client is not available
                    response = f"I understand you're asking about: {request.message}. Deep learning is a subfield of machine learning that uses neural networks with multiple layers to learn from data. Neural networks are computational models inspired by the human brain, consisting of interconnected nodes (neurons) that process information in layers."
                    print("Grok client not available, using fallback response")
            except Exception as e:
                print(f"Error using Grok API: {str(e)}")
                # Provide a more informative fallback response
                if "neural network" in lower_message:
                    response = common_responses["neural network"]
                elif "activation" in lower_message:
                    response = common_responses["activation function"]
                elif "backpropagation" in lower_message:
                    response = common_responses["backpropagation"]
                else:
                    response = common_responses["deep learning"]
        
        return {
            "status": "success",
            "message": response,
            "model": request.model
        }
    except Exception as e:
        print(f"Error in Grok API endpoint: {str(e)}")
        return {
            "status": "error",
            "message": f"An error occurred: {str(e)}"
        }

if __name__ == "__main__":
    import uvicorn
    print("Starting FastAPI server on http://localhost:8003")
    uvicorn.run(app, host="0.0.0.0", port=8003, log_level="info") 