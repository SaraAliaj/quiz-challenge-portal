# PDF Processing for Lesson Content

This module enhances the AI School platform by adding AI-powered PDF processing for lesson content. It extracts text from PDF files, generates summaries, identifies sections, and creates question-answer pairs to improve the learning experience.

## Features

- **PDF Text Extraction**: Extract text from PDF files using multiple methods (PyPDF2, pdfplumber, and OCR with Tesseract)
- **Content Structuring**: Automatically identify sections and structure the content
- **AI-Enhanced Summaries**: Generate concise summaries of lesson content
- **Q&A Generation**: Create question-answer pairs for interactive learning
- **Seamless Integration**: Works with the existing lesson system

## Setup Instructions

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2. Install Tesseract OCR

#### Windows
1. Download the installer from [https://github.com/UB-Mannheim/tesseract/wiki](https://github.com/UB-Mannheim/tesseract/wiki)
2. Install and add to PATH

#### macOS
```bash
brew install tesseract
```

#### Linux
```bash
sudo apt-get install tesseract-ocr
```

### 3. Install Poppler (for PDF2Image)

#### Windows
1. Download from [https://github.com/oschwartz10612/poppler-windows/releases/](https://github.com/oschwartz10612/poppler-windows/releases/)
2. Extract and add the `bin` directory to PATH

#### macOS
```bash
brew install poppler
```

#### Linux
```bash
sudo apt-get install poppler-utils
```

## Database Changes

The system adds two new fields to the `lessons` table:
- `summary`: Stores the AI-generated summary of the lesson
- `ai_enhanced`: Boolean flag indicating if the lesson has been processed with AI

It also creates a new table `lesson_qa_pairs` with the following structure:
```sql
CREATE TABLE lesson_qa_pairs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lesson_id INT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
)
```

## Usage

### Processing PDFs

1. Upload a PDF file through the Admin interface using the "Upload PDF Lesson" option
2. The system will automatically:
   - Extract text from the PDF
   - Generate a summary
   - Identify sections
   - Create Q&A pairs
   - Store the processed content in the database

### Viewing Enhanced Lesson Content

When viewing a lesson that has been processed with AI:
1. The lesson content will be displayed with tabs for different views:
   - **Content**: The full lesson text
   - **Sections**: Collapsible sections of the lesson
   - **Q&A**: Interactive question-answer pairs

2. The chatbot will use the Q&A pairs to provide more relevant answers to student questions

## API Endpoints

### Upload PDF Lesson
```
POST /api/lessons/pdf
```
- Form data parameters:
  - `pdfFile`: The PDF file to process
  - `courseId`: Course ID
  - `weekId`: Week ID
  - `dayId`: Day ID
  - `title`: Lesson title

### Get Lesson Content
```
GET /api/lessons/:id/content
```
- Returns enhanced lesson content including:
  - `id`: Lesson ID
  - `title`: Lesson title
  - `summary`: AI-generated summary
  - `content`: Full lesson text
  - `sections`: Array of section objects with title and content
  - `qaPairs`: Array of question-answer pairs

## Troubleshooting

### PDF Processing Issues
- Ensure Tesseract and Poppler are correctly installed and in PATH
- Check file permissions for the uploads directory
- Verify the PDF is not encrypted or password-protected

### Database Issues
- Make sure the database schema has been updated with the new fields
- Check that the `lesson_qa_pairs` table exists

### Python Issues
- Verify all dependencies are installed
- Check Python version (3.8+ recommended)
- Look for error logs in the server console 