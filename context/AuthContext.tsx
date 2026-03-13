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
    itinerary: { view: false, manage: false },
    inventory: { view: false, manage: false },
    masters: { view: false, manage: false },
    vendors: { view: false, manage: false },
    finance: { view: false, manage: false },
    marketing: { view: false, manage: false },
    staff: { view: false, manage: false },
    reports: { view: false, manage: false },
    audit: { view: false, manage: false },
};

const ADMIN_PERMISSIONS: StaffPermissions = {
    dashboard: { view: true, manage: true },
    leads: { view: true, manage: true },
    customers: { view: true, manage: true },
    bookings: { view: true, manage: true },
    itinerary: { view: true, manage: true },
    inventory: { view: true, manage: true },
    masters: { view: true, manage: true },
    vendors: { view: true, manage: true },
    finance: { view: true, manage: true },
    marketing: { view: true, manage: true },
    staff: { view: true, manage: true },
    reports: { view: true, manage: true },
    audit: { view: true, manage: true },
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

    // Unified User Loading Logic
    const loadUserProfile = useCallback(async (email: string) => {
        try {
            // 1. Try single fetch first
            const me = await api.getStaffByEmail(email);
            if (me) {
                setCurrentUser(me);
                // Background fetch full list
                api.getStaff().then(setStaff).catch(console.warn);
                return;
            }

            // 2. Fallback / Auto-create logic
            console.warn("User profile not found via direct fetch. Checking full list/creating.");
            const allStaff = await api.getStaff();
            const found = allStaff.find(s => s.email.toLowerCase() === email.toLowerCase());

            if (found) {
                setCurrentUser(found);
                setStaff(allStaff);
            } else {
                // Auto-create logic
                const isFirst = allStaff.length === 0;
                const isAdmin = email === 'toursshravya@gmail.com';

                const newStaffData: Partial<StaffMember> = {
                    name: email.split('@')[0],
                    email: email,
                    role: (isFirst || isAdmin) ? 'Administrator' : 'Agent',
                    userType: (isFirst || isAdmin) ? 'Admin' : 'Staff',
                    initials: email.substring(0, 2).toUpperCase(),
                    department: (isFirst || isAdmin) ? 'Executive' : 'Sales',
                    status: 'Active',
                    lastActive: new Date().toISOString(),
                    color: 'indigo',
                    queryScope: 'Show All Queries',
                    whatsappScope: 'All Messages',
                    permissions: (isFirst || isAdmin) ? ADMIN_PERMISSIONS : DEFAULT_PERMISSIONS
                };

                const created = await api.createStaff(newStaffData as any);
                setCurrentUser(created);
                setStaff([created, ...allStaff]);
            }
        } catch (e) {
            console.error("Error loading user profile:", e);
            throw e;
        }
    }, []);

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
                        await loadUserProfile(payload.email);
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

    // Force safety timeout for loading state
    useEffect(() => {
        const safetyTimer = setTimeout(() => {
            setLoading(false);
        }, 10000); // 10s absolute max loading time
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
            const API_BASE = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`);
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

            // Load user profile
            await loadUserProfile(email);
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
            await api.updateStaff(id, member);
            setStaff(prev => prev.map(s => s.id === id ? { ...s, ...member } : s));
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
        }
    }, [currentUser, staff, realUser]);

    const stopMasquerading = useCallback(() => {
        if (realUser) {
            setCurrentUser(realUser);
            setRealUser(null);
        }
    }, [realUser]);

    const hasPermission = useCallback(
        (module: keyof StaffPermissions, action: 'view' | 'manage'): boolean => {
            if (!currentUser) return false;
            if (currentUser.userType === 'Admin') return true;
            return currentUser.permissions?.[module]?.[action] ?? false;
        },
        [currentUser]
    );

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
        }),
        [staff, currentUser, loading, login, logout, addStaff, updateStaff, deleteStaff, hasPermission, masqueradeAs, stopMasquerading, realUser]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

export { DEFAULT_PERMISSIONS, ADMIN_PERMISSIONS };
