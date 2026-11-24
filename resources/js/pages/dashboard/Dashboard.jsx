
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import '../../layouts/dashboard.css';

const emptyStats = {
    students: { total: 0, active: 0 },
    classes: { total: 0, active: 0 },
    subjects: { total: 0, active: 0 },
    results: { total: 0, published: 0, approved: 0, draft: 0 },
};

const summaryCards = [
    {
        key: 'students',
        title: 'Total Students',
        description: 'Registered student records',
        icon: '♙',
        color: 'blue',
        getValue: (stats) => stats.students.total,
        getFootnote: (stats) => `${stats.students.active} active students`,
        path: '/students',
    },
    {
        key: 'classes',
        title: 'Total Classes',
        description: 'School classes and groups',
        icon: '▦',
        color: 'green',
        getValue: (stats) => stats.classes.total,
        getFootnote: (stats) => `${stats.classes.active} active classes`,
        path: '/classes',
    },
    {
        key: 'subjects',
        title: 'Total Subjects',
        description: 'Available academic subjects',
        icon: '▤',
        color: 'purple',
        getValue: (stats) => stats.subjects.total,
        getFootnote: (stats) => `${stats.subjects.active} active subjects`,
        path: '/subjects',
    },
    {
        key: 'results',
        title: 'Processed Results',
        description: 'All student result records',
        icon: '▣',
        color: 'orange',
        getValue: (stats) => stats.results.total,
        getFootnote: (stats) => `${stats.results.published} published results`,
        path: '/results',
    },
];

function formatNumber(value) {
    return new Intl.NumberFormat().format(Number(value) || 0);
}

function getGreeting() {
    const hour = new Date().getHours();

    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

function getDisplayDate() {
    return new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date());
}

