// @refresh reset
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { StaffMember, StaffPermissions } from '../types';
import { api } from '../src/lib/api';

// Helper for localStorage
const STORAGE_KEY = 'shravya_auth_data';
const JWT_KEY = 'shravya_jwt';

const loadFromStorage = <T,>(key: string, fallback: T): T => {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : fallback;
    } catch {
        return fallback;
    }
};

const saveToStorage = <T,>(key: string, data: T) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to save to localStorage:', e);
    }
};

// Default permissions
const DEFAULT_PERMISSIONS: StaffPermissions = {
    dashboard: { view: true, manage: false },
    leads: { view: false, manage: false },
    customers: { view: false, manage: false },
    bookings: { view: false, manage: false },
    operations: { view: false, manage: false },
    itinerary: { view: false, manage: false },
    inventory: { view: false, manage: false },
    masters: { view: false, manage: false },
    vendors: { view: false, manage: false },
    finance: { view: false, manage: false },
    invoices: { view: false, manage: false },
    proposals: { view: false, manage: false },
    marketing: { view: false, manage: false },
    staff: { view: false, manage: false },
    reports: { view: false, manage: false },
    audit: { view: false, manage: false },
    settings: { view: false, manage: false },
    cms: { view: false, manage: false },
    partners: { view: false, manage: false },
    memberships: { view: false, manage: false },
    testimonials: { view: false, manage: false },
};

const ADMIN_PERMISSIONS: StaffPermissions = {
    dashboard: { view: true, manage: true },
    leads: { view: true, manage: true },
    customers: { view: true, manage: true },
    bookings: { view: true, manage: true },
    operations: { view: true, manage: true },
    itinerary: { view: true, manage: true },
    inventory: { view: true, manage: true },
    masters: { view: true, manage: true },
    vendors: { view: true, manage: true },
    finance: { view: true, manage: true },
    invoices: { view: true, manage: true },
    proposals: { view: true, manage: true },
    marketing: { view: true, manage: true },
    staff: { view: true, manage: true },
    reports: { view: true, manage: true },
    audit: { view: true, manage: true },
    settings: { view: true, manage: true },
    cms: { view: true, manage: true },
    partners: { view: true, manage: true },
    memberships: { view: true, manage: true },
    testimonials: { view: true, manage: true },
};

const INITIAL_STAFF: StaffMember[] = [];

interface AuthContextType {
    staff: StaffMember[];
    currentUser: StaffMember | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    addStaff: (member: StaffMember, password?: string) => void;
    updateStaff: (id: number, member: Partial<StaffMember>) => void;
    deleteStaff: (id: number) => void;
    hasPermission: (module: keyof StaffPermissions, action: 'view' | 'manage') => boolean;
    masqueradeAs: (staffId: number) => void;
    stopMasquerading: () => void;
    isMasquerading: boolean;
    realUser: StaffMember | null;
    refreshStaff: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [currentUser, setCurrentUser] = useState<StaffMember | null>(null);
    const [loading, setLoading] = useState(true);

    // Mock persistence key
    const STORAGE_KEY_MOCK = 'shravya_mock_session';

    // Mock Admin User Constant
    const MOCK_ADMIN_USER: StaffMember = {
        id: 999,
        name: 'Admin User',
        email: 'admin@shravyatours.com',
        role: 'Administrator',
        userType: 'Admin',
        initials: 'AD',
        department: 'Executive',
        status: 'Active',
        lastActive: new Date().toISOString(),
        color: 'indigo',
        queryScope: 'Show All Queries',
        whatsappScope: 'All Messages',
        permissions: ADMIN_PERMISSIONS,
    };

    // Ensures loaded permissions always have all keys — fills in new keys with defaults
    // if a staff record was created before new permissions were added.
    const mergePermissions = useCallback((stored: Partial<StaffPermissions> | null | undefined): StaffPermissions => {
        const merged = { ...DEFAULT_PERMISSIONS };
        if (stored && typeof stored === 'object') {
            for (const key of Object.keys(DEFAULT_PERMISSIONS) as Array<keyof StaffPermissions>) {
                if (key in stored && stored[key] !== undefined) {
                    merged[key] = stored[key] as any;
                }
            }
        }
        return merged;
    }, []);

