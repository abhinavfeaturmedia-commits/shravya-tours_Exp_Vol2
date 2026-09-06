import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../src/lib/api';
import { AuditLog } from '../../types';
import { 
  History, Clock, AlertTriangle, Info, ShieldAlert, ArrowRight, 
  RotateCw, User, Tag, IndianRupee, Users, CheckCircle2, FileText, ChevronRight
} from 'lucide-react';

interface EntityAuditTimelineProps {
  entityType: 'lead' | 'booking';
  entityId: string;
  title?: string;
  className?: string;
  onAuditUpdated?: () => void;
}

export const EntityAuditTimeline: React.FC<EntityAuditTimelineProps> = ({
  entityType,
  entityId,
  title = 'Staff Activity & Accountability Trail',
  className = '',
  onAuditUpdated,
}) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrail = useCallback(async (isRefresh = false) => {
    if (!entityId) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await api.getEntityAuditTrail(entityType, entityId);
      setLogs(data);
      if (onAuditUpdated) onAuditUpdated();
    } catch (err: any) {
      console.error('[EntityAuditTimeline] Failed to load audit trail:', err);
      setError(err.message || 'Failed to load activity logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [entityType, entityId, onAuditUpdated]);

  useEffect(() => {
    fetchTrail();
  }, [fetchTrail]);

  // Format date helper
  const formatTimestamp = (iso: string) => {
    if (!iso) return 'Just now';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
      }).format(d);
    } catch {
      return iso;
    }
  };

  const getRelativeTime = (iso: string) => {
    try {
      const diffSec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
      if (diffSec < 45) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return `${Math.floor(diffSec / 86400)}d ago`;
    } catch {
      return '';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-900">
            <ShieldAlert className="w-3 h-3" />
            Critical
          </span>
        );
      case 'Warning':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900">
            <AlertTriangle className="w-3 h-3" />
            Warning
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded-full">
            <Info className="w-3 h-3 text-blue-500" />
            Info
          </span>
        );
    }
  };

  const renderFieldDiff = (fieldName: string, diff: { old: any; new: any }) => {
    const formatVal = (v: any) => {
      if (v === null || v === undefined || v === '') return <span className="italic text-slate-400">Empty</span>;
      if (typeof v === 'object') return JSON.stringify(v);
      return String(v);
    };

    let icon = <Tag className="w-3 h-3 text-slate-400" />;
    if (fieldName.toLowerCase().includes('price') || fieldName.toLowerCase().includes('amount')) {
      icon = <IndianRupee className="w-3 h-3 text-emerald-500" />;
    } else if (fieldName.toLowerCase().includes('staff') || fieldName.toLowerCase().includes('assign')) {
      icon = <Users className="w-3 h-3 text-blue-500" />;
    } else if (fieldName.toLowerCase().includes('status')) {
      icon = <CheckCircle2 className="w-3 h-3 text-purple-500" />;
    }

    return (
      <div key={fieldName} className="flex flex-wrap items-center gap-2 py-1 text-xs border-b border-slate-100/60 dark:border-slate-800/40 last:border-none">
        <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 min-w-[110px] capitalize">
          {icon}
          {fieldName.replace(/_/g, ' ')}:
        </span>
        <span className="inline-flex items-center gap-1 line-through text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded text-[11px] font-mono">
          {formatVal(diff.old)}
        </span>
        <ArrowRight className="w-3 h-3 text-slate-400" />
        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded text-[11px] font-mono">
          {formatVal(diff.new)}
        </span>
      </div>
    );
  };

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {title}
              <span className="text-xs font-semibold px-2 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                {logs.length}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Complete chronological record of which staff member performed what modifications
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchTrail(true)}
          disabled={loading || refreshing}
          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          title="Refresh activity logs"
        >
          <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-8 text-center space-y-2">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading audit history...</p>
        </div>
      ) : error ? (
        <div className="py-6 text-center text-xs text-red-500">
          {error}
        </div>
      ) : logs.length === 0 ? (
        <div className="py-10 text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Clock className="w-5 h-5" />
          </div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
            No modification history recorded yet
          </p>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            All future actions (price adjustments, team reassignments, status transitions) made by any staff will be tracked here.
          </p>
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {logs.map((log) => {
            const parsedChanges = typeof log.changes === 'string'
              ? (() => { try { return JSON.parse(log.changes); } catch { return null; } })()
              : log.changes;

            const hasFieldDiffs = parsedChanges && typeof parsedChanges === 'object' && Object.keys(parsedChanges).length > 0;

            return (
              <div key={log.id} className="relative group">
                {/* Bullet indicator */}
                <div className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 bg-blue-500 ring-2 ring-blue-500/20 group-hover:scale-125 transition-transform" />

                <div className="bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors border border-slate-200/70 dark:border-slate-800 rounded-xl p-3">
                  {/* Top row: Staff identification & timestamp */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                        {(log.staffName || log.performedBy || 'S').charAt(0)}
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {log.staffName || log.performedBy || 'Staff Member'}
                      </span>
                      {log.staffId && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold">
                          Staff #{log.staffId}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {getSeverityBadge(log.severity)}
                      <span className="text-[11px] text-slate-400 flex items-center gap-1" title={log.timestamp}>
                        <Clock className="w-3 h-3" />
                        {getRelativeTime(log.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Action & Details */}
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-medium mb-1">
                    <span className="font-semibold text-slate-900 dark:text-white mr-1.5">
                      {log.action}:
                    </span>
                    {log.details}
                  </div>

                  {/* Field Diffs (if available) */}
                  {hasFieldDiffs && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 bg-white/50 dark:bg-slate-900/40 p-2.5 rounded-lg">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-blue-500" />
                        Field Level Modifications
                      </div>
                      <div className="space-y-0.5">
                        {Object.entries(parsedChanges).map(([field, diff]) =>
                          renderFieldDiff(field, diff as any)
                        )}
                      </div>
                    </div>
                  )}

                  {/* Exact Timestamp footer */}
                  <div className="mt-1.5 text-[10px] text-slate-400 font-mono">
                    {formatTimestamp(log.timestamp)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
