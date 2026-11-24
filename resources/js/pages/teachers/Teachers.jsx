
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import "./teachers.css";

function getErrorMessage(error) {
    const errors = error?.response?.data?.errors;

    if (errors) {
        return Object.values(errors).flat().join(" ");
    }

    return (
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong. Please try again."
    );
}

function getResponseData(response) {
    return response?.data?.data ?? response?.data;
}

function getTeacherId(teacher) {
    return teacher?.id ?? teacher?.teacher_id;
}

function getTeacherName(teacher) {
    return [
        teacher?.first_name,
        teacher?.middle_name,
        teacher?.last_name,
    ]
        .filter(Boolean)
        .join(" ");
}

function getStatus(teacher) {
    return (
        teacher?.status === true ||
        teacher?.status === 1 ||
        teacher?.status === "1"
    );
}

export default function Teachers() {
    const [teachers, setTeachers] = useState([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [updatingId, setUpdatingId] = useState(null);

    const loadTeachers = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await api.get("/teachers");
            const data = getResponseData(response);

            const list = Array.isArray(data)
                ? data
                : Array.isArray(data?.data)
                  ? data.data
                  : Array.isArray(data?.teachers)
                    ? data.teachers
                    : [];

            setTeachers(list);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTeachers();
    }, [loadTeachers]);

    const filteredTeachers = teachers.filter((teacher) => {
        const query = search.trim().toLowerCase();

        const searchableText = [
            getTeacherName(teacher),
            teacher?.teacher_id,
            teacher?.email,
            teacher?.phone,
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        const matchesSearch =
            !query || searchableText.includes(query);

        const active = getStatus(teacher);

        const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "active" && active) ||
            (statusFilter === "inactive" && !active);

        return matchesSearch && matchesStatus;
    });

    async function toggleStatus(teacher) {
        const id = getTeacherId(teacher);

        if (!id) {
            setError("The teacher record does not have a valid ID.");
            return;
        }

        const currentlyActive = getStatus(teacher);
        const action = currentlyActive ? "deactivate" : "activate";

        if (
            !window.confirm(
                `Are you sure you want to ${action} ${getTeacherName(teacher)}?`
            )
        ) {
            return;
        }

        setUpdatingId(id);
        setError("");
        setNotice("");

        try {
            await api.patch(`/teachers/${id}/status`, {
                status: currentlyActive ? 0 : 1,
            });

            setNotice(
                `Teacher ${currentlyActive ? "deactivated" : "activated"} successfully.`
            );

            await loadTeachers();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setUpdatingId(null);
        }
    }

    return (
        <div className="teachers-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Teacher Management</h1>
                    <p className="page-subtitle">
                        Register teachers, manage accounts, and assign
                        teaching responsibilities.
                    </p>
                </div>

                <Link to="/teachers/create" className="btn btn-primary">
                    <span aria-hidden="true">＋</span>
                    Add Teacher
                </Link>
            </div>

            {notice && (
                <div className="alert alert-success" role="status">
                    {notice}
                </div>
            )}

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                    <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ marginLeft: 12 }}
                        onClick={loadTeachers}
                    >
                        Try again
                    </button>
                </div>
            )}

            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Teachers Directory</h2>
                    <span className="status-badge status-active">
                        {filteredTeachers.length}{" "}
                        {filteredTeachers.length === 1
                            ? "teacher"
                            : "teachers"}
                    </span>
                </div>

                <div className="card-body">
                    <div className="filters">
                        <input
                            type="search"
                            className="form-control search-input"
                            placeholder="Search by name, staff ID, email or phone..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            aria-label="Search teachers"
                        />

                        <select
                            className="form-select filter-select"
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(event.target.value)
                            }
                            aria-label="Filter teachers by status"
                        >
                            <option value="all">All statuses</option>
                            <option value="active">Active only</option>
                            <option value="inactive">Inactive only</option>
                        </select>

                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => {
                                setSearch("");
                                setStatusFilter("all");
                                setNotice("");
                                loadTeachers();
                            }}
                        >
                            Refresh
                        </button>
                    </div>

                    {loading ? (
                        <div className="loading-state">
                            Loading teachers...
                        </div>
                    ) : filteredTeachers.length === 0 ? (
                        <div className="empty-state">
                            <h3>No teachers found</h3>
                            <p>
                                {teachers.length === 0
                                    ? "Start by registering the first teacher."
                                    : "Try a different search term or status filter."}
                            </p>

                            {teachers.length === 0 && (
                                <Link
                                    to="/teachers/create"
                                    className="btn btn-primary"
                                >
                                    Register Teacher
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Teacher</th>
                                        <th>Staff ID</th>
                                        <th>Phone</th>
                                        <th>Status</th>
                                        <th>Assignments</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredTeachers.map((teacher) => {
                                        const id = getTeacherId(teacher);
                                        const active = getStatus(teacher);
                                        const name =
                                            getTeacherName(teacher) ||
                                            "Unnamed Teacher";

                                        const initials = name
                                            .split(/\s+/)
                                            .slice(0, 2)
                                            .map((part) => part[0])
                                            .join("")
                                            .toUpperCase();

                                        return (
                                            <tr key={id}>
                                                <td>
                                                    <div className="teacher-profile">
                                                        <span className="teacher-avatar">
                                                            {initials || "T"}
                                                        </span>

                                                        <div>
                                                            <div className="teacher-name">
                                                                {name}
                                                            </div>
                                                            <span className="teacher-email">
                                                                {teacher.email ||
                                                                    "No email"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td>
                                                    {teacher.teacher_id || "—"}
                                                </td>

                                                <td>{teacher.phone || "—"}</td>

                                                <td>
                                                    <span
                                                        className={`status-badge ${
                                                            active
                                                                ? "status-active"
                                                                : "status-inactive"
                                                        }`}
                                                    >
                                                        {active
                                                            ? "Active"
                                                            : "Inactive"}
                                                    </span>
                                                </td>

                                                <td>
                                                    {teacher.assignments_count ??
                                                        teacher.teacher_subjects_count ??
                                                        "—"}
                                                </td>

                                                <td>
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            flexWrap: "wrap",
                                                            gap: 6,
                                                        }}
                                                    >
                                                        <Link
                                                            to={`/teachers/${id}/edit`}
                                                            className="btn btn-outline btn-sm"
                                                        >
                                                            Edit
                                                        </Link>

                                                        <Link
                                                            to={`/teachers/${id}/assignments`}
                                                            className="btn btn-success btn-sm"
                                                        >
                                                            Assign
                                                        </Link>

                                                        <button
                                                            type="button"
                                                            className={`btn btn-sm ${
                                                                active
                                                                    ? "btn-danger"
                                                                    : "btn-success"
                                                            }`}
                                                            disabled={
                                                                updatingId === id
                                                            }
                                                            onClick={() =>
                                                                toggleStatus(
                                                                    teacher
                                                                )
                                                            }
                                                        >
                                                            {updatingId === id
                                                                ? "Saving..."
                                                                : active
                                                                  ? "Deactivate"
                                                                  : "Activate"}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