    // Unified User Loading Logic
    const loadUserProfile = useCallback(async (email: string, isAdminOverride?: boolean) => {
        try {
            // 1. Try single fetch first
            const me = await api.getStaffByEmail(email);
            if (me) {
                const userProfile = { ...me, permissions: mergePermissions(me.permissions) };
                if (isAdminOverride) {
                    userProfile.userType = 'Admin';
                    userProfile.permissions = ADMIN_PERMISSIONS;
                    if (userProfile.role !== 'Administrator') {
                        userProfile.role = 'Administrator';
                    }
                }
                setCurrentUser(userProfile);
                // Background fetch full list
                api.getStaff().then(all => setStaff(all.map(s => {
                    if (s.email.toLowerCase() === email.toLowerCase() && isAdminOverride) {
                        return { ...s, userType: 'Admin', role: 'Administrator', permissions: ADMIN_PERMISSIONS };
                    }
                    return { ...s, permissions: mergePermissions(s.permissions) };
                }))).catch(console.warn);
                return;
            }

            // 2. Fallback: check full staff list
            console.warn("User profile not found via direct fetch. Checking full list.");
            const allStaff = await api.getStaff();
            const found = allStaff.find(s => s.email.toLowerCase() === email.toLowerCase());

            if (found) {
                const userProfile = { ...found, permissions: mergePermissions(found.permissions) };
                if (isAdminOverride) {
                    userProfile.userType = 'Admin';
                    userProfile.permissions = ADMIN_PERMISSIONS;
                    if (userProfile.role !== 'Administrator') {
                        userProfile.role = 'Administrator';
                    }
                }
                setCurrentUser(userProfile);
                setStaff(allStaff.map(s => {
                    if (s.email.toLowerCase() === email.toLowerCase() && isAdminOverride) {
                        return { ...s, userType: 'Admin', role: 'Administrator', permissions: ADMIN_PERMISSIONS };
                    }
                    return { ...s, permissions: mergePermissions(s.permissions) };
                }));
            } else {
                // No auto-create: use basic profile from email. Admins should create staff profiles explicitly.
                console.warn(`No staff profile found for ${email}. Using basic profile.`);
                setCurrentUser({
                    id: 0,
                    name: email.split('@')[0],
                    email: email,
                    role: isAdminOverride ? 'Administrator' : 'Agent',
                    userType: isAdminOverride ? 'Admin' : 'Staff',
                    initials: email.substring(0, 2).toUpperCase(),
                    department: 'General',
                    status: 'Active',
                    lastActive: new Date().toISOString(),
                    color: 'indigo',
                    queryScope: 'Show All Queries',
                    whatsappScope: 'All Messages',
                    permissions: isAdminOverride ? ADMIN_PERMISSIONS : DEFAULT_PERMISSIONS,
                });
                setStaff(allStaff.map(s => ({ ...s, permissions: mergePermissions(s.permissions) })));
            }
        } catch (e) {
            console.error("Error loading user profile:", e);
            throw e;
        }
    }, [mergePermissions]);

