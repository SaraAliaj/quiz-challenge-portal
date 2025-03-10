import React, { useEffect, useState } from 'react';
import { api, connectWebSocket } from '../server/api';

interface User {
  id: string;
  username: string;
  surname?: string;
  role: string;
  active: number; // Changed to number to match MySQL tinyint
}

const ActiveUsers: React.FC = () => {
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      setError('User ID not found. Please log in again.');
      return;
    }

    // Initial fetch of active users
    const fetchActiveUsers = async () => {
      try {
        setConnectionStatus('connecting');
        const users = await api.getActiveUsers();
        // Only show users with active = 1
        setActiveUsers(users.filter(user => user.active === 1));
        setError(null);
      } catch (error) {
        console.error('Failed to fetch active users:', error);
        setError('Failed to fetch active users. Please try again.');
      }
    };

    fetchActiveUsers();

    // Set up WebSocket connection for real-time updates
    connectWebSocket(userId, (users) => {
      // Only show users with active = 1
      setActiveUsers(users.filter(user => user.active === 1));
      setConnectionStatus('connected');
      setError(null);
    });

    // Update user's active status to 1
    api.updateActiveStatus(true).catch(error => {
      console.error('Failed to update active status:', error);
      setError('Failed to update active status.');
    });

    // Cleanup on unmount - set active status to 0
    return () => {
      api.updateActiveStatus(false).catch(console.error);
    };
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Active Students</h2>
        <div className="flex items-center space-x-2">
          <div 
            className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' :
              connectionStatus === 'connecting' ? 'bg-yellow-500' :
              'bg-red-500'
            }`} 
          />
          <span className="text-sm text-gray-500">
            {connectionStatus === 'connected' ? 'Connected' :
             connectionStatus === 'connecting' ? 'Connecting...' :
             'Disconnected'}
          </span>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-2 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {activeUsers.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md"
          >
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="font-medium">
                {user.username} {user.surname}
              </span>
              {user.role === 'lead_student' && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                  Lead
                </span>
              )}
            </div>
          </div>
        ))}
        {activeUsers.length === 0 && !error && (
          <p className="text-gray-500 text-sm">No active students</p>
        )}
      </div>
    </div>
  );
};

export default ActiveUsers; 