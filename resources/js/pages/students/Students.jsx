
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import './students.css';

function getStudentList(payload) {
    const result = payload?.data;

    if (Array.isArray(result)) {
        return {
            students: result,
            currentPage: 1,
            lastPage: 1,
            total: result.length,
        };
    }

    return {
        students: Array.isArray(result?.data) ? result.data : [],
        currentPage: result?.current_page ?? 1,
        lastPage: result?.last_page ?? 1,
        total: result?.total ?? 0,
    };
}

function fullName(student) {
    return [
        student.first_name,
        student.middle_name,
        student.last_name,
    ].filter(Boolean).join(' ');
}

export default function Students() {
    const [students, setStudents] = useState([]);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const loadStudents = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const response = await apiClient.get('/students', {
                params: {
                    search: search.trim() || undefined,
                    status: status === '' ? undefined : status,
                    page,
                    per_page: 10,
                },
            });

            const result = getStudentList(response.data);

            setStudents(result.students);
            setLastPage(result.lastPage);
            setTotal(result.total);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Unable to load students. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    }, [search, status, page]);

    useEffect(() => {
        loadStudents();
    }, [loadStudents]);

    async function toggleStatus(student) {
        const nextStatus = !student.status;

        const confirmed = window.confirm(
            `Are you sure you want to ${
                nextStatus ? 'activate' : 'deactivate'
            } ${fullName(student)}?`
        );

        if (!confirmed) return;

        setNotice('');
        setError('');

        try {
            await apiClient.patch(
                `/students/${student.id}/status`,
                { status: nextStatus }
            );

            setNotice('Student status updated successfully.');
            await loadStudents();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Unable to update the student status.'
            );
        }
    }

    function handleSearchChange(event) {
        setSearch(event.target.value);
        setPage(1);
    }

    function handleStatusChange(event) {
        setStatus(event.target.value);
        setPage(1);
    }

    return (
        <div className="student-page">
            <div className="student-page-heading">
                <div>
                    <p className="student-eyebrow">SCHOOL MANAGEMENT</p>
                    <h1>Students</h1>
                    <p className="student-subtitle">
                        Register students and manage their academic records.
                    </p>
                </div>

                <Link className="student-primary-button" to="/students/create">
                    <span aria-hidden="true">＋</span>
                    Register Student
                </Link>
            </div>

            <div className="student-summary">
                <div className="student-summary-icon">ST</div>
                <div>
                    <p>Total matching students</p>
                    <strong>{total}</strong>
                </div>
            </div>

            <section className="student-panel">
                <div className="student-panel-heading">
                    <div>
                        <h2>Student Directory</h2>
                        <p>Search by name or admission number.</p>
                    </div>
                </div>

                <div className="student-filters">
                    <div className="student-search">
                        <span aria-hidden="true">⌕</span>
                        <input
                            type="search"
                            value={search}
                            onChange={handleSearchChange}
                            placeholder="Search students..."
                            aria-label="Search students"
                        />
                    </div>

                    <select
                        value={status}
                        onChange={handleStatusChange}
                        aria-label="Filter by status"
                    >
                        <option value="">All statuses</option>
                        <option value="1">Active</option>
                        <option value="0">Inactive</option>
                    </select>

                    <button
                        type="button"
                        className="student-secondary-button"
                        onClick={() => {
                            setSearch('');
                            setStatus('');
                            setPage(1);
                        }}
                    >
                        Clear
                    </button>
                </div>

                {notice && (
                    <div className="student-alert student-alert-success">
                        {notice}
                    </div>
                )}

                {error && (
                    <div className="student-alert student-alert-error">
                        {error}
                    </div>
                )}

                <div className="student-table-wrap">
                    <table className="student-table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Admission Number</th>
                                <th>Gender</th>
                                <th>Current Class</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="student-empty">
                                        Loading students...
                                    </td>
                                </tr>
                            ) : students.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="student-empty">
                                        <div className="student-empty-icon">ST</div>
                                        <strong>No students found</strong>
                                        <p>
                                            Register a student or change your
                                            search filters.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                students.map((student) => {
                                    const currentEnrollment =
                                        student.enrollments?.find(
                                            (enrollment) =>
                                                enrollment.is_current
                                        );

                                    const className =
                                        currentEnrollment?.school_class?.name ||
                                        currentEnrollment?.schoolClass?.name ||
                                        'Not enrolled';

                                    return (
                                        <tr key={student.id}>
                                            <td>
                                                
                                            
                                            <div className="student-person">
                                                <div className="student-avatar">
                                                    {student.first_name?.charAt(0).toUpperCase()}
                                                    {student.last_name?.charAt(0).toUpperCase()}
                                                </div>

                                                <div>
                                                    <Link
                                                        to={`/students/${student.id}`}
                                                        className="student-action-link"
                                                    >
                                                        {fullName(student)}
                                                    </Link>

                                                    <span>
                                                        {student.email ||
                                                            student.phone ||
                                                            'No contact details'}
                                                    </span>
                                                </div>
                                            </div>


                                            </td>

                                            <td>{student.admission_number}</td>
                                            <td>{student.gender}</td>
                                            <td>{className}</td>

                                            <td>
                                                <span
                                                    className={`student-status ${
                                                        student.status
                                                            ? 'is-active'
                                                            : 'is-inactive'
                                                    }`}
                                                >
                                                    {student.status
                                                        ? 'Active'
                                                        : 'Inactive'}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="student-actions">
                                                    <Link
                                                        to={`/students/${student.id}/edit`}
                                                        className="student-action-link"
                                                    >
                                                        Edit
                                                    </Link>

                                                    <button
                                                        type="button"
                                                        className="student-action-link"
                                                        onClick={() =>
                                                            toggleStatus(student)
                                                        }
                                                    >
                                                        {student.status
                                                            ? 'Deactivate'
                                                            : 'Activate'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="student-pagination">
                    <span>
                        Page {page} of {lastPage}
                    </span>

                    <div>
                        <button
                            type="button"
                            disabled={loading || page <= 1}
                            onClick={() => setPage((current) => current - 1)}
                        >
                            Previous
                        </button>

                        <button
                            type="button"
                            disabled={loading || page >= lastPage}
                            onClick={() => setPage((current) => current + 1)}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
