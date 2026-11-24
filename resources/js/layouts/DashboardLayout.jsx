import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import './dashboard.css';

const staffNavigation = [
    {
        section: 'OVERVIEW',
        items: [
            { label: 'Dashboard', path: '/dashboard', icon: 'fa-chart-pie' },
        ],
    },
    {
        section: 'ACADEMIC MANAGEMENT',
        items: [
            { label: 'Students', path: '/students', icon: 'fa-user-graduate' },
            { label: 'Classes', path: '/classes', icon: 'fa-school' },
            { label: 'Subjects', path: '/subjects', icon: 'fa-book' },
            { label: 'Teachers', path: '/teachers', icon: 'fa-chalkboard-teacher' },
            { label: 'Assessments', path: '/assessments', icon: 'fa-clipboard-check' },
        ],
    },
    {
        section: 'RESULT MANAGEMENT',
        items: [
            { label: 'Score Entry', path: '/scores', icon: 'fa-edit' },
            { label: 'Results', path: '/results', icon: 'fa-poll' },
            { label: 'Academic Sessions', path: '/academic-sessions', icon: 'fa-calendar-alt' },
        ],
    },
    {
        section: 'SYSTEM',
        items: [
            { label: 'Settings', path: '/settings', icon: 'fa-cog' },
        ],
    },
];

const teacherNavigation = [
    {
        section: 'TEACHER PORTAL',
        items: [
            { label: 'My Dashboard', path: '/teacher', icon: 'fa-chart-pie' },
            { label: 'Score Entry', path: '/scores', icon: 'fa-edit' },
        ],
    },
];

const parentNavigation = [
    {
        section: 'PARENT PORTAL',
        items: [
            { label: 'My Children & Results', path: '/parent', icon: 'fa-user-friends' },
        ],
    },
];

const studentNavigation = [
    {
        section: 'STUDENT PORTAL',
        items: [
            { label: 'My Dashboard', path: '/student', icon: 'fa-chart-pie' },
        ],
    },
];

function getRoleName(role) {
    return typeof role === 'string' ? role : role?.name || '';
}

function hasRole(user, roleName) {
    return (user?.roles || []).some(
        (role) => getRoleName(role).toLowerCase() === roleName.toLowerCase()
    );
}

function getInitials(name = 'User') {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');
}

