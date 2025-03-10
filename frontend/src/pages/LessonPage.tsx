import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LessonChatbot from '@/components/LessonChatbot';
import { useAuth } from '@/contexts/AuthContext';
import './LessonPage.css';

const LessonPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check if user is authorized to access this lesson
  useEffect(() => {
    const checkAccess = () => {
      // Lead students can access any lesson
      if (user?.role === 'lead_student') {
        setIsAuthorized(true);
        setIsLoading(false);
        return;
      }
      
      // For demo purposes, we'll allow access
      // In a real implementation, this would check if the lesson has been started by a lead student
      setIsAuthorized(true);
      setIsLoading(false);
    };
    
    checkAccess();
  }, [id, user]);
  
  if (isLoading) {
    return (
      <div className="lesson-page-loading">
        <div className="spinner"></div>
        <p>Loading lesson...</p>
      </div>
    );
  }
  
  if (!isAuthorized) {
    return (
      <div className="lesson-page-unauthorized">
        <div className="unauthorized-content">
          <h2>Access Denied</h2>
          <p>This lesson has not been started by a lead student yet.</p>
          <p>Please wait for a lead student to start the lesson.</p>
          <button 
            className="back-button"
            onClick={() => navigate('/')}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="lesson-page-container">
      <LessonChatbot 
        lessonId={id || 'default-lesson'} 
        lessonTitle="Introduction to Deep Learning" 
      />
    </div>
  );
};

export default LessonPage; 