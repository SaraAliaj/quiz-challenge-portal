import React from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { cn } from '@/lib/utils';
import { Users, Crown, Circle } from 'lucide-react';
import './ActiveUsersSidebar.css';

interface ActiveUsersSidebarProps {
  collapsed?: boolean;
}

const ActiveUsersSidebar: React.FC<ActiveUsersSidebarProps> = ({ collapsed = false }) => {
  // Mock data for active users since we don't have a real connection
  const mockActiveUsers = [
    { id: '1', username: 'irida', role: 'lead_student', status: 'online' },
    { id: '2', username: 'john', role: 'student', status: 'online' },
    { id: '3', username: 'sarah', role: 'student', status: 'online' },
    { id: '4', username: 'michael', role: 'student', status: 'online' },
    { id: '5', username: 'emma', role: 'student', status: 'online' },
  ];
  
  // Use mock data instead of WebSocket context for demo purposes
  // const { activeUsers, isConnected } = useWebSocket();
  const activeUsers = mockActiveUsers;
  const isConnected = true;

  // Sort users by role (admin first, then lead students, then students)
  const sortedUsers = [...activeUsers].sort((a, b) => {
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (a.role !== 'admin' && b.role === 'admin') return 1;
    if (a.role === 'lead_student' && b.role === 'student') return -1;
    if (a.role === 'student' && b.role === 'lead_student') return 1;
    return a.username.localeCompare(b.username);
  });

  return (
    <div className={cn('active-users-sidebar', collapsed && 'collapsed')}>
      <div className="active-users-header">
        <Users size={collapsed ? 20 : 16} />
        {!collapsed && <span>Online Students</span>}
      </div>
      
      <div className="active-users-status">
        <div className={cn('status-indicator', isConnected ? 'connected' : 'disconnected')} />
        {!collapsed && <span>{isConnected ? 'Connected' : 'Disconnected'}</span>}
      </div>
      
      <div className="active-users-list">
        {sortedUsers.length === 0 ? (
          <div className="no-users">
            {!collapsed && <span>No active users</span>}
          </div>
        ) : (
          sortedUsers.map(user => (
            <div 
              key={user.id} 
              className={cn(
                'active-user-item',
                user.role === 'admin' && 'admin',
                user.role === 'lead_student' && 'lead-student'
              )}
              title={`${user.username} (${user.role.replace('_', ' ')})`}
            >
              <div className="user-avatar">
                {user.username.charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <div className="user-info">
                  <div className="user-name-row">
                    <span className="user-name">{user.username}</span>
                    {user.role === 'lead_student' && (
                      <Crown size={14} className="lead-icon" />
                    )}
                  </div>
                  <div className="user-status-row">
                    <Circle size={8} className="status-dot" />
                    <span className="user-role">{user.role.replace('_', ' ')}</span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActiveUsersSidebar; 