import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import ActiveUsers from './ActiveUsers';

interface SidebarProps {
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const location = useLocation();

  return (
    <div
      className={`fixed top-16 left-0 h-full w-64 bg-gray-800 text-white transition-transform duration-300 ease-in-out transform ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <nav className="mt-8 flex flex-col h-full">
        <div className="flex-1">
          <Link
            to="/"
            className={`block px-4 py-2 hover:bg-gray-700 ${
              location.pathname === '/' ? 'bg-gray-700' : ''
            }`}
          >
            Dashboard
          </Link>
          <Link
            to="/lessons"
            className={`block px-4 py-2 hover:bg-gray-700 ${
              location.pathname === '/lessons' ? 'bg-gray-700' : ''
            }`}
          >
            Lessons
          </Link>
          <Link
            to="/chat"
            className={`block px-4 py-2 hover:bg-gray-700 ${
              location.pathname === '/chat' ? 'bg-gray-700' : ''
            }`}
          >
            Chat
          </Link>
        </div>
        
        {/* Active Users Section */}
        <div className="p-4">
          <ActiveUsers />
        </div>
      </nav>
    </div>
  );
};

export default Sidebar; 