
import React, { useCallback, useEffect, useState } from 'react';
import apiClient from '../../api/client';
import './results.css';

function getList(response, keys = []) {
    const payload = response?.data;

    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;

    for (const key of keys) {
        if (Array.isArray(payload?.[key])) return payload[key];
        if (Array.isArray(payload?.data?.[key])) return payload.data[key];
    }

    return [];
}

function getObject(response) {
    const payload = response?.data;

    if (payload?.data && !Array.isArray(payload.data)) {
        return payload.data;
    }

    return payload ?? {};
}

function getId(item) {
    return String(item?.id ?? '');
}

function sessionName(item) {
    return item?.name
        || item?.session_name
        || item?.academic_year
        || item?.year
        || `Session ${item?.id}`;
}

function termName(item) {
    return item?.name
        || item?.term_name
        || item?.title
        || `Term ${item?.id}`;
}

function className(item) {
    return item?.name
        || item?.class_name
        || item?.class_code
        || `Class ${item?.id}`;
}

function studentName(student) {
    if (!student) return 'Unknown student';

    if (student.name) return student.name;
    if (student.full_name) return student.full_name;

    const name = [
        student.first_name,
        student.middle_name,
        student.last_name,
    ].filter(Boolean).join(' ');

    return name || `Student #${student.id ?? ''}`;
}

