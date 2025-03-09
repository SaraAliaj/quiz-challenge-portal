import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import LessonChatbot from '@/components/LessonChatbot';
import { api } from '@/server/api';
import { Button } from '@/components/ui/button';
import { Download, FileText, Loader2 } from 'lucide-react';

interface LessonDetails {
  id: string;
  title: string;
  content?: string;
}

export default function LessonPage() {
  const { id } = useParams();
  const lessonId = id || '';
  const [lesson, setLesson] = useState<LessonDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pdfError, setPdfError] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(true);

  useEffect(() => {
    const fetchLessonDetails = async () => {
      try {
        const content = await api.getLessonContent(lessonId);
        setLesson({
          id: lessonId,
          title: content.title || 'Current Lesson',
          content: content.content
        });
      } catch (error) {
        console.error('Failed to fetch lesson details:', error);
        setPdfError(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (lessonId) {
      fetchLessonDetails();
    }
  }, [lessonId]);

  const handlePdfLoad = () => {
    setPdfLoading(false);
  };

  const handlePdfError = () => {
    setPdfError(true);
    setPdfLoading(false);
  };

  if (!lessonId) {
    return <div className="flex items-center justify-center h-full">Lesson not found</div>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 mr-2" />
        <span>Loading lesson...</span>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* PDF Viewer - Left side */}
      <div className="w-1/2 h-full p-4 border-r">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center">
            <FileText className="mr-2 h-5 w-5 text-black" />
            {lesson?.title || 'Current Lesson'}
          </h2>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => window.open(api.downloadLessonFile(lessonId), '_blank')}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
        
        <div className="w-full h-[calc(100vh-8rem)] bg-white rounded-lg overflow-hidden border relative">
          {pdfLoading && !pdfError && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mr-2" />
              <span>Loading PDF...</span>
            </div>
          )}
          
          {pdfError ? (
            <div className="flex items-center justify-center h-full flex-col p-8 text-center">
              <FileText className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">PDF Not Available</h3>
              <p className="text-gray-500">The lesson file could not be found or is not accessible.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          ) : (
            <embed
              src={`${api.downloadLessonFile(lessonId)}#toolbar=0&navpanes=0&scrollbar=1&zoom=page-fit`}
              type="application/pdf"
              className="w-full h-full"
              onLoad={handlePdfLoad}
              onError={handlePdfError}
            />
          )}
        </div>
      </div>

      {/* Chatbot - Right side */}
      <div className="w-1/2 h-full">
        <LessonChatbot 
          lessonId={lessonId} 
          lessonTitle={lesson?.title || 'Current Lesson'} 
        />
      </div>
    </div>
  );
} 