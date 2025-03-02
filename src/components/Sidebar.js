import React, { useState } from 'react';

const Sidebar = () => {
    const [collapsed, setCollapsed] = useState(false);

    const toggleSidebar = () => {
        setCollapsed(!collapsed);
    };

    return (
        <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            <button className="toggle-btn" onClick={toggleSidebar}>
                {collapsed ? 'Expand' : 'Collapse'}
            </button>
            <ul>
                <li>
                    <i className="icon-home"></i>
                    {!collapsed && <span>Home</span>}
                </li>
                <li>
                    <i className="icon-settings"></i>
                    {!collapsed && <span>Settings</span>}
                </li>
            </ul>
        </div>
    );
};

export default Sidebar;
