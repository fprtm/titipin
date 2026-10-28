'use client';

import React, { useState } from 'react';
import {
  FileJson,
  X,
  Columns2,
  Code,
  Copy,
  Check,
  Activity,
  Layers,
  Globe,
  Clock,
  User,
} from 'lucide-react';
import { formatDate } from '../../lib/utils';
import type { AuditLogItem } from '@titipin/shared';

export interface AuditDetailModalProps {
  log: AuditLogItem | null;
  onClose: () => void;
}

export function AuditDetailModal({ log, onClose }: AuditDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'diff' | 'raw'>('diff');
  const [copied, setCopied] = useState(false);

  if (!log) return null;

  const payload = (log.payload as Record<string, unknown>) || {};
  const beforeObj =
    payload.before && typeof payload.before === 'object'
      ? (payload.before as Record<string, unknown>)
      : null;
  const afterObj =
    payload.after && typeof payload.after === 'object'
      ? (payload.after as Record<string, unknown>)
      : null;

  // Extract all property keys for comparison
  const propertyKeys: string[] = Array.from(
    new Set([
      ...(beforeObj ? Object.keys(beforeObj) : []),
      ...(afterObj ? Object.keys(afterObj) : []),
      ...(!beforeObj && !afterObj ? Object.keys(payload) : []),
    ]),
  );

  const handleCopyJson = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const renderValue = (val: unknown) => {
    if (val === null || val === undefined) {
      return <span className="text-slate-400 italic font-mono text-[11px]">null</span>;
    }
    if (typeof val === 'object') {
      return (
        <span className="font-mono text-[11px] text-slate-700">
          {JSON.stringify(val)}
        </span>
      );
    }
    if (typeof val === 'boolean') {
      return (
        <span className="font-mono text-[11px] font-semibold text-purple-700">
          {val ? 'true' : 'false'}
        </span>
      );
    }
    return <span className="font-mono text-[11px] text-slate-800">{String(val)}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="glass-panel rounded-3xl p-5 sm:p-7 max-w-3xl w-full bg-white shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3 gap-3">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileJson className="h-5 w-5 text-emerald-700 shrink-0" />
              <span>Inspeksi Diff Mutasi Log #{log.id}</span>
            </h3>
            <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>
                Aksi: <span className="font-mono font-bold text-slate-700">{log.action}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-slate-400" />
                Oleh: <strong className="text-slate-700">{log.userName || log.user_name || 'Sistem'}</strong>
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="glass-button p-2 text-slate-400 hover:text-slate-700 rounded-xl"
            aria-label="Tutup Modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Metadata Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
              <Layers className="h-3 w-3" />
              Entitas
            </span>
            <p className="font-semibold text-slate-800 mt-0.5">
              {log.entityType || log.entity_type} {log.entityId ? `#${log.entityId}` : ''}
            </p>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Waktu
            </span>
            <p className="font-semibold text-slate-800 mt-0.5">
              {formatDate(log.createdAt || log.created_at || new Date().toISOString())}
            </p>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
              <Globe className="h-3 w-3" />
              IP Address
            </span>
            <p className="font-mono text-[11px] text-slate-700 mt-0.5 truncate">
              {log.ipAddress || log.ip_address || '127.0.0.1'}
            </p>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
              <Activity className="h-3 w-3" />
              User Agent
            </span>
            <p className="text-[11px] text-slate-700 mt-0.5 truncate" title={log.userAgent || log.user_agent || '-'}>
              {log.userAgent || log.user_agent || '-'}
            </p>
          </div>
        </div>

        {/* Segmented Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/90 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('diff')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'diff'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns2 className="h-3.5 w-3.5" />
              <span>Perbandingan Data</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('raw')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'raw'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code className="h-3.5 w-3.5" />
              <span>Raw JSON</span>
            </button>
          </div>

          {activeTab === 'raw' && (
            <button
              type="button"
              onClick={handleCopyJson}
              className="glass-button flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                  <span>Salin JSON</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto space-y-3 min-h-[220px]">
          {activeTab === 'diff' ? (
            propertyKeys.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <FileJson className="h-8 w-8 mb-2 stroke-1" />
                <p className="text-xs">Tidak ada field mutasi spesifik dalam rekaman log ini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-1/4">Field / Properti</th>
                      <th className="py-2.5 px-3 w-3/8 bg-rose-50/40 text-rose-900 border-l border-slate-200">
                        Sebelum (Nilai Lama)
                      </th>
                      <th className="py-2.5 px-3 w-3/8 bg-emerald-50/40 text-emerald-900 border-l border-slate-200">
                        Sesudah (Nilai Baru)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {propertyKeys.map((key) => {
                      const beforeVal = beforeObj ? beforeObj[key] : undefined;
                      const afterVal = afterObj ? afterObj[key] : payload[key];
                      const isChanged =
                        JSON.stringify(beforeVal) !== JSON.stringify(afterVal);

                      return (
                        <tr
                          key={key}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isChanged ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-semibold text-slate-700 font-mono text-[11px]">
                            {key}
                          </td>
                          <td
                            className={`py-2.5 px-3 border-l border-slate-200 ${
                              isChanged && beforeVal !== undefined
                                ? 'bg-rose-50/60'
                                : ''
                            }`}
                          >
                            {renderValue(beforeVal)}
                          </td>
                          <td
                            className={`py-2.5 px-3 border-l border-slate-200 ${
                              isChanged && afterVal !== undefined
                                ? 'bg-emerald-50/60'
                                : ''
                            }`}
                          >
                            {renderValue(afterVal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="space-y-1">
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-2xl overflow-x-auto text-[11px] leading-relaxed font-mono">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="glass-button px-5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
