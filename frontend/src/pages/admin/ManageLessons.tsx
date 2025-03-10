import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { api } from '@/server/api';
import { Upload, FileText, X } from 'lucide-react';
import './AdminPages.css';

interface Lesson {
  id: number;
  lesson_name: string;
  course_id: number;
  course_name: string;
  week_id: number;
  week_name?: string;
  day_id: number;
  day_name?: string;
  file_path: string;
  created_at: string;
}

interface Course {
  id: number;
  name: string;
}

interface Week {
  id: number;
  name: string;
}

interface Day {
  id: number;
  day_name: string;
}

const ManageLessons = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [days, setDays] = useState<Day[]>([]);
  const [newLesson, setNewLesson] = useState({
    lesson_name: '',
    course_id: '',
    week_id: '',
    day_id: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch lessons, courses, weeks, and days on component mount
  useEffect(() => {
    fetchLessons();
    fetchCourses();
    fetchWeeks();
    fetchDays();
  }, []);

  const fetchLessons = async () => {
    setIsLoading(true);
    try {
      const response = await api.getLessons();
      setLessons(response.data || []);
    } catch (error) {
      console.error('Failed to fetch lessons:', error);
      toast({
        title: 'Error',
        description: 'Failed to load lessons. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await api.getCourses();
      setCourses(response.data || []);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load courses. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const fetchWeeks = async () => {
    try {
      const response = await api.getWeeks();
      setWeeks(response.data || []);
    } catch (error) {
      console.error('Failed to fetch weeks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load weeks. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const fetchDays = async () => {
    try {
      const response = await api.getDays();
      setDays(response.data || []);
    } catch (error) {
      console.error('Failed to fetch days:', error);
      toast({
        title: 'Error',
        description: 'Failed to load days. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewLesson(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setNewLesson(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!newLesson.lesson_name.trim() || !newLesson.course_id || !newLesson.week_id || !newLesson.day_id) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('title', newLesson.lesson_name);
      formData.append('courseId', newLesson.course_id);
      formData.append('weekId', newLesson.week_id);
      formData.append('dayId', newLesson.day_id);
      
      if (selectedFile) {
        formData.append('files', selectedFile);
      }
      
      // Upload the lesson with file
      await api.uploadLessonFile(formData);
      
      toast({
        title: 'Success',
        description: 'Lesson added successfully!',
      });
      
      // Reset form and refresh lessons
      setNewLesson({
        lesson_name: '',
        course_id: '',
        week_id: '',
        day_id: '',
      });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchLessons();
    } catch (error) {
      console.error('Failed to add lesson:', error);
      toast({
        title: 'Error',
        description: 'Failed to add lesson. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Manage Lessons</h1>
      
      <div className="admin-page-content">
        <Card className="add-form-card">
          <CardHeader>
            <CardTitle>Add New Lesson</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddLesson} className="add-form">
              <div className="form-group">
                <label htmlFor="lesson_name">Lesson Name</label>
                <Input
                  id="lesson_name"
                  name="lesson_name"
                  value={newLesson.lesson_name}
                  onChange={handleInputChange}
                  placeholder="Enter lesson name"
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="course_id">Course</label>
                <Select
                  value={newLesson.course_id}
                  onValueChange={(value) => handleSelectChange('course_id', value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id.toString()}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="form-group">
                <label htmlFor="week_id">Week</label>
                <Select
                  value={newLesson.week_id}
                  onValueChange={(value) => handleSelectChange('week_id', value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a week" />
                  </SelectTrigger>
                  <SelectContent>
                    {weeks.map((week) => (
                      <SelectItem key={week.id} value={week.id.toString()}>
                        {week.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="form-group">
                <label htmlFor="day_id">Day</label>
                <Select
                  value={newLesson.day_id}
                  onValueChange={(value) => handleSelectChange('day_id', value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a day" />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((day) => (
                      <SelectItem key={day.id} value={day.id.toString()}>
                        {day.day_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="form-group">
                <label htmlFor="file">Lesson File</label>
                <div className="file-upload-container">
                  <input
                    type="file"
                    id="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden-file-input"
                    disabled={isSubmitting}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="file-select-button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Select File
                  </Button>
                  {selectedFile && (
                    <div className="selected-file">
                      <FileText className="w-4 h-4 mr-2" />
                      <span className="file-name">{selectedFile.name}</span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="remove-file-button"
                        onClick={clearSelectedFile}
                        disabled={isSubmitting}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Lesson'}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <Card className="data-table-card">
          <CardHeader>
            <CardTitle>Existing Lessons</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="loading-indicator">Loading lessons...</div>
            ) : lessons.length === 0 ? (
              <div className="empty-state">No lessons found. Add your first lesson above.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Week</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lessons.map((lesson) => (
                    <TableRow key={lesson.id}>
                      <TableCell>{lesson.id}</TableCell>
                      <TableCell>{lesson.lesson_name}</TableCell>
                      <TableCell>{lesson.course_name}</TableCell>
                      <TableCell>{lesson.week_name || `Week ${lesson.week_id}`}</TableCell>
                      <TableCell>{lesson.day_name || `Day ${lesson.day_id}`}</TableCell>
                      <TableCell>{new Date(lesson.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManageLessons; 