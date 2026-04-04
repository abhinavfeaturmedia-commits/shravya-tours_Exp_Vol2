import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../../context/DataContext';
import {
    MasterLocation,
    MasterHotel,
    MasterActivity,
    MasterTransport,
    MasterPlan,
    MasterLocationType,
    MasterTransportType,
    MasterRoomType,
    MasterMealPlan,
    MasterLeadSource,
    MasterTermsTemplate,
    MEAL_PLAN_DESCRIPTIONS
} from '../../types';
import {
    MapPin, Building2, Bike, Car, Calendar, Search, Plus, Filter,
    Download, Upload, Trash2, Edit2, Copy, MoreVertical, X,
    Check, ChevronDown, LayoutGrid, List, BedDouble, Utensils,
    Users, FileText, Globe
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { ImageUpload } from '../../components/ui/ImageUpload';

type MasterTab = 'analytics' | 'locations' | 'hotels' | 'activities' | 'transports' | 'plans' | 'room-types' | 'meal-plans' | 'lead-sources' | 'terms';
type ViewMode = 'grid' | 'list';
type SortDirection = 'asc' | 'desc';

// Safe UUID v4 generator
const generateId = (prefix: string) => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// --- Master Modal Component (Extracted) ---
const MasterModal: React.FC<{
    activeTab: MasterTab;
    editingItem: any;
    onClose: () => void;
}> = ({ activeTab, editingItem, onClose }) => {
    const {
        addMasterLocation, updateMasterLocation,
        addMasterHotel, updateMasterHotel,
        addMasterActivity, updateMasterActivity,
        addMasterTransport, updateMasterTransport,
        addMasterPlan, updateMasterPlan,
        addMasterRoomType, updateMasterRoomType,
        addMasterMealPlan, updateMasterMealPlan,
        addMasterLeadSource, updateMasterLeadSource,
        addMasterTermsTemplate, updateMasterTermsTemplate,
        masterLocations
    } = useData();

    // Initialize form state
    const [form, setForm] = useState<any>(editingItem ? { ...editingItem } : { status: 'Active' });

    // Handle saving
    const save = () => {
        // Validation for common fields
        if (activeTab !== 'plans' && activeTab !== 'room-types' && activeTab !== 'meal-plans' && activeTab !== 'lead-sources' && activeTab !== 'terms' && !form.name) {
            return toast.error('Name is required');
        }
        if (activeTab === 'plans' && !form.name) {
            return toast.error('Title is required');
        }
        if (activeTab === 'room-types' && !form.name) {
            return toast.error('Name is required');
        }
        if (activeTab === 'meal-plans' && (!form.name || !form.code)) {
            return toast.error('Name and Code are required');
        }
        if (activeTab === 'lead-sources' && !form.name) {
            return toast.error('Name is required');
        }
        if (activeTab === 'terms' && !form.name) {
            return toast.error('Title is required');
        }

        const id = editingItem ? editingItem.id : generateId(
            activeTab === 'locations' ? 'LOC' :
                activeTab === 'hotels' ? 'HTL' :
                    activeTab === 'activities' ? 'ACT' :
                        activeTab === 'transports' ? 'TRN' :
                            activeTab === 'plans' ? 'PLN' :
                                activeTab === 'room-types' ? 'RT' :
                                    activeTab === 'meal-plans' ? 'MP' :
                                        activeTab === 'lead-sources' ? 'LS' : 'TT'
        );

        const data = { ...form, id };

        // Apply defaults for fields that might not have triggered onChange
        if (activeTab === 'locations' && !data.type) data.type = 'City';
        if (activeTab === 'activities' && !data.category) data.category = 'Leisure';
        if (activeTab === 'transports' && !data.type) data.type = 'Sedan';
        if (activeTab === 'meal-plans' && !data.code) data.code = 'CP';
        if (activeTab === 'lead-sources' && !data.category) data.category = 'Organic';
        if (activeTab === 'terms' && !data.category) data.category = 'Other';

        // Sanitize numeric inputs
        if (data.pricePerNight) data.pricePerNight = Number(data.pricePerNight);
        if (data.rating) data.rating = Number(data.rating);
        if (data.cost) data.cost = Number(data.cost);
        if (data.capacity) data.capacity = Number(data.capacity);
        if (data.baseRate) data.baseRate = Number(data.baseRate);
        if (data.duration && !isNaN(Number(data.duration))) data.duration = Number(data.duration); // Keep as number if plan, string if activity e.g "2 hours"
        if (data.estimatedCost) data.estimatedCost = Number(data.estimatedCost);

        // Handle Array inputs (Amenities)
        if (typeof data.amenities === 'string') {
            data.amenities = data.amenities.split(',').map((s: string) => s.trim());
        }

        if (editingItem) {
            if (activeTab === 'locations') updateMasterLocation(id, data);
            if (activeTab === 'hotels') updateMasterHotel(id, data);
            if (activeTab === 'activities') updateMasterActivity(id, data);
            if (activeTab === 'transports') updateMasterTransport(id, data);
            if (activeTab === 'plans') updateMasterPlan(id, data);
            if (activeTab === 'room-types') updateMasterRoomType(id, data);
            if (activeTab === 'meal-plans') updateMasterMealPlan(id, data);
            if (activeTab === 'lead-sources') updateMasterLeadSource(id, data);
            if (activeTab === 'terms') updateMasterTermsTemplate(id, data);
        } else {
            if (activeTab === 'locations') addMasterLocation(data);
            if (activeTab === 'hotels') addMasterHotel(data);
            if (activeTab === 'activities') addMasterActivity(data);
            if (activeTab === 'transports') addMasterTransport(data);
            if (activeTab === 'plans') addMasterPlan({ ...data, days: [] }); // Plans start with empty days
            if (activeTab === 'room-types') addMasterRoomType(data);
            if (activeTab === 'meal-plans') addMasterMealPlan(data);
            if (activeTab === 'lead-sources') addMasterLeadSource(data);
            if (activeTab === 'terms') addMasterTermsTemplate(data);
        }
        onClose();
        toast.success(`${editingItem ? 'Updated' : 'Added'} successfully`);
    };

    return (
        <div className="space-y-4">
            {/* Image Upload for Supported Types */}
            {['locations', 'hotels', 'activities', 'transports', 'room-types', 'meal-plans'].includes(activeTab) && (
                <div className="flex justify-center mb-4">
                    <ImageUpload
                        label="Cover Image"
                        value={form.image}
                        onChange={(url) => setForm({ ...form, image: url })}
                    />
                </div>
            )}

            {/* Common Name/Title Field */}
            {activeTab !== 'plans' && activeTab !== 'room-types' && activeTab !== 'meal-plans' && activeTab !== 'lead-sources' && activeTab !== 'terms' ? (
                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Name *</label>
                    <input
                        value={form.name || ''}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Enter name"
                        autoFocus
                    />
                </div>
            ) : null}

            {/* Location Specifics */}
            {activeTab === 'locations' && (
                <>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Type</label>
                        <select value={form.type || 'City'} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none">
                            <option value="City">City</option>
                            <option value="State">State</option>
                            <option value="Country">Country</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Region</label>
                        <input value={form.region || ''} onChange={e => setForm({ ...form, region: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none" placeholder="Region/State" />
                    </div>
                </>
            )}

            {/* Hotel Specifics */}
            {activeTab === 'hotels' && (
                <>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Location *</label>
                        <select value={form.locationId || ''} onChange={e => setForm({ ...form, locationId: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none">
                            <option value="">Select Location</option>
                            {masterLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Address</label>
                        <input value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none" placeholder="Hotel Address or Area" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Price (₹/night)</label>
                            <input type="number" value={form.pricePerNight || ''} onChange={e => setForm({ ...form, pricePerNight: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Rating</label>
                            <input type="number" max="5" min="1" step="0.1" value={form.rating || 5} onChange={e => setForm({ ...form, rating: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Amenities</label>
                        <input value={Array.isArray(form.amenities) ? form.amenities.join(', ') : form.amenities || ''} onChange={e => setForm({ ...form, amenities: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none" placeholder="Pool, Wifi, Gym (comma separated)" />
                    </div>
                </>
            )}

            {/* Activity Specifics */}
            {activeTab === 'activities' && (
                <>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Location *</label>
                        <select value={form.locationId || ''} onChange={e => setForm({ ...form, locationId: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none">
                            <option value="">Select Location</option>
                            {masterLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Cost (₹)</label>
                            <input type="number" value={form.cost || ''} onChange={e => setForm({ ...form, cost: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Duration</label>
                            <input value={form.duration || ''} onChange={e => setForm({ ...form, duration: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none" placeholder="e.g. 2 hours" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                        <select value={form.category || 'Leisure'} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none">
                            <option value="Leisure">Leisure</option>
                            <option value="Adventure">Adventure</option>
                            <option value="Sightseeing">Sightseeing</option>
                            <option value="Cultural">Cultural</option>
                            <option value="Food">Food & Drink</option>
                        </select>
                    </div>
                </>
            )}

            {/* Transport Specifics */}
            {activeTab === 'transports' && (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Type</label>
                            <select value={form.type || 'Sedan'} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none">
                                <option value="Sedan">Sedan</option>
                                <option value="SUV">SUV</option>
                                <option value="Tempo Traveller">Tempo Traveller</option>
                                <option value="Bus">Bus</option>
                                <option value="Flight">Flight</option>
                                <option value="Train">Train</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Capacity</label>
                            <input type="number" value={form.capacity || ''} onChange={e => setForm({ ...form, capacity: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none" placeholder="Seats" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Base Rate (₹)</label>
                        <input type="number" value={form.baseRate || ''} onChange={e => setForm({ ...form, baseRate: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none" />
                    </div>
                </>
            )}

            {/* Plan Specifics */}
            {activeTab === 'plans' && (
                <>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Plan Title *</label>
                        <input
                            value={form.name || ''}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g., Summer Escape"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Primary Location</label>
                        <select value={form.locationId || ''} onChange={e => setForm({ ...form, locationId: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none">
                            <option value="">Select Location</option>
                            {masterLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Estimated Cost (₹)</label>
                            <input type="number" value={form.estimatedCost || ''} onChange={e => setForm({ ...form, estimatedCost: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Duration (Days)</label>
                            <input type="number" value={form.duration || ''} onChange={e => setForm({ ...form, duration: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 italic mt-2">Note: To manage the itinerary days and activities, please use the specific Itinerary Builder module or delete this plan and create a new one.</p>
                </>
            )}

            {/* ROOM TYPES FIELDS */}
            {activeTab === 'room-types' && (
                <>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Name *</label>
                        <input
                            value={form.name || ''}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. Deluxe Ocean View"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                        <textarea
                            value={form.description || ''}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none h-24"
                            placeholder="Room details..."
                        />
                    </div>
                </>
            )}

            {/* MEAL PLANS FIELDS */}
            {activeTab === 'meal-plans' && (
                <>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Code *</label>
                            <select
                                value={form.code || 'CP'}
                                onChange={e => setForm({ ...form, code: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                            >
                                {Object.keys(MEAL_PLAN_DESCRIPTIONS).map(code => (
                                    <option key={code} value={code}>{code}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Name *</label>
                            <input
                                value={form.name || ''}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="e.g. Continental Plan"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                        <input
                            value={form.description || MEAL_PLAN_DESCRIPTIONS[form.code] || ''}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                            placeholder="e.g. Breakfast included"
                        />
                    </div>
                </>
            )}

            {/* LEAD SOURCES FIELDS */}
            {activeTab === 'lead-sources' && (
                <>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Name *</label>
                        <input
                            value={form.name || ''}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. Instagram Ads"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                        <select
                            value={form.category || 'Organic'}
                            onChange={e => setForm({ ...form, category: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                        >
                            <option value="Organic">Organic</option>
                            <option value="Paid">Paid</option>
                            <option value="Referral">Referral</option>
                            <option value="Direct">Direct</option>
                        </select>
                    </div>
                </>
            )}

            {/* TERMS FIELDS */}
            {activeTab === 'terms' && (
                <>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Title *</label>
                        <input
                            value={form.name || ''}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. Standard Cancellation Policy"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                        <select
                            value={form.category || 'Other'}
                            onChange={e => setForm({ ...form, category: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                        >
                            <option value="Booking & Payment">Booking & Payment</option>
                            <option value="Cancellation Policy">Cancellation Policy</option>
                            <option value="Travel Insurance">Travel Insurance</option>
                            <option value="Pricing & Inclusions">Pricing & Inclusions</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Content</label>
                        {/* Quick-insert toolbar */}
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {[
                                { label: '## Heading', insert: '\n## ' },
                                { label: '• Bullet', insert: '\n• ' },
                                { label: '1. Numbered', insert: '\n1. ' },
                                { label: '— Separator', insert: '\n---\n' },
                            ].map(({ label, insert }) => (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => {
                                        const ta = document.getElementById('terms-content-editor') as HTMLTextAreaElement;
                                        if (!ta) return;
                                        const start = ta.selectionStart;
                                        const end = ta.selectionEnd;
                                        const current = form.content || '';
                                        const updated = current.slice(0, start) + insert + current.slice(end);
                                        setForm({ ...form, content: updated });
                                        // Restore cursor after the inserted text
                                        requestAnimationFrame(() => {
                                            ta.focus();
                                            ta.setSelectionRange(start + insert.length, start + insert.length);
                                        });
                                    }}
                                    className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors border border-slate-200 dark:border-slate-600"
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <textarea
                            id="terms-content-editor"
                            value={form.content || ''}
                            onChange={e => setForm({ ...form, content: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none h-48 text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500 resize-y"
                            placeholder={"## Cancellation Policy\n• 100% refund if cancelled 30+ days before departure\n• 50% refund if cancelled 15–29 days before\n• No refund within 14 days\n\n## Payment Terms\n• 25% advance at time of booking\n• Balance due 7 days before travel"}
                            spellCheck
                        />
                        <p className="text-[11px] text-slate-400 mt-1.5">Use ## for section headings, • for bullet points, 1. for numbered lists. Plain text — no HTML needed.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={form.isDefault || false}
                            onChange={e => setForm({ ...form, isDefault: e.target.checked })}
                            id="isDefault"
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="isDefault" className="text-sm font-bold text-slate-700 dark:text-slate-300">Set as Default Template</label>
                    </div>
                </>
            )}

            <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                <select value={form.status || 'Active'} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                </select>
            </div>

            <div className="pt-4">
                <button onClick={save} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/30">
                    {editingItem ? 'Update' : 'Create'} {activeTab === 'plans' ? 'Template' : 'Item'}
                </button>
            </div>
        </div>
    );
};

export const Masters: React.FC = () => {
    const {
        masterLocations, masterHotels, masterActivities, masterTransports, masterPlans,
        masterRoomTypes, masterMealPlans, masterLeadSources, masterTermsTemplates,
        addMasterLocation, updateMasterLocation, deleteMasterLocation,
        addMasterHotel, updateMasterHotel, deleteMasterHotel,
        addMasterActivity, updateMasterActivity, deleteMasterActivity,
        addMasterTransport, updateMasterTransport, deleteMasterTransport,
        addMasterPlan, updateMasterPlan, deleteMasterPlan,
        addMasterRoomType, updateMasterRoomType, deleteMasterRoomType,
        addMasterMealPlan, updateMasterMealPlan, deleteMasterMealPlan,
        addMasterLeadSource, updateMasterLeadSource, deleteMasterLeadSource,
        addMasterTermsTemplate, updateMasterTermsTemplate, deleteMasterTermsTemplate,
    } = useData();

    // --- State ---
    const [activeTab, setActiveTab] = useState<MasterTab>('locations');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filters & Sorting
    const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Inactive'>('All');
    const [sortBy, setSortBy] = useState<string>('name'); // Default sort field
    const [sortDir, setSortDir] = useState<SortDirection>('asc');

    // Reset selection and filters on tab change
    useEffect(() => {
        setSelectedItems(new Set());
        setFilterStatus('All');
        setSearchQuery('');
        setSortBy('name'); // Default sort field for most tabs
        if (activeTab === 'plans' || activeTab === 'terms') setSortBy('title');
        if (activeTab === 'meal-plans') setSortBy('code');
        setSortDir('asc');
    }, [activeTab]);

    const tabs: { id: MasterTab; label: string; icon: React.ReactNode; count?: number }[] = [
        { id: 'analytics', label: 'Analytics', icon: <span className="material-symbols-outlined">monitoring</span> },
        { id: 'locations', label: 'Locations', icon: <MapPin size={16} />, count: masterLocations.length },
        { id: 'hotels', label: 'Hotels', icon: <Building2 size={16} />, count: masterHotels.length },
        { id: 'room-types', label: 'Room Types', icon: <BedDouble size={16} />, count: masterRoomTypes.length },
        { id: 'meal-plans', label: 'Meal Plans', icon: <Utensils size={16} />, count: masterMealPlans.length },
        { id: 'activities', label: 'Activities', icon: <Bike size={16} />, count: masterActivities.length },
        { id: 'transports', label: 'Transports', icon: <Car size={16} />, count: masterTransports.length },
        { id: 'lead-sources', label: 'Lead Sources', icon: <Globe size={16} />, count: masterLeadSources.length },
        { id: 'terms', label: 'Terms & Conditions', icon: <FileText size={16} />, count: masterTermsTemplates.length },
        { id: 'plans', label: 'Plan Templates', icon: <Calendar size={16} />, count: masterPlans.length },
    ];

    // --- Helper Functions ---

    const getLocationNameById = (id: string) => masterLocations.find(l => l.id === id)?.name || 'Unknown';

    // Calculate usage count for relationships
    const getUsageCount = (id: string, type: MasterTab) => {
        if (type === 'locations') {
            const hotels = masterHotels.filter(h => h.locationId === id).length;
            const activities = masterActivities.filter(a => a.locationId === id).length;
            const plans = masterPlans.filter(p => p.locationId === id).length;
            return { total: hotels + activities + plans, details: `${hotels} Hotels, ${activities} Activities, ${plans} Plans` };
        }
        if (type === 'hotels') {
            const count = masterPlans.reduce((acc, plan) => acc + (plan.days?.filter(d => d.hotelId === id).length || 0), 0);
            return { total: count, details: `Used in ${count} Plans` };
        }
        if (type === 'activities') {
            const count = masterPlans.reduce((acc, plan) => acc + (plan.days?.flatMap(d => d.activities || []).includes(id) ? 1 : 0), 0);
            return { total: count, details: `Used in ${count} Plans` };
        }
        if (type === 'transports') {
            const count = masterPlans.reduce((acc, plan) => acc + (plan.days?.filter(d => d.transportId === id).length || 0), 0);
            return { total: count, details: `Used in ${count} Plans` };
        }
        if (type === 'room-types') {
            // const count = masterHotels.filter(h => h.roomTypes?.includes(id)).length; // Properties not yet on MasterHotel
            return { total: 0, details: `Not currently linked to Hotels` };
        }
        if (type === 'meal-plans') {
            // const count = masterHotels.filter(h => h.mealPlans?.includes(id)).length; // Properties not yet on MasterHotel
            return { total: 0, details: `Not currently linked to Hotels` };
        }
        // Lead sources and terms templates are generally not directly linked to other master data items in this way
        return { total: 0, details: '' };
    };

    const handleSelectAll = (items: any[]) => {
        if (selectedItems.size === items.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(items.map(i => i.id)));
        }
    };

    const handleSelectOne = (id: string) => {
        const newSet = new Set(selectedItems);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedItems(newSet);
    };

    const handleDuplicate = (item: any) => {
        const newItem = { ...item };
        newItem.id = generateId(activeTab === 'locations' ? 'LOC' : activeTab === 'hotels' ? 'HTL' : activeTab === 'activities' ? 'ACT' : activeTab === 'transports' ? 'TRN' : activeTab === 'plans' ? 'PLN' : activeTab === 'room-types' ? 'RT' : activeTab === 'meal-plans' ? 'MP' : activeTab === 'lead-sources' ? 'LS' : 'TT');
        newItem.name ? (newItem.name += ' (Copy)') : (newItem.title += ' (Copy)');

        if (activeTab === 'locations') addMasterLocation(newItem);
        else if (activeTab === 'hotels') addMasterHotel(newItem);
        else if (activeTab === 'activities') addMasterActivity(newItem);
        else if (activeTab === 'transports') addMasterTransport(newItem);
        else if (activeTab === 'plans') addMasterPlan({ ...newItem, days: [] });
        else if (activeTab === 'room-types') addMasterRoomType(newItem);
        else if (activeTab === 'meal-plans') addMasterMealPlan(newItem);
        else if (activeTab === 'lead-sources') addMasterLeadSource(newItem);
        else if (activeTab === 'terms') addMasterTermsTemplate(newItem);

        toast.success('Item duplicated successfully!');
    };

    const confirmBulkDelete = () => {
        if (!confirm(`Are you sure you want to delete ${selectedItems.size} items?`)) return;

        const deleteFuncs: Record<string, (id: string) => void> = {
            locations: deleteMasterLocation,
            hotels: deleteMasterHotel,
            activities: deleteMasterActivity,
            transports: deleteMasterTransport,
            plans: deleteMasterPlan,
            'room-types': deleteMasterRoomType,
            'meal-plans': deleteMasterMealPlan,
            'lead-sources': deleteMasterLeadSource,
            'terms': deleteMasterTermsTemplate,
        };

        if (deleteFuncs[activeTab]) {
            selectedItems.forEach(id => deleteFuncs[activeTab](id));
            setSelectedItems(new Set());
            toast.success(`${selectedItems.size} items deleted`);
        }
    };

    const bulkUpdateStatus = (status: 'Active' | 'Inactive') => {
        const updateFuncs: Record<string, (id: string, data: any) => void> = {
            locations: updateMasterLocation,
            hotels: updateMasterHotel,
            activities: updateMasterActivity,
            transports: updateMasterTransport,
            plans: updateMasterPlan,
            'room-types': updateMasterRoomType,
            'meal-plans': updateMasterMealPlan,
            'lead-sources': updateMasterLeadSource,
            'terms': updateMasterTermsTemplate,
        };

        if (updateFuncs[activeTab]) {
            selectedItems.forEach(id => updateFuncs[activeTab](id, { status }));
            setSelectedItems(new Set());
            toast.success(`${selectedItems.size} items updated to ${status}`);
        }
    };

    // --- Import / Export ---
    const handleExport = () => {
        if (activeTab === 'analytics') return toast.error('Please select a data tab to export.');

        const dataToExport = getProcessedData();

        // Convert data to worksheet
        const ws = XLSX.utils.json_to_sheet(dataToExport);

        // specific handling for arrays if needed, but json_to_sheet handles them reasonably well
        // Convert worksheet to CSV
        const csv = XLSX.utils.sheet_to_csv(ws);

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        link.download = `shravya-${activeTab}-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Data exported successfully!');
    };

    const handleImportClick = () => {
        if (activeTab === 'analytics') return toast.error('Please select a data tab to import into.');
        if (fileInputRef.current) {
            fileInputRef.current.accept = ".csv"; // Restrict to CSV
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            toast.error('Please upload a valid CSV file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result;
                if (!content) return;

                const workbook = XLSX.read(content, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const data: any[] = XLSX.utils.sheet_to_json(sheet);

                if (!Array.isArray(data)) throw new Error('Invalid format: Expected an array of rows');

                let count = 0;
                data.forEach(item => {
                    // Normalize ID to prevent overwriting
                    const newItem = { ...item, id: generateId(activeTab.toUpperCase().substring(0, 3) + 'IMP') };

                    // Handle Amenities Array if it comes as string from CSV
                    if (newItem.amenities && typeof newItem.amenities === 'string') {
                        newItem.amenities = newItem.amenities.split(',').map((s: string) => s.trim());
                    }
                    // Handle Days Array for Plans (basic string parsing if applicable, otherwise keep empty)
                    if (activeTab === 'plans') {
                        newItem.days = []; // Reset days for safety as complex objects in CSV are tricky
                    }

                    if (activeTab === 'locations') addMasterLocation(newItem);
                    else if (activeTab === 'hotels') addMasterHotel(newItem);
                    else if (activeTab === 'activities') addMasterActivity(newItem);
                    else if (activeTab === 'transports') addMasterTransport(newItem);
                    else if (activeTab === 'plans') addMasterPlan(newItem);
                    else if (activeTab === 'room-types') addMasterRoomType(newItem);
                    else if (activeTab === 'meal-plans') addMasterMealPlan(newItem);
                    else if (activeTab === 'lead-sources') addMasterLeadSource(newItem);
                    else if (activeTab === 'terms') addMasterTermsTemplate(newItem);
                    count++;
                });

                toast.success(`Successfully imported ${count} items into ${activeTab}.`);
                if (fileInputRef.current) fileInputRef.current.value = '';

            } catch (err) {
                toast.error('Failed to import: ' + (err as Error).message);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleOpenModal = (item?: any) => {
        setEditingItem(item || null);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingItem(null);
    };

    // --- Data Processing ---
    const getProcessedData = () => {
        let data: any[] = [];
        switch (activeTab) {
            case 'locations': data = masterLocations; break;
            case 'hotels': data = masterHotels; break;
            case 'activities': data = masterActivities; break;
            case 'transports': data = masterTransports; break;
            case 'plans': data = masterPlans; break;
            case 'room-types': data = masterRoomTypes; break;
            case 'meal-plans': data = masterMealPlans; break;
            case 'lead-sources': data = masterLeadSources; break;
            case 'terms': data = masterTermsTemplates; break;
            default: return [];
        }

        // Filter
        data = data.filter(item => {
            const searchableFields = [
                item.name, item.title, item.region, item.type, item.category, item.code, item.description
            ].filter(Boolean).map(String).join(' ').toLowerCase();

            const matchesSearch = searchableFields.includes(debouncedSearchQuery.toLowerCase());

            const matchesStatus = filterStatus === 'All' || item.status === filterStatus;

            return matchesSearch && matchesStatus;
        });

        // Sort
        data.sort((a, b) => {
            const valA = a[sortBy] || a.title || a.name || a.code || '';
            const valB = b[sortBy] || b.title || b.name || b.code || '';

            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortDir === 'asc' ? valA - valB : valB - valA;
            }
            // Fallback for mixed types or undefined
            return 0;
        });

        return data;
    };

    const processedData = getProcessedData();

    // --- Analytics Tab Component ---
    const AnalyticsView = () => {
        const totalItems = masterLocations.length + masterHotels.length + masterActivities.length + masterTransports.length + masterPlans.length + masterRoomTypes.length + masterMealPlans.length + masterLeadSources.length + masterTermsTemplates.length;

        const expensiveHotels = masterHotels.filter(h => h.pricePerNight > 10000).length;
        const midRangeHotels = masterHotels.filter(h => h.pricePerNight >= 5000 && h.pricePerNight <= 10000).length;
        const budgetHotels = masterHotels.filter(h => h.pricePerNight < 5000).length;

        const catCounts: Record<string, number> = {};
        masterActivities.forEach(a => {
            catCounts[a.category] = (catCounts[a.category] || 0) + 1;
        });

        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Total Master Data', value: totalItems, icon: 'database', color: 'from-blue-500 to-indigo-600' },
                        { label: 'Active Locations', value: masterLocations.filter(l => l.status === 'Active').length, icon: 'location_on', color: 'from-emerald-500 to-teal-600' },
                        { label: 'Hotel Partners', value: masterHotels.length, icon: 'hotel', color: 'from-amber-500 to-orange-600' },
                        { label: 'Plan Templates', value: masterPlans.length, icon: 'map', color: 'from-purple-500 to-pink-600' },
                    ].map((kpi, i) => (
                        <div key={i} className="bg-white dark:bg-[#151d29] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all">
                            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${kpi.color} opacity-10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 transition-transform group-hover:scale-150 duration-700`} />
                            <div className="flex justify-between items-start mb-4 relative">
                                <div className={`size-12 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center text-white shadow-lg`}>
                                    <span className="material-symbols-outlined">{kpi.icon}</span>
                                </div>
                            </div>
                            <div className="relative">
                                <h3 className="text-4xl kpi-number text-slate-900 dark:text-white">{kpi.value}</h3>
                                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-1">{kpi.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white dark:bg-[#151d29] p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500">pie_chart</span>
                            Hotel Price Segmentation
                        </h3>
                        <div className="flex items-end justify-between h-48 gap-4 px-4">
                            {[
                                { label: 'Budget (Below 5k)', count: budgetHotels, color: 'bg-emerald-400' },
                                { label: 'Mid (5k-10k)', count: midRangeHotels, color: 'bg-blue-400' },
                                { label: 'Luxury (Above 10k)', count: expensiveHotels, color: 'bg-purple-400' }
                            ].map((item, i) => {
                                const max = Math.max(budgetHotels, midRangeHotels, expensiveHotels, 1);
                                const height = (item.count / max) * 100;
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-3">
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-xl relative h-full flex items-end overflow-hidden group">
                                            <div style={{ height: `${height}%` }} className={`w-full ${item.color} rounded-t-xl opacity-80 group-hover:opacity-100 transition-all relative`}>
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 font-bold text-slate-900 dark:text-white">{item.count}</div>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-slate-500 text-center">{item.label}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#151d29] p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-orange-500">attractions</span>
                            Activity Distribution
                        </h3>
                        <div className="space-y-4">
                            {Object.entries(catCounts).map(([cat, count], i) => (
                                <div key={i} className="space-y-1">
                                    <div className="flex justify-between text-xs font-bold uppercase tracking-wide">
                                        <span className="text-slate-600 dark:text-slate-300">{cat}</span>
                                        <span className="text-slate-400">{count} activities</span>
                                    </div>
                                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            style={{ width: `${(count / masterActivities.length) * 100}%` }}
                                            className={`h-full rounded-full ${['bg-orange-400', 'bg-pink-400', 'bg-cyan-400', 'bg-lime-400'][i % 4]}`}
                                        />
                                    </div>
                                </div>
                            ))}
                            {Object.keys(catCounts).length === 0 && <p className="text-slate-500 italic">No activities found.</p>}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- Shared Components (FilterBar, BulkActionBar kept same) ---


    const BulkActionBar = () => {
        if (selectedItems.size === 0) return null;
        return (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-4 duration-200">
                <span className="font-bold flex items-center gap-2">
                    <span className="bg-indigo-500 text-white text-xs px-2 py-0.5 rounded-full">{selectedItems.size}</span>
                    <span className="text-sm">Selected</span>
                </span>
                <div className="h-4 w-px bg-white/20 dark:bg-black/10"></div>
                <div className="flex items-center gap-2">
                    <button onClick={() => bulkUpdateStatus('Active')} className="px-3 py-1.5 rounded-lg hover:bg-white/10 dark:hover:bg-black/5 text-sm font-semibold transition-colors flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">check_circle</span> Activate
                    </button>
                    <button onClick={() => bulkUpdateStatus('Inactive')} className="px-3 py-1.5 rounded-lg hover:bg-white/10 dark:hover:bg-black/5 text-sm font-semibold transition-colors flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">block</span> Deactivate
                    </button>
                    <button onClick={confirmBulkDelete} className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 dark:bg-red-500 dark:hover:bg-red-600 text-white text-sm font-semibold transition-colors flex items-center gap-2 ml-2 shadow-lg shadow-red-500/30">
                        <span className="material-symbols-outlined text-[18px]">delete</span> Delete
                    </button>
                </div>
                <button onClick={() => setSelectedItems(new Set())} className="ml-2 hover:bg-white/10 p-1 rounded-full">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
            </div>
        );
    };

    // --- Renderers for Tab Content ---

    const renderCard = (item: any, type: MasterTab) => {
        const isSelected = selectedItems.has(item.id);
        const usage = getUsageCount(item.id, type);

        let icon: React.ReactNode = <span className="material-symbols-outlined">inventory_2</span>;
        let detail = '';
        let subtitle = '';
        let price = '';
        let title = item.name || item.title;

        switch (type) {
            case 'locations':
                icon = <span className="material-symbols-outlined">location_on</span>;
                subtitle = item.region;
                detail = item.type;
                break;
            case 'hotels':
                icon = <span className="material-symbols-outlined">hotel</span>;
                subtitle = getLocationNameById(item.locationId);
                detail = `${item.rating} Stars`;
                price = `₹${item.pricePerNight?.toLocaleString()}`;
                break;
            case 'activities':
                icon = <span className="material-symbols-outlined">attractions</span>;
                subtitle = getLocationNameById(item.locationId);
                detail = `${item.category || 'Leisure'} • ${item.duration || ''}`;
                price = `₹${item.cost?.toLocaleString()}`;
                break;
            case 'transports':
                icon = <span className="material-symbols-outlined">directions_car</span>;
                subtitle = `${item.capacity} Seats`;
                detail = item.type;
                price = `₹${item.baseRate?.toLocaleString()}`;
                break;
            case 'plans':
                icon = <span className="material-symbols-outlined">map</span>;
                subtitle = `${item.duration} Days`;
                detail = getLocationNameById(item.locationId);
                price = `₹${item.estimatedCost?.toLocaleString()}`;
                break;
            case 'room-types':
                icon = <BedDouble size={20} />;
                subtitle = item.description;
                detail = '';
                break;
            case 'meal-plans':
                icon = <Utensils size={20} />;
                subtitle = item.name;
                detail = item.code;
                break;
            case 'lead-sources':
                icon = <Globe size={20} />;
                subtitle = item.category;
                detail = '';
                break;
            case 'terms':
                icon = <FileText size={20} />;
                subtitle = item.category;
                detail = item.isDefault ? 'Default' : '';
                break;
        }

        return (
            <div
                key={item.id}
                onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input[type="checkbox"]')) return;
                    handleSelectOne(item.id);
                }}
                className={`
                    relative group bg-white dark:bg-[#151d29] rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer
                    ${isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-xl'
                        : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg'
                    }
                `}
            >
                {/* Selection & Status */}
                <div className="absolute top-4 left-4 z-10 w-full flex justify-between pr-8">
                    <div
                        onClick={(e) => { e.stopPropagation(); handleSelectOne(item.id); }}
                        className={`size-6 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-indigo-400'}`}
                    >
                        {isSelected && <span className="material-symbols-outlined text-white text-[16px]">check</span>}
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase backdrop-blur-md ${item.status === 'Active' ? 'bg-green-100/90 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-slate-100/90 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400'}`}>
                        {item.status}
                    </span>
                </div>

                <div className="p-6 pt-12">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight mb-1">{title}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{subtitle}</p>
                        </div>
                        <div className="size-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 group-hover:scale-110 transition-all">
                            {icon}
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-sm mb-3">
                        {detail && (
                            <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                                {detail}
                            </span>
                        )}
                        {price && <span className="font-bold text-slate-900 dark:text-white">{price}</span>}
                    </div>

                    {/* Usage/Relations Chip */}
                    {usage.total > 0 && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold" title={usage.details}>
                            <span className="material-symbols-outlined text-[14px]">link</span>
                            {usage.details.split(',')[0]}
                        </div>
                    )}
                </div>

                {/* Actions Overlay */}
                <div className={`absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-white via-white to-transparent dark:from-[#151d29] dark:via-[#151d29] flex gap-2 justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${isSelected ? 'opacity-100' : ''}`}>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }}
                        className="flex-1 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                    >
                        Edit
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDuplicate(item); }}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        title="Duplicate"
                    >
                        <span className="material-symbols-outlined text-[18px]">content_copy</span>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to delete this item?')) {
                                if (type === 'locations') deleteMasterLocation(item.id);
                                else if (type === 'hotels') deleteMasterHotel(item.id);
                                else if (type === 'activities') deleteMasterActivity(item.id);
                                else if (type === 'transports') deleteMasterTransport(item.id);
                                else if (type === 'plans') deleteMasterPlan(item.id);
                                else if (type === 'room-types') deleteMasterRoomType(item.id);
                                else if (type === 'meal-plans') deleteMasterMealPlan(item.id);
                                else if (type === 'lead-sources') deleteMasterLeadSource(item.id);
                                else if (type === 'terms') deleteMasterTermsTemplate(item.id);
                                toast.success('Item deleted successfully!');
                            }
                        }}
                        className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                </div>
            </div>
        );
    };

    const renderListView = () => (
        <div className="bg-white dark:bg-[#151d29] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm animate-in fade-in">
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[640px]">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                        <th className="px-6 py-4 w-12">
                            <input
                                type="checkbox"
                                checked={processedData.length > 0 && selectedItems.size === processedData.length}
                                onChange={() => handleSelectAll(processedData)}
                                className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                        </th>
                        <th className="px-4 sm:px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs w-20">Image</th>
                        <th className="px-4 sm:px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Name/Title</th>
                        <th className="px-4 sm:px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Details</th>
                        <th className="hidden sm:table-cell px-4 sm:px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Relations</th>
                        <th className="px-4 sm:px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Status</th>
                        <th className="hidden sm:table-cell px-4 sm:px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {processedData.length > 0 ? processedData.map((item) => {
                        const isSelected = selectedItems.has(item.id);
                        const usage = getUsageCount(item.id, activeTab as MasterTab);

                        let detailsContent;
                        switch (activeTab) {
                            case 'locations':
                                detailsContent = (
                                    <div className="flex flex-col">
                                        <span>{item.type}</span>
                                        <span className="text-xs text-slate-400">{item.region}</span>
                                    </div>
                                );
                                break;
                            case 'hotels':
                                detailsContent = (
                                    <div className="flex flex-col">
                                        <span>{item.rating} Stars</span>
                                        <span className="text-xs text-slate-400">{getLocationNameById(item.locationId)}</span>
                                        {item.address && <span className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.address}</span>}
                                    </div>
                                );
                                break;
                            case 'activities':
                                detailsContent = (
                                    <div className="flex flex-col">
                                        <span>{item.category || 'Leisure'}</span>
                                        <span className="text-xs text-slate-400">{getLocationNameById(item.locationId)}</span>
                                    </div>
                                );
                                break;
                            case 'transports':
                                detailsContent = (
                                    <div className="flex flex-col">
                                        <span>{item.type}</span>
                                        <span className="text-xs text-slate-400">{item.capacity} Seats</span>
                                    </div>
                                );
                                break;
                            case 'plans':
                                detailsContent = (
                                    <div className="flex flex-col">
                                        <span>{item.duration} Days</span>
                                        <span className="text-xs text-slate-400">{getLocationNameById(item.locationId)}</span>
                                    </div>
                                );
                                break;
                            case 'room-types':
                                detailsContent = <span className="line-clamp-2">{item.description}</span>;
                                break;
                            case 'meal-plans':
                                detailsContent = (
                                    <div className="flex flex-col">
                                        <span className="font-bold">{item.code} - {item.name}</span>
                                        <span className="text-xs text-slate-400 line-clamp-1">{item.description}</span>
                                    </div>
                                );
                                break;
                            case 'lead-sources':
                                detailsContent = <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-xs font-medium">{item.category}</span>;
                                break;
                            case 'terms':
                                detailsContent = (
                                    <div className="flex flex-col">
                                        <span>{item.category}</span>
                                        {item.isDefault && <span className="text-xs text-indigo-500 font-bold">Default Template</span>}
                                    </div>
                                );
                                break;
                            default:
                                detailsContent = <span className="text-slate-500">-</span>;
                        }

                        return (
                            <tr key={item.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                                <td className="px-6 py-4">
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleSelectOne(item.id)}
                                        className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                </td>
                                <td className="px-4 sm:px-6 py-4">
                                    <div className="size-10 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
                                        {item.image ? (
                                            <img src={item.image} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                <span className="material-symbols-outlined text-lg">image</span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 sm:px-6 py-4">
                                    <p className="font-bold text-slate-900 dark:text-white">{item.name || item.title}</p>
                                </td>
                                <td className="px-4 sm:px-6 py-4 text-slate-600 dark:text-slate-300">
                                    {detailsContent}
                                </td>
                                <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-slate-500">
                                    {usage.total > 0 ? (
                                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-xs font-medium">
                                            <span className="material-symbols-outlined text-[14px]">link</span> {usage.total} linked
                                        </span>
                                    ) : (
                                        <span className="text-xs text-slate-400">-</span>
                                    )}
                                </td>
                                <td className="px-4 sm:px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${item.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 text-slate-400'}`}>
                                        {item.status}
                                    </span>
                                </td>
                                <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => handleDuplicate(item)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Duplicate">
                                            <span className="material-symbols-outlined text-[18px]">content_copy</span>
                                        </button>
                                        <button onClick={() => handleOpenModal(item)} className="p-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors">
                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('Are you sure you want to delete this item?')) {
                                                    if (activeTab === 'locations') deleteMasterLocation(item.id);
                                                    else if (activeTab === 'hotels') deleteMasterHotel(item.id);
                                                    else if (activeTab === 'activities') deleteMasterActivity(item.id);
                                                    else if (activeTab === 'transports') deleteMasterTransport(item.id);
                                                    else if (activeTab === 'plans') deleteMasterPlan(item.id);
                                                    else if (activeTab === 'room-types') deleteMasterRoomType(item.id);
                                                    else if (activeTab === 'meal-plans') deleteMasterMealPlan(item.id);
                                                    else if (activeTab === 'lead-sources') deleteMasterLeadSource(item.id);
                                                    else if (activeTab === 'terms') deleteMasterTermsTemplate(item.id);
                                                    toast.success('Item deleted successfully!');
                                                }
                                            }}
                                            className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    }) : (
                        <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                <div className="flex flex-col items-center gap-2">
                                    <span className="material-symbols-outlined text-4xl opacity-20">search_off</span>
                                    <p>No items found matching your filters.</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
            </div>
        </div>
    );

    return (
        <div className="admin-page-bg min-h-screen">
            <div className="p-6 lg:p-10 max-w-[1800px] mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white"><span className="font-display text-4xl">Master Data Manager</span></h1>
                        <p className="text-slate-500 mt-1 font-medium">Centralized control for all tour components</p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95 btn-glow"
                    >
                        <span className="material-symbols-outlined">add</span>
                        <span>Add New</span>
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex flex-wrap gap-2 p-2 bg-white dark:bg-[#151d29] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all flex-1 md:flex-none justify-center ${activeTab === tab.id
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg'
                                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            {typeof tab.icon === 'string' ? <span className="material-symbols-outlined text-[20px]">{tab.icon}</span> : tab.icon}
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-white/20 text-white dark:bg-slate-900/10 dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Controls */}
                {activeTab === 'analytics' ? (
                    <AnalyticsView />
                ) : (
                    <>
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-[#151d29] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in slide-in-from-top-2">
                            <div className="flex flex-1 items-center gap-3 w-full md:w-auto">

                                <>
                                    <div className="relative flex-1 md:max-w-xs">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[20px]">search</span>
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            placeholder="Search..."
                                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                        />
                                    </div>

                                    <select
                                        value={filterStatus}
                                        onChange={e => setFilterStatus(e.target.value as any)}
                                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    >
                                        <option value="All">All Status</option>
                                        <option value="Active">Active Only</option>
                                        <option value="Inactive">Inactive Only</option>
                                    </select>
                                </>



                                <div className="hidden md:flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-3">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        <span className="material-symbols-outlined">grid_view</span>
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        <span className="material-symbols-outlined">view_list</span>
                                    </button>
                                </div>

                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto justify-end">

                                <div className="flex items-center gap-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept=".json,.csv"
                                        className="hidden"
                                    />
                                    <button onClick={handleImportClick} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors border border-dashed border-slate-300 dark:border-slate-600">
                                        <span className="material-symbols-outlined text-[16px]">upload</span> Import
                                    </button>
                                    <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors border border-slate-200 dark:border-slate-700">
                                        <span className="material-symbols-outlined text-[16px]">download</span> Export
                                    </button>
                                </div>



                                <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700 pl-3">
                                    <span>Sort:</span>
                                    <select
                                        value={sortBy}
                                        onChange={e => setSortBy(e.target.value)}
                                        className="bg-transparent font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer hover:underline"
                                    >
                                        <option value={activeTab === 'plans' || activeTab === 'terms' ? 'title' : activeTab === 'meal-plans' ? 'code' : 'name'}>Name</option>
                                        {(activeTab === 'hotels' || activeTab === 'activities' || activeTab === 'transports') && <option value={activeTab === 'hotels' ? 'pricePerNight' : activeTab === 'transports' ? 'baseRate' : 'cost'}>Price</option>}
                                        <option value="status">Status</option>
                                        {activeTab === 'locations' && <option value="type">Type</option>}
                                        {activeTab === 'hotels' && <option value="rating">Rating</option>}
                                        {activeTab === 'activities' && <option value="category">Category</option>}
                                        {activeTab === 'transports' && <option value="capacity">Capacity</option>}
                                        {activeTab === 'plans' && <option value="duration">Duration</option>}
                                        {activeTab === 'lead-sources' && <option value="category">Category</option>}
                                        {activeTab === 'terms' && <option value="category">Category</option>}
                                    </select>
                                    <button onClick={() => setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                                        <span className="material-symbols-outlined text-[16px]">{sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>
                                    </button>
                                </div>

                            </div>
                        </div>

                        {/* Content Area */}
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                                {processedData.length > 0 ? (
                                    processedData.map((item) => renderCard(item, activeTab))
                                ) : (
                                    <div className="col-span-full py-20 text-center">
                                        <div className="size-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <span className="material-symbols-outlined text-4xl text-slate-300">search_off</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">No items found</h3>
                                        <p className="text-slate-500">Try adjusting your filters or search query.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            renderListView()
                        )}
                    </>
                )}

                {/* Bulk Action Bar */}
                {activeTab !== 'analytics' && <BulkActionBar />}

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 p-8 animate-in fade-in" onClick={handleCloseModal}>
                        <div className="bg-white dark:bg-[#1a2332] rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 sticky top-0 backdrop-blur-md z-10">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editingItem ? 'Edit' : 'Add New'} {tabs.find(t => t.id === activeTab)?.label.replace(' Templates', '').replace('s', '') || 'Item'}</h2>
                                <button onClick={handleCloseModal} className="size-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                            </div>
                            <div className="p-6">
                                <MasterModal activeTab={activeTab} editingItem={editingItem} onClose={handleCloseModal} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
