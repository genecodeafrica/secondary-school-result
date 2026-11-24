
import React, { useState } from 'react';
import {
    Navigate,
    useLocation,
    useNavigate,
} from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const TOKEN_KEY = 'school_result_token';

export default function Login() {
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [form, setForm] = useState({
	email: '',
	password: '',
    });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (loading) return;

        setError('');
        setLoading(true);

        try {
            await login(form.email.trim(), form.password);

            const savedToken = localStorage.getItem(TOKEN_KEY);

            if (!savedToken) {
                throw new Error(
                    'Login succeeded, but the access token was not saved. Please check AuthContext.jsx.'
                );
            }

            const destination =
                location.state?.from?.pathname || '/dashboard';

            navigate(destination, { replace: true });
        } catch (err) {
            console.error('Login error:', err);

            const responseErrors = err.response?.data?.errors;

            if (responseErrors) {
                const firstError = Object.values(responseErrors)
                    .flat()
                    .find((message) => typeof message === 'string');

                setError(firstError || 'Please check your login details.');
            } else {
                setError(
                    err.response?.data?.message ||
                    err.message ||
                    'Unable to sign in. Please try again.'
                );
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="login-page">
            <section className="login-brand-panel">
                <div className="brand-content">
                    <div className="brand-logo">
                        <div className="brand-logo-icon">
                            <i className="fas fa-graduation-cap"></i>
                        </div>

                        <div>
                            <h1>Secondary School</h1>
                            <p>RESULT PROCESSING SYSTEM</p>
                        </div>
                    </div>

                    <div className="brand-message">
                        <span className="brand-eyebrow">
                            <span className="eyebrow-dot"></span>
                            A smarter way to manage academics
                        </span>

                        <h2>
                            Better results.
                            <br />
                            <span>Better decisions.</span>
                        </h2>

                        <p>
                            Manage student records, assessment scores and
                            academic results through one secure and
                            centralized platform.
                        </p>

                        <div className="brand-features">
                            <div className="brand-feature">
                                <span><i className="fas fa-user-graduate"></i></span>
                                <div>
                                    <strong>Student Management</strong>
                                    <small>Organized academic records</small>
                                </div>
                            </div>

                            <div className="brand-feature">
                                <span><i className="fas fa-chart-line"></i></span>
                                <div>
                                    <strong>Result Processing</strong>
                                    <small>Accurate academic performance</small>
                                </div>
                            </div>

                            <div className="brand-feature">
                                <span><i className="fas fa-shield-alt"></i></span>
                                <div>
                                    <strong>Secure Administration</strong>
                                    <small>Controlled review and approval</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="brand-footer">
                    <span>© {new Date().getFullYear()} Secondary School</span>
                    <span>Academic Management Platform</span>
                </div>

                <div className="brand-decoration brand-decoration-one"></div>
                <div className="brand-decoration brand-decoration-two"></div>
            </section>

            <section className="login-form-panel">
                <div className="login-form-wrapper">
                    <div className="mobile-brand">
                        <div className="mobile-brand-icon">
                            <i className="fas fa-graduation-cap"></i>
                        </div>
                        <div>
                            <strong>Secondary School</strong>
                            <span>Result Processing System</span>
                        </div>
                    </div>

                    <div className="login-heading">
                        <div className="login-heading-icon">
                            <i className="fas fa-lock"></i>
                        </div>

                        <span className="login-overline">ACCOUNT ACCESS</span>
                        <h2>Welcome back</h2>
                        <p>
                            Enter your account details to access your
                            dashboard.
                        </p>
                    </div>

                    {error && (
                        <div className="login-error" role="alert">
                            <i className="fas fa-exclamation-circle"></i>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-field">
                            <label htmlFor="email">Email address</label>

                            <div className="input-wrapper">
                                <i className="fas fa-envelope input-icon"></i>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="Enter your email address"
                                    value={form.email}
                                    onChange={handleChange}
                                    autoComplete="username"
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="form-field">
                            <label htmlFor="password">Password</label>

                            <div className="input-wrapper">
                                <i className="fas fa-key input-icon"></i>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter your password"
                                    value={form.password}
                                    onChange={handleChange}
                                    autoComplete="current-password"
                                    required
                                    disabled={loading}
                                />

                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword((value) => !value)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="login-submit"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="login-spinner"></span>
                                    Signing you in...
                                </>
                            ) : (
                                <>
                                    Sign in to your account
                                    <i className="fas fa-arrow-right"></i>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="login-security-note">
                        <i className="fas fa-shield-alt"></i>
                        <span>Your account is protected by secure authentication.</span>
                    </div>

                    <div className="login-bottom">
                        <p>Secondary School Result Processing System</p>
                        <span>Designed for better academic management</span>
                    </div>
                </div>
            </section>
        </main>
    );
}
