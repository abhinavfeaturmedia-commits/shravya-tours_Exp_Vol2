import { api } from './api';

export interface ActivityState {
    isActive: boolean;
    activeSeconds: number;
    idleSeconds: number;
    systemSeconds: number;
    sessionId: string | null;
    sessionNumber: number;
    lastActiveTime: Date;
    idleThresholdSeconds: number;
}

type ActivityListener = (state: ActivityState) => void;

class ActivityTrackerEngine {
    private isInitialized = false;
    private staffId: number | null = null;
    private sessionId: string | null = null;
    private sessionNumber = 1;
    private isActive = true;
    private idleThresholdSeconds = 180; // 3 minutes default
    private lastActivityTimestamp = Date.now();

    // Cumulative counters for current session
    private activeSeconds = 0;
    private idleSeconds = 0;
    private systemSeconds = 0;

    // Delta counters for periodic backend sync
    private activeDeltaSecs = 0;
    private idleDeltaSecs = 0;
    private systemDeltaSecs = 0;

    private tickerInterval: any = null;
    private heartbeatInterval: any = null;
    private listeners = new Set<ActivityListener>();

    constructor() {
        this.onUserInteraction = this.onUserInteraction.bind(this);
        this.onVisibilityChange = this.onVisibilityChange.bind(this);
        this.onBeforeUnload = this.onBeforeUnload.bind(this);
    }

    public init(staffId?: number, idleThreshold = 180) {
        if (this.isInitialized && this.staffId === staffId) return;

        this.staffId = staffId || null;
        this.idleThresholdSeconds = idleThreshold;
        this.lastActivityTimestamp = Date.now();
        this.isActive = true;

        if (!this.isInitialized) {
            this.attachWindowListeners();
            this.startTimers();
            this.isInitialized = true;
        }

        // Initialize / resume session on backend
        if (this.staffId) {
            this.startSession(this.staffId, 'web_login').catch(err => {
                console.debug('[ActivityTracker] Auto session start skipped/deferred:', err.message);
            });
        }
    }

    public setIdleThreshold(seconds: number) {
        this.idleThresholdSeconds = Math.max(30, seconds);
    }

    public async startSession(staffId: number, loginType = 'web_login') {
        this.staffId = staffId;
        try {
            const res = await api.startAttendanceSession({
                staffId,
                loginType: loginType as any
            });
            if (res.session) {
                this.sessionId = res.session.id;
                this.sessionNumber = res.session.sessionNumber || res.session.session_number || 1;
                this.activeSeconds = (res.session.activeMinutes || res.session.active_minutes || 0) * 60;
                this.idleSeconds = (res.session.idleMinutes || res.session.idle_minutes || 0) * 60;
                this.systemSeconds = (res.session.systemMinutes || res.session.system_minutes || 0) * 60;
            }
            this.notify();
            window.dispatchEvent(new CustomEvent('shrawello:attendance-updated'));
            return res;
        } catch (err: any) {
            console.debug('[ActivityTracker] startSession error:', err.message);
            return null;
        }
    }

    public async endSession(logoutType = 'manual_logout', clockOut = false) {
        try {
            await this.flushHeartbeat();
            await api.endAttendanceSession({
                sessionId: this.sessionId || undefined,
                staffId: this.staffId || undefined,
                logoutType: logoutType as any,
                clockOut
            });
            this.sessionId = null;
            this.notify();
            window.dispatchEvent(new CustomEvent('shrawello:attendance-updated'));
        } catch (err: any) {
            console.debug('[ActivityTracker] endSession error:', err.message);
        }
    }

    public subscribe(listener: ActivityListener) {
        this.listeners.add(listener);
        listener(this.getState());
        return () => {
            this.listeners.delete(listener);
        };
    }

    public getState(): ActivityState {
        return {
            isActive: this.isActive,
            activeSeconds: this.activeSeconds,
            idleSeconds: this.idleSeconds,
            systemSeconds: this.systemSeconds,
            sessionId: this.sessionId,
            sessionNumber: this.sessionNumber,
            lastActiveTime: new Date(this.lastActivityTimestamp),
            idleThresholdSeconds: this.idleThresholdSeconds
        };
    }

