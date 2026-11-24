
import React, { useCallback, useEffect, useState } from 'react';
import apiClient from '../../api/client';
import './StudentDashboard.css';

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

function ResultCard({ result, onDownload, downloading }) {
    const [expanded, setExpanded] = useState(false);
    const details = result.details || [];

    return (
        <article className="student-result-card">
            <div className="student-result-header">
                <div>
                    <span className="student-result-eyebrow">PUBLISHED RESULT</span>
                    <h3>{result.term?.name || 'Academic Term'}</h3>
                    <p>
                        {result.academic_session?.name || 'Academic Session'}
                        {' · '}
                        {result.school_class?.name || 'Class'}
                    </p>
                </div>

                <div className="student-result-grade">
                    {result.overall_grade || 'N/A'}
                </div>
            </div>

            <div className="student-result-stats">
                <div>
                    <span>Average</span>
                    <strong>{formatNumber(result.average)}%</strong>
                </div>
                <div>
                    <span>Total Score</span>
                    <strong>{formatNumber(result.total_score)}</strong>
                </div>
                <div>
                    <span>Position</span>
                    <strong>{result.position || 'N/A'}</strong>
                </div>
            </div>

            {result.overall_remark && (
                <div className="student-result-remark">
                    <i className="fas fa-comment-alt"></i>
                    {result.overall_remark}
                </div>
            )}

            <div className="student-result-actions">
                <button
                    type="button"
                    className="student-details-button"
                    onClick={() => setExpanded((value) => !value)}
                >
                    <i className={`fas ${expanded ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                    {expanded ? 'Hide subjects' : `View subjects (${details.length})`}
                </button>

                <button
                    type="button"
                    className="student-download-button"
                    onClick={() => onDownload(result)}
                    disabled={downloading}
                >
                    <i className={`fas ${downloading ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`}></i>
                    {downloading ? 'Preparing...' : 'Download Report'}
                </button>
            </div>

            {expanded && (
                <div className="student-subject-table-wrapper">
                    {details.length > 0 ? (
                        <table className="student-subject-table">
                            <thead>
                                <tr>
                                    <th>Subject</th>
                                    <th>Total Score</th>
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
                                            <span className="student-subject-grade">
                                                {detail.grade || 'N/A'}
                                            </span>
                                        </td>
                                        <td>{detail.remark || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="student-no-subjects">
                            No subject details are available for this result.
                        </p>
                    )}
                </div>
            )}
        </article>
    );
}

export default function StudentDashboard() {
    const [portal, setPortal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [downloading, setDownloading] = useState(null);

    const loadPortal = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const response = await apiClient.get('/student/portal');
            setPortal(response.data?.data || null);
        } catch (err) {
            console.error('Student portal error:', err);

            setError(
                err.response?.data?.message ||
                'Unable to load your student dashboard. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPortal();
    }, [loadPortal]);

    const downloadReport = async (result) => {
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
            link.download = `Student-Report-Card-${result.id}.pdf`;

            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Student report download error:', err);
            alert(
                err.response?.data?.message ||
                'Unable to download this report card. Please try again.'
            );
        } finally {
            setDownloading(null);
        }
    };

    if (loading) {
        return (
            <div className="student-loading">
                <span className="student-loader"></span>
                <p>Loading your academic dashboard...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="student-error">
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
        return (
            <div className="student-empty">
                <i className="fas fa-user-graduate"></i>
                <h3>Student profile unavailable</h3>
                <p>Please contact your school administrator.</p>
            </div>
        );
    }

    const student = portal.student || {};
    const summary = portal.summary || {};
    const enrollment = portal.current_enrollment;
    const results = portal.results || [];

    const studentName = [
        student.first_name,
        student.middle_name,
        student.last_name,
    ].filter(Boolean).join(' ') || student.full_name || 'Student';

    return (
        <div className="student-dashboard">
            <section className="student-welcome">
                <div>
                    <span className="student-page-eyebrow">STUDENT PORTAL</span>
                    <h1>Welcome, {student.first_name || 'Student'}</h1>
                    <p>
                        View your academic information, monitor your performance
                        and access your published examination results.
                    </p>

                    <div className="student-admission">
                        <i className="fas fa-id-card"></i>
                        Admission No: {student.admission_number || 'Not available'}
                    </div>
                </div>

                <div className="student-welcome-icon">
                    <i className="fas fa-user-graduate"></i>
                </div>
            </section>

            <section className="student-summary-grid">
                <div className="student-summary-card">
                    <div className="student-summary-icon green">
                        <i className="fas fa-chart-line"></i>
                    </div>
                    <div>
                        <span>Latest Average</span>
                        <strong>
                            {summary.latest_average !== null &&
                            summary.latest_average !== undefined
                                ? `${formatNumber(summary.latest_average)}%`
                                : 'N/A'}
                        </strong>
                    </div>
                </div>

                <div className="student-summary-card">
                    <div className="student-summary-icon blue">
                        <i className="fas fa-trophy"></i>
                    </div>
                    <div>
                        <span>Latest Position</span>
                        <strong>{summary.latest_position || 'N/A'}</strong>
                    </div>
                </div>

                <div className="student-summary-card">
                    <div className="student-summary-icon purple">
                        <i className="fas fa-award"></i>
                    </div>
                    <div>
                        <span>Overall Grade</span>
                        <strong>{summary.latest_grade || 'N/A'}</strong>
                    </div>
                </div>

                <div className="student-summary-card">
                    <div className="student-summary-icon orange">
                        <i className="fas fa-file-alt"></i>
                    </div>
                    <div>
                        <span>Published Results</span>
                        <strong>{summary.published_results_count ?? results.length}</strong>
                    </div>
                </div>
            </section>

            <section className="student-information-card">
                <div className="student-section-heading">
                    <div>
                        <h2>My Academic Information</h2>
                        <p>Your current school placement and profile</p>
                    </div>
                    <span className="student-active-status">
                        <i className="fas fa-check-circle"></i>
                        Active Profile
                    </span>
                </div>

                <div className="student-information-grid">
                    <div>
                        <span>Full Name</span>
                        <strong>{studentName}</strong>
                    </div>

                    <div>
                        <span>Admission Number</span>
                        <strong>{student.admission_number || 'Not available'}</strong>
                    </div>

                    <div>
                        <span>Current Class</span>
                        <strong>
                            {enrollment
                                ? getClassName(enrollment)
                                : 'Not assigned'}
                        </strong>
                    </div>

                    <div>
                        <span>Academic Session</span>
                        <strong>
                            {enrollment?.academic_session?.name || 'Not available'}
                        </strong>
                    </div>

                    <div>
                        <span>Current Term</span>
                        <strong>
                            {enrollment?.term?.name || 'Not available'}
                        </strong>
                    </div>

                    <div>
                        <span>Phone Number</span>
                        <strong>{student.phone || 'Not provided'}</strong>
                    </div>
                </div>
            </section>

            <section className="student-results-section">
                <div className="student-section-heading">
                    <div>
                        <h2>My Published Results</h2>
                        <p>Examination results released by your school</p>
                    </div>

                    <span className="student-result-count">
                        {results.length} {results.length === 1 ? 'Result' : 'Results'}
                    </span>
                </div>

                {results.length === 0 ? (
                    <div className="student-empty-results">
                        <i className="fas fa-file-alt"></i>
                        <h3>No published results yet</h3>
                        <p>
                            Your results will appear here when they have been
                            approved and published by your school.
                        </p>
                    </div>
                ) : (
                    <div className="student-results-list">
                        {results.map((result) => (
                            <ResultCard
                                key={result.id}
                                result={result}
                                onDownload={downloadReport}
                                downloading={downloading === result.id}
                            />
                        ))}
                    </div>
                )}
            </section>

            {downloading && (
                <div className="student-download-status">
                    <i className="fas fa-spinner fa-spin"></i>
                    Preparing your report card...
                </div>
            )}
        </div>
    );
}
