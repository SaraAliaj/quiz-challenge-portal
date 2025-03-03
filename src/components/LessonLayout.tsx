import React from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Lesson1Chatbot } from './Lesson1Chatbot';
import { ScrollArea } from "@/components/ui/scroll-area";

interface LessonLayoutProps {
  children: React.ReactNode;
  isLesson1?: boolean;
}

export function LessonLayout({ children, isLesson1 = false }: LessonLayoutProps) {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <ResizablePanelGroup direction="horizontal">
        {/* Main Content */}
        <ResizablePanel defaultSize={70}>
          <ScrollArea className="h-full">
            <div className="p-6">
              {children}
            </div>
          </ScrollArea>
        </ResizablePanel>

        {/* Show Lesson 1 Chatbot only for Lesson 1 */}
        {isLesson1 && (
          <>
            <ResizableHandle />
            <ResizablePanel defaultSize={30}>
              <div className="h-full p-2">
                <Lesson1Chatbot />
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
} 