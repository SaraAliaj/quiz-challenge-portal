import React, { useState, useRef, useEffect, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, FileText, Loader2, BookOpen, MessageSquare, FileIcon, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { api } from "@/server/api";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import './LessonChatbot.css';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface Section {
  title: string;
  content: string;
}

interface QAPair {
  question: string;
  answer: string;
}

interface LessonContent {
  id: string;
  title: string;
  content: string;
  summary?: string;
  sections?: Section[];
  qaPairs?: QAPair[];
  fileType?: string;
  fileName?: string;
}

interface LessonChatbotProps {
  lessonId: string;
  lessonTitle: string;
}

interface TableOfContentsItem {
  title: string;
  page?: number;
  level: number;
  children?: TableOfContentsItem[];
}

export default function LessonChatbot({ 
  lessonId,
  lessonTitle
}: LessonChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `Hello! I'm your AI assistant for the "${lessonTitle}" lesson. I can answer questions about deep learning concepts, provide examples, or help clarify any topics you're finding difficult. How can I help you today?`,
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lessonContent, setLessonContent] = useState<LessonContent | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [tableOfContents, setTableOfContents] = useState<TableOfContentsItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTableOfContents, setShowTableOfContents] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  
  // Mock PDF URL for demo purposes
  const mockPdfUrl = 'https://example.com/lesson.pdf';

  // Initialize WebSocket connection
  useEffect(() => {
    // Mock setup for demo purposes
    const setupWebSocket = () => {
      console.log('Setting up WebSocket connection...');
      // In a real implementation, this would connect to a WebSocket server
    };

    setupWebSocket();
    
    // Cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [lessonId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Fetch lesson content on initial load
  useEffect(() => {
    const fetchLessonContent = async () => {
      if (!lessonId) return;
      
      setIsLoadingContent(true);
      try {
        // In a real implementation, this would fetch from an API
        console.log(`Fetching content for lesson: ${lessonId}`);
        
        // Mock data for demo
        const mockContent: LessonContent = {
          id: lessonId,
          title: 'Introduction to Deep Learning',
          content: 'Deep learning is a subfield of machine learning...',
        };
        
        setLessonContent(mockContent);
      } catch (error) {
        console.error('Error fetching lesson content:', error);
        toast({
          title: 'Error',
          description: 'Failed to load lesson content. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingContent(false);
      }
    };

    if (initialLoad) {
      fetchLessonContent();
      setInitialLoad(false);
    }
  }, [lessonId, toast, initialLoad]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Get lesson context for better responses
      const context = lessonContent ? 
        `Lesson Title: ${lessonContent.title}\n\nLesson Content: ${lessonContent.content}` : 
        `Lesson Title: ${lessonTitle}`;
      
      console.log("Sending message to Grok API...");
      
      // Send message to Grok API
      const response = await api.sendMessageToGrok(inputValue, context);
      
      console.log("Received response from Grok API:", response);
      
      // Create AI message from response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.message || "I'm sorry, I couldn't generate a response. Please try again.",
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Show error message
      toast({
        title: 'Error',
        description: 'Failed to get a response from the AI. Please try again.',
        variant: 'destructive',
      });
      
      // Fallback response with more helpful information about deep learning
      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I'm having trouble connecting to the server. Here's what I know about deep learning: Deep learning is a subfield of machine learning that uses neural networks with multiple layers (hence 'deep') to progressively extract higher-level features from raw input. For example, in image processing, lower layers might identify edges, while higher layers might identify concepts relevant to humans such as digits, letters, or faces.",
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle key press in input field
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage();
  };

  return (
    <div className="lesson-chatbot-container">
      <div className="lesson-header">
        <div className="lesson-title">
          <BookOpen size={20} />
          <h2>Deep Learning - Week 1</h2>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="lesson-tabs">
        <TabsList className="lesson-tabs-list">
          <TabsTrigger value="content" className="lesson-tab">
            <FileText size={16} />
            <span>Lesson Content</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="lesson-tab">
            <MessageSquare size={16} />
            <span>AI Assistant</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="content" className="lesson-content-tab">
          <Card className="lesson-content-card">
            <CardHeader className="lesson-content-header">
              <CardTitle className="lesson-content-title">
                <div className="content-title-text">Lesson 1.1: Introduction to Deep Learning</div>
                <div className="content-pagination">
                  <button className="pagination-btn" disabled={currentPage <= 1}>
                    <ChevronLeft size={16} />
                  </button>
                  <span className="pagination-info">Page {currentPage} of {totalPages}</span>
                  <button className="pagination-btn" disabled={currentPage >= totalPages}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="lesson-content-body">
              <div className="lesson-pdf-content">
                <div className="pdf-content">
                  <div className="pdf-page">
                    <h3>What is Deep Learning?</h3>
                    <p>Deep learning is a subfield of machine learning that deals with algorithms inspired by the structure and function of the human brain, known as artificial neural networks. It is widely used for tasks such as image recognition, speech processing, and natural language understanding.</p>
                    
                    <h4>Key Concepts</h4>
                    <ul>
                      <li><strong>Neural Networks:</strong> Computational models inspired by biological neural networks that are used to approximate complex functions.</li>
                      <li><strong>Activation Functions:</strong> Mathematical functions applied to the outputs of neurons to introduce non-linearity, enabling the network to learn complex patterns.</li>
                      <li><strong>Supervised vs. Unsupervised Learning:</strong>
                        <ul>
                          <li>Supervised Learning: The model is trained on labeled data.</li>
                          <li>Unsupervised Learning: The model works with data that has no labels, often finding hidden structures or patterns.</li>
                        </ul>
                      </li>
                    </ul>
                    
                    <h4>Code Example: Building a Simple Neural Network in TensorFlow</h4>
                    <pre className="code-block">
                      <code>
{`python
import tensorflow as tf
from tensorflow import keras

# Define a simple sequential model
model = keras.Sequential([
    keras.layers.Dense(10, activation='relu', input_shape=(5,)), # 5 input features, 10 neurons in hidden layer
    keras.layers.Dense(1, activation='sigmoid') # Output layer with 1 neuron (binary classification)
])

# Compile the model
model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])`}
                      </code>
                    </pre>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="chat" className="lesson-chat-tab">
          <Card className="chat-card">
            <CardHeader className="chat-header">
              <CardTitle className="chat-title">
                <Bot size={18} />
                <span>AI Assistant for "Introduction to Deep Learning"</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="chat-content">
              <ScrollArea className="chat-messages">
                {messages.length === 0 ? (
                  <div className="empty-chat">
                    <Bot size={40} />
                    <h3>Ask me anything about this lesson!</h3>
                    <p>I can help explain concepts, provide examples, or answer questions about deep learning.</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`chat-message ${message.sender === 'user' ? 'user-message' : 'ai-message'}`}
                    >
                      <div className="message-avatar">
                        {message.sender === 'user' ? (
                          <Avatar>
                            <AvatarFallback>{user?.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                          </Avatar>
                        ) : (
                          <Avatar>
                            <AvatarFallback><Bot size={18} /></AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                      <div className="message-content">
                        <div className="message-sender">
                          {message.sender === 'user' ? user?.username || 'You' : 'AI Assistant'}
                        </div>
                        <div className="message-text">
                          {message.content}
                        </div>
                        <div className="message-time">
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="loading-message">
                    <Loader2 className="animate-spin" />
                    <span>AI is thinking...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </ScrollArea>
              
              <form onSubmit={handleSubmit} className="chat-input-form">
                <Textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about this lesson..."
                  className="chat-input"
                  disabled={isLoading}
                />
                <Button 
                  type="submit" 
                  className="send-button" 
                  disabled={isLoading || !inputValue.trim()}
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}