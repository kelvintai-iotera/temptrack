import React from 'react';
import {
  Thermometer,
  Battery,
  Clock,
  AlertTriangle,
  Router,
  Settings,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatBeaconStatus } from '../utils/beaconDisplay';
import { getTempAlertLevel } from '../utils/tempAlerts';
import { useSettings } from '../context/SettingsContext';
import { RssiSignal } from './RssiSignal';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Metric = ({ icon: Icon, label, value, iconClass, valueClass }) => (
  <div className="min-w-0 flex flex-col gap-0.5">
    <div className="flex items-center gap-1.5 min-w-0">
      <Icon size={14} className={cn('shrink-0', iconClass)} />
      <span className="text-[10px] text-muted uppercase tracking-wide truncate">{label}</span>
    </div>
    <span className={cn('text-sm font-semibold truncate', valueClass)} title={String(value)}>
      {value}
    </span>
  </div>
);

export const BeaconCard = ({ beacon, isAdmin, onEdit, highlighted = false }) => {
  const { config } = useSettings();
  const isStatusAlert = beacon.status === 'alert' || beacon.alert;
  const tempLevel = getTempAlertLevel(beacon.temp, config);
  const isOnline = beacon.status === 'in';
  const displayName = beacon.nickname || beacon.name || 'Unknown Beacon';
  const gatewayText = beacon.gateway_name || beacon.gateway_id || '—';
  const timeText = beacon.report_at ? new Date(beacon.report_at).toLocaleTimeString() : '—';
  const showWarningIcon = isStatusAlert || tempLevel !== 'none';

  return (
    <div
      className={cn(
        'glass-panel p-4 relative overflow-hidden transition-colors w-full',
        tempLevel === 'critical' &&
          'border-red-600 bg-red-200 dark:bg-red-700/35 dark:border-red-500',
        tempLevel === 'warn' &&
          'border-orange-400 bg-orange-50 dark:bg-orange-500/15 dark:border-orange-400/70',
        tempLevel === 'none' &&
          isStatusAlert &&
          'border-red-400/60 bg-red-50 dark:bg-red-500/5',
        tempLevel === 'none' && !isStatusAlert && 'hover:border-accent-cyan/40',
        highlighted && 'ring-2 ring-accent-cyan border-accent-cyan/60'
      )}
    >
      {showWarningIcon && (
        <div className="absolute top-2 right-2 z-10 pointer-events-none">
          <AlertTriangle
            className={cn(
              'w-5 h-5',
              tempLevel === 'critical'
                ? 'text-red-700 animate-pulse'
                : tempLevel === 'warn'
                  ? 'text-orange-500'
                  : 'text-red-500'
            )}
          />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 lg:gap-4 items-center w-full min-w-0">
        <div className="col-span-2 sm:col-span-1 min-w-0 lg:col-span-1">
          <h3 className="text-sm font-bold truncate" title={displayName}>
            {displayName}
          </h3>
          <p className="text-[11px] text-muted font-mono truncate" title={beacon.mac_addr}>
            {beacon.mac_addr}
          </p>
        </div>

        <div className="flex justify-start sm:justify-center min-w-0">
          <span
            className={cn(
              'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
              isOnline
                ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                : 'bg-slate-200 text-slate-600 dark:bg-gray-500/20 dark:text-gray-400'
            )}
          >
            {formatBeaconStatus(beacon.status)}
          </span>
        </div>

        <Metric
          icon={Router}
          label="Gateway"
          value={gatewayText}
          iconClass="text-cyan-600 dark:text-cyan-400"
        />

        <Metric
          icon={Thermometer}
          label="Temp"
          value={beacon.temp != null ? `${beacon.temp}°C` : '—'}
          iconClass={cn(
            'text-blue-600 dark:text-blue-400',
            tempLevel === 'warn' && 'text-orange-500 dark:text-orange-400',
            tempLevel === 'critical' && 'text-red-700 dark:text-red-400'
          )}
          valueClass={cn(
            tempLevel === 'warn' && 'text-orange-600 dark:text-orange-400 font-semibold',
            tempLevel === 'critical' && 'text-red-800 dark:text-red-300 font-bold'
          )}
        />

        <Metric
          icon={Battery}
          label="Battery"
          value={beacon.battery != null ? `${beacon.battery}%` : '—'}
          iconClass={cn(
            'text-green-600 dark:text-green-400',
            beacon.battery != null && beacon.battery < 20 && 'text-red-500'
          )}
        />

        <RssiSignal rssi={beacon.rssi} isLive={isOnline} />

        <div className="col-span-2 sm:col-span-1 flex items-center justify-between gap-2 min-w-0 lg:col-span-1">
          <Metric
            icon={Clock}
            label="Last seen"
            value={timeText}
            iconClass="text-orange-600 dark:text-orange-400"
          />
          {isAdmin && (
            <button
              type="button"
              onClick={() => onEdit?.(beacon)}
              className="shrink-0 p-2 text-muted hover:text-cyan-700 dark:hover:text-accent-cyan hover:bg-cyan-100 dark:hover:bg-accent-cyan/10 rounded-lg transition-colors"
              title="Edit beacon and gateway names"
              aria-label="Edit labels"
            >
              <Settings size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
