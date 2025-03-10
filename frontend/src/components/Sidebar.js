import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';
import { 
  BookOpen, 
  ChevronDown, 
  LogOut, 
  MessageSquare,
  Users
} from 'lucide-react';

const Sidebar = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [openCourses, setOpenCourses] = useState([]);
    const [openWeeks, setOpenWeeks] = useState([]);
    const { user, logout } = useAuth();
    const location = useLocation();

    const toggleSidebar = () => {
        setCollapsed(!collapsed);
        // Close curriculum menu when collapsing sidebar
        if (!collapsed) {
            setOpenCourses([]);
            setOpenWeeks([]);
        }
    };

    const toggleCourse = (courseId) => {
        setOpenCourses(prev => 
            prev.includes(courseId) 
                ? prev.filter(id => id !== courseId)
                : [...prev, courseId]
        );
    };

    const toggleWeek = (weekId) => {
        setOpenWeeks(prev => 
            prev.includes(weekId) 
                ? prev.filter(id => id !== weekId)
                : [...prev, weekId]
        );
    };

    const handleSignOut = () => {
        logout();
    };

    // Create SVG for logo - using the original brain icon
    const logoSvg = React.createElement('svg', 
        { viewBox: '0 0 24 24', width: '32', height: '32', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('path', { 
            d: 'M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.04Z' 
        }),
        React.createElement('path', { 
            d: 'M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.04Z' 
        })
    );

    // Create school name element
    const schoolName = !collapsed ? React.createElement('div', 
        { className: 'school-name' },
        React.createElement('h1', null, 'AI School'),
        React.createElement('p', null, 'Learn. Challenge. Grow.')
    ) : null;

    // Create user details element
    const userDetails = !collapsed ? React.createElement('div', 
        { className: 'user-details' },
        React.createElement('div', { className: 'user-name' }, user?.username || 'irida'),
        React.createElement('div', { className: 'user-email' }, user?.email || 'irida@test.com'),
        React.createElement('div', 
            { className: 'user-role' },
            React.createElement('span', { className: 'role-badge' }, 'Lead Student')
        )
    ) : null;

    // Create online students list
    const onlineStudentsList = !collapsed ? React.createElement('div', 
        { className: 'online-students-list' },
        React.createElement('div', 
            { className: 'online-student-item lead-student' },
            React.createElement('div', { className: 'student-dot' }),
            React.createElement('span', { className: 'crown-icon' }, '👑'),
            React.createElement('span', { className: 'student-name' }, 'irida lala (Lead Student)')
        )
    ) : null;

    // Create curriculum content
    const curriculumContent = (openCourses.includes('curriculum') || collapsed) ? 
        React.createElement('div', 
            { className: `curriculum-content ${openCourses.includes('curriculum') ? 'open' : ''}` },
            React.createElement('div', 
                { className: 'course-item' },
                React.createElement('div', 
                    { 
                        className: `course-header ${openCourses.includes('deep-learning') ? 'open' : ''}`,
                        onClick: () => toggleCourse('deep-learning')
                    },
                    !collapsed && React.createElement('span', { className: 'course-name' }, 'Deep Learning')
                ),
                openCourses.includes('deep-learning') && !collapsed && 
                    React.createElement('div', 
                        { className: 'course-content open' },
                        React.createElement('div', 
                            { className: 'week-item' },
                            React.createElement('div', 
                                { 
                                    className: `week-header ${openWeeks.includes('week-1') ? 'open' : ''}`,
                                    onClick: () => toggleWeek('week-1')
                                },
                                React.createElement('span', { className: 'week-name' }, 'Week 1'),
                                React.createElement(ChevronDown, { size: 14, className: 'dropdown-icon' })
                            ),
                            openWeeks.includes('week-1') && 
                                React.createElement('ul', 
                                    { className: 'lesson-list open' },
                                    React.createElement('li', 
                                        { className: 'lesson-item active' },
                                        React.createElement(Link, 
                                            { to: '/lesson/1', className: 'lesson-link' },
                                            React.createElement('span', { className: 'lesson-name' }, 'Monday: lesson'),
                                            React.createElement('span', { className: 'lesson-status' }, 'Active')
                                        )
                                    )
                                )
                        )
                    )
            )
        ) : null;

    return React.createElement('div', 
        { className: `sidebar ${collapsed ? 'collapsed' : ''}` },
        // Toggle button
        React.createElement('button', 
            { className: 'toggle-sidebar-btn', onClick: toggleSidebar },
            collapsed ? '→' : '←'
        ),
        
        // Logo and School Name
        React.createElement('div', 
            { className: 'school-logo' },
            React.createElement('div', { className: 'logo-icon' }, logoSvg),
            schoolName
        ),
        
        // User profile section
        React.createElement('div', 
            { className: 'user-profile' },
            user ? 
                React.createElement('div', 
                    { className: 'user-info' },
                    React.createElement('div', 
                        { className: 'user-avatar' },
                        user.username ? user.username.charAt(0).toUpperCase() : 'I'
                    ),
                    userDetails
                ) : 
                React.createElement('div', 
                    { className: 'user-info' },
                    React.createElement('div', { className: 'user-avatar' }, 'I'),
                    !collapsed && React.createElement('div', { className: 'user-details' }, 'Not logged in')
                )
        ),
        
        // Online Students Section
        React.createElement('div', 
            { className: 'online-students-section' },
            React.createElement('div', 
                { className: 'section-header' },
                React.createElement('div', 
                    { className: 'section-icon' },
                    React.createElement(Users, { size: 18 })
                ),
                !collapsed && React.createElement('span', null, 'Online Students'),
                !collapsed && React.createElement('span', { className: 'count-badge' }, '1')
            ),
            onlineStudentsList
        ),
        
        // AI Chat Section
        React.createElement('div', 
            { className: 'ai-chat-section' },
            React.createElement(Link, 
                { 
                    to: '/chat', 
                    className: `section-header ${location.pathname === '/chat' ? 'active' : ''}`
                },
                React.createElement('div', 
                    { className: 'section-icon' },
                    React.createElement(MessageSquare, { size: 18 })
                ),
                !collapsed && React.createElement('span', null, 'AI Chat')
            )
        ),
        
        // Curriculum Section
        React.createElement('div', 
            { className: 'curriculum-section' },
            React.createElement('div', 
                { 
                    className: `section-header ${openCourses.length > 0 ? 'open' : ''}`,
                    onClick: () => toggleCourse('curriculum')
                },
                React.createElement('div', 
                    { className: 'section-icon' },
                    React.createElement(BookOpen, { size: 18 })
                ),
                !collapsed && React.createElement(React.Fragment, null,
                    React.createElement('span', null, 'Curriculum'),
                    React.createElement(ChevronDown, { size: 16, className: 'dropdown-icon' })
                )
            ),
            curriculumContent
        ),
        
        // Sign Out Button
        React.createElement('div', 
            { className: 'sidebar-footer' },
            React.createElement('button', 
                { className: 'sign-out-btn', onClick: handleSignOut },
                React.createElement(LogOut, { size: 18 }),
                !collapsed && React.createElement('span', null, 'Sign Out')
            )
        )
    );
};

export default Sidebar;
