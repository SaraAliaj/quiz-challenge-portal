import os
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from openai import OpenAI
import sqlite3
from datetime import datetime, time

app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)

# Database setup
def get_db_connection():
    conn = sqlite3.connect('quiz_portal.db')
    conn.row_factory = sqlite3.Row
    return conn

# API Key (Ensure this is kept secure and not exposed in production)
XAI_API_KEY = os.getenv('XAI_API_KEY', 'xai-r8VBOp32VgNscplC8ULSgM0EPAxXNgGylcpPIR55XNtwbYrVzZJs4daEgPHE3eCaAKrIcbUErODnU1mX')

# Initialize OpenAI client
try:
    client = OpenAI(
        api_key=XAI_API_KEY,
        base_url="https://api.x.ai/v1",
    )
except Exception as e:
    print(f"Error initializing API client: {e}")
    exit(1)

# Define system message for Lesson 1
lesson1_system_message = """
You are Grok, an educational chatbot created by xAI, designed to teach Lesson 1: Introduction to Deep Learning from the Deep Learning Book. 
Your purpose is to explain concepts from Lesson 1 clearly, provide examples, and assist students in understanding this topic. 
Respond only to questions related to Lesson 1 content below. If a question is outside this scope, say: "Sorry, I'm only trained on Lesson 1: Introduction to Deep Learning. Let's stick to that!"

---

Lesson 1: Introduction to Deep Learning

What is Deep Learning?
Deep learning is a subfield of machine learning that deals with algorithms inspired by the structure and function of the human brain, known as artificial neural networks. It is widely used for tasks such as image recognition, speech processing, and natural language understanding.

Key Concepts:
- Neural Networks: Computational models inspired by biological neural networks that are used to approximate complex functions.
- Activation Functions: Mathematical functions applied to the outputs of neurons to introduce non-linearity, enabling the network to learn complex patterns.
- Supervised vs. Unsupervised Learning:
  - Supervised Learning: The model is trained on labeled data.
  - Unsupervised Learning: The model works with data that has no labels, often finding hidden structures or patterns.

Code Example: Building a Simple Neural Network in TensorFlow
```python
import tensorflow as tf
from tensorflow import keras

# Define a simple sequential model
model = keras.Sequential([
    keras.layers.Dense(10, activation='relu', input_shape=(5,)), # 5 input features, 10 neurons in hidden layer
    keras.layers.Dense(1, activation='sigmoid') # Output layer with 1 neuron (binary classification)
])

# Compile the model
model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])

# Summary of the model
model.summary()
```

Answer questions using only the Lesson 1 content above.
Explain concepts in a simple, positive, and encouraging way.
If asked about the code, use the TensorFlow example and break it down.
Do not speculate or add information beyond what's provided.
"""

# Define general system message for other contexts
general_system_message = """
You are Grok, a helpful AI assistant. Feel free to help with any topic, but keep responses focused and relevant to the question asked.
"""

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_input = data.get('message', '')
        context = data.get('context', 'general')
        
        if not user_input.strip():
            return jsonify({'response': 'Please ask me something!'})

        # Use appropriate system message based on context
        system_message = lesson1_system_message if context == 'lesson1' else general_system_message

        response = client.chat.completions.create(
            model="grok-beta",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_input},
            ],
            temperature=0.7,
            max_tokens=500,
        )
        
        return jsonify({
            'response': response.choices[0].message.content
        })
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True) 