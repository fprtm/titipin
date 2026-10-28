'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Info, Database, Calculator, HelpCircle } from 'lucide-react';

export interface InfoTooltipProps {
  title: string;
  source: string;
  formula?: string;
  description: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export function InfoTooltip({
  title,
  source,
  formula,
  description,
  align = 'center',
  className = '',
}: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  let alignClasses = 'left-1/2 -translate-x-1/2';
  if (align === 'left') {
    alignClasses = 'left-0';
  } else if (align === 'right') {
    alignClasses = 'right-0';
  }

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Informasi dan metodologi kalkulasi untuk ${title}`}
        className="cursor-pointer rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      {isOpen && (
        <div
          role="tooltip"
          className={`absolute top-full mt-2 ${alignClasses} z-50 w-72 sm:w-80 rounded-xl border border-slate-200/90 bg-white/95 p-3.5 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Header */}
          <div className="mb-2 border-b border-slate-100 pb-1.5 font-bold text-xs text-slate-900">
            {title}
          </div>

          <div className="space-y-2 text-[11px] text-slate-600">
            {/* Data Source */}
            <div className="flex items-start gap-1.5">
              <Database className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <div>
                <span className="font-semibold text-slate-800">Sumber Data: </span>
                <span className="font-mono text-[10px] text-slate-700">{source}</span>
              </div>
            </div>

            {/* Formula / Calculation logic */}
            {formula && (
              <div className="flex items-start gap-1.5">
                <Calculator className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                <div>
                  <span className="font-semibold text-slate-800">Metode Hitung: </span>
                  <span className="font-mono text-[10px] text-slate-700">{formula}</span>
                </div>
              </div>
            )}

            {/* Business Purpose / Description */}
            <div className="flex items-start gap-1.5 border-t border-slate-100/80 pt-1.5">
              <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              <div className="leading-relaxed text-slate-600">
                <span className="font-semibold text-slate-800">Wawasan Bisnis: </span>
                {description}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
