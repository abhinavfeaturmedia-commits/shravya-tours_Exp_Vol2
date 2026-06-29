// @refresh reset
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../src/lib/api';

// ─── Settings Type ───────────────────────────────────────────────────────────

export interface CompanySettings {
  companyName: string;
  gstNumber: string;
  registeredAddress: string;
  email: string;
  phone: string;
  website: string;
  logoUrl: string;
  instagram: string;
  facebook: string;
  city: string;
  state: string;
  pincode: string;
}

export interface FinanceSettings {
  cgstPercent: number;
  sgstPercent: number;
  igstPercent: number;
  tcsPercent: number;
  gstOnTotal: boolean;
  currency: string;
  monthlyRevenueTarget: number;
  bankAccountName: string;
  bankName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankBranch: string;
  upiId: string;
  upiQrImage?: string;
  invoicePrefix: string;
  bookingPrefix: string;
}

export interface StaffRoleSettings {
  idleTimeoutMinutes: number;
  requireDeletionApproval: boolean;
  allowMasquerade: boolean;
  defaultPaginationLimit: number;
  defaultQueryScope: string;
}

// ─── Integration Settings ─────────────────────────────────────────────────────

export interface WhatsAppSettings {
  enabled: boolean;
  provider: 'meta' | 'twilio';
  metaPhoneNumberId: string;
  metaAccessToken: string;
  metaWabaId: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioFromNumber: string;
  defaultGreeting: string;
}

export interface RazorpaySettings {
  enabled: boolean;
  mode: 'test' | 'live';
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  paymentLinkExpiry: number;
  notifyCustomerOnPayment: boolean;
  notifyStaffOnPayment: boolean;
}

export interface SmtpSettings {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  useTls: boolean;
}

export interface SmsSettings {
  enabled: boolean;
  provider: 'msg91' | 'twilio' | 'textlocal';
  apiKey: string;
  senderId: string;
  msg91AuthKey: string;
  msg91TemplateId: string;
}

export interface GoogleSettings {
  mapsApiKey: string;
  analyticsId: string;
}

export interface OpenRouterSettings {
  enabled: boolean;
  apiKey: string;
  defaultModel: string;
}

export interface IntegrationSettings {
  whatsapp: WhatsAppSettings;
  razorpay: RazorpaySettings;
  smtp: SmtpSettings;
  sms: SmsSettings;
  google: GoogleSettings;
  openrouter: OpenRouterSettings;
}

