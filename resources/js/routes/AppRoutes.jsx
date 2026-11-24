import React from 'react';
import {
    Navigate,
    Outlet,
    Route,
    Routes,
} from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

import ProtectedRoute from '../components/ProtectedRoute';
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';

import Login from '../pages/auth/Login';
import Dashboard from '../pages/dashboard/Dashboard';

import ParentDashboard from '../pages/parent/ParentDashboard';
import TeacherDashboard from '../pages/teacher/TeacherDashboard';
import StudentDashboard from '../pages/student/StudentDashboard';

import Students from '../pages/students/Students';
import StudentForm from '../pages/students/StudentForm';
import StudentProfile from '../pages/students/StudentProfile';
import StudentEnrollmentForm from '../pages/students/StudentEnrollmentForm';

import Classes from '../pages/classes/Classes';
import ClassDetails from '../pages/classes/ClassDetails';

import Subjects from '../pages/subjects/Subjects';
import SubjectForm from '../pages/subjects/SubjectForm';
import SubjectDetails from '../pages/subjects/SubjectDetails';
import SubjectAssignments from '../pages/subjects/SubjectAssignments';

import Teachers from '../pages/teachers/Teachers';
import TeacherForm from '../pages/teachers/TeacherForm';
import TeacherAssignments from '../pages/teachers/TeacherAssignments';

import ScoreEntry from '../pages/scores/ScoreEntry';
import Results from '../pages/results/Results';

import AcademicSessions from '../pages/academic/AcademicSessions';

import SchoolSettings from '../pages/settings/SchoolSettings';

import Assessments from '../pages/assessments/Assessments';

function getRoleName(role) {
    return typeof role === 'string' ? role : role?.name || '';
}

function hasRole(user, roleName) {
    return (user?.roles || []).some(
        (role) => getRoleName(role).toLowerCase() === roleName.toLowerCase()
    );
}

function isParentUser(user) {
    return hasRole(user, 'Parent');
}

function isTeacherUser(user) {
    return hasRole(user, 'Teacher');
}

function isStudentUser(user) {
    return hasRole(user, 'Student');
}

function getHomePath(user) {
    if (isStudentUser(user)) return '/student';
    if (isParentUser(user)) return '/parent';
    if (isTeacherUser(user)) return '/teacher';

    return '/dashboard';
}

function HomeRedirect() {
    const { user } = useAuth();

    return <Navigate to={getHomePath(user)} replace />;
}

function ParentOnlyRoute() {
    const { user } = useAuth();

    if (isParentUser(user)) {
        return <Outlet />;
    }

    return <Navigate to={getHomePath(user)} replace />;
}

function TeacherOnlyRoute() {
    const { user } = useAuth();

    if (isTeacherUser(user)) {
        return <Outlet />;
    }

    return <Navigate to={getHomePath(user)} replace />;
}

function StudentOnlyRoute() {
    const { user } = useAuth();

    if (isStudentUser(user)) {
        return <Outlet />;
    }

    return <Navigate to={getHomePath(user)} replace />;
}

function ScoreAccessRoute() {
    const { user } = useAuth();

    if (isStudentUser(user) || isParentUser(user)) {
        return <Navigate to={getHomePath(user)} replace />;
    }

    return <Outlet />;
}

function AdminOnlyRoute() {
    const { user } = useAuth();

    if (
        isStudentUser(user) ||
        isParentUser(user) ||
        isTeacherUser(user)
    ) {
        return <Navigate to={getHomePath(user)} replace />;
    }

    return <Outlet />;
}

function PlaceholderPage({ title }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">
                {title}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
                This module will be implemented in a later development phase.
            </p>
        </div>
    );
}

export default function AppRoutes() {
    return (
        <Routes>
            <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
            </Route>

            <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>

                    {/* Student Portal */}
                    <Route element={<StudentOnlyRoute />}>
                        <Route
                            path="/student"
                            element={<StudentDashboard />}
                        />
                    </Route>

                    {/* Parent Portal */}
                    <Route element={<ParentOnlyRoute />}>
                        <Route
                            path="/parent"
                            element={<ParentDashboard />}
                        />
                    </Route>

                    {/* Teacher Portal */}
                    <Route element={<TeacherOnlyRoute />}>
                        <Route
                            path="/teacher"
                            element={<TeacherDashboard />}
                        />
                    </Route>

                    {/* Score Entry */}
                    <Route element={<ScoreAccessRoute />}>
                        <Route
                            path="/scores"
                            element={<ScoreEntry />}
                        />
                    </Route>

                    {/* Administration Pages */}
                    <Route element={<AdminOnlyRoute />}>
                        <Route
                            path="/dashboard"
                            element={<Dashboard />}
                        />

                        {/* Student Management */}
                        <Route path="/students" element={<Students />} />

                        <Route
                            path="/students/create"
                            element={<StudentForm />}
                        />

                        <Route
                            path="/students/:studentId"
                            element={<StudentProfile />}
                        />

                        <Route
                            path="/students/:studentId/enrollments/create"
                            element={<StudentEnrollmentForm />}
                        />

                        <Route
                            path="/students/:studentId/edit"
                            element={<StudentForm />}
                        />

                        {/* Class Management */}
                        <Route path="/classes" element={<Classes />} />

                        <Route
                            path="/classes/:classId"
                            element={<ClassDetails />}
                        />

                        {/* Subject Management */}
                        <Route path="/subjects" element={<Subjects />} />

                        <Route
                            path="/subjects/create"
                            element={<SubjectForm />}
                        />

                        <Route
                            path="/subjects/:subjectId"
                            element={<SubjectDetails />}
                        />

                        <Route
                            path="/subjects/:subjectId/edit"
                            element={<SubjectForm />}
                        />

                        <Route
                            path="/subjects/:subjectId/assignments"
                            element={<SubjectAssignments />}
                        />

                        {/* Teacher Management */}
                        <Route path="/teachers" element={<Teachers />} />

                        <Route
                            path="/teachers/create"
                            element={<TeacherForm />}
                        />

                        <Route
                            path="/teachers/:teacherId/edit"
                            element={<TeacherForm />}
                        />

                        <Route
                            path="/teachers/:teacherId/assignments"
                            element={<TeacherAssignments />}
                        />

                        {/* Result Management */}
                        <Route path="/results" element={<Results />} />

                        <Route
                            path="/assessments"
                            element={<Assessments />}
                        />

                        <Route
                            path="/academic-sessions"
                            element={<AcademicSessions />}
                        />

                        <Route
                            path="/settings"
                            element={<SchoolSettings />}
                        />
                    </Route>
                </Route>
            </Route>

            <Route path="/" element={<HomeRedirect />} />
            <Route path="*" element={<HomeRedirect />} />
        </Routes>
    );
}
