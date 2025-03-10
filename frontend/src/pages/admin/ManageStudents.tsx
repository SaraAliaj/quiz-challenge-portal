import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { api } from '@/server/api';
import { Trash2, Crown, Loader2 } from 'lucide-react';
import './AdminPages.css';

interface User {
  id: number;
  username: string;
  surname: string;
  email: string;
  role: string;
}

const ManageStudents = () => {
  const [students, setStudents] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<number | null>(null);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const response = await api.getUsers();
      console.log('Users response:', response);
      
      // Handle different response formats
      let userData = [];
      
      if (response && response.data) {
        userData = Array.isArray(response.data) ? response.data : [];
      } else if (response && Array.isArray(response)) {
        userData = response;
      } else if (response && typeof response === 'object') {
        Object.keys(response).forEach(key => {
          if (Array.isArray(response[key])) {
            userData = response[key];
          }
        });
      }
      
      // Filter out admin users
      const filteredUsers = userData.filter((user: User) => user && user.role !== 'admin');
      
      console.log('Filtered users:', filteredUsers);
      setStudents(filteredUsers);
      
      if (filteredUsers.length === 0) {
        toast({
          title: 'No students found',
          description: 'No student accounts were found in the system.',
        });
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
      toast({
        title: 'Error',
        description: 'Failed to load students. Please try again.',
        variant: 'destructive',
      });
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch students on mount and after every successful action
  useEffect(() => {
    fetchStudents();
  }, []);

  const handleMakeLeadStudent = async (userId: number) => {
    setIsProcessing(userId);
    try {
      await api.updateUserRole(userId, 'lead_student');
      
      toast({
        title: 'Success',
        description: 'User role updated to Lead Student!',
      });
      
      // Refresh the student list
      await fetchStudents();
    } catch (error) {
      console.error('Failed to update user role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDeleteStudent = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this student?')) {
      return;
    }
    
    setIsProcessing(userId);
    try {
      await api.deleteUser(userId);
      
      toast({
        title: 'Success',
        description: 'Student deleted successfully!',
      });
      
      // Refresh the student list
      await fetchStudents();
    } catch (error) {
      console.error('Failed to delete student:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete student. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Manage Students</h1>
      
      <div className="admin-page-content">
        <Card className="data-table-card full-width">
          <CardHeader>
            <CardTitle>Students</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="loading-indicator">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mr-2" />
                Loading students...
              </div>
            ) : students.length === 0 ? (
              <div className="empty-state">
                No students found. Students will appear here once they register.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Surname</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>{student.username}</TableCell>
                      <TableCell>{student.surname || '-'}</TableCell>
                      <TableCell>
                        <span className={`role-badge ${student.role === 'lead_student' ? 'lead-role' : 'student-role'}`}>
                          {student.role === 'lead_student' ? 'Lead Student' : 'Student'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="action-buttons">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMakeLeadStudent(student.id)}
                            disabled={isProcessing === student.id || student.role === 'lead_student'}
                            className="make-lead-btn"
                          >
                            <Crown className="h-4 w-4 mr-2" />
                            Make Lead
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteStudent(student.id)}
                            disabled={isProcessing === student.id}
                            className="delete-btn"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
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

export default ManageStudents; 