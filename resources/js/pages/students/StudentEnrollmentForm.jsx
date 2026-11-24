
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import apiClient from '../../api/client';
import './students.css';

function extractList(payload) {
    const data = payload?.data;

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;

    return [];
}

function getError(error) {
    const validationErrors = error.response?.data?.errors;

    if (validationErrors) {
        return Object.values(validationErrors).flat().join(' ');
    }

    return error.response?.data?.message ||
        'Unable to complete the enrolment request.';
}

export default function StudentEnrollmentForm() {
    const { studentId } = useParams();
    const navigate = useNavigate();

    const [student, setStudent] = useState(null);
    const [classes, setClasses] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [terms, setTerms] = useState([]);

    const [form, setForm] = useState({
        class_id: '',
        academic_session_id: '',
        term_id: '',
        is_current: true,
        status: true,
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;

        async function initialise() {
            setLoading(true);
            setError('');

            try {
                const [studentResponse, classesResponse, sessionsResponse] =
                    await Promise.all([
                        apiClient.get(`/students/${studentId}`),
                        apiClient.get('/academic/classes'),
                        apiClient.get('/academic/sessions'),
                    ]);

                if (cancelled) return;

                setStudent(studentResponse.data?.data ?? null);
                setClasses(extractList(classesResponse.data));
                setSessions(extractList(sessionsResponse.data));
            } catch (err) {
                if (!cancelled) setError(getError(err));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        initialise();

        return () => {
            cancelled = true;
        };
    }, [studentId]);

    useEffect(() => {
        let cancelled = false;

        async function loadTerms() {
            setTerms([]);

            if (!form.academic_session_id) return;

            try {
                const response = await apiClient.get(
                    `/academic/sessions/${form.academic_session_id}/terms`
                );

                if (!cancelled) setTerms(extractList(response.data));
            } catch (err) {
                if (!cancelled) setError(getError(err));
            }
        }

        loadTerms();

        return () => {
            cancelled = true;
        };
    }, [form.academic_session_id]);

    function updateField(event) {
        const { name, value, type, checked } = event.target;

        setForm((current) => ({
            ...current,
            [name]: type === 'checkbox' ? checked : value,
            ...(name === 'academic_session_id' ? { term_id: '' } : {}),
        }));
    }

    async function submitForm(event) {
        event.preventDefault();
        setError('');

        setSaving(true);

        try {
            await apiClient.post(`/students/${studentId}/enrollments`, {
                class_id: Number(form.class_id),
                academic_session_id: Number(form.academic_session_id),
                term_id: Number(form.term_id),
                is_current: form.is_current,
                status: form.status,
            });

            navigate(`/students/${studentId}`);
        } catch (err) {
            setError(getError(err));
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="student-page">
                <div className="student-panel student-form-loading">
                    Loading enrolment information...
                </div>
            </div>
        );
    }

    return (
        <div className="student-page">
            <div className="student-page-heading">
                <div>
                    <p className="student-eyebrow">STUDENT MANAGEMENT</p>
                    <h1>Enrol Student</h1>
                    <p className="student-subtitle">
                        {student
                            ? `Create a class enrolment for ${student.first_name} ${student.last_name}.`
                            : 'Create a class enrolment.'}
                    </p>
                </div>

                <Link
                    to={`/students/${studentId}`}
                    className="student-secondary-button"
                >
                    Back to Profile
                </Link>
            </div>

            {error && (
                <div className="student-alert student-alert-error">
                    {error}
                </div>
            )}

            <form className="student-panel student-form" onSubmit={submitForm}>
                <div className="student-panel-heading">
                    <div>
                        <h2>Enrolment Details</h2>
                        <p>Select the student's class, academic session, and term.</p>
                    </div>
                </div>

                <div className="student-form-grid">
                    <label>
                        Class *
                        <select
                            name="class_id"
                            value={form.class_id}
                            onChange={updateField}
                            required
                        >
                            <option value="">Select class</option>

                            {classes.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                    {item.section ? ` - ${item.section}` : ''}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Academic Session *
                        <select
                            name="academic_session_id"
                            value={form.academic_session_id}
                            onChange={updateField}
                            required
                        >
                            <option value="">Select session</option>

                            {sessions.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                    {item.is_current ? ' (Current)' : ''}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Term *
                        <select
                            name="term_id"
                            value={form.term_id}
                            onChange={updateField}
                            required
                            disabled={!form.academic_session_id}
                        >
                            <option value="">Select term</option>

                            {terms.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className="student-form-section">
                    <h2>Enrolment Options</h2>

                    <label className="student-checkbox-label">
                        <input
                            type="checkbox"
                            name="is_current"
                            checked={form.is_current}
                            onChange={updateField}
                        />
                        Set as the student's current enrolment
                    </label>

                    <label className="student-checkbox-label">
                        <input
                            type="checkbox"
                            name="status"
                            checked={form.status}
                            onChange={updateField}
                        />
                        Enrolment is active
                    </label>
                </div>

                <div className="student-form-actions">
                    <Link
                        to={`/students/${studentId}`}
                        className="student-secondary-button"
                    >
                        Cancel
                    </Link>

                    <button
                        type="submit"
                        className="student-primary-button"
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save Enrolment'}
                    </button>
                </div>
            </form>
        </div>
    );
}
