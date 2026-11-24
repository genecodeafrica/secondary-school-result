
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

function errorMessage(error) {
    const validationErrors = error.response?.data?.errors;

    if (validationErrors) {
        return Object.values(validationErrors).flat().join(' ');
    }

    return (
        error.response?.data?.message ||
        'The request failed. Please check your details and try again.'
    );
}

export default function StudentForm() {
    const { studentId } = useParams();
    const navigate = useNavigate();
    const editing = Boolean(studentId);

    const [form, setForm] = useState({
        admission_number: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        gender: '',
        date_of_birth: '',
        phone: '',
        email: '',
        address: '',
        status: true,
        class_id: '',
        academic_session_id: '',
        term_id: '',
    });

    const [classes, setClasses] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [terms, setTerms] = useState([]);
    const [photo, setPhoto] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [existingPhoto, setExistingPhoto] = useState('');

    useEffect(() => {
        let cancelled = false;

        async function initialise() {
            setLoading(true);
            setError('');

            try {
                const [classesResponse, sessionsResponse] =
                    await Promise.all([
                        apiClient.get('/academic/classes'),
                        apiClient.get('/academic/sessions'),
                    ]);

                if (cancelled) return;

                setClasses(extractList(classesResponse.data));
                setSessions(extractList(sessionsResponse.data));

                if (editing) {
                    const response = await apiClient.get(
                        `/students/${studentId}`
                    );

                    if (cancelled) return;

                    const student = response.data?.data;

                    if (!student) {
                        throw new Error('Student record was not returned.');
                    }

                    setForm((current) => ({
                        ...current,
                        admission_number: student.admission_number ?? '',
                        first_name: student.first_name ?? '',
                        middle_name: student.middle_name ?? '',
                        last_name: student.last_name ?? '',
                        gender: student.gender ?? '',
                        date_of_birth: student.date_of_birth
                            ? String(student.date_of_birth).slice(0, 10)
                            : '',
                        phone: student.phone ?? '',
                        email: student.email ?? '',
                        address: student.address ?? '',
                        status: Boolean(student.status),
                    }));

                    setExistingPhoto(student.photo ?? '');
                }
            } catch (err) {
                if (!cancelled) {
                    setError(errorMessage(err));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        initialise();

        return () => {
            cancelled = true;
        };
    }, [editing, studentId]);

    useEffect(() => {
        let cancelled = false;

        async function loadTerms() {
            setTerms([]);

            if (!form.academic_session_id) return;

            try {
                const response = await apiClient.get(
                    `/academic/sessions/${form.academic_session_id}/terms`
                );

                if (!cancelled) {
                    setTerms(extractList(response.data));
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        errorMessage(err) ||
                        'Unable to load terms for this session.'
                    );
                }
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

        const hasAnyEnrollmentField = Boolean(
            form.class_id ||
            form.academic_session_id ||
            form.term_id
        );

        if (
            hasAnyEnrollmentField &&
            (!form.class_id ||
                !form.academic_session_id ||
                !form.term_id)
        ) {
            setError(
                'To enrol this student now, select the class, academic session, and term. Otherwise, leave all three blank.'
            );
            return;
        }

        setSaving(true);

        try {
            const body = new FormData();

            [
                'admission_number',
                'first_name',
                'middle_name',
                'last_name',
                'gender',
                'date_of_birth',
                'phone',
                'email',
                'address',
            ].forEach((field) => {
                body.append(field, form[field] ?? '');
            });

            body.append('status', form.status ? '1' : '0');

            if (photo) {
                body.append('photo', photo);
            }

            if (!editing && hasAnyEnrollmentField) {
                body.append('class_id', form.class_id);
                body.append(
                    'academic_session_id',
                    form.academic_session_id
                );
                body.append('term_id', form.term_id);
            }

            if (editing) {
                body.append('_method', 'PUT');

                await apiClient.post(`/students/${studentId}`, body);
            } else {
                await apiClient.post('/students', body);
            }

            navigate('/students', {
                state: {
                    message: editing
                        ? 'Student updated successfully.'
                        : 'Student registered successfully.',
                },
            });
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="student-page">
                <div className="student-panel student-form-loading">
                    Loading student information...
                </div>
            </div>
        );
    }

    return (
        <div className="student-page">
            <div className="student-page-heading">
                <div>
                    <p className="student-eyebrow">STUDENT MANAGEMENT</p>
                    <h1>{editing ? 'Edit Student' : 'Register Student'}</h1>
                    <p className="student-subtitle">
                        {editing
                            ? 'Update the student’s personal information.'
                            : 'Enter the student’s details to create a school record.'}
                    </p>
                </div>

                <Link to="/students" className="student-secondary-button">
                    Back to Students
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
                        <h2>Personal Information</h2>
                        <p>Fields marked with * are required.</p>
                    </div>
                </div>

                <div className="student-form-grid">
                    <label>
                        Admission Number *
                        <input
                            name="admission_number"
                            value={form.admission_number}
                            onChange={updateField}
                            required
                            maxLength={255}
                            placeholder="e.g. SCH/2026/001"
                        />
                    </label>

                    <label>
                        First Name *
                        <input
                            name="first_name"
                            value={form.first_name}
                            onChange={updateField}
                            required
                            maxLength={255}
                            autoComplete="given-name"
                        />
                    </label>

                    <label>
                        Middle Name
                        <input
                            name="middle_name"
                            value={form.middle_name}
                            onChange={updateField}
                            maxLength={255}
                        />
                    </label>

                    <label>
                        Last Name *
                        <input
                            name="last_name"
                            value={form.last_name}
                            onChange={updateField}
                            required
                            maxLength={255}
                            autoComplete="family-name"
                        />
                    </label>

                    <label>
                        Gender *
                        <select
                            name="gender"
                            value={form.gender}
                            onChange={updateField}
                            required
                        >
                            <option value="">Select gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </label>

                    <label>
                        Date of Birth
                        <input
                            type="date"
                            name="date_of_birth"
                            value={form.date_of_birth}
                            onChange={updateField}
                            max={new Date().toISOString().slice(0, 10)}
                        />
                    </label>

                    <label>
                        Phone Number
                        <input
                            type="tel"
                            name="phone"
                            value={form.phone}
                            onChange={updateField}
                            maxLength={255}
                            autoComplete="tel"
                        />
                    </label>

                    <label>
                        Email Address
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={updateField}
                            maxLength={255}
                            autoComplete="email"
                        />
                    </label>

                    <label className="student-full-width">
                        Home Address
                        <textarea
                            name="address"
                            value={form.address}
                            onChange={updateField}
                            rows={3}
                            maxLength={255}
                        />
                    </label>

                    <label className="student-full-width">
                        Student Photo
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => {
                                setPhoto(event.target.files?.[0] ?? null);
                            }}
                        />
                        <small>
                            Optional. Maximum file size: 2 MB.
                            {existingPhoto
                                ? ' A photo is already saved; choose a new file to replace it.'
                                : ''}
                        </small>
                    </label>
                </div>

                {!editing && (
                    <>
                        <div className="student-form-section">
                            <h2>Initial Class Enrolment</h2>
                            <p>
                                Optional. Leave all three fields blank if you
                                want to enrol the student later.
                            </p>
                        </div>

                        <div className="student-form-grid">
                            <label>
                                Class
                                <select
                                    name="class_id"
                                    value={form.class_id}
                                    onChange={updateField}
                                >
                                    <option value="">Select class</option>
                                    {classes.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name}
                                            {item.section
                                                ? ` - ${item.section}`
                                                : ''}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                Academic Session
                                <select
                                    name="academic_session_id"
                                    value={form.academic_session_id}
                                    onChange={updateField}
                                >
                                    <option value="">Select session</option>
                                    {sessions.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name}
                                            {item.is_current
                                                ? ' (Current)'
                                                : ''}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                Term
                                <select
                                    name="term_id"
                                    value={form.term_id}
                                    onChange={updateField}
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
                    </>
                )}

                <div className="student-form-section">
                    <h2>Account Status</h2>

                    <label className="student-checkbox-label">
                        <input
                            type="checkbox"
                            name="status"
                            checked={form.status}
                            onChange={updateField}
                        />
                        Student is active
                    </label>
                </div>

                <div className="student-form-actions">
                    <Link to="/students" className="student-secondary-button">
                        Cancel
                    </Link>

                    <button
                        type="submit"
                        className="student-primary-button"
                        disabled={saving}
                    >
                        {saving
                            ? 'Saving...'
                            : editing
                                ? 'Save Changes'
                                : 'Register Student'}
                    </button>
                </div>
            </form>
        </div>
    );
}