function statusLabel(status) {
    return String(status ?? 'draft')
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatScore(value) {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    const number = Number(value);

    return Number.isFinite(number) ? number.toFixed(2) : value;
}

export default function Results() {
    const [sessions, setSessions] = useState([]);
    const [terms, setTerms] = useState([]);
    const [classes, setClasses] = useState([]);
    const [results, setResults] = useState([]);

    const [sessionId, setSessionId] = useState('');
    const [termId, setTermId] = useState('');
    const [classId, setClassId] = useState('');

    const [loading, setLoading] = useState(false);
    const [processLoading, setProcessLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const [selectedResult, setSelectedResult] = useState(null);
    const [resultDetails, setResultDetails] = useState([]);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [reportCardLoading, setReportCardLoading] = useState(false);
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    const loadAcademicData = useCallback(async () => {
        setInitialLoading(true);
        setError('');

        try {
            const [sessionResponse, classResponse] = await Promise.all([
                apiClient.get('/academic/sessions'),
                apiClient.get('/academic/classes'),
            ]);

            const sessionList = getList(sessionResponse, ['sessions']);
            const classList = getList(classResponse, ['classes']);

            setSessions(sessionList);
            setClasses(classList);

            const currentSession =
                sessionList.find((item) => item.is_current || item.is_active)
                || sessionList[0];

            if (currentSession) {
                setSessionId(getId(currentSession));
            }
        } catch (err) {
            setError(
                err.response?.data?.message
                || 'Unable to load academic sessions and classes.'
            );
        } finally {
            setInitialLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAcademicData();
    }, [loadAcademicData]);

    useEffect(() => {
        setTermId('');
        setTerms([]);
        setResults([]);
        setSelectedResult(null);

        if (!sessionId) return undefined;

        let cancelled = false;

        apiClient.get(`/academic/sessions/${sessionId}/terms`)
            .then((response) => {
                if (!cancelled) {
                    const list = getList(response, ['terms']);
                    setTerms(list);

                    const currentTerm =
                        list.find((item) => item.is_current || item.is_active);

                    if (currentTerm) {
                        setTermId(getId(currentTerm));
                    }
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(
                        err.response?.data?.message
                        || 'Unable to load terms for the selected session.'
                    );
                }
            });

        return () => {
            cancelled = true;
        };
    }, [sessionId]);

    const loadResults = useCallback(async () => {
        if (!sessionId || !termId || !classId) {
            setResults([]);
            return;
        }

        setLoading(true);
        setError('');
        setNotice('');
        setSelectedResult(null);

        try {
            const response = await apiClient.get('/results/class/list', {
                params: {
                    class_id: Number(classId),
                    academic_session_id: Number(sessionId),
                    term_id: Number(termId),
                },
            });

            setResults(getList(response, ['results']));
        } catch (err) {
            setResults([]);

            setError(
                err.response?.data?.message
                || 'Unable to load results. Check your result-view permissions and selected filters.'
            );
        } finally {
            setLoading(false);
        }
    }, [sessionId, termId, classId]);

    const handleFilterSubmit = async (event) => {
        event.preventDefault();
        await loadResults();
    };

    const handleProcessClass = async () => {
    if (!sessionId || !termId || !classId) {
        setError('Select an academic session, term and class first.');
        return;
    }

    const confirmed = window.confirm(
        'Generate results for all eligible students in this class?\n\n' +
        'Existing published, submitted, under-review and approved results will be skipped. ' +
        'Only new results and existing draft results will be processed.'
    );

    if (!confirmed) return;

    setProcessLoading(true);
    setError('');
    setNotice('');

    try {
        const response = await apiClient.post('/results/process-class', {
            class_id: Number(classId),
            academic_session_id: Number(sessionId),
            term_id: Number(termId),
        });

        const data = getObject(response);

            await loadResults();

            setNotice(
                `Class processing completed. ` +
                `Total students: ${data.total_students ?? 0}. ` +
                `Processed: ${data.processed ?? 0}. ` +
                `Skipped: ${data.skipped ?? 0}. ` +
                `Failed: ${data.failed ?? 0}.`
            );

            if (Array.isArray(data.errors) && data.errors.length > 0) {
                setError(
                    data.errors
                        .map((item) =>
                            typeof item === 'string'
                                ? item
                                : `${item.student_name || item.student_id || 'Student'}: ${item.message || 'Processing failed'}`
                        )
                        .join(' | ')
                );
            }
        } catch (err) {
            setError(
                err.response?.data?.message
                || 'Unable to process results for this class.'
            );
        } finally {
            setProcessLoading(false);
        }
    };

    const openResult = async (result) => {
        setSelectedResult(result);
        setResultDetails([]);
        setDetailsError('');
        setDetailsLoading(true);

        try {
            const response = await apiClient.get(
                `/results/${result.id}/details`
            );

            const payload = getObject(response);

            const details =
                Array.isArray(payload.details) ? payload.details
                : Array.isArray(payload.result_details) ? payload.result_details
                : Array.isArray(payload) ? payload
                : [];

            setResultDetails(details);
        } catch (err) {
            setDetailsError(
                err.response?.data?.message
                || 'Unable to load the subject details for this result.'
            );
        } finally {
            setDetailsLoading(false);
        }
    };

    const closeResult = () => {
        setSelectedResult(null);
        setResultDetails([]);
        setDetailsError('');
    };

    const openReportCard = async () => {
        if (
            !selectedResult ||
            selectedResult.status !== 'published' ||
            reportCardLoading
        ) {
            return;
        }

        // Open the tab immediately so the browser does not block the PDF.
        const pdfWindow = window.open('', '_blank');

        if (!pdfWindow) {
            setError('Please allow pop-ups to open the report card.');
            return;
        }

        setReportCardLoading(true);
        setError('');

        try {
            const response = await apiClient.get(
                `/results/${selectedResult.id}/report-card`,
                {
                    responseType: 'blob',
                }
            );

            const pdfBlob = new Blob([response.data], {
                type: 'application/pdf',
            });

            const pdfUrl = window.URL.createObjectURL(pdfBlob);

            pdfWindow.location.href = pdfUrl;

            window.setTimeout(() => {
                window.URL.revokeObjectURL(pdfUrl);
            }, 60000);

        } catch (err) {
            pdfWindow.close();

            setError(
                err.response?.data?.message
                || 'Unable to generate the report card. Please try again.'
            );
        } finally {
            setReportCardLoading(false);
        }
    };

    const performWorkflowAction = async (action, reason = '') => {
        if (!selectedResult || actionLoading) return;

        const actionNames = {
            submit: 'submit',
            review: 'start review',
            approve: 'approve',
            reject: 'reject',
            publish: 'publish',
        };

        const confirmed = window.confirm(
            `Are you sure you want to ${actionNames[action]} this result?`
        );

        if (!confirmed) return;

        setActionLoading(true);
        setError('');
        setNotice('');

        try {
            const payload = {
                result_id: selectedResult.id,
            };

            if (action === 'reject') {
                payload.reason = reason;
            }

            const response = await apiClient.post(
                `/results/${action}`,
                payload
            );

            const updatedResult = getObject(response);

            setSelectedResult((previous) => ({
                ...previous,
                ...updatedResult,
            }));

            setResults((previous) =>
                previous.map((item) =>
                    item.id === selectedResult.id
                        ? { ...item, ...updatedResult }
                        : item
                )
            );

            setNotice(
                response.data?.message
                || 'Result workflow updated successfully.'
            );

            setShowRejectForm(false);
            setRejectReason('');

        } catch (err) {
            setError(
                err.response?.data?.message
                || 'Unable to complete this workflow action.'
            );
        } finally {
            setActionLoading(false);
        }
    };

    const selectedStudent = selectedResult?.student;
    const selectedClass = selectedResult?.school_class
        || selectedResult?.schoolClass;

    const publishedCount = results.filter(
        (item) => item.status === 'published'
    ).length;

    const pendingCount = results.filter(
        (item) => ['draft', 'submitted', 'under_review'].includes(item.status)
    ).length;

    return (
        <div className="results-page">
            <header className="results-heading">
                <div>
                    <span className="results-eyebrow">ACADEMIC MANAGEMENT</span>
                    <h1>Results Management</h1>
                    <p>
                        Review student performance, class positions and
                        generated term results.
                    </p>
                </div>

                <div className="results-heading-icon" aria-hidden="true">
                    <i className="fas fa-chart-column" />
                </div>
            </header>

            {error && (
                <div className="results-alert results-alert-error" role="alert">
                    <i className="fas fa-circle-exclamation" />
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={() => setError('')}
                        aria-label="Dismiss error"
                    >
                        &times;
                    </button>
                </div>
            )}

            {notice && (
                <div className="results-alert results-alert-success" role="status">
                    <i className="fas fa-circle-check" />
                    <span>{notice}</span>
                </div>
            )}

            <section className="results-stat-grid">
                <article className="results-stat-card">
                    <div className="results-stat-icon results-stat-blue">
                        <i className="fas fa-file-lines" />
                    </div>
                    <div>
                        <span>Results Found</span>
                        <strong>{results.length}</strong>
                    </div>
                </article>

                <article className="results-stat-card">
                    <div className="results-stat-icon results-stat-green">
                        <i className="fas fa-check-double" />
                    </div>
                    <div>
                        <span>Published</span>
                        <strong>{publishedCount}</strong>
                    </div>
                </article>

                <article className="results-stat-card">
                    <div className="results-stat-icon results-stat-orange">
                        <i className="fas fa-clock" />
                    </div>
                    <div>
                        <span>Pending Workflow</span>
                        <strong>{pendingCount}</strong>
                    </div>
                </article>
            </section>

            <section className="results-panel">
                <div className="results-panel-heading">
                    <div className="results-panel-icon">
                        <i className="fas fa-filter" />
                    </div>
                    <div>
                        <h2>Find Class Results</h2>
                        <p>Select the academic period and class to view results.</p>
                    </div>
                </div>

                {initialLoading ? (
                    <div className="results-loading">
                        <span className="results-spinner" />
                        Loading academic data...
                    </div>
                ) : (
                    <form className="results-filter-grid" onSubmit={handleFilterSubmit}>
                        <label className="results-field">
                            <span>Academic Session <b>*</b></span>
                            <select
                                value={sessionId}
                                onChange={(event) => setSessionId(event.target.value)}
                                required
                            >
                                <option value="">Select session</option>
                                {sessions.map((item) => (
                                    <option key={item.id} value={getId(item)}>
                                        {sessionName(item)}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="results-field">
                            <span>Term <b>*</b></span>
                            <select
                                value={termId}
                                onChange={(event) => setTermId(event.target.value)}
                                disabled={!sessionId}
                                required
                            >
                                <option value="">Select term</option>
                                {terms.map((item) => (
                                    <option key={item.id} value={getId(item)}>
                                        {termName(item)}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="results-field">
                            <span>Class <b>*</b></span>
                            <select
                                value={classId}
                                onChange={(event) => setClassId(event.target.value)}
                                required
                            >
                                <option value="">Select class</option>
                                {classes.map((item) => (
                                    <option key={item.id} value={getId(item)}>
                                        {className(item)}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <div className="results-filter-action">
                            <button
                                type="submit"
                                className="results-primary-button"
                                disabled={loading || processLoading || !sessionId || !termId || !classId}
                            >
                                <i className="fas fa-magnifying-glass" />
                                {loading ? 'Loading...' : 'View Results'}
                            </button>

                            <button
                                type="button"
                                className="results-secondary-button"
                                onClick={handleProcessClass}
                                disabled={loading || processLoading || !sessionId || !termId || !classId}
                            >
                                <i className="fas fa-calculator" />
                                {processLoading ? 'Processing Class...' : 'Process Class Results'}
                            </button>
                        </div>
                    </form>
                )}
            </section>

            <section className="results-panel results-table-panel">
                <div className="results-panel-heading results-list-heading">
                    <div className="results-panel-icon results-panel-icon-green">
                        <i className="fas fa-graduation-cap" />
                    </div>
                    <div>
                        <h2>Student Results</h2>
                        <p>Open a result to review its subject breakdown.</p>
                    </div>

                    <span className="results-count">
                        {results.length} {results.length === 1 ? 'record' : 'records'}
                    </span>
                </div>

                {!sessionId || !termId || !classId ? (
                    <div className="results-empty-state">
                        <i className="fas fa-sliders" />
                        <h3>Select your filters</h3>
                        <p>Choose a session, term and class, then click View Results.</p>
                    </div>
                ) : loading ? (
                    <div className="results-loading">
                        <span className="results-spinner" />
                        Loading class results...
                    </div>
                ) : results.length === 0 ? (
                    <div className="results-empty-state">
                        <i className="fas fa-folder-open" />
                        <h3>No results found</h3>
                        <p>
                            No generated results were returned for these filters.
                            Results may not have been processed yet.
                        </p>
                    </div>
                ) : (
                    <div className="results-table-wrapper">
                        <table className="results-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Student</th>
                                    <th>Admission Number</th>
                                    <th>Total Score</th>
                                    <th>Average</th>
                                    <th>Grade</th>
                                    <th>Position</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((result, index) => {
                                    const student = result.student;
                                    const admissionNumber =
                                        student?.admission_number
                                        || student?.registration_number
                                        || '—';

                                    return (
                                        <tr key={result.id}>
                                            <td>{index + 1}</td>
                                            <td>
                                                <div className="results-student-cell">
                                                    <span className="results-avatar">
                                                        {studentName(student).charAt(0).toUpperCase()}
                                                    </span>
                                                    <strong>{studentName(student)}</strong>
                                                </div>
                                            </td>
                                            <td>{admissionNumber}</td>
                                            <td>{formatScore(result.total_score)}</td>
                                            <td>
                                                <strong className="results-average">
                                                    {formatScore(result.average)}%
                                                </strong>
                                            </td>
                                            <td>
                                                <span className="results-grade">
                                                    {result.overall_grade || '—'}
                                                </span>
                                            </td>
                                            <td>
                                                {result.position
                                                    ? `${result.position}`
                                                    : '—'}
                                            </td>
                                            <td>
                                                <span className={`results-status status-${result.status || 'draft'}`}>
                                                    {statusLabel(result.status)}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="results-view-button"
                                                    onClick={() => openResult(result)}
                                                    title="View result details"
                                                >
                                                    <i className="fas fa-eye" />
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {selectedResult && (
                <div
                    className="results-modal-backdrop"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) closeResult();
                    }}
                >
                    <section
                        className="results-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="result-modal-title"
                    >
                        <header className="results-modal-header">
                            <div>
                                <span className="results-eyebrow">STUDENT REPORT</span>
                                <h2 id="result-modal-title">
                                    {studentName(selectedStudent)}
                                </h2>
                                <p>
                                    {selectedStudent?.admission_number
                                        || selectedStudent?.registration_number
                                        || 'Admission number unavailable'}
                                </p>
                            </div>

                            <button
                                type="button"
                                className="results-modal-close"
                                onClick={closeResult}
                                aria-label="Close result details"
                            >
                                &times;
                            </button>
                        </header>

                        <div className="results-modal-summary">
                            <div>
                                <span>Total Score</span>
                                <strong>{formatScore(selectedResult.total_score)}</strong>
                            </div>
                            <div>
                                <span>Average</span>
                                <strong>{formatScore(selectedResult.average)}%</strong>
                            </div>
                            <div>
                                <span>Position</span>
                                <strong>
                                    {selectedResult.position
                                        ? `${selectedResult.position}`
                                        : '—'}
                                </strong>
                            </div>
                            <div>
                                <span>Overall Grade</span>
                                <strong>{selectedResult.overall_grade || '—'}</strong>
                            </div>
                        </div>

                        <div className="results-modal-meta">
                            <span>
                                <i className="fas fa-school" />
                                {className(selectedClass || {})}
                            </span>
                            <span>
                                <i className="fas fa-circle-info" />
                                {statusLabel(selectedResult.status)}
                            </span>
                            {selectedResult.overall_remark && (
                                <span>
                                    <i className="fas fa-comment" />
                                    {selectedResult.overall_remark}
                                </span>
                            )}
                        </div>

                        <div className="results-workflow-panel">
                            <div className="results-workflow-heading">
                                <div>
                                    <h3>Result Approval Workflow</h3>
                                    <p>
                                        Current status:{" "}
                                        <strong>{statusLabel(selectedResult.status)}</strong>
                                    </p>
                                </div>

                                <span className={`results-status status-${selectedResult.status || 'draft'}`}>
                                    {statusLabel(selectedResult.status)}
                                </span>
                            </div>

                            <div className="results-workflow-actions">
                                {selectedResult.status === 'draft' && (
                                    <button
                                        type="button"
                                        className="results-primary-button"
                                        disabled={actionLoading}
                                        onClick={() => performWorkflowAction('submit')}
                                    >
                                        <i className="fas fa-paper-plane" />
                                        {actionLoading ? 'Processing...' : 'Submit for Review'}
                                    </button>
                                )}

                                {selectedResult.status === 'submitted' && (
                                    <button
                                        type="button"
                                        className="results-primary-button"
                                        disabled={actionLoading}
                                        onClick={() => performWorkflowAction('review')}
                                    >
                                        <i className="fas fa-clipboard-check" />
                                        {actionLoading ? 'Processing...' : 'Start Review'}
                                    </button>
                                )}

                                {selectedResult.status === 'under_review' && (
                                    <>
                                        <button
                                            type="button"
                                            className="results-primary-button"
                                            disabled={actionLoading}
                                            onClick={() => performWorkflowAction('approve')}
                                        >
                                            <i className="fas fa-check-circle" />
                                            {actionLoading ? 'Processing...' : 'Approve Result'}
                                        </button>

                                        <button
                                            type="button"
                                            className="results-reject-button"
                                            disabled={actionLoading}
                                            onClick={() => setShowRejectForm(!showRejectForm)}
                                        >
                                            <i className="fas fa-times-circle" />
                                            Reject Result
                                        </button>
                                    </>
                                )}

                                {selectedResult.status === 'approved' && (
                                    <button
                                        type="button"
                                        className="results-primary-button"
                                        disabled={actionLoading}
                                        onClick={() => performWorkflowAction('publish')}
                                    >
                                        <i className="fas fa-globe" />
                                        {actionLoading ? 'Processing...' : 'Publish Result'}
                                    </button>
                                )}

                                {selectedResult.status === 'published' && (
                                    <div className="results-published-message">
                                        <i className="fas fa-circle-check" />
                                        This result has been successfully published.
                                    </div>
                                )}
                            </div>

                            {showRejectForm && selectedResult.status === 'under_review' && (
                                <div className="results-reject-form">
                                    <label htmlFor="result-rejection-reason">
                                        Rejection Reason
                                    </label>

                                    <textarea
                                        id="result-rejection-reason"
                                        value={rejectReason}
                                        onChange={(event) => setRejectReason(event.target.value)}
                                        maxLength={1000}
                                        placeholder="Explain why this result is being rejected..."
                                    />

                                    <div className="results-reject-actions">
                                        <button
                                            type="button"
                                            className="results-reject-button"
                                            disabled={actionLoading}
                                            onClick={() => performWorkflowAction('reject', rejectReason)}
                                        >
                                            {actionLoading ? 'Processing...' : 'Confirm Rejection'}
                                        </button>

                                        <button
                                            type="button"
                                            className="results-secondary-button"
                                            disabled={actionLoading}
                                            onClick={() => setShowRejectForm(false)}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="results-modal-body">
                            <h3>Subject Performance</h3>


                            {detailsLoading ? (
                                <div className="results-loading">
                                    <span className="results-spinner" />
                                    Loading subject details...
                                </div>
                            ) : detailsError ? (
                                <div className="results-alert results-alert-error">
                                    {detailsError}
                                </div>
                            ) : resultDetails.length === 0 ? (
                                <div className="results-empty-state">
                                    <p>No subject details were returned for this result.</p>
                                </div>
                            ) : (
                                <div className="results-table-wrapper">
                                    <table className="results-table results-detail-table">
                                        <thead>
                                            <tr>
                                                <th>Subject</th>
                                                <th>Total</th>
                                                <th>Grade</th>
                                                <th>Remark</th>
                                                <th>Position</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {resultDetails.map((detail) => (
                                                <tr key={detail.id}>
                                                    <td>
                                                        {detail.subject?.name
                                                            || detail.subject?.subject_name
                                                            || `Subject #${detail.subject_id}`}
                                                    </td>
                                                    <td>{formatScore(detail.total_score)}</td>
                                                    <td>{detail.grade || '—'}</td>
                                                    <td>{detail.remark || '—'}</td>
                                                    <td>
                                                        {detail.subject_position
                                                            ? `#${detail.subject_position}`
                                                            : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <footer className="results-modal-footer">
                            <span>
                                Status: <strong>{statusLabel(selectedResult.status)}</strong>
                            </span>

                            <div className="results-modal-footer-actions">
                                {selectedResult.status === 'published' && (
                                    <button
                                        type="button"
                                        className="results-primary-button"
                                        onClick={openReportCard}
                                        disabled={reportCardLoading}
                                    >
                                        <i className="fas fa-file-pdf" />
                                        {reportCardLoading
                                            ? 'Generating PDF...'
                                            : 'Generate Report Card'}
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className="results-secondary-button"
                                    onClick={closeResult}
                                >
                                    Close
                                </button>
                            </div>
                        </footer>
                    </section>
                </div>
            )}
        </div>
    );
}
