import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import './schools.css';

const emptyForm = {
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
    admin_password_confirmation: '',
};

const emptyEditForm = {
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
};

function getErrorMessage(error) {
    const errors = error.response?.data?.errors;

    if (errors) {
        return Object.values(errors).flat().join(' ');
    }

    return error.response?.data?.message ||
        error.message ||
        'Something went wrong. Please try again.';
}

export default function Schools() {
    const [schools, setSchools] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editForm, setEditForm] = useState(emptyEditForm);
    const [editingSchool, setEditingSchool] = useState(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [statusLoading, setStatusLoading] = useState(null);

    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        loadSchools();
    }, []);

    async function loadSchools() {
        try {
            setLoading(true);
            setError('');

            const response = await apiClient.get('/schools');
            const data = response.data?.data;

            setSchools(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }

    function updateField(event) {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    }

    function updateEditField(event) {
        const { name, value } = event.target;

        setEditForm((current) => ({
            ...current,
            [name]: value,
        }));
    }

    async function createSchool(event) {
        event.preventDefault();

        try {
            setSaving(true);
            setError('');
            setNotice('');

            const response = await apiClient.post('/schools', form);

            setForm(emptyForm);
            setShowForm(false);

            setNotice(
                response.data?.message ||
                'School and initial School Admin account created successfully.'
            );

            await loadSchools();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    }

    function openEditForm(school) {
        setEditingSchool(school);

        setEditForm({
            name: school.name || '',
            code: school.code || '',
            address: school.address || '',
            phone: school.phone || '',
            email: school.email || '',
        });

        setError('');
        setNotice('');
    }

    function closeEditForm() {
        setEditingSchool(null);
        setEditForm(emptyEditForm);
    }

    async function updateSchool(event) {
        event.preventDefault();

        if (!editingSchool) return;

        try {
            setSaving(true);
            setError('');
            setNotice('');

            const response = await apiClient.put(
                `/schools/${editingSchool.id}`,
                editForm
            );

            setNotice(
                response.data?.message || 'School updated successfully.'
            );

            closeEditForm();
            await loadSchools();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    }

    async function toggleSchoolStatus(school) {
        const activating = !Boolean(school.status);

        const confirmed = window.confirm(
            activating
                ? `Are you sure you want to activate ${school.name}?`
                : `Are you sure you want to deactivate ${school.name}? Its users will be logged out and will not be able to log in until the school is activated again.`
        );

        if (!confirmed) return;

        try {
            setStatusLoading(school.id);
            setError('');
            setNotice('');

            const response = await apiClient.patch(
                `/schools/${school.id}/status`,
                { status: activating }
            );

            setNotice(
                response.data?.message ||
                `School ${activating ? 'activated' : 'deactivated'} successfully.`
            );

            await loadSchools();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setStatusLoading(null);
        }
    }

    const activeSchools = schools.filter(
        (school) => Boolean(school.status)
    ).length;

    const inactiveSchools = schools.length - activeSchools;

    return (
        <div className="schools-page">
            <div className="schools-header">
                <div>
                    <span className="schools-eyebrow">
                        SUPER ADMINISTRATION
                    </span>
                    <h1>Schools</h1>
                    <p>
                        Register, edit and manage schools on the platform.
                    </p>
                </div>

                <button
                    type="button"
                    className="schools-primary-button"
                    onClick={() => {
                        setError('');
                        setNotice('');
                        setShowForm((current) => !current);
                    }}
                >
                    <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'}`} />
                    {showForm ? 'Close Form' : 'Register School'}
                </button>
            </div>

            {notice && (
                <div className="schools-alert success">
                    <i className="fas fa-check-circle" />
                    <span>{notice}</span>
                    <button
                        type="button"
                        aria-label="Dismiss notification"
                        onClick={() => setNotice('')}
                    >
                        ×
                    </button>
                </div>
            )}

            {error && (
                <div className="schools-alert error">
                    <i className="fas fa-exclamation-circle" />
                    <span>{error}</span>
                    <button
                        type="button"
                        aria-label="Dismiss error"
                        onClick={() => setError('')}
                    >
                        ×
                    </button>
                </div>
            )}

            <div className="schools-stats">
                <div className="schools-stat-card">
                    <div className="schools-stat-icon">
                        <i className="fas fa-school" />
                    </div>
                    <div>
                        <span>Registered Schools</span>
                        <strong>{loading ? '—' : schools.length}</strong>
                    </div>
                </div>

                <div className="schools-stat-card">
                    <div className="schools-stat-icon active">
                        <i className="fas fa-check-circle" />
                    </div>
                    <div>
                        <span>Active Schools</span>
                        <strong>{loading ? '—' : activeSchools}</strong>
                    </div>
                </div>

                <div className="schools-stat-card">
                    <div className="schools-stat-icon">
                        <i className="fas fa-ban" />
                    </div>
                    <div>
                        <span>Inactive Schools</span>
                        <strong>{loading ? '—' : inactiveSchools}</strong>
                    </div>
                </div>
            </div>

            {showForm && (
                <section className="schools-panel">
                    <div className="schools-panel-heading">
                        <div className="schools-panel-icon">
                            <i className="fas fa-university" />
                        </div>
                        <div>
                            <h2>Register a New School</h2>
                            <p>
                                Enter the school's details and create its initial School Admin account.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={createSchool}>
                        <div className="schools-form-section">
                            <h3>School Information</h3>

                            <div className="schools-fields">
                                <label className="schools-field">
                                    <span>School Name <b>*</b></span>
                                    <input
                                        name="name"
                                        value={form.name}
                                        onChange={updateField}
                                        placeholder="Enter school name"
                                        maxLength={255}
                                        required
                                    />
                                </label>

                                <label className="schools-field">
                                    <span>School Code <b>*</b></span>
                                    <input
                                        name="code"
                                        value={form.code}
                                        onChange={updateField}
                                        placeholder="e.g. SCH001"
                                        maxLength={50}
                                        required
                                    />
                                </label>

                                <label className="schools-field">
                                    <span>School Email</span>
                                    <input
                                        type="email"
                                        name="email"
                                        value={form.email}
                                        onChange={updateField}
                                        placeholder="school@example.com"
                                    />
                                </label>

                                <label className="schools-field">
                                    <span>Phone Number</span>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={form.phone}
                                        onChange={updateField}
                                        placeholder="Enter phone number"
                                        maxLength={30}
                                    />
                                </label>

                                <label className="schools-field full">
                                    <span>School Address</span>
                                    <textarea
                                        name="address"
                                        value={form.address}
                                        onChange={updateField}
                                        placeholder="Enter school address"
                                        rows={3}
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="schools-form-section">
                            <h3>Initial School Admin Account</h3>
                            <p className="schools-section-description">
                                This administrator will manage daily operations within the newly registered school.
                            </p>

                            <div className="schools-fields">
                                <label className="schools-field">
                                    <span>Administrator Name <b>*</b></span>
                                    <input
                                        name="admin_name"
                                        value={form.admin_name}
                                        onChange={updateField}
                                        placeholder="Full name"
                                        maxLength={255}
                                        required
                                    />
                                </label>

                                <label className="schools-field">
                                    <span>Administrator Email <b>*</b></span>
                                    <input
                                        type="email"
                                        name="admin_email"
                                        value={form.admin_email}
                                        onChange={updateField}
                                        placeholder="admin@school.com"
                                        required
                                    />
                                </label>

                                <label className="schools-field">
                                    <span>Password <b>*</b></span>
                                    <input
                                        type="password"
                                        name="admin_password"
                                        value={form.admin_password}
                                        onChange={updateField}
                                        placeholder="Minimum 8 characters"
                                        minLength={8}
                                        autoComplete="new-password"
                                        required
                                    />
                                </label>

                                <label className="schools-field">
                                    <span>Confirm Password <b>*</b></span>
                                    <input
                                        type="password"
                                        name="admin_password_confirmation"
                                        value={form.admin_password_confirmation}
                                        onChange={updateField}
                                        placeholder="Re-enter password"
                                        minLength={8}
                                        autoComplete="new-password"
                                        required
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="schools-form-actions">
                            <button
                                type="button"
                                className="schools-secondary-button"
                                onClick={() => {
                                    setForm(emptyForm);
                                    setShowForm(false);
                                    setError('');
                                }}
                                disabled={saving}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="schools-primary-button"
                                disabled={saving}
                            >
                                <i className={`fas ${
                                    saving ? 'fa-spinner fa-spin' : 'fa-save'
                                }`} />
                                {saving ? 'Registering...' : 'Create School'}
                            </button>
                        </div>
                    </form>
                </section>
            )}

            {editingSchool && (
                <section className="schools-panel">
                    <div className="schools-panel-heading">
                        <div className="schools-panel-icon">
                            <i className="fas fa-edit" />
                        </div>
                        <div>
                            <h2>Edit School</h2>
                            <p>Update the details for {editingSchool.name}.</p>
                        </div>
                    </div>

                    <form onSubmit={updateSchool}>
                        <div className="schools-form-section">
                            <div className="schools-fields">
                                <label className="schools-field">
                                    <span>School Name <b>*</b></span>
                                    <input
                                        name="name"
                                        value={editForm.name}
                                        onChange={updateEditField}
                                        maxLength={255}
                                        required
                                    />
                                </label>

                                <label className="schools-field">
                                    <span>School Code <b>*</b></span>
                                    <input
                                        name="code"
                                        value={editForm.code}
                                        onChange={updateEditField}
                                        maxLength={50}
                                        required
                                    />
                                </label>

                                <label className="schools-field">
                                    <span>School Email</span>
                                    <input
                                        type="email"
                                        name="email"
                                        value={editForm.email}
                                        onChange={updateEditField}
                                    />
                                </label>

                                <label className="schools-field">
                                    <span>Phone Number</span>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={editForm.phone}
                                        onChange={updateEditField}
                                        maxLength={30}
                                    />
                                </label>

                                <label className="schools-field full">
                                    <span>School Address</span>
                                    <textarea
                                        name="address"
                                        value={editForm.address}
                                        onChange={updateEditField}
                                        rows={3}
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="schools-form-actions">
                            <button
                                type="button"
                                className="schools-secondary-button"
                                onClick={closeEditForm}
                                disabled={saving}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="schools-primary-button"
                                disabled={saving}
                            >
                                <i className={`fas ${
                                    saving ? 'fa-spinner fa-spin' : 'fa-save'
                                }`} />
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </section>
            )}

            <section className="schools-panel">
                <div className="schools-list-heading">
                    <div>
                        <h2>Registered Schools</h2>
                        <p>Manage school details and account status.</p>
                    </div>

                    <button
                        type="button"
                        className="schools-refresh-button"
                        onClick={loadSchools}
                        disabled={loading}
                        title="Refresh schools"
                    >
                        <i className={`fas ${
                            loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'
                        }`} />
                        Refresh
                    </button>
                </div>

                {loading ? (
                    <div className="schools-empty">
                        <i className="fas fa-spinner fa-spin" />
                        <span>Loading registered schools...</span>
                    </div>
                ) : schools.length === 0 ? (
                    <div className="schools-empty">
                        <i className="fas fa-school" />
                        <strong>No schools registered yet</strong>
                        <span>Register the first school to get started.</span>
                    </div>
                ) : (
                    <div className="schools-table-wrap">
                        <table className="schools-table">
                            <thead>
                                <tr>
                                    <th>School</th>
                                    <th>School Code</th>
                                    <th>Contact</th>
                                    <th>Users</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {schools.map((school) => (
                                    <tr key={school.id}>
                                        <td>
                                            <div className="schools-name-cell">
                                                <div className="schools-row-icon">
                                                    <i className="fas fa-school" />
                                                </div>
                                                <div>
                                                    <strong>{school.name}</strong>
                                                    <span>
                                                        {school.address || 'No address provided'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        <td>
                                            <span className="schools-code">
                                                {school.code}
                                            </span>
                                        </td>

                                        <td>
                                            <div className="schools-contact">
                                                <span>{school.email || '—'}</span>
                                                <span>{school.phone || '—'}</span>
                                            </div>
                                        </td>

                                        <td>{school.users_count ?? 0}</td>

                                        <td>
                                            <span className={`schools-status ${
                                                school.status ? 'enabled' : 'disabled'
                                            }`}>
                                                {school.status ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>

                                        <td>
                                            <div style={{
                                                display: 'flex',
                                                gap: '6px',
                                                flexWrap: 'wrap',
                                            }}>
                                                <button
                                                    type="button"
                                                    className="schools-secondary-button"
                                                    style={{ padding: '7px 10px' }}
                                                    onClick={() => openEditForm(school)}
                                                    title="Edit school"
                                                >
                                                    <i className="fas fa-edit" />
                                                    Edit
                                                </button>

                                                <button
                                                    type="button"
                                                    className="schools-secondary-button"
                                                    style={{
                                                        padding: '7px 10px',
                                                        color: school.status ? '#dc2626' : '#15803d',
                                                    }}
                                                    onClick={() => toggleSchoolStatus(school)}
                                                    disabled={statusLoading === school.id}
                                                >
                                                    <i className={`fas ${
                                                        statusLoading === school.id
                                                            ? 'fa-spinner fa-spin'
                                                            : school.status
                                                                ? 'fa-ban'
                                                                : 'fa-check-circle'
                                                    }`} />
                                                    {statusLoading === school.id
                                                        ? 'Please wait...'
                                                        : school.status
                                                            ? 'Deactivate'
                                                            : 'Activate'}
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
        </div>
    );
}
