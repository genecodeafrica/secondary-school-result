import React from 'react';
import ReactDOM from 'react-dom/client';

import { BrowserRouter } from 'react-router-dom';

import AppRoutes from './routes/AppRoutes';
import { AuthProvider } from './context/AuthContext';
import '@fortawesome/fontawesome-free/css/all.min.css';

import '../css/app.css';

ReactDOM.createRoot(document.getElementById('app')).render(
    <React.StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>
);