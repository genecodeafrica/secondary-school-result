
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';

export default function TeacherDashboard() {
    const [teacher, setTeacher] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        async function loadDashboard() {
            setLoading(true);
            setError('');

            try {
                const [profileResponse, assignmentsResponse] =
                    await Promise.all([
                        apiClient.get('/academic/teacher/profile'),
                        apiClient.get('/academic/teacher/assignments'),
                    ]);

                if (!active) return;

                setTeacher(profileResponse.data?.data || null);
                setAssignments(assignmentsResponse.data?.data || []);
            } catch (err) {
                if (!active) return;

                setError(
                    err.response?.data?.message ||
                    'Unable to load your teacher dashboard. Please try again.'
                );
            } finally {
                if (active) setLoading(false);
            }
        }

        loadDashboard();

        return () => {
            active = false;
        };
    }, []);

    const summary = useMemo(() => ({
        totalAssignments: assignments.length,
        totalClasses: new Set(
            assignments.map((item) => item.class_id)
        ).size,
        totalSubjects: new Set(
            assignments.map((item) => item.subject_id)
        ).size,
        totalSessions: new Set(
            assignments.map((item) => item.academic_session_id)
        ).size,
    }), [assignments]);

    const teacherName = teacher
        ? [
            teacher.first_name,
            teacher.middle_name,
            teacher.last_name,
        ].filter(Boolean).join(' ')
        : 'Teacher';

    const uniqueAssignments = useMemo(() => {
        const seen = new Set();

        return assignments.filter((item) => {
            const key = [
                item.class_id,
                item.subject_id,
                item.academic_session_id,
            ].join('-');

            if (seen.has(key)) return false;

            seen.add(key);
            return true;
        });
    }, [assignments]);

    if (loading) {
        return (
            <div className="flex min-h-[300px] items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
                    <p className="mt-4 text-sm text-slate-500">
                        Loading your teacher dashboard...
                    </p>
                </div>
            </div>
        );
    }

    if (error && !teacher) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6">
                <h2 className="font-semibold text-red-800">
                    Dashboard unavailable
                </h2>
                <p className="mt-2 text-sm text-red-700">{error}</p>
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white shadow-sm md:p-8">
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                    <div>
                        <p className="text-sm font-medium text-emerald-300">
                            TEACHER PORTAL
                        </p>

                        <h1 className="mt-2 text-2xl font-bold md:text-3xl">
                            Welcome, {teacherName}
                        </h1>

                        <p className="mt-2 text-sm text-slate-300">
                            Manage your teaching assignments and student scores.
                        </p>

                        {teacher?.teacher_id && (
                            <p className="mt-3 text-xs text-slate-400">
                                Teacher ID: {teacher.teacher_id}
                            </p>
                        )}
                    </div>

                    <Link
                        to="/scores"
                        className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400"
                    >
                        Enter Student Scores →
                    </Link>
                </div>
            </section>

            {error && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    {error}
                </div>
            )}

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    {
                        label: 'Teaching Assignments',
                        value: summary.totalAssignments,
                        description: 'Class and subject combinations',
                        icon: '▦',
                    },
                    {
                        label: 'Assigned Classes',
                        value: summary.totalClasses,
                        description: 'Classes assigned to you',
                        icon: '🏫',
                    },
                    {
                        label: 'Assigned Subjects',
                        value: summary.totalSubjects,
                        description: 'Different subjects',
                        icon: '📚',
                    },
                    {
                        label: 'Academic Sessions',
                        value: summary.totalSessions,
                        description: 'Sessions with assignments',
                        icon: '◷',
                    },
                ].map((item) => (
                    <div
                        key={item.label}
                        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-500">
                                {item.label}
                            </span>
                            <span className="text-xl text-emerald-600">
                                {item.icon}
                            </span>
                        </div>

                        <p className="mt-3 text-3xl font-bold text-slate-900">
                            {item.value}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            {item.description}
                        </p>
                    </div>
                ))}
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            My Teaching Assignments
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Classes and subjects assigned by your school administrator.
                        </p>
                    </div>

                    <Link
                        to="/scores"
                        className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                        Go to Score Entry →
                    </Link>
                </div>

                {assignments.length === 0 ? (
                    <div className="p-8 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl">
                            📚
                        </div>

                        <h3 className="mt-4 font-semibold text-slate-900">
                            No teaching assignments yet
                        </h3>

                        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                            Your classes and subjects will appear here after
                            the school administrator assigns them to your
                            teacher profile.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="px-5 py-4">Class</th>
                                    <th className="px-5 py-4">Subject</th>
                                    <th className="px-5 py-4">Academic Session</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {uniqueAssignments.map((item) => (
                                    <tr
                                        key={`${item.id}-${item.class_id}-${item.subject_id}`}
                                        className="hover:bg-slate-50"
                                    >
                                        <td className="px-5 py-4 font-medium text-slate-900">
                                            {item.school_class?.name ||
                                                item.school_class?.class_name ||
                                                `Class ${item.class_id}`}
                                        </td>

                                        <td className="px-5 py-4 text-slate-700">
                                            {item.subject?.name ||
                                                `Subject ${item.subject_id}`}
                                        </td>

                                        <td className="px-5 py-4 text-slate-600">
                                            {item.academic_session?.name ||
                                                item.academic_session?.session_name ||
                                                `Session ${item.academic_session_id}`}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Link
                    to="/scores"
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
                >
                    <div className="text-2xl text-emerald-600">✎</div>
                    <h3 className="mt-3 font-bold text-slate-900">
                        Student Score Entry
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                        Record and update scores for your assigned classes and subjects.
                    </p>
                    <span className="mt-4 inline-block text-sm font-semibold text-emerald-700">
                        Open Score Entry →
                    </span>
                </Link>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="text-2xl text-blue-600">✓</div>
                    <h3 className="mt-3 font-bold text-slate-900">
                        Teaching Assignments
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                        Your assignment information is managed by the school administrator.
                    </p>
                </div>
            </section>
        </div>
    );
}