export default function Dashboard() {
    const { user } = useAuth();

    const [stats, setStats] = useState(emptyStats);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const loadStatistics = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        setError('');

        try {
            const response = await apiClient.get('/dashboard/statistics');
            const payload = response.data?.data;

            if (!response.data?.success || !payload) {
                throw new Error(
                    response.data?.message || 'The dashboard returned an unexpected response.'
                );
            }

            setStats({
                students: {
                    total: Number(payload.students?.total ?? 0),
                    active: Number(payload.students?.active ?? 0),
                },
                classes: {
                    total: Number(payload.classes?.total ?? 0),
                    active: Number(payload.classes?.active ?? 0),
                },
                subjects: {
                    total: Number(payload.subjects?.total ?? 0),
                    active: Number(payload.subjects?.active ?? 0),
                },
                results: {
                    total: Number(payload.results?.total ?? 0),
                    published: Number(payload.results?.published ?? 0),
                    approved: Number(payload.results?.approved ?? 0),
                    draft: Number(payload.results?.draft ?? 0),
                },
            });
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                'Unable to load dashboard statistics. Please try again.'
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadStatistics();
    }, [loadStatistics]);

    const name = user?.name?.trim()?.split(/\s+/)[0] || 'Administrator';

    return (
        <div className="dashboard-page">
            <section className="dashboard-welcome">
                <div className="welcome-copy">
                    <div className="eyebrow">
                        <span className="eyebrow-line" />
                        SCHOOL MANAGEMENT OVERVIEW
                    </div>

                    <h1>
                        {getGreeting()}, {name}
                        <span className="welcome-wave">.</span>
                    </h1>

                    <p>
                        Welcome to your school dashboard. Here’s an overview
                        of your academic records and result processing activities.
                    </p>

                    <div className="welcome-meta">
                        <span className="welcome-date-icon">▦</span>
                        <span>{getDisplayDate()}</span>
                        <span className="meta-separator">•</span>
                        <span className="welcome-online">
                            <span className="status-dot" />
                            Portal active
                        </span>
                    </div>
                </div>

                <div className="welcome-art" aria-hidden="true">
                    <div className="art-circle art-circle-one" />
                    <div className="art-circle art-circle-two" />
                    <div className="art-grid" />

                    <div className="art-card">
                        <div className="art-card-top">
                            <span className="art-mini-logo">E</span>
                            <span className="art-card-label">ACADEMIC PORTAL</span>
                            <span className="art-card-dot" />
                        </div>

                        <div className="art-book">
                            <div className="book-cover">
                                <span className="book-emblem">✦</span>
                                <span className="book-line" />
                                <span className="book-line short" />
                            </div>
                            <div className="book-pages" />
                        </div>

                        <div className="art-card-bottom">
                            <div>
                                <span>Learning</span>
                                <strong>Organised.</strong>
                            </div>
                            <div className="art-check">✓</div>
                        </div>
                    </div>

                    <div className="art-floating art-floating-top">
                        <span>✓</span>
                        Academic records
                    </div>

                    <div className="art-floating art-floating-bottom">
                        <span className="art-live-dot" />
                        Result management
                    </div>
                </div>
            </section>

            {error && (
                <div className="dashboard-alert" role="alert">
                    <span className="alert-icon">!</span>
                    <div>
                        <strong>Statistics could not be loaded</strong>
                        <p>{error}</p>
                    </div>
                    <button
                        type="button"
                        className="alert-retry"
                        onClick={() => loadStatistics(true)}
                        disabled={refreshing}
                    >
                        Try again
                    </button>
                </div>
            )}

            <section className="dashboard-section">
                <div className="section-heading">
                    <div>
                        <span className="section-kicker">AT A GLANCE</span>
                        <h2>School overview</h2>
                        <p>Key figures from your school records.</p>
                    </div>

                    <button
                        type="button"
                        className="refresh-button"
                        onClick={() => loadStatistics(true)}
                        disabled={loading || refreshing}
                    >
                        <span className={refreshing ? 'refresh-symbol spinning' : 'refresh-symbol'}>
                            ↻
                        </span>
                        {refreshing ? 'Refreshing...' : 'Refresh data'}
                    </button>
                </div>

                <div className="stats-grid">
                    {summaryCards.map((card) => (
                        <Link
                            key={card.key}
                            to={card.path}
                            className="stat-card"
                        >
                            <div className="stat-card-top">
                                <div className={`stat-icon stat-icon-${card.color}`}>
                                    <span>{card.icon}</span>
                                </div>
                                <span className="stat-card-arrow">↗</span>
                            </div>

                            <div className="stat-card-title">{card.title}</div>

                            <div className="stat-value">
                                {loading ? (
                                    <span className="number-skeleton" />
                                ) : (
                                    formatNumber(card.getValue(stats))
                                )}
                            </div>

                            <div className="stat-description">
                                {card.description}
                            </div>

                            <div className="stat-card-footer">
                                <span className={`stat-footer-dot ${card.color}`} />
                                {loading ? 'Loading records...' : card.getFootnote(stats)}
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            <section className="dashboard-lower-grid">
                <div className="dashboard-panel workflow-panel">
                    <div className="panel-heading">
                        <div>
                            <span className="section-kicker">RESULTS</span>
                            <h2>Result workflow</h2>
                        </div>
                        <span className="panel-heading-icon">▣</span>
                    </div>

                    <p className="panel-description">
                        Track results through the review and publication process.
                    </p>

                    <div className="workflow-total">
                        <div>
                            <span>Total result records</span>
                            <strong>
                                {loading ? '—' : formatNumber(stats.results.total)}
                            </strong>
                        </div>
                        <span className="workflow-total-icon">✓</span>
                    </div>

                    <div className="workflow-list">
                        <div className="workflow-item">
                            <div className="workflow-item-label">
                                <span className="workflow-dot draft" />
                                <span>Draft</span>
                            </div>
                            <strong>{loading ? '—' : formatNumber(stats.results.draft)}</strong>
                        </div>

                        <div className="workflow-track">
                            <span
                                className="workflow-fill draft-fill"
                                style={{
                                    width: stats.results.total
                                        ? `${Math.min(100, stats.results.draft / stats.results.total * 100)}%`
                                        : '0%',
                                }}
                            />
                        </div>

                        <div className="workflow-item">
                            <div className="workflow-item-label">
                                <span className="workflow-dot approved" />
                                <span>Approved</span>
                            </div>
                            <strong>{loading ? '—' : formatNumber(stats.results.approved)}</strong>
                        </div>

                        <div className="workflow-track">
                            <span
                                className="workflow-fill approved-fill"
                                style={{
                                    width: stats.results.total
                                        ? `${Math.min(100, stats.results.approved / stats.results.total * 100)}%`
                                        : '0%',
                                }}
                            />
                        </div>

                        <div className="workflow-item">
                            <div className="workflow-item-label">
                                <span className="workflow-dot published" />
                                <span>Published</span>
                            </div>
                            <strong>{loading ? '—' : formatNumber(stats.results.published)}</strong>
                        </div>

                        <div className="workflow-track">
                            <span
                                className="workflow-fill published-fill"
                                style={{
                                    width: stats.results.total
                                        ? `${Math.min(100, stats.results.published / stats.results.total * 100)}%`
                                        : '0%',
                                }}
                            />
                        </div>
                    </div>

                    <Link to="/results" className="panel-link">
                        Open result management <span>→</span>
                    </Link>
                </div>

                <div className="dashboard-panel quick-actions-panel">
                    <div className="panel-heading">
                        <div>
                            <span className="section-kicker">SHORTCUTS</span>
                            <h2>Quick access</h2>
                        </div>
                        <span className="panel-heading-icon green-panel-icon">↗</span>
                    </div>

                    <p className="panel-description">
                        Navigate directly to common school management tasks.
                    </p>

                    <div className="quick-action-list">
                        <Link to="/students" className="quick-action">
                            <span className="quick-action-icon action-blue">♙</span>
                            <span className="quick-action-copy">
                                <strong>Student records</strong>
                                <small>View and manage students</small>
                            </span>
                            <span className="quick-action-arrow">→</span>
                        </Link>

                        <Link to="/classes" className="quick-action">
                            <span className="quick-action-icon action-green">▦</span>
                            <span className="quick-action-copy">
                                <strong>Class management</strong>
                                <small>Manage classes and groups</small>
                            </span>
                            <span className="quick-action-arrow">→</span>
                        </Link>

                        <Link to="/subjects" className="quick-action">
                            <span className="quick-action-icon action-purple">▤</span>
                            <span className="quick-action-copy">
                                <strong>Academic subjects</strong>
                                <small>Review available subjects</small>
                            </span>
                            <span className="quick-action-arrow">→</span>
                        </Link>

                        <Link to="/results" className="quick-action">
                            <span className="quick-action-icon action-orange">▣</span>
                            <span className="quick-action-copy">
                                <strong>Process results</strong>
                                <small>Review student performance</small>
                            </span>
                            <span className="quick-action-arrow">→</span>
                        </Link>
                    </div>
                </div>
            </section>

            <section className="dashboard-note">
                <div className="note-icon">i</div>
                <div>
                    <strong>Keep academic records up to date</strong>
                    <p>
                        Ensure student enrolments, assessment scores, and result
                        approvals are completed before publishing term results.
                    </p>
                </div>
            </section>
        </div>
    );
}
