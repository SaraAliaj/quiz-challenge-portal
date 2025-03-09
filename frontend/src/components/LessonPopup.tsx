import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface LessonStatus {
  started: boolean;
  startedBy: number | null;
  lessonId?: string;
  duration?: number;
}

interface LessonPopupProps {
  lessonId: string;
  lessonName: string;
  onLessonStart?: (lessonId: string, duration: number) => void;
}

const LessonPopup: React.FC<LessonPopupProps> = ({ lessonId, lessonName, onLessonStart }) => {
  const { user } = useAuth();
  const { sendMessage } = useWebSocket();
  const { toast } = useToast();
  const [lessonStatus, setLessonStatus] = useState<LessonStatus>({ started: false, startedBy: null });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showDurationDialog, setShowDurationDialog] = useState<boolean>(false);
  const [selectedDuration, setSelectedDuration] = useState<string>("");
  
  const checkLessonStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/lessons/${lessonId}/status`);
      setLessonStatus(response.data);
    } catch (err) {
      setError('Failed to check lesson status');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleStartLesson = () => {
    if (user?.role !== 'lead_student') {
      toast({
        title: "Permission Denied",
        description: "Only lead students can start lessons.",
        variant: "destructive",
      });
      return;
    }
    
    setShowDurationDialog(true);
  };
  
  const startLesson = () => {
    if (!selectedDuration || !user) return;
    
    const duration = parseInt(selectedDuration);
    
    // Send WebSocket message to notify other users
    sendMessage('startLesson', {
      lessonId,
      duration,
      teacherName: user.username,
      lessonName
    });
    
    // Call the onLessonStart callback if provided
    if (onLessonStart) {
      onLessonStart(lessonId, duration);
    }
    
    // Update local state
    setLessonStatus({
      started: true,
      startedBy: user.id,
      lessonId,
      duration
    });
    
    setShowDurationDialog(false);
    setSelectedDuration("");
    
    toast({
      title: "Lesson Started",
      description: `You've started the lesson "${lessonName}" for ${duration} minutes.`,
    });
  };
  
  useEffect(() => {
    // Check lesson status when component mounts
    checkLessonStatus();
    
    // Poll for updates every 30 seconds
    const intervalId = setInterval(checkLessonStatus, 30000);
    
    return () => clearInterval(intervalId);
  }, [lessonId]);
  
  if (loading) {
    return <div>Loading lesson status...</div>;
  }
  
  if (error) {
    return <div className="error-message">{error}</div>;
  }
  
  return (
    <>
      {/* Lead student action button */}
      {user?.role === 'lead_student' && !lessonStatus.started && (
        <Button 
          onClick={handleStartLesson} 
          className="bg-primary text-white hover:bg-primary/90"
        >
          Start Lesson
        </Button>
      )}
      
      {/* Duration selection dialog */}
      <Dialog open={showDurationDialog} onOpenChange={setShowDurationDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Start Lesson: {lessonName}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="duration" className="text-right">
                Duration
              </Label>
              <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={startLesson} disabled={!selectedDuration}>
              Start Lesson
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LessonPopup; 