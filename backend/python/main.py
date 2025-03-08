import os
import json
import fitz  # PyMuPDF
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
import requests
import pymysql
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from openai import OpenAI
import string
import re

# Load environment variables from .env file
load_dotenv()

# Get API key from environment variables
XAI_API_KEY = os.getenv("XAI_API_KEY")
if not XAI_API_KEY:
    print("Warning: XAI_API_KEY environment variable not set. Some features will be limited.")

# Database configuration
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "Sara")
DB_PASSWORD = os.getenv("DB_PASSWORD", "Sara0330!!")
DB_NAME = os.getenv("DB_NAME", "aischool")

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
        except TypeError as e:
            print(f"TypeError initializing API client: {e}")
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
        print("Grok API client not initialized - using mock responses")
except Exception as e:
    print(f"Error initializing API client: {e}")
    client = None

# Initialize FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    """Create and return a database connection"""
    try:
        connection = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            cursorclass=pymysql.cursors.DictCursor
        )
        return connection
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

def get_lesson_info(lesson_id):
    """Get lesson information from the database"""
    try:
        # Connect to the database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Query to get lesson information
        query = """
        SELECT l.id, l.title, l.description, l.content, l.pdf_path, c.name as course_name, w.name as week_name
        FROM lessons l
        JOIN weeks w ON l.week_id = w.id
        JOIN courses c ON w.course_id = c.id
        WHERE l.id = ?
        """
        
        cursor.execute(query, (lesson_id,))
        lesson = cursor.fetchone()
        
        if lesson:
            # Convert to dictionary
            lesson_dict = {
                "id": lesson[0],
                "title": lesson[1],
                "description": lesson[2],
                "content": lesson[3],
                "pdf_path": lesson[4],
                "course_name": lesson[5],
                "week_name": lesson[6]
            }
            
            # Close connection
            conn.close()
            
            return lesson_dict
        else:
            # If lesson not found in database, return mock data
            conn.close()
            return get_mock_lesson_content(lesson_id)
            
    except Exception as e:
        print(f"Database error: {e}")
        # If there's an error, return mock data
        return get_mock_lesson_content(lesson_id)

def get_mock_lesson_content(lesson_id):
    """Return mock lesson content for development"""
    # For lesson ID 1, return Deep Learning content
    if lesson_id == "1" or lesson_id.lower() == "deep_learning":
        # Create a path to the PDF file
        pdf_path = os.path.join(os.path.dirname(__file__), "pdfs", "deep_learning.pdf")
        
        # Check if the PDF exists, if not create a simple one
        if not os.path.exists(pdf_path):
            try:
                # Create the directory if it doesn't exist
                os.makedirs(os.path.dirname(pdf_path), exist_ok=True)
                
                # Create a simple PDF with the content
                from reportlab.lib.pagesizes import letter
                from reportlab.pdfgen import canvas
                
                c = canvas.Canvas(pdf_path, pagesize=letter)
                c.setFont("Helvetica", 16)
                c.drawString(72, 750, "Introduction to Deep Learning")
                
                c.setFont("Helvetica", 12)
                c.drawString(72, 720, "What is Deep Learning?")
                c.drawString(72, 700, "Deep learning is a subset of machine learning that uses neural networks with multiple layers")
                c.drawString(72, 680, "(deep neural networks) to analyze various factors of data.")
                
                c.drawString(72, 650, "Key characteristics of deep learning:")
                c.drawString(90, 630, "- Uses neural networks with many layers (hence 'deep')")
                c.drawString(90, 610, "- Can automatically discover features from raw data")
                c.drawString(90, 590, "- Excels at processing unstructured data like images, text, and audio")
                c.drawString(90, 570, "- Requires large amounts of data and computational power")
                c.drawString(90, 550, "- Has achieved state-of-the-art results in many domains")
                
                c.save()
                print(f"Created PDF file at {pdf_path}")
            except Exception as e:
                print(f"Error creating PDF: {e}")
                pdf_path = None
        
        return {
            "id": "1",
            "title": "Introduction to Deep Learning",
            "description": "Learn the fundamentals of deep learning and neural networks",
            "content": """# Introduction to Deep Learning

## What is Deep Learning?

Deep learning is a subset of machine learning that uses neural networks with multiple layers (deep neural networks) to analyze various factors of data.

Key characteristics of deep learning:
- Uses neural networks with many layers (hence "deep")
- Can automatically discover features from raw data
- Excels at processing unstructured data like images, text, and audio
- Requires large amounts of data and computational power
- Has achieved state-of-the-art results in many domains""",
            "pdf_path": pdf_path,
            "course_name": "AI Fundamentals",
            "week_name": "Week 1"
        }
    # For other lesson IDs, return generic content
    else:
        return {
            "id": lesson_id,
            "title": f"Lesson {lesson_id}",
            "description": f"This is lesson {lesson_id}",
            "content": f"Content for lesson {lesson_id}",
            "pdf_path": None,
            "course_name": "Course",
            "week_name": "Week"
        }

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
                
                # Get response from Grok
                response = chat_with_grok(question, lesson_info)
                
                # Send response back to client
                await websocket.send_text(json.dumps({"response": response}))
                
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

if __name__ == "__main__":
    import uvicorn
    print("Starting FastAPI server on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000) 