export interface AppSettings {
  company: CompanySettings;
  finance: FinanceSettings;
  staffRoles: StaffRoleSettings;
  integrations: IntegrationSettings;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: AppSettings = {
  company: {
    companyName: 'SHRAWELLO Travel Hub and Events LLP',
    gstNumber: '27AFXFS7018E1ZH',
    registeredAddress: 'Pimpri Chinchwad, Pune,\nMaharashtra, India - 411062',
    email: 'hello@shrawello.com',
    phone: '+91 80109 55675',
    website: 'https://shrawello.com',
    logoUrl: '/logo.png',
    instagram: '',
    facebook: '',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411062',
  },
  finance: {
    cgstPercent: 2.5,
    sgstPercent: 2.5,
    igstPercent: 0,
    tcsPercent: 0,
    gstOnTotal: true,
    currency: 'INR',
    monthlyRevenueTarget: 0,
    bankAccountName: '',
    bankName: '',
    bankAccountNumber: '',
    bankIfsc: '',
    bankBranch: '',
    upiId: '',
    upiQrImage: '',
    invoicePrefix: 'INV',
    bookingPrefix: 'BK',
  },
  staffRoles: {
    idleTimeoutMinutes: 20,
    requireDeletionApproval: true,
    allowMasquerade: true,
    defaultPaginationLimit: 15,
    defaultQueryScope: 'Show All Queries',
  },
  integrations: {
    whatsapp: {
      enabled: false,
      provider: 'meta',
      metaPhoneNumberId: '',
      metaAccessToken: '',
      metaWabaId: '',
      twilioAccountSid: '',
      twilioAuthToken: '',
      twilioFromNumber: '',
      defaultGreeting: 'Hello! Thank you for choosing SHRAWELLO Travel Hub.',
    },
    razorpay: {
      enabled: false,
      mode: 'test',
      keyId: '',
      keySecret: '',
      webhookSecret: '',
      paymentLinkExpiry: 48,
      notifyCustomerOnPayment: true,
      notifyStaffOnPayment: true,
    },
    smtp: {
      enabled: false,
      host: '',
      port: 587,
      username: '',
      password: '',
      fromName: 'SHRAWELLO Travel Hub',
      fromEmail: '',
      useTls: true,
    },
    sms: {
      enabled: false,
      provider: 'msg91',
      apiKey: '',
      senderId: 'SHRVYA',
      msg91AuthKey: '',
      msg91TemplateId: '',
    },
    google: {
      mapsApiKey: '',
      analyticsId: '',
    },
    openrouter: {
      enabled: false,
      apiKey: '',
      defaultModel: 'google/gemini-2.5-flash',
    },
  },
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface SettingsContextType {
  settings: AppSettings;
  isLoading: boolean;
  isSaving: boolean;
  updateCompany: (updates: Partial<CompanySettings>) => Promise<void>;
  updateFinance: (updates: Partial<FinanceSettings>) => Promise<void>;
  updateStaffRoles: (updates: Partial<StaffRoleSettings>) => Promise<void>;
  updateIntegrations: (updates: Partial<IntegrationSettings>) => Promise<void>;
  saveSetting: (key: string, value: any) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const { data } = await api.getSettings();
      if (!data || data.length === 0) { setIsLoading(false); return; }

      const merged: AppSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      data.forEach((row: { key: string; value: string }) => {
        try {
          const parsed = JSON.parse(row.value);
          const parts = row.key.split('.');
          if (parts.length === 2) {
            const [section, field] = parts;
            if (merged[section as keyof AppSettings] !== undefined) {
              (merged[section as keyof AppSettings] as any)[field] = parsed;
            }
          } else if (parts.length === 3) {
            const [section, sub, field] = parts;
            const sec = merged[section as keyof AppSettings] as any;
            if (sec && sec[sub] !== undefined) sec[sub][field] = parsed;
          }
        } catch { /* skip malformed rows */ }
      });
      setSettings(merged);
    } catch (e) {
      console.warn('[Settings] Failed to load settings from DB:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const saveSetting = useCallback(async (key: string, value: any) => {
    await api.upsertSetting(key, JSON.stringify(value));
  }, []);

  // Flatten nested object into dot-notation pairs for DB persistence
  const flattenUpdates = (prefix: string, obj: Record<string, any>): Array<[string, any]> =>
    Object.entries(obj).flatMap(([k, v]) =>
      (v !== null && typeof v === 'object' && !Array.isArray(v))
        ? flattenUpdates(`${prefix}.${k}`, v)
        : [[`${prefix}.${k}`, v]]
    );

  const updateCompany = useCallback(async (updates: Partial<CompanySettings>) => {
    setIsSaving(true);
    try {
      setSettings(prev => ({ ...prev, company: { ...prev.company, ...updates } }));
      await Promise.all(Object.entries(updates).map(([f, v]) => api.upsertSetting(`company.${f}`, JSON.stringify(v))));
    } finally { setIsSaving(false); }
  }, []);

  const updateFinance = useCallback(async (updates: Partial<FinanceSettings>) => {
    setIsSaving(true);
    try {
      const newFinance = { ...settings.finance, ...updates };
      setSettings(prev => ({ ...prev, finance: newFinance }));
      await Promise.all(
        Object.entries(updates).map(([field, val]) =>
          api.upsertSetting(`finance.${field}`, JSON.stringify(val))
        )
      );
    } finally {
      setIsSaving(false);
    }
  }, [settings.finance]);

  const updateStaffRoles = useCallback(async (updates: Partial<StaffRoleSettings>) => {
    setIsSaving(true);
    try {
      const newStaffRoles = { ...settings.staffRoles, ...updates };
      setSettings(prev => ({ ...prev, staffRoles: newStaffRoles }));
      await Promise.all(
        Object.entries(updates).map(([field, val]) =>
          api.upsertSetting(`staffRoles.${field}`, JSON.stringify(val))
        )
      );
    } finally {
      setIsSaving(false);
    }
  }, [settings.staffRoles]);

  const updateIntegrations = useCallback(async (updates: Partial<IntegrationSettings>) => {
    setIsSaving(true);
    try {
      const newIntegrations = { ...settings.integrations, ...updates };
      setSettings(prev => ({ ...prev, integrations: newIntegrations }));
      // Flatten nested updates to dot-notation keys for DB
      const flatPairs: Array<[string, any]> = [];
      const flatten = (prefix: string, obj: Record<string, any>) => {
        for (const [k, v] of Object.entries(obj)) {
          if (v !== null && typeof v === 'object' && !Array.isArray(v)) flatten(`${prefix}.${k}`, v);
          else flatPairs.push([`${prefix}.${k}`, v]);
        }
      };
      flatten('integrations', updates as Record<string, any>);
      await Promise.all(flatPairs.map(([k, v]) => api.upsertSetting(k, JSON.stringify(v))));
    } finally {
      setIsSaving(false);
    }
  }, [settings.integrations]);

  return (
    <SettingsContext.Provider value={{
      settings,
      isLoading,
      isSaving,
      updateCompany,
      updateFinance,
      updateStaffRoles,
      updateIntegrations,
      saveSetting,
      refreshSettings: loadSettings,
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
};
