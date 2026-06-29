import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Save, ArrowLeft, Plus, Trash2, CheckCircle2, Printer, CreditCard, User, Mail, MapPin, Calendar, Users, FileCheck, ChevronDown, Loader2, Search, Link, Copy, Edit3, X, Check, FileText, ChevronRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '../../context/SettingsContext';
import { useData } from '../../context/DataContext';

import { generateTrueInvoicePDF } from '../../utils/pdfGenerator';

const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
function numberToWords(n: number): string {
    if (!isFinite(n) || isNaN(n)) return '';
    const num = Math.floor(n);
    const paise = Math.round((n - num) * 100);
    if (num === 0 && paise === 0) return 'Zero Rupees Only';
    
    const convert = (x: number): string => {
        if (x < 20) return ones[x];
        if (x < 100) return tens[Math.floor(x/10)] + (x%10 ? ' ' + ones[x%10] : '');
        if (x < 1000) return ones[Math.floor(x/100)] + ' Hundred' + (x%100 ? ' ' + convert(x%100) : '');
        if (x < 100000) return convert(Math.floor(x/1000)) + ' Thousand' + (x%1000 ? ' ' + convert(x%1000) : '');
        if (x < 10000000) return convert(Math.floor(x/100000)) + ' Lakh' + (x%100000 ? ' ' + convert(x%100000) : '');
        return convert(Math.floor(x/10000000)) + ' Crore' + (x%10000000 ? ' ' + convert(x%10000000) : '');
    };
    
    let words = convert(num) + ' Rupees';
    if (paise > 0) {
        words += ' and ' + convert(paise) + ' Paise';
    }
    return words + ' Only';
}
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};
function cleanHtmlToPlainText(html: string): string {
    if (!html) return '';
    let text = html;
    // Replace block-level tags with newlines
    text = text.replace(/<\/(p|div|tr|li|h[1-6]|ul|ol)>/gi, '\n');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    // Strip other tags
    text = text.replace(/<[^>]+>/g, '');
    // Replace HTML entities
    text = text.replace(/&nbsp;/g, ' ')
               .replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&quot;/g, '"')
               .replace(/&#39;/g, "'");
    // Normalize newlines
    text = text.replace(/\n{3,}/g, '\n\n');
    return text.trim();
}

