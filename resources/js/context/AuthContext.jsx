
import React, { createContext, useContext, useEffect, useState } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

const TOKEN_KEY = 'school_result_token';
const USER_KEY = 'school_result_user';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function checkAuthentication() {
            const token = localStorage.getItem(TOKEN_KEY);

            if (!token || token === 'undefined' || token === 'null') {
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(USER_KEY);

                if (!cancelled) {
                    setUser(null);
                    setLoading(false);
                }
                return;
            }

            try {
                const response = await apiClient.get('/auth/me');
                const authenticatedUser = response.data?.data;

                if (!authenticatedUser) {
                    throw new Error('The authentication endpoint did not return a user.');
                }

                if (!cancelled) {
                    setUser(authenticatedUser);
                    localStorage.setItem(
                        USER_KEY,
                        JSON.stringify(authenticatedUser)
                    );
                }
            } catch (error) {
                if (!cancelled) {
                    setUser(null);
                    localStorage.removeItem(TOKEN_KEY);
                    localStorage.removeItem(USER_KEY);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        checkAuthentication();

        return () => {
            cancelled = true;
        };
    }, []);

    const login = async (email, password) => {
        const response = await apiClient.post('/auth/login', {
            email,
            password,
        });

        // Laravel returns: { success, message, data: { user, token, token_type } }
        const payload = response.data;
        const accessToken = payload?.data?.token ?? payload?.token;
        const authenticatedUser = payload?.data?.user ?? payload?.user;

        if (
            typeof accessToken !== 'string' ||
            !accessToken ||
            !authenticatedUser
        ) {
            // Log the response structure for debugging without exposing the token.
            console.error('Unexpected login response:', {
                success: payload?.success,
                message: payload?.message,
                topLevelKeys: Object.keys(payload ?? {}),
                dataKeys: Object.keys(payload?.data ?? {}),
                hasToken: Boolean(accessToken),
                hasUser: Boolean(authenticatedUser),
            });

            throw new Error(
                'Login response did not contain the expected user and token. Check the Laravel login response.'
            );
        }

        localStorage.setItem(TOKEN_KEY, accessToken);
        localStorage.setItem(USER_KEY, JSON.stringify(authenticatedUser));

        setUser(authenticatedUser);

        return payload;
    };

    const logout = async () => {
        try {
            await apiClient.post('/auth/logout');
        } catch (error) {
            // Clear local authentication even if the API request fails.
        } finally {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                isAuthenticated: Boolean(user),
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used inside an AuthProvider');
    }

    return context;
}
