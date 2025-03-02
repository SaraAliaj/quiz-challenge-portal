import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, FileText, Loader2, BookOpen, MessageSquare, FileIcon, Download } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { api } from "@/server/api";

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
      content: `Hello! I'm your AI assistant for the "${lessonTitle}" lesson. How can I help you?`,
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lessonContent, setLessonContent] = useState<LessonContent | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [activeTab, setActiveTab] = useState("content");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [initialLoad, setInitialLoad] = useState(true);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Simulate AI response
      setTimeout(() => {
        // If we have QA pairs, try to find a matching question
        let aiResponse = `I'm your assistant for the "${lessonTitle}" lesson. When fully implemented, I'll provide specific help related to this topic!`;
        
        if (lessonContent?.qaPairs && lessonContent.qaPairs.length > 0) {
          // Simple matching algorithm - find the most similar question
          const userQuestion = input.toLowerCase();
          let bestMatch: QAPair | null = null;
          let highestScore = 0;
          
          for (const pair of lessonContent.qaPairs) {
            const question = pair.question.toLowerCase();
            let score = 0;
            
            // Count matching words
            const userWords = userQuestion.split(/\s+/);
            const questionWords = question.split(/\s+/);
            
            for (const word of userWords) {
              if (word.length > 3 && questionWords.includes(word)) {
                score += 1;
              }
            }
            
            if (score > highestScore) {
              highestScore = score;
              bestMatch = pair;
            }
          }
          
          // If we found a reasonable match, use its answer
          if (bestMatch && highestScore > 1) {
            aiResponse = bestMatch.answer;
          }
        }
        
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: aiResponse,
          sender: 'ai',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      setIsLoading(false);
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
    <div className="flex flex-col h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] px-8 py-6">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h2 className="text-xl font-bold flex items-center">
          <FileText className="mr-2 h-5 w-5 text-primary" />
          {lessonTitle}
        </h2>
      </div>
      
      {/* Lesson Content Section */}
      {isLoadingContent ? (
        <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg mb-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
          <span>Loading lesson content...</span>
        </div>
      ) : (
        <Card className="mb-4 max-h-[40vh] overflow-hidden">
          {isAIEnhanced() ? (
            <Tabs defaultValue="content" value={activeTab} onValueChange={setActiveTab}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Lesson Material</CardTitle>
                  <TabsList>
                    <TabsTrigger value="content" className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span>Content</span>
                    </TabsTrigger>
                    {lessonContent?.sections && lessonContent.sections.length > 0 && (
                      <TabsTrigger value="sections" className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        <span>Sections</span>
                      </TabsTrigger>
                    )}
                    {lessonContent?.qaPairs && lessonContent.qaPairs.length > 0 && (
                      <TabsTrigger value="qa" className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        <span>Q&A</span>
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>
                {lessonContent?.summary && (
                  <p className="text-sm text-muted-foreground mt-2 italic">
                    {lessonContent.summary}
                  </p>
                )}
              </CardHeader>
              <CardContent className="overflow-auto max-h-[30vh]">
                <TabsContent value="content" className="mt-0">
                  <ScrollArea className="h-[28vh]">
                    {renderContent()}
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="sections" className="mt-0">
                  <ScrollArea className="h-[28vh]">
                    {lessonContent?.sections && lessonContent.sections.length > 0 ? (
                      <Accordion type="single" collapsible className="w-full">
                        {lessonContent.sections.map((section, index) => (
                          <AccordionItem key={index} value={`section-${index}`}>
                            <AccordionTrigger className="text-sm font-medium">
                              {section.title}
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="whitespace-pre-wrap text-sm pl-4">
                                {section.content}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    ) : (
                      <p className="text-gray-500 italic">No sections available for this lesson.</p>
                    )}
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="qa" className="mt-0">
                  <ScrollArea className="h-[28vh]">
                    {lessonContent?.qaPairs && lessonContent.qaPairs.length > 0 ? (
                      <Accordion type="single" collapsible className="w-full">
                        {lessonContent.qaPairs.map((pair, index) => (
                          <AccordionItem key={index} value={`qa-${index}`}>
                            <AccordionTrigger className="text-sm font-medium">
                              {pair.question}
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="whitespace-pre-wrap text-sm pl-4">
                                {pair.answer}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    ) : (
                      <p className="text-gray-500 italic">No Q&A pairs available for this lesson.</p>
                    )}
                  </ScrollArea>
                </TabsContent>
              </CardContent>
            </Tabs>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-lg">Lesson Content</CardTitle>
              </CardHeader>
              <CardContent className="overflow-auto max-h-[30vh]">
                <ScrollArea className="h-[28vh]">
                  {renderContent()}
                </ScrollArea>
              </CardContent>
            </>
          )}
        </Card>
      )}
      
      <div className="flex flex-col flex-grow overflow-hidden rounded-xl">
        <Card className="flex-grow flex flex-col overflow-hidden shadow-lg border-slate-200">
          <ScrollArea ref={scrollAreaRef} className="flex-grow p-6">
            <div className="space-y-6 pb-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 ${
                    message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <Avatar className={`h-8 w-8 ${message.sender === 'user' ? 'bg-primary' : 'bg-slate-200'}`}>
                    <AvatarFallback className="text-xs">
                      {message.sender === 'user' ? 
                        <User className="h-4 w-4" /> : 
                        <Bot className="h-4 w-4" />
                      }
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-1 max-w-[75%]">
                    <div
                      className={`rounded-lg px-5 py-3 ${
                        message.sender === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <p className="text-xs text-slate-500 px-2">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="p-5 border-t mt-auto bg-slate-50">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1 shadow-sm"
              />
              <Button type="submit" disabled={isLoading} className="px-5 gap-2">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span className="hidden sm:inline">Send</span>
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
} 