export const DocumentEditor: React.FC = () => {
    const { settings } = useSettings();
    const co = settings.company;
    const fi = settings.finance;
    const { masterTermsTemplates } = useData();
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const paramBookingId = searchParams.get('booking_id') || '';
    const paramLeadId = searchParams.get('lead_id') || '';
    const paramCustomerId = searchParams.get('customer_id') || '';
    const paramType = searchParams.get('type') || 'Invoice';

    const isEdit = Boolean(id);

    const [docData, setDocData] = useState({
        document_type: paramType,
        is_gst: 1,
        client_gst: '',
        gst_type: 'CGST_SGST',
        client_name: '',
        email: '',
        phone: '',
        address: '',
        travel_dates: '',
        due_date: '',
        booking_id: paramBookingId,
        lead_id: paramLeadId,
        customer_id: paramCustomerId,
        adults: 2,
        children: 0,
        status: 'Draft',
        payment_status: 'Unpaid',
        amount_paid: 0,
        driver_stay_allowance: 0,
        extra_km_charges: 0,
        extra_hrs_charges: 0,
        advance_received: 0,
        notes: 'Prices are subject to change based on availability at the time of booking. 50% advance required for confirmation.'
    });

    // T&C template selector state
    const [termsDropdownOpen, setTermsDropdownOpen] = useState(false);

    const handleToggleTemplate = (tmplContent: string, tmplTitle: string) => {
        const cleanContent = cleanHtmlToPlainText(tmplContent);
        const currentNotes = docData.notes || '';
        const hasTmpl = currentNotes.includes(cleanContent);
        let newNotes = '';
        if (hasTmpl) {
            newNotes = currentNotes.replace(cleanContent, '').trim();
            newNotes = newNotes.replace(/\n{3,}/g, '\n\n');
            toast.success(`Template "${tmplTitle}" removed`);
        } else {
            if (currentNotes.trim() === '') {
                newNotes = cleanContent;
            } else {
                newNotes = `${currentNotes.trim()}\n\n${cleanContent}`;
            }
            toast.success(`Template "${tmplTitle}" appended`);
        }
        setDocData(prev => ({ ...prev, notes: newNotes }));
        setIsDirty(true);
    };

    const [showLinkPanel, setShowLinkPanel] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchType, setSearchType] = useState('bookings');
    const [searching, setSearching] = useState(false);
    const [searchHasRun, setSearchHasRun] = useState(false);

    // Catalog State
    const [showCatalogPanel, setShowCatalogPanel] = useState(false);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [catalogResults, setCatalogResults] = useState<any[]>([]);

    const searchCatalog = async (query?: string) => {
        const q = (query !== undefined ? query : catalogSearch).trim();
        try {
            const token = (localStorage.getItem('shravya_jwt') || localStorage.getItem('token'));
            const searchParam = q ? `&like_title=${encodeURIComponent(q)}` : '';
            const res = await fetch(`/api/crud/packages?limit=50${searchParam}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const { data } = await res.json();
                const filtered = q ? data.filter((d: any) => 
                    (d.title || '').toLowerCase().includes(q.toLowerCase()) || 
                    (d.destination || '').toLowerCase().includes(q.toLowerCase())
                ) : data.slice(0, 20);
                setCatalogResults(filtered);
            }
        } catch (e) { console.error(e); }
    };

    const addFromCatalog = (pkg: any) => {
        setItems([...items, {
            id: 'temp-' + generateId(),
            description: `${pkg.title}\nDestination: ${pkg.destination}\nDuration: ${pkg.days} Days / ${pkg.nights} Nights`,
            quantity: 1,
            total_days_km: String(pkg.days || '1'),
            unit_price: Number(pkg.price || 0),
            tax_rate: 0
        }]);
        setShowCatalogPanel(false);
    };

    const [deletedItemIds, setDeletedItemIds] = useState<string[]>([]);
    const [items, setItems] = useState<any[]>([
        { id: generateId(), description: '', quantity: 1, total_days_km: '1', unit_price: 0, tax_rate: 0 }
    ]);
    const [discount, setDiscount] = useState(0);
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Record Payment modal
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
    const [paymentNote, setPaymentNote] = useState('');
    const [recordingPayment, setRecordingPayment] = useState(false);

    const [isSaveDropdownOpen, setIsSaveDropdownOpen] = useState(false);

    // ── Custom Fields & Editable Labels ──────────────────────────────
    // fieldLabels: renamed labels for the 5 fixed charge rows
    const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});
    // editingLabel: key of the fixed field whose label is being edited inline
    const [editingLabel, setEditingLabel] = useState<string | null>(null);
    // customFields: fully user-defined extra charge/deduction rows
    const [customFields, setCustomFields] = useState<{
        id: string; label: string; amount: number; is_deduction: boolean; sort_order: number;
    }[]>([]);
    // deleted custom field ids to remove on save
    const [deletedCustomFieldIds, setDeletedCustomFieldIds] = useState<string[]>([]);

    useEffect(() => {
        setLoading(true);
        if (isEdit) {
            fetchDocument();
        } else {
            if (paramBookingId) prefillFromBooking(paramBookingId);
            else if (paramLeadId) prefillFromLead(paramLeadId);
            else if (paramCustomerId) prefillFromCustomer(paramCustomerId);
            else {
                // Fix #11 — Check for itinerary quick-create payload from StepReview
                const itineraryPrefill = sessionStorage.getItem('invoice_quick_create');
                if (itineraryPrefill) {
                    try {
                        const p = JSON.parse(itineraryPrefill);
                        sessionStorage.removeItem('invoice_quick_create');
                        setDocData(prev => ({
                            ...prev,
                            client_name: p.clientName || '',
                            travel_dates: p.startDate || '',
                            adults: p.adults || 2,
                            children: p.children || 0,
                        }));
                        setItems([{
                            id: generateId(),
                            description: p.description || p.title || 'Travel Itinerary Package',
                            quantity: 1,
                            total_days_km: '1',
                            unit_price: Number(p.amount) || 0,
                            tax_rate: 0
                        }]);
                    } catch { /* ignore parse error */ }
                }
                setLoading(false);
            }
        }
    }, [id]);

    // Auto-load the default T&C template when creating a new document
    useEffect(() => {
        if (isEdit) return; // Don't overwrite loaded document data
        if (masterTermsTemplates.length === 0) return;
        const defaultTemplate = masterTermsTemplates.find(t => t.isDefault && t.status === 'Active');
        if (defaultTemplate) {
            setDocData(prev => ({ ...prev, notes: defaultTemplate.content }));
        }
    }, [masterTermsTemplates, isEdit]);

    // ── Unsaved-changes guard ─────────────────────────────────────────────
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (!isDirty) return;
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty]);

    const prefillFromBooking = async (bId: string) => {
        try {
            const token = (localStorage.getItem('shravya_jwt') || localStorage.getItem('token')) || localStorage.getItem('token');
            const res = await fetch(`/api/crud/bookings/${bId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const { data } = await res.json();
                setDocData(prev => ({
                    ...prev,
                    client_name: data.customer_name || data.customer || '',
                    email: data.customer_email || data.email || '',
                    // Fix: bookings stores phone as customer_phone, address as residential_address
                    phone: data.customer_phone || data.phone || prev.phone || '',
                    address: data.residential_address || data.address || prev.address || '',
                    travel_dates: data.booking_date || data.date ? new Date(data.booking_date || data.date).toISOString().split('T')[0] : '',
                    adults: data.number_of_people || data.travelers || 2
                }));
                if (data.total_price || data.amount) {
                    setItems([{ id: generateId(), description: 'Tour Package', quantity: 1, total_days_km: '1', unit_price: Number(data.total_price || data.amount), tax_rate: 0 }]);
                }
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const prefillFromLead = async (lId: string) => {
        try {
            const token = (localStorage.getItem('shravya_jwt') || localStorage.getItem('token')) || localStorage.getItem('token');
            const res = await fetch(`/api/crud/leads/${lId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const { data } = await res.json();
                setDocData(prev => ({
                    ...prev,
                    client_name: data.name || '',
                    email: data.email || '',
                    // Fix: leads stores phone as `phone`; no address/GSTIN on leads
                    phone: data.phone || prev.phone || '',
                    adults: data.travelers && data.travelers !== 'N/A' ? data.travelers : 2,
                    travel_dates: data.start_date || data.travelDate ? new Date(data.start_date || data.travelDate).toISOString().split('T')[0] : '',
                }));
                const budget = data.potential_value || data.budget;
                if (budget) {
                    setItems([{ id: generateId(), description: `Custom Tour: ${data.destination || 'Destination'}`, quantity: 1, total_days_km: '1', unit_price: Number(budget), tax_rate: 0 }]);
                }
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const prefillFromCustomer = async (cId: string) => {
        try {
            const token = (localStorage.getItem('shravya_jwt') || localStorage.getItem('token'));
            const res = await fetch(`/api/crud/customers/${cId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const { data } = await res.json();
                setDocData(prev => ({
                    ...prev,
                    client_name: data.name || '',
                    email: data.email || '',
                    phone: data.phone || prev.phone || '',
                    address: data.billing_address || data.address || prev.address || '',
                    client_gst: data.gstin || prev.client_gst || '',
                }));
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const fetchDocument = async () => {
        try {
            const token = (localStorage.getItem('shravya_jwt') || localStorage.getItem('token'));
            const res = await fetch(`/api/crud/invoices/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const { data } = await res.json();
                setDocData(data);

                // Fix #10 — Restore saved discount
                if (data.discount !== undefined && data.discount !== null) {
                    setDiscount(Number(data.discount) || 0);
                }

                // Parse renamed field labels (stored as JSON string)
                if (data.field_labels) {
                    try { setFieldLabels(JSON.parse(data.field_labels)); } catch {}
                }

                // Load invoice items
                const itemsRes = await fetch(`/api/crud/invoice_items?eq_invoice_id=${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (itemsRes.ok) {
                    const itemsData = await itemsRes.json();
                    if (itemsData.data && itemsData.data.length > 0) {
                        setItems(itemsData.data);
                    }
                }

                // Load custom extra charge fields
                const cfRes = await fetch(`/api/crud/invoice_custom_fields?eq_invoice_id=${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (cfRes.ok) {
                    const cfData = await cfRes.json();
                    if (cfData.data && cfData.data.length > 0) {
                        setCustomFields(cfData.data.map((cf: any) => ({
                            id: cf.id,
                            label: cf.label || '',
                            amount: Number(cf.amount || 0),
                            is_deduction: Boolean(cf.is_deduction),
                            sort_order: Number(cf.sort_order || 0)
                        })));
                    }
                }

                setIsDirty(false); // freshly loaded — no unsaved changes
            } else {
                toast.error('Document not found');
                navigate('/admin/invoices');
            }
        } catch (error) {
            toast.error('Failed to load document');
        } finally {
            setLoading(false);
        }
    };

    const searchRecords = async (type?: string, query?: string) => {
        const q = (query !== undefined ? query : searchQuery).trim();
        const t = type || searchType;
        setSearching(true);
        setSearchHasRun(true);
        try {
            const token = (localStorage.getItem('shravya_jwt') || localStorage.getItem('token'));
            // Use server-side search when query is provided to avoid fetching all records
            const searchParam = q ? `&search=${encodeURIComponent(q)}` : '';
            const res = await fetch(`/api/crud/${t}?limit=50${searchParam}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const { data } = await res.json();
                // Client-side fallback filter for fields the server search may not cover
                const filtered = q
                    ? data.filter((d: any) =>
                        (d.customer_name || d.name || d.customer || '').toLowerCase().includes(q.toLowerCase()) ||
                        (d.customer_email || d.email || '').toLowerCase().includes(q.toLowerCase()) ||
                        (d.id || '').toLowerCase().includes(q.toLowerCase())
                      )
                    : data.slice(0, 20);
                setSearchResults(filtered);
            }
        } catch (e) { console.error(e); } finally { setSearching(false); }
    };

    const linkRecord = (record: any) => {
        if (searchType === 'bookings') {
            setDocData(prev => ({
                ...prev,
                booking_id: record.id,
                lead_id: null,
                client_name: record.customer_name || record.customer || record.name || '',
                email: record.customer_email || record.email || '',
                // Fix: booking search results return customer_phone and residential_address
                phone: record.customer_phone || record.phone || prev.phone || '',
                address: record.residential_address || record.address || prev.address || '',
                travel_dates: record.booking_date || record.date ? new Date(record.booking_date || record.date).toISOString().split('T')[0] : prev.travel_dates,
                adults: record.number_of_people || record.travelers || prev.adults
            }));
            if (record.total_price && items.length === 1 && items[0].unit_price === 0) {
                setItems([{ id: generateId(), description: 'Tour Package', quantity: 1, total_days_km: '1', unit_price: Number(record.total_price), tax_rate: 0 }]);
            }
        } else {
            setDocData(prev => ({
                ...prev,
                lead_id: record.id,
                booking_id: null,
                client_name: record.name || '',
                email: record.email || '',
                // Fix: lead records have a phone column directly
                phone: record.phone || prev.phone || '',
                travel_dates: record.start_date || record.travelDate ? new Date(record.start_date || record.travelDate).toISOString().split('T')[0] : prev.travel_dates,
                adults: record.travelers !== 'N/A' && record.travelers ? record.travelers : prev.adults
            }));
            const budget = record.budget || record.potential_value;
            if (budget && items.length === 1 && items[0].unit_price === 0) {
                setItems([{ id: generateId(), description: `Custom Tour: ${record.destination || 'Destination'}`, quantity: 1, total_days_km: '1', unit_price: Number(budget), tax_rate: 0 }]);
            }
        }
        setIsDirty(true);
        setShowLinkPanel(false);
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { id: 'temp-' + generateId(), description: '', quantity: 1, total_days_km: '1', unit_price: 0, tax_rate: 0 }]);
    };

    const removeItem = (index: number) => {
        const itemToRemove = items[index];
        if (isEdit && itemToRemove.id && !String(itemToRemove.id).startsWith('temp-')) {
            setDeletedItemIds([...deletedItemIds, itemToRemove.id]);
        }
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const parseDaysKm = (val: string | number | undefined | null): number => {
        if (val === undefined || val === null) return 1;
        const str = String(val).trim();
        if (!str) return 1;
        const match = str.match(/[\d.]+/);
        if (match) {
            const num = parseFloat(match[0]);
            return !isNaN(num) && num > 0 ? num : 1;
        }
        return 1;
    };

    const getDaysKmParts = (val: string | number | undefined | null) => {
        const str = String(val || '1').trim();
        const match = str.match(/^([\d.]+)\s*(.*)$/);
        if (match) {
            const num = parseFloat(match[1]);
            const unit = match[2].trim() || 'Days';
            return { num: isNaN(num) ? 1 : num, unit: unit.toLowerCase() === 'km' ? 'Km' : 'Days' };
        }
        return { num: 1, unit: 'Days' };
    };

    const subtotal = items.reduce((sum, item) => sum + (parseDaysKm(item.total_days_km) * Number(item.unit_price || 0)), 0);
    const taxTotal = docData.is_gst === 1
        ? items.reduce((sum, item) => sum + ((parseDaysKm(item.total_days_km) * Number(item.unit_price || 0)) * (Number(item.tax_rate || 0) / 100)), 0)
        : 0;
    const activeTaxRates: number[] = Array.from(new Set<number>(items.filter(item => Number(item.tax_rate) > 0).map(item => Number(item.tax_rate)))).sort((a: number, b: number) => a - b);
    const igstRatesStr = activeTaxRates.length > 0 ? ` (${activeTaxRates.map((r: number) => `${r}%`).join(', ')})` : '';
    const cgstSgstRatesStr = activeTaxRates.length > 0 ? ` (${activeTaxRates.map((r: number) => `${r / 2}%`).join(', ')})` : '';
    const discountAmt = Math.max(0, Math.min(subtotal, discount));
    
    // Read allowance values
    const driverStayAllowance = Number(docData.driver_stay_allowance || 0);
    const extraKmCharges = Number(docData.extra_km_charges || 0);
    const extraHrsCharges = Number(docData.extra_hrs_charges || 0);
    const advanceReceived = Number(docData.advance_received || 0);

    // Custom fields totals
    const customChargesTotal = customFields.filter(cf => !cf.is_deduction).reduce((s, cf) => s + Number(cf.amount || 0), 0);
    const customDeductionsTotal = customFields.filter(cf => cf.is_deduction).reduce((s, cf) => s + Number(cf.amount || 0), 0);

    const totalAmount = subtotal + taxTotal + driverStayAllowance + extraKmCharges + extraHrsCharges + customChargesTotal - discountAmt - customDeductionsTotal;
    const balanceDue = totalAmount - (Number(docData.amount_paid || 0) + advanceReceived);

    // ── Custom Field Helpers ──────────────────────────────────────────
    const addCustomField = () => {
        setCustomFields(prev => [...prev, {
            id: 'temp-' + generateId(),
            label: '',
            amount: 0,
            is_deduction: false,
            sort_order: prev.length
        }]);
    };

    const updateCustomField = (index: number, patch: Partial<typeof customFields[0]>) => {
        setCustomFields(prev => prev.map((cf, i) => i === index ? { ...cf, ...patch } : cf));
    };

    const removeCustomField = (index: number) => {
        const cf = customFields[index];
        if (isEdit && cf.id && !String(cf.id).startsWith('temp-')) {
            setDeletedCustomFieldIds(prev => [...prev, cf.id]);
        }
        setCustomFields(prev => prev.filter((_, i) => i !== index));
    };


    // Fix #9 — Only lock Paid and Void invoices; Sent invoices remain editable for typo fixes
    const isLocked = docData.payment_status === 'Paid' || docData.status === 'Void';

    const duplicateToDraft = async () => {
        setSaving(true);
        try {
            const token = (localStorage.getItem('shravya_jwt') || localStorage.getItem('token'));
            const newId = generateId();
            const payload = {
                ...docData,
                id: newId,
                subtotal,
                tax_total: taxTotal,
                discount: discountAmt,
                total_amount: totalAmount,
                balance_due: totalAmount - Number(docData.advance_received || 0),
                status: 'Draft',
                payment_status: 'Unpaid',
                amount_paid: 0,
                issue_date: new Date().toISOString().split('T')[0],
                field_labels: Object.keys(fieldLabels).length > 0 ? JSON.stringify(fieldLabels) : null
            };
            
            await fetch('/api/crud/invoices', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            for (const item of items) {
                const itemPayload = {
                    id: generateId(),
                    invoice_id: newId,
                    description: item.description || '',
                    date_from: item.date_from || null,
                    date_to: item.date_to || null,
                    quantity: Number(item.quantity || 1),
                    total_days_km: item.total_days_km || '1',
                    unit_price: Number(item.unit_price || 0),
                    tax_rate: Number(item.tax_rate || 0),
                    tax_amount: (parseDaysKm(item.total_days_km) * Number(item.unit_price || 0)) * (Number(item.tax_rate || 0) / 100),
                    total: (parseDaysKm(item.total_days_km) * Number(item.unit_price || 0)) * (1 + Number(item.tax_rate || 0) / 100),
                    hsn_sac: item.hsn_sac || '9985'
                };
                await fetch('/api/crud/invoice_items', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(itemPayload)
                });
            }

            // Copy custom fields to the new draft invoice
            for (let i = 0; i < customFields.length; i++) {
                const cf = customFields[i];
                await fetch('/api/crud/invoice_custom_fields', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: generateId(),
                        invoice_id: newId,
                        label: cf.label || '',
                        amount: Number(cf.amount || 0),
                        is_deduction: cf.is_deduction ? 1 : 0,
                        sort_order: i
                    })
                });
            }

            toast.success('Document duplicated to Draft');
            navigate(`/admin/invoices/edit/${newId}`);
        } catch (error) {
            console.error('Failed to duplicate:', error);
            toast.error('Failed to duplicate document');
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async (generate: boolean) => {
        if (!docData.client_name.trim()) {
            toast.error('Client name is required');
            return;
        }
        if (items.length === 0) {
            toast.error('At least one item is required');
            return;
        }
        setSaving(true);
        try {
            const token = (localStorage.getItem('shravya_jwt') || localStorage.getItem('token'));
            const payload = {
                ...docData,
                subtotal,
                tax_total: taxTotal,
                discount: discountAmt,
                total_amount: totalAmount,
                balance_due: balanceDue,
                status: generate ? (docData.status === 'Void' ? 'Void' : 'Sent') : (docData.status || 'Draft'),
                payment_status: docData.payment_status || 'Unpaid',
                amount_paid: docData.amount_paid || 0,
                // Fix #6 — Preserve existing issue_date; only default to today for new documents
                issue_date: isEdit ? (docData.issue_date || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
                due_date: docData.due_date || null,
                field_labels: Object.keys(fieldLabels).length > 0 ? JSON.stringify(fieldLabels) : null
            };

            let invoiceId = id;
            if (isEdit) {
                const res = await fetch(`/api/crud/invoices/${id}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) {
                    const errText = await res.text();
                    console.error('Invoice update failed:', errText);
                    throw new Error(`Failed to update invoice: ${errText}`);
                }
            } else {
                const res = await fetch('/api/crud/invoices', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) {
                    const errText = await res.text();
                    console.error('Invoice create failed:', errText);
                    throw new Error(`Failed to create invoice: ${errText}`);
                }
                const resData = await res.json();
                invoiceId = resData.data?.id;
            }

            if (isEdit && deletedItemIds.length > 0) {
                for (const delId of deletedItemIds) {
                    await fetch(`/api/crud/invoice_items/${delId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                }
            }

            for (const item of items) {
                const isNew = String(item.id).startsWith('temp-') || !isEdit;
                const finalId = isNew ? generateId() : item.id;
                const itemPayload = {
                    id: finalId,
                    invoice_id: invoiceId,
                    description: item.description || '',
                    date_from: item.date_from || null,
                    date_to: item.date_to || null,
                    quantity: Number(item.quantity || 1),
                    total_days_km: item.total_days_km || '1',
                    unit_price: Number(item.unit_price || 0),
                    tax_rate: Number(item.tax_rate || 0),
                    tax_amount: (parseDaysKm(item.total_days_km) * Number(item.unit_price || 0)) * (Number(item.tax_rate || 0) / 100),
                    total: (parseDaysKm(item.total_days_km) * Number(item.unit_price || 0)) * (1 + Number(item.tax_rate || 0) / 100),
                    hsn_sac: item.hsn_sac || '9985'
                };
                if (isNew) {
                    await fetch('/api/crud/invoice_items', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify(itemPayload)
                    });
                } else {
                    await fetch(`/api/crud/invoice_items/${item.id}`, {
                        method: 'PUT',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify(itemPayload)
                    });
                }
            }

            // ── Save Custom Extra Fields ──────────────────────────────────
            // 1. Delete removed custom fields
            for (const delId of deletedCustomFieldIds) {
                await fetch(`/api/crud/invoice_custom_fields/${delId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            }
            // 2. Create new / update existing custom fields
            for (let i = 0; i < customFields.length; i++) {
                const cf = customFields[i];
                const cfIsNew = String(cf.id).startsWith('temp-') || !isEdit;
                const cfPayload = {
                    id: cfIsNew ? generateId() : cf.id,
                    invoice_id: invoiceId,
                    label: cf.label || '',
                    amount: Number(cf.amount || 0),
                    is_deduction: cf.is_deduction ? 1 : 0,
                    sort_order: i
                };
                if (cfIsNew) {
                    await fetch('/api/crud/invoice_custom_fields', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify(cfPayload)
                    });
                } else {
                    await fetch(`/api/crud/invoice_custom_fields/${cf.id}`, {
                        method: 'PUT',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify(cfPayload)
                    });
                }
            }

            // Ledger Sync: Auto-create transaction for Paid invoices linked to a booking
            const amtPaid = Number(docData.amount_paid || 0);
            const isPaid = docData.payment_status === 'Paid' || docData.payment_status === 'Partially Paid';
            if (isPaid && docData.booking_id && amtPaid > 0) {
                try {
                    const txRes = await fetch(`/api/crud/booking_transactions?eq_reference=${invoiceId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const txData = await txRes.json();
                    
                    if (!txData.data || txData.data.length === 0) {
                        await fetch('/api/crud/booking_transactions', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                id: generateId(),
                                booking_id: docData.booking_id,
                                amount: amtPaid,
                                type: 'Payment',
                                method: 'Bank Transfer',
                                reference: invoiceId,
                                notes: `Auto-generated from Invoice #${invoiceId.slice(0,6)}`,
                                date: new Date().toISOString().split('T')[0]
                            })
                        });
                    } else {
                        const existingTx = txData.data[0];
                        if (Number(existingTx.amount) !== amtPaid) {
                            await fetch(`/api/crud/booking_transactions/${existingTx.id}`, {
                                method: 'PUT',
                                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ amount: amtPaid })
                            });
                        }
                    }
                } catch (txErr) {
                    console.error('Ledger sync failed:', txErr);
                }
            } else if (!isPaid && docData.booking_id) {
                try {
                    const txRes = await fetch(`/api/crud/booking_transactions?eq_reference=${invoiceId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const txData = await txRes.json();
                    if (txData.data && txData.data.length > 0) {
                        for (const tx of txData.data) {
                            await fetch(`/api/crud/booking_transactions/${tx.id}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                        }
                    }
                } catch (txErr) {
                    console.error('Ledger cleanup failed:', txErr);
                }
            }

            if (generate) {
                await generateTrueInvoicePDF({ ...payload, id: invoiceId }, items, co, fi, customFields, fieldLabels);
                toast.success('PDF generated and downloaded! Document marked as Sent.');
            } else {
                toast.success('Document saved successfully!');
            }
            setIsDirty(false);
            navigate('/admin/invoices');

        } catch (error) {
            console.error(error);
            toast.error('Failed to save document');
        } finally {
            setSaving(false);
        }
    };

    const handleRecordPayment = async () => {
        if (!id) { toast.error('Save the invoice first before recording a payment.'); return; }
        if (paymentAmount <= 0) { toast.error('Payment amount must be greater than zero.'); return; }
        if (paymentAmount > (totalAmount - Number(docData.amount_paid || 0))) {
            toast.error('Payment exceeds outstanding balance.'); return;
        }
        setRecordingPayment(true);
        try {
            const token = (localStorage.getItem('shravya_jwt') || localStorage.getItem('token'));
            const newAmountPaid = Number(docData.amount_paid || 0) + paymentAmount;
            const newStatus = newAmountPaid >= totalAmount ? 'Paid' : 'Partially Paid';

            // 1. Update invoice amount_paid + payment_status + balance_due
            const newBalanceDue = Math.max(0, totalAmount - (newAmountPaid + Number(docData.advance_received || 0)));
            await fetch(`/api/crud/invoices/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount_paid: newAmountPaid, payment_status: newStatus, balance_due: newBalanceDue })
            });

            // 2. Create a booking_transactions entry (for ledger, even if no booking_id)
            const txPayload: any = {
                id: generateId(),
                amount: paymentAmount,
                type: 'Payment',
                method: paymentMethod,
                reference: id,
                notes: paymentNote || `Payment for Invoice #${id.slice(0, 6).toUpperCase()}`,
                date: new Date().toISOString().split('T')[0]
            };
            if (docData.booking_id) txPayload.booking_id = docData.booking_id;

            await fetch('/api/crud/booking_transactions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(txPayload)
            });

            // 3. Update local state (including recalculated balance_due)
            setDocData(prev => ({ 
                ...prev, 
                amount_paid: newAmountPaid, 
                payment_status: newStatus,
                balance_due: newBalanceDue
            }));
            setShowPaymentModal(false);
            setPaymentAmount(0);
            setPaymentNote('');
            toast.success(`Payment of ₹${paymentAmount.toLocaleString('en-IN')} recorded! Status: ${newStatus}`);
        } catch (err) {
            console.error('Payment record failed:', err);
            toast.error('Failed to record payment.');
        } finally {
            setRecordingPayment(false);
        }
    };

    const handleWhatsApp = () => {
        const docName = docData.document_type;
        const total = totalAmount.toLocaleString('en-IN');
        const text = `Hi ${docData.client_name},\n\nHere is your ${docName} ${id ? `#${fi.invoicePrefix || 'INV'}-${id}` : ''} for ₹${total}.\n\nPayment Status: ${docData.payment_status}\n\nThank you for choosing ${co.companyName || 'SHRAWELLO Travel Hub'}!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
            <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                    <FileCheck size={28} className="text-orange-500" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
                    <Loader2 size={14} className="animate-spin text-orange-500" />
                </div>
            </div>
            <p className="text-sm font-medium">Loading document...</p>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-[#f4f6fb] dark:bg-[#0d1420] overflow-y-auto">

            {/* Catalog Search Slide-over Drawer */}
            {showCatalogPanel && (
                <div className="fixed inset-0 z-[999] flex justify-end p-0 print:hidden bg-black/40 backdrop-blur-sm transition-opacity duration-300" onClick={() => setShowCatalogPanel(false)}>
                    <div
                        className="relative bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-850 shadow-2xl w-full max-w-md h-full flex flex-col animate-[slideUp_0.25s_cubic-bezier(0.16,1,0.3,1)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
                            <div>
                                <h4 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                                    <Search size={16} className="text-orange-500" /> Search Catalog
                                </h4>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">Add packaged tours directly to the invoice</p>
                            </div>
                            <button
                                onClick={() => setShowCatalogPanel(false)}
                                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        {/* Search Input Bar */}
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search by package title, destination..."
                                    value={catalogSearch}
                                    autoFocus
                                    onChange={(e) => {
                                        setCatalogSearch(e.target.value);
                                        searchCatalog(e.target.value);
                                    }}
                                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 focus:border-orange-500 dark:focus:border-orange-500 rounded-xl pl-4 pr-10 py-3 text-xs outline-none focus:ring-4 focus:ring-orange-500/10 font-bold transition-all text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                />
                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Search size={14} />
                                </div>
                            </div>
                        </div>

                        {/* Results Body */}
                        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
                            {catalogResults.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold">
                                    No custom packages found in catalog
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {catalogResults.map((r: any) => (
                                        <div
                                            key={r.id}
                                            onClick={() => addFromCatalog(r)}
                                            className="p-4 bg-slate-50/50 hover:bg-orange-500/5 dark:bg-slate-800/10 dark:hover:bg-slate-800/40 cursor-pointer transition-all duration-300 rounded-2xl border border-slate-150 dark:border-slate-800/60 hover:border-orange-500/20 dark:hover:border-orange-500/20 flex justify-between items-center group"
                                        >
                                            <div className="min-w-0 flex-1 pr-3">
                                                <p className="font-bold text-slate-800 dark:text-slate-250 text-xs truncate leading-snug">{r.title}</p>
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1 tracking-wide uppercase">
                                                    {r.days} Days / {r.nights} Nights • {r.destination}
                                                </p>
                                            </div>
                                            <div className="text-right flex-shrink-0 flex items-center gap-2">
                                                <span className="text-xs font-black text-slate-900 dark:text-white">
                                                    ₹{Number(r.price || 0).toLocaleString('en-IN')}
                                                </span>
                                                <span className="text-[10px] font-black text-orange-500 bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                                    + Add
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Link Record Slide-over Drawer */}
            {showLinkPanel && (
                <div className="fixed inset-0 z-[999] flex justify-end p-0 print:hidden bg-black/40 backdrop-blur-sm transition-opacity duration-300" onClick={() => setShowLinkPanel(false)}>
                    <div
                        className="relative bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-850 shadow-2xl w-full max-w-md h-full flex flex-col animate-[slideUp_0.25s_cubic-bezier(0.16,1,0.3,1)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
                            <div>
                                <h4 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                                    <Link size={16} className="text-orange-500" /> Link Customer Record
                                </h4>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">Auto-fill client details from a booking or lead</p>
                            </div>
                            <button
                                onClick={() => setShowLinkPanel(false)}
                                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        {/* Search Input Bar */}
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2.5">
                            <select
                                value={searchType}
                                onChange={(e) => {
                                    setSearchType(e.target.value);
                                    setSearchResults([]);
                                    searchRecords(e.target.value, searchQuery);
                                }}
                                className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-3 text-xs outline-none font-bold text-slate-700 dark:text-slate-300 focus:ring-4 focus:ring-orange-500/10 cursor-pointer transition-all"
                            >
                                <option value="bookings">Bookings</option>
                                <option value="leads">Leads</option>
                            </select>
                            
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    placeholder="Search name, email, phone..."
                                    value={searchQuery}
                                    autoFocus
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        searchRecords(searchType, e.target.value);
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && searchRecords()}
                                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 focus:border-orange-500 dark:focus:border-orange-500 rounded-xl pl-4 pr-10 py-3 text-xs outline-none focus:ring-4 focus:ring-orange-500/10 font-bold transition-all text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                />
                                {searching && (
                                    <Loader2 size={13} className="animate-spin text-orange-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                                )}
                            </div>
                        </div>

                        {/* Results Body */}
                        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
                            {searching && searchResults.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold flex flex-col items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center animate-spin">
                                        <Loader2 size={18} className="text-orange-500" />
                                    </div>
                                    <span>Searching databases...</span>
                                </div>
                            ) : searchResults.length === 0 && searchHasRun ? (
                                <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold">
                                    No matching profiles or entries found
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {searchResults.map((r: any) => (
                                        <div
                                            key={r.id}
                                            onClick={() => linkRecord(r)}
                                            className="p-4 bg-slate-50/50 hover:bg-orange-500/5 dark:bg-slate-800/10 dark:hover:bg-slate-800/40 cursor-pointer transition-all duration-300 rounded-2xl border border-slate-150 dark:border-slate-800/60 hover:border-orange-500/20 dark:hover:border-orange-500/20 flex justify-between items-center group"
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                                <div className="w-9 h-9 rounded-full bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 font-extrabold flex items-center justify-center text-xs flex-shrink-0 shadow-inner">
                                                    {(r.customer_name || r.name || r.customer || '?').substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate leading-snug">{r.customer_name || r.name || r.customer || 'Unknown Client'}</p>
                                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5 truncate">{r.customer_email || r.email || 'No Email'}</p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-black text-orange-500 bg-orange-50 dark:bg-orange-500/10 px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                Link
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {!searching && searchResults.length > 0 && (
                            <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-center text-[10px] text-slate-400 dark:text-slate-500 font-medium bg-slate-50/50 dark:bg-slate-900/30">
                                {searchResults.length} profiles discovered · Click row to autofill Billed To
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Record Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 print:hidden" onClick={() => setShowPaymentModal(false)}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-start mb-5">
                            <div>
                                <h4 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <CreditCard size={16} className="text-violet-600" /> Record Payment
                                </h4>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Outstanding: ₹{Math.max(0, totalAmount - Number(docData.amount_paid || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">✕</button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Amount Received (₹)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={paymentAmount || ''}
                                    onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
                                    placeholder={`Max ₹${Math.max(0, totalAmount - Number(docData.amount_paid || 0)).toLocaleString('en-IN')}`}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Payment Method</label>
                                <select
                                    value={paymentMethod}
                                    onChange={e => setPaymentMethod(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-500 transition-all"
                                >
                                    <option>Bank Transfer</option>
                                    <option>UPI</option>
                                    <option>Cash</option>
                                    <option>Cheque</option>
                                    <option>Credit Card</option>
                                    <option>Debit Card</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Note (optional)</label>
                                <input
                                    type="text"
                                    value={paymentNote}
                                    onChange={e => setPaymentNote(e.target.value)}
                                    placeholder="e.g. UTR12345 / Reference no."
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-500 transition-all"
                                />
                            </div>

                            {paymentAmount > 0 && (
                                <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3 text-xs text-violet-700 dark:text-violet-300 space-y-1">
                                    <div className="flex justify-between"><span>Amount paid after this:</span><span className="font-bold">₹{(Number(docData.amount_paid || 0) + paymentAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                                    <div className="flex justify-between"><span>Remaining balance:</span><span className="font-bold">₹{Math.max(0, totalAmount - Number(docData.amount_paid || 0) - paymentAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                                    <div className="flex justify-between"><span>New status:</span><span className="font-bold">{(Number(docData.amount_paid || 0) + paymentAmount) >= totalAmount ? '✅ Paid' : '🔶 Partially Paid'}</span></div>
                                </div>
                            )}

                            <button
                                onClick={handleRecordPayment}
                                disabled={recordingPayment || paymentAmount <= 0}
                                className="w-full h-10 bg-violet-700 hover:bg-violet-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/20"
                            >
                                {recordingPayment ? <><Loader2 size={14} className="animate-spin" /> Recording…</> : <><CheckCircle2 size={14} /> Confirm Payment</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Grouped Top Bar */}
            <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/80 px-6 py-3 flex flex-col md:flex-row justify-between items-center sticky top-0 z-30 gap-4 print:hidden shadow-sm">
                
                {/* Left section: Breadcrumb & Title */}
                <div className="flex items-center gap-3.5 w-full md:w-auto">
                    <button onClick={() => navigate(-1)} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-xl transition-all text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:scale-105 active:scale-95">
                        <ArrowLeft size={16} />
                    </button>
                    <div className="h-6 w-px bg-slate-200/80 dark:bg-slate-800" />
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Document Editor</span>
                            <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                            <span className="text-[11px] font-bold text-orange-500 bg-orange-50 dark:bg-orange-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                {docData.document_type}
                            </span>
                        </div>
                        <h1 className="font-bold text-slate-800 dark:text-white text-sm truncate tracking-tight mt-0.5">
                            {isEdit ? `Edit ${docData.document_type}` : `Create New ${docData.document_type}`}
                            <span className="text-slate-400 dark:text-slate-500 font-normal ml-1.5 text-xs">
                                {id ? `#${id.slice(0, 8).toUpperCase()}` : '(Unsaved Draft)'}
                            </span>
                        </h1>
                    </div>
                </div>

                {/* Center section: Glowing Live KPI Total */}
                {totalAmount > 0 && (
                    <div className="flex items-center gap-3 bg-gradient-to-r from-orange-500/5 to-amber-500/5 dark:from-orange-500/10 dark:to-amber-500/10 border border-orange-500/20 dark:border-orange-500/30 px-4 py-1.5 rounded-2xl shadow-inner animate-pulse-slow">
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Live Total</span>
                            <span className="font-extrabold text-sm text-[#F26222] tabular-nums mt-0.5">
                                ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                )}

                {/* Right section: Prioritized Actions */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    
                    {/* Share / Print Quick Action Bar */}
                    <div className="flex items-center bg-slate-100/80 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
                        {id && (
                            <button 
                                onClick={handleWhatsApp} 
                                title="Share via WhatsApp"
                                className="p-2 hover:bg-[#25D366]/10 text-slate-500 hover:text-[#25D366] dark:text-slate-400 dark:hover:text-[#25D366] rounded-lg transition-all hover:scale-105 active:scale-95"
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            </button>
                        )}
                        <button 
                            onClick={() => {
                                const total = totalAmount.toLocaleString('en-IN');
                                const subject = encodeURIComponent(`Your ${docData.document_type} from ${co.companyName || 'SHRAWELLO Travel Hub'}`);
                                const body = encodeURIComponent(`Hi ${docData.client_name},\n\nPlease find the details for your ${docData.document_type} attached.\n\nTotal Amount: INR ${total}\nPayment Status: ${docData.payment_status}\n\nThank you for choosing ${co.companyName || 'SHRAWELLO Travel Hub'}!`);
                                window.open(`mailto:${docData.email || ''}?subject=${subject}&body=${body}`);
                            }} 
                            title="Send Email link"
                            className="p-2 hover:bg-sky-500/10 text-slate-500 hover:text-sky-500 dark:text-slate-400 dark:hover:text-sky-400 rounded-lg transition-all hover:scale-105 active:scale-95"
                        >
                            <Mail size={15} />
                        </button>
                        <button 
                            onClick={() => generateTrueInvoicePDF({ ...docData, id, subtotal, tax_total: taxTotal, discount: discountAmt, total_amount: totalAmount }, items, co, fi)} 
                            title="Download Premium PDF"
                            className="p-2 hover:bg-orange-500/10 text-slate-500 hover:text-orange-500 dark:text-slate-400 dark:hover:text-orange-400 rounded-lg transition-all hover:scale-105 active:scale-95"
                        >
                            <Printer size={15} />
                        </button>
                    </div>

                    <div className="h-6 w-px bg-slate-200/80 dark:bg-slate-800" />

                    {/* Violet Record Payment Action */}
                    {id && docData.payment_status !== 'Paid' && (
                        <button
                            onClick={() => { setPaymentAmount(Math.max(0, totalAmount - Number(docData.amount_paid || 0))); setShowPaymentModal(true); }}
                            className="h-9 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-violet-500/15 hover:scale-[1.02] active:scale-95"
                        >
                            <CreditCard size={13} /> Record Payment
                        </button>
                    )}

                    {/* Locked Indicator / Split Action Button */}
                    {isLocked ? (
                        <div className="flex items-center gap-2">
                            <div className="h-9 px-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 shadow-sm">
                                <span className="material-symbols-outlined text-[15px] text-slate-400">lock</span> Locked
                            </div>
                            <button 
                                disabled={saving} 
                                onClick={duplicateToDraft} 
                                className="h-9 px-4 border border-amber-200 bg-amber-50 hover:bg-amber-100 dark:border-amber-900/30 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-95"
                            >
                                {saving ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />}
                                Duplicate
                            </button>
                        </div>
                    ) : (
                        <div className="relative flex items-center">
                            {/* Left Side: Save & Generate (Main action) */}
                            <button
                                disabled={saving}
                                onClick={() => handleSave(true)}
                                className="h-9 pl-4 pr-3.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-l-xl flex items-center gap-1.5 transition-all disabled:opacity-50 hover:opacity-95 shadow-md shadow-orange-500/10"
                            >
                                {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                {saving ? 'Saving…' : 'Generate & Send'}
                            </button>
                            
                            {/* Right Side: Split Arrow Dropdown Trigger */}
                            <button
                                disabled={saving}
                                onClick={() => setIsSaveDropdownOpen(!isSaveDropdownOpen)}
                                className="h-9 px-2 bg-orange-600 hover:bg-orange-700 text-white rounded-r-xl border-l border-orange-500/20 flex items-center justify-center transition-all disabled:opacity-50"
                            >
                                <ChevronDown size={14} className={`transition-transform duration-200 ${isSaveDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown Options Box */}
                            {isSaveDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsSaveDropdownOpen(false)} />
                                    <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden py-1 animate-[scaleIn_0.15s_ease-out]">
                                        <button
                                            onClick={() => {
                                                setIsSaveDropdownOpen(false);
                                                handleSave(false);
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 font-medium"
                                        >
                                            <Save size={13} className="text-slate-400" />
                                            Save Draft
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsSaveDropdownOpen(false);
                                                setDocData(prev => ({...prev, status: 'Void'}));
                                                setTimeout(() => handleSave(false), 0);
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-2 font-medium border-t border-slate-100 dark:border-slate-700"
                                        >
                                            <AlertCircle size={13} className="text-purple-400" />
                                            Mark as Void
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Document Workspace */}
            <div className="max-w-[860px] mx-auto w-full px-6 py-8 pb-16 print:p-0 print:max-w-none">
                <div id="print-section" className="bg-white dark:bg-[#111827] rounded-2xl shadow-[0_4px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] border border-slate-200/60 dark:border-slate-800/80 overflow-hidden relative transition-all duration-300">

                    {/* Document Header */}
                    <div className="bg-white dark:bg-[#111827] p-8 flex justify-between items-start transition-colors duration-300">
                        <div className="flex flex-col">
                            {/* Document Type Switcher */}
                            <div className="flex items-center gap-2 mb-3.5 print:hidden">
                                {['Invoice','Quotation','Proforma'].map(type => (
                                    <button
                                        key={type}
                                        disabled={isLocked}
                                        onClick={() => setDocData({...docData, document_type: type})}
                                        className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all ${
                                            docData.document_type === type
                                                ? 'bg-[#F26222] text-white shadow-sm'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700/80'
                                        } ${isLocked ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <h1 className="text-4xl font-black text-[#091C3B] dark:text-white tracking-tight uppercase">{docData.document_type}</h1>
                                <span className="bg-[#42bbed] text-white px-3 py-0.5 rounded-md text-[10px] font-bold shadow-sm shadow-[#42bbed]/30 uppercase tracking-wider print:bg-[#42bbed] print:text-white" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                    {docData.payment_status === 'Paid' ? 'Paid' : docData.payment_status === 'Partially Paid' ? 'Part Paid' : docData.payment_status}
                                </span>
                            </div>
                            
                            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 print:flex print:flex-col print:gap-1.5 text-xs">
                                <div className="bg-slate-50/50 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-3.5 flex flex-col justify-center transition-colors">
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider mb-1">Invoice No #</span>
                                    <span className="font-extrabold text-[#091C3B] dark:text-white text-sm">{id ? `${fi.invoicePrefix || 'INV'}-${id.slice(0,6).toUpperCase()}` : 'DRAFT'}</span>
                                </div>
                                <div className="bg-slate-50/50 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-3.5 flex flex-col justify-center transition-colors">
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider mb-1">Invoice Date</span>
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="date"
                                            value={docData.issue_date ? docData.issue_date.split('T')[0] : new Date().toISOString().split('T')[0]}
                                            onChange={e => { setDocData(prev => ({...prev, issue_date: e.target.value})); setIsDirty(true); }}
                                            disabled={isLocked}
                                            className="font-bold text-[#091C3B] dark:text-white bg-transparent border-0 outline-none text-xs p-0 w-full print:hidden disabled:opacity-60 cursor-pointer"
                                        />
                                        <span className="hidden print:inline font-bold text-[#091C3B]">{new Date(docData.issue_date || new Date()).toLocaleDateString('en-US', {month:'short', day:'2-digit', year:'numeric'})}</span>
                                    </div>
                                </div>
                                <div className="bg-slate-50/50 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-3.5 flex flex-col justify-center transition-colors">
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider mb-1">Due Date</span>
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="date"
                                            value={docData.due_date ? String(docData.due_date).split('T')[0] : ''}
                                            onChange={e => { setDocData(prev => ({...prev, due_date: e.target.value || null})); setIsDirty(true); }}
                                            disabled={isLocked}
                                            className="font-bold text-[#091C3B] dark:text-white bg-transparent border-0 outline-none text-xs p-0 w-full print:hidden disabled:opacity-60 cursor-pointer"
                                            placeholder="Not set"
                                        />
                                        <span className="hidden print:inline font-bold text-[#091C3B]">{docData.due_date ? new Date(docData.due_date).toLocaleDateString('en-US', {month:'short', day:'2-digit', year:'numeric'}) : '—'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="text-right flex flex-col items-end gap-3">
                            {co.logoUrl ? (
                                <img src={co.logoUrl} alt="logo" className="h-24 w-auto object-contain" />
                            ) : (
                                <div className="text-center group cursor-pointer">
                                    <div className="w-20 h-20 rounded-full border-2 border-orange-200 dark:border-orange-500/20 mx-auto mb-1.5 flex items-center justify-center relative bg-orange-50 dark:bg-orange-950/20 overflow-hidden shadow-sm group-hover:scale-105 transition-transform duration-300">
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[40px]">✈️</div>
                                        <div className="absolute top-0 text-[8px] uppercase tracking-[0.2em] font-bold text-orange-800 dark:text-orange-400 w-full text-center mt-2" style={{ transform: 'rotate(-25deg)', transformOrigin: 'center' }}>Discover Your</div>
                                    </div>
                                    <h2 className="text-lg font-black tracking-widest text-[#091C3B] dark:text-white uppercase leading-none">SHRAWELLO</h2>
                                    <p className="text-orange-500 font-cursive text-xl -mt-1">Tours</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="px-8 pb-10 space-y-6">
                        {/* Billed By / Billed To Cards */}
                        <div className="flex flex-col md:flex-row items-stretch gap-6">
                            
                            {/* Billed By (Static Settings) */}
                            <div className="flex-1 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/80 transition-colors flex flex-col justify-between" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                <div>
                                    <h3 className="text-xs font-extrabold text-[#F26222] uppercase tracking-widest mb-3.5">Billed By</h3>
                                    <div className="space-y-2 text-sm text-slate-650 dark:text-slate-300">
                                        <p className="font-extrabold text-base text-[#091C3B] dark:text-white leading-tight">{co.companyName || 'SHRAWELLO Travel Hub and Events LLP'}</p>
                                        {co.registeredAddress ? (
                                            <div className="whitespace-pre-line leading-relaxed text-xs text-slate-500 dark:text-slate-400">{co.registeredAddress}</div>
                                        ) : (
                                            <div className="leading-relaxed text-xs text-slate-500 dark:text-slate-400">
                                                <p>Pimpri Chinchwad, Pune,</p>
                                                <p>Maharashtra, India - 411062</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1.5 text-xs text-slate-500 mt-5 border-t border-slate-100 dark:border-slate-800/80 pt-3.5">
                                    <p>
                                        <span className="font-bold text-slate-400 dark:text-slate-500">Email:</span> {co.email || 'hello@shrawello.com'}
                                    </p>
                                    <p>
                                        <span className="font-bold text-slate-400 dark:text-slate-500">Phone:</span> {co.phone || '+91 80109 55675'}
                                    </p>
                                    <p>
                                        <span className="font-bold text-slate-400 dark:text-slate-500">GSTIN:</span> {co.gstNumber || '27AFXFS7018E1ZH'}
                                    </p>
                                    <p>
                                        <span className="font-bold text-slate-400 dark:text-slate-500">PAN:</span> AFXFS7018E
                                    </p>
                                </div>
                            </div>

                            {/* Billed To (Interactive Form) */}
                            <div className="flex-1 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/80 hover:border-orange-500/20 dark:hover:border-orange-500/20 transition-all relative group flex flex-col justify-between" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                <div>
                                    <h3 className="text-xs font-extrabold text-[#F26222] uppercase tracking-widest mb-3 flex items-center justify-between">
                                        <span className="flex items-center gap-1.5">
                                            Billed To
                                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 dark:text-slate-500">
                                                <Edit3 size={11} className="inline -mt-0.5 animate-pulse" />
                                            </span>
                                        </span>
                                        <button
                                            onClick={() => {
                                                setShowLinkPanel(true);
                                                setSearchResults([]);
                                                setSearchHasRun(false);
                                                setSearchQuery('');
                                                setTimeout(() => searchRecords(searchType, ''), 0);
                                            }}
                                            className="text-[10px] font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1.5 print:hidden opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200/50 dark:border-slate-700/80 shadow-sm"
                                        >
                                            <Link size={11} /> Link Record
                                        </button>
                                    </h3>
                                    <div className="space-y-3 text-sm">
                                        {/* GST vs Non-GST Selector */}
                                        <div className="flex gap-2 print:hidden mb-2">
                                            <button
                                                type="button"
                                                onClick={() => setDocData({ ...docData, is_gst: 1 })}
                                                className={`flex-1 py-1 px-3 rounded-lg text-[10px] font-bold transition-all border ${
                                                    docData.is_gst === 1 
                                                        ? 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20' 
                                                        : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200/50 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-750'
                                                }`}
                                            >
                                                GST Tax Invoice
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDocData({ ...docData, is_gst: 0 })}
                                                className={`flex-1 py-1 px-3 rounded-lg text-[10px] font-bold transition-all border ${
                                                    docData.is_gst === 0 
                                                        ? 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20' 
                                                        : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200/50 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-750'
                                                }`}
                                            >
                                                Non-GST / Retail
                                            </button>
                                        </div>

                                        <input
                                            type="text"
                                            value={docData.client_name}
                                            onChange={(e) => { setDocData({ ...docData, client_name: e.target.value }); setIsDirty(true); }}
                                            placeholder="Client Name *"
                                            className="font-bold text-base bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-350 focus:border-orange-500 w-full outline-none focus:ring-0 py-0.5 text-[#091C3B] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all text-xs"
                                        />
                                        <textarea
                                            value={docData.address}
                                            onChange={(e) => setDocData({ ...docData, address: e.target.value })}
                                            placeholder="Billing address"
                                            rows={2}
                                            className="bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-350 focus:border-orange-500 w-full outline-none focus:ring-0 resize-none text-xs leading-relaxed text-slate-600 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all py-0.5"
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-2 mt-5 border-t border-slate-100 dark:border-slate-800/80 pt-3.5">
                                    <div className="flex items-center gap-1.5 text-xs">
                                        <span className="font-bold text-slate-400 dark:text-slate-500">Email:</span>
                                        <input
                                            type="email"
                                            value={docData.email}
                                            onChange={(e) => setDocData({ ...docData, email: e.target.value })}
                                            placeholder="Email address"
                                            className="bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-350 focus:border-orange-500 flex-1 outline-none focus:ring-0 py-0.5 text-slate-605 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all text-xs"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs">
                                        <span className="font-bold text-slate-400 dark:text-slate-500">Phone:</span>
                                        <input
                                            type="tel"
                                            value={docData.phone || ''}
                                            onChange={(e) => setDocData({ ...docData, phone: e.target.value })}
                                            placeholder="Phone number"
                                            className="bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-350 focus:border-orange-500 flex-1 outline-none focus:ring-0 py-0.5 text-slate-605 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all text-xs"
                                        />
                                    </div>

                                    {/* Client GSTIN & GST Type (Only if GST is selected) */}
                                    {docData.is_gst === 1 && (
                                        <div className="space-y-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 transition-all animate-in fade-in duration-300">
                                            <div className="flex items-center gap-1.5 text-xs">
                                                <span className="font-bold text-slate-400 dark:text-slate-500">Client GSTIN:</span>
                                                <input
                                                    type="text"
                                                    value={docData.client_gst || ''}
                                                    onChange={(e) => setDocData({ ...docData, client_gst: e.target.value.toUpperCase() })}
                                                    placeholder="GSTIN (e.g. 27AAAAA0000A1Z0)"
                                                    maxLength={15}
                                                    className="bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-355 focus:border-orange-500 flex-1 outline-none focus:ring-0 py-0.5 text-slate-605 dark:text-slate-350 font-mono tracking-wide placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all text-xs"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs">
                                                <span className="font-bold text-slate-400 dark:text-slate-500">GST Type:</span>
                                                <select
                                                    value={docData.gst_type || 'CGST_SGST'}
                                                    onChange={(e) => setDocData({ ...docData, gst_type: e.target.value })}
                                                    className="bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-355 focus:border-orange-500 flex-1 outline-none focus:ring-0 py-0.5 text-slate-700 dark:text-slate-300 font-bold transition-all text-xs cursor-pointer dark:bg-slate-900"
                                                >
                                                    <option value="CGST_SGST">Intra-state (CGST + SGST)</option>
                                                    <option value="IGST">Inter-state (IGST)</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Line Items Table */}
                        <div className="border border-slate-200/60 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-sm transition-all duration-300">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-[#091C3B] dark:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                        <th className="text-left px-4 py-4 w-[5%]">#</th>
                                        <th className={`text-left px-4 py-4 ${docData.is_gst === 1 ? 'w-[30%]' : 'w-[40%]'}`}>Description</th>
                                        {docData.is_gst === 1 && (
                                            <th className="text-center px-2 py-4 w-[10%]">HSN/SAC</th>
                                        )}
                                        <th className={`text-center px-2 py-4 ${docData.is_gst === 1 ? 'w-[8%]' : 'w-[10%]'}`}>Qty</th>
                                        <th className={`text-center px-2 py-4 ${docData.is_gst === 1 ? 'w-[14%]' : 'w-[18%]'}`}>Total Days / Km</th>
                                        <th className="text-right px-2 py-4 w-[13%]">Rate (₹)</th>
                                        {docData.is_gst === 1 && (
                                            <th className="text-right px-2 py-4 w-[8%]">GST (%)</th>
                                        )}
                                        <th className="text-right px-4 py-4 w-[12%]">Amount (₹)</th>
                                        <th className="w-0 p-0 print:hidden"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => {
                                        const { num: daysKmNum, unit: daysKmUnit } = getDaysKmParts(item.total_days_km);
                                        return (
                                        <tr key={index} className={`group transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0 ${index % 2 !== 0 ? 'bg-slate-50/50 dark:bg-slate-800/10' : 'bg-white dark:bg-[#111827]'}`} style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                            <td className="px-4 py-4.5 align-middle text-slate-400 dark:text-slate-500 font-bold text-xs">{index + 1}.</td>
                                            <td className="px-4 py-4.5 align-middle">
                                                <textarea
                                                    value={item.description}
                                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                    placeholder="Enter details of tour packages, flights, stays..."
                                                    rows={2}
                                                    className="w-full bg-slate-50 dark:bg-slate-800/40 outline-none resize-none text-slate-700 dark:text-slate-200 leading-relaxed font-semibold focus:border-orange-500 focus:ring-0 border border-slate-200/60 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 rounded-xl transition-all text-xs px-2.5 py-1.5"
                                                />
                                            </td>
                                            {docData.is_gst === 1 && (
                                                <td className="px-2 py-4.5 align-middle text-center">
                                                    <input
                                                        type="text"
                                                        value={item.hsn_sac || '9985'}
                                                        onChange={(e) => handleItemChange(index, 'hsn_sac', e.target.value)}
                                                        placeholder="9985"
                                                        className="w-full bg-slate-50 dark:bg-slate-800/40 text-center text-slate-700 dark:text-slate-200 outline-none border border-slate-200/60 dark:border-slate-800 focus:border-orange-500 focus:ring-0 font-semibold rounded-xl transition-all text-xs px-2 py-1.5"
                                                    />
                                                </td>
                                            )}
                                            <td className="px-2 py-4.5 align-middle text-center">
                                                <input
                                                    type="number" min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                    className="w-full bg-slate-50 dark:bg-slate-800/40 text-center text-slate-700 dark:text-slate-200 outline-none border border-slate-200/60 dark:border-slate-800 focus:border-orange-500 focus:ring-0 font-semibold rounded-xl transition-all text-xs px-2 py-1.5"
                                                />
                                            </td>
                                            <td className="px-2 py-4.5 align-middle text-center print:text-xs">
                                                <div className="flex items-center justify-center gap-1.5 print:hidden">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="any"
                                                        value={daysKmNum}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value);
                                                            const newNum = isNaN(val) ? 0 : val;
                                                            handleItemChange(index, 'total_days_km', `${newNum} ${daysKmUnit}`);
                                                        }}
                                                        className="w-14 bg-slate-50 dark:bg-slate-800/40 text-center text-slate-700 dark:text-slate-200 outline-none border border-slate-200/60 dark:border-slate-800 focus:border-orange-500 focus:ring-0 font-semibold rounded-xl transition-all text-xs px-1.5 py-1.5"
                                                    />
                                                    <select
                                                        value={daysKmUnit}
                                                        onChange={(e) => {
                                                            handleItemChange(index, 'total_days_km', `${daysKmNum} ${e.target.value}`);
                                                        }}
                                                        className="bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-200 outline-none border border-slate-200/60 dark:border-slate-800 focus:border-orange-500 focus:ring-0 font-semibold rounded-xl transition-all text-xs py-1.5 px-1 cursor-pointer dark:bg-slate-900"
                                                    >
                                                        <option value="Days">Days</option>
                                                        <option value="Km">Km</option>
                                                    </select>
                                                </div>
                                                <span className="hidden print:inline font-semibold">
                                                    {item.total_days_km || '1'}
                                                </span>
                                            </td>
                                            <td className="px-2 py-4.5 align-middle text-right">
                                                <input
                                                    type="number" min="0"
                                                    value={item.unit_price}
                                                    onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                                    className="w-full bg-slate-50 dark:bg-slate-800/40 text-right text-slate-700 dark:text-slate-200 outline-none border border-slate-200/60 dark:border-slate-800 focus:border-orange-500 focus:ring-0 font-semibold rounded-xl transition-all text-xs px-2.5 py-1.5"
                                                />
                                            </td>
                                            {docData.is_gst === 1 && (
                                                <td className="px-2 py-4.5 align-middle text-right">
                                                    <select
                                                        value={item.tax_rate || 0}
                                                        onChange={(e) => handleItemChange(index, 'tax_rate', parseFloat(e.target.value) || 0)}
                                                        className="w-full bg-slate-50 dark:bg-slate-800/40 text-right text-slate-700 dark:text-slate-200 outline-none border border-slate-200/60 dark:border-slate-800 focus:border-orange-500 focus:ring-0 font-semibold rounded-xl transition-all text-xs py-1.5 px-2 dark:bg-slate-900 cursor-pointer"
                                                    >
                                                        <option value="0">0%</option>
                                                        <option value="5">5%</option>
                                                        <option value="12">12%</option>
                                                        <option value="18">18%</option>
                                                        <option value="28">28%</option>
                                                    </select>
                                                </td>
                                            )}
                                            <td className="px-4 py-4.5 align-middle text-right text-[#091C3B] dark:text-white tabular-nums font-bold text-xs">
                                                ₹{(parseDaysKm(item.total_days_km) * Number(item.unit_price || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-0 align-middle print:hidden w-8">
                                                <button onClick={() => removeItem(index)} className="p-2.5 text-slate-300 hover:text-red-500 hover:scale-105 active:scale-95 opacity-0 group-hover:opacity-100 transition-all mt-1">
                                                    <Trash2 size={13} />
                                                </button>
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>

                        
                        {/* Add Item Actions (Hidden in print) */}
                        <div className="flex gap-2 print:hidden mt-2">
                            <button onClick={addItem} className="text-[#F26222] hover:text-orange-700 hover:scale-[1.02] active:scale-95 flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/20 rounded-xl border border-orange-100/50 dark:border-orange-500/20 transition-all">
                                <Plus size={13} /> Add Row
                            </button>
                            <button onClick={() => { setShowCatalogPanel(true); searchCatalog(); }} className="text-slate-700 dark:text-slate-200 hover:scale-[1.02] active:scale-95 flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 rounded-xl border border-slate-200/50 dark:border-slate-700/80 transition-all">
                                <Search size={13} /> From Catalog
                            </button>
                        </div>

                        {/* Totals Section */}
                        <div className="flex flex-col lg:flex-row items-stretch justify-between gap-8 pt-8 border-t border-slate-100 dark:border-slate-800/80">
                            
                            {/* Left Side: Bank Details + Words */}
                            <div className="w-full lg:w-[45%] flex flex-col gap-6">
                                <div>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest mb-1.5">Total (In Words)</p>
                                    <p className="text-xs text-[#091C3B] dark:text-slate-200 font-bold bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20 dark:border-orange-500/30 rounded-2xl px-4 py-3 leading-relaxed shadow-inner">
                                        {numberToWords(totalAmount)}
                                    </p>                                </div>
                                
                                <div className="bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/80 transition-colors" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                    <h4 className="text-xs font-bold text-[#F26222] uppercase tracking-wider mb-4">Bank Details</h4>
                                    <div className="grid grid-cols-[120px_1fr] gap-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                                        <span className="font-semibold text-slate-400 dark:text-slate-500">Account Name</span>
                                        <span className="font-medium text-slate-800 dark:text-slate-200">{fi.bankAccountName || 'SHRAWELLO TRAVELHUB AND EVENTS LLP'}</span>
                                        
                                        <span className="font-semibold text-slate-400 dark:text-slate-500">Account Number</span>
                                        <span className="font-bold text-slate-850 dark:text-slate-100 font-mono tracking-wide">{fi.bankAccountNumber || '4054789256'}</span>
                                        
                                        <span className="font-semibold text-slate-400 dark:text-slate-500">IFSC</span>
                                        <span className="font-bold text-slate-850 dark:text-slate-100 font-mono tracking-wide">{fi.bankIfsc || 'KKBK0002119'}</span>
                                        
                                        <span className="font-semibold text-slate-400 dark:text-slate-500">Account Type</span>
                                        <span className="font-medium text-slate-850 dark:text-slate-200">Current</span>
                                        
                                        <span className="font-semibold text-slate-400 dark:text-slate-500">Bank</span>
                                        <span className="font-medium text-slate-850 dark:text-slate-200">{fi.bankName || 'KOTAK MAHINDRA BANK'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Middle Side: UPI QR */}
                            <div className="w-full lg:w-[20%] flex flex-col items-center justify-center py-6 border-y lg:border-y-0 lg:border-x border-slate-100 dark:border-slate-800/80">
                                <p className="text-[10px] font-extrabold text-[#091C3B] dark:text-white uppercase tracking-widest mb-1">SCAN VIA UPI</p>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 text-center mb-3.5 leading-tight">Transfer up to 1 Lakh per day</p>
                                <div className="p-2.5 bg-white dark:bg-white rounded-2xl border border-slate-200/50 dark:border-slate-700 shadow-sm transition-transform duration-300 hover:scale-105">
                                    {fi.upiQrImage ? (
                                        <img src={fi.upiQrImage} alt="UPI QR" className="w-24 h-24 mix-blend-multiply object-contain" />
                                    ) : fi.upiId ? (
                                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=upi://pay?pa=${fi.upiId}&pn=${encodeURIComponent(co.companyName || 'SHRAWELLO')}&am=${Math.max(0, balanceDue).toFixed(2)}&cu=INR`} alt="UPI QR" className="w-24 h-24 mix-blend-multiply" />
                                    ) : (
                                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=upi://pay?pa=shravyatours23@okicici&pn=SHRAWELLO&am=${Math.max(0, balanceDue).toFixed(2)}&cu=INR`} alt="UPI QR" className="w-24 h-24 mix-blend-multiply" />
                                    )}
                                </div>
                                <p className="text-[10px] font-bold text-[#F26222] mt-3.5 tracking-wide bg-orange-50 dark:bg-orange-500/10 px-2.5 py-0.5 rounded-full">
                                    {fi.upiId || 'shravyatours23@okicici'}
                                </p>
                            </div>

                            {/* Right Side: Calculations Receipt Drawer */}
                            <div className="w-full lg:w-[32%] text-xs text-slate-600 dark:text-slate-300">
                                <div className="bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/80 transition-colors">
                                    <div className="space-y-3.5 pb-4.5">
                                        {/* ── Helper: Editable Fixed Label Row ─────────────── */}
                                        {(
                                            [
                                                { key: 'driver_stay_allowance', defaultLabel: 'Driver Stay Allowance', valueKey: 'driver_stay_allowance' },
                                                { key: 'extra_km_charges', defaultLabel: 'Extra Km Charges', valueKey: 'extra_km_charges' },
                                                { key: 'extra_hrs_charges', defaultLabel: 'Extra Hrs. Charges', valueKey: 'extra_hrs_charges' },
                                                // NOTE: 'advance_received' is intentionally excluded here.
                                                // It is rendered separately below with a non-editable label.
                                            ] as const
                                        ).map(({ key, defaultLabel, valueKey }) => (
                                            <div key={key} className="flex justify-between items-center group">
                                                {/* Editable label */}
                                                <div className="flex items-center gap-1 flex-1 min-w-0 mr-2">
                                                    {editingLabel === key ? (
                                                        <input
                                                            type="text"
                                                            autoFocus
                                                            value={fieldLabels[key] ?? defaultLabel}
                                                            onChange={e => setFieldLabels(prev => ({ ...prev, [key]: e.target.value }))}
                                                            onBlur={() => setEditingLabel(null)}
                                                            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingLabel(null); }}
                                                            className="flex-1 min-w-0 text-xs font-semibold bg-orange-50 dark:bg-orange-500/10 border border-orange-400 rounded px-1.5 py-0.5 outline-none text-orange-700 dark:text-orange-300"
                                                        />
                                                    ) : (
                                                        <>
                                                            <span className="font-semibold text-slate-500 dark:text-slate-400 truncate">
                                                                {fieldLabels[key] || defaultLabel}:
                                                            </span>
                                                            <button
                                                                type="button"
                                                                title="Rename label"
                                                                onClick={() => setEditingLabel(key)}
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-orange-500 ml-1 flex-shrink-0 print:hidden"
                                                            >
                                                                <Edit3 size={10} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-end flex-shrink-0 print:text-xs">
                                                    <input
                                                        type="number" min="0"
                                                        value={(docData as any)[valueKey] || 0}
                                                        onChange={e => setDocData({ ...docData, [valueKey]: parseFloat(e.target.value) || 0 })}
                                                        className="w-24 text-right bg-slate-50 dark:bg-slate-800/40 outline-none border border-slate-200/60 dark:border-slate-800 focus:border-orange-500 focus:ring-0 font-bold rounded-lg px-2 py-1 transition-all text-xs focus:bg-white dark:focus:bg-slate-900 print:hidden text-slate-800 dark:text-slate-100"
                                                    />
                                                    <span className="hidden print:inline-block tabular-nums font-bold">₹{Number((docData as any)[valueKey] || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>
                                        ))}

                                        {/* ── Advance Received: label is fixed/non-editable, only amount is editable ── */}
                                        <div className="flex justify-between items-center">
                                            {/* Static non-editable label */}
                                            <div className="flex items-center flex-1 min-w-0 mr-2">
                                                <span className="font-semibold text-slate-500 dark:text-slate-400 truncate select-none">
                                                    {fieldLabels['advance_received'] || 'Advance Received'}:
                                                </span>
                                            </div>
                                            {/* Only the amount is editable */}
                                            <div className="flex items-center justify-end flex-shrink-0 print:text-xs">
                                                <input
                                                    type="number" min="0"
                                                    value={docData.advance_received || 0}
                                                    onChange={e => setDocData({ ...docData, advance_received: parseFloat(e.target.value) || 0 })}
                                                    className="w-24 text-right bg-slate-50 dark:bg-slate-800/40 outline-none border border-slate-200/60 dark:border-slate-800 focus:border-orange-500 focus:ring-0 font-bold rounded-lg px-2 py-1 transition-all text-xs focus:bg-white dark:focus:bg-slate-900 print:hidden text-slate-800 dark:text-slate-100"
                                                />
                                                <span className="hidden print:inline-block tabular-nums font-bold">₹{Number(docData.advance_received || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>

                                        {/* ── Discount row: label is fixed/non-editable, only amount is editable ── */}
                                        <div className="flex justify-between items-center">
                                            {/* Static non-editable label */}
                                            <div className="flex items-center flex-1 min-w-0 mr-2">
                                                <span className="font-semibold text-slate-500 dark:text-slate-400 truncate select-none">
                                                    {fieldLabels['discount'] || 'Discount Amount'}:
                                                </span>
                                            </div>
                                            {/* Only the amount is editable */}
                                            <div className="flex items-center justify-end flex-shrink-0 print:text-xs">
                                                <input
                                                    type="number" min="0"
                                                    value={discount}
                                                    onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                                                    className="w-24 text-right bg-slate-50 dark:bg-slate-800/40 outline-none border border-slate-200/60 dark:border-slate-800 focus:border-orange-500 focus:ring-0 font-bold rounded-lg px-2 py-1 transition-all text-xs focus:bg-white dark:focus:bg-slate-900 print:hidden text-[#2D6A4F] dark:text-emerald-400"
                                                />
                                                <span className="hidden print:inline-block tabular-nums text-slate-500 font-bold">(₹{discountAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })})</span>
                                            </div>
                                        </div>

                                        {/* ── Custom Extra Fields ──────────────────────────── */}
                                        {customFields.map((cf, idx) => (
                                            <div key={cf.id} className="flex items-center gap-1.5 group animate-[fadeIn_0.2s_ease]">
                                                {/* Label input */}
                                                <input
                                                    type="text"
                                                    placeholder="Field name…"
                                                    value={cf.label}
                                                    onChange={e => updateCustomField(idx, { label: e.target.value })}
                                                    className="flex-1 min-w-0 text-xs font-semibold bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 rounded-lg px-2.5 py-1 outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:bg-white dark:focus:bg-slate-900 focus:border-orange-500 focus:ring-0 transition-all print:hidden"
                                                />
                                                {/* Amount input */}
                                                <input
                                                    type="number" min="0"
                                                    value={cf.amount}
                                                    onChange={e => updateCustomField(idx, { amount: parseFloat(e.target.value) || 0 })}
                                                    className="w-24 text-right bg-slate-50 dark:bg-slate-800/40 outline-none border border-slate-200/60 dark:border-slate-800 focus:border-orange-500 focus:ring-0 font-bold rounded-lg px-2 py-1 transition-all text-xs focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100 print:hidden"
                                                />
                                                {/* +/- toggle */}
                                                <button
                                                    type="button"
                                                    title={cf.is_deduction ? 'Deduction (click to make charge)' : 'Charge (click to make deduction)'}
                                                    onClick={() => updateCustomField(idx, { is_deduction: !cf.is_deduction })}
                                                    className={`flex-shrink-0 w-6 h-6 rounded-full text-[10px] font-black border transition-all print:hidden ${cf.is_deduction ? 'bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/40 text-red-600 dark:text-red-400' : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400'}`}
                                                >
                                                    {cf.is_deduction ? '−' : '+'}
                                                </button>
                                                {/* Delete */}
                                                <button
                                                    type="button"
                                                    onClick={() => removeCustomField(idx)}
                                                    className="flex-shrink-0 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 print:hidden"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                                {/* Print display */}
                                                <span className="hidden print:inline-block tabular-nums font-bold text-xs">
                                                    {cf.is_deduction ? '−' : '+'} ₹{Number(cf.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={addCustomField}
                                            className="flex items-center gap-1.5 text-[10px] font-bold text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 bg-orange-50 dark:bg-orange-500/10 border border-dashed border-orange-300 dark:border-orange-500/30 rounded-xl px-3 py-1.5 mt-1 transition-all hover:border-orange-400 dark:hover:border-orange-400 print:hidden w-full justify-center"
                                        >
                                            <Plus size={10} /> Add Custom Field
                                        </button>

                                        {/* Subtotal + Tax read-only rows */}
                                        <div className="flex justify-between items-center border-t border-slate-200/50 dark:border-slate-800/80 pt-2 text-[10px] text-slate-400">
                                            <span>Subtotal (Base Items):</span>
                                            <span className="tabular-nums font-medium">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        {docData.is_gst === 1 && taxTotal > 0 ? (
                                            docData.gst_type === 'IGST' ? (
                                                <div className="flex justify-between items-center text-[10px] text-slate-400">
                                                    <span>IGST Total{igstRatesStr}:</span>
                                                    <span className="tabular-nums font-medium">₹{taxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                                                        <span>CGST Total{cgstSgstRatesStr}:</span>
                                                        <span className="tabular-nums font-medium">₹{(taxTotal / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                                                        <span>SGST Total{cgstSgstRatesStr}:</span>
                                                        <span className="tabular-nums font-medium">₹{(taxTotal / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                </>
                                            )
                                        ) : (
                                            taxTotal > 0 && (
                                                <div className="flex justify-between items-center text-[10px] text-slate-400">
                                                    <span>Tax Total:</span>
                                                    <span className="tabular-nums font-medium">₹{taxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            )
                                        )}
                                    </div>
                                    
                                    <div className="border-t border-slate-350 dark:border-slate-700/80 pt-3 flex justify-between items-center mb-4" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                        <span className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">Net Amount</span>
                                        <span className="text-lg font-black text-[#F26222] tabular-nums">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    
                                    {/* Live Payment Progress indicator */}
                                    <div className="space-y-3 pt-3.5 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/15 dark:border-emerald-500/20 rounded-2xl p-4 transition-colors">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex justify-between items-center text-slate-700 dark:text-slate-200">
                                                <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Amount Paid</span>
                                                <select
                                                    value={docData.payment_status}
                                                    onChange={e => setDocData({...docData, payment_status: e.target.value})}
                                                    className="bg-transparent border border-emerald-500/20 rounded-lg px-2 py-0.5 outline-none print:hidden text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold cursor-pointer dark:bg-slate-900 focus:border-emerald-500"
                                                >
                                                    <option value="Unpaid">Unpaid</option>
                                                    <option value="Partially Paid">Part Paid</option>
                                                    <option value="Paid">Paid</option>
                                                </select>
                                            </div>
                                            <div className="flex justify-end items-center mt-1">
                                                <input
                                                    type="number" min="0"
                                                    value={docData.amount_paid || 0}
                                                    onChange={e => setDocData({...docData, amount_paid: parseFloat(e.target.value) || 0})}
                                                    className="w-full text-right bg-emerald-600/10 dark:bg-emerald-500/10 outline-none border border-emerald-500/20 focus:border-emerald-500 focus:ring-0 font-black rounded-lg px-2.5 py-1.5 transition-all text-xs focus:bg-white dark:focus:bg-slate-900 text-emerald-600 dark:text-emerald-400 print:hidden"
                                                />
                                                <span className="hidden print:inline-block tabular-nums font-bold text-emerald-600 dark:text-emerald-400">₹{(docData.amount_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>

                                        {/* Percentage progress bar */}
                                        {totalAmount > 0 && (
                                            <div className="pt-1 select-none">
                                                {(() => {
                                                    const percentPaid = Math.min(100, Math.max(0, ((Number(docData.amount_paid || 0) + advanceReceived) / totalAmount) * 100));
                                                    return (
                                                        <>
                                                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                                                <div 
                                                                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500" 
                                                                    style={{ width: `${percentPaid}%` }} 
                                                                />
                                                            </div>
                                                            <div className="flex justify-between items-center text-[8px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider mt-1.5">
                                                                <span>Paid: {Math.round(percentPaid)}%</span>
                                                                <span>Due: ₹{Math.max(0, balanceDue).toLocaleString('en-IN')}</span>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center font-bold text-slate-800 dark:text-slate-200 border-t border-slate-200/50 dark:border-slate-800/80 pt-2.5 text-[10px]">
                                            <span className="uppercase tracking-wider">Due Balance</span>
                                            <span className="tabular-nums font-black text-slate-900 dark:text-white">₹{Math.max(0, balanceDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Signature */}
                        <div className="pt-24 flex justify-end">
                            <div className="text-center">
                                {co.companyName ? (
                                    <div className="font-cursive text-3xl text-[#091C3B] mb-1 animate-pulse" style={{ fontFamily: "'Dancing Script', cursive" }}>{co.companyName}</div>
                                ) : (
                                    <div className="font-cursive text-4xl text-[#091C3B] mb-1" style={{ fontFamily: "'Dancing Script', cursive" }}>Shrawello</div>
                                )}
                                <p className="text-sm text-slate-400">This is a system-generated invoice</p>
                            </div>
                        </div>

                        {/* Page Footer (Print Only) */}
                        <div className="hidden print:flex justify-between items-center pt-6 mt-12 border-t border-slate-300 border-dashed text-[10px] text-slate-500">
                            <div className="grid grid-cols-[100px_1fr]">
                                <span className="font-medium">Invoice No</span>
                                <span className="font-bold text-[#091C3B]">{id ? `${fi.invoicePrefix || 'INV'}-${id.slice(0,6).toUpperCase()}` : 'DRAFT'}</span>
                            </div>
                            <div className="grid grid-cols-[100px_1fr]">
                                <span className="font-medium">Invoice Date</span>
                                <span className="font-bold text-[#091C3B]">{new Date(docData.issue_date || new Date()).toLocaleDateString('en-US', {day:'2-digit', month:'short', year:'numeric'})}</span>
                            </div>
                            <div className="grid grid-cols-[80px_1fr]">
                                <span className="font-medium">Billed To</span>
                                <span className="font-bold text-[#091C3B]">{docData.client_name || 'Client'}</span>
                            </div>
                            <div className="font-medium">
                                Page 1 of 2
                            </div>
                        </div>
                    </div>
                </div>

                {/* Page 2: Terms and Conditions */}
                <div className="mt-6 bg-white rounded-2xl shadow-[0_4px_32px_rgba(0,0,0,0.08)] border border-slate-200/70 overflow-hidden relative print:mt-[100px] print:shadow-none print:border-none print:break-before-page">
                    <div className="px-8 py-10 space-y-4">
                        {/* Header row: title + template selector */}
                        <div className="flex items-center justify-between print:hidden">
                            <h3 className="text-base font-bold text-[#F26222] uppercase tracking-wide flex items-center gap-2">
                                <FileText size={15} className="text-[#F26222]" />
                                Terms and Conditions
                            </h3>

                            {/* Template selector dropdown */}
                            <div className="flex items-center gap-2">
                                {masterTermsTemplates.filter(t => t.status === 'Active').length > 0 ? (
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setTermsDropdownOpen(v => !v)}
                                            className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 text-orange-600 dark:text-orange-400 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-all hover:scale-[1.02] active:scale-95"
                                        >
                                            <FileText size={11} />
                                            Load Template
                                            <ChevronDown size={11} className={`transition-transform duration-200 ${termsDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {termsDropdownOpen && (
                                            <>
                                                {/* Backdrop */}
                                                <div className="fixed inset-0 z-40" onClick={() => setTermsDropdownOpen(false)} />
                                                {/* Dropdown panel */}
                                                <div className="absolute left-auto right-0 top-full mt-2 w-80 max-w-[calc(100vw-40px)] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-[scaleIn_0.15s_ease-out]">
                                                    <div className="px-4 py-3 border-b border-slate-200/50 dark:border-slate-800 bg-white dark:bg-slate-950">
                                                        <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Select Templates</p>
                                                        <p className="text-[10px] text-slate-400 mt-0.5">Toggle multiple templates to append or remove them.</p>
                                                    </div>
                                                    <div className="max-h-64 overflow-y-auto p-3 space-y-4">
                                                        {/* Group by category */}
                                                        {Array.from(new Set(masterTermsTemplates.filter(t => t.status === 'Active').map(t => t.category))).map(cat => (
                                                            <div key={cat} className="space-y-1.5">
                                                                <p className="px-1 text-[9px] font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-widest">{cat}</p>
                                                                <div className="space-y-2">
                                                                    {masterTermsTemplates
                                                                        .filter(t => t.status === 'Active' && t.category === cat)
                                                                        .map(tmpl => {
                                                                            const tmplTitle = tmpl.name || tmpl.title || 'Untitled Template';
                                                                            const cleanContent = cleanHtmlToPlainText(tmpl.content);
                                                                            const isChecked = (docData.notes || '').includes(cleanContent);
                                                                            return (
                                                                                <button
                                                                                    key={tmpl.id}
                                                                                    type="button"
                                                                                    onClick={() => handleToggleTemplate(tmpl.content, tmplTitle)}
                                                                                    className={`w-full text-left p-3 text-xs rounded-xl flex items-start gap-3 transition-all border ${
                                                                                        isChecked
                                                                                            ? 'bg-orange-500/[0.03] border-orange-500/30 text-slate-800 dark:text-slate-100 shadow-sm'
                                                                                            : 'bg-white dark:bg-slate-800/80 border-slate-100 dark:border-slate-850 text-slate-600 dark:text-slate-300 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850'
                                                                                    }`}
                                                                                >
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={isChecked}
                                                                                        onChange={() => {}} // handled by button click
                                                                                        className="rounded border-slate-350 text-orange-500 focus:ring-orange-500 h-3.5 w-3.5 cursor-pointer dark:bg-slate-900 dark:border-slate-700 flex-shrink-0 mt-0.5"
                                                                                    />
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <p className="font-bold leading-tight">{tmplTitle}</p>
                                                                                        {tmpl.isDefault && (
                                                                                            <span className="inline-block text-[8px] bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded-full font-bold mt-1">Default</span>
                                                                                        )}
                                                                                    </div>
                                                                                </button>
                                                                            );
                                                                        })
                                                                    }
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {/* Footer: link to Masters */}
                                                    <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => { setTermsDropdownOpen(false); navigate('/admin/masters?tab=terms'); }}
                                                            className="text-[10px] font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1.5 transition-colors"
                                                        >
                                                            <Plus size={10} /> Manage Templates in Masters
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => navigate('/admin/masters?tab=terms')}
                                        className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 border border-dashed border-orange-300 dark:border-orange-500/30 text-orange-500 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-all"
                                    >
                                        <Plus size={11} /> Add T&amp;C Templates in Masters
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Print-only heading */}
                        <h3 className="hidden print:block text-base font-bold text-[#F26222] uppercase tracking-wide">Terms and Conditions</h3>

                        <div className="text-sm text-slate-800 space-y-2">
                            <textarea
                                value={docData.notes || "1. Please pay within 3 days from the date of invoice, overdue interest @ 14% will be charged on delayed payments.\n2. Additional 5% charges applicable for Credit card payments.\n3. Additional 1200/- Night charges applicable if trip ends after 11:45PM.\n4. For Outstation trips more than 1 day, driver stay allowance is applicable as per category of city."}
                                onChange={(e) => setDocData({ ...docData, notes: e.target.value })}
                                rows={6}
                                className="w-full bg-transparent outline-none resize-y leading-relaxed text-sm font-medium focus:border-b focus:border-orange-300"
                            />
                        </div>
                        <div className="pt-8 text-center text-sm text-slate-500">
                            <p>For any enquiry, reach out via email at <span className="font-bold text-[#091C3B]">{co.email || 'hello@shrawello.com'}</span>, call on <span className="font-bold text-[#091C3B]">{co.phone || '+91 80109 55675'}</span></p>
                        </div>
                        
                        {/* Page 2 Footer */}
                        <div className="hidden print:flex justify-between items-center pt-8 mt-[800px] border-t border-slate-300 border-dashed text-[10px] text-slate-500 absolute bottom-8 left-8 right-8">
                            <div className="grid grid-cols-[100px_1fr]">
                                <span className="font-medium">Invoice No</span>
                                <span className="font-bold text-[#091C3B]">{id ? `${fi.invoicePrefix || 'INV'}-${id.slice(0,6).toUpperCase()}` : 'DRAFT'}</span>
                            </div>
                            <div className="grid grid-cols-[100px_1fr]">
                                <span className="font-medium">Invoice Date</span>
                                <span className="font-bold text-[#091C3B]">{new Date(docData.issue_date || new Date()).toLocaleDateString('en-US', {day:'2-digit', month:'short', year:'numeric'})}</span>
                            </div>
                            <div className="grid grid-cols-[80px_1fr]">
                                <span className="font-medium">Billed To</span>
                                <span className="font-bold text-[#091C3B]">{docData.client_name || 'Client'}</span>
                            </div>
                            <div className="font-medium">
                                Page 2 of 2
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
