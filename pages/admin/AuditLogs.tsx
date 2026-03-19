
import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
    Search, Filter, Download, Calendar,
    User, Activity, FileText, ChevronDown,
    ChevronLeft, ChevronRight, ShieldAlert,
    Clock, Database
} from 'lucide-react';
import * as XLSX from 'xlsx';

// Badge component for different action types
const ActionBadge = ({ action }: { action: string }) => {
    const styles: Record<string, string> = {
        'Create': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        'Update': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        'Delete': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        'Login': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        'Export': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    };

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${styles[action] || 'bg-slate-100 text-slate-600'}`}>
            {action}
        </span>
    );
};

export const AuditLogs: React.FC = () => {
    const { auditLogs } = useData();
    const { currentUser } = useAuth();

    // UI State
    const [search, setSearch] = useState('');
    const [filterModule, setFilterModule] = useState<string>('All');
    const [filterAction, setFilterAction] = useState<string>('All');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    // Derived Data
    const uniqueModules = useMemo(() => ['All', ...Array.from(new Set(auditLogs.map(log => log.module)))], [auditLogs]);
    const uniqueActions = ['All', 'Create', 'Update', 'Delete', 'Login', 'Export', 'Other'];

    const filteredLogs = useMemo(() => {
        return auditLogs.filter(log => {
            const matchesSearch =
                log.details?.toLowerCase().includes(search.toLowerCase()) ||
                log.performedBy?.toLowerCase().includes(search.toLowerCase()) ||
                log.id?.toLowerCase().includes(search.toLowerCase());

            const matchesModule = filterModule === 'All' || log.module === filterModule;
            const matchesAction = filterAction === 'All' || log.action === filterAction;

            return matchesSearch && matchesModule && matchesAction;
        }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [auditLogs, search, filterModule, filterAction]);

    // Pagination
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleExport = () => {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(filteredLogs.map(log => ({
            ID: log.id,
            Timestamp: new Date(log.timestamp).toLocaleString(),
            Action: log.action,
            Module: log.module,
            User: log.performedBy || 'System',
            Details: log.details
        })));
        XLSX.utils.book_append_sheet(wb, ws, "Audit Logs");
        XLSX.writeFile(wb, `Audit_Logs_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="flex flex-col h-full admin-page-bg">
            {/* Header */}
            <div className="px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3 font-display text-4xl">
                        <ShieldAlert className="text-primary" size={32} />
                        System Audit Logs
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Track system activities, security events, and data changes.
                    </p>
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 bg-white dark:bg-[#1A2633] text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm btn-glow"
                >
                    <Download size={18} /> Export Excel
                </button>
            </div>

            {/* Filters Toolbar */}
            <div className="px-8 pb-6">
                <div className="bg-white dark:bg-[#1A2633] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search logs by user, action, or details..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex gap-3 overflow-x-auto pb-1 lg:pb-0">
                        <div className="relative min-w-[140px]">
                            <select
                                value={filterModule}
                                onChange={(e) => setFilterModule(e.target.value)}
                                className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-2.5 pl-4 pr-10 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                            >
                                {uniqueModules.map(m => <option key={m} value={m}>{m} Module</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>

                        <div className="relative min-w-[140px]">
                            <select
                                value={filterAction}
                                onChange={(e) => setFilterAction(e.target.value)}
                                className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-2.5 pl-4 pr-10 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                            >
                                {uniqueActions.map(a => <option key={a} value={a}>{a} Actions</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="flex-1 px-8 pb-8 overflow-hidden flex flex-col">
                <div className="bg-white dark:bg-[#1A2633] border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm flex-1 flex flex-col overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">
                        <div className="col-span-3">Timestamp / User</div>
                        <div className="col-span-2">Module</div>
                        <div className="col-span-2">Action</div>
                        <div className="col-span-5">Details</div>
                    </div>

                    {/* Table Body */}
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                        {paginatedLogs.length > 0 ? (
                            paginatedLogs.map((log) => (
                                <div key={log.id} className="grid grid-cols-12 px-6 py-4 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <div className="col-span-3">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                <Clock size={14} className="text-slate-400" />
                                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                                                    {new Date(log.timestamp).toLocaleDateString()}
                                                </span>
                                            </span>
                                            <span className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                <User size={12} /> {log.performedBy || 'System'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                            {log.module}
                                        </span>
                                    </div>
                                    <div className="col-span-2">
                                        <ActionBadge action={log.action} />
                                    </div>
                                    <div className="col-span-5 relative">
                                        <p className="text-sm text-slate-600 dark:text-slate-300 truncate pr-4" title={log.details}>
                                            {log.details}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                <FileText size={48} className="mb-4 opacity-20" />
                                <p className="font-medium">No audit logs found matching your filters.</p>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between shrink-0">
                        <p className="text-xs font-bold text-slate-500">
                            Showing {Math.min(filteredLogs.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredLogs.length, currentPage * itemsPerPage)} of {filteredLogs.length} logs
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                Page {currentPage} of {Math.max(1, totalPages)}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
