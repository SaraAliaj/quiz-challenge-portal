import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';
import { 
  BookOpen, 
  ChevronDown, 
  LogOut, 
  MessageSquare,
  Users,
  ChevronRight,
  Settings,
  BookOpen as Book,
  UserCog
} from 'lucide-react';

const Sidebar = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [openCourses, setOpenCourses] = useState(['curriculum']);
    const [openWeeks, setOpenWeeks] = useState(['week-1']);
    const [openAdminPanel, setOpenAdminPanel] = useState(false);
    const { user, logout } = useAuth();
    const location = useLocation();
    const isAdmin = user?.role === 'admin';

    const toggleSidebar = () => {
        setCollapsed(!collapsed);
        // Close curriculum menu when collapsing sidebar
        if (!collapsed) {
            setOpenCourses([]);
            setOpenWeeks([]);
            setOpenAdminPanel(false);
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

    const toggleAdminPanel = () => {
        setOpenAdminPanel(!openAdminPanel);
    };

    const handleSignOut = () => {
        logout();
    };

    // Create AI School logo SVG
    const logoSvg = React.createElement('svg', 
        { 
            width: "32", 
            height: "32", 
            viewBox: "0 0 24 24", 
            fill: "none", 
            stroke: "currentColor", 
            strokeWidth: "2", 
            strokeLinecap: "round", 
            strokeLinejoin: "round" 
        },
        React.createElement('path', { 
            d: "M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.04Z" 
        }),
        React.createElement('path', { 
            d: "M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.04Z" 
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
            React.createElement('span', { className: 'role-badge' }, 
                user?.role === 'admin' ? 'Admin' : 
                user?.role === 'lead_student' ? 'Lead Student' : 'Student'
            )
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

    // Create Deep Learning submenu
    const deepLearningSubmenu = openCourses.includes('deep-learning') ? 
        React.createElement('div', 
            { className: 'submenu' },
            React.createElement('div', 
                { 
                    className: `submenu-item ${openWeeks.includes('week-1') ? 'open' : ''}`,
                    onClick: () => toggleWeek('week-1')
                },
                React.createElement('div', { className: 'submenu-header' },
                    React.createElement('span', null, 'Week 1'),
                    React.createElement(ChevronDown, { size: 14, className: 'dropdown-icon' })
                ),
                openWeeks.includes('week-1') ? 
                    React.createElement('div', { className: 'submenu-content' },
                        React.createElement('div', 
                            { 
                                className: 'lesson-item active',
                                onClick: () => console.log('Lesson clicked')
                            },
                            React.createElement('span', null, 'Monday: lesson'),
                            React.createElement('span', { className: 'active-indicator' }, 'Active')
                        )
                    ) : null
            )
        ) : null;

    // Create curriculum submenu
    const curriculumSubmenu = openCourses.includes('curriculum') ? 
        React.createElement('div', 
            { className: 'submenu' },
            React.createElement('div', 
                { 
                    className: `submenu-item ${openCourses.includes('deep-learning') ? 'open' : ''}`,
                    onClick: () => toggleCourse('deep-learning')
                },
                React.createElement('div', { className: 'submenu-header' },
                    React.createElement('span', null, 'Deep Learning'),
                    React.createElement(ChevronDown, { size: 14, className: 'dropdown-icon' })
                ),
                deepLearningSubmenu
            )
        ) : null;

    // Create admin panel submenu
    const adminPanelSubmenu = openAdminPanel ? 
        React.createElement('div', 
            { className: 'submenu' },
            React.createElement(Link, 
                { 
                    to: '/admin/courses',
                    className: 'admin-menu-item'
                },
                React.createElement(Book, { size: 16, className: 'admin-menu-icon' }),
                React.createElement('span', null, 'Manage Courses')
            ),
            React.createElement(Link, 
                { 
                    to: '/admin/lessons',
                    className: 'admin-menu-item'
                },
                React.createElement(BookOpen, { size: 16, className: 'admin-menu-icon' }),
                React.createElement('span', null, 'Manage Lessons')
            ),
            React.createElement(Link, 
                { 
                    to: '/admin/students',
                    className: 'admin-menu-item'
                },
                React.createElement(UserCog, { size: 16, className: 'admin-menu-icon' }),
                React.createElement('span', null, 'Manage Students')
            )
        ) : null;

    return React.createElement('div', 
        { className: `sidebar ${collapsed ? 'collapsed' : ''}` },
        // Toggle button
        React.createElement('button', 
            { className: 'toggle-sidebar-btn', onClick: toggleSidebar },
            React.createElement(ChevronRight, { size: 16 })
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
            React.createElement('div', 
                { className: 'user-avatar' },
                'I'
            ),
            userDetails
        ),
        
        // Online Students Section
        React.createElement('div', 
            { className: 'sidebar-section' },
            React.createElement('div', 
                { className: 'section-header' },
                React.createElement(Users, { size: 18, className: 'section-icon' }),
                !collapsed && React.createElement('span', null, 'Online Students'),
                !collapsed && React.createElement('span', { className: 'count-badge' }, '1')
            ),
            onlineStudentsList
        ),
        
        // AI Chat Section
        React.createElement('div', 
            { className: 'sidebar-section' },
            React.createElement(Link, 
                { 
                    to: '/chat', 
                    className: 'section-header'
                },
                React.createElement(MessageSquare, { size: 18, className: 'section-icon' }),
                !collapsed && React.createElement('span', null, 'AI Chat')
            )
        ),
        
        // Curriculum Section
        React.createElement('div', 
            { className: 'sidebar-section' },
            React.createElement('div', 
                { 
                    className: `section-header ${openCourses.includes('curriculum') ? 'open' : ''}`,
                    onClick: () => toggleCourse('curriculum')
                },
                React.createElement(BookOpen, { size: 18, className: 'section-icon' }),
                !collapsed && React.createElement('span', null, 'Curriculum'),
                !collapsed && React.createElement(ChevronDown, { 
                    size: 14, 
                    className: `dropdown-icon ${openCourses.includes('curriculum') ? 'open' : ''}` 
                })
            ),
            !collapsed && curriculumSubmenu
        ),
        
        // Admin Panel Section (only visible to admins)
        isAdmin && React.createElement('div', 
            { className: 'sidebar-section' },
            React.createElement('div', 
                { 
                    className: `section-header ${openAdminPanel ? 'open' : ''}`,
                    onClick: toggleAdminPanel
                },
                React.createElement(Settings, { size: 18, className: 'section-icon' }),
                !collapsed && React.createElement('span', null, 'Admin Panel'),
                !collapsed && React.createElement(ChevronDown, { 
                    size: 14, 
                    className: `dropdown-icon ${openAdminPanel ? 'open' : ''}` 
                })
            ),
            !collapsed && adminPanelSubmenu
        ),
        
        // Sign Out Button
        React.createElement('div', 
            { className: 'sidebar-footer' },
            React.createElement('button', 
                { className: 'sign-out-btn', onClick: handleSignOut },
                React.createElement(LogOut, { size: 18, className: 'sign-out-icon' }),
                !collapsed && React.createElement('span', null, 'Sign Out')
            )
        )
    );
};

export default Sidebar;
