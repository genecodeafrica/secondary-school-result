
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import './subjects.css';

export default function Subjects() {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [department, setDepartment] = useState('all');
    const [status, setStatus] = useState('all');

    const loadSubjects = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            const response = await apiClient.get('/subjects', {
                params: { per_page: 100 },
            });

            const result = response.data?.data;
            const rows = Array.isArray(result)
                ? result
                : Array.isArray(result?.data)
                    ? result.data
                    : [];

            setSubjects(rows);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Unable to load subjects. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSubjects();
    }, [loadSubjects]);

    const departments = [
        ...new Map(
            subjects
                .filter((subject) => subject.department)
                .map((subject) => [
                    subject.department.id,
                    subject.department,
                ])
        ).values(),
    ];

    const filteredSubjects = subjects.filter((subject) => {
        const term = search.trim().toLowerCase();

        const matchesSearch =
            !term ||
            `${subject.name || ''} ${subject.code || ''} ${subject.category || ''} ${subject.department?.name || ''}`
                .toLowerCase()
                .includes(term);

        const matchesDepartment =
            department === 'all' ||
            String(subject.department_id) === department;

        const matchesStatus =
            status === 'all' ||
            String(Boolean(subject.status)) === status;

        return matchesSearch && matchesDepartment && matchesStatus;
    });

    const activeCount = subjects.filter((subject) => subject.status).length;
    const inactiveCount = subjects.length - activeCount;

    return (
        <div className="subject-page">
            <div className="subject-page-header">
                <div>
                    <span className="subject-eyebrow">ACADEMIC MANAGEMENT</span>
                    <h1>Subject Management</h1>
                    <p>Manage school subjects and their class assignments.</p>
                </div>

                <Link to="/subjects/create" className="subject-primary-button">
                    <i className="fas fa-plus" /> Add Subject
                </Link>
            </div>

            <div className="subject-summary-grid">
                <div className="subject-summary-card">
                    <div className="subject-summary-icon blue">
                        <i className="fas fa-book-open" />
                    </div>
                    <div>
                        <span>Total Subjects</span>
                        <strong>{subjects.length}</strong>
                    </div>
                </div>

                <div className="subject-summary-card">
                    <div className="subject-summary-icon green">
                        <i className="fas fa-circle-check" />
                    </div>
                    <div>
                        <span>Active Subjects</span>
                        <strong>{activeCount}</strong>
                    </div>
                </div>

                <div className="subject-summary-card">
                    <div className="subject-summary-icon orange">
                        <i className="fas fa-circle-pause" />
                    </div>
                    <div>
                        <span>Inactive Subjects</span>
                        <strong>{inactiveCount}</strong>
                    </div>
                </div>
            </div>

            <div className="subject-toolbar">
                <div className="subject-search">
                    <i className="fas fa-search" />
                    <input
                        type="search"
                        placeholder="Search by subject name, code or category..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>

                <select
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    aria-label="Filter by department"
                >
                    <option value="all">All departments</option>
                    {departments.map((item) => (
                        <option key={item.id} value={String(item.id)}>
                            {item.name}
                        </option>
                    ))}
                </select>

                <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    aria-label="Filter by status"
                >
                    <option value="all">All statuses</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                </select>

                <button
                    type="button"
                    className="subject-refresh-button"
                    onClick={loadSubjects}
                    title="Refresh subjects"
                >
                    <i className="fas fa-rotate" />
                </button>
            </div>

            {error && (
                <div className="subject-alert">
                    <span>{error}</span>
                    <button type="button" onClick={loadSubjects}>Retry</button>
                </div>
            )}

            <div className="subject-table-panel">
                <div className="subject-table-heading">
                    <div>
                        <h2>School Subjects</h2>
                        <p>Subject catalogue for your school</p>
                    </div>
                    <span>{filteredSubjects.length} displayed</span>
                </div>

                {loading ? (
                    <div className="subject-state">
                        <i className="fas fa-spinner fa-spin" />
                        <p>Loading subjects...</p>
                    </div>
                ) : !error && filteredSubjects.length === 0 ? (
                    <div className="subject-state">
                        <i className="fas fa-book-open" />
                        <h3>No subjects found</h3>
                        <p>Try changing your filters or add a subject.</p>
                    </div>
                ) : (
                    <div className="subject-table-scroll">
                        <table className="subject-table">
                            <thead>
                                <tr>
                                    <th>Subject</th>
                                    <th>Code</th>
                                    <th>Department</th>
                                    <th>Category</th>
                                    <th>Classes</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSubjects.map((subject) => (
                                    <tr key={subject.id}>
                                        <td>
                                            <div className="subject-name-cell">
                                                <div className="subject-row-icon">
                                                    <i className="fas fa-book" />
                                                </div>
                                                <strong>{subject.name}</strong>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="subject-code">
                                                {subject.code}
                                            </span>
                                        </td>
                                        <td>
                                            {subject.department?.name || 'Not assigned'}
                                        </td>
                                        <td>{subject.category || '—'}</td>
                                        <td>{subject.classes_count ?? '—'}</td>
                                        <td>
                                            <span className={`subject-status ${subject.status ? 'active' : 'inactive'}`}>
                                                {subject.status ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <Link
                                                to={`/subjects/${subject.id}`}
                                                className="subject-view-button"
                                            >
                                                View Details
                                                <i className="fas fa-arrow-right" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="subject-result-count">
                Showing {filteredSubjects.length} of {subjects.length} loaded subjects
            </div>
        </div>
    );
}
