import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { api } from '@/server/api';
import './AdminPages.css';

interface Course {
  id: number;
  name: string;
  created_at: string;
}

const ManageCourses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [newCourseName, setNewCourseName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch courses on component mount
  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, this would fetch from an API
      const response = await api.getCourses();
      setCourses(response.data || []);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load courses. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCourseName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a course name.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // In a real implementation, this would send to an API
      await api.addCourse({ name: newCourseName });
      
      toast({
        title: 'Success',
        description: 'Course added successfully!',
      });
      
      // Reset form and refresh courses
      setNewCourseName('');
      fetchCourses();
    } catch (error) {
      console.error('Failed to add course:', error);
      toast({
        title: 'Error',
        description: 'Failed to add course. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Manage Courses</h1>
      
      <div className="admin-page-content">
        <Card className="add-form-card">
          <CardHeader>
            <CardTitle>Add New Course</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddCourse} className="add-form">
              <div className="form-group">
                <label htmlFor="courseName">Course Name</label>
                <Input
                  id="courseName"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  placeholder="Enter course name"
                  disabled={isSubmitting}
                />
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Course'}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <Card className="data-table-card">
          <CardHeader>
            <CardTitle>Existing Courses</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="loading-indicator">Loading courses...</div>
            ) : courses.length === 0 ? (
              <div className="empty-state">No courses found. Add your first course above.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>{course.id}</TableCell>
                      <TableCell>{course.name}</TableCell>
                      <TableCell>{new Date(course.created_at).toLocaleString()}</TableCell>
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

export default ManageCourses; 