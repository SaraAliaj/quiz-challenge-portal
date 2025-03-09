import React, { useState, useRef, useEffect } from "react";
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
import { nanoid } from 'nanoid';

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

export function LessonChatbot({ 
  lessonId,
  lessonTitle
}: LessonChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `I'm your AI assistant for this Deep Learning lesson. How can I help you?`,
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lessonContent, setLessonContent] = useState<LessonContent | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Initialize WebSocket connection
  useEffect(() => {
    // Function to create and set up WebSocket
    const setupWebSocket = () => {
      // Create WebSocket connection
      const ws = new WebSocket('ws://localhost:8000/ws');
      
      ws.onopen = () => {
        console.log('Connected to WebSocket server');
        toast({
          title: "Connected",
          description: "Connected to the AI assistant.",
          variant: "default",
        });
      };
      
      ws.onmessage = (event) => {
        console.log('Message from server:', event.data);
        try {
          // Try to parse the response as JSON
          const jsonData = JSON.parse(event.data);
          
          // Check if there's an error
          if (jsonData.error) {
            toast({
              title: "Error",
              description: jsonData.error,
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
          
          // Add AI response to messages
          const aiMessage: Message = {
            id: nanoid(),
            content: jsonData.response || jsonData.message || event.data,
            sender: 'ai',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiMessage]);
        } catch (e) {
          // If not JSON, treat as plain text
          const aiMessage: Message = {
            id: nanoid(),
            content: event.data,
            sender: 'ai',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiMessage]);
        }
        setIsLoading(false);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: "Connection Error",
          description: "Failed to connect to lesson server. Will try to reconnect...",
          variant: "destructive",
        });
        setIsLoading(false);
      };
      
      ws.onclose = () => {
        console.log('WebSocket connection closed');
        // Try to reconnect after 3 seconds
        setTimeout(() => {
          toast({
            title: "Reconnecting",
            description: "Attempting to reconnect to the server...",
          });
          setupWebSocket(); // Recursively try to reconnect
        }, 3000);
      };
      
      socketRef.current = ws;
    };
    
    // Initial setup
    setupWebSocket();
    
    // Clean up on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  // Fetch lesson content
  useEffect(() => {
    const fetchLessonContent = async () => {
      setIsLoadingContent(true);
      try {
        const data = await api.getLessonContent(lessonId);
        setLessonContent(data);
      } catch (error) {
        console.error('Failed to fetch lesson content:', error);
        setLessonContent({
          id: lessonId,
          title: lessonTitle,
          content: 'Error loading lesson content. Please try again later.'
        });
      } finally {
        setIsLoadingContent(false);
      }
    };

    fetchLessonContent();
  }, [lessonId, lessonTitle]);

  useEffect(() => {
    // Prevent scrolling to bottom on initial load
    if (initialLoad) {
      setInitialLoad(false);
      return;
    }

    // Only scroll when new messages are added
    if (messagesEndRef.current && scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }
  }, [messages]);

  // Reset window scroll position when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    // Add user message to chat
    const userMessage: Message = {
      id: nanoid(),
      content: input,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // Send message to backend
      const response = await api.sendLessonChatMessage(lessonId, input);
      
      // Add AI response to chat
      const aiMessage: Message = {
        id: nanoid(),
        content: response.message || "I'm sorry, I couldn't process your question. Please try again.",
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: nanoid(),
        content: "I'm sorry, I encountered an error processing your request. Please try again later.",
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Error",
        description: "Failed to get a response from the AI assistant.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle pressing Enter to send message
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Helper function to determine if content is AI-enhanced
  const isAIEnhanced = () => {
    return !!(lessonContent?.summary || lessonContent?.sections || lessonContent?.qaPairs);
  };

  // Helper function to detect and format PDF content
  const formatContent = (content: string) => {
    if (!content) return "No content available";
    
    // Check if content is PDF binary data (starts with %PDF)
    if (content.startsWith('%PDF')) {
      return "This is a PDF document. The content cannot be displayed directly in this view.";
    }
    
    return content;
  };

  // Render content based on file type
  const renderContent = () => {
    if (!lessonContent) {
      return <p className="text-gray-500 italic">No content available for this lesson.</p>;
    }

    const pdfUrl = api.downloadLessonFile(lessonId);

    return (
      <div className="flex flex-col h-full">
        {/* PDF Viewer Container with fallback */}
        <div className="w-full flex-1 min-h-[600px] bg-white rounded-lg overflow-hidden border">
          <object
            data={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
            type="application/pdf"
            className="w-full h-full"
          >
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
              className="w-full h-full"
              style={{ border: 'none' }}
            >
              <p>
                Your browser doesn't support embedded PDFs.
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                  Click here to view the PDF
                </a>
              </p>
            </iframe>
          </object>
        </div>
        
        <div className="flex justify-end mt-4">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => window.open(pdfUrl, '_blank')}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>
    );
  };

  return (
<<<<<<< Updated upstream
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-bold flex items-center">
          <MessageSquare className="mr-2 h-5 w-5 text-black" />
          AI Assistant
        </h2>
      </div>

      <ScrollArea ref={scrollAreaRef} className="flex-grow p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${
                message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <Avatar className={`h-8 w-8 ${message.sender === 'user' ? 'bg-black' : 'bg-gray-200'}`}>
                <AvatarFallback className="text-xs">
                  {message.sender === 'user' ? 
                    <User className="h-4 w-4" /> : 
                    <Bot className="h-4 w-4 text-black" />
                  }
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-1 max-w-[75%]">
                <div
                  className={`rounded-lg px-4 py-2 ${
                    message.sender === 'user'
                      ? 'bg-black text-white'
                      : 'bg-gray-100'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
                <p className="text-xs text-gray-500 px-2">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-gray-50">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading} className="bg-black hover:bg-gray-800">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
=======
    <Card className="flex flex-col h-full border-none shadow-none">
      <CardHeader className="px-4 py-3 border-b bg-muted/50">
        <CardTitle className="text-lg font-medium flex items-center">
          <Bot className="h-5 w-5 mr-2 text-primary" />
          Lesson Assistant
        </CardTitle>
      </CardHeader>
      
      <Tabs defaultValue="chat" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-2 grid w-auto grid-cols-2">
          <TabsTrigger value="chat" onClick={() => setActiveTab("chat")}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="info" onClick={() => setActiveTab("info")}>
            <BookOpen className="h-4 w-4 mr-2" />
            About
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="chat" className="flex-1 flex flex-col px-4 pt-2 pb-4">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`flex max-w-[80%] ${
                      message.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    } rounded-lg px-3 py-2`}
                  >
                    {message.sender === 'ai' && (
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarFallback>AI</AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-50 mt-1">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    {message.sender === 'user' && (
                      <Avatar className="h-6 w-6 ml-2">
                        <AvatarFallback>
                          {user?.username?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          <div className="flex items-center gap-2 mt-4">
            <Input
              placeholder="Ask a question about this lesson..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={isLoading || !input.trim()}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="info" className="flex-1 px-4 pt-2 pb-4">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">About this Assistant</h3>
              <p>
                This AI assistant is designed to help you understand the concepts covered in this lesson.
              </p>
              <div className="bg-muted p-3 rounded-md">
                <h4 className="font-medium mb-2">What I can help with:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Explaining concepts from this lesson</li>
                  <li>Answering questions about the lesson material</li>
                  <li>Providing examples related to the lesson content</li>
                  <li>Clarifying difficult topics from the lesson</li>
                </ul>
              </div>
              <div className="bg-muted p-3 rounded-md">
                <h4 className="font-medium mb-2">What I cannot help with:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Questions unrelated to this lesson's content</li>
                  <li>Personal or sensitive information</li>
                  <li>Writing code or completing assignments for you</li>
                  <li>Topics not covered in the lesson material</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                This assistant has knowledge of the specific content in this lesson and will only answer questions related to that material.
              </p>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </Card>
>>>>>>> Stashed changes
  );
}