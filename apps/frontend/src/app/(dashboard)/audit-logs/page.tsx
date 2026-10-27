'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileJson,
  X,
  Activity,
  Layers,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { formatDate } from '../../../lib/utils';
import { Badge } from '../../../components/ui/badge';
import type { AuditLogItem } from '@titipin/shared';

const ACTION_OPTIONS = [
  { label: 'Semua Aksi', value: '' },
  { label: 'AUTH_LOGIN', value: 'AUTH_LOGIN' },
  { label: 'AUTH_LOGOUT', value: 'AUTH_LOGOUT' },
  { label: 'ORDER_CREATED', value: 'ORDER_CREATED' },
  { label: 'ORDER_HELD', value: 'ORDER_HELD' },
  { label: 'ORDER_RESUMED', value: 'ORDER_RESUMED' },
  { label: 'PRODUCT_CREATED', value: 'PRODUCT_CREATED' },
  { label: 'PRODUCT_UPDATED', value: 'PRODUCT_UPDATED' },
  { label: 'PRODUCT_DELETED', value: 'PRODUCT_DELETED' },
  { label: 'CUSTOMER_CREATED', value: 'CUSTOMER_CREATED' },
  { label: 'CUSTOMER_UPDATED', value: 'CUSTOMER_UPDATED' },
  { label: 'CUSTOMER_DELETED', value: 'CUSTOMER_DELETED' },
  { label: 'USER_CREATED', value: 'USER_CREATED' },
  { label: 'USER_DEACTIVATED', value: 'USER_DEACTIVATED' },
];

