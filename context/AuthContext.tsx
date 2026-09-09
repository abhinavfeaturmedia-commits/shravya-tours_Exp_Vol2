import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { StaffMember, StaffPermissions } from '../types';
import { api } from '../src/lib/api';
import { activityTracker } from '../src/lib/activityTracker';

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

import { buildDefaultPermissions, buildAdminPermissions, normalizePermissions, DataScopeLevel, ALL_MODULE_DEFINITIONS } from '../src/config/permissionsConfig';

// Default and Admin permissions built from central registry
const DEFAULT_PERMISSIONS: StaffPermissions = buildDefaultPermissions() as StaffPermissions;
const ADMIN_PERMISSIONS: StaffPermissions = buildAdminPermissions() as StaffPermissions;

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
    hasPermission: (module: keyof StaffPermissions | string, action: 'view' | 'manage') => boolean;
    canAccess: (module: string, subFeature?: string) => boolean;
    getModuleScope: (module: string) => DataScopeLevel;
    isContactMasked: (module?: string) => boolean;
    canViewCostMargins: (module?: string) => boolean;
    masqueradeAs: (staffId: number) => void;
    stopMasquerading: () => void;
    isMasquerading: boolean;
    realUser: StaffMember | null;
    refreshStaff: () => Promise<void>;
}

