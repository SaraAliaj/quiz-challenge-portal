import React from 'react';
import { useParams } from 'react-router-dom';
import LessonChatbot from '@/components/LessonChatbot';
import './LessonPage.css';

const LessonPage = () => {
  const { id } = useParams<{ id: string }>();
  
  return (
    <div className="lesson-page-container" style={{ height: 'calc(100vh - 60px)' }}>
      <LessonChatbot 
        lessonId={id || 'default-lesson'} 
        lessonTitle="Introduction to Deep Learning" 
      />
    </div>
  );
};

export default LessonPage; 