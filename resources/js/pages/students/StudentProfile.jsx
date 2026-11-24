
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import apiClient from '../../api/client';
import './students.css';

function fullName(student) {
    return [
        student?.first_name,
        student?.middle_name,
        student?.last_name,
    ].filter(Boolean).join(' ');
}

function displayDate(value) {
    if (!value) return 'Not provided';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString();
}

export default function StudentProfile() {
    const { studentId } = useParams();
    const navigate = useNavigate();

    const [student, setStudent] = useState(null);
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadProfile = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const [studentResponse, enrollmentResponse] = await Promise.all([
                apiClient.get(`/students/${studentId}`),
                apiClient.get(`/students/${studentId}/enrollments`),
            ]);

            setStudent(studentResponse.data?.data ?? null);

            const data = enrollmentResponse.data?.data;
            setEnrollments(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Unable to load this student profile.'
            );
        } finally {
            setLoading(false);
        }
    }, [studentId]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    async function toggleStatus() {
        if (!student) return;

        const nextStatus = !student.status;

        if (!window.confirm(
            `Are you sure you want to ${
                nextStatus ? 'activate' : 'deactivate'
            } this student?`
        )) {
            return;
        }

        try {
            await apiClient.patch(`/students/${student.id}/status`, {
                status: nextStatus,
            });

            await loadProfile();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Unable to update the student status.'
            );
        }
    }

    if (loading) {
        return (
            <div className="student-page">
                <div className="student-panel student-form-loading">
                    Loading student profile...
                </div>
            </div>
        );
    }

    if (error && !student) {
        return (
            <div className="student-page">
                <div className="student-alert student-alert-error">
                    {error}
                </div>

                <button
                    type="button"
                    className="student-secondary-button"
                    onClick={() => navigate('/students')}
                >
                    Back to Students
                </button>
            </div>
        );
    }

    if (!student) return null;

    const currentEnrollment = enrollments.find(
        (item) => item.is_current && item.status
    );

    const className = (enrollment) =>
        enrollment?.school_class?.name ||
        enrollment?.schoolClass?.name ||
        'Class unavailable';

    const sessionName = (enrollment) =>
        enrollment?.academic_session?.name ||
        enrollment?.academicSession?.name ||
        'Session unavailable';

    const termName = (enrollment) =>
        enrollment?.term?.name || 'Term unavailable';

    return (
        <div className="student-page">
            <div className="student-page-heading">
                <div>
                    <p className="student-eyebrow">STUDENT MANAGEMENT</p>
                    <h1>Student Profile</h1>
                    <p className="student-subtitle">
                        View personal details and academic enrolment history.
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

            <section className="student-panel student-profile-header">
                <div className="student-profile-identity">
                    {student.photo ? (
                        <img
                            className="student-profile-photo"
                            src={`/storage/${student.photo}`}
                            alt={fullName(student)}
                        />
                    ) : (
                        <div className="student-profile-photo student-profile-initials">
                            {student.first_name?.charAt(0)?.toUpperCase()}
                            {student.last_name?.charAt(0)?.toUpperCase()}
                        </div>
                    )}

                    <div>
                        <h2>{fullName(student)}</h2>
                        <p>{student.admission_number}</p>

                        <span className={`student-status ${
                            student.status ? 'is-active' : 'is-inactive'
                        }`}>
                            {student.status ? 'Active Student' : 'Inactive Student'}
                        </span>
                    </div>
                </div>

                <div className="student-profile-actions">
                    <Link
                        className="student-primary-button"
                        to={`/students/${student.id}/edit`}
                    >
                        Edit Student
                    </Link>

                    <button
                        type="button"
                        className="student-secondary-button"
                        onClick={toggleStatus}
                    >
                        {student.status ? 'Deactivate' : 'Activate'}
                    </button>
                </div>
            </section>

            <section className="student-panel student-profile-section">
                <div className="student-panel-heading">
                    <div>
                        <h2>Personal Information</h2>
                        <p>Registered student details.</p>
                    </div>
                </div>

                <div className="student-detail-grid">
                    <Detail label="First Name" value={student.first_name} />
                    <Detail label="Middle Name" value={student.middle_name} />
                    <Detail label="Last Name" value={student.last_name} />
                    <Detail label="Admission Number" value={student.admission_number} />
                    <Detail label="Gender" value={student.gender} />
                    <Detail label="Date of Birth" value={displayDate(student.date_of_birth)} />
                    <Detail label="Phone Number" value={student.phone} />
                    <Detail label="Email Address" value={student.email} />
                    <Detail label="Home Address" value={student.address} wide />
                </div>
            </section>

            <section className="student-panel student-profile-section">
                
                <div className="student-panel-heading">
                    <div>
                        <h2>Current Enrolment</h2>
                        <p>The student's current class placement.</p>
                    </div>

                    <Link
                        to={`/students/${student.id}/enrollments/create`}
                        className="student-primary-button"
                    >
                        Add Enrolment
                    </Link>
                </div>


                {currentEnrollment ? (
                    <div className="student-detail-grid">
                        <Detail label="Class" value={className(currentEnrollment)} />
                        <Detail label="Academic Session" value={sessionName(currentEnrollment)} />
                        <Detail label="Term" value={termName(currentEnrollment)} />
                        <Detail label="Enrolment Status" value="Current" />
                    </div>
                ) : (
                    <div className="student-empty">
                        <strong>No current enrolment</strong>
                        <p>This student does not have a current active enrolment.</p>
                    </div>
                )}
            </section>

            <section className="student-panel student-profile-section">
                <div className="student-panel-heading">
                    <div>
                        <h2>Enrolment History</h2>
                        <p>Classes and terms associated with this student.</p>
                    </div>
                </div>

                <div className="student-table-wrap">
                    <table className="student-table">
                        <thead>
                            <tr>
                                <th>Class</th>
                                <th>Academic Session</th>
                                <th>Term</th>
                                <th>Current</th>
                                <th>Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {enrollments.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="student-empty">
                                        No enrolment history is available.
                                    </td>
                                </tr>
                            ) : (
                                enrollments.map((enrollment) => (
                                    <tr key={enrollment.id}>
                                        <td>{className(enrollment)}</td>
                                        <td>{sessionName(enrollment)}</td>
                                        <td>{termName(enrollment)}</td>
                                        <td>
                                            {enrollment.is_current ? 'Yes' : 'No'}
                                        </td>
                                        <td>
                                            <span className={`student-status ${
                                                enrollment.status
                                                    ? 'is-active'
                                                    : 'is-inactive'
                                            }`}>
                                                {enrollment.status
                                                    ? 'Active'
                                                    : 'Inactive'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

function Detail({ label, value, wide = false }) {
    return (
        <div className={`student-detail ${wide ? 'student-detail-wide' : ''}`}>
            <span>{label}</span>
            <strong>{value || 'Not provided'}</strong>
        </div>
    );
}