const AuthContext = (globalThis as any).__SHRAWELLO_AUTH_CONTEXT__ ?? ((globalThis as any).__SHRAWELLO_AUTH_CONTEXT__ = createContext<AuthContextType | undefined>(undefined));

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

    // Ensures loaded permissions always have all keys & sub-features — fills in new keys with defaults
    // if a staff record was created before new permissions were added.
    const mergePermissions = useCallback((stored: any, userType?: 'Staff' | 'Admin', queryScope?: string): StaffPermissions => {
        return normalizePermissions(stored, userType, queryScope) as unknown as StaffPermissions;
    }, []);

    // Unified User Loading Logic
    const loadUserProfile = useCallback(async (email: string, isAdminOverride?: boolean) => {
        try {
            // 1. Try single fetch first
            const me = await api.getStaffByEmail(email);
            if (me) {
                const userProfile = { ...me, permissions: mergePermissions(me.permissions, me.userType, me.queryScope) };
                if (isAdminOverride) {
                    userProfile.userType = 'Admin';
                    userProfile.permissions = ADMIN_PERMISSIONS;
                    if (userProfile.role !== 'Administrator') {
                        userProfile.role = 'Administrator';
                    }
                }
                setCurrentUser(userProfile);
                // Background fetch full list — if staff lacks permission, fall back to own profile only
                api.getStaff().then(all => setStaff(all.map(s => {
                    if (s.email.toLowerCase() === email.toLowerCase() && isAdminOverride) {
                        return { ...s, userType: 'Admin', role: 'Administrator', permissions: ADMIN_PERMISSIONS };
                    }
                    return { ...s, permissions: mergePermissions(s.permissions, s.userType, s.queryScope) };
                }))).catch(async () => {
                    // 403 or network error — show at least the current user's own profile
                    const selfProfile = { ...userProfile };
                    setStaff([selfProfile]);
                });
                return;
            }

            // 2. Fallback: check full staff list
            console.warn("User profile not found via direct fetch. Checking full list.");
            const allStaff = await api.getStaff();
            const found = allStaff.find(s => s.email.toLowerCase() === email.toLowerCase());

            if (found) {
                const userProfile = { ...found, permissions: mergePermissions(found.permissions, found.userType, found.queryScope) };
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
                    return { ...s, permissions: mergePermissions(s.permissions, s.userType, s.queryScope) };
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
                setStaff(allStaff.map(s => ({ ...s, permissions: mergePermissions(s.permissions, s.userType, s.queryScope) })));
            }
        } catch (e) {
            console.error("Error loading user profile:", e);
            throw e;
        }
    }, [mergePermissions]);

    // Consolidated Initialization
    const initializeAuth = useCallback(async () => {
        try {
            // 0. Check for 5-minute inactivity / closed website timeout
            const lastActiveTs = Number(localStorage.getItem('shrawello_last_active_ts') || 0);
            if (lastActiveTs > 0 && Date.now() - lastActiveTs >= 5 * 60 * 1000) {
                console.log('[Auth] User away for > 5 mins, auto-clearing session');
                localStorage.removeItem(JWT_KEY);
                localStorage.removeItem('shrawello_last_active_ts');
                setCurrentUser(null);
                setLoading(false);
                return;
            }

            // 1. Check for JWT Token
            const token = localStorage.getItem(JWT_KEY);
            if (token) {
                try {
                    // Decode JWT payload (without verification — server will verify on API calls)
                    const payload = JSON.parse(atob(token.split('.')[1]));

                    // Check if token is expired
                    if (payload.exp && payload.exp * 1000 < Date.now()) {
                        localStorage.removeItem(JWT_KEY);
                        localStorage.removeItem('shrawello_last_active_ts');
                        setCurrentUser(null);
                        setLoading(false);
                        return;
                    }

                    if (payload.email) {
                        localStorage.setItem('shrawello_last_active_ts', String(Date.now()));
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
                    localStorage.removeItem('shrawello_last_active_ts');
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
    }, [loadUserProfile, mergePermissions]);

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

            // Store the JWT token & fresh active timestamp
            localStorage.setItem(JWT_KEY, data.token);
            localStorage.setItem('shrawello_last_active_ts', String(Date.now()));

            // If admin bypass user (id 999), use mock admin directly — no DB needed
            if (data.user?.id === 999) {
                setCurrentUser(MOCK_ADMIN_USER);
                // Also load staff list so Staff Management page works
                api.getStaff().then(setStaff).catch(console.warn);
            } else {
                // If backend returned staff profile on login, set it immediately
                if (data.staff) {
                    const mappedStaff: StaffMember = {
                        id: data.staff.id,
                        name: data.staff.name,
                        email: data.staff.email,
                        role: data.staff.role,
                        userType: data.staff.user_type,
                        department: data.staff.department,
                        status: data.staff.status != null ? data.staff.status : 'Active',
                        initials: data.staff.initials,
                        color: data.staff.color,
                        permissions: mergePermissions(data.staff.permissions, data.staff.user_type, data.staff.query_scope),
                        queryScope: data.staff.query_scope,
                        whatsappScope: data.staff.whatsapp_scope,
                        lastActive: data.staff.last_active,
                        phone: data.staff.phone
                    };
                    if (data.user?.role === 'admin') {
                        mappedStaff.userType = 'Admin';
                        mappedStaff.permissions = ADMIN_PERMISSIONS;
                    }
                    setCurrentUser(mappedStaff);
                }

                // Load user profile from DB to complete state
                try {
                    await loadUserProfile(email, data.user?.role === 'admin');
                } catch (profileErr) {
                    console.warn('Could not load staff profile, keeping response user info:', profileErr);
                    if (!data.staff) {
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
            }

            logAuthAction('Login', 'Authentication', `User ${email} logged in`, email).catch(console.error);
            return true;
        } catch (e: any) {
            console.error("Login exception:", e);
            throw new Error(e.message || "Network error or server unreachable");
        }
    }, [loadUserProfile, logAuthAction, mergePermissions]);

    // Automatically initialize activityTracker globally whenever an active user is loaded
    useEffect(() => {
        if (currentUser?.id) {
            activityTracker.init(currentUser.id, 180);
        }
    }, [currentUser?.id]);

    // Inactivity presence is handled non-destructively by activityTracker (switching between Active and Idle state without terminating the user session or shift)


    const logout = useCallback(async () => {
        const userEmail = currentUser?.email || 'Unknown User';
        try {
            await activityTracker.endSession('user_logout', true);
            await api.logout(true);
        } catch (e) {
            console.warn('Logout session end error:', e);
        }
        localStorage.removeItem(STORAGE_KEY_MOCK);
        localStorage.removeItem(JWT_KEY);
        localStorage.removeItem('shrawello_last_active_ts');
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

    const resolveModulePerm = useCallback((module: string): any => {
        if (!currentUser?.permissions) return undefined;
        const perms = currentUser.permissions as any;
        if (perms[module]) return perms[module];
        
        // Canonical alias mappings across navigation, backend tables, and permission keys
        const ALIAS_MAP: Record<string, string[]> = {
            support: ['support_inbox', 'supportInbox'],
            support_inbox: ['support', 'supportInbox', 'inbox'],
            supportInbox: ['support_inbox', 'support'],
            trainingHub: ['training', 'training_hub'],
            training_hub: ['training', 'trainingHub'],
            training: ['trainingHub', 'training_hub'],
            activityFeed: ['audit', 'activity_feed', 'activity'],
            activity_feed: ['audit', 'activityFeed', 'activity'],
            activity: ['audit', 'activityFeed', 'activity_feed'],
            audit: ['activityFeed', 'activity_feed', 'activity', 'auditLogs', 'audit_logs'],
            marketing: ['marketing_logs', 'marketingLogs'],
            marketing_logs: ['marketing', 'marketingLogs'],
            marketingLogs: ['marketing_logs', 'marketing'],
            carRental: ['car_rental'],
            car_rental: ['carRental'],
            financeVerification: ['finance_verification', 'finance', 'accounts'],
            finance_verification: ['financeVerification', 'finance', 'accounts'],
            finance: ['finance_verification', 'financeVerification', 'accounts', 'expenses'],
            offerBanners: ['offer_banners'],
            offer_banners: ['offerBanners', 'cms'],
            teamPerformance: ['team_performance', 'performance'],
            team_performance: ['teamPerformance', 'performance'],
            performance: ['team_performance', 'teamPerformance'],
            flightHotels: ['flight_hotels'],
            flight_hotels: ['flightHotels'],
            visaServices: ['visa_services'],
            visa_services: ['visaServices'],
            staff: ['staff_management', 'staffManagement'],
            staff_management: ['staff', 'staffManagement'],
            staffManagement: ['staff', 'staff_management'],
            cms: ['content_cms', 'contentCms', 'testimonials', 'trending', 'offer_banners'],
            content_cms: ['cms', 'contentCms', 'testimonials', 'trending', 'offer_banners'],
            contentCms: ['cms', 'content_cms', 'testimonials', 'trending', 'offer_banners'],
        };

        if (ALIAS_MAP[module]) {
            for (const alias of ALIAS_MAP[module]) {
                if (perms[alias]) return perms[alias];
            }
        }

        // Snake-case fallback (e.g. carRental -> car_rental)
        const snakeKey = module.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        if (perms[snakeKey]) return perms[snakeKey];

        // Camel-case fallback (e.g. car_rental -> carRental)
        const camelKey = module.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        if (perms[camelKey]) return perms[camelKey];

        return undefined;
    }, [currentUser]);

    const hasPermission = useCallback(
        (module: keyof StaffPermissions | string, action: 'view' | 'manage'): boolean => {
            if (!currentUser) return false;
            if (currentUser.userType === 'Admin') return true;
            const modPerm = resolveModulePerm(String(module));
            return modPerm?.[action] ?? false;
        },
        [currentUser, resolveModulePerm]
    );

    const canAccess = useCallback(
        (module: string, subFeature?: string): boolean => {
            if (!currentUser) return false;
            if (currentUser.userType === 'Admin') return true;
            const modPerm = resolveModulePerm(module);
            if (!modPerm || !modPerm.view) return false;
            if (!subFeature) return true;
            if (modPerm.features && typeof modPerm.features[subFeature] === 'boolean') {
                return modPerm.features[subFeature];
            }
            return modPerm.manage ?? false;
        },
        [currentUser, resolveModulePerm]
    );

    const getModuleScope = useCallback(
        (module: string): DataScopeLevel => {
            if (!currentUser) return 'assigned';
            if (currentUser.userType === 'Admin') return 'all';

            // Global scope string
            const userScopeStr = String(currentUser.queryScope || '').toLowerCase();
            let globalScope: DataScopeLevel = 'assigned';
            if (userScopeStr.includes('all') || userScopeStr === 'global') {
                globalScope = 'all';
            } else if (userScopeStr.includes('department')) {
                globalScope = 'department';
            }

            const modPerm = resolveModulePerm(module);
            if (modPerm?.scope) {
                const modScopeStr = String(modPerm.scope).toLowerCase();
                let modScope: DataScopeLevel = 'assigned';
                if (modScopeStr.includes('all') || modScopeStr === 'global') {
                    modScope = 'all';
                } else if (modScopeStr.includes('department')) {
                    modScope = 'department';
                }

                // If global scope was explicitly set to 'all', don't let a default 'assigned' trap the user
                if (globalScope === 'all') {
                    return 'all';
                }
                if (globalScope === 'department' && modScope === 'assigned') {
                    return 'department';
                }
                return modScope;
            }

            return globalScope;
        },
        [currentUser, resolveModulePerm]
    );

    const isContactMasked = useCallback(
        (module?: string): boolean => {
            if (!currentUser) return true;
            if (currentUser.userType === 'Admin') return false;
            return canAccess(module || 'leads', 'mask_contacts');
        },
        [currentUser, canAccess]
    );

    const canViewCostMargins = useCallback(
        (module?: string): boolean => {
            if (!currentUser) return false;
            if (currentUser.userType === 'Admin') return true;
            return canAccess(module || 'bookings', 'view_cost_margins');
        },
        [currentUser, canAccess]
    );

    const refreshStaff = useCallback(async () => {
        try {
            const all = await api.getStaff();
            setStaff(all.map(s => ({ ...s, permissions: mergePermissions(s.permissions) })));
        } catch (e: any) {
            // If 403 (no staff.view permission), fall back to own profile only via /api/staff/me
            if (e?.message?.includes('403') || e?.message?.includes('Unauthorized')) {
                try {
                    const me = await api.getStaffMe();
                    if (me) {
                        setStaff(prev => {
                            // Merge own profile into staff list without clearing others
                            const exists = prev.some(s => s.id === me.id);
                            if (exists) return prev.map(s => s.id === me.id ? { ...me, permissions: mergePermissions(me.permissions) } : s);
                            return [{ ...me, permissions: mergePermissions(me.permissions) }, ...prev];
                        });
                    }
                } catch {
                    console.warn('refreshStaff: could not fetch own profile via /api/staff/me');
                }
            } else {
                console.warn('refreshStaff failed:', e);
            }
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
            canAccess,
            getModuleScope,
            isContactMasked,
            canViewCostMargins,
            masqueradeAs,
            stopMasquerading,
            isMasquerading: !!realUser,
            realUser,
            refreshStaff,
        }),
        [staff, currentUser, loading, login, logout, addStaff, updateStaff, deleteStaff, hasPermission, canAccess, getModuleScope, isContactMasked, canViewCostMargins, masqueradeAs, stopMasquerading, realUser, refreshStaff]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

export { DEFAULT_PERMISSIONS, ADMIN_PERMISSIONS };
