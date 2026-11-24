
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import apiClient from '../../api/client';
import './subjects.css';

export default function SubjectForm() {
    const { subjectId } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(subjectId);

    const [form, setForm] = useState({
        code: '',
        name: '',
        department_id: '',
        category: '',
        status: true,
    });
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});

    useEffect(() => {
        let active = true;

        async function loadForm() {
            try {
                const [subjectsResponse, classesResponse] = await Promise.all([
                    apiClient.get('/subjects', { params: { per_page: 100 } }),
                    apiClient.get('/academic/classes'),
                ]);

                const subjectResult = subjectsResponse.data?.data;
                const subjectRows = Array.isArray(subjectResult)
                    ? subjectResult
                    : subjectResult?.data || [];
                const classRows = Array.isArray(classesResponse.data?.data)
                    ? classesResponse.data.data
                    : [];

                const departmentMap = new Map();

                [...subjectRows, ...classRows].forEach((item) => {
                    if (item.department) {
                        departmentMap.set(item.department.id, item.department);
                    }
                });

                if (active) setDepartments([...departmentMap.values()]);

                if (isEditing) {
                    const response = await apiClient.get(`/subjects/${subjectId}`);
                    const subject = response.data?.data;

                    if (active && subject) {
                        setForm({
                            code: subject.code || '',
                            name: subject.name || '',
                            department_id: subject.department_id
                                ? String(subject.department_id)
                                : '',
                            category: subject.category || '',
                            status: Boolean(subject.status),
                        });
                    }
                }
            } catch (err) {
                if (active) {
                    setError(
                        err.response?.data?.message ||
                        'Unable to load the subject form.'
                    );
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        loadForm();
        return () => { active = false; };
    }, [isEditing, subjectId]);

    function updateField(event) {
        const { name, value, type, checked } = event.target;
        setForm((current) => ({
            ...current,
            [name]: type === 'checkbox' ? checked : value,
        }));
        setFieldErrors((current) => ({ ...current, [name]: '' }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setSaving(true);
        setError('');
        setFieldErrors({});

        const payload = {
            ...form,
            code: form.code.trim().toUpperCase(),
            name: form.name.trim(),
            department_id: form.department_id || null,
            category: form.category.trim() || null,
        };

        try {
            if (isEditing) {
                await apiClient.put(`/subjects/${subjectId}`, payload);
            } else {
                await apiClient.post('/subjects', payload);
            }

            navigate(isEditing ? `/subjects/${subjectId}` : '/subjects', {
                replace: true,
                state: { message: isEditing
                    ? 'Subject updated successfully.'
                    : 'Subject created successfully.' },
            });
        } catch (err) {
            const responseErrors = err.response?.data?.errors || {};
            setFieldErrors(
                Object.fromEntries(
                    Object.entries(responseErrors).map(([key, value]) => [
                        key,
                        Array.isArray(value) ? value[0] : value,
                    ])
                )
            );

            setError(
                err.response?.data?.message ||
                'Unable to save the subject. Check the fields and try again.'
            );
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <div className="subject-state"><i className="fas fa-spinner fa-spin" /><p>Loading subject...</p></div>;
    }

    return (
        <div className="subject-page subject-form-page">
            <Link to={isEditing ? `/subjects/${subjectId}` : '/subjects'} className="subject-back-link">
                <i className="fas fa-arrow-left" /> Back to Subjects
            </Link>

            <div className="subject-form-header">
                <span className="subject-eyebrow">ACADEMIC MANAGEMENT</span>
                <h1>{isEditing ? 'Edit Subject' : 'Add New Subject'}</h1>
                <p>{isEditing ? 'Update the subject information.' : 'Register a subject in the school catalogue.'}</p>
            </div>

            {error && <div className="subject-alert">{error}</div>}

            <form className="subject-form-card" onSubmit={handleSubmit}>
                <div className="subject-form-section-title">
                    <h2>Subject Information</h2>
                    <p>Fields marked with * are required.</p>
                </div>

                <div className="subject-form-grid">
                    <label className="subject-field">
                        <span>Subject Name *</span>
                        <input
                            name="name"
                            value={form.name}
                            onChange={updateField}
                            placeholder="e.g. Mathematics"
                            required
                            maxLength={255}
                        />
                        {fieldErrors.name && <small>{fieldErrors.name}</small>}
                    </label>

                    <label className="subject-field">
                        <span>Subject Code *</span>
                        <input
                            name="code"
                            value={form.code}
                            onChange={updateField}
                            placeholder="e.g. MTH"
                            required
                            maxLength={255}
                        />
                        {fieldErrors.code && <small>{fieldErrors.code}</small>}
                    </label>

                    <label className="subject-field">
                        <span>Department</span>
                        <select
                            name="department_id"
                            value={form.department_id}
                            onChange={updateField}
                        >
                            <option value="">No department</option>
                            {departments.map((item) => (
                                <option key={item.id} value={String(item.id)}>
                                    {item.name}
                                </option>
                            ))}
                        </select>
                        {fieldErrors.department_id && <small>{fieldErrors.department_id}</small>}
                    </label>

                    <label className="subject-field">
                        <span>Category</span>
                        <input
                            name="category"
                            value={form.category}
                            onChange={updateField}
                            placeholder="e.g. Core, Elective"
                            maxLength={255}
                        />
                        {fieldErrors.category && <small>{fieldErrors.category}</small>}
                    </label>
                </div>

                <label className="subject-checkbox-field">
                    <input
                        type="checkbox"
                        name="status"
                        checked={form.status}
                        onChange={updateField}
                    />
                    <span>
                        <strong>Active subject</strong>
                        <small>Allow this subject to be available for academic operations.</small>
                    </span>
                </label>

                <div className="subject-form-actions">
                    <Link to={isEditing ? `/subjects/${subjectId}` : '/subjects'} className="subject-secondary-button">
                        Cancel
                    </Link>
                    <button type="submit" className="subject-primary-button" disabled={saving}>
                        {saving
                            ? 'Saving...'
                            : <><i className="fas fa-save" /> {isEditing ? 'Save Changes' : 'Create Subject'}</>}
                    </button>
                </div>
            </form>
        </div>
    );
}
