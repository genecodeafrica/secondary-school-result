import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
        "Unable to load or save assignments. Please try again."
    );
}

function getResponseData(response) {
    return response?.data?.data ?? response?.data;
}

function getList(response) {
    const data = getResponseData(response);

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.sessions)) return data.sessions;
    if (Array.isArray(data?.classes)) return data.classes;
    if (Array.isArray(data?.subjects)) return data.subjects;

    return [];
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

function getSessionId(session) {
    return session?.id ?? session?.academic_session_id;
}

function getClassId(schoolClass) {
    return schoolClass?.id ?? schoolClass?.class_id;
}

function getSubjectId(subject) {
    return subject?.id ?? subject?.subject_id;
}

function getClassName(schoolClass) {
    return (
        schoolClass?.name ??
        schoolClass?.class_name ??
        schoolClass?.title ??
        `Class ${getClassId(schoolClass)}`
    );
}

function getSubjectName(subject) {
    return (
        subject?.name ??
        subject?.subject_name ??
        subject?.title ??
        `Subject ${getSubjectId(subject)}`
    );
}

function getSessionName(session) {
    return (
        session?.name ??
        session?.session_name ??
        session?.academic_year ??
        session?.year ??
        `Session ${getSessionId(session)}`
    );
}

function normalizeAssignments(data) {
    const rows =
        data?.assignments ??
        data?.data?.assignments ??
        (Array.isArray(data) ? data : []);

    if (!Array.isArray(rows)) {
        return {};
    }

    const selected = {};

    rows.forEach((row) => {
        const classId = String(
            row?.class_id ?? row?.school_class_id ?? ""
        );

        const subjectIds =
            row?.subject_ids ??
            row?.subjects?.map((subject) =>
                typeof subject === "object"
                    ? subject.id ?? subject.subject_id
                    : subject
            ) ??
            (row?.subject_id != null ? [row.subject_id] : []);

        if (!classId) return;

        if (!selected[classId]) {
            selected[classId] = [];
        }

        subjectIds.forEach((subjectId) => {
            if (
                subjectId != null &&
                !selected[classId].includes(String(subjectId))
            ) {
                selected[classId].push(String(subjectId));
            }
        });
    });

    return selected;
}

