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

import Schools from '../pages/schools/Schools';

function getRoleName(role) {
    return typeof role === 'string' ? role : role?.name || '';
}

function hasRole(user, roleName) {
    return (user?.roles || []).some(
        (role) =>
            getRoleName(role).toLowerCase() === roleName.toLowerCase()
    );
}

function isSuperAdminUser(user) {
    return hasRole(user, 'Super Admin');
}

function isSchoolAdminUser(user) {
    return hasRole(user, 'School Admin');
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
    if (isSuperAdminUser(user)) return '/schools';
    if (isStudentUser(user)) return '/student';
    if (isParentUser(user)) return '/parent';
    if (isTeacherUser(user)) return '/teacher';
    if (isSchoolAdminUser(user)) return '/dashboard';

    return '/access-denied';
}

function HomeRedirect() {
    const { user } = useAuth();

    return <Navigate to={getHomePath(user)} replace />;
}

function AccessDenied() {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                <i className="fas fa-lock text-xl" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900">
                Access Restricted
            </h1>

            <p className="mt-2 text-sm text-slate-600">
                Your account does not currently have access to this section.
                Please contact your school administrator.
            </p>
        </div>
    );
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

function SuperAdminOnlyRoute() {
    const { user } = useAuth();

    if (isSuperAdminUser(user)) {
        return <Outlet />;
    }

    return <Navigate to={getHomePath(user)} replace />;
}

function SchoolAdminOnlyRoute() {
    const { user } = useAuth();

    if (isSchoolAdminUser(user)) {
        return <Outlet />;
    }

    return <Navigate to={getHomePath(user)} replace />;
}

function ScoreAccessRoute() {
    const { user } = useAuth();

    if (
        isTeacherUser(user) ||
        isSchoolAdminUser(user)
    ) {
        return <Outlet />;
    }

    return <Navigate to={getHomePath(user)} replace />;
}

export default function AppRoutes() {
    return (
        <Routes>
            {/* Authentication */}
            <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
            </Route>

            {/* Protected Application */}
            <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>

                    {/* Super Admin - School Registration Only */}
                    <Route element={<SuperAdminOnlyRoute />}>
                        <Route
                            path="/schools"
                            element={<Schools />}
                        />
                    </Route>

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

                    {/* Score Entry - Teacher and School Admin */}
                    <Route element={<ScoreAccessRoute />}>
                        <Route
                            path="/scores"
                            element={<ScoreEntry />}
                        />
                    </Route>

                    {/* School Admin - School Operations */}
                    <Route element={<SchoolAdminOnlyRoute />}>

                        <Route
                            path="/dashboard"
                            element={<Dashboard />}
                        />

                        {/* Student Management */}
                        <Route
                            path="/students"
                            element={<Students />}
                        />

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
                        <Route
                            path="/classes"
                            element={<Classes />}
                        />

                        <Route
                            path="/classes/:classId"
                            element={<ClassDetails />}
                        />

                        {/* Subject Management */}
                        <Route
                            path="/subjects"
                            element={<Subjects />}
                        />

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
                        <Route
                            path="/teachers"
                            element={<Teachers />}
                        />

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
                        <Route
                            path="/results"
                            element={<Results />}
                        />

                        <Route
                            path="/assessments"
                            element={<Assessments />}
                        />

                        <Route
                            path="/academic-sessions"
                            element={<AcademicSessions />}
                        />

                        {/* School Settings */}
                        <Route
                            path="/settings"
                            element={<SchoolSettings />}
                        />
                    </Route>

                    {/* Other roles - restricted until their pages are implemented */}
                    <Route
                        path="/access-denied"
                        element={<AccessDenied />}
                    />
                </Route>
            </Route>

            {/* Default Redirects */}
            <Route
                path="/"
                element={<HomeRedirect />}
            />

            <Route
                path="*"
                element={<HomeRedirect />}
            />
        </Routes>
    );
}
