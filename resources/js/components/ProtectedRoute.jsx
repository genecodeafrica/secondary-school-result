import React from 'react';

import {
    Navigate,
    Outlet,
    useLocation,
} from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
    const {
        isAuthenticated,
        loading,
    } = useAuth();

    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />

                    <p className="text-sm text-slate-600">
                        Loading school system...
                    </p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: location }}
            />
        );
    }

    return <Outlet />;
}