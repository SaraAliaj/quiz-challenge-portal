# Python Chatbot Implementation

This directory contains a Python implementation of the chatbot for the AI School platform. The chatbot provides a WebSocket-based interface for students to ask questions about lessons and get information about the database.

## Files

- `chatbot.py`: The main chatbot implementation with WebSocket server
- `check_db.py`: Database check script to verify database configuration and tables
- `init_db.py`: Database initialization script to create the database and required tables
- `pdf_integration.py`: Module for processing PDF files and integrating with the database

## Requirements

All required Python packages are listed in the `requirements.txt` file. You can install them using:

```bash
pip install -r requirements.txt
```

## Configuration

The chatbot uses environment variables for configuration. Create a `.env` file in this directory with the following variables:

```
DB_HOST=localhost
DB_USER=Sara
DB_PASSWORD=Sara0330!!
DB_NAME=aischool
```

## Usage

### Starting the Chatbot Server

To start the chatbot server, run:

```bash
python chatbot.py
```

This will start a WebSocket server on `ws://localhost:8081`.

### Database Initialization

Before using the chatbot, you need to initialize the database:

```bash
python init_db.py
```

This will create the database and required tables if they don't exist.

### Database Check

To check the database configuration and tables:

```bash
python check_db.py
```

This will display information about the database connection, tables, and their structure.

### PDF Integration

The PDF integration module provides functions for processing PDF files and adding them to the database. You can use it directly:

```bash
python pdf_integration.py path/to/pdf/file.pdf
```

Or to get information about a lesson:

```bash
python pdf_integration.py --lesson-id 1
```

## WebSocket API

The chatbot uses a simple WebSocket API for communication:

### Client to Server

Send a JSON message with the following format:

```json
{
  "text": "Your message here"
}
```

### Server to Client

The server will respond with a JSON message:

```json
{
  "text": "Response from the chatbot",
  "sender": "bot"
}
```

## Frontend Integration

The frontend can connect to the chatbot using the WebSocket API. See the `src/components/Chatbot.UI.jsx` file for an example implementation.

## Error Handling

The chatbot includes comprehensive error handling and logging. All errors are logged to the console and returned to the client with appropriate error messages.

## Database Schema

The chatbot uses the following database tables:

- `users`: User information
- `lessons`: Lesson information
- `lesson_qa_pairs`: Question-answer pairs for lessons

## License

This project is licensed under the MIT License - see the LICENSE file for details. 