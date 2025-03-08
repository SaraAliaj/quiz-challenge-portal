import React from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatBot } from "./ChatBot";

interface LessonLayoutProps {
  children: React.ReactNode;
  isLesson1?: boolean;
}

export function LessonLayout({ children, isLesson1 = false }: LessonLayoutProps) {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <ResizablePanelGroup direction="horizontal" className="bg-gradient-to-b from-secondary/30 to-white">
        {/* Main Content */}
        <ResizablePanel defaultSize={isLesson1 ? 60 : 100}>
          <ScrollArea className="h-full">
            <div className="p-6">
              {children}
            </div>
          </ScrollArea>
        </ResizablePanel>
        
        {/* Chat Panel - Only shown for Deep Learning lesson */}
        {isLesson1 && (
          <>
            <ResizableHandle className="bg-gradient-to-b from-gradient-start to-gradient-end hover:opacity-90 transition-opacity" />
            <ResizablePanel defaultSize={40} className="bg-white shadow-inner">
              <ChatBot topic="Deep Learning" />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
} 