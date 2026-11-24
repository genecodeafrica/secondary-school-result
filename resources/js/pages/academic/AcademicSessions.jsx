import React, { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '../../api/client';
import './academic-sessions.css';

const emptySession = {
    name: '',
    start_date: '',
    end_date: '',
    is_current: false,
};

const emptyTerm = {
    name: '',
    start_date: '',
    end_date: '',
    is_current: false,
};

function dateValue(value) {
    if (!value) return '';
    return String(value).slice(0, 10);
}

function formatDate(value) {
    if (!value) return '—';

    return new Date(`${dateValue(value)}T00:00:00`).toLocaleDateString(
        'en-GB',
        { day: '2-digit', month: 'short', year: 'numeric' }
    );
}

function getErrorMessage(error) {
    const validationErrors = error.response?.data?.errors;

    if (validationErrors) {
        return Object.values(validationErrors).flat().join(' ');
    }

    return error.response?.data?.message || 'Something went wrong. Please try again.';
}

export default function AcademicSessions() {
    const [sessions, setSessions] = useState([]);
    const [selectedSessionId, setSelectedSessionId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const [sessionModal, setSessionModal] = useState(false);
    const [termModal, setTermModal] = useState(false);
    const [editingSession, setEditingSession] = useState(null);
    const [editingTerm, setEditingTerm] = useState(null);

    const [sessionForm, setSessionForm] = useState(emptySession);
    const [termForm, setTermForm] = useState(emptyTerm);
    const [formError, setFormError] = useState('');

    const loadSessions = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            const response = await apiClient.get('/academic-sessions');
            const rows = Array.isArray(response.data?.data)
                ? response.data.data
                : [];

            setSessions(rows);

            setSelectedSessionId((currentId) => {
                if (rows.some((item) => item.id === currentId)) {
                    return currentId;
                }

                return rows.find((item) => item.is_current)?.id
                    ?? rows[0]?.id
                    ?? null;
            });
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    const selectedSession = useMemo(
        () => sessions.find(
            (session) => String(session.id) === String(selectedSessionId)
        ) || null,
        [sessions, selectedSessionId]
    );

    const allTerms = sessions.flatMap((session) => session.terms || []);
    const currentSession = sessions.find((session) => session.is_current);
    const currentTerm = allTerms.find((term) => term.is_current);

    const activeSessions = sessions.filter((session) => session.status).length;
    const activeTerms = allTerms.filter((term) => term.status).length;

    function openCreateSession() {
        setEditingSession(null);
        setSessionForm(emptySession);
        setFormError('');
        setSessionModal(true);
    }

    function openEditSession(session) {
        setEditingSession(session);
        setSessionForm({
            name: session.name || '',
            start_date: dateValue(session.start_date),
            end_date: dateValue(session.end_date),
            is_current: Boolean(session.is_current),
        });
        setFormError('');
        setSessionModal(true);
    }

    function openCreateTerm() {
        if (!selectedSession) return;

        setEditingTerm(null);
        setTermForm({
            ...emptyTerm,
            start_date: dateValue(selectedSession.start_date),
            end_date: dateValue(selectedSession.end_date),
        });
        setFormError('');
        setTermModal(true);
    }

    function openEditTerm(term) {
        setEditingTerm(term);
        setTermForm({
            name: term.name || '',
            start_date: dateValue(term.start_date),
            end_date: dateValue(term.end_date),
            is_current: Boolean(term.is_current),
        });
        setFormError('');
        setTermModal(true);
    }

    async function saveSession(event) {
        event.preventDefault();

        try {
            setSaving(true);
            setFormError('');

            const payload = {
                name: sessionForm.name.trim(),
                start_date: sessionForm.start_date,
                end_date: sessionForm.end_date,
                is_current: Boolean(sessionForm.is_current),
            };

            let response;

            if (editingSession) {
                response = await apiClient.put(
                    `/academic-sessions/${editingSession.id}`,
                    payload
                );
            } else {
                response = await apiClient.post('/academic-sessions', payload);
            }

            const savedId = response.data?.data?.id;

            setSessionModal(false);
            setNotice(response.data?.message || 'Academic session saved successfully.');

            if (savedId) setSelectedSessionId(savedId);

            await loadSessions();
        } catch (err) {
            setFormError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    }

    async function saveTerm(event) {
        event.preventDefault();

        if (!selectedSession) return;

        try {
            setSaving(true);
            setFormError('');

            const payload = {
                name: termForm.name.trim(),
                start_date: termForm.start_date,
                end_date: termForm.end_date,
                is_current: Boolean(termForm.is_current),
            };

            let response;

            if (editingTerm) {
                response = await apiClient.put(
                    `/academic-terms/${editingTerm.id}`,
                    payload
                );
            } else {
                response = await apiClient.post(
                    `/academic-sessions/${selectedSession.id}/terms`,
                    payload
                );
            }

            setTermModal(false);
            setNotice(response.data?.message || 'Term saved successfully.');
            await loadSessions();
        } catch (err) {
            setFormError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    }

    async function setSessionStatus(session) {
        const nextStatus = !session.status;

        if (!window.confirm(
            `${nextStatus ? 'Activate' : 'Deactivate'} academic session "${session.name}"?`
        )) {
            return;
        }

        try {
            setError('');
            const response = await apiClient.patch(
                `/academic-sessions/${session.id}/status`,
                { status: nextStatus }
            );

            setNotice(response.data?.message || 'Session status updated.');
            await loadSessions();
        } catch (err) {
            setError(getErrorMessage(err));
        }
    }

    async function setTermStatus(term) {
        const nextStatus = !term.status;

        if (!window.confirm(
            `${nextStatus ? 'Activate' : 'Deactivate'} "${term.name}"?`
        )) {
            return;
        }

        try {
            setError('');
            const response = await apiClient.patch(
                `/academic-terms/${term.id}/status`,
                { status: nextStatus }
            );

            setNotice(response.data?.message || 'Term status updated.');
            await loadSessions();
        } catch (err) {
            setError(getErrorMessage(err));
        }
    }

    useEffect(() => {
        if (!notice) return undefined;

        const timeout = window.setTimeout(() => setNotice(''), 4000);
        return () => window.clearTimeout(timeout);
    }, [notice]);

    return (
        <div className="academic-page">
            <div className="academic-page-header">
                <div>
                    <span className="academic-eyebrow">ACADEMIC MANAGEMENT</span>
                    <h1>Academic Sessions</h1>
                    <p>Manage academic years, school terms and the current academic period.</p>
                </div>

                <button
                    type="button"
                    className="academic-primary-button"
                    onClick={openCreateSession}
                >
                    <i className="fas fa-plus" /> Add Academic Session
                </button>
            </div>

            <div className="academic-summary-grid">
                <div className="academic-summary-card">
                    <div className="academic-summary-icon blue">
                        <i className="fas fa-calendar-days" />
                    </div>
                    <div>
                        <span>Total Sessions</span>
                        <strong>{sessions.length}</strong>
                    </div>
                </div>

                <div className="academic-summary-card">
                    <div className="academic-summary-icon green">
                        <i className="fas fa-circle-check" />
                    </div>
                    <div>
                        <span>Active Sessions</span>
                        <strong>{activeSessions}</strong>
                    </div>
                </div>

                <div className="academic-summary-card">
                    <div className="academic-summary-icon orange">
                        <i className="fas fa-list-ol" />
                    </div>
                    <div>
                        <span>Total Terms</span>
                        <strong>{allTerms.length}</strong>
                    </div>
                </div>

                <div className="academic-summary-card">
                    <div className="academic-summary-icon purple">
                        <i className="fas fa-calendar-check" />
                    </div>
                    <div>
                        <span>Active Terms</span>
                        <strong>{activeTerms}</strong>
                    </div>
                </div>
            </div>

            {notice && (
                <div className="academic-alert success">
                    <i className="fas fa-check-circle" />
                    <span>{notice}</span>
                    <button type="button" onClick={() => setNotice('')}>×</button>
                </div>
            )}

            {error && (
                <div className="academic-alert error">
                    <i className="fas fa-exclamation-circle" />
                    <span>{error}</span>
                    <button type="button" onClick={loadSessions}>Retry</button>
                </div>
            )}

            <div className="academic-current-grid">
                <div className="academic-current-card">
                    <span className="academic-current-label">CURRENT ACADEMIC SESSION</span>
                    <strong>{currentSession?.name || 'Not selected'}</strong>
                    <small>
                        {currentSession
                            ? `${formatDate(currentSession.start_date)} – ${formatDate(currentSession.end_date)}`
                            : 'Set a current session to begin the academic period.'}
                    </small>
                </div>

                <div className="academic-current-card">
                    <span className="academic-current-label">CURRENT TERM</span>
                    <strong>{currentTerm?.name || 'Not selected'}</strong>
                    <small>
                        {currentTerm
                            ? `${formatDate(currentTerm.start_date)} – ${formatDate(currentTerm.end_date)}`
                            : 'Select a current term within the current session.'}
                    </small>
                </div>
            </div>

            <section className="academic-panel">
                <div className="academic-panel-heading">
                    <div>
                        <h2>Academic Session List</h2>
                        <p>All academic sessions registered for your school.</p>
                    </div>

                    <button
                        type="button"
                        className="academic-icon-button"
                        onClick={loadSessions}
                        title="Refresh sessions"
                        disabled={loading}
                    >
                        <i className={`fas fa-rotate ${loading ? 'fa-spin' : ''}`} />
                    </button>
                </div>

                {loading ? (
                    <div className="academic-state">
                        <i className="fas fa-spinner fa-spin" />
                        <p>Loading academic sessions...</p>
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="academic-state">
                        <i className="fas fa-calendar-plus" />
                        <h3>No academic sessions yet</h3>
                        <p>Create your first academic session to get started.</p>
                        <button
                            type="button"
                            className="academic-primary-button"
                            onClick={openCreateSession}
                        >
                            <i className="fas fa-plus" /> Add Session
                        </button>
                    </div>
                ) : (
                    <div className="academic-table-scroll">
                        <table className="academic-table">
                            <thead>
                                <tr>
                                    <th>Academic Session</th>
                                    <th>Start Date</th>
                                    <th>End Date</th>
                                    <th>Terms</th>
                                    <th>Current</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.map((session) => (
                                    <tr
                                        key={session.id}
                                        className={
                                            String(selectedSessionId) === String(session.id)
                                                ? 'selected-row'
                                                : ''
                                        }
                                    >
                                        <td>
                                            <button
                                                type="button"
                                                className="academic-session-link"
                                                onClick={() => setSelectedSessionId(session.id)}
                                            >
                                                <i className="fas fa-calendar-alt" />
                                                {session.name}
                                            </button>
                                        </td>
                                        <td>{formatDate(session.start_date)}</td>
                                        <td>{formatDate(session.end_date)}</td>
                                        <td>{session.terms_count ?? session.terms?.length ?? 0}</td>
                                        <td>
                                            {session.is_current
                                                ? <span className="academic-badge current">Current</span>
                                                : <span className="academic-muted">—</span>}
                                        </td>
                                        <td>
                                            <span className={`academic-badge ${session.status ? 'active' : 'inactive'}`}>
                                                {session.status ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="academic-actions">
                                                <button
                                                    type="button"
                                                    className="academic-action-button"
                                                    onClick={() => openEditSession(session)}
                                                    title="Edit session"
                                                >
                                                    <i className="fas fa-pen" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="academic-action-button"
                                                    onClick={() => setSessionStatus(session)}
                                                    title={session.status ? 'Deactivate session' : 'Activate session'}
                                                >
                                                    <i className={`fas ${session.status ? 'fa-toggle-on' : 'fa-toggle-off'}`} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="academic-action-button manage"
                                                    onClick={() => setSelectedSessionId(session.id)}
                                                    title="Manage terms"
                                                >
                                                    <i className="fas fa-list" />
                                                    <span>Terms</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {selectedSession && (
                <section className="academic-panel academic-terms-panel">
                    <div className="academic-panel-heading">
                        <div>
                            <span className="academic-eyebrow">TERM MANAGEMENT</span>
                            <h2>{selectedSession.name} Terms</h2>
                            <p>
                                Manage terms within this session. Term dates must remain
                                within the session dates.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="academic-primary-button"
                            onClick={openCreateTerm}
                            disabled={!selectedSession.status}
                            title={!selectedSession.status ? 'Activate this session before adding terms' : ''}
                        >
                            <i className="fas fa-plus" /> Add Term
                        </button>
                    </div>

                    {!selectedSession.status && (
                        <div className="academic-inline-warning">
                            <i className="fas fa-info-circle" />
                            Activate this academic session before setting one of its terms as current.
                        </div>
                    )}

                    {(selectedSession.terms || []).length === 0 ? (
                        <div className="academic-state compact">
                            <i className="fas fa-list-ol" />
                            <h3>No terms in this session</h3>
                            <p>Add the terms that make up this academic session.</p>
                        </div>
                    ) : (
                        <div className="academic-term-list">
                            {[...(selectedSession.terms || [])]
                                .sort((a, b) => dateValue(a.start_date).localeCompare(dateValue(b.start_date)))
                                .map((term, index) => (
                                    <div className="academic-term-card" key={term.id}>
                                        <div className="academic-term-number">
                                            {String(index + 1).padStart(2, '0')}
                                        </div>

                                        <div className="academic-term-info">
                                            <div className="academic-term-title">
                                                <h3>{term.name}</h3>
                                                {term.is_current && (
                                                    <span className="academic-badge current">Current Term</span>
                                                )}
                                            </div>
                                            <p>
                                                <i className="far fa-calendar" />
                                                {formatDate(term.start_date)} – {formatDate(term.end_date)}
                                            </p>
                                            <span className={`academic-badge ${term.status ? 'active' : 'inactive'}`}>
                                                {term.status ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>

                                        <div className="academic-term-actions">
                                            <button
                                                type="button"
                                                className="academic-secondary-button"
                                                onClick={() => openEditTerm(term)}
                                            >
                                                <i className="fas fa-pen" /> Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="academic-action-button"
                                                onClick={() => setTermStatus(term)}
                                                title={term.status ? 'Deactivate term' : 'Activate term'}
                                            >
                                                <i className={`fas ${term.status ? 'fa-toggle-on' : 'fa-toggle-off'}`} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}
                </section>
            )}

            {sessionModal && (
                <div className="academic-modal-backdrop" onMouseDown={(event) => {
                    if (event.target === event.currentTarget) setSessionModal(false);
                }}>
                    <div className="academic-modal" role="dialog" aria-modal="true">
                        <div className="academic-modal-header">
                            <div>
                                <span className="academic-eyebrow">ACADEMIC MANAGEMENT</span>
                                <h2>{editingSession ? 'Edit Academic Session' : 'Create Academic Session'}</h2>
                            </div>
                            <button type="button" onClick={() => setSessionModal(false)}>×</button>
                        </div>

                        <form onSubmit={saveSession}>
                            <label>
                                Session Name
                                <input
                                    type="text"
                                    placeholder="e.g. 2027/2028"
                                    value={sessionForm.name}
                                    onChange={(event) => setSessionForm({ ...sessionForm, name: event.target.value })}
                                    required
                                    maxLength={255}
                                />
                            </label>

                            <div className="academic-form-grid">
                                <label>
                                    Start Date
                                    <input
                                        type="date"
                                        value={sessionForm.start_date}
                                        onChange={(event) => setSessionForm({ ...sessionForm, start_date: event.target.value })}
                                        required
                                    />
                                </label>
                                <label>
                                    End Date
                                    <input
                                        type="date"
                                        value={sessionForm.end_date}
                                        onChange={(event) => setSessionForm({ ...sessionForm, end_date: event.target.value })}
                                        min={sessionForm.start_date || undefined}
                                        required
                                    />
                                </label>
                            </div>

                            <label className="academic-checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={sessionForm.is_current}
                                    onChange={(event) => setSessionForm({ ...sessionForm, is_current: event.target.checked })}
                                />
                                Set as current academic session
                            </label>

                            {formError && <div className="academic-form-error">{formError}</div>}

                            <div className="academic-modal-footer">
                                <button
                                    type="button"
                                    className="academic-secondary-button"
                                    onClick={() => setSessionModal(false)}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="academic-primary-button" disabled={saving}>
                                    {saving
                                        ? 'Saving...'
                                        : editingSession ? 'Save Changes' : 'Create Session'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {termModal && selectedSession && (
                <div className="academic-modal-backdrop" onMouseDown={(event) => {
                    if (event.target === event.currentTarget) setTermModal(false);
                }}>
                    <div className="academic-modal" role="dialog" aria-modal="true">
                        <div className="academic-modal-header">
                            <div>
                                <span className="academic-eyebrow">{selectedSession.name}</span>
                                <h2>{editingTerm ? 'Edit Term' : 'Add Academic Term'}</h2>
                            </div>
                            <button type="button" onClick={() => setTermModal(false)}>×</button>
                        </div>

                        <form onSubmit={saveTerm}>
                            <label>
                                Term Name
                                <input
                                    type="text"
                                    placeholder="e.g. First Term"
                                    value={termForm.name}
                                    onChange={(event) => setTermForm({ ...termForm, name: event.target.value })}
                                    required
                                    maxLength={255}
                                />
                            </label>

                            <div className="academic-form-grid">
                                <label>
                                    Start Date
                                    <input
                                        type="date"
                                        value={termForm.start_date}
                                        min={dateValue(selectedSession.start_date)}
                                        max={dateValue(selectedSession.end_date)}
                                        onChange={(event) => setTermForm({ ...termForm, start_date: event.target.value })}
                                        required
                                    />
                                </label>
                                <label>
                                    End Date
                                    <input
                                        type="date"
                                        value={termForm.end_date}
                                        min={termForm.start_date || dateValue(selectedSession.start_date)}
                                        max={dateValue(selectedSession.end_date)}
                                        onChange={(event) => setTermForm({ ...termForm, end_date: event.target.value })}
                                        required
                                    />
                                </label>
                            </div>

                            <label className="academic-checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={termForm.is_current}
                                    onChange={(event) => setTermForm({ ...termForm, is_current: event.target.checked })}
                                />
                                Set as current term
                            </label>

                            {formError && <div className="academic-form-error">{formError}</div>}

                            <div className="academic-modal-footer">
                                <button
                                    type="button"
                                    className="academic-secondary-button"
                                    onClick={() => setTermModal(false)}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="academic-primary-button" disabled={saving}>
                                    {saving
                                        ? 'Saving...'
                                        : editingTerm ? 'Save Changes' : 'Create Term'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