export default function TeacherAssignments() {
    const { teacherId } = useParams();
    const requestId = useRef(0);

    const [teacher, setTeacher] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjectsByClass, setSubjectsByClass] = useState({});
    const [sessionId, setSessionId] = useState("");
    const [selected, setSelected] = useState({});
    const [loading, setLoading] = useState(true);
    const [subjectsLoading, setSubjectsLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const activeClasses = useMemo(
        () =>
            classes.filter(
                (item) =>
                    item?.status === undefined ||
                    item?.status === true ||
                    item?.status === 1 ||
                    item?.status === "1"
            ),
        [classes]
    );

    const loadSessionData = useCallback(
        async (selectedSessionId, classList) => {
            const currentRequest = ++requestId.current;

            if (!selectedSessionId) {
                setSelected({});
                setSubjectsByClass({});
                return;
            }

            setSubjectsLoading(true);
            setSubjectsByClass({});
            setSelected({});

            try {
                const subjectRequests = classList.map(async (schoolClass) => {
                    const classId = getClassId(schoolClass);

                    const response = await api.get(
                        `/academic/classes/${classId}/subjects`,
                        {
                            params: {
                                academic_session_id: selectedSessionId,
                            },
                        }
                    );

                    return {
                        classId: String(classId),
                        subjects: getList(response),
                    };
                });

                const [subjectResults, assignmentsResponse] =
                    await Promise.all([
                        Promise.all(subjectRequests),
                        api.get(`/teachers/${teacherId}/assignments`, {
                            params: {
                                academic_session_id: selectedSessionId,
                            },
                        }),
                    ]);

                if (currentRequest !== requestId.current) return;

                const subjectMap = {};

                subjectResults.forEach((result) => {
                    subjectMap[result.classId] = result.subjects;
                });

                setSubjectsByClass(subjectMap);
                setSelected(
                    normalizeAssignments(getResponseData(assignmentsResponse))
                );
            } catch (err) {
                if (currentRequest !== requestId.current) return;

                setSubjectsByClass({});
                setSelected({});
                setError(getErrorMessage(err));
            } finally {
                if (currentRequest === requestId.current) {
                    setSubjectsLoading(false);
                }
            }
        },
        [teacherId]
    );

    useEffect(() => {
        let cancelled = false;

        async function loadPage() {
            setLoading(true);
            setError("");
            setNotice("");

            try {
                const [
                    teacherResponse,
                    sessionsResponse,
                    classesResponse,
                ] = await Promise.all([
                    api.get(`/teachers/${teacherId}`),
                    api.get("/academic/sessions"),
                    api.get("/academic/classes"),
                ]);

                if (cancelled) return;

                const teacherData = getResponseData(teacherResponse);
                const sessionList = getList(sessionsResponse);
                const classList = getList(classesResponse);

                setTeacher(teacherData?.teacher ?? teacherData);
                setSessions(sessionList);
                setClasses(classList);

                const firstSession = sessionList[0];
                const firstSessionId = firstSession
                    ? String(getSessionId(firstSession))
                    : "";

                setSessionId(firstSessionId);

                if (firstSessionId) {
                    await loadSessionData(firstSessionId, classList);
                } else {
                    setSelected({});
                    setSubjectsByClass({});
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

        loadPage();

        return () => {
            cancelled = true;
            requestId.current += 1;
        };
    }, [teacherId, loadSessionData]);

    async function handleSessionChange(event) {
        const nextSessionId = event.target.value;

        setSessionId(nextSessionId);
        setNotice("");
        setError("");

        await loadSessionData(nextSessionId, classes);
    }

    function toggleSubject(classId, subjectId) {
        const classKey = String(classId);
        const subjectKey = String(subjectId);

        setSelected((current) => {
            const currentIds = current[classKey] ?? [];

            const nextIds = currentIds.includes(subjectKey)
                ? currentIds.filter((id) => id !== subjectKey)
                : [...currentIds, subjectKey];

            return {
                ...current,
                [classKey]: nextIds,
            };
        });

        setNotice("");
    }

    function toggleClass(classId, availableSubjectIds) {
        const classKey = String(classId);

        setSelected((current) => {
            const currentIds = current[classKey] ?? [];

            const allSelected =
                availableSubjectIds.length > 0 &&
                availableSubjectIds.every((id) =>
                    currentIds.includes(String(id))
                );

            return {
                ...current,
                [classKey]: allSelected
                    ? []
                    : availableSubjectIds.map(String),
            };
        });

        setNotice("");
    }

    async function handleSave() {
        setError("");
        setNotice("");

        if (!sessionId) {
            setError("Select an academic session before saving assignments.");
            return;
        }

        if (subjectsLoading) {
            setError("Wait for class subjects to finish loading.");
            return;
        }

        const assignments = activeClasses
            .map((schoolClass) => {
                const classId = getClassId(schoolClass);
                const classKey = String(classId);

                const allowedSubjectIds = (
                    subjectsByClass[classKey] ?? []
                ).map((subject) => String(getSubjectId(subject)));

                const selectedSubjectIds = (
                    selected[classKey] ?? []
                ).filter((id) => allowedSubjectIds.includes(String(id)));

                return {
                    class_id: classId,
                    subject_ids: selectedSubjectIds.map((id) =>
                        Number.isNaN(Number(id)) ? id : Number(id)
                    ),
                };
            })
            .filter((assignment) => assignment.subject_ids.length > 0);

        setSaving(true);

        try {
            await api.put(`/teachers/${teacherId}/assignments`, {
                academic_session_id: Number.isNaN(Number(sessionId))
                    ? sessionId
                    : Number(sessionId),
                assignments,
            });

            setNotice("Teacher assignments saved successfully.");
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    }

    const assignmentCount = Object.values(selected).reduce(
        (total, ids) => total + ids.length,
        0
    );

    if (loading) {
        return (
            <div className="teachers-page">
                <div className="loading-state">
                    Loading teacher assignments...
                </div>
            </div>
        );
    }

    return (
        <div className="teachers-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Teacher Assignments</h1>
                    <p className="page-subtitle">
                        Assign classes and subjects for the selected academic
                        session.
                    </p>
                </div>

                <Link to="/teachers" className="btn btn-outline">
                    ← Back to Teachers
                </Link>
            </div>

            {teacher && (
                <div className="card">
                    <div className="card-body">
                        <div className="teacher-profile">
                            <span className="teacher-avatar">
                                {getTeacherName(teacher)
                                    .split(/\s+/)
                                    .filter(Boolean)
                                    .slice(0, 2)
                                    .map((part) => part[0])
                                    .join("")
                                    .toUpperCase() || "T"}
                            </span>

                            <div>
                                <h2
                                    className="card-title"
                                    style={{ marginBottom: 5 }}
                                >
                                    {getTeacherName(teacher) || "Teacher"}
                                </h2>

                                <p className="page-subtitle">
                                    Staff ID: {teacher.teacher_id || "—"}
                                    {teacher.email
                                        ? ` · ${teacher.email}`
                                        : ""}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            {notice && (
                <div className="alert alert-success" role="status">
                    {notice}
                </div>
            )}

            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">Assignment Setup</h2>

                    <span className="status-badge status-active">
                        {assignmentCount} selected
                    </span>
                </div>

                <div className="card-body">
                    <div className="assignment-toolbar">
                        <div className="form-group">
                            <label
                                className="form-label"
                                htmlFor="academic_session_id"
                            >
                                Academic Session
                            </label>

                            <select
                                id="academic_session_id"
                                className="form-select"
                                value={sessionId}
                                onChange={handleSessionChange}
                                disabled={sessions.length === 0 || saving}
                            >
                                <option value="">
                                    Select academic session
                                </option>

                                {sessions.map((session) => {
                                    const id = getSessionId(session);

                                    return (
                                        <option key={id} value={String(id)}>
                                            {getSessionName(session)}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => {
                                setSelected({});
                                setNotice("");
                            }}
                            disabled={saving || subjectsLoading || !sessionId}
                        >
                            Clear Selection
                        </button>
                    </div>

                    {sessions.length === 0 ? (
                        <div className="empty-state">
                            <h3>No academic sessions available</h3>
                            <p>
                                Create an academic session before assigning
                                teachers to classes and subjects.
                            </p>
                        </div>
                    ) : activeClasses.length === 0 ? (
                        <div className="empty-state">
                            <h3>No classes available</h3>
                            <p>
                                Create classes before configuring teacher
                                assignments.
                            </p>
                        </div>
                    ) : (
                        <>
                            <p
                                className="page-subtitle"
                                style={{ marginBottom: 20 }}
                            >
                                Select the subjects this teacher will teach
                                in each class. Only subjects configured for
                                that class and academic session are displayed.
                            </p>

                            {subjectsLoading && (
                                <div className="loading-state">
                                    Loading subjects for this academic session...
                                </div>
                            )}

                            {!subjectsLoading &&
                                activeClasses.map((schoolClass) => {
                                    const classId = getClassId(schoolClass);
                                    const classKey = String(classId);

                                    const availableSubjects =
                                        subjectsByClass[classKey] ?? [];

                                    const selectedIds =
                                        selected[classKey] ?? [];

                                    const allSelected =
                                        availableSubjects.length > 0 &&
                                        availableSubjects.every((subject) =>
                                            selectedIds.includes(
                                                String(getSubjectId(subject))
                                            )
                                        );

                                    return (
                                        <section
                                            className="assignment-class"
                                            key={classId}
                                        >
                                            <div className="assignment-class-header">
                                                <h3 className="assignment-class-title">
                                                    {getClassName(schoolClass)}
                                                </h3>

                                                <button
                                                    type="button"
                                                    className="btn btn-outline btn-sm"
                                                    onClick={() =>
                                                        toggleClass(
                                                            classId,
                                                            availableSubjects.map(
                                                                getSubjectId
                                                            )
                                                        )
                                                    }
                                                    disabled={
                                                        saving ||
                                                        availableSubjects.length ===
                                                            0
                                                    }
                                                >
                                                    {allSelected
                                                        ? "Deselect All"
                                                        : "Select All"}
                                                </button>
                                            </div>

                                            <div className="assignment-subjects">
                                                {availableSubjects.map(
                                                    (subject) => {
                                                        const subjectId =
                                                            getSubjectId(subject);

                                                        const checked =
                                                            selectedIds.includes(
                                                                String(subjectId)
                                                            );

                                                        return (
                                                            <label
                                                                className="assignment-subject"
                                                                key={subjectId}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={checked}
                                                                    onChange={() =>
                                                                        toggleSubject(
                                                                            classId,
                                                                            subjectId
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        saving
                                                                    }
                                                                />

                                                                <span>
                                                                    {getSubjectName(
                                                                        subject
                                                                    )}
                                                                </span>
                                                            </label>
                                                        );
                                                    }
                                                )}

                                                {availableSubjects.length ===
                                                    0 && (
                                                    <p className="form-hint">
                                                        No subjects are configured
                                                        for this class in the
                                                        selected academic session.
                                                    </p>
                                                )}
                                            </div>
                                        </section>
                                    );
                                })}

                            <div className="form-actions">
                                <Link
                                    to="/teachers"
                                    className="btn btn-outline"
                                >
                                    Cancel
                                </Link>

                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleSave}
                                    disabled={
                                        saving ||
                                        subjectsLoading ||
                                        !sessionId
                                    }
                                >
                                    {saving
                                        ? "Saving Assignments..."
                                        : "Save Assignments"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