export default function DashboardLayout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const isParent = hasRole(user, 'Parent');
    const isTeacher = hasRole(user, 'Teacher');
    const isStudent = hasRole(user, 'Student');

    const navigation = isStudent
        ? studentNavigation
        : isParent
            ? parentNavigation
            : isTeacher
                ? teacherNavigation
                : staffNavigation;

    const name = user?.name || 'User';
    const initials = getInitials(name);

    const currentPage = navigation
        .flatMap((group) => group.items)
        .find((item) => location.pathname === item.path);

    const pageTitle = currentPage?.label || 'School Management';

    const roleLabel = (user?.roles || [])
        .map(getRoleName)
        .filter(Boolean)[0] || 'User';

    const handleLogout = async () => {
        setProfileOpen(false);
        setSidebarOpen(false);

        try {
            await logout();
        } finally {
            navigate('/login', { replace: true });
        }
    };

    return (
        <div className="school-app">
            {sidebarOpen && (
                <button
                    type="button"
                    className="sidebar-backdrop"
                    aria-label="Close navigation menu"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <aside
                className={`school-sidebar ${
                    sidebarOpen ? 'sidebar-open' : ''
                }`}
            >
                <div className="sidebar-brand">
                    <div className="brand-logo" aria-hidden="true">
                        <svg viewBox="0 0 48 48" fill="none">
                            <path
                                d="M5 17.5 24 8l19 9.5L24 27 5 17.5Z"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M12 22v10c7 6 17 6 24 0V22M43 18v14"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                            />
                            <path
                                d="M18 36h12"
                                stroke="#6FE0A0"
                                strokeWidth="3"
                                strokeLinecap="round"
                            />
                        </svg>
                    </div>

                    <div className="brand-copy">
                        <span className="brand-name">School Result Portal</span>
                        <span className="brand-caption">SCHOOL MANAGEMENT</span>
                    </div>

                    <button
                        type="button"
                        className="sidebar-close"
                        aria-label="Close sidebar"
                        onClick={() => setSidebarOpen(false)}
                    >
                        ×
                    </button>
                </div>

                <div className="school-identity">
                    <div className="school-identity-icon">
                        {isStudent
                            ? 'ST'
                            : isParent
                                ? 'PR'
                                : isTeacher
                                    ? 'TC'
                                    : 'ED'}
                    </div>

                    <div className="school-identity-copy">
                        <strong>
                            {isStudent
                                ? 'Student Portal'
                                : isParent
                                    ? 'Parent Portal'
                                    : isTeacher
                                        ? 'Teacher Portal'
                                        : 'School Administration'}
                        </strong>
                        <span>
                            {isStudent
                                ? 'Academic workspace'
                                : isParent
                                    ? 'Family access'
                                    : isTeacher
                                        ? 'Teaching workspace'
                                        : 'Management portal'}
                        </span>
                    </div>

                    <span className="online-indicator" title="System active" />
                </div>

                <nav
                    className="sidebar-navigation"
                    aria-label="Main navigation"
                >
                    {navigation.map((group) => (
                        <div className="nav-group" key={group.section}>
                            <div className="nav-section-title">
                                {group.section}
                            </div>

                            {group.items.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end
                                    onClick={() => setSidebarOpen(false)}
                                    className={({ isActive }) =>
                                        `sidebar-link ${isActive ? 'active' : ''}`
                                    }
                                >
                                    <span className="sidebar-link-icon" aria-hidden="true">
                                        <i className={`fas ${item.icon}`}></i>
                                    </span>
                                    <span>{item.label}</span>
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-bottom">
                    <div className="sidebar-help">
                        <div className="help-icon">?</div>
                        <div>
                            <strong>Need assistance?</strong>
                            <span>Contact your school administrator.</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="sidebar-logout"
                        onClick={handleLogout}
                    >
                        <span aria-hidden="true">
                            <i className="fas fa-sign-out-alt"></i>
                        </span>
                        Sign out
                    </button>

                    <div className="sidebar-version">
                        <span className="version-dot" />
                        Result Processing System
                    </div>
                </div>
            </aside>

            <div className="school-main">
                <header className="school-topbar">
                    <div className="topbar-left">
                        <button
                            type="button"
                            className="mobile-menu-button"
                            aria-label="Open navigation menu"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <span />
                            <span />
                            <span />
                        </button>

                        <div className="breadcrumb">
                            <span>School Portal</span>
                            <span className="breadcrumb-separator">/</span>
                            <strong>{pageTitle}</strong>
                        </div>
                    </div>

                    <div className="topbar-actions">
                        <div className="system-status">
                            <span className="status-dot" />
                            <span>System Online</span>
                        </div>

                        <div className="topbar-divider" />

                        <div className="profile-wrapper">
                            <button
                                type="button"
                                className="profile-button"
                                aria-expanded={profileOpen}
                                onClick={() => setProfileOpen((open) => !open)}
                            >
                                <span className="profile-avatar">{initials}</span>

                                <span className="profile-copy">
                                    <strong>{name}</strong>
                                    <span>{roleLabel}</span>
                                </span>

                                <span className="profile-chevron">
                                    <i className="fas fa-chevron-down"></i>
                                </span>
                            </button>

                            {profileOpen && (
                                <>
                                    <button
                                        type="button"
                                        className="dropdown-dismiss"
                                        aria-label="Close profile menu"
                                        onClick={() => setProfileOpen(false)}
                                    />

                                    <div className="profile-dropdown">
                                        <div className="dropdown-user">
                                            <strong>{name}</strong>
                                            <span>{user?.email || ''}</span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                        >
                                            <i className="fas fa-sign-out-alt"></i>
                                            Sign out
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                <main className="school-content">
                    {children ?? <Outlet />}
                </main>

                <footer className="school-footer">
                    <span>
                        © {new Date().getFullYear()} School Result Portal
                    </span>
                    <span>Secondary School Result Processing System</span>
                </footer>
            </div>
        </div>
    );
}