    private onUserInteraction() {
        const now = Date.now();
        this.lastActivityTimestamp = now;
        localStorage.setItem('shrawello_last_active_ts', String(now));

        if (!this.isActive) {
            this.isActive = true;
            this.notify();
            window.dispatchEvent(new CustomEvent('shrawello:activity-state-changed', {
                detail: { isActive: true, timestamp: now }
            }));
        }
    }

    private onVisibilityChange() {
        const now = Date.now();
        if (document.hidden) {
            this.isActive = false;
            localStorage.setItem('shrawello_last_active_ts', String(now));
            this.notify();
        } else {
            this.onUserInteraction();
        }
    }

    private onBeforeUnload() {
        const now = Date.now();
        localStorage.setItem('shrawello_last_active_ts', String(now));

        if (this.staffId && (this.activeDeltaSecs > 0 || this.idleDeltaSecs > 0 || this.systemDeltaSecs > 0)) {
            try {
                const payload = JSON.stringify({
                    sessionId: this.sessionId || undefined,
                    staffId: this.staffId || undefined,
                    activeDeltaSeconds: this.activeDeltaSecs,
                    idleDeltaSeconds: this.idleDeltaSecs,
                    systemDeltaSeconds: this.systemDeltaSecs,
                    isActive: this.isActive
                });
                if (navigator.sendBeacon) {
                    const blob = new Blob([payload], { type: 'application/json' });
                    navigator.sendBeacon('/api/attendance/heartbeat', blob);
                }
            } catch (e) {
                // ignore unload errors
            }
        }
        this.flushHeartbeat();
    }

    private attachWindowListeners() {
        const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
        events.forEach(event => {
            window.addEventListener(event, this.onUserInteraction, { passive: true });
        });
        document.addEventListener('visibilitychange', this.onVisibilityChange);
        window.addEventListener('beforeunload', this.onBeforeUnload);
    }

    private startTimers() {
        this.tickerInterval = setInterval(() => {
            const now = Date.now();
            const elapsedSinceInteraction = Math.floor((now - this.lastActivityTimestamp) / 1000);

            // Inactivity threshold triggers Idle / Away presence without terminating the session
            if (document.hidden || elapsedSinceInteraction >= this.idleThresholdSeconds) {
                if (this.isActive) {
                    this.isActive = false;
                    window.dispatchEvent(new CustomEvent('shrawello:activity-state-changed', {
                        detail: { isActive: false, timestamp: now }
                    }));
                }
                this.idleSeconds++;
                this.idleDeltaSecs++;
            } else {
                if (!this.isActive) {
                    this.isActive = true;
                    window.dispatchEvent(new CustomEvent('shrawello:activity-state-changed', {
                        detail: { isActive: true, timestamp: now }
                    }));
                }
                this.activeSeconds++;
                this.activeDeltaSecs++;
            }

            this.systemSeconds++;
            this.systemDeltaSecs++;

            localStorage.setItem('shrawello_last_active_ts', String(now));
            this.notify();
        }, 1000);

        this.heartbeatInterval = setInterval(() => {
            this.flushHeartbeat();
        }, 30000);
    }

    private async flushHeartbeat() {
        if (!this.staffId && !this.sessionId) return;
        if (this.activeDeltaSecs === 0 && this.idleDeltaSecs === 0 && this.systemDeltaSecs === 0) return;

        const payload = {
            sessionId: this.sessionId || undefined,
            staffId: this.staffId || undefined,
            activeDeltaSeconds: this.activeDeltaSecs,
            idleDeltaSeconds: this.idleDeltaSecs,
            systemDeltaSeconds: this.systemDeltaSecs,
            isActive: this.isActive
        };

        this.activeDeltaSecs = 0;
        this.idleDeltaSecs = 0;
        this.systemDeltaSecs = 0;

        try {
            await api.sendAttendanceHeartbeat(payload);
        } catch (err: any) {
            console.debug('[ActivityTracker] Heartbeat flush error:', err.message);
        }
    }

    private notify() {
        const state = this.getState();
        this.listeners.forEach(listener => listener(state));
    }

    public cleanup() {
        if (this.tickerInterval) clearInterval(this.tickerInterval);
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);

        const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
        events.forEach(event => {
            window.removeEventListener(event, this.onUserInteraction);
        });
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
        window.removeEventListener('beforeunload', this.onBeforeUnload);

        this.isInitialized = false;
    }
}

export const activityTracker = new ActivityTrackerEngine();
