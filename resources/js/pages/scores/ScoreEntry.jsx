
import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import './scores.css';

function getList(response, keys = []) {
    const payload = response?.data;

    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;

    for (const key of keys) {
        if (Array.isArray(payload?.[key])) return payload[key];
        if (Array.isArray(payload?.data?.[key])) return payload.data[key];
    }

    return [];
}

function getId(item) {
    return String(item?.id ?? item?.value ?? '');
}

function getRoleNames(user) {
    const roles = Array.isArray(user?.roles) ? user.roles : [];

    return [
        ...roles.map((role) =>
            typeof role === 'string' ? role : role?.name
        ),
        user?.role,
        user?.role_name,
    ]
        .filter(Boolean)
        .map((role) => String(role).trim().toLowerCase());
}

function getStudentName(student) {
    if (student?.name) return student.name;
    if (student?.full_name) return student.full_name;

    const name = [
        student?.first_name,
        student?.middle_name,
        student?.last_name,
    ].filter(Boolean).join(' ');

    return name || `Student #${student?.id ?? ''}`;
}

function getSessionName(session) {
    return session?.name
        || session?.session_name
        || session?.academic_year
        || session?.year
        || `Session ${session?.id}`;
}

function getTermName(term) {
    return term?.name
        || term?.term_name
        || term?.title
        || `Term ${term?.id}`;
}

function getClassName(schoolClass) {
    return schoolClass?.name
        || schoolClass?.class_name
        || schoolClass?.class_code
        || `Class ${schoolClass?.id}`;
}

function getSubjectName(subject) {
    return subject?.name
        || subject?.subject_name
        || subject?.title
        || `Subject ${subject?.id}`;
}

function getComponentName(component) {
    return component?.name
        || component?.code
        || `Assessment ${component?.id}`;
}

function getAssignmentClassId(item) {
    return String(item?.class_id ?? item?.school_class?.id ?? '');
}

function getAssignmentSubjectId(item) {
    return String(item?.subject_id ?? item?.subject?.id ?? '');
}

function getAssignmentSessionId(item) {
    return String(
        item?.academic_session_id
        ?? item?.academic_session?.id
        ?? ''
    );
}

function getSubjectId(item) {
    return String(item?.subject_id ?? item?.id ?? '');
}

