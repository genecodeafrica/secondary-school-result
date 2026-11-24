
import React, { useCallback, useEffect, useState } from 'react';
import apiClient from '../../api/client';
import './ParentDashboard.css';

function formatNumber(value, decimals = 2) {
    const number = Number(value ?? 0);
    return Number.isFinite(number) ? number.toFixed(decimals) : '0.00';
}

function getClassName(enrollment) {
    const schoolClass = enrollment?.school_class || {};
    const name = schoolClass.name || schoolClass.class_name || 'Class not assigned';
    const section = schoolClass.section || '';

    return section ? `${name} ${section}` : name;
}

function ResultCard({ child, result, onDownload }) {
    const [expanded, setExpanded] = useState(false);

    const details = result.details || [];

    return (
        <div className="parent-result-card">
            <div className="parent-result-top">
                <div>
                    <span className="parent-result-label">PUBLISHED RESULT</span>
                    <h4>
                        {result.term?.name || 'Academic Term'}
                    </h4>
                    <p>
                        {result.academic_session?.name || 'Academic Session'}
                        {' · '}
                        {result.school_class?.name || 'Class'}
                    </p>
                </div>

                <span className="parent-grade">
                    {result.overall_grade || 'N/A'}
                </span>
            </div>

            <div className="parent-result-stats">
                <div>
                    <span>Average</span>
                    <strong>{formatNumber(result.average)}%</strong>
                </div>
                <div>
                    <span>Total score</span>
                    <strong>{formatNumber(result.total_score)}</strong>
                </div>
                <div>
                    <span>Position</span>
                    <strong>{result.position || 'N/A'}</strong>
                </div>
            </div>

            {result.overall_remark && (
                <div className="parent-result-remark">
                    <i className="fas fa-comment-alt"></i>
                    {result.overall_remark}
                </div>
            )}

            <div className="parent-result-actions">
                <button
                    type="button"
                    className="parent-details-button"
                    onClick={() => setExpanded((value) => !value)}
                >
                    <i className={`fas ${expanded ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                    {expanded ? 'Hide subject details' : `View subject details (${details.length})`}
                </button>

                <button
                    type="button"
                    className="parent-download-button"
                    onClick={() => onDownload(child, result)}
                >
                    <i className="fas fa-file-pdf"></i>
                    Download PDF
                </button>
            </div>

            {expanded && (
                <div className="parent-subject-table-wrapper">
                    {details.length > 0 ? (
                        <table className="parent-subject-table">
                            <thead>
                                <tr>
                                    <th>Subject</th>
                                    <th>Total</th>
                                    <th>Grade</th>
                                    <th>Remark</th>
                                </tr>
                            </thead>
                            <tbody>
                                {details.map((detail, index) => (
                                    <tr key={detail.id || index}>
                                        <td>{detail.subject?.name || 'Subject'}</td>
                                        <td>{formatNumber(detail.total_score)}</td>
                                        <td>
                                            <span className="parent-subject-grade">
                                                {detail.grade || 'N/A'}
                                            </span>
                                        </td>
                                        <td>{detail.remark || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="parent-empty-subjects">
                            No subject details are available for this result.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

export default function ParentDashboard() {
    const [portal, setPortal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [downloading, setDownloading] = useState(null);

    const loadPortal = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const response = await apiClient.get('/parent/portal');
            setPortal(response.data?.data || null);
        } catch (err) {
            console.error('Parent portal error:', err);
            setError(
                err.response?.data?.message ||
                'Unable to load your parent dashboard. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPortal();
    }, [loadPortal]);

    const downloadReport = async (child, result) => {
        if (downloading) return;

        setDownloading(result.id);

        try {
            const response = await apiClient.get(
                `/results/${result.id}/report-card`,
                { responseType: 'blob' }
            );

            const blob = new Blob([response.data], {
                type: 'application/pdf',
            });

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download =
                `${child.first_name || 'Student'}-${child.last_name || ''}-Report-Card.pdf`;

            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Report card download error:', err);
            alert('Unable to download the report card. Please try again.');
        } finally {
            setDownloading(null);
        }
    };

    if (loading) {
        return (
            <div className="parent-loading">
                <span className="parent-loader"></span>
                <p>Loading your parent dashboard...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="parent-error">
                <i className="fas fa-exclamation-circle"></i>
                <h3>Unable to load dashboard</h3>
                <p>{error}</p>
                <button type="button" onClick={loadPortal}>
                    Try again
                </button>
            </div>
        );
    }

    if (!portal) {
        return <div className="parent-empty">No parent information was found.</div>;
    }

    const parent = portal.parent || {};
    const summary = portal.summary || {};
    const children = portal.children || [];

    return (
        <div className="parent-dashboard">
            <section className="parent-welcome">
                <div>
                    <span className="parent-page-eyebrow">
                        PARENT PORTAL
                    </span>
                    <h1>
                        Welcome, {parent.first_name || 'Parent'}
                    </h1>
                    <p>
                        Keep track of your children's academic progress
                        and published results.
                    </p>
                </div>

                <div className="parent-welcome-icon">
                    <i className="fas fa-user-graduate"></i>
                </div>
            </section>

            <section className="parent-summary-grid">
                <div className="parent-summary-card">
                    <div className="parent-summary-icon green">
                        <i className="fas fa-users"></i>
                    </div>
                    <div>
                        <span>Linked Children</span>
                        <strong>{summary.children_count ?? children.length}</strong>
                    </div>
                </div>

                <div className="parent-summary-card">
                    <div className="parent-summary-icon blue">
                        <i className="fas fa-file-alt"></i>
                    </div>
                    <div>
                        <span>Published Results</span>
                        <strong>{summary.published_results_count ?? 0}</strong>
                    </div>
                </div>
            </section>

            <section className="parent-children-section">
                <div className="parent-section-heading">
                    <div>
                        <h2>Your Children</h2>
                        <p>Student profiles and academic performance</p>
                    </div>
                    <span className="parent-count">
                        {children.length} {children.length === 1 ? 'Student' : 'Students'}
                    </span>
                </div>

                {children.length === 0 ? (
                    <div className="parent-empty">
                        <i className="fas fa-user-graduate"></i>
                        <h3>No linked students yet</h3>
                        <p>Please contact your school administrator for assistance.</p>
                    </div>
                ) : (
                    <div className="parent-children-list">
                        {children.map((child) => {
                            const enrollments = child.enrollments || [];
                            const results = child.results || [];
                            const currentEnrollment = enrollments[0];

                            return (
                                <article
                                    className="parent-child-card"
                                    key={child.id}
                                >
                                    <div className="parent-child-header">
                                        <div className="parent-child-avatar">
                                            {(child.first_name || 'S').charAt(0).toUpperCase()}
                                        </div>

                                        <div className="parent-child-identity">
                                            <h3>
                                                {[
                                                    child.first_name,
                                                    child.middle_name,
                                                    child.last_name,
                                                ].filter(Boolean).join(' ')}
                                            </h3>
                                            <span>
                                                {child.admission_number || 'Admission number unavailable'}
                                            </span>
                                        </div>

                                        <span className="parent-student-status">
                                            <i className="fas fa-check-circle"></i>
                                            Linked
                                        </span>
                                    </div>

                                    <div className="parent-child-information">
                                        <div>
                                            <span>Current Class</span>
                                            <strong>
                                                {currentEnrollment
                                                    ? getClassName(currentEnrollment)
                                                    : 'Not assigned'}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Academic Session</span>
                                            <strong>
                                                {currentEnrollment?.academic_session?.name || 'Not available'}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Current Term</span>
                                            <strong>
                                                {currentEnrollment?.term?.name || 'Not available'}
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="parent-child-results">
                                        <div className="parent-results-heading">
                                            <h4>Published Academic Results</h4>
                                            <span>{results.length} available</span>
                                        </div>

                                        {results.length === 0 ? (
                                            <div className="parent-no-results">
                                                <i className="fas fa-info-circle"></i>
                                                No published results are available yet.
                                            </div>
                                        ) : (
                                            <div className="parent-results-list">
                                                {results.map((result) => (
                                                    <ResultCard
                                                        key={result.id}
                                                        child={child}
                                                        result={result}
                                                        onDownload={downloadReport}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            {downloading && (
                <div className="parent-download-status">
                    <i className="fas fa-spinner fa-spin"></i>
                    Preparing report card...
                </div>
            )}
        </div>
    );
}
