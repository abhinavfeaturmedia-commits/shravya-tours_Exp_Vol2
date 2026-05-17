import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Save, ArrowLeft, Plus, Trash2, CheckCircle2, Printer, CreditCard, User, Mail, MapPin, Calendar, Users, FileCheck, ChevronDown, Loader2, Search, Link, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '../../context/SettingsContext';

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

export const DocumentEditor: React.FC = () => {
    const { settings } = useSettings();
    const co = settings.company;
    const fi = settings.finance;
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
        client_name: '',
        email: '',
        phone: '',
        address: '',
        travel_dates: '',
        booking_id: paramBookingId,
        lead_id: paramLeadId,
        customer_id: paramCustomerId,
        adults: 2,
        children: 0,
        status: 'Draft',
        payment_status: 'Unpaid',
        amount_paid: 0,
        notes: 'Prices are subject to change based on availability at the time of booking. 50% advance required for confirmation.'
    });

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
            const res = await fetch(`/api/crud/packages`, { headers: { 'Authorization': `Bearer ${token}` } });
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
            unit_price: Number(pkg.price || 0),
            tax_rate: 0
        }]);
        setShowCatalogPanel(false);
    };

    const [deletedItemIds, setDeletedItemIds] = useState<string[]>([]);
    const [items, setItems] = useState<any[]>([
        { id: generateId(), description: '', quantity: 1, unit_price: 0, tax_rate: 0 }
    ]);
    const [discount, setDiscount] = useState(0);
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);

    // Record Payment modal
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
    const [paymentNote, setPaymentNote] = useState('');
    const [recordingPayment, setRecordingPayment] = useState(false);

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
                            unit_price: Number(p.amount) || 0,
                            tax_rate: 0
                        }]);
                    } catch { /* ignore parse error */ }
                }
                setLoading(false);
            }
        }
    }, [id]);

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
                    travel_dates: data.booking_date || data.date ? new Date(data.booking_date || data.date).toISOString().split('T')[0] : '',
                    adults: data.number_of_people || data.travelers || 2
                }));
                if (data.total_price || data.amount) {
                    setItems([{ id: generateId(), description: 'Tour Package', quantity: 1, unit_price: Number(data.total_price || data.amount), tax_rate: 0 }]);
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
                    adults: data.travelers && data.travelers !== 'N/A' ? data.travelers : 2,
                    travel_dates: data.start_date || data.travelDate ? new Date(data.start_date || data.travelDate).toISOString().split('T')[0] : '',
                }));
                const budget = data.potential_value || data.budget;
                if (budget) {
                    setItems([{ id: generateId(), description: `Custom Tour: ${data.destination || 'Destination'}`, quantity: 1, unit_price: Number(budget), tax_rate: 0 }]);
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
                setDocData(prev => ({ ...prev, client_name: data.name || '', email: data.email || '' }));
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
                const itemsRes = await fetch(`/api/crud/invoice_items?eq_invoice_id=${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (itemsRes.ok) {
                    const itemsData = await itemsRes.json();
                    if (itemsData.data && itemsData.data.length > 0) {
                        setItems(itemsData.data);
                    }
                }
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
            const res = await fetch(`/api/crud/${t}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const { data } = await res.json();
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
                travel_dates: record.booking_date || record.date ? new Date(record.booking_date || record.date).toISOString().split('T')[0] : prev.travel_dates,
                adults: record.number_of_people || record.travelers || prev.adults
            }));
            if (record.total_price && items.length === 1 && items[0].unit_price === 0) {
                setItems([{ id: generateId(), description: 'Tour Package', quantity: 1, unit_price: Number(record.total_price), tax_rate: 0 }]);
            }
        } else {
            setDocData(prev => ({
                ...prev,
                lead_id: record.id,
                booking_id: null,
                client_name: record.name || '',
                email: record.email || '',
                travel_dates: record.start_date || record.travelDate ? new Date(record.start_date || record.travelDate).toISOString().split('T')[0] : prev.travel_dates,
                adults: record.travelers !== 'N/A' && record.travelers ? record.travelers : prev.adults
            }));
            const budget = record.budget || record.potential_value;
            if (budget && items.length === 1 && items[0].unit_price === 0) {
                setItems([{ id: generateId(), description: `Custom Tour: ${record.destination || 'Destination'}`, quantity: 1, unit_price: Number(budget), tax_rate: 0 }]);
            }
        }
        setShowLinkPanel(false);
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { id: 'temp-' + generateId(), description: '', quantity: 1, unit_price: 0, tax_rate: 0 }]);
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

    const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0);
    const taxTotal = items.reduce((sum, item) => sum + ((Number(item.quantity || 0) * Number(item.unit_price || 0)) * (Number(item.tax_rate || 0) / 100)), 0);
    const discountAmt = Math.max(0, Math.min(subtotal, discount));
    const totalAmount = subtotal + taxTotal - discountAmt;

    const isLocked = docData.status === 'Sent' || docData.payment_status === 'Paid';

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
                status: 'Draft',
                payment_status: 'Unpaid',
                amount_paid: 0,
                issue_date: new Date().toISOString().split('T')[0]
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
                    unit_price: Number(item.unit_price || 0),
                    tax_rate: Number(item.tax_rate || 0),
                    tax_amount: (Number(item.quantity || 1) * Number(item.unit_price || 0)) * (Number(item.tax_rate || 0) / 100),
                    total: (Number(item.quantity || 1) * Number(item.unit_price || 0)) * (1 + Number(item.tax_rate || 0) / 100)
                };
                await fetch('/api/crud/invoice_items', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(itemPayload)
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
                status: generate ? 'Sent' : 'Draft',
                payment_status: docData.payment_status || 'Unpaid',
                amount_paid: docData.amount_paid || 0,
                issue_date: new Date().toISOString().split('T')[0]
            };

            let invoiceId = id;
            if (isEdit) {
                const res = await fetch(`/api/crud/invoices/${id}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Failed to update invoice');
            } else {
                const res = await fetch('/api/crud/invoices', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Failed to create invoice');
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
                    unit_price: Number(item.unit_price || 0),
                    tax_rate: Number(item.tax_rate || 0),
                    tax_amount: (Number(item.quantity || 1) * Number(item.unit_price || 0)) * (Number(item.tax_rate || 0) / 100),
                    total: (Number(item.quantity || 1) * Number(item.unit_price || 0)) * (1 + Number(item.tax_rate || 0) / 100)
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

            toast.success(`Document ${generate ? 'generated' : 'saved as draft'} successfully!`);
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

            // 1. Update invoice amount_paid + payment_status
            await fetch(`/api/crud/invoices/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount_paid: newAmountPaid, payment_status: newStatus })
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

            // 3. Update local state
            setDocData(prev => ({ ...prev, amount_paid: newAmountPaid, payment_status: newStatus }));
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

            {/* Catalog Search Modal */}
            {showCatalogPanel && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 print:hidden" onClick={() => setShowCatalogPanel(false)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div
                        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h4 className="text-base font-bold text-slate-800 dark:text-white">Search Catalog</h4>
                                <p className="text-xs text-slate-400 mt-0.5">Add packages directly to the invoice</p>
                            </div>
                            <button
                                onClick={() => setShowCatalogPanel(false)}
                                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >✕</button>
                        </div>
                        <div className="relative mb-3">
                            <input
                                type="text"
                                placeholder="Search packages..."
                                value={catalogSearch}
                                autoFocus
                                onChange={(e) => {
                                    setCatalogSearch(e.target.value);
                                    searchCatalog(e.target.value);
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-500 transition-colors"
                            />
                        </div>
                        <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-800">
                            {catalogResults.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 text-sm">No packages found</div>
                            ) : (
                                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {catalogResults.map((r: any) => (
                                        <div
                                            key={r.id}
                                            onClick={() => addFromCatalog(r)}
                                            className="px-4 py-3 hover:bg-sky-50 dark:hover:bg-slate-800 cursor-pointer transition-colors flex justify-between items-center group"
                                        >
                                            <div>
                                                <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{r.title}</p>
                                                <p className="text-xs text-slate-500">{r.days}D / {r.nights}N • {r.destination}</p>
                                            </div>
                                            <span className="text-xs font-bold text-sky-500 group-hover:text-sky-600 bg-sky-50 dark:bg-sky-900/30 px-2 py-1 rounded-md">
                                                Add →
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Link Record Modal Overlay — rendered at root level to avoid overflow clipping */}
            {showLinkPanel && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 print:hidden" onClick={() => setShowLinkPanel(false)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div
                        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h4 className="text-base font-bold text-slate-800 dark:text-white">Link a Record</h4>
                                <p className="text-xs text-slate-400 mt-0.5">Auto-fill client details from a booking or lead</p>
                            </div>
                            <button
                                onClick={() => setShowLinkPanel(false)}
                                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >✕</button>
                        </div>

                        {/* Type + Search */}
                        <div className="flex gap-2 mb-3">
                            <select
                                value={searchType}
                                onChange={(e) => {
                                    setSearchType(e.target.value);
                                    setSearchResults([]);
                                    searchRecords(e.target.value, searchQuery);
                                }}
                                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none font-medium text-slate-700 dark:text-slate-300"
                            >
                                <option value="bookings">Bookings</option>
                                <option value="leads">Leads</option>
                            </select>
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    placeholder="Search name, email..."
                                    value={searchQuery}
                                    autoFocus
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        searchRecords(searchType, e.target.value);
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && searchRecords()}
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500 transition-colors pr-8"
                                />
                                {searching && (
                                    <Loader2 size={14} className="animate-spin text-orange-500 absolute right-2.5 top-1/2 -translate-y-1/2" />
                                )}
                            </div>
                        </div>

                        {/* Results */}
                        <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-800">
                            {searching && searchResults.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                                    <Loader2 size={20} className="animate-spin text-orange-400" />
                                    <span>Searching...</span>
                                </div>
                            ) : searchResults.length === 0 && searchHasRun ? (
                                <div className="py-8 text-center text-slate-400 text-sm">
                                    <p className="font-medium">No records found</p>
                                    <p className="text-xs mt-1">Try a different name or email</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {searchResults.map((r: any) => (
                                        <div
                                            key={r.id}
                                            onClick={() => linkRecord(r)}
                                            className="px-4 py-3 hover:bg-orange-50 dark:hover:bg-slate-800 cursor-pointer transition-colors flex justify-between items-center group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs flex-shrink-0">
                                                    {(r.customer_name || r.name || r.customer || '?').substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{r.customer_name || r.name || r.customer || 'Unknown'}</p>
                                                    <p className="text-xs text-slate-500">{r.customer_email || r.email || 'No email'}</p>
                                                </div>
                                            </div>
                                            <span className="text-xs font-bold text-orange-500 group-hover:text-orange-600 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded-md">
                                                Link →
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {!searching && searchResults.length > 0 && (
                            <p className="text-xs text-slate-400 mt-2 text-center">
                                {searchResults.length} record{searchResults.length !== 1 ? 's' : ''} found · Click to auto-fill client details
                            </p>
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

            {/* Top Bar */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/70 dark:border-slate-800 px-6 py-3 flex justify-between items-center sticky top-0 z-30 print:hidden">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                        <ArrowLeft size={17} />
                    </button>
                    <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
                    <div>
                        <h1 className="font-semibold text-slate-800 dark:text-white text-sm tracking-tight">
                            {isEdit ? `Editing ${docData.document_type}` : `New ${docData.document_type}`}
                        </h1>
                        <p className="text-[11px] text-slate-400">{id ? `#${id.slice(0,8).toUpperCase()}` : 'Unsaved draft'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {totalAmount > 0 && (
                        <div className="hidden md:flex items-center gap-1 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/60 rounded-xl px-3 py-1.5">
                            <span className="text-[10px] font-medium text-violet-500 dark:text-violet-400">Total</span>
                            <span className="font-bold text-sm ml-1">₹{totalAmount.toLocaleString('en-IN')}</span>
                        </div>
                    )}
                    <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
                    {id && (
                        <button onClick={handleWhatsApp} className="h-9 px-3 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/25 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            WhatsApp
                        </button>
                    )}
                    <button onClick={() => {
                        const total = totalAmount.toLocaleString('en-IN');
                        const subject = encodeURIComponent(`Your ${docData.document_type} from ${co.companyName || 'SHRAWELLO Travel Hub'}`);
                        const body = encodeURIComponent(`Hi ${docData.client_name},\n\nPlease find the details for your ${docData.document_type} attached.\n\nTotal Amount: INR ${total}\nPayment Status: ${docData.payment_status}\n\nThank you for choosing ${co.companyName || 'SHRAWELLO Travel Hub'}!`);
                        window.open(`mailto:${docData.email || ''}?subject=${subject}&body=${body}`);
                    }} className="h-9 px-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all">
                        <Mail size={13} /> Email
                    </button>
                    <button onClick={() => generateTrueInvoicePDF({ ...docData, id, subtotal, tax_total: taxTotal, discount: discountAmt, total_amount: totalAmount }, items, co, fi)} className="h-9 px-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all">
                        <Printer size={13} /> Download PDF
                    </button>
                    
                    {id && (
                        <button
                            onClick={() => { setPaymentAmount(Math.max(0, totalAmount - Number(docData.amount_paid || 0))); setShowPaymentModal(true); }}
                            className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm shadow-emerald-500/20"
                        >
                            <CreditCard size={13} /> Record Payment
                        </button>
                    )}
                    {isLocked ? (
                        <>
                            <div className="h-9 px-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
                                <span className="material-symbols-outlined text-[14px]">lock</span> Locked
                            </div>
                            <button disabled={saving} onClick={duplicateToDraft} className="h-9 px-4 border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50">
                                {saving ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />}
                                Duplicate to Draft
                            </button>
                        </>
                    ) : (
                        <>
                            <button disabled={saving} onClick={() => handleSave(false)} className="h-9 px-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50">
                                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                {saving ? 'Saving…' : 'Save Draft'}
                            </button>
                            <button disabled={saving} onClick={() => handleSave(true)} className="h-9 px-4 bg-violet-700 hover:bg-violet-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50">
                                {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                {saving ? 'Saving…' : 'Save & Generate'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Document */}
            <div className="max-w-[860px] mx-auto w-full px-6 py-8 pb-16 print:p-0 print:max-w-none">
                <div id="print-section" className="bg-white rounded-2xl shadow-[0_4px_32px_rgba(0,0,0,0.08)] border border-slate-200/70 overflow-hidden relative">

                    {/* Document Header */}
                    <div className="bg-white p-8 flex justify-between items-start">
                        <div className="flex flex-col">
                            {/* Document Type Switcher */}
                            <div className="flex items-center gap-2 mb-3 print:hidden">
                                {['Invoice','Quotation','Proforma'].map(type => (
                                    <button
                                        key={type}
                                        disabled={isLocked}
                                        onClick={() => setDocData({...docData, document_type: type})}
                                        className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
                                            docData.document_type === type
                                                ? 'bg-violet-700 text-white'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        } ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-4xl font-normal text-violet-700 tracking-wide">{docData.document_type}</h1>
                                <span className="bg-[#42bbed] text-white px-3 py-0.5 rounded-full text-xs font-bold shadow-sm shadow-[#42bbed]/30 uppercase tracking-wider print:bg-[#42bbed] print:text-white" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                    {docData.payment_status === 'Partially Paid' ? 'Part Paid' : docData.payment_status}
                                </span>
                            </div>
                            
                            <div className="mt-6 space-y-2 text-sm text-slate-600">
                                <div className="grid grid-cols-[100px_1fr] items-center">
                                    <span className="text-slate-500">Invoice No #</span>
                                    <span className="font-bold text-slate-800">{id ? `${fi.invoicePrefix || 'INV'}${id.slice(0,6).toUpperCase()}` : 'DRAFT'}</span>
                                </div>
                                <div className="grid grid-cols-[100px_1fr] items-center">
                                    <span className="text-slate-500">Invoice Date</span>
                                    <span className="font-bold text-slate-800">{new Date(docData.issue_date || new Date()).toLocaleDateString('en-US', {month:'short', day:'2-digit', year:'numeric'})}</span>
                                </div>
                            </div>
                        </div>

                        <div className="text-right flex flex-col items-end gap-3">
                            {co.logoUrl ? (
                                <img src={co.logoUrl} alt="logo" className="h-24 w-auto object-contain" />
                            ) : (
                                <div className="text-center">
                                    <div className="w-20 h-20 rounded-full border-2 border-orange-200 mx-auto mb-1 flex items-center justify-center relative bg-orange-50 overflow-hidden">
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[40px]">✈️</div>
                                        <div className="absolute top-0 text-[8px] uppercase tracking-[0.2em] font-bold text-orange-800 w-full text-center mt-2" style={{ transform: 'rotate(-25deg)', transformOrigin: 'center' }}>Discover Your</div>
                                    </div>
                                    <h2 className="text-lg font-black tracking-widest text-slate-900 uppercase">SHRAWELLO</h2>
                                    <p className="text-orange-500 font-cursive text-xl -mt-2">Tours</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="px-8 pb-10 space-y-6">
                        {/* Billed By / Billed To */}
                        <div className="grid grid-cols-2 gap-5">
                            <div className="bg-violet-50/70 rounded-xl p-5 border border-violet-100/80" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                <h3 className="text-xl font-normal text-violet-700 mb-3">Billed By</h3>
                                <div className="space-y-1 text-sm text-slate-700">
                                    <p className="font-bold text-base">{co.companyName || 'SHRAWELLO Travel Hub'}</p>
                                    {co.registeredAddress ? (
                                        <div className="whitespace-pre-line">{co.registeredAddress}</div>
                                    ) : (
                                        <>
                                            <p>Pimpri chinchwad, Pune ,</p>
                                            <p>Pune,</p>
                                            <p>Maharashtra, India - 411062</p>
                                        </>
                                    )}
                                    <p><span className="font-semibold">Email:</span> {co.email || 'hello@shrawello.com'}</p>
                                    <p><span className="font-semibold">Phone:</span> {co.phone || '+91 80109 55675'}</p>
                                </div>
                            </div>

                            <div className="bg-violet-50/70 rounded-xl p-5 border border-violet-100/80 relative group" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                <h3 className="text-xl font-normal text-violet-700 mb-3 flex items-center justify-between">
                                    Billed To
                                    <button
                                        onClick={() => {
                                            setShowLinkPanel(true);
                                            setSearchResults([]);
                                            setSearchHasRun(false);
                                            setSearchQuery('');
                                            setTimeout(() => searchRecords(searchType, ''), 0);
                                        }}
                                        className="text-xs font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1 print:hidden opacity-0 group-hover:opacity-100 transition-opacity bg-white px-2 py-1 rounded"
                                    >
                                        <Link size={12} /> Link Record
                                    </button>
                                </h3>
                                <div className="space-y-1 text-sm text-slate-700">
                                    <input
                                        type="text"
                                        value={docData.client_name}
                                        onChange={(e) => setDocData({ ...docData, client_name: e.target.value })}
                                        placeholder="Client Name *"
                                        className="font-bold text-base bg-transparent border-b border-transparent focus:border-violet-300 w-full outline-none placeholder:font-normal"
                                    />
                                    <textarea
                                        value={docData.address}
                                        onChange={(e) => setDocData({ ...docData, address: e.target.value })}
                                        placeholder="Billing address"
                                        rows={3}
                                        className="bg-transparent border-b border-transparent focus:border-violet-300 w-full outline-none resize-none leading-relaxed"
                                    />
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold">Email:</span>
                                        <input
                                            type="email"
                                            value={docData.email}
                                            onChange={(e) => setDocData({ ...docData, email: e.target.value })}
                                            placeholder="Email address"
                                            className="bg-transparent border-b border-transparent focus:border-violet-300 flex-1 outline-none"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold">Phone:</span>
                                        <input
                                            type="tel"
                                            value={docData.phone || ''}
                                            onChange={(e) => setDocData({ ...docData, phone: e.target.value })}
                                            placeholder="Phone number"
                                            className="bg-transparent border-b border-transparent focus:border-violet-300 flex-1 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Line Items Table */}
                        <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-violet-700 text-white text-xs" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                        <th className="text-left px-4 py-3 font-semibold w-[45%]">Item</th>
                                        <th className="text-center px-2 py-3 font-semibold w-[10%]">Date<br/>From</th>
                                        <th className="text-center px-2 py-3 font-semibold w-[10%]">Date<br/>To</th>
                                        <th className="text-center px-2 py-3 font-semibold w-[8%]">Total<br/>Days/Qty</th>
                                        <th className="text-center px-2 py-3 font-semibold w-[10%]">Rate</th>
                                        <th className="text-center px-2 py-3 font-semibold w-[7%]">Tax %</th>
                                        <th className="text-right px-4 py-3 font-semibold w-[10%]">Amount</th>
                                        <th className="w-0 p-0 print:hidden"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => {
                                        return (
                                        <tr key={index} className={`group transition-colors border-b border-slate-100 last:border-0 ${index % 2 !== 0 ? 'bg-[#f8f9fa]' : 'bg-white'}`} style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                            <td className="px-4 py-3 align-top flex gap-2">
                                                <span className="text-slate-500 pt-1">{index + 1}.</span>
                                                <textarea
                                                    value={item.description}
                                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                    placeholder="Item description..."
                                                    rows={2}
                                                    className="w-full bg-transparent outline-none resize-none text-slate-700 leading-relaxed"
                                                />
                                            </td>
                                            <td className="px-2 py-3 align-top text-center">
                                                <input
                                                    type="date"
                                                    value={item.date_from || ''}
                                                    onChange={(e) => handleItemChange(index, 'date_from', e.target.value)}
                                                    className="w-[90px] text-xs bg-transparent text-slate-700 text-center outline-none border-b border-transparent focus:border-violet-300"
                                                />
                                            </td>
                                            <td className="px-2 py-3 align-top text-center">
                                                <input
                                                    type="date"
                                                    value={item.date_to || ''}
                                                    onChange={(e) => handleItemChange(index, 'date_to', e.target.value)}
                                                    className="w-[90px] text-xs bg-transparent text-slate-700 text-center outline-none border-b border-transparent focus:border-violet-300"
                                                />
                                            </td>
                                            <td className="px-2 py-3 align-top text-center">
                                                <input
                                                    type="number" min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                    className="w-full bg-transparent text-center text-slate-700 outline-none border-b border-transparent focus:border-violet-300"
                                                />
                                            </td>
                                            <td className="px-2 py-3 align-top text-center">
                                                <input
                                                    type="number" min="0"
                                                    value={item.unit_price}
                                                    onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                                    className="w-full bg-transparent text-center text-slate-700 outline-none border-b border-transparent focus:border-violet-300"
                                                />
                                            </td>
                                            <td className="px-2 py-3 align-top text-center">
                                                <input
                                                    type="number" min="0" max="100"
                                                    value={item.tax_rate}
                                                    onChange={(e) => handleItemChange(index, 'tax_rate', parseFloat(e.target.value) || 0)}
                                                    className="w-full bg-transparent text-center text-slate-700 outline-none border-b border-transparent focus:border-violet-300"
                                                />
                                            </td>
                                            <td className="px-4 py-3 align-top text-right text-slate-700 tabular-nums">
                                                ₹{((Number(item.quantity || 0) * Number(item.unit_price || 0)) * (1 + Number(item.tax_rate || 0) / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-0 align-top print:hidden w-8">
                                                <button onClick={() => removeItem(index)} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all mt-1">
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Add Item Actions (Hidden in print) */}
                        <div className="flex gap-2 print:hidden mt-1">
                            <button onClick={addItem} className="text-violet-600 hover:text-violet-700 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-violet-50 hover:bg-violet-100 rounded-lg border border-violet-100 transition-colors">
                                <Plus size={13} /> Add Row
                            </button>
                            <button onClick={() => { setShowCatalogPanel(true); searchCatalog(); }} className="text-sky-600 hover:text-sky-700 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-100 transition-colors">
                                <Search size={13} /> From Catalog
                            </button>
                        </div>

                        {/* Totals Section */}
                        <div className="flex items-start justify-between pt-6">
                            
                            {/* Left Side: Bank Details + Words */}
                            <div className="w-[45%] flex flex-col gap-8">
                                <div>
                                    <p className="text-sm text-slate-800 font-bold mb-1 uppercase tracking-wide">Total (in words) :</p>
                                    <p className="text-sm text-slate-700 uppercase font-bold">{numberToWords(totalAmount)} RUPEES ONLY</p>
                                </div>
                                
                                <div className="bg-violet-50/70 rounded-xl p-5 border border-violet-100/80" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                    <h4 className="text-sm font-semibold text-violet-700 mb-3 uppercase tracking-wide">Bank Details</h4>
                                    <div className="grid grid-cols-[120px_1fr] gap-y-2 text-sm text-slate-700">
                                        <span className="font-semibold text-slate-800">Account Name</span>
                                        <span>{fi.bankAccountName || co.companyName || 'SHRAWELLO Travel Hub'}</span>
                                        
                                        <span className="font-semibold text-slate-800">Account Number</span>
                                        <span>{fi.bankAccountNumber || '14960200014487'}</span>
                                        
                                        <span className="font-semibold text-slate-800">IFSC</span>
                                        <span>{fi.bankIfsc || 'FDRL0001496'}</span>
                                        
                                        <span className="font-semibold text-slate-800">Account Type</span>
                                        <span>Current</span>
                                        
                                        <span className="font-semibold text-slate-800">Bank</span>
                                        <span>{fi.bankName || 'Federal Bank'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Middle Side: UPI QR */}
                            <div className="w-[20%] flex flex-col items-center pt-20">
                            {fi.upiId ? (
                                <>
                                    <p className="text-sm font-semibold text-violet-700 mb-1">Scan to pay via UPI</p>
                                    <p className="text-[10px] text-slate-500 text-center mb-2 leading-tight">Maximum of 1 lakh can<br/>be transferred via upi in a<br/>single day</p>
                                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=upi://pay?pa=${fi.upiId}&pn=${encodeURIComponent(co.companyName || 'SHRAWELLO')}&cu=INR`} alt="UPI QR" className="w-24 h-24 mix-blend-multiply" />
                                    <p className="text-xs font-semibold mt-2">{fi.upiId}</p>
                                </>
                            ) : null}
                            </div>

                            {/* Right Side: Totals */}
                            <div className="w-[35%] text-sm text-slate-700">
                                <div className="space-y-4 pb-4 px-2">
                                    <div className="flex justify-between items-center">
                                        <span>Toll / TP Charges:</span>
                                        <span className="tabular-nums">₹0.00</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>Driver Stay Allowance:</span>
                                        <span className="tabular-nums">₹0.00</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>Corporate / Referral<br/>Discount:</span>
                                        <div className="flex items-center justify-end">
                                            <input
                                                type="number" min="0"
                                                value={discount}
                                                onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                                                className="w-20 text-right bg-transparent border-b border-transparent focus:border-violet-300 outline-none print:hidden -mr-2"
                                            />
                                            <span className="hidden print:inline-block tabular-nums text-slate-600">(₹{discountAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })})</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>Subtotal:</span>
                                        <span className="tabular-nums">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    {taxTotal > 0 && (
                                        <>
                                            <div className="flex justify-between items-center text-slate-500 text-xs">
                                                <span>CGST (half of tax)</span>
                                                <span className="tabular-nums">₹{(taxTotal / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-slate-500 text-xs">
                                                <span>SGST (half of tax)</span>
                                                <span className="tabular-nums">₹{(taxTotal / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span>Total Tax:</span>
                                                <span className="tabular-nums">₹{taxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                                
                                <div className="border-t-2 border-violet-700 pt-3 flex justify-between items-center mb-5" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                    <span className="text-base font-bold text-slate-900">Total (INR)</span>
                                    <span className="text-lg font-bold text-violet-700 tabular-nums">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                
                                <div className="space-y-4 pt-2">
                                    <div className="flex justify-between items-center text-slate-600">
                                        <span>Amount Paid</span>
                                        <div className="flex items-center justify-end">
                                            <select
                                                value={docData.payment_status}
                                                onChange={e => setDocData({...docData, payment_status: e.target.value})}
                                                className="bg-transparent border-b border-transparent focus:border-violet-300 outline-none print:hidden mr-2 text-xs"
                                            >
                                                <option value="Unpaid">Unpaid</option>
                                                <option value="Partially Paid">Part Paid</option>
                                                <option value="Paid">Paid</option>
                                            </select>
                                            <input
                                                type="number" min="0"
                                                value={docData.amount_paid || 0}
                                                onChange={e => setDocData({...docData, amount_paid: parseFloat(e.target.value) || 0})}
                                                className="w-20 text-right bg-transparent border-b border-transparent focus:border-violet-300 outline-none print:hidden -mr-2 tabular-nums"
                                            />
                                            <span className="hidden print:inline-block tabular-nums">(₹{(docData.amount_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })})</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center font-semibold text-slate-800">
                                        <span>Due Amount</span>
                                        <span className="tabular-nums text-slate-800">₹{(totalAmount - (docData.amount_paid || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Signature */}
                        <div className="pt-24 flex justify-end">
                            <div className="text-center">
                                {co.companyName ? (
                                    <div className="font-cursive text-3xl text-slate-800 mb-1" style={{ fontFamily: "'Dancing Script', cursive" }}>{co.companyName}</div>
                                ) : (
                                    <div className="font-cursive text-4xl text-slate-800 mb-1" style={{ fontFamily: "'Dancing Script', cursive" }}>Shrawello</div>
                                )}
                                <p className="text-sm text-slate-700">This is system generated invoice</p>
                            </div>
                        </div>

                        {/* Page Footer (Print Only) */}
                        <div className="hidden print:flex justify-between items-center pt-6 mt-12 border-t border-slate-300 border-dashed text-[10px] text-slate-500">
                            <div className="grid grid-cols-[100px_1fr]">
                                <span className="font-medium">Invoice No</span>
                                <span className="font-bold text-slate-800">{id ? `${fi.invoicePrefix || 'INV'}${id.slice(0,6).toUpperCase()}` : 'DRAFT'}</span>
                            </div>
                            <div className="grid grid-cols-[100px_1fr]">
                                <span className="font-medium">Invoice Date</span>
                                <span className="font-bold text-slate-800">{new Date(docData.issue_date || new Date()).toLocaleDateString('en-US', {day:'2-digit', month:'short', year:'numeric'})}</span>
                            </div>
                            <div className="grid grid-cols-[80px_1fr]">
                                <span className="font-medium">Billed To</span>
                                <span className="font-bold text-slate-800">{docData.client_name || 'Client'}</span>
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
                        <h3 className="text-base font-semibold text-violet-700 uppercase tracking-wide">Terms and Conditions</h3>
                        <div className="text-sm text-slate-800 space-y-2">
                            <textarea
                                value={docData.notes || "1. Please pay within 3 days from the date of invoice, overdue interest @ 14% will be charged on delayed payments.\n2. Additional 5% charges applicable for Credit card payments.\n3. Additional 1200/- Night charges applicable if trip ends after 11:45PM.\n4. For Outstation trips more than 1 day, driver stay allowance is applicable as per category of city."}
                                onChange={(e) => setDocData({ ...docData, notes: e.target.value })}
                                rows={6}
                                className="w-full bg-transparent outline-none resize-y leading-relaxed text-sm"
                            />
                        </div>
                        <div className="pt-8 text-center text-sm">
                            <p>For any enquiry, reach out via email at <span className="font-semibold">{co.email || 'hello@shrawello.com'}</span>, call on <span className="font-semibold">{co.phone || '+91 80109 55675'}</span></p>
                        </div>
                        
                        {/* Page 2 Footer */}
                        <div className="hidden print:flex justify-between items-center pt-8 mt-[800px] border-t border-slate-300 border-dashed text-[10px] text-slate-500 absolute bottom-8 left-8 right-8">
                            <div className="grid grid-cols-[100px_1fr]">
                                <span className="font-medium">Invoice No</span>
                                <span className="font-bold text-slate-800">{id ? `${fi.invoicePrefix || 'INV'}${id.slice(0,6).toUpperCase()}` : 'DRAFT'}</span>
                            </div>
                            <div className="grid grid-cols-[100px_1fr]">
                                <span className="font-medium">Invoice Date</span>
                                <span className="font-bold text-slate-800">{new Date(docData.issue_date || new Date()).toLocaleDateString('en-US', {day:'2-digit', month:'short', year:'numeric'})}</span>
                            </div>
                            <div className="grid grid-cols-[80px_1fr]">
                                <span className="font-medium">Billed To</span>
                                <span className="font-bold text-slate-800">{docData.client_name || 'Client'}</span>
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