    // Consolidated Initialization
    const initializeAuth = useCallback(async () => {
        try {
            // 1. Check for JWT Token
            const token = localStorage.getItem(JWT_KEY);
            if (token) {
                try {
                    // Decode JWT payload (without verification — server will verify on API calls)
                    const payload = JSON.parse(atob(token.split('.')[1]));

                    // Check if token is expired
                    if (payload.exp && payload.exp * 1000 < Date.now()) {
                        localStorage.removeItem(JWT_KEY);
                        setCurrentUser(null);
                        setLoading(false);
                        return;
                    }

                    if (payload.email) {
                        // Heartbeat: update last_active for this user on every app load
                        // (fire-and-forget — don't block auth init)
                        api.heartbeat().then(hb => {
                            if (hb?.staff) {
                                // After heartbeat, refresh the full staff list so Last Active is current
                                api.getStaff().then(all => setStaff(all.map(s => ({ ...s, permissions: mergePermissions(s.permissions) })))).catch(console.warn);
                            }
                        }).catch(console.warn);

                        // Admin bypass user — use mock admin directly, no DB needed
                        if (payload.id === 999) {
                            setCurrentUser(MOCK_ADMIN_USER);
                            // Also load staff list so Staff Management page works
                            api.getStaff().then(setStaff).catch(console.warn);
                        } else {
                            try {
                                await loadUserProfile(payload.email, payload.role === 'admin');
                            } catch (profileErr) {
                                console.warn('Could not load staff profile on init, using basic info:', profileErr);
                                setCurrentUser({
                                    id: payload.id,
                                    name: payload.email.split('@')[0],
                                    email: payload.email,
                                    role: payload.role === 'admin' ? 'Administrator' : 'Agent',
                                    userType: payload.role === 'admin' ? 'Admin' : 'Staff',
                                    initials: payload.email.substring(0, 2).toUpperCase(),
                                    department: 'General',
                                    status: 'Active',
                                    lastActive: new Date().toISOString(),
                                    color: 'indigo',
                                    queryScope: 'Show All Queries',
                                    whatsappScope: 'All Messages',
                                    permissions: payload.role === 'admin' ? ADMIN_PERMISSIONS : DEFAULT_PERMISSIONS,
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.error('JWT decode failed:', e);
                    localStorage.removeItem(JWT_KEY);
                    setCurrentUser(null);
                }
            } else {
                setCurrentUser(null);
            }

        } catch (error) {
            console.error("Auth initialization failed", error);
            setCurrentUser(null);
        } finally {
            setLoading(false);
        }
    }, [loadUserProfile]);

    // Force safety timeout
    useEffect(() => {
        const safetyTimer = setTimeout(() => {
            console.warn('Auth loading safety timeout after 5s');
            setLoading(false);
        }, 5000); // 5s absolute max loading time
        return () => clearTimeout(safetyTimer);
    }, []);

    useEffect(() => {
        initializeAuth();
    }, [initializeAuth]);

    const logAuthAction = useCallback(async (action: string, module: string, details: string, performedBy?: string) => {
        try {
            const user = performedBy || currentUser?.name || 'System';
            await api.createAuditLog({ action, module, details, severity: 'Info', performedBy: user, timestamp: new Date().toISOString() });
        } catch (e) {
            console.error('Failed to log auth action', e);
        }
    }, [currentUser]);

    const login = useCallback(async (email: string, password: string): Promise<boolean> => {
        try {
            const API_BASE = import.meta.env.VITE_API_URL || '';
            const response = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Login failed on server');
            }

            const data = await response.json();

            // Store the JWT token
            localStorage.setItem(JWT_KEY, data.token);

            // If admin bypass user (id 999), use mock admin directly — no DB needed
            if (data.user?.id === 999) {
                setCurrentUser(MOCK_ADMIN_USER);
                // Also load staff list so Staff Management page works
                api.getStaff().then(setStaff).catch(console.warn);
            } else {
                // Load user profile from DB, fallback gracefully on error
                try {
                    await loadUserProfile(email, data.user?.role === 'admin');
                } catch (profileErr) {
                    console.warn('Could not load staff profile, using basic user info:', profileErr);
                    setCurrentUser({
                        id: data.user.id,
                        name: email.split('@')[0],
                        email: email,
                        role: data.user.role === 'admin' ? 'Administrator' : 'Agent',
                        userType: data.user.role === 'admin' ? 'Admin' : 'Staff',
                        initials: email.substring(0, 2).toUpperCase(),
                        department: 'General',
                        status: 'Active',
                        lastActive: new Date().toISOString(),
                        color: 'indigo',
                        queryScope: 'Show All Queries',
                        whatsappScope: 'All Messages',
                        permissions: data.user.role === 'admin' ? ADMIN_PERMISSIONS : DEFAULT_PERMISSIONS,
                    });
                }
            }

            logAuthAction('Login', 'Authentication', `User ${email} logged in`, email).catch(console.error);
            return true;
        } catch (e: any) {
            console.error("Login exception:", e);
            throw new Error(e.message || "Network error or server unreachable");
        }
    }, [loadUserProfile, logAuthAction]);

    const logout = useCallback(async () => {
        const userEmail = currentUser?.email || 'Unknown User';
        localStorage.removeItem(STORAGE_KEY_MOCK);
        localStorage.removeItem(JWT_KEY);
        setCurrentUser(null);
        logAuthAction('Logout', 'Authentication', `User ${userEmail} logged out`, userEmail).catch(console.error);
    }, [currentUser, logAuthAction]);

    const addStaff = useCallback(async (member: StaffMember, password?: string) => {
        try {
            const created = await api.createStaff(member, password);
            setStaff(prev => [created, ...prev]);
            logAuthAction('Create', 'Staff', `Added new staff member: ${member.name}`).catch(console.error);
        } catch (e) {
            console.error(e);
            throw e;
        }
    }, [logAuthAction]);

    const updateStaff = useCallback(async (id: number, member: Partial<StaffMember>) => {
        try {
            // Only update profile database if updates contain fields other than daily attendance/operational fields
            const hasProfileUpdates = Object.keys(member).some(
                k => !['attendanceStatus', 'checkInTime', 'currentLocation'].includes(k)
            );
            if (hasProfileUpdates) {
                await api.updateStaff(id, member);
            }
            setStaff(prev => prev.map(s => s.id === id ? { ...s, ...member } : s));
            // Fix #2: If editing self, update currentUser immediately so changes reflect without re-login
            setCurrentUser(prev => prev && prev.id === id ? { ...prev, ...member } : prev);
            logAuthAction('Update', 'Staff', `Updated staff member: ${member.name || `ID ${id}`}`).catch(console.error);
        } catch (e) {
            console.error(e);
            throw e;
        }
    }, [logAuthAction]);

    const deleteStaff = useCallback(async (id: number) => {
        try {
            await api.deleteStaff(id);
            setStaff(prev => prev.filter(s => s.id !== id));
            logAuthAction('Delete', 'Staff', `Deleted staff member ID: ${id}`).catch(console.error);
        } catch (e) {
            console.error(e);
            throw e;
        }
    }, [logAuthAction]);

    // Masquerade Logic (Client-side mainly)
    const [realUser, setRealUser] = useState<StaffMember | null>(null);

    const masqueradeAs = useCallback((staffId: number) => {
        const target = staff.find(s => s.id === staffId);
        if (target) {
            if (!realUser) setRealUser(currentUser);
            setCurrentUser(target);
            // Fix #10: Audit log for masquerade
            logAuthAction('Masquerade', 'Staff', `Admin ${currentUser?.name} is now viewing as ${target.name} (ID: ${staffId})`, currentUser?.email).catch(console.error);
        }
    }, [currentUser, staff, realUser, logAuthAction]);

    const stopMasquerading = useCallback(() => {
        if (realUser) {
            // Fix #10: Audit log for ending masquerade
            logAuthAction('StopMasquerade', 'Staff', `Admin ${realUser.name} stopped viewing as ${currentUser?.name}`, realUser.email).catch(console.error);
            setCurrentUser(realUser);
            setRealUser(null);
        }
    }, [realUser, currentUser, logAuthAction]);

    const hasPermission = useCallback(
        (module: keyof StaffPermissions, action: 'view' | 'manage'): boolean => {
            if (!currentUser) return false;
            if (currentUser.userType === 'Admin') return true;
            return currentUser.permissions?.[module]?.[action] ?? false;
        },
        [currentUser]
    );

    const refreshStaff = useCallback(async () => {
        try {
            const all = await api.getStaff();
            setStaff(all.map(s => ({ ...s, permissions: mergePermissions(s.permissions) })));
        } catch (e) {
            console.warn('refreshStaff failed:', e);
        }
    }, [mergePermissions]);

    const value = useMemo(
        () => ({
            staff,
            currentUser,
            isAuthenticated: !!currentUser,
            isLoading: loading,
            login,
            logout,
            addStaff,
            updateStaff,
            deleteStaff,
            hasPermission,
            masqueradeAs,
            stopMasquerading,
            isMasquerading: !!realUser,
            realUser,
            refreshStaff,
        }),
        [staff, currentUser, loading, login, logout, addStaff, updateStaff, deleteStaff, hasPermission, masqueradeAs, stopMasquerading, realUser, refreshStaff]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

export { DEFAULT_PERMISSIONS, ADMIN_PERMISSIONS };
