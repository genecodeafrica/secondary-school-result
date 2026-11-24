
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import apiClient from '../../api/client';
import './subjects.css';

export default function SubjectDetails() {
    const { subjectId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [subject, setSubject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [updating, setUpdating] = useState(false);
    const [notice, setNotice] = useState(location.state?.message || '');

    useEffect(() => {
        let active = true;

        apiClient.get(`/subjects/${subjectId}`)
            .then((response) => {
                if (active) setSubject(response.data?.data || null);
            })
            .catch((err) => {
                if (active) {
                    setError(err.response?.data?.message || 'Unable to load subject details.');
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => { active = false; };
    }, [subjectId]);

    async function toggleStatus() {
        if (!subject) return;

        setUpdating(true);
        setError('');
        setNotice('');

        try {
            const response = await apiClient.patch(`/subjects/${subjectId}/status`, {
                status: !subject.status,
            });

            setSubject(response.data?.data || {
                ...subject,
                status: !subject.status,
            });
            setNotice('Subject status updated successfully.');
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to update subject status.');
        } finally {
            setUpdating(false);
        }
    }

    if (loading) {
        return <div className="subject-state"><i className="fas fa-spinner fa-spin" /><p>Loading subject details...</p></div>;
    }

    if (!subject) {
        return (
            <div className="subject-page">
                <Link to="/subjects" className="subject-back-link"><i className="fas fa-arrow-left" /> Back to Subjects</Link>
                <div className="subject-alert">{error || 'Subject not found.'}</div>
            </div>
        );
    }

    return (
        <div className="subject-page">
            <Link to="/subjects" className="subject-back-link">
                <i className="fas fa-arrow-left" /> Back to Subjects
            </Link>

            {notice && <div className="subject-success">{notice}</div>}
            {error && <div className="subject-alert">{error}</div>}

            <div className="subject-detail-banner">
                <div className="subject-detail-icon"><i className="fas fa-book-open" /></div>
                <div className="subject-detail-heading">
                    <span>SUBJECT PROFILE</span>
                    <h1>{subject.name}</h1>
                    <p>{subject.code} · {subject.department?.name || 'No department assigned'}</p>
                </div>
                <span className={`subject-status ${subject.status ? 'active' : 'inactive'}`}>
                    {subject.status ? 'Active' : 'Inactive'}
                </span>
            </div>

            <div className="subject-detail-grid">
                <section className="subject-detail-panel">
                    <div className="subject-detail-panel-heading">
                        <div><h2>Subject Information</h2><p>Registered subject details</p></div>
                        <i className="fas fa-circle-info" />
                    </div>

                    <div className="subject-detail-list">
                        <div><span>Subject Name</span><strong>{subject.name}</strong></div>
                        <div><span>Subject Code</span><strong>{subject.code}</strong></div>
                        <div><span>Department</span><strong>{subject.department?.name || 'Not assigned'}</strong></div>
                        <div><span>Category</span><strong>{subject.category || 'Not specified'}</strong></div>
                        <div><span>Assigned Classes</span><strong>{subject.classes?.length ?? 0}</strong></div>
                        <div><span>Status</span><strong>{subject.status ? 'Active' : 'Inactive'}</strong></div>
                    </div>

                    <div className="subject-detail-actions">
                        <Link to={`/subjects/${subject.id}/edit`} className="subject-primary-button">
                            <i className="fas fa-pen" /> Edit Subject
                        </Link>
                        <button
                            type="button"
                            className="subject-secondary-button"
                            onClick={toggleStatus}
                            disabled={updating}
                        >
                            {updating ? 'Updating...' : subject.status ? 'Deactivate' : 'Activate'}
                        </button>
                    </div>
                </section>

                <section className="subject-detail-panel">
                    <div className="subject-detail-panel-heading">
                        <div><h2>Class Assignments</h2><p>Classes using this subject</p></div>
                        <i className="fas fa-chalkboard" />
                    </div>

                    {!subject.classes?.length ? (
                        <div className="subject-state compact">
                            <i className="fas fa-book-open" />
                            <p>No class assignments were returned.</p>
                        </div>
                    ) : (
                        <div className="subject-assigned-class-list">
                            {subject.classes.map((item) => (
                                <div key={`${item.id}-${item.pivot?.academic_session_id}`} className="subject-assigned-class">
                                    <div className="subject-row-icon"><i className="fas fa-school" /></div>
                                    <div><strong>{item.name}</strong><span>{item.department?.name || 'Department not assigned'}</span></div>
                                    <span className="subject-code">Session {item.pivot?.academic_session_id ?? '—'}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="subject-detail-actions">
                        <button
                            type="button"
                            className="subject-primary-button"
                            onClick={() => navigate(`/subjects/${subject.id}/assignments`)}
                        >
                            <i className="fas fa-link" /> Manage Assignments
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
