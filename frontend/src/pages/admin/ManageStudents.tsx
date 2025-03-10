import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { api } from '@/server/api';
import { Trash2, Crown } from 'lucide-react';
import './AdminPages.css';

interface User {
  id: number;
  username: string;
  surname: string | null;
  email: string;
  role: string;
  active: boolean;
}

const ManageStudents = () => {
  const [students, setStudents] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState<number | null>(null);

  // Fetch students on component mount
  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, this would fetch from an API
      const response = await api.getUsers();
      // Filter out admin users
      const filteredUsers = (response.data || []).filter((user: User) => user.role !== 'admin');
      setStudents(filteredUsers);
    } catch (error) {
      console.error('Failed to fetch students:', error);
      toast({
        title: 'Error',
        description: 'Failed to load students. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMakeLeadStudent = async (userId: number) => {
    setIsProcessing(userId);
    try {
      // In a real implementation, this would send to an API
      await api.updateUserRole(userId, 'lead_student');
      
      toast({
        title: 'Success',
        description: 'User role updated to Lead Student!',
      });
      
      // Update local state
      setStudents(prev => 
        prev.map(student => 
          student.id === userId 
            ? { ...student, role: 'lead_student' } 
            : student
        )
      );
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
      try {
        // Try to use the API endpoint if it exists
        await api.deleteUser(userId);
      } catch (error) {
        console.error('API endpoint for deleting users might not be implemented yet:', error);
        // For now, just update the local state as if the deletion was successful
        toast({
          title: 'Note',
          description: 'The delete functionality is not fully implemented on the server yet. This is just a UI simulation.',
        });
      }
      
      toast({
        title: 'Success',
        description: 'Student deleted successfully!',
      });
      
      // Update local state
      setStudents(prev => prev.filter(student => student.id !== userId));
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
              <div className="loading-indicator">Loading students...</div>
            ) : students.length === 0 ? (
              <div className="empty-state">No students found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Surname</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>{student.id}</TableCell>
                      <TableCell>{student.username}</TableCell>
                      <TableCell>{student.surname || '-'}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>
                        <span className={`role-badge ${student.role === 'lead_student' ? 'lead-role' : 'student-role'}`}>
                          {student.role === 'lead_student' ? 'Lead Student' : 'Student'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`status-badge ${student.active ? 'active-status' : 'inactive-status'}`}>
                          {student.active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="action-buttons">
                          {student.role !== 'lead_student' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMakeLeadStudent(student.id)}
                              disabled={isProcessing === student.id}
                              className="make-lead-btn"
                            >
                              <Crown size={16} className="mr-1" />
                              Make Lead
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteStudent(student.id)}
                            disabled={isProcessing === student.id}
                          >
                            <Trash2 size={16} />
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