import os
import sys
import json
import argparse
from typing import Dict, List, Any, Optional

# PDF processing libraries
try:
    import PyPDF2
    import pdfplumber
    from pdf2image import convert_from_path
    import pytesseract
    import nltk
    from nltk.tokenize import sent_tokenize, word_tokenize
    from nltk.corpus import stopwords
    from transformers import pipeline
except ImportError:
    print("Please install required libraries:")
    print("pip install PyPDF2 pdfplumber pdf2image pytesseract nltk transformers")
    print("You may also need to install poppler for pdf2image and tesseract-ocr")
    sys.exit(1)

# Download NLTK resources if needed
try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('punkt')
    nltk.download('stopwords')

class PDFProcessor:
    """Process PDF files for lesson content extraction and AI enhancement."""
    
    def __init__(self, use_ai: bool = True):
        """Initialize the PDF processor.
        
        Args:
            use_ai: Whether to use AI for content enhancement
        """
        self.use_ai = use_ai
        if use_ai:
            # Initialize AI components
            self.summarizer = pipeline("summarization")
            self.qa_generator = pipeline("text2text-generation", model="facebook/bart-large-cnn")
    
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extract text from a PDF file using multiple methods for best results.
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            Extracted text content
        """
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")
        
        # Try PyPDF2 first (faster but less accurate)
        try:
            with open(pdf_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                text = ""
                for page_num in range(len(reader.pages)):
                    text += reader.pages[page_num].extract_text() + "\n\n"
                
                # If we got reasonable text, return it
                if len(text.strip()) > 100:
                    return text
        except Exception as e:
            print(f"PyPDF2 extraction failed: {e}")
        
        # Try pdfplumber (better for formatted text)
        try:
            text = ""
            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    text += page.extract_text() + "\n\n"
                
                # If we got reasonable text, return it
                if len(text.strip()) > 100:
                    return text
        except Exception as e:
            print(f"pdfplumber extraction failed: {e}")
        
        # Last resort: OCR with Tesseract
        try:
            text = ""
            images = convert_from_path(pdf_path)
            for i, image in enumerate(images):
                text += pytesseract.image_to_string(image) + "\n\n"
            return text
        except Exception as e:
            print(f"OCR extraction failed: {e}")
            raise Exception(f"All PDF extraction methods failed for {pdf_path}")
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize extracted text.
        
        Args:
            text: Raw extracted text
            
        Returns:
            Cleaned text
        """
        # Basic cleaning
        text = text.replace('\n\n', '[PARA]')  # Preserve paragraphs
        text = text.replace('\n', ' ')
        text = text.replace('[PARA]', '\n\n')
        
        # Remove multiple spaces
        while '  ' in text:
            text = text.replace('  ', ' ')
            
        return text.strip()
    
    def generate_summary(self, text: str, max_length: int = 150) -> str:
        """Generate a summary of the text using AI.
        
        Args:
            text: Input text to summarize
            max_length: Maximum length of the summary
            
        Returns:
            Text summary
        """
        if not self.use_ai:
            # Simple extractive summary without AI
            sentences = sent_tokenize(text)
            if len(sentences) <= 3:
                return text
            return ' '.join(sentences[:3])
        
        # Use AI for summarization
        # Split into chunks if text is too long
        chunks = self._split_into_chunks(text, 1000)
        summaries = []
        
        for chunk in chunks:
            if len(chunk) < 50:  # Skip very small chunks
                continue
                
            try:
                summary = self.summarizer(chunk, max_length=max_length, min_length=30, do_sample=False)
                summaries.append(summary[0]['summary_text'])
            except Exception as e:
                print(f"Summarization error: {e}")
                # Fallback to first few sentences
                sentences = sent_tokenize(chunk)
                if sentences:
                    summaries.append(sentences[0])
        
        return ' '.join(summaries)
    
    def generate_qa_pairs(self, text: str, num_pairs: int = 5) -> List[Dict[str, str]]:
        """Generate question-answer pairs from the text.
        
        Args:
            text: Input text
            num_pairs: Number of QA pairs to generate
            
        Returns:
            List of QA pairs
        """
        qa_pairs = []
        
        if not self.use_ai:
            # Simple rule-based QA generation without AI
            sentences = sent_tokenize(text)
            for i, sentence in enumerate(sentences[:num_pairs]):
                words = word_tokenize(sentence)
                if len(words) < 5:
                    continue
                    
                # Create a simple question
                if any(keyword in sentence.lower() for keyword in ['is', 'are', 'was', 'were']):
                    question = f"What {sentence.lower().split(' ')[0]} {' '.join(sentence.lower().split(' ')[1:])}"
                else:
                    question = f"What can you tell me about {' '.join(words[:3])}?"
                    
                qa_pairs.append({
                    "question": question,
                    "answer": sentence
                })
        else:
            # Use AI for QA generation
            chunks = self._split_into_chunks(text, 1000)
            
            for chunk in chunks:
                if len(chunk) < 50:  # Skip very small chunks
                    continue
                    
                try:
                    # Generate a question from the text
                    prompt = f"Generate a question based on this text: {chunk}"
                    question = self.qa_generator(prompt, max_length=50, min_length=10)[0]['generated_text']
                    
                    # Generate an answer for the question
                    prompt = f"Answer this question based on the following text.\nText: {chunk}\nQuestion: {question}"
                    answer = self.qa_generator(prompt, max_length=150, min_length=20)[0]['generated_text']
                    
                    qa_pairs.append({
                        "question": question,
                        "answer": answer
                    })
                    
                    if len(qa_pairs) >= num_pairs:
                        break
                        
                except Exception as e:
                    print(f"QA generation error: {e}")
        
        return qa_pairs
    
    def _split_into_chunks(self, text: str, chunk_size: int) -> List[str]:
        """Split text into chunks of approximately equal size.
        
        Args:
            text: Text to split
            chunk_size: Approximate size of each chunk
            
        Returns:
            List of text chunks
        """
        sentences = sent_tokenize(text)
        chunks = []
        current_chunk = []
        current_size = 0
        
        for sentence in sentences:
            sentence_size = len(sentence)
            if current_size + sentence_size > chunk_size and current_chunk:
                chunks.append(' '.join(current_chunk))
                current_chunk = [sentence]
                current_size = sentence_size
            else:
                current_chunk.append(sentence)
                current_size += sentence_size
        
        if current_chunk:
            chunks.append(' '.join(current_chunk))
            
        return chunks
    
    def process_pdf(self, pdf_path: str) -> Dict[str, Any]:
        """Process a PDF file and return structured content.
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            Dictionary with processed content
        """
        # Extract text from PDF
        raw_text = self.extract_text_from_pdf(pdf_path)
        
        # Clean the text
        cleaned_text = self.clean_text(raw_text)
        
        # Generate summary
        summary = self.generate_summary(cleaned_text)
        
        # Generate QA pairs
        qa_pairs = self.generate_qa_pairs(cleaned_text)
        
        # Structure the content
        sections = self._extract_sections(cleaned_text)
        
        return {
            "title": os.path.basename(pdf_path).replace('.pdf', ''),
            "summary": summary,
            "full_text": cleaned_text,
            "sections": sections,
            "qa_pairs": qa_pairs
        }
    
    def _extract_sections(self, text: str) -> List[Dict[str, str]]:
        """Extract sections from the text based on formatting cues.
        
        Args:
            text: Cleaned text
            
        Returns:
            List of sections with titles and content
        """
        # Simple section extraction based on line breaks and capitalization
        paragraphs = text.split('\n\n')
        sections = []
        current_section = {"title": "Introduction", "content": ""}
        
        for para in paragraphs:
            if not para.strip():
                continue
                
            # Check if this looks like a section header
            lines = para.split('\n')
            if len(lines) == 1 and len(lines[0]) < 100 and lines[0].isupper():
                # This is likely a section header
                if current_section["content"]:
                    sections.append(current_section)
                current_section = {"title": lines[0], "content": ""}
            elif len(lines[0]) < 50 and lines[0].strip().endswith(':'):
                # This is likely a section header
                if current_section["content"]:
                    sections.append(current_section)
                current_section = {"title": lines[0].strip(':'), "content": '\n'.join(lines[1:])}
            else:
                # This is content for the current section
                if current_section["content"]:
                    current_section["content"] += '\n\n' + para
                else:
                    current_section["content"] = para
        
        # Add the last section
        if current_section["content"]:
            sections.append(current_section)
            
        return sections
    
    def save_processed_content(self, content: Dict[str, Any], output_path: str) -> None:
        """Save processed content to a JSON file.
        
        Args:
            content: Processed content dictionary
            output_path: Path to save the JSON file
        """
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(content, f, indent=2, ensure_ascii=False)
        
        print(f"Processed content saved to {output_path}")

def main():
    """Main function to process PDF files from command line."""
    parser = argparse.ArgumentParser(description="Process PDF files for lesson content")
    parser.add_argument("pdf_path", help="Path to the PDF file to process")
    parser.add_argument("--output", "-o", help="Output JSON file path")
    parser.add_argument("--no-ai", action="store_true", help="Disable AI processing")
    
    args = parser.parse_args()
    
    # Create output path if not specified
    if not args.output:
        args.output = os.path.splitext(args.pdf_path)[0] + ".json"
    
    # Process the PDF
    processor = PDFProcessor(use_ai=not args.no_ai)
    try:
        content = processor.process_pdf(args.pdf_path)
        processor.save_processed_content(content, args.output)
        print("PDF processing completed successfully!")
    except Exception as e:
        print(f"Error processing PDF: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 