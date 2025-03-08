import os
import fitz  # PyMuPDF
import re
import json
from pathlib import Path
from typing import Dict, Any

# Define paths relative to the project root
PROJECT_ROOT = Path(__file__).parent.parent.parent
UPLOADS_DIR = PROJECT_ROOT / "shared" / "uploads"
PDF_DIR = UPLOADS_DIR / "pdfs"
PROCESSED_DIR = UPLOADS_DIR / "processed"

# Ensure directories exist
os.makedirs(PDF_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

def process_pdf(lesson_id: str) -> Dict[str, Any]:
    """
    Process a PDF file and return its content
    This is a fallback function in case the PDF integration doesn't work
    """
    # Sample data for testing
    sample_lessons = {
        '1': {
            'title': 'Introduction to Deep Learning',
            'summary': 'This lesson covers the fundamentals of deep learning, including neural networks, backpropagation, and common architectures.',
            'content': '''
            Deep Learning is a subset of machine learning that uses neural networks with multiple layers.
            Key concepts include:
            1. Neural Networks
            2. Backpropagation
            3. Activation Functions
            4. Training and Testing
            ''',
            'qa_pairs': [
                {
                    'question': 'What is Deep Learning?',
                    'answer': 'Deep Learning is a subset of machine learning that uses neural networks with multiple layers to learn from data.'
                },
                {
                    'question': 'What are the key concepts in Deep Learning?',
                    'answer': 'The key concepts in Deep Learning include Neural Networks, Backpropagation, Activation Functions, and Training/Testing methodologies.'
                },
                {
                    'question': 'How does backpropagation work?',
                    'answer': 'Backpropagation is an algorithm that calculates gradients of the loss function with respect to the weights of the network, allowing the network to learn by adjusting weights to minimize error.'
                }
            ]
        },
        '2': {
            'title': 'Python Programming Basics',
            'summary': 'An introduction to Python programming language covering variables, data types, control structures, and functions.',
            'content': '''
            Python is a high-level, interpreted programming language known for its readability and simplicity.
            This lesson covers:
            1. Variables and Data Types
            2. Control Structures (if/else, loops)
            3. Functions and Modules
            4. Basic Input/Output
            ''',
            'qa_pairs': [
                {
                    'question': 'What is Python?',
                    'answer': 'Python is a high-level, interpreted programming language known for its readability and simplicity.'
                },
                {
                    'question': 'What are the basic data types in Python?',
                    'answer': 'The basic data types in Python include integers, floats, strings, booleans, lists, tuples, sets, and dictionaries.'
                },
                {
                    'question': 'How do you define a function in Python?',
                    'answer': 'In Python, you define a function using the "def" keyword, followed by the function name, parameters in parentheses, and a colon. The function body is indented.'
                }
            ]
        }
    }
    
    return sample_lessons.get(str(lesson_id), {
        'title': 'Lesson Not Found',
        'summary': 'This lesson content is not available.',
        'content': 'No content available for this lesson.',
        'qa_pairs': []
    })

def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extract text from a PDF file
    To be implemented with your PDF processing logic
    """
    try:
        text = ""
        # Open the PDF file
        with fitz.open(pdf_path) as doc:
            # Iterate through each page
            for page in doc:
                # Extract text from the page
                text += page.get_text()
        return text
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return ""

def generate_qa_pairs(content: str) -> list:
    """
    Generate QA pairs from content
    To be implemented with your QA generation logic
    """
    # Placeholder for actual QA generation
    return []

def process_pdf(pdf_id):
    """Process a PDF file and extract its content"""
    try:
        # Find the PDF file in the uploads directory
        pdf_files = list(PDF_DIR.glob(f"*{pdf_id}*.pdf"))
        
        if not pdf_files:
            return {"error": f"PDF with ID {pdf_id} not found"}
        
        pdf_path = pdf_files[0]
        
        # Extract text from the PDF
        text = extract_text_from_pdf(pdf_path)
        
        # Save the extracted text to a file
        text_file_path = PROCESSED_DIR / f"{pdf_id}_text.txt"
        with open(text_file_path, "w", encoding="utf-8") as f:
            f.write(text)
        
        # Create a simple summary (first 500 characters)
        summary = text[:500] + "..." if len(text) > 500 else text
        
        # Extract potential QA pairs (simple implementation)
        qa_pairs = extract_qa_pairs(text)
        
        # Create a metadata file with the extracted information
        metadata = {
            "id": pdf_id,
            "filename": pdf_path.name,
            "summary": summary,
            "qa_pairs": qa_pairs,
            "text_file": text_file_path.name
        }
        
        metadata_file_path = PROCESSED_DIR / f"{pdf_id}_metadata.json"
        with open(metadata_file_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
        
        return {
            "id": pdf_id,
            "text": text,
            "summary": summary,
            "qa_pairs": qa_pairs
        }
    except Exception as e:
        print(f"Error processing PDF: {e}")
        return {"error": str(e)}

def extract_qa_pairs(text):
    """Extract potential question-answer pairs from text"""
    # Simple implementation - look for lines ending with question marks
    lines = text.split("\n")
    qa_pairs = []
    
    for i, line in enumerate(lines):
        if "?" in line and i < len(lines) - 1:
            question = line.strip()
            answer = lines[i + 1].strip()
            if question and answer and len(answer) > 10:
                qa_pairs.append({
                    "question": question,
                    "answer": answer
                })
    
    return qa_pairs[:10]  # Limit to 10 pairs 