export default function ScoreEntry() {
    const { user } = useAuth();

    const roleNames = getRoleNames(user);

    const isTeacher = roleNames.some((role) =>
        ['teacher', 'form teacher'].includes(role)
    );

    const [sessions, setSessions] = useState([]);
    const [terms, setTerms] = useState([]);
    const [allClasses, setAllClasses] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [students, setStudents] = useState([]);
    const [components, setComponents] = useState([]);

    const [sessionId, setSessionId] = useState('');
    const [termId, setTermId] = useState('');
    const [classId, setClassId] = useState('');
    const [subjectId, setSubjectId] = useState('');
    const [componentId, setComponentId] = useState('');

    const [scores, setScores] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [pageError, setPageError] = useState('');
    const [message, setMessage] = useState('');
    const [rowErrors, setRowErrors] = useState({});

    // Teachers only see classes assigned to them in the selected session.
    const classes = useMemo(() => {
        if (!isTeacher) return allClasses;

        const uniqueClasses = new Map();

        assignments
            .filter(
                (item) => getAssignmentSessionId(item) === sessionId
            )
            .forEach((item) => {
                const schoolClass = item.school_class;

                if (schoolClass?.id) {
                    uniqueClasses.set(
                        String(schoolClass.id),
                        schoolClass
                    );
                }
            });

        return Array.from(uniqueClasses.values());
    }, [isTeacher, allClasses, assignments, sessionId]);

    const selectedComponent = useMemo(
        () => components.find((item) => getId(item) === componentId),
        [components, componentId]
    );

    const maximumScore = Number(
        selectedComponent?.maximum_score ?? 0
    );

    const loadInitialData = useCallback(async () => {
        setLoading(true);
        setPageError('');

        try {
            const requests = [
                apiClient.get('/academic/sessions'),
                apiClient.get('/academic/assessment-components'),
            ];

            if (isTeacher) {
                requests.push(
                    apiClient.get('/academic/teacher/assignments')
                );
            } else {
                requests.push(
                    apiClient.get('/academic/classes')
                );
            }

            const [
                sessionResponse,
                componentResponse,
                accessResponse,
            ] = await Promise.all(requests);

            const sessionList = getList(sessionResponse, ['sessions']);

            const componentList = getList(componentResponse, [
                'assessment_components',
                'components',
            ]);

            setSessions(sessionList);
            setComponents(componentList);

            if (isTeacher) {
                setAssignments(
                    getList(accessResponse, ['assignments'])
                );
                setAllClasses([]);
            } else {
                setAllClasses(
                    getList(accessResponse, ['classes'])
                );
                setAssignments([]);
            }

            const currentSession =
                sessionList.find(
                    (item) => item.is_current || item.is_active
                ) || sessionList[0];

            if (currentSession) {
                setSessionId(getId(currentSession));
            }
        } catch (error) {
            setPageError(
                error.response?.data?.message
                || 'Unable to load the academic data. Check your connection and permissions.'
            );
        } finally {
            setLoading(false);
        }
    }, [isTeacher]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    // Load terms for the selected academic session.
    useEffect(() => {
        setTermId('');
        setTerms([]);
        setClassId('');
        setSubjects([]);
        setSubjectId('');
        setStudents([]);
        setScores({});
        setRowErrors({});
        setMessage('');

        if (!sessionId) return;

        let cancelled = false;

        apiClient.get(`/academic/sessions/${sessionId}/terms`)
            .then((response) => {
                if (!cancelled) {
                    setTerms(getList(response, ['terms']));
                }
            })
            .catch((error) => {
                if (!cancelled) {
                    setPageError(
                        error.response?.data?.message
                        || 'Unable to load terms for this academic session.'
                    );
                }
            });

        return () => {
            cancelled = true;
        };
    }, [sessionId]);

    // Teachers get subjects from their own assignments.
    // Administrators continue using the class-subject endpoint.
    useEffect(() => {
        setSubjects([]);
        setSubjectId('');
        setStudents([]);
        setScores({});
        setRowErrors({});
        setMessage('');

        if (!classId || !sessionId) return;

        if (isTeacher) {
            const assignedSubjects = assignments
                .filter(
                    (item) =>
                        getAssignmentClassId(item) === classId
                        && getAssignmentSessionId(item) === sessionId
                )
                .map((item) => ({
                    id: getAssignmentSubjectId(item),
                    subject_id: getAssignmentSubjectId(item),
                    name: item.subject?.name
                        || item.subject?.subject_name
                        || `Subject ${getAssignmentSubjectId(item)}`,
                }))
                .filter((item) => item.id);

            const uniqueSubjects = Array.from(
                new Map(
                    assignedSubjects.map((item) => [
                        item.id,
                        item,
                    ])
                ).values()
            );

            setSubjects(uniqueSubjects);
            return;
        }

        let cancelled = false;

        apiClient.get(`/academic/classes/${classId}/subjects`, {
            params: {
                academic_session_id: sessionId,
            },
        })
            .then((response) => {
                if (!cancelled) {
                    setSubjects(getList(response, ['subjects']));
                }
            })
            .catch((error) => {
                if (!cancelled) {
                    setPageError(
                        error.response?.data?.message
                        || 'Unable to load subjects assigned to this class.'
                    );
                }
            });

        return () => {
            cancelled = true;
        };
    }, [classId, sessionId, isTeacher, assignments]);

    // Load enrolled students for the selected class, session and term.
    useEffect(() => {
        setStudents([]);
        setScores({});
        setRowErrors({});
        setMessage('');

        if (!classId || !sessionId || !termId) return;

        let cancelled = false;

        apiClient.get('/academic/students', {
            params: {
                class_id: classId,
                academic_session_id: sessionId,
                term_id: termId,
            },
        })
            .then((response) => {
                if (!cancelled) {
                    setStudents(getList(response, ['students']));
                }
            })
            .catch((error) => {
                if (!cancelled) {
                    setPageError(
                        error.response?.data?.message
                        || 'Unable to load students enrolled in this class and term.'
                    );
                }
            });

        return () => {
            cancelled = true;
        };
    }, [classId, sessionId, termId]);

    useEffect(() => {
        setScores({});
        setRowErrors({});
        setMessage('');
    }, [subjectId, componentId]);

    const handleScoreChange = (studentId, value) => {
        setScores((current) => ({
            ...current,
            [studentId]: value,
        }));

        setRowErrors((current) => ({
            ...current,
            [studentId]: '',
        }));

        setMessage('');
    };

    const handleSaveScores = async (event) => {
        event.preventDefault();
        setPageError('');
        setMessage('');
        setRowErrors({});

        if (
            !sessionId
            || !termId
            || !classId
            || !subjectId
            || !componentId
        ) {
            setPageError(
                'Select the academic session, term, class, subject, and assessment component.'
            );
            return;
        }

        // Extra frontend check. Backend assignment validation remains authoritative.
        if (
            isTeacher
            && !assignments.some(
                (item) =>
                    getAssignmentClassId(item) === classId
                    && getAssignmentSubjectId(item) === subjectId
                    && getAssignmentSessionId(item) === sessionId
            )
        ) {
            setPageError(
                'You are not assigned to teach this subject in the selected class and session.'
            );
            return;
        }

        const entries = students
            .filter((student) => {
                const value = scores[student.id];

                return (
                    value !== undefined
                    && String(value).trim() !== ''
                );
            })
            .map((student) => ({
                student,
                value: Number(scores[student.id]),
            }));

        if (entries.length === 0) {
            setPageError(
                'Enter at least one student score before saving.'
            );
            return;
        }

        const validationErrors = {};

        entries.forEach(({ student, value }) => {
            if (!Number.isFinite(value) || value < 0) {
                validationErrors[student.id] =
                    'Enter a valid score of zero or higher.';
            } else if (value > maximumScore) {
                validationErrors[student.id] =
                    `Maximum score is ${maximumScore}.`;
            }
        });

        if (Object.keys(validationErrors).length > 0) {
            setRowErrors(validationErrors);
            setPageError(
                'Correct the highlighted scores before saving.'
            );
            return;
        }

        setSaving(true);

        let savedCount = 0;
        const failedRows = {};

        try {
            for (const { student, value } of entries) {
                try {
                    await apiClient.post('/scores', {
                        student_id: Number(student.id),
                        subject_id: Number(subjectId),
                        class_id: Number(classId),
                        academic_session_id: Number(sessionId),
                        term_id: Number(termId),
                        assessment_component_id: Number(componentId),
                        score: value,
                    });

                    savedCount += 1;
                } catch (error) {
                    failedRows[student.id] =
                        error.response?.data?.message
                        || 'Could not save this score.';
                }
            }

            setRowErrors(failedRows);

            if (Object.keys(failedRows).length === 0) {
                setMessage(
                    `Successfully saved ${savedCount} score(s).`
                );
            } else {
                setPageError(
                    `${savedCount} score(s) saved. ${Object.keys(failedRows).length} score(s) could not be saved. Review the highlighted rows.`
                );
            }
        } finally {
            setSaving(false);
        }
    };

    const canEnterScores =
        sessionId
        && termId
        && classId
        && subjectId
        && componentId;

    return (
        <div className="score-page">
            <div className="score-page-heading">
                <div>
                    <span className="score-eyebrow">
                        RESULT MANAGEMENT
                    </span>

                    <h1>Score Entry &amp; Validation</h1>

                    <p>
                        {isTeacher
                            ? 'Select one of your assigned classes and subjects to enter student scores.'
                            : 'Select a class and subject, then enter assessment scores for enrolled students.'}
                    </p>
                </div>

                <div className="score-heading-icon" aria-hidden="true">
                    <i className="fas fa-clipboard-check" />
                </div>
            </div>

            {pageError && (
                <div
                    className="score-alert score-alert-error"
                    role="alert"
                >
                    <i className="fas fa-exclamation-circle" />
                    <span>{pageError}</span>

                    <button
                        type="button"
                        onClick={() => setPageError('')}
                        aria-label="Dismiss error"
                    >
                        &times;
                    </button>
                </div>
            )}

            {message && (
                <div
                    className="score-alert score-alert-success"
                    role="status"
                >
                    <i className="fas fa-check-circle" />
                    <span>{message}</span>

                    <button
                        type="button"
                        onClick={() => setMessage('')}
                        aria-label="Dismiss message"
                    >
                        &times;
                    </button>
                </div>
            )}

            <section className="score-panel">
                <div className="score-panel-heading">
                    <div className="score-panel-icon">
                        <i className="fas fa-sliders-h" />
                    </div>

                    <div>
                        <h2>Assessment Details</h2>
                        <p>
                            Choose the academic period and assessment to record.
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="score-loading">
                        <span className="score-spinner" />
                        Loading academic data...
                    </div>
                ) : (
                    <div className="score-filter-grid">
                        <label className="score-field">
                            <span>Academic Session <b>*</b></span>

                            <select
                                value={sessionId}
                                onChange={(e) => setSessionId(e.target.value)}
                            >
                                <option value="">Select session</option>

                                {sessions.map((item) => (
                                    <option
                                        key={item.id}
                                        value={getId(item)}
                                    >
                                        {getSessionName(item)}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="score-field">
                            <span>Term <b>*</b></span>

                            <select
                                value={termId}
                                onChange={(e) => setTermId(e.target.value)}
                                disabled={!sessionId}
                            >
                                <option value="">Select term</option>

                                {terms.map((item) => (
                                    <option
                                        key={item.id}
                                        value={getId(item)}
                                    >
                                        {getTermName(item)}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="score-field">
                            <span>Class <b>*</b></span>

                            <select
                                value={classId}
                                onChange={(e) => setClassId(e.target.value)}
                                disabled={!sessionId || classes.length === 0}
                            >
                                <option value="">Select class</option>

                                {classes.map((item) => (
                                    <option
                                        key={item.id}
                                        value={getId(item)}
                                    >
                                        {getClassName(item)}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="score-field">
                            <span>Subject <b>*</b></span>

                            <select
                                value={subjectId}
                                onChange={(e) => setSubjectId(e.target.value)}
                                disabled={!classId || !sessionId}
                            >
                                <option value="">Select subject</option>

                                {subjects.map((item) => (
                                    <option
                                        key={`${item.id}-${item.subject_id ?? ''}`}
                                        value={getSubjectId(item)}
                                    >
                                        {getSubjectName(item)}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="score-field score-field-component">
                            <span>Assessment Component <b>*</b></span>

                            <select
                                value={componentId}
                                onChange={(e) => setComponentId(e.target.value)}
                            >
                                <option value="">Select component</option>

                                {components.map((item) => (
                                    <option
                                        key={item.id}
                                        value={getId(item)}
                                    >
                                        {getComponentName(item)} — Max {item.maximum_score}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                )}

                {!loading && isTeacher && classes.length === 0 && (
                    <div className="score-empty-state">
                        <h3>No teaching assignments for this session</h3>
                        <p>
                            Contact your school administrator to assign
                            classes and subjects to your teacher profile.
                        </p>
                    </div>
                )}
            </section>

            <section className="score-panel score-students-panel">
                <div className="score-panel-heading score-students-heading">
                    <div className="score-panel-icon score-panel-icon-green">
                        <i className="fas fa-users" />
                    </div>

                    <div>
                        <h2>Student Scores</h2>
                        <p>
                            Enter scores for the selected assessment component.
                        </p>
                    </div>

                    <span className="score-student-count">
                        {students.length}{' '}
                        {students.length === 1 ? 'student' : 'students'}
                    </span>
                </div>

                {!canEnterScores ? (
                    <div className="score-empty-state">
                        <div className="score-empty-icon">
                            <i className="fas fa-list-check" />
                        </div>

                        <h3>Complete the assessment details</h3>
                        <p>
                            Select a session, term, class, subject, and
                            assessment component to begin.
                        </p>
                    </div>
                ) : students.length === 0 ? (
                    <div className="score-empty-state">
                        <div className="score-empty-icon">
                            <i className="fas fa-user-graduate" />
                        </div>

                        <h3>No enrolled students found</h3>
                        <p>
                            Check the selected class, session, and term,
                            and confirm student enrollments.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSaveScores}>
                        <div className="score-table-summary">
                            <div>
                                <span>Maximum score</span>
                                <strong>
                                    {maximumScore || 'Not specified'}
                                </strong>
                            </div>

                            <div>
                                <span>Scores entered</span>

                                <strong>
                                    {students.filter((student) =>
                                        scores[student.id] !== undefined
                                        && String(scores[student.id]).trim() !== ''
                                    ).length}
                                    {' / '}
                                    {students.length}
                                </strong>
                            </div>
                        </div>

                        <div className="score-table-wrapper">
                            <table className="score-table">
                                <thead>
                                    <tr>
                                        <th className="score-number-column">#</th>
                                        <th>Student</th>
                                        <th>Admission Number</th>
                                        <th className="score-input-column">
                                            Score / {maximumScore}
                                        </th>
                                        <th>Validation</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {students.map((student, index) => (
                                        <tr key={student.id}>
                                            <td className="score-number-column">
                                                {index + 1}
                                            </td>

                                            <td>
                                                <div className="score-student-name">
                                                    <span className="score-student-avatar">
                                                        {getStudentName(student)
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </span>

                                                    <strong>
                                                        {getStudentName(student)}
                                                    </strong>
                                                </div>
                                            </td>

                                            <td>
                                                {student.admission_number
                                                    || student.registration_number
                                                    || '—'}
                                            </td>

                                            <td>
                                                <input
                                                    className={`score-input ${
                                                        rowErrors[student.id]
                                                            ? 'score-input-invalid'
                                                            : ''
                                                    }`}
                                                    type="number"
                                                    min="0"
                                                    max={maximumScore || undefined}
                                                    step="0.01"
                                                    inputMode="decimal"
                                                    placeholder="Enter score"
                                                    value={scores[student.id] ?? ''}
                                                    onChange={(e) =>
                                                        handleScoreChange(
                                                            student.id,
                                                            e.target.value
                                                        )
                                                    }
                                                    aria-label={`Score for ${getStudentName(student)}`}
                                                    aria-invalid={Boolean(
                                                        rowErrors[student.id]
                                                    )}
                                                />
                                            </td>

                                            <td>
                                                {rowErrors[student.id] ? (
                                                    <span className="score-validation-error">
                                                        <i className="fas fa-exclamation-circle" />
                                                        {rowErrors[student.id]}
                                                    </span>
                                                ) : scores[student.id] !== undefined
                                                    && String(scores[student.id]).trim() !== '' ? (
                                                    Number(scores[student.id]) >= 0
                                                    && Number(scores[student.id]) <= maximumScore ? (
                                                        <span className="score-validation-valid">
                                                            <i className="fas fa-check-circle" />
                                                            {' '}Valid
                                                        </span>
                                                    ) : (
                                                        <span className="score-validation-error">
                                                            <i className="fas fa-exclamation-circle" />
                                                            {' '}Check score
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="score-validation-pending">
                                                        Not entered
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="score-form-footer">
                            <p>
                                <i className="fas fa-info-circle" />
                                {' '}Only non-empty scores will be submitted.
                            </p>

                            <button
                                type="submit"
                                className="score-save-button"
                                disabled={saving}
                            >
                                {saving ? (
                                    <>
                                        <span className="score-button-spinner" />
                                        Saving Scores...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-save" />
                                        {' '}Save Scores
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </section>
        </div>
    );
}