const ENTITY_OPTIONS = [
  { label: 'Semua Entitas', value: '' },
  { label: 'ORDER', value: 'ORDER' },
  { label: 'PRODUCT', value: 'PRODUCT' },
  { label: 'CUSTOMER', value: 'CUSTOMER' },
  { label: 'USER', value: 'USER' },
  { label: 'AUTH', value: 'AUTH' },
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Selected Log for Diff Modal
  const [selectedLogForDiff, setSelectedLogForDiff] = useState<AuditLogItem | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        per_page: perPage,
      };

      if (selectedAction) params.action = selectedAction;
      if (selectedEntity) params.entity_type = selectedEntity;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      const res = await apiClient.get('/audit-logs', { params });
      const items = res.data?.data?.items || (Array.isArray(res.data?.data) ? res.data?.data : []);
      const meta = res.data?.data?.meta || res.data?.meta || {};

      setLogs(items);
      setTotalRecords(meta.total || items.length);
      setTotalPages(meta.totalPages || meta.total_pages || Math.ceil((meta.total || items.length) / perPage) || 1);
    } catch (err) {
      console.error('Failed to load audit logs', err);
      setLogs([]);
      setTotalRecords(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, perPage, selectedAction, selectedEntity, fromDate, toDate]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleFilterChange = (setter: (val: string) => void, val: string) => {
    setter(val);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSelectedAction('');
    setSelectedEntity('');
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
  };

  // Helper for action badge coloring
  const getActionBadgeVariant = (action: string): 'success' | 'warning' | 'destructive' | 'info' | 'neutral' => {
    if (action.includes('CREATE') || action.includes('LOGIN')) return 'success';
    if (action.includes('UPDATE') || action.includes('HELD') || action.includes('RESUME')) return 'warning';
    if (action.includes('DELETE') || action.includes('DEACTIVATE')) return 'destructive';
    return 'neutral';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-emerald-700" />
            <span>Audit Trail & Log Aktivitas Sistem</span>
          </h1>
          <p className="text-xs text-slate-500 sm:text-sm">
            Catatan mutasi data, riwayat autentikasi, dan kepatuhan sistem keamanan (Admin Only).
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAuditLogs}
          disabled={isLoading}
          className="glass-button flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Segarkan</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel p-4 rounded-2xl space-y-3 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Action Filter */}
          <div className="relative">
            <Activity className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <select
              aria-label="Filter Aksi"
              value={selectedAction}
              onChange={(e) => handleFilterChange(setSelectedAction, e.target.value)}
              className="glass-input pl-9 pr-3 py-2 text-xs w-full appearance-none bg-white"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Entity Filter */}
          <div className="relative">
            <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <select
              aria-label="Filter Entitas"
              value={selectedEntity}
              onChange={(e) => handleFilterChange(setSelectedEntity, e.target.value)}
              className="glass-input pl-9 pr-3 py-2 text-xs w-full appearance-none bg-white"
            >
              {ENTITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date from */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              aria-label="Dari Tanggal"
              value={fromDate}
              onChange={(e) => handleFilterChange(setFromDate, e.target.value)}
              className="glass-input pl-9 pr-3 py-2 text-xs w-full"
            />
          </div>

          {/* Date to */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              aria-label="Sampai Tanggal"
              value={toDate}
              onChange={(e) => handleFilterChange(setToDate, e.target.value)}
              className="glass-input pl-9 pr-3 py-2 text-xs w-full"
            />
          </div>
        </div>

        {(selectedAction || selectedEntity || fromDate || toDate) && (
          <div className="flex items-center justify-end pt-1">
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:text-rose-800 font-medium transition-colors"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Pengguna</th>
                <th className="py-3 px-4 text-center">Aksi</th>
                <th className="py-3 px-4">Entitas</th>
                <th className="py-3 px-4">IP & Client</th>
                <th className="py-3 px-4 text-center">Mutasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>Memuat catatan audit log...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <ShieldAlert className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">Tidak ada log aktivitas</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Catatan aktivitas pengguna akan muncul di sini secara otomatis.
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const createdAt = log.createdAt || log.created_at || '';
                  const userName = log.userName || log.user_name || 'Sistem / Anonim';
                  const action = log.action || 'ACTIVITY';
                  const entityType = log.entityType || log.entity_type || '-';
                  const entityId = log.entityId || log.entity_id || '';
                  const ip = log.ipAddress || log.ip_address || '-';

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-emerald-50/30 transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {createdAt ? formatDate(createdAt) : '-'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {userName}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge
                          variant={getActionBadgeVariant(action)}
                          className="px-2 py-0.5 text-[10px] font-mono"
                        >
                          {action}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        <span className="font-semibold text-slate-800">{entityType}</span>
                        {entityId ? ` #${entityId.slice(0, 8)}` : ''}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        {ip}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedLogForDiff(log)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors"
                        >
                          <FileJson className="h-3.5 w-3.5" />
                          <span>Lihat Diff</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!isLoading && logs.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-white/50 text-xs text-slate-500">
            <div>
              Menampilkan{' '}
              <span className="font-semibold text-slate-700">
                {(currentPage - 1) * perPage + 1}
              </span>{' '}
              -{' '}
              <span className="font-semibold text-slate-700">
                {Math.min(totalRecords, currentPage * perPage)}
              </span>{' '}
              dari{' '}
              <span className="font-semibold text-slate-700">{totalRecords}</span> aktivitas
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="glass-button p-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:text-slate-900"
                aria-label="Halaman Sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold text-xs">
                {currentPage} / {Math.max(1, totalPages)}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="glass-button p-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:text-slate-900"
                aria-label="Halaman Selanjutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Audit Diff Payload Modal */}
      {selectedLogForDiff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 max-w-2xl w-full bg-white shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileJson className="h-5 w-5 text-emerald-700" />
                  <span>Inspeksi Diff Mutasi Log #{selectedLogForDiff.id}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Aksi: <span className="font-mono font-bold text-slate-700">{selectedLogForDiff.action}</span> | Oleh: {selectedLogForDiff.userName || selectedLogForDiff.user_name || 'Sistem'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLogForDiff(null)}
                className="glass-button p-2 text-slate-500 hover:text-slate-800"
                aria-label="Tutup Modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 font-mono text-xs">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 block uppercase">
                  Payload JSON (Before vs After):
                </span>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-2xl overflow-x-auto text-[11px] leading-relaxed">
                  {JSON.stringify(selectedLogForDiff.payload || { info: 'Tidak ada diff payload rekaman.' }, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedLogForDiff(null)}
                className="glass-button px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
