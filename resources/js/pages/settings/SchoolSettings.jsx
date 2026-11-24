
import React, { useEffect, useRef, useState } from 'react';
import apiClient from '../../api/client';
import './school-settings.css';

const emptyForm = {
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
        'Something went wrong. Please try again.';
}

export default function SchoolSettings() {
    const [form, setForm] = useState(emptyForm);
    const [logo, setLogo] = useState('');
    const [logoFile, setLogoFile] = useState(null);
    const [preview, setPreview] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const fileInput = useRef(null);

    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {
        if (!notice) return undefined;

        const timer = window.setTimeout(() => setNotice(''), 4000);
        return () => window.clearTimeout(timer);
    }, [notice]);

    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    async function loadSettings() {
        try {
            setLoading(true);
            setError('');

            const response = await apiClient.get('/school-settings');
            const school = response.data?.data;

            if (!school) {
                throw new Error('School information was not returned.');
            }

            setForm({
                name: school.name || '',
                code: school.code || '',
                address: school.address || '',
                phone: school.phone || '',
                email: school.email || '',
            });

            setLogo(school.logo || '');
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }

    function updateField(event) {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
    }

    function handleLogoChange(event) {
        const file = event.target.files?.[0];

        if (!file) return;

        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/webp',
        ];

        if (!allowedTypes.includes(file.type)) {
            setError('Choose a JPG, PNG or WEBP image.');
            event.target.value = '';
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setError('The logo must not exceed 2 MB.');
            event.target.value = '';
            return;
        }

        setError('');
        setLogoFile(file);
        setPreview(URL.createObjectURL(file));
    }

    async function saveSettings(event) {
        event.preventDefault();

        try {
            setSaving(true);
            setError('');
            setNotice('');

            const payload = new FormData();

            Object.entries(form).forEach(([key, value]) => {
                payload.append(key, value);
            });

            if (logoFile) {
                payload.append('logo', logoFile);
            }

            const response = await apiClient.post(
                '/school-settings',
                payload
            );

            const school = response.data?.data;

            if (school) {
                setLogo(school.logo || '');
                setForm({
                    name: school.name || '',
                    code: school.code || '',
                    address: school.address || '',
                    phone: school.phone || '',
                    email: school.email || '',
                });
            }

            setLogoFile(null);
            setPreview('');

            if (fileInput.current) {
                fileInput.current.value = '';
            }

            setNotice(
                response.data?.message ||
                'School settings saved successfully.'
            );
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    }

    const logoUrl = preview ||
        (logo ? `/storage/${logo}` : '');

    if (loading) {
        return (
            <div className="school-settings-page">
                <div className="school-settings-loading">
                    <i className="fas fa-spinner fa-spin" />
                    <span>Loading school settings...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="school-settings-page">
            <div className="school-settings-header">
                <div>
                    <span className="school-settings-eyebrow">
                        SCHOOL ADMINISTRATION
                    </span>
                    <h1>School Settings</h1>
                    <p>
                        Manage your school's identity and official contact
                        information.
                    </p>
                </div>

                <button
                    type="submit"
                    form="school-settings-form"
                    className="school-settings-save"
                    disabled={saving}
                >
                    <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'}`} />
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {notice && (
                <div className="school-settings-alert success">
                    <i className="fas fa-check-circle" />
                    <span>{notice}</span>
                    <button type="button" onClick={() => setNotice('')}>×</button>
                </div>
            )}

            {error && (
                <div className="school-settings-alert error">
                    <i className="fas fa-exclamation-circle" />
                    <span>{error}</span>
                    <button type="button" onClick={() => setError('')}>×</button>
                </div>
            )}

            <form
                id="school-settings-form"
                onSubmit={saveSettings}
                className="school-settings-form"
            >
                <section className="school-settings-panel">
                    <div className="school-settings-panel-heading">
                        <div className="school-settings-panel-icon">
                            <i className="fas fa-school" />
                        </div>
                        <div>
                            <h2>School Identity</h2>
                            <p>
                                Basic information used across the school
                                management portal.
                            </p>
                        </div>
                    </div>

                    <div className="school-settings-logo-section">
                        <div className="school-settings-logo-preview">
                            {logoUrl ? (
                                <img src={logoUrl} alt="School logo" />
                            ) : (
                                <i className="fas fa-school" />
                            )}
                        </div>

                        <div className="school-settings-logo-info">
                            <strong>School Logo</strong>
                            <p>
                                Upload your official school logo. JPG, PNG or
                                WEBP, maximum 2 MB.
                            </p>

                            <div className="school-settings-logo-actions">
                                <button
                                    type="button"
                                    className="school-settings-secondary"
                                    onClick={() => fileInput.current?.click()}
                                >
                                    <i className="fas fa-upload" />
                                    Choose Logo
                                </button>

                                {preview && (
                                    <button
                                        type="button"
                                        className="school-settings-remove"
                                        onClick={() => {
                                            setPreview('');
                                            setLogoFile(null);
                                            if (fileInput.current) {
                                                fileInput.current.value = '';
                                            }
                                        }}
                                    >
                                        Remove selection
                                    </button>
                                )}
                            </div>

                            <input
                                ref={fileInput}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleLogoChange}
                                hidden
                            />
                        </div>
                    </div>

                    <div className="school-settings-divider" />

                    <div className="school-settings-fields">
                        <label className="school-settings-field">
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

                        <label className="school-settings-field">
                            <span>School Code <b>*</b></span>
                            <input
                                name="code"
                                value={form.code}
                                onChange={updateField}
                                placeholder="e.g. DEMO001"
                                maxLength={50}
                                required
                            />
                            <small>Must be unique across schools.</small>
                        </label>
                    </div>
                </section>

                <section className="school-settings-panel">
                    <div className="school-settings-panel-heading">
                        <div className="school-settings-panel-icon contact">
                            <i className="fas fa-address-card" />
                        </div>
                        <div>
                            <h2>Contact Information</h2>
                            <p>
                                Official contact details for parents,
                                students and staff.
                            </p>
                        </div>
                    </div>

                    <div className="school-settings-fields">
                        <label className="school-settings-field">
                            <span>Email Address</span>
                            <div className="school-settings-input-icon">
                                <i className="fas fa-envelope" />
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={updateField}
                                    placeholder="school@example.com"
                                />
                            </div>
                        </label>

                        <label className="school-settings-field">
                            <span>Phone Number</span>
                            <div className="school-settings-input-icon">
                                <i className="fas fa-phone" />
                                <input
                                    type="tel"
                                    name="phone"
                                    value={form.phone}
                                    onChange={updateField}
                                    placeholder="Enter phone number"
                                    maxLength={30}
                                />
                            </div>
                        </label>

                        <label className="school-settings-field full">
                            <span>School Address</span>
                            <textarea
                                name="address"
                                value={form.address}
                                onChange={updateField}
                                placeholder="Enter the complete school address"
                                rows={4}
                            />
                        </label>
                    </div>
                </section>

                <div className="school-settings-bottom">
                    <span>
                        <i className="fas fa-shield-alt" />
                        Changes apply to your school's profile.
                    </span>

                    <button
                        type="submit"
                        className="school-settings-save"
                        disabled={saving}
                    >
                        <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'}`} />
                        {saving ? 'Saving...' : 'Save School Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
}
