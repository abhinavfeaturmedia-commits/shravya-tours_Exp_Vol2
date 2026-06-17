import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export const CUSTOMER_JWT_KEY = 'shrawello_customer_jwt';
const API_BASE = import.meta.env.VITE_API_URL || '';

export interface CustomerProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  whatsapp?: string;
  address?: string;
  dob?: string;
  createdAt?: string;
  travel_preferences?: string | any;
  referral_code?: string;
  loyalty_points?: number;
}

interface CustomerAuthContextType {
  customer: CustomerProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  refreshCustomer: () => Promise<void>;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone: string;
  whatsapp?: string;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem(CUSTOMER_JWT_KEY);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `API Error: ${res.status}`);
  }
  return res.json();
}

function mapCustomer(raw: any): CustomerProfile {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    phone: raw.phone || '',
    whatsapp: raw.whatsapp || '',
    address: raw.address || '',
    dob: raw.dob || '',
    createdAt: raw.created_at || '',
    travel_preferences: raw.travel_preferences || null,
    referral_code: raw.referral_code || '',
    loyalty_points: raw.loyalty_points || 0
  };
}

export const CustomerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const data = await apiFetch('/api/customer/me');
    setCustomer(mapCustomer(data));
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem(CUSTOMER_JWT_KEY);
        if (!token) { setLoading(false); return; }
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          localStorage.removeItem(CUSTOMER_JWT_KEY);
          setLoading(false);
          return;
        }
        if (payload.role !== 'customer') {
          localStorage.removeItem(CUSTOMER_JWT_KEY);
          setLoading(false);
          return;
        }
        await fetchProfile();
      } catch {
        localStorage.removeItem(CUSTOMER_JWT_KEY);
        setCustomer(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchProfile]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const data = await apiFetch('/api/customer/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem(CUSTOMER_JWT_KEY, data.token);
    setCustomer(mapCustomer(data.customer));
    return true;
  }, []);

  const register = useCallback(async (formData: RegisterData): Promise<{ success: boolean; message: string }> => {
    const data = await apiFetch('/api/customer/auth/register', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
    return { success: true, message: data.message || 'Account created successfully!' };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(CUSTOMER_JWT_KEY);
    setCustomer(null);
  }, []);

  const refreshCustomer = useCallback(async () => {
    try { await fetchProfile(); } catch { /* silent */ }
  }, [fetchProfile]);

  const value = useMemo(() => ({
    customer,
    isAuthenticated: !!customer,
    isLoading: loading,
    login,
    register,
    logout,
    refreshCustomer,
  }), [customer, loading, login, register, logout, refreshCustomer]);

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
};

export const useCustomerAuth = () => {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  return ctx;
};
