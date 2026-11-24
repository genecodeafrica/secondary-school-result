
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../../api/client";
import "./teachers.css";

const initialForm = {
    teacher_id: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    phone: "",
    email: "",
    password: "",
    password_confirmation: "",
    status: true,
};

function getErrorMessage(error) {
    const errors = error?.response?.data?.errors;

    if (errors) {
        return Object.values(errors).flat().join(" ");
    }

    return (
        error?.response?.data?.message ||
        error?.message ||
        "Unable to save the teacher. Please try again."
    );
}

function getResponseData(response) {
    return response?.data?.data ?? response?.data;
}

function toFormValues(teacher) {
    const user = teacher?.user ?? {};

    return {
        teacher_id: teacher?.teacher_id ?? "",
        first_name: teacher?.first_name ?? "",
        middle_name: teacher?.middle_name ?? "",
        last_name: teacher?.last_name ?? "",
        phone: teacher?.phone ?? "",
        email: teacher?.email ?? user?.email ?? "",
        password: "",
        password_confirmation: "",
        status:
            teacher?.status === true ||
            teacher?.status === 1 ||
            teacher?.status === "1",
    };
}

export default function TeacherForm() {
    const { teacherId } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(teacherId);

    const [form, setForm] = useState(initialForm);
    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});

    useEffect(() => {
        let cancelled = false;

        async function loadTeacher() {
            if (!isEditing) {
                setLoading(false);
                return;
            }

            setLoading(true);
            setError("");

            try {
                const response = await api.get(`/teachers/${teacherId}`);
                const data = getResponseData(response);
                const teacher = data?.teacher ?? data;

                if (!teacher || typeof teacher !== "object") {
                    throw new Error("The teacher record could not be loaded.");
                }

                if (!cancelled) {
                    setForm(toFormValues(teacher));
                }
            } catch (err) {
                if (!cancelled) {
                    setError(getErrorMessage(err));
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadTeacher();

        return () => {
            cancelled = true;
        };
    }, [teacherId, isEditing]);

    function handleChange(event) {
        const { name, value, type, checked } = event.target;

        setForm((current) => ({
            ...current,
            [name]: type === "checkbox" ? checked : value,
        }));

        setFieldErrors((current) => ({
            ...current,
            [name]: undefined,
        }));
    }

    function validateForm() {
        const errors = {};

        if (!form.teacher_id.trim()) {
            errors.teacher_id = "Staff ID is required.";
        }

        if (!form.first_name.trim()) {
            errors.first_name = "First name is required.";
        }

        if (!form.last_name.trim()) {
            errors.last_name = "Last name is required.";
        }

        if (!form.email.trim()) {
            errors.email = "Email address is required.";
        } else if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
        ) {
            errors.email = "Enter a valid email address.";
        }

        if (!isEditing && !form.password) {
            errors.password = "A password is required for a new teacher.";
        }

        if (form.password || form.password_confirmation) {
            if (form.password.length < 8) {
                errors.password =
                    "The password must contain at least 8 characters.";
            }

            if (form.password !== form.password_confirmation) {
                errors.password_confirmation = "Passwords do not match.";
            }
        }

        setFieldErrors(errors);

        return Object.keys(errors).length === 0;
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");

        if (!validateForm()) {
            return;
        }

        const payload = {
            teacher_id: form.teacher_id.trim(),
            first_name: form.first_name.trim(),
            middle_name: form.middle_name.trim() || null,
            last_name: form.last_name.trim(),
            phone: form.phone.trim() || null,
            email: form.email.trim(),
            status: form.status ? 1 : 0,
        };

        if (!isEditing || form.password) {
            payload.password = form.password;
            payload.password_confirmation = form.password_confirmation;
        }

        setSaving(true);

        try {
            if (isEditing) {
                await api.put(`/teachers/${teacherId}`, payload);
            } else {
                await api.post("/teachers", payload);
            }

            navigate("/teachers", {
                state: {
                    message: isEditing
                        ? "Teacher details updated successfully."
                        : "Teacher registered successfully.",
                },
            });
        } catch (err) {
            setError(getErrorMessage(err));

            const errors = err?.response?.data?.errors;

            if (errors) {
                const mapped = {};

                Object.entries(errors).forEach(([field, messages]) => {
                    mapped[field] = Array.isArray(messages)
                        ? messages[0]
                        : String(messages);
                });

                setFieldErrors(mapped);
            }
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="teachers-page">
                <div className="loading-state">Loading teacher details...</div>
            </div>
        );
    }

    return (
        <div className="teachers-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        {isEditing ? "Edit Teacher" : "Register Teacher"}
                    </h1>
                    <p className="page-subtitle">
                        {isEditing
                            ? "Update the teacher's personal and account information."
                            : "Create a teacher record and its associated login account."}
                    </p>
                </div>

                <Link to="/teachers" className="btn btn-outline">
                    ← Back to Teachers
                </Link>
            </div>

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Personal Information</h2>
                    </div>

                    <div className="card-body">
                        <div className="form-grid">
                            <div className="form-group">
                                <label
                                    className="form-label"
                                    htmlFor="teacher_id"
                                >
                                    Staff ID <span className="required">*</span>
                                </label>

                                <input
                                    id="teacher_id"
                                    name="teacher_id"
                                    className="form-control"
                                    value={form.teacher_id}
                                    onChange={handleChange}
                                    placeholder="e.g. TCH-001"
                                    required
                                    disabled={saving}
                                />

                                {fieldErrors.teacher_id && (
                                    <span className="form-hint" style={{ color: "#b23b2e" }}>
                                        {fieldErrors.teacher_id}
                                    </span>
                                )}
                            </div>

                            <div className="form-group">
                                <label
                                    className="form-label"
                                    htmlFor="first_name"
                                >
                                    First Name <span className="required">*</span>
                                </label>

                                <input
                                    id="first_name"
                                    name="first_name"
                                    className="form-control"
                                    value={form.first_name}
                                    onChange={handleChange}
                                    placeholder="Enter first name"
                                    required
                                    disabled={saving}
                                />

                                {fieldErrors.first_name && (
                                    <span className="form-hint" style={{ color: "#b23b2e" }}>
                                        {fieldErrors.first_name}
                                    </span>
                                )}
                            </div>

                            <div className="form-group">
                                <label
                                    className="form-label"
                                    htmlFor="middle_name"
                                >
                                    Middle Name
                                </label>

                                <input
                                    id="middle_name"
                                    name="middle_name"
                                    className="form-control"
                                    value={form.middle_name}
                                    onChange={handleChange}
                                    placeholder="Enter middle name (optional)"
                                    disabled={saving}
                                />
                            </div>

                            <div className="form-group">
                                <label
                                    className="form-label"
                                    htmlFor="last_name"
                                >
                                    Last Name <span className="required">*</span>
                                </label>

                                <input
                                    id="last_name"
                                    name="last_name"
                                    className="form-control"
                                    value={form.last_name}
                                    onChange={handleChange}
                                    placeholder="Enter last name"
                                    required
                                    disabled={saving}
                                />

                                {fieldErrors.last_name && (
                                    <span className="form-hint" style={{ color: "#b23b2e" }}>
                                        {fieldErrors.last_name}
                                    </span>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="phone">
                                    Phone Number
                                </label>

                                <input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    className="form-control"
                                    value={form.phone}
                                    onChange={handleChange}
                                    placeholder="Enter phone number"
                                    disabled={saving}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="email">
                                    Email Address{" "}
                                    <span className="required">*</span>
                                </label>

                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    className="form-control"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="teacher@school.com"
                                    required
                                    disabled={saving}
                                    autoComplete="email"
                                />

                                {fieldErrors.email && (
                                    <span className="form-hint" style={{ color: "#b23b2e" }}>
                                        {fieldErrors.email}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Login Account</h2>
                    </div>

                    <div className="card-body">
                        <p className="page-subtitle" style={{ marginBottom: 20 }}>
                            {isEditing
                                ? "Leave both password fields empty to keep the existing password."
                                : "The teacher will use this email and password to sign in."}
                        </p>

                        <div className="form-grid">
                            <div className="form-group">
                                <label
                                    className="form-label"
                                    htmlFor="password"
                                >
                                    {isEditing
                                        ? "New Password (optional)"
                                        : "Password"}
                                    {!isEditing && (
                                        <span className="required"> *</span>
                                    )}
                                </label>

                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    className="form-control"
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder={
                                        isEditing
                                            ? "Leave blank to keep current password"
                                            : "At least 8 characters"
                                    }
                                    autoComplete="new-password"
                                    disabled={saving}
                                />

                                {fieldErrors.password && (
                                    <span className="form-hint" style={{ color: "#b23b2e" }}>
                                        {fieldErrors.password}
                                    </span>
                                )}
                            </div>

                            <div className="form-group">
                                <label
                                    className="form-label"
                                    htmlFor="password_confirmation"
                                >
                                    Confirm Password
                                </label>

                                <input
                                    id="password_confirmation"
                                    name="password_confirmation"
                                    type="password"
                                    className="form-control"
                                    value={form.password_confirmation}
                                    onChange={handleChange}
                                    placeholder="Re-enter password"
                                    autoComplete="new-password"
                                    disabled={saving}
                                />

                                {fieldErrors.password_confirmation && (
                                    <span className="form-hint" style={{ color: "#b23b2e" }}>
                                        {fieldErrors.password_confirmation}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="assignment-subject">
                                <input
                                    type="checkbox"
                                    name="status"
                                    checked={form.status}
                                    onChange={handleChange}
                                    disabled={saving}
                                />
                                <span>Teacher account is active</span>
                            </label>

                            <span className="form-hint">
                                Inactive accounts should not be used for normal
                                teacher access.
                            </span>
                        </div>

                        <div className="form-actions">
                            <Link to="/teachers" className="btn btn-outline">
                                Cancel
                            </Link>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={saving}
                            >
                                {saving
                                    ? "Saving..."
                                    : isEditing
                                      ? "Save Changes"
                                      : "Register Teacher"}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
