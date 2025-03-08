import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

async function createSampleLessonFiles() {
  console.log('Creating Sample Lesson Files');
  console.log('===========================');
  
  let connection;
  
  try {
    // Connect to the database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'aischool'
    });
    
    console.log('Successfully connected to MySQL');
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Create deep learning introduction lesson content
    const deepLearningIntroContent = `# Introduction to Deep Learning

## What is Deep Learning?

Deep learning is a subset of machine learning that uses neural networks with multiple layers (deep neural networks) to analyze various factors of data.

Key characteristics of deep learning:
- Uses neural networks with many layers (hence "deep")
- Can automatically discover features from raw data
- Excels at processing unstructured data like images, text, and audio
- Requires large amounts of data and computational power
- Has achieved state-of-the-art results in many domains

## History of Deep Learning

The concept of artificial neural networks has been around since the 1940s, but deep learning as we know it today began to take shape in the 1980s and 1990s. However, it wasn't until the 2010s that deep learning experienced a renaissance due to:

1. Increased computational power (especially GPUs)
2. Availability of large datasets
3. Algorithmic improvements (like better activation functions)
4. Development of open-source frameworks

## Key Concepts in Deep Learning

### Neural Networks
Neural networks are the foundation of deep learning. They consist of:
- Input layer: Receives the raw data
- Hidden layers: Process the data through weighted connections
- Output layer: Produces the final result

### Activation Functions
Activation functions introduce non-linearity into the network, allowing it to learn complex patterns:
- ReLU (Rectified Linear Unit): Most commonly used
- Sigmoid: Used for binary classification
- Tanh: Similar to sigmoid but with output range [-1, 1]

### Backpropagation
Backpropagation is the algorithm used to train neural networks by:
1. Calculating the error at the output
2. Propagating it backward through the network
3. Adjusting weights to minimize the error

## Applications of Deep Learning

Deep learning has revolutionized many fields:

- Computer Vision: Image classification, object detection, facial recognition
- Natural Language Processing: Translation, sentiment analysis, chatbots
- Speech Recognition: Voice assistants, transcription services
- Healthcare: Disease diagnosis, drug discovery
- Autonomous Vehicles: Self-driving cars, drones
- Gaming: AlphaGo, game-playing agents

## Challenges in Deep Learning

Despite its success, deep learning faces several challenges:
- Requires large amounts of labeled data
- Computationally intensive and energy-consuming
- Models can be difficult to interpret (black box problem)
- Vulnerable to adversarial attacks
- May amplify biases present in training data

## Getting Started with Deep Learning

To begin working with deep learning:
1. Learn the mathematical foundations (linear algebra, calculus, probability)
2. Master a programming language (Python is most common)
3. Study frameworks like TensorFlow or PyTorch
4. Start with simple projects and gradually increase complexity
5. Stay updated with the latest research and developments

## Conclusion

Deep learning is a powerful approach to artificial intelligence that has transformed how we solve complex problems. As technology advances, we can expect deep learning to continue evolving and finding new applications across various domains.`;

    const deepLearningFilePath = path.join(uploadsDir, 'deep_learning_intro.txt');
    fs.writeFileSync(deepLearningFilePath, deepLearningIntroContent);
    console.log(`Created deep learning introduction file at: ${deepLearningFilePath}`);
    
    // Update the lesson file paths in the database
    // Find lessons related to deep learning introduction
    const [lessons] = await connection.query(`
      SELECT id, lesson_name 
      FROM lessons 
      WHERE lesson_name LIKE '%Deep Learning%' AND lesson_name LIKE '%Introduction%'
    `);
    
    console.log(`Found ${lessons.length} deep learning introduction lessons`);
    
    // Update each lesson with the new file path
    for (const lesson of lessons) {
      await connection.query(
        'UPDATE lessons SET file_path = ? WHERE id = ?',
        [deepLearningFilePath, lesson.id]
      );
      console.log(`Updated lesson "${lesson.lesson_name}" (ID: ${lesson.id}) with file path: ${deepLearningFilePath}`);
    }
    
    console.log('Sample lesson files created and database updated successfully!');
    
  } catch (error) {
    console.error('Error creating sample lesson files:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

createSampleLessonFiles(); 