import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Sparkles, Brain } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  text: string;
  isUser: boolean;
  timestamp: string;
}

interface ChatBotProps {
  topic?: string;
}

export function ChatBot({ topic = "Deep Learning" }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      text: `I'm your AI assistant for this ${topic} lesson. How can I help you?`,
      isUser: false,
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    // Add user message
    const userMessage: Message = {
      text: inputValue,
      isUser: true,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    
    // Generate response based on user input
    let responseText = "I apologize, but I'm having trouble processing your question at the moment. Please try asking a more specific question about the lesson content, or try again later.";
    
    // Simple response logic for Deep Learning lesson
    const userQuestion = inputValue.toLowerCase();
    
    // Deep Learning specific responses
    if (userQuestion.includes("explain") && userQuestion.includes("topic")) {
      responseText = "This lesson covers Introduction to Deep Learning. Deep learning is a subset of machine learning that uses neural networks with multiple layers to analyze data. It's particularly effective for processing unstructured data like images, text, and audio.";
    } else if (userQuestion.includes("what is") && userQuestion.includes("deep learning")) {
      responseText = "Deep learning is a subset of machine learning that uses neural networks with multiple layers (deep neural networks) to analyze various factors of data. It can automatically discover features from raw data and excels at processing unstructured data.";
    } else if (userQuestion.includes("application") || userQuestion.includes("use case")) {
      responseText = "Deep learning has many applications including: Computer Vision (image classification, object detection), Natural Language Processing (translation, sentiment analysis), Speech Recognition, Healthcare (disease diagnosis), Autonomous Vehicles, and Gaming.";
    } else if (userQuestion.includes("challenge") || userQuestion.includes("limitation")) {
      responseText = "Despite its success, deep learning faces several challenges: it requires large amounts of labeled data, is computationally intensive, models can be difficult to interpret (black box problem), it's vulnerable to adversarial attacks, and may amplify biases present in training data.";
    } else if (userQuestion.includes("history")) {
      responseText = "The concept of neural networks has been around since the 1940s, but deep learning as we know it today began to take shape in the 1980s and 1990s. It experienced a renaissance in the 2010s due to increased computational power, large datasets, algorithmic improvements, and open-source frameworks.";
    } else if (userQuestion.includes("get started") || userQuestion.includes("begin") || userQuestion.includes("learn")) {
      responseText = "To begin with deep learning: 1) Learn the mathematical foundations (linear algebra, calculus, probability), 2) Master a programming language (Python is most common), 3) Study frameworks like TensorFlow or PyTorch, 4) Start with simple projects, 5) Stay updated with the latest research.";
    } else if (userQuestion.includes("neural network")) {
      responseText = "Neural networks are the foundation of deep learning. They consist of: Input layer (receives raw data), Hidden layers (process data through weighted connections), and Output layer (produces the final result). The multiple hidden layers in deep neural networks allow them to learn complex patterns.";
    } else if (userQuestion.includes("activation function")) {
      responseText = "Activation functions introduce non-linearity into neural networks, allowing them to learn complex patterns. Common ones include: ReLU (most commonly used), Sigmoid (for binary classification), and Tanh (similar to sigmoid but with output range [-1, 1]).";
    } else if (userQuestion.includes("backpropagation")) {
      responseText = "Backpropagation is the algorithm used to train neural networks by: 1) Calculating the error at the output, 2) Propagating it backward through the network, and 3) Adjusting weights to minimize the error. This process allows the network to learn from its mistakes.";
    } else if (userQuestion.includes("computer vision") || userQuestion.includes("image")) {
      responseText = "Deep learning has revolutionized computer vision tasks like image classification, object detection, and facial recognition. Convolutional Neural Networks (CNNs) are particularly effective for these tasks as they can automatically learn spatial hierarchies of features from images.";
    } else if (userQuestion.includes("nlp") || userQuestion.includes("natural language")) {
      responseText = "Deep learning has transformed Natural Language Processing (NLP) through models like Transformers, which power systems like GPT and BERT. These models can understand context, generate human-like text, perform translation, and analyze sentiment with remarkable accuracy.";
    } else if (userQuestion.includes("thank")) {
      responseText = "You're welcome! If you have any more questions about deep learning, feel free to ask.";
    } else if (userQuestion.includes("hello") || userQuestion.includes("hi ")) {
      responseText = "Hello! I'm your AI assistant for this Deep Learning lesson. How can I help you today?";
    } else {
      responseText = "I'm not sure I understand your question about deep learning. Could you rephrase it or ask about specific topics like neural networks, applications, challenges, or getting started with deep learning?";
    }
    
    // Simulate network delay
    setTimeout(() => {
      const aiMessage: Message = {
        text: responseText,
        isUser: false,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full border-l">
      <div className="p-4 border-b bg-gradient-to-r from-gradient-start via-gradient-middle to-gradient-end text-white">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Brain className="h-6 w-6" />
            <Sparkles className="h-3 w-3 absolute -top-1 -right-1 text-yellow-300" />
          </div>
          <h3 className="font-semibold">AI Learning Assistant</h3>
        </div>
        <p className="text-xs text-white/80 mt-1">Ask me anything about deep learning</p>
      </div>
      
      <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-secondary/30 to-white">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`flex flex-col ${message.isUser ? 'items-end' : 'items-start'}`}
            >
              <div 
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.isUser 
                    ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md' 
                    : 'bg-white text-lesson-text border border-primary/10 shadow-sm'
                }`}
              >
                {message.text}
              </div>
              <span className="text-xs text-muted-foreground mt-1">
                {message.timestamp}
              </span>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-center space-x-2 text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <Input
            placeholder="Ask about deep learning..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1 border-primary/20 focus-visible:ring-primary/30 rounded-full"
          />
          <Button 
            size="icon" 
            onClick={handleSendMessage} 
            disabled={isLoading}
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90 rounded-full"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
} 