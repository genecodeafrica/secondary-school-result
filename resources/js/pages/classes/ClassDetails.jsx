
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import apiClient from '../../api/client';
import './classes.css';

export default function ClassDetails() {
    const { classId } = useParams();

    const [classInfo, setClassInfo] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        async function loadDetails() {
            try {
                setLoading(true);
                setError('');

                const [classResponse, subjectResponse] = await Promise.all([
                    apiClient.get('/academic/classes'),
                    apiClient.get(`/academic/classes/${classId}/subjects`),
                ]);

                const classRows = Array.isArray(classResponse.data?.data)
                    ? classResponse.data.data
                    : [];

                const selectedClass = classRows.find(
                    (item) => String(item.id) === String(classId)
                );

                if (!selectedClass) {
                    throw new Error('The requested class could not be found.');
                }

                if (active) {
                    setClassInfo(selectedClass);
                    setSubjects(
                        Array.isArray(subjectResponse.data?.data)
                            ? subjectResponse.data.data
                            : []
                    );
                }
            } catch (err) {
                if (active) {
                    setError(
                        err.response?.data?.message ||
                        err.message ||
                        'Unable to load class details.'
                    );
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        loadDetails();

        return () => {
            active = false;
        };
    }, [classId]);

    if (loading) {
        return (
            <div className="class-state">
                <i className="fas fa-spinner fa-spin" />
                <p>Loading class details...</p>
            </div>
        );
    }

    if (error || !classInfo) {
        return (
            <div className="class-detail-page">
                <Link to="/classes" className="class-back-link">
                    <i className="fas fa-arrow-left" /> Back to Classes
                </Link>

                <div className="class-alert">
                    {error || 'Class not found.'}
                </div>
            </div>
        );
    }

    const teacher =
        classInfo.class_teacher?.name ||
        classInfo.class_teacher?.full_name ||
        'Not assigned';

    return (
        <div className="class-detail-page">
            <Link to="/classes" className="class-back-link">
                <i className="fas fa-arrow-left" /> Back to Classes
            </Link>

            <div className="class-detail-banner">
                <div className="class-detail-icon">
                    <i className="fas fa-chalkboard" />
                </div>

                <div className="class-detail-heading">
                    <span>CLASS PROFILE</span>
                    <h1>{classInfo.name || `Class ${classInfo.id}`}</h1>
                    <p>
                        {classInfo.department?.name ||
                            'Department not assigned'}
                    </p>
                </div>

                <span
                    className={`class-status ${
                        classInfo.status ? 'is-active' : 'is-inactive'
                    }`}
                >
                    {classInfo.status ? 'Active' : 'Inactive'}
                </span>
            </div>

            <div className="class-detail-grid">
                <section className="class-detail-panel">
                    <div className="class-panel-heading">
                        <div>
                            <h2>Class Information</h2>
                            <p>Basic academic class details</p>
                        </div>
                        <i className="fas fa-circle-info" />
                    </div>

                    <div className="class-detail-list">
                        <div>
                            <span>Class Name</span>
                            <strong>{classInfo.name || '—'}</strong>
                        </div>

                        <div>
                            <span>Department</span>
                            <strong>
                                {classInfo.department?.name || '—'}
                            </strong>
                        </div>

                        <div>
                            <span>Level</span>
                            <strong>{classInfo.level || '—'}</strong>
                        </div>

                        <div>
                            <span>Section</span>
                            <strong>{classInfo.section || '—'}</strong>
                        </div>

                        <div>
                            <span>Class Teacher</span>
                            <strong>{teacher}</strong>
                        </div>

                        <div>
                            <span>Status</span>
                            <strong>
                                {classInfo.status ? 'Active' : 'Inactive'}
                            </strong>
                        </div>
                    </div>
                </section>

                <section className="class-detail-panel">
                    <div className="class-panel-heading">
                        <div>
                            <h2>Assigned Subjects</h2>
                            <p>
                                {subjects.length} subject
                                {subjects.length === 1 ? '' : 's'} assigned
                            </p>
                        </div>
                        <i className="fas fa-book-open" />
                    </div>

                    {subjects.length === 0 ? (
                        <div className="class-empty-subjects">
                            <i className="fas fa-book-open" />
                            <p>No active subjects were returned for this class.</p>
                        </div>
                    ) : (
                        <div className="class-subject-list">
                            {subjects.map((subject) => (
                                <div
                                    className="class-subject-item"
                                    key={subject.id}
                                >
                                    <div className="class-subject-icon">
                                        <i className="fas fa-book" />
                                    </div>

                                    <div>
                                        <strong>{subject.name}</strong>
                                        <span>
                                            {subject.code ||
                                                subject.department?.name ||
                                                'Subject'}
                                        </span>
                                    </div>

                                    <i className="fas fa-check-circle class-subject-check" />
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
