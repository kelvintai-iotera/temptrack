import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getRssiSignal } from '../utils/rssiSignal';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const BAR_HEIGHTS = [3, 5, 7, 9, 11];

const TONE_CLASS = {
  strong: 'bg-emerald-500 dark:bg-emerald-400',
  mid: 'bg-amber-500 dark:bg-amber-400',
  weak: 'bg-orange-500 dark:bg-orange-400',
  critical: 'bg-red-500 dark:bg-red-400 animate-pulse',
  muted: 'bg-slate-300 dark:bg-slate-600',
};

/**
 * Animated RSSI strength bars (5 levels) with dBm readout.
 */
export function RssiSignal({ rssi, isLive = true, compact = false, className }) {
  const signal = getRssiSignal(rssi);
  const hasValue = rssi != null && Number.isFinite(Number(rssi));
  const activeTone = TONE_CLASS[signal.tone] || TONE_CLASS.muted;

  return (
    <div
      className={cn('min-w-0 flex flex-col gap-0.5', className)}
      title={hasValue ? `${rssi} dBm — ${signal.label}` : 'No RSSI data'}
      aria-label={hasValue ? `RSSI ${rssi} decibels, ${signal.label}` : 'RSSI unavailable'}
    >
      {!compact && (
        <span className="text-[10px] text-muted uppercase tracking-wide">RSSI</span>
      )}

      <div className="flex items-end gap-2 min-w-0">
        <div
          className={cn(
            'flex items-end gap-[3px] shrink-0',
            isLive && hasValue && signal.bars > 0 && 'rssi-bars-live',
          )}
          aria-hidden="true"
        >
          {BAR_HEIGHTS.map((height, index) => {
            const barIndex = index + 1;
            const active = barIndex <= signal.bars;
            return (
              <span
                key={barIndex}
                className={cn(
                  'w-[4px] rounded-sm transition-all duration-500 ease-out',
                  active ? activeTone : 'bg-slate-200 dark:bg-slate-700/80',
                  active && isLive && barIndex === signal.bars && 'rssi-bar-peak',
                )}
                style={{ height: `${height}px` }}
              />
            );
          })}
        </div>

        <div className="min-w-0 flex flex-col leading-tight">
          <span className={cn('text-sm font-semibold tabular-nums truncate', !hasValue && 'text-muted')}>
            {hasValue ? `${rssi} dBm` : '—'}
          </span>
          {hasValue && !compact && (
            <span className="text-[10px] text-muted truncate">{signal.label}</span>
          )}
        </div>
      </div>
    </div>
  );
}
