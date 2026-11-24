
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import apiClient from '../../api/client';
import './subjects.css';

export default function SubjectAssignments() {
    const { subjectId } = useParams();

    const [subject, setSubject] = useState(null);
    const [classes, setClasses] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [sessionId, setSessionId] = useState('');
    const [selectedClasses, setSelectedClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    useEffect(() => {
        let active = true;

        async function loadData() {
            try {
                setLoading(true);
                setError('');

                const [subjectResponse, classResponse, sessionResponse, assignmentResponse] =
                    await Promise.all([
                        apiClient.get(`/subjects/${subjectId}`),
                        apiClient.get('/academic/classes'),
                        apiClient.get('/academic/sessions'),
                        apiClient.get(`/subjects/${subjectId}/assignments`),
                    ]);

                const classRows = Array.isArray(classResponse.data?.data)
                    ? classResponse.data.data
                    : [];
                const sessionRows = Array.isArray(sessionResponse.data?.data)
                    ? sessionResponse.data.data
                    : [];
                const assignedRows = Array.isArray(assignmentResponse.data?.data)
                    ? assignmentResponse.data.data
                    : [];

                const currentSession =
                    sessionRows.find((item) => item.is_current || item.current) ||
                    sessionRows[0];

                if (!active) return;

                setSubject(subjectResponse.data?.data || null);
                setClasses(classRows);
                setSessions(sessionRows);

                if (currentSession) {
                    setSessionId(String(currentSession.id));
                    setSelectedClasses(
                        assignedRows
                            .filter((item) =>
                                String(item.pivot?.academic_session_id) === String(currentSession.id)
                            )
                            .map((item) => String(item.id))
                    );
                }
            } catch (err) {
                if (active) {
                    setError(
                        err.response?.data?.message ||
                        'Unable to load subject assignments.'
                    );
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        loadData();
        return () => { active = false; };
    }, [subjectId]);

    function changeSession(value) {
        setSessionId(value);
        setSelectedClasses([]);
        setNotice('');
    }

    function toggleClass(classId) {
        const id = String(classId);

        setSelectedClasses((current) =>
            current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id]
        );
    }

    async function saveAssignments(event) {
        event.preventDefault();

        if (!sessionId) {
            setError('Select an academic session first.');
            return;
        }

        setSaving(true);
        setError('');
        setNotice('');

        try {
            await apiClient.put(`/subjects/${subjectId}/assignments`, {
                academic_session_id: Number(sessionId),
                class_ids: selectedClasses.map(Number),
            });

            setNotice('Class assignments saved successfully.');
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Unable to save class assignments.'
            );
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <div className="subject-state"><i className="fas fa-spinner fa-spin" /><p>Loading assignments...</p></div>;
    }

    if (!subject) {
        return (
            <div className="subject-page">
                <Link to="/subjects" className="subject-back-link">Back to Subjects</Link>
                <div className="subject-alert">{error || 'Subject not found.'}</div>
            </div>
        );
    }

    return (
        <div className="subject-page">
            <Link to={`/subjects/${subjectId}`} className="subject-back-link">
                <i className="fas fa-arrow-left" /> Back to Subject
            </Link>

            <div className="subject-form-header">
                <span className="subject-eyebrow">ACADEMIC MANAGEMENT</span>
                <h1>Class-Subject Assignments</h1>
                <p>Choose the classes that will study {subject.name}.</p>
            </div>

            {error && <div className="subject-alert">{error}</div>}
            {notice && <div className="subject-success">{notice}</div>}

            <form className="subject-form-card" onSubmit={saveAssignments}>
                <div className="subject-assignment-subject">
                    <div className="subject-detail-icon"><i className="fas fa-book-open" /></div>
                    <div><span>Selected Subject</span><h2>{subject.name}</h2><p>Code: {subject.code}</p></div>
                </div>

                <label className="subject-field subject-session-field">
                    <span>Academic Session *</span>
                    <select
                        value={sessionId}
                        onChange={(event) => changeSession(event.target.value)}
                        required
                    >
                        <option value="">Select academic session</option>
                        {sessions.map((session) => (
                            <option key={session.id} value={String(session.id)}>
                                {session.name}{session.is_current || session.current ? ' (Current)' : ''}
                            </option>
                        ))}
                    </select>
                </label>

                <div className="subject-assignment-heading">
                    <div><h2>Choose Classes</h2><p>Select every class that should study this subject in the selected session.</p></div>
                    <span>{selectedClasses.length} selected</span>
                </div>

                {classes.length === 0 ? (
                    <div className="subject-state compact"><p>No classes are available.</p></div>
                ) : (
                    <div className="subject-class-checkbox-grid">
                        {classes.map((item) => (
                            <label key={item.id} className={`subject-class-checkbox ${selectedClasses.includes(String(item.id)) ? 'selected' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={selectedClasses.includes(String(item.id))}
                                    onChange={() => toggleClass(item.id)}
                                />
                                <div className="subject-class-check-icon"><i className="fas fa-school" /></div>
                                <div>
                                    <strong>{item.name}</strong>
                                    <span>{item.department?.name || 'Department not assigned'}</span>
                                    {item.section && <small>Section {item.section}</small>}
                                </div>
                                <i className="fas fa-check-circle subject-class-check-mark" />
                            </label>
                        ))}
                    </div>
                )}

                <div className="subject-form-actions">
                    <Link to={`/subjects/${subjectId}`} className="subject-secondary-button">Cancel</Link>
                    <button type="submit" className="subject-primary-button" disabled={saving || !sessionId}>
                        {saving ? 'Saving Assignments...' : <><i className="fas fa-save" /> Save Assignments</>}
                    </button>
                </div>
            </form>
        </div>
    );
}
