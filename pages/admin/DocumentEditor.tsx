import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Save, ArrowLeft, Plus, Trash2, CheckCircle2, Printer, CreditCard, User, Mail, MapPin, Calendar, Users, FileCheck, ChevronDown, Loader2, Search, Link, Copy, Edit3, X, Check, FileText, ChevronRight, AlertCircle, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '../../context/SettingsContext';
import { useData } from '../../context/DataContext';

import { generateTrueInvoicePDF } from '../../utils/pdfGenerator';
import { parsePaxString } from '../../utils/paxUtils';
import { formatTripDuration } from '../../utils/packageUtils';
import { INDIAN_GST_STATES, isValidGstin, getStateFromGstin, getIndianFinancialYear } from '../../utils/gstUtils';

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
    const paramOriginalId = searchParams.get('original_id') || '';
    const paramOriginalNo = searchParams.get('original_no') || '';
    const paramType = searchParams.get('type') || (paramOriginalId ? 'CreditNote' : 'Invoice');

    const isEdit = Boolean(id);

    const [docData, setDocData] = useState<any>({
        document_type: paramType,
        is_gst: 1,
        client_gst: '',
        gst_type: 'CGST_SGST',
        place_of_supply: fi.defaultPlaceOfSupply || 'Maharashtra',
        place_of_supply_code: fi.defaultPlaceOfSupplyCode || '27',
        reverse_charge: fi.defaultReverseCharge || 'No',
        invoice_no: '',
        financial_year: '',
        sequence_number: 0,
        is_locked: 0,
        original_invoice_id: paramOriginalId,
        original_invoice_no: paramOriginalNo,
        credit_reason: 'Cancellation / Revision',
        copy_type: 'ORIGINAL FOR RECIPIENT',
        client_name: '',
        email: '',
        phone: '',
        address: '',
        travel_dates: '',
        travel_date_from: '',
        travel_date_to: '',
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

    const [nextSequencePreview, setNextSequencePreview] = useState<string>('');
    const [previewLoading, setPreviewLoading] = useState(false);

    const fetchNextPreview = async (docType: string, dateStr?: string) => {
        if (docData.invoice_no && isEdit) return; // Already has official number
        setPreviewLoading(true);
        try {
            const token = localStorage.getItem('shravya_jwt') || localStorage.getItem('token');
            let pfx = fi.invoicePrefix || 'ST';
            if (docType === 'Proforma') pfx = fi.proformaPrefix || 'PI';
            else if (docType === 'Quotation') pfx = fi.quotePrefix || 'QT';
            else if (docType === 'CreditNote') pfx = fi.creditNotePrefix || 'CN';
            else if (docType === 'Receipt') pfx = fi.receiptPrefix || 'RC';

            const dt = dateStr || docData.issue_date || new Date().toISOString();
            const res = await fetch(`/api/invoices/next-preview?doc_type=${encodeURIComponent(docType)}&date=${encodeURIComponent(dt)}&prefix=${encodeURIComponent(pfx)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const json = await res.json();
                setNextSequencePreview(json.nextNumber || '');
            }
        } catch (e) {
            console.error('Failed to preview next sequence:', e);
        } finally {
            setPreviewLoading(false);
        }
    };

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
    const [searchType, setSearchType] = useState('all');
    const [searching, setSearching] = useState(false);
    const [searchHasRun, setSearchHasRun] = useState(false);

    useEffect(() => {
        if (showLinkPanel) {
            searchRecords(searchType, searchQuery);
        }
    }, [showLinkPanel, searchType]);

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
            description: `${pkg.title}\nDestination: ${pkg.destination}\nDuration: ${formatTripDuration({ nights: pkg.nights, days: pkg.days })}`,
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
            if (paramOriginalId) prefillFromOriginalInvoice(paramOriginalId);
            else if (paramBookingId) prefillFromBooking(paramBookingId);
            else if (paramLeadId) prefillFromLead(paramLeadId);
            else if (paramCustomerId) prefillFromCustomer(paramCustomerId);
            else {
                // Fix #11 — Check for itinerary quick-create payload from StepReview
                const itineraryPrefill = sessionStorage.getItem('invoice_quick_create');
                if (itineraryPrefill) {
                    try {
                        const p = JSON.parse(itineraryPrefill);
                        sessionStorage.removeItem('invoice_quick_create');
                        setDocData((prev: any) => ({
                            ...prev,
                            client_name: p.clientName || '',
                            travel_dates: p.startDate || '',
                            travel_date_from: p.startDate || '',
                            travel_date_to: p.endDate || '',
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

    useEffect(() => {
        if (!isEdit || !docData.invoice_no) {
            fetchNextPreview(docData.document_type, docData.issue_date);
        }
    }, [docData.document_type, docData.issue_date, isEdit]);

    const prefillFromOriginalInvoice = async (origId: string) => {
        try {
            const token = (localStorage.getItem('shravya_jwt') || localStorage.getItem('token'));
            const res = await fetch(`/api/crud/invoices/${origId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const { data } = await res.json();
                setDocData((prev: any) => ({
                    ...prev,
                    document_type: 'CreditNote',
                    original_invoice_id: origId,
                    original_invoice_no: data.invoice_no || (data.id ? `ST-${data.id.slice(0, 6).toUpperCase()}` : ''),
                    client_name: data.client_name || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    address: data.address || '',
                    is_gst: data.is_gst !== undefined ? data.is_gst : 1,
                    client_gst: data.client_gst || '',
                    gst_type: data.gst_type || 'CGST_SGST',
                    place_of_supply: data.place_of_supply || prev.place_of_supply,
                    place_of_supply_code: data.place_of_supply_code || prev.place_of_supply_code,
                    reverse_charge: data.reverse_charge || 'No',
                    credit_reason: 'Cancellation / Revision',
                    booking_id: data.booking_id || null,
                    lead_id: data.lead_id || null,
                    customer_id: data.customer_id || null
                }));

                const itemsRes = await fetch(`/api/crud/invoice_items?eq_invoice_id=${origId}`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (itemsRes.ok) {
                    const itemsData = await itemsRes.json();
                    if (itemsData.data && itemsData.data.length > 0) {
                        setItems(itemsData.data.map((it: any) => ({
                            id: 'temp-' + generateId(),
                            description: `Credit Adjustment for: ${it.description || 'Tour Package'}`,
                            quantity: it.quantity || 1,
                            total_days_km: it.total_days_km || '1',
                            unit_price: Number(it.unit_price || 0),
                            tax_rate: Number(it.tax_rate || 0),
                            hsn_sac: it.hsn_sac || '9985'
                        })));
                    }
                }
            }
        } catch (e) {
            console.error('Failed to prefill from original invoice:', e);
        } finally {
            setLoading(false);
        }
    };

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
                const pax = parsePaxString(data.pax_adult || data.guests || data.number_of_people);
                setDocData(prev => ({
                    ...prev,
                    client_name: data.customer_name || data.customer || '',
                    email: data.customer_email || data.email || '',
                    // Fix: bookings stores phone as customer_phone, address as residential_address
                    phone: data.customer_phone || data.phone || prev.phone || '',
                    address: data.residential_address || data.address || prev.address || '',
                    travel_dates: data.booking_date || data.date ? new Date(data.booking_date || data.date).toISOString().split('T')[0] : '',
                    travel_date_from: data.start_date ? new Date(data.start_date).toISOString().split('T')[0] : (data.booking_date ? new Date(data.booking_date).toISOString().split('T')[0] : ''),
                    travel_date_to: data.end_date ? new Date(data.end_date).toISOString().split('T')[0] : '',
                    adults: data.pax_adult || data.number_of_people || pax.adults,
                    children: data.pax_child !== undefined && data.pax_child !== null ? Number(data.pax_child) : pax.children
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
                const pax = parsePaxString(data.pax_adult || data.travelers);
                setDocData(prev => ({
                    ...prev,
                    client_name: data.name || '',
                    email: data.email || '',
                    // Fix: leads stores phone as `phone`; no address/GSTIN on leads
                    phone: data.phone || prev.phone || '',
                    adults: data.pax_adult || pax.adults,
                    children: data.pax_child !== undefined && data.pax_child !== null ? Number(data.pax_child) : pax.children,
                    travel_dates: data.start_date || data.travelDate ? new Date(data.start_date || data.travelDate).toISOString().split('T')[0] : '',
                    travel_date_from: data.start_date ? new Date(data.start_date).toISOString().split('T')[0] : (data.travelDate ? new Date(data.travelDate).toISOString().split('T')[0] : ''),
                    travel_date_to: data.end_date ? new Date(data.end_date).toISOString().split('T')[0] : '',
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
            const res = await fetch(`/api/crud/invoices/${id}`, { 
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-store'
            });
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
                const itemsRes = await fetch(`/api/crud/invoice_items?eq_invoice_id=${id}`, { 
                    headers: { 'Authorization': `Bearer ${token}` },
                    cache: 'no-store'
                });
                if (itemsRes.ok) {
                    const itemsData = await itemsRes.json();
                    if (itemsData.data && itemsData.data.length > 0) {
                        setItems(itemsData.data);
                    }
                }

                // Load custom extra charge fields
                const cfRes = await fetch(`/api/crud/invoice_custom_fields?eq_invoice_id=${id}`, { 
                    headers: { 'Authorization': `Bearer ${token}` },
                    cache: 'no-store'
                });
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
        const t = type !== undefined ? type : searchType;
        setSearching(true);
        setSearchHasRun(true);
        try {
            const token = (localStorage.getItem('shravya_jwt') || localStorage.getItem('token'));
            const res = await fetch(`/api/invoices/link-search?q=${encodeURIComponent(q)}&type=${encodeURIComponent(t)}&limit=50`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const { data } = await res.json();
                setSearchResults(data || []);
            } else {
                setSearchResults([]);
            }
        } catch (e) { 
            console.error('Customer Link Search Error:', e);
            setSearchResults([]);
        } finally { 
            setSearching(false); 
        }
    };

    const linkRecord = (record: any) => {
        setDocData(prev => {
            const updated: any = {
                ...prev,
                booking_id: record.booking_id || null,
                lead_id: record.lead_id || null,
                customer_id: record.customer_id || (record.source_type === 'customer' ? record.id : prev.customer_id),
                client_name: record.client_name || prev.client_name || '',
                email: record.email || prev.email || '',
                phone: record.phone || prev.phone || '',
                address: record.address || prev.address || '',
                travel_dates: record.start_date ? new Date(record.start_date).toISOString().split('T')[0] : prev.travel_dates,
                travel_date_from: record.start_date ? new Date(record.start_date).toISOString().split('T')[0] : prev.travel_date_from,
                travel_date_to: record.end_date ? new Date(record.end_date).toISOString().split('T')[0] : prev.travel_date_to,
                adults: record.adults || prev.adults,
                children: record.children !== undefined ? record.children : prev.children
            };

            // If customer has a GSTIN, auto-populate & set up Place of Supply & Tax Mode
            if (record.gstin && record.gstin.trim().length >= 2) {
                updated.is_gst = 1;
                updated.client_gst = record.gstin.trim().toUpperCase();
                const detectedState = getStateFromGstin(record.gstin);
                if (detectedState) {
                    updated.place_of_supply = detectedState.name;
                    updated.place_of_supply_code = detectedState.code;
                    const myStateCode = fi.defaultPlaceOfSupplyCode || '27';
                    updated.gst_type = detectedState.code === myStateCode ? 'CGST_SGST' : 'IGST';
                }
            }

            return updated;
        });

        // Pre-fill item if doc is fresh & has blank pricing
        if (record.amount && record.amount > 0 && items.length === 1 && (items[0].unit_price === 0 || !items[0].description)) {
            setItems([{
                id: generateId(),
                description: record.destination_or_title ? `Tour Service: ${record.destination_or_title}` : 'Tour Package',
                quantity: 1,
                total_days_km: '1',
                unit_price: Number(record.amount),
                tax_rate: 0,
                hsn_sac: '9985'
            }]);
        }

        toast.success(`Linked ${record.client_name} (${record.title_badge || 'Profile'})`);
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
            
            // Format item payloads
            const processedItems = items.map(item => {
                const isNew = String(item.id).startsWith('temp-') || !isEdit;
                return {
                    id: isNew ? generateId() : item.id,
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
            });

            // Format custom fields
            const processedCustomFields = customFields.map((cf, i) => {
                const cfIsNew = String(cf.id).startsWith('temp-') || !isEdit;
                return {
                    id: cfIsNew ? generateId() : cf.id,
                    label: cf.label || '',
                    amount: Number(cf.amount || 0),
                    is_deduction: cf.is_deduction ? 1 : 0,
                    sort_order: i
                };
            });

            // ── FLOW A: ISSUE OFFICIAL SEQUENTIAL GST DOCUMENT ──
            if (generate && (!docData.invoice_no || docData.status === 'Draft')) {
                let pfx = fi.invoicePrefix || 'ST';
                if (docData.document_type === 'Proforma') pfx = fi.proformaPrefix || 'PI';
                else if (docData.document_type === 'Quotation') pfx = fi.quotePrefix || 'QT';
                else if (docData.document_type === 'CreditNote') pfx = fi.creditNotePrefix || 'CN';
                else if (docData.document_type === 'Receipt') pfx = fi.receiptPrefix || 'RC';

                const issuePayload = {
                    id: id || generateId(),
                    document_type: docData.document_type || 'Invoice',
                    prefix: pfx,
                    is_gst: docData.is_gst !== undefined ? docData.is_gst : 1,
                    client_gst: docData.client_gst || '',
                    gst_type: docData.gst_type || 'CGST_SGST',
                    place_of_supply: docData.place_of_supply || fi.defaultPlaceOfSupply || 'Maharashtra',
                    place_of_supply_code: docData.place_of_supply_code || fi.defaultPlaceOfSupplyCode || '27',
                    reverse_charge: docData.reverse_charge || fi.defaultReverseCharge || 'No',
                    original_invoice_id: docData.original_invoice_id || null,
                    original_invoice_no: docData.original_invoice_no || null,
                    credit_reason: docData.credit_reason || null,
                    copy_type: docData.copy_type || 'ORIGINAL FOR RECIPIENT',
                    client_name: docData.client_name,
                    email: docData.email,
                    phone: docData.phone,
                    address: docData.address,
                    travel_dates: docData.travel_dates,
                    travel_date_from: docData.travel_date_from,
                    travel_date_to: docData.travel_date_to,
                    due_date: docData.due_date,
                    issue_date: docData.issue_date || new Date().toISOString().split('T')[0],
                    booking_id: docData.booking_id || null,
                    lead_id: docData.lead_id || null,
                    customer_id: docData.customer_id || null,
                    adults: docData.adults,
                    children: docData.children,
                    payment_status: docData.payment_status || 'Unpaid',
                    amount_paid: docData.amount_paid || 0,
                    driver_stay_allowance: docData.driver_stay_allowance || 0,
                    extra_km_charges: docData.extra_km_charges || 0,
                    extra_hrs_charges: docData.extra_hrs_charges || 0,
                    advance_received: docData.advance_received || 0,
                    notes: docData.notes,
                    field_labels: Object.keys(fieldLabels).length > 0 ? JSON.stringify(fieldLabels) : null,
                    subtotal,
                    tax_total: taxTotal,
                    discount: discountAmt,
                    total_amount: totalAmount,
                    balance_due: balanceDue,
                    items: processedItems,
                    customFields: processedCustomFields
                };

                const endpoint = docData.document_type === 'CreditNote' ? '/api/invoices/credit-note' : '/api/invoices/issue';
                const issueRes = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(issuePayload)
                });

                if (!issueRes.ok) {
                    const err = await issueRes.text();
                    throw new Error(`Failed to issue document: ${err}`);
                }

                const issueResult = await issueRes.json();
                const finalDoc = issueResult.data;
                setDocData(finalDoc);

                // Generate PDF
                await generateTrueInvoicePDF(
                    { ...finalDoc, id: finalDoc.id },
                    processedItems,
                    co,
                    fi,
                    processedCustomFields,
                    fieldLabels
                );

                toast.success(`${docData.document_type} ${finalDoc.invoice_no} issued and locked successfully!`);
                setIsDirty(false);
                navigate('/admin/invoices');
                return;
            }

            // ── FLOW B: SAVE DRAFT OR UPDATE EXISTING DOCUMENT ──
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

            for (const item of processedItems) {
                const isNew = String(item.id).startsWith('temp-') || !isEdit;
                const itemPayload = {
                    ...item,
                    invoice_id: invoiceId
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

            // Save custom fields
            for (const delId of deletedCustomFieldIds) {
                await fetch(`/api/crud/invoice_custom_fields/${delId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            }
            for (const cf of processedCustomFields) {
                const cfIsNew = String(cf.id).startsWith('temp-') || !isEdit;
                const cfPayload = { ...cf, invoice_id: invoiceId };
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

            if (generate) {
                await generateTrueInvoicePDF({ ...payload, id: invoiceId }, items, co, fi, customFields, fieldLabels);
                toast.success('PDF generated and downloaded!');
            } else {
                toast.success('Document saved successfully as Draft!');
            }
            setIsDirty(false);
            
            if (generate) {
                navigate('/admin/invoices');
            } else if (!isEdit) {
                navigate(`/admin/invoices/edit/${invoiceId}`, { replace: true });
            }

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Failed to save document');
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

            if (docData.booking_id) {
                window.dispatchEvent(new CustomEvent('booking-transactions-changed', {
                    detail: { bookingId: docData.booking_id }
                }));
            }

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
                                                    {formatTripDuration({ nights: r.nights, days: r.days })} • {r.destination}
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
                        className="relative bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-850 shadow-2xl w-full max-w-lg h-full flex flex-col animate-[slideUp_0.25s_cubic-bezier(0.16,1,0.3,1)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
                            <div>
                                <h4 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                                    <Link size={16} className="text-orange-500" /> Link Customer Record
                                </h4>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">Auto-fill client details, phone, GSTIN, and trip details</p>
                            </div>
                            <button
                                onClick={() => setShowLinkPanel(false)}
                                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        {/* Search & Category Filter Bar */}
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                            <div className="flex gap-2">
                                <select
                                    value={searchType}
                                    onChange={(e) => {
                                        setSearchType(e.target.value);
                                        searchRecords(e.target.value, searchQuery);
                                    }}
                                    className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs outline-none font-bold text-slate-700 dark:text-slate-300 focus:ring-4 focus:ring-orange-500/10 cursor-pointer transition-all shrink-0"
                                >
                                    <option value="all">All Records</option>
                                    <option value="bookings">Bookings</option>
                                    <option value="leads">Leads</option>
                                    <option value="customers">Customers</option>
                                </select>
                                
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        placeholder="Search name, phone, email, booking #, destination..."
                                        value={searchQuery}
                                        autoFocus
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            searchRecords(searchType, e.target.value);
                                        }}
                                        onKeyDown={(e) => e.key === 'Enter' && searchRecords()}
                                        className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 focus:border-orange-500 dark:focus:border-orange-500 rounded-xl pl-3.5 pr-8 py-2.5 text-xs outline-none focus:ring-4 focus:ring-orange-500/10 font-medium transition-all text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => {
                                                setSearchQuery('');
                                                searchRecords(searchType, '');
                                            }}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                        >
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Results Body */}
                        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin space-y-2.5">
                            {searching && searchResults.length === 0 ? (
                                <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold flex flex-col items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center animate-spin">
                                        <Loader2 size={18} className="text-orange-500" />
                                    </div>
                                    <span>Searching databases...</span>
                                </div>
                            ) : searchResults.length === 0 && searchHasRun ? (
                                <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold space-y-1">
                                    <p className="font-bold text-slate-600 dark:text-slate-300">No matching records found</p>
                                    <p className="text-[11px]">Try searching by customer name, 10-digit phone, email, or booking ID</p>
                                </div>
                            ) : (
                                searchResults.map((r: any) => {
                                    const isBooking = r.source_type === 'booking';
                                    const isLead = r.source_type === 'lead';
                                    const isCustomer = r.source_type === 'customer';

                                    return (
                                        <div
                                            key={`${r.source_type}-${r.id}`}
                                            onClick={() => linkRecord(r)}
                                            className="p-3.5 bg-white dark:bg-slate-850/60 hover:bg-orange-50/50 dark:hover:bg-slate-800 cursor-pointer transition-all duration-200 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-orange-500/30 dark:hover:border-orange-500/30 flex flex-col gap-2 group shadow-sm hover:shadow-md"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className={`w-8 h-8 rounded-lg font-black flex items-center justify-center text-xs flex-shrink-0 shadow-sm ${
                                                        isBooking 
                                                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' 
                                                            : isLead 
                                                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' 
                                                            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                    }`}>
                                                        {(r.client_name || '?').substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">
                                                                {r.client_name}
                                                            </p>
                                                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md tracking-wider ${
                                                                isBooking 
                                                                    ? 'bg-blue-100/70 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' 
                                                                    : isLead 
                                                                    ? 'bg-amber-100/70 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' 
                                                                    : 'bg-emerald-100/70 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                                            }`}>
                                                                {r.record_number || r.title_badge}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                                            {r.email && (
                                                                <span className="flex items-center gap-1 truncate max-w-[160px]">
                                                                    <Mail size={11} className="text-slate-400 shrink-0" />
                                                                    {r.email}
                                                                </span>
                                                            )}
                                                            {r.phone && (
                                                                <span className="flex items-center gap-1 shrink-0 font-mono">
                                                                    <Phone size={11} className="text-slate-400 shrink-0" />
                                                                    {r.phone}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <button className="text-[10px] font-black text-orange-600 dark:text-orange-400 bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/10 dark:hover:bg-orange-500/20 px-2.5 py-1.5 rounded-lg transition-all shrink-0 flex items-center gap-1 border border-orange-200/60 dark:border-orange-500/20 group-hover:scale-105">
                                                    <Link size={11} /> Link
                                                </button>
                                            </div>

                                            {/* Details Sub-row: Trip, Pax, Amount, GST */}
                                            {(r.destination_or_title || r.start_date || r.amount > 0 || r.gstin) && (
                                                <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px]">
                                                    {r.destination_or_title && (
                                                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                                                            <MapPin size={10} className="text-orange-500" />
                                                            {r.destination_or_title}
                                                        </span>
                                                    )}
                                                    {r.start_date && (
                                                        <span className="text-slate-500 flex items-center gap-1">
                                                            <Calendar size={10} />
                                                            {new Date(r.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    )}
                                                    {r.adults > 0 && (
                                                        <span className="text-slate-500 flex items-center gap-1">
                                                            <Users size={10} />
                                                            {r.adults} Adults {r.children > 0 ? `+ ${r.children} Children` : ''}
                                                        </span>
                                                    )}
                                                    {r.amount > 0 && (
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400 ml-auto">
                                                            ₹{Number(r.amount).toLocaleString('en-IN')}
                                                        </span>
                                                    )}
                                                    {r.gstin && (
                                                        <span className="bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-1.5 py-0.5 rounded font-mono font-bold text-[9px]">
                                                            GST: {r.gstin}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {!searching && searchResults.length > 0 && (
                            <div className="p-3 border-t border-slate-100 dark:border-slate-800 text-center text-[11px] text-slate-500 font-medium bg-slate-50/50 dark:bg-slate-900/30">
                                {searchResults.length} records found · Click any record to autofill invoice
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
                                    Outstanding: ₹{Math.round(Math.max(0, totalAmount - Number(docData.amount_paid || 0))).toLocaleString('en-IN')}
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
                                    <div className="flex justify-between"><span>Amount paid after this:</span><span className="font-bold">₹{Math.round(Number(docData.amount_paid || 0) + paymentAmount).toLocaleString('en-IN')}</span></div>
                                    <div className="flex justify-between"><span>Remaining balance:</span><span className="font-bold">₹{Math.round(Math.max(0, totalAmount - Number(docData.amount_paid || 0) - paymentAmount)).toLocaleString('en-IN')}</span></div>
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
                                ₹{Math.round(totalAmount).toLocaleString('en-IN')}
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
                            onClick={() => generateTrueInvoicePDF({ ...docData, id, subtotal, tax_total: taxTotal, discount: discountAmt, total_amount: totalAmount }, items, co, fi, customFields, fieldLabels)} 
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

                    {/* Locked / Issued Invoice Actions vs Draft Issuance Actions */}
                    {docData.invoice_no && isEdit ? (
                        <div className="flex items-center gap-2">
                            <div className="h-9 px-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-900/40 shadow-sm font-mono">
                                <span className="material-symbols-outlined text-[15px] text-emerald-500">verified</span>
                                {docData.invoice_no}
                            </div>
                            
                            {docData.document_type === 'Invoice' && (
                                <button
                                    onClick={() => navigate(`/admin/invoices/new?type=CreditNote&original_id=${id}&original_no=${docData.invoice_no}`)}
                                    className="h-9 px-3.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-900/40 flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95"
                                >
                                    <FileText size={13} className="text-rose-500" />
                                    Credit Note
                                </button>
                            )}

                            <button 
                                disabled={saving} 
                                onClick={duplicateToDraft} 
                                className="h-9 px-3 border border-amber-200 bg-amber-50 hover:bg-amber-100 dark:border-amber-900/30 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-95"
                            >
                                {saving ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />}
                                Duplicate
                            </button>
                        </div>
                    ) : (
                        <div className="relative flex items-center">
                            {/* Left Side: Issue & Generate (Main action) */}
                            <button
                                disabled={saving}
                                onClick={() => handleSave(true)}
                                className={`h-9 pl-4 pr-3.5 text-white text-xs font-bold rounded-l-xl flex items-center gap-1.5 transition-all disabled:opacity-50 hover:opacity-95 shadow-md ${
                                    docData.document_type === 'CreditNote'
                                        ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/10'
                                        : 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/10'
                                }`}
                            >
                                {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                {saving ? 'Issuing…' : `Issue & Lock ${docData.document_type === 'CreditNote' ? 'Credit Note' : docData.document_type}`}
                            </button>
                            
                            {/* Right Side: Split Arrow Dropdown Trigger */}
                            <button
                                disabled={saving}
                                onClick={() => setIsSaveDropdownOpen(!isSaveDropdownOpen)}
                                className={`h-9 px-2 text-white rounded-r-xl border-l border-white/20 flex items-center justify-center transition-all disabled:opacity-50 ${
                                    docData.document_type === 'CreditNote' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-orange-600 hover:bg-orange-700'
                                }`}
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
                                            Save as Draft (No Sequence)
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsSaveDropdownOpen(false);
                                                setDocData((prev: any) => ({...prev, status: 'Void'}));
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
                                {['Invoice','Quotation','Proforma','CreditNote'].map(type => (
                                    <button
                                        key={type}
                                        disabled={isLocked && isEdit}
                                        onClick={() => {
                                            setDocData({...docData, document_type: type});
                                            fetchNextPreview(type, docData.issue_date);
                                        }}
                                        className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all ${
                                            docData.document_type === type
                                                ? (type === 'CreditNote' ? 'bg-rose-600 text-white shadow-sm' : 'bg-[#F26222] text-white shadow-sm')
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700/80'
                                        } ${isLocked && isEdit ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                                    >
                                        {type === 'CreditNote' ? 'Credit Note' : type}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <h1 className="text-4xl font-black text-[#091C3B] dark:text-white tracking-tight uppercase">
                                    {docData.document_type === 'CreditNote' ? 'Credit Note' : docData.document_type}
                                </h1>
                                <span className="bg-[#42bbed] text-white px-3 py-0.5 rounded-md text-[10px] font-bold shadow-sm shadow-[#42bbed]/30 uppercase tracking-wider print:bg-[#42bbed] print:text-white" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                    {docData.payment_status === 'Paid' ? 'Paid' : docData.payment_status === 'Partially Paid' ? 'Part Paid' : docData.payment_status}
                                </span>
                                {docData.invoice_no && (
                                    <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
                                        <CheckCircle2 size={10} /> Official GST
                                    </span>
                                )}
                            </div>
                            
                            {/* Credit Note Linked Info Banner */}
                            {docData.document_type === 'CreditNote' && (
                                <div className="mt-4 p-3 bg-rose-50/80 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl space-y-2">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle size={14} className="text-rose-600 dark:text-rose-400" />
                                        <span className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">Credit Note Details (Rule 53)</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Against Tax Invoice No</label>
                                            <input
                                                type="text"
                                                value={docData.original_invoice_no || ''}
                                                onChange={e => setDocData({ ...docData, original_invoice_no: e.target.value })}
                                                placeholder="e.g. ST/26-27/0001"
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Reason for Credit Note</label>
                                            <select
                                                value={docData.credit_reason || 'Cancellation / Revision'}
                                                onChange={e => setDocData({ ...docData, credit_reason: e.target.value })}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-white cursor-pointer"
                                            >
                                                <option value="Cancellation / Revision">Order Cancellation / Revision</option>
                                                <option value="Post-sale Discount">Post-sale Discount / Rate Adjustment</option>
                                                <option value="Deficiency in Service">Deficiency in Service / Partial Refund</option>
                                                <option value="Correction in Invoice">Typo / GST Correction</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 print:flex print:flex-col print:gap-1.5 text-xs">
                                <div className="bg-slate-50/50 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-3.5 flex flex-col justify-center transition-colors">
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider mb-1">
                                        {docData.document_type === 'CreditNote' ? 'Credit Note No #' : docData.document_type === 'Quotation' ? 'Quote No #' : docData.document_type === 'Proforma' ? 'Proforma No #' : 'Tax Invoice No #'}
                                    </span>
                                    <span className="font-extrabold text-[#091C3B] dark:text-white text-sm font-mono">
                                        {docData.invoice_no
                                            ? docData.invoice_no
                                            : (nextSequencePreview ? `${nextSequencePreview} (Draft)` : 'DRAFT')}
                                    </span>
                                </div>
                                <div className="bg-slate-50/50 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-3.5 flex flex-col justify-center transition-colors">
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider mb-1">Issue Date</span>
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="date"
                                            value={docData.issue_date ? docData.issue_date.split('T')[0] : new Date().toISOString().split('T')[0]}
                                            onChange={e => { setDocData((prev: any) => ({...prev, issue_date: e.target.value})); setIsDirty(true); }}
                                            disabled={isLocked && isEdit}
                                            className="font-bold text-[#091C3B] dark:text-white bg-transparent border-0 outline-none text-xs p-0 w-full print:hidden disabled:opacity-60 cursor-pointer"
                                        />
                                        <span className="hidden print:inline font-bold text-[#091C3B]">{new Date(docData.issue_date || new Date()).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'})}</span>
                                    </div>
                                </div>
                                <div className="bg-slate-50/50 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-3.5 flex flex-col justify-center transition-colors">
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider mb-1">Due Date</span>
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="date"
                                            value={docData.due_date ? String(docData.due_date).split('T')[0] : ''}
                                            onChange={e => { setDocData((prev: any) => ({...prev, due_date: e.target.value || null})); setIsDirty(true); }}
                                            disabled={isLocked && isEdit}
                                            className="font-bold text-[#091C3B] dark:text-white bg-transparent border-0 outline-none text-xs p-0 w-full print:hidden disabled:opacity-60 cursor-pointer"
                                            placeholder="Not set"
                                        />
                                        <span className="hidden print:inline font-bold text-[#091C3B]">{docData.due_date ? new Date(docData.due_date).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'}) : '—'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Travel Date Range Row */}
                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 print:flex print:flex-col print:gap-1.5 text-xs">
                                <div className="bg-orange-50/40 dark:bg-orange-500/5 border border-orange-200/60 dark:border-orange-500/20 rounded-2xl p-3.5 flex flex-col justify-center transition-colors">
                                    <span className="text-[10px] text-orange-500 dark:text-orange-400 font-extrabold uppercase tracking-wider mb-1 flex items-center gap-1">
                                        ✈ Travel Date From
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="date"
                                            value={docData.travel_date_from ? String(docData.travel_date_from).split('T')[0] : ''}
                                            onChange={e => { setDocData(prev => ({...prev, travel_date_from: e.target.value || ''})); setIsDirty(true); }}
                                            disabled={isLocked}
                                            className="font-bold text-[#091C3B] dark:text-white bg-transparent border-0 outline-none text-xs p-0 w-full print:hidden disabled:opacity-60 cursor-pointer"
                                            placeholder="dd-mm-yyyy"
                                        />
                                        <span className="hidden print:inline font-bold text-[#091C3B]">{docData.travel_date_from ? new Date(docData.travel_date_from).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'}) : '—'}</span>
                                    </div>
                                </div>
                                <div className="bg-orange-50/40 dark:bg-orange-500/5 border border-orange-200/60 dark:border-orange-500/20 rounded-2xl p-3.5 flex flex-col justify-center transition-colors">
                                    <span className="text-[10px] text-orange-500 dark:text-orange-400 font-extrabold uppercase tracking-wider mb-1 flex items-center gap-1">
                                        🏁 Travel Date To
                                        {docData.travel_date_from && docData.travel_date_to && (() => {
                                            const diff = Math.round((new Date(docData.travel_date_to).getTime() - new Date(docData.travel_date_from).getTime()) / (1000 * 60 * 60 * 24));
                                            return diff > 0 ? <span className="ml-auto text-[9px] bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded-md font-black">{formatTripDuration({ nights: diff, days: diff + 1 })}</span> : null;
                                        })()}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="date"
                                            value={docData.travel_date_to ? String(docData.travel_date_to).split('T')[0] : ''}
                                            min={docData.travel_date_from || undefined}
                                            onChange={e => { setDocData(prev => ({...prev, travel_date_to: e.target.value || ''})); setIsDirty(true); }}
                                            disabled={isLocked}
                                            className="font-bold text-[#091C3B] dark:text-white bg-transparent border-0 outline-none text-xs p-0 w-full print:hidden disabled:opacity-60 cursor-pointer"
                                            placeholder="dd-mm-yyyy"
                                        />
                                        <span className="hidden print:inline font-bold text-[#091C3B]">{docData.travel_date_to ? new Date(docData.travel_date_to).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'}) : '—'}</span>
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
                                            className="text-[10px] font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 flex items-center gap-1.5 print:hidden bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-orange-200/80 dark:border-orange-500/20 shadow-sm hover:scale-105 transition-all"
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
                                        <div className="space-y-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 transition-all animate-in fade-in duration-300">
                                            <div className="flex items-center gap-1.5 text-xs">
                                                <span className="font-bold text-slate-400 dark:text-slate-500">Client GSTIN:</span>
                                                <input
                                                    type="text"
                                                    value={docData.client_gst || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value.toUpperCase().trim();
                                                        const patch: any = { client_gst: val };
                                                        if (isValidGstin(val)) {
                                                            const st = getStateFromGstin(val);
                                                            if (st) {
                                                                patch.place_of_supply = st.name;
                                                                patch.place_of_supply_code = st.code;
                                                                patch.gst_type = st.code === '27' ? 'CGST_SGST' : 'IGST';
                                                            }
                                                        }
                                                        setDocData({ ...docData, ...patch });
                                                        setIsDirty(true);
                                                    }}
                                                    placeholder="GSTIN (e.g. 27AAAAA0000A1Z0)"
                                                    maxLength={15}
                                                    className="bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-355 focus:border-orange-500 flex-1 outline-none focus:ring-0 py-0.5 text-slate-605 dark:text-slate-350 font-mono tracking-wide placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all text-xs"
                                                />
                                                {docData.client_gst && (
                                                    isValidGstin(docData.client_gst) ? (
                                                        <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5">✓ Valid</span>
                                                    ) : (
                                                        <span className="text-[10px] text-amber-500 font-medium">15-char</span>
                                                    )
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                <div>
                                                    <span className="font-bold text-slate-400 dark:text-slate-500 block mb-0.5 text-[10px] uppercase">Place of Supply (Rule 46(d)):</span>
                                                    <select
                                                        value={docData.place_of_supply_code || '27'}
                                                        onChange={(e) => {
                                                            const selected = INDIAN_GST_STATES.find(s => s.code === e.target.value);
                                                            if (selected) {
                                                                setDocData({
                                                                    ...docData,
                                                                    place_of_supply: selected.name,
                                                                    place_of_supply_code: selected.code,
                                                                    gst_type: selected.code === '27' ? 'CGST_SGST' : 'IGST'
                                                                });
                                                                setIsDirty(true);
                                                            }
                                                        }}
                                                        className="w-full bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-200 font-bold transition-all text-xs cursor-pointer"
                                                    >
                                                        {INDIAN_GST_STATES.map(s => (
                                                            <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <span className="font-bold text-slate-400 dark:text-slate-500 block mb-0.5 text-[10px] uppercase">GST Type:</span>
                                                    <select
                                                        value={docData.gst_type || 'CGST_SGST'}
                                                        onChange={(e) => setDocData({ ...docData, gst_type: e.target.value })}
                                                        className="w-full bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-200 font-bold transition-all text-xs cursor-pointer"
                                                    >
                                                        <option value="CGST_SGST">Intra-state (CGST + SGST)</option>
                                                        <option value="IGST">Inter-state (IGST)</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                                                <div>
                                                    <span className="font-bold text-slate-400 dark:text-slate-500 block mb-0.5 text-[10px] uppercase">Reverse Charge (RCM):</span>
                                                    <select
                                                        value={docData.reverse_charge || 'No'}
                                                        onChange={(e) => setDocData({ ...docData, reverse_charge: e.target.value })}
                                                        className="w-full bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-200 font-semibold transition-all text-xs cursor-pointer"
                                                    >
                                                        <option value="No">No (Standard B2C / B2B)</option>
                                                        <option value="Yes">Yes (Payable under RCM)</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <span className="font-bold text-slate-400 dark:text-slate-500 block mb-0.5 text-[10px] uppercase">Copy Type (Rule 48):</span>
                                                    <select
                                                        value={docData.copy_type || 'ORIGINAL FOR RECIPIENT'}
                                                        onChange={(e) => setDocData({ ...docData, copy_type: e.target.value })}
                                                        className="w-full bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-200 font-semibold transition-all text-xs cursor-pointer"
                                                    >
                                                        <option value="ORIGINAL FOR RECIPIENT">Original For Recipient</option>
                                                        <option value="DUPLICATE FOR SUPPLIER">Duplicate For Supplier</option>
                                                    </select>
                                                </div>
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
                                                    <span className="hidden print:inline-block tabular-nums font-bold">₹{Math.round(Number((docData as any)[valueKey] || 0)).toLocaleString('en-IN')}</span>
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
                                                <span className="hidden print:inline-block tabular-nums font-bold">₹{Math.round(Number(docData.advance_received || 0)).toLocaleString('en-IN')}</span>
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
                                                <span className="hidden print:inline-block tabular-nums text-slate-500 font-bold">(₹{Math.round(discountAmt).toLocaleString('en-IN')})</span>
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
                                                    {cf.is_deduction ? '−' : '+'} ₹{Math.round(Number(cf.amount || 0)).toLocaleString('en-IN')}
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
                                            <span className="tabular-nums font-medium">₹{Math.round(subtotal).toLocaleString('en-IN')}</span>
                                        </div>
                                        {docData.is_gst === 1 && taxTotal > 0 ? (
                                            docData.gst_type === 'IGST' ? (
                                                <div className="flex justify-between items-center text-[10px] text-slate-400">
                                                    <span>IGST Total{igstRatesStr}:</span>
                                                    <span className="tabular-nums font-medium">₹{Math.round(taxTotal).toLocaleString('en-IN')}</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                                                        <span>CGST Total{cgstSgstRatesStr}:</span>
                                                        <span className="tabular-nums font-medium">₹{Math.round(taxTotal / 2).toLocaleString('en-IN')}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                                                        <span>SGST Total{cgstSgstRatesStr}:</span>
                                                        <span className="tabular-nums font-medium">₹{Math.round(taxTotal / 2).toLocaleString('en-IN')}</span>
                                                    </div>
                                                </>
                                            )
                                        ) : (
                                            taxTotal > 0 && (
                                                <div className="flex justify-between items-center text-[10px] text-slate-400">
                                                    <span>Tax Total:</span>
                                                    <span className="tabular-nums font-medium">₹{Math.round(taxTotal).toLocaleString('en-IN')}</span>
                                                </div>
                                            )
                                        )}
                                    </div>
                                    
                                    <div className="border-t border-slate-350 dark:border-slate-700/80 pt-3 flex justify-between items-center mb-4" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                        <span className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">Net Amount</span>
                                        <span className="text-lg font-black text-[#F26222] tabular-nums">₹{Math.round(totalAmount).toLocaleString('en-IN')}</span>
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
                                                <span className="hidden print:inline-block tabular-nums font-bold text-emerald-600 dark:text-emerald-400">₹{Math.round(docData.amount_paid || 0).toLocaleString('en-IN')}</span>
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
                                                                <span>Due: ₹{Math.round(Math.max(0, balanceDue)).toLocaleString('en-IN')}</span>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center font-bold text-slate-800 dark:text-slate-200 border-t border-slate-200/50 dark:border-slate-800/80 pt-2.5 text-[10px]">
                                            <span className="uppercase tracking-wider">Due Balance</span>
                                            <span className="tabular-nums font-black text-slate-900 dark:text-white">₹{Math.round(Math.max(0, balanceDue)).toLocaleString('en-IN')}</span>
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
                                                                            const tmplTitle = tmpl.title || 'Untitled Template';
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
