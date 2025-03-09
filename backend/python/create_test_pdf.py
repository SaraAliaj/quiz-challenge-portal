import os
import fitz  # PyMuPDF

def create_test_pdf(lesson_id=1):
    """Create a test PDF for a lesson"""
    pdf_path = f"backend/python/pdfs/lesson_{lesson_id}.pdf"
    
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(pdf_path), exist_ok=True)
    
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
    
    # Save the PDF
    doc.save(pdf_path)
    doc.close()
    
    print(f"Created test PDF at {pdf_path}")
    return pdf_path

if __name__ == "__main__":
    # Create test PDFs for lessons 1-5
    for i in range(1, 6):
        create_test_pdf(i) 