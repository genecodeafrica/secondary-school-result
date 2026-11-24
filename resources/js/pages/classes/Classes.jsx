
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import './classes.css';

export default function Classes() {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [department, setDepartment] = useState('all');

    useEffect(() => {
        let active = true;

        async function loadClasses() {
            try {
                setLoading(true);
                setError('');

                const response = await apiClient.get('/academic/classes');
                const payload = response.data;
                const rows = Array.isArray(payload?.data)
                    ? payload.data
                    : [];

                if (active) setClasses(rows);
            } catch (err) {
                if (active) {
                    setError(
                        err.response?.data?.message ||
                        'Unable to load classes. Please try again.'
                    );
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        loadClasses();

        return () => {
            active = false;
        };
    }, []);

    const departments = useMemo(() => {
        const unique = new Map();

        classes.forEach((item) => {
            if (item.department) {
                unique.set(
                    String(item.department.id),
                    item.department
                );
            }
        });

        return [...unique.values()];
    }, [classes]);

    const filteredClasses = useMemo(() => {
        const term = search.trim().toLowerCase();

        return classes.filter((item) => {
            const className = `${item.name || ''} ${item.level || ''} ${
                item.section || ''
            }`.toLowerCase();

            const departmentName = (
                item.department?.name || ''
            ).toLowerCase();

            const matchesSearch =
                !term ||
                className.includes(term) ||
                departmentName.includes(term);

            const matchesDepartment =
                department === 'all' ||
                String(item.department_id) === department ||
                String(item.department?.id) === department;

            return matchesSearch && matchesDepartment;
        });
    }, [classes, search, department]);

    return (
        <div className="class-page">
            <div className="class-page-header">
                <div>
                    <span className="class-eyebrow">ACADEMIC MANAGEMENT</span>
                    <h1>Class Management</h1>
                    <p>
                        View classes, their departments, class teachers,
                        and assigned subjects.
                    </p>
                </div>

                <div className="class-header-icon">
                    <i className="fas fa-school" />
                </div>
            </div>

            <div className="class-summary-grid">
                <div className="class-summary-card">
                    <div className="class-summary-icon blue">
                        <i className="fas fa-chalkboard" />
                    </div>
                    <div>
                        <span>Total Classes</span>
                        <strong>{classes.length}</strong>
                    </div>
                </div>

                <div className="class-summary-card">
                    <div className="class-summary-icon green">
                        <i className="fas fa-building" />
                    </div>
                    <div>
                        <span>Departments</span>
                        <strong>{departments.length}</strong>
                    </div>
                </div>

                <div className="class-summary-card">
                    <div className="class-summary-icon purple">
                        <i className="fas fa-user-tie" />
                    </div>
                    <div>
                        <span>Assigned Class Teachers</span>
                        <strong>
                            {
                                classes.filter((item) => item.class_teacher)
                                    .length
                            }
                        </strong>
                    </div>
                </div>
            </div>

            <div className="class-toolbar">
                <div className="class-search">
                    <i className="fas fa-search" />
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search class or department..."
                        aria-label="Search classes"
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
            </div>

            {error && (
                <div className="class-alert">
                    <i className="fas fa-circle-exclamation" />
                    <span>{error}</span>
                    <button onClick={() => window.location.reload()}>
                        Retry
                    </button>
                </div>
            )}

            {loading ? (
                <div className="class-state">
                    <i className="fas fa-spinner fa-spin" />
                    <p>Loading classes...</p>
                </div>
            ) : !error && filteredClasses.length === 0 ? (
                <div className="class-state">
                    <i className="fas fa-school" />
                    <h3>No classes found</h3>
                    <p>
                        Try another search or select a different department.
                    </p>
                </div>
            ) : (
                <div className="class-grid">
                    {filteredClasses.map((item) => (
                        <article className="class-card" key={item.id}>
                            <div className="class-card-top">
                                <div className="class-card-icon">
                                    <i className="fas fa-chalkboard" />
                                </div>

                                <span
                                    className={`class-status ${
                                        item.status
                                            ? 'is-active'
                                            : 'is-inactive'
                                    }`}
                                >
                                    {item.status ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            <div className="class-card-title">
                                <h2>{item.name || `Class ${item.id}`}</h2>
                                <p>
                                    {item.department?.name ||
                                        'Department not assigned'}
                                </p>
                            </div>

                            <div className="class-card-info">
                                <div>
                                    <i className="fas fa-layer-group" />
                                    <span>Level</span>
                                    <strong>{item.level || '—'}</strong>
                                </div>

                                <div>
                                    <i className="fas fa-users" />
                                    <span>Section</span>
                                    <strong>{item.section || '—'}</strong>
                                </div>
                            </div>

                            <div className="class-teacher">
                                <div className="class-teacher-avatar">
                                    <i className="fas fa-user-tie" />
                                </div>

                                <div>
                                    <span>Class Teacher</span>
                                    <strong>
                                        {item.class_teacher?.name ||
                                            item.class_teacher?.full_name ||
                                            'Not assigned'}
                                    </strong>
                                </div>
                            </div>

                            <Link
                                className="class-view-button"
                                to={`/classes/${item.id}`}
                            >
                                View Class Details
                                <i className="fas fa-arrow-right" />
                            </Link>
                        </article>
                    ))}
                </div>
            )}

            <div className="class-result-count">
                Showing {filteredClasses.length} of {classes.length} classes
            </div>
        </div>
    );
}
