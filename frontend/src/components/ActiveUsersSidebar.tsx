import React from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';
import './ActiveUsersSidebar.css';

interface ActiveUsersSidebarProps {
  collapsed?: boolean;
}

const ActiveUsersSidebar: React.FC<ActiveUsersSidebarProps> = ({ collapsed = false }) => {
  const { activeUsers, isConnected } = useWebSocket();

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
        {!collapsed && <span>Active Users</span>}
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
              title={`${user.username} (${user.role})`}
            >
              <div className="user-avatar">
                {user.username.charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <div className="user-info">
                  <span className="user-name">{user.username}</span>
                  <span className="user-role">{user.role.replace('_', ' ')}</span>
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