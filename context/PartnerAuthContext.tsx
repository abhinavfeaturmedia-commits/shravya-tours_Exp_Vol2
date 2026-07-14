import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Partner } from '../types';

const PARTNER_JWT_KEY = 'shrawello_partner_jwt';
const API_BASE = import.meta.env.VITE_API_URL || '';

interface PartnerAuthContextType {
  partner: Partner | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshPartner: () => Promise<void>;
}

const PartnerAuthContext = createContext<PartnerAuthContextType | undefined>(undefined);

async function fetchWithPartnerToken(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem(PARTNER_JWT_KEY);
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

function mapPartner(raw: any): Partner & Record<string, any> {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    phone: raw.phone || '',
    companyName: raw.company_name || '',
    location: raw.location || '',
    status: raw.status,
    commissionType: raw.commission_type,
    commissionValue: Number(raw.commission_value) || 0,
    cabCommissionType: raw.cab_commission_type || 'Flat_Amount',
    cabCommissionValue: raw.cab_commission_value !== undefined && raw.cab_commission_value !== null ? Number(raw.cab_commission_value) : 300,
    busCommissionType: raw.bus_commission_type || 'Flat_Amount',
    busCommissionValue: raw.bus_commission_value !== undefined && raw.bus_commission_value !== null ? Number(raw.bus_commission_value) : 150,
    trainCommissionType: raw.train_commission_type || 'Flat_Amount',
    trainCommissionValue: raw.train_commission_value !== undefined && raw.train_commission_value !== null ? Number(raw.train_commission_value) : 100,
    flightCommissionType: raw.flight_commission_type || 'Flat_Amount',
    flightCommissionValue: raw.flight_commission_value !== undefined && raw.flight_commission_value !== null ? Number(raw.flight_commission_value) : 200,
    hotelCommissionType: raw.hotel_commission_type || 'Percentage',
    hotelCommissionValue: raw.hotel_commission_value !== undefined && raw.hotel_commission_value !== null ? Number(raw.hotel_commission_value) : 5,
    totalEarnings: Number(raw.total_earnings) || 0,
    pendingPayout: Number(raw.pending_payout) || 0,
    totalLeadsSubmitted: Number(raw.total_leads_submitted) || 0,
    totalBookingsConverted: Number(raw.total_bookings_converted) || 0,
    joinedDate: raw.joined_date || raw.created_at,
    notes: raw.notes || '',
    bankDetails: raw.bank_details || undefined,
    // KYC fields
    kyc_status: raw.kyc_status || 'Pending',
    kyc_pan_number: raw.kyc_pan_number || null,
    kyc_aadhaar_number: raw.kyc_aadhaar_number || null,
    kyc_submitted_at: raw.kyc_submitted_at || null,
    kyc_verified_at: raw.kyc_verified_at || null,
    kyc_rejection_reason: raw.kyc_rejection_reason || null,
    kyc_pan_front_url: raw.kyc_pan_front_url || null,
    kyc_pan_back_url: raw.kyc_pan_back_url || null,
    kyc_aadhaar_front_url: raw.kyc_aadhaar_front_url || null,
    kyc_aadhaar_back_url: raw.kyc_aadhaar_back_url || null,
    // Bank completeness
    bank_complete: raw.bank_complete || false,
    // Loyalty fields
    loyalty_tier: raw.loyalty_tier || 'Bronze',
    next_loyalty_tier: raw.next_loyalty_tier || null,
    loyalty_progress_pct: raw.loyalty_progress_pct || 0,
    loyalty_next_threshold: raw.loyalty_next_threshold || null,
    total_bookings_converted: Number(raw.total_bookings_converted) || 0,
  };
}

export const PartnerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPartnerProfile = useCallback(async () => {
    const data = await fetchWithPartnerToken('/api/partner/me');
    setPartner(mapPartner(data));
  }, []);

  // Initialize from stored JWT
  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem(PARTNER_JWT_KEY);
        if (!token) { setLoading(false); return; }

        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          localStorage.removeItem(PARTNER_JWT_KEY);
          setLoading(false);
          return;
        }
        if (payload.role !== 'partner') {
          localStorage.removeItem(PARTNER_JWT_KEY);
          setLoading(false);
          return;
        }
        await fetchPartnerProfile();
      } catch {
        localStorage.removeItem(PARTNER_JWT_KEY);
        setPartner(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchPartnerProfile]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const data = await fetchWithPartnerToken('/api/partner/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem(PARTNER_JWT_KEY, data.token);
    setPartner(mapPartner(data.partner));
    return true;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(PARTNER_JWT_KEY);
    setPartner(null);
  }, []);

  const refreshPartner = useCallback(async () => {
    try {
      await fetchPartnerProfile();
    } catch {
      // silent
    }
  }, [fetchPartnerProfile]);

  const value = useMemo(() => ({
    partner,
    isAuthenticated: !!partner,
    isLoading: loading,
    login,
    logout,
    refreshPartner,
  }), [partner, loading, login, logout, refreshPartner]);

  return <PartnerAuthContext.Provider value={value}>{children}</PartnerAuthContext.Provider>;
};

export const usePartnerAuth = () => {
  const ctx = useContext(PartnerAuthContext);
  if (!ctx) throw new Error('usePartnerAuth must be used within PartnerAuthProvider');
  return ctx;
};

export { PARTNER_JWT_KEY, fetchWithPartnerToken };
