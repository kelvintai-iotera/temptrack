import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBeacons } from '../hooks/useBeacons';
import { useSettings } from '../context/SettingsContext';
import { BeaconCard } from './BeaconCard';
import { BeaconEditModal } from './BeaconEditModal';
import { Activity, Radio, AlertCircle, CheckCircle2, Search } from 'lucide-react';
import { beaconMatchesSearch } from '../utils/beaconSearch';
import { countTempAlerts } from '../utils/tempAlerts';
import {
  SORT_OPTIONS,
  STATUS_FILTER_OPTIONS,
  filterBeacons,
  sortBeacons,
} from '../utils/sortBeacons';

export const RealTimeStatus = ({ currentUser }) => {
  const [searchParams] = useSearchParams();
  const highlightMac = searchParams.get('mac')?.trim().toLowerCase() || '';
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingBeacon, setEditingBeacon] = useState(null);
  const { beacons, beaconList: allSorted, isConnected, updatesPerMin, mergeBeaconUpdates, removeBeacon } = useBeacons();
  const { config } = useSettings();
  const isAdmin = currentUser?.role === 'admin';
  const highlightRef = useRef(null);

  useEffect(() => {
    if (highlightMac) {
      setSearchQuery(highlightMac);
    }
  }, [highlightMac]);

  const beaconList = useMemo(() => {
    const searched = allSorted.filter((beacon) => beaconMatchesSearch(beacon, searchQuery));
    const filtered = filterBeacons(searched, { statusFilter, thresholds: config });
    return sortBeacons(filtered, { sortBy, sortDir });
  }, [allSorted, searchQuery, statusFilter, sortBy, sortDir, config]);

  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightMac, beaconList.length]);

  const allBeacons = Object.values(beacons);
  const activeCount = allBeacons.filter((b) => b.status === 'in').length;
  const alertCount = countTempAlerts(allBeacons, config);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          icon={<Radio className="text-accent-cyan" />}
          label="Total Beacons"
          value={allBeacons.length}
          subValue={isConnected ? 'Live connected' : 'Disconnected'}
        />
        <StatCard
          icon={<CheckCircle2 className="text-success" />}
          label="Online"
          value={activeCount}
        />
        <StatCard
          icon={<AlertCircle className="text-danger" />}
          label="Temp Alerts"
          value={alertCount}
        />
        <StatCard
          icon={<Activity className="text-accent-purple" />}
          label="Recent Activity"
          value={updatesPerMin}
          subValue="updates/min"
        />
      </div>

      <div>
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-xl font-bold font-display flex items-center gap-2 shrink-0">
              Live Beacon Status
              <span
                className={`flex h-2 w-2 rounded-full ${isConnected ? 'bg-accent-cyan animate-ping' : 'bg-muted'}`}
                aria-hidden="true"
              />
              <span className="sr-only">{isConnected ? 'Live connected' : 'Disconnected'}</span>
            </h2>
            <div className="text-sm text-muted shrink-0">
              {beaconList.length} / {allBeacons.length} · Auto-refresh via Socket.io
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, MAC, gateway, temperature…"
                className="input-field pl-10 py-2.5 text-sm w-full"
                aria-label="Search beacons"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field py-2.5 text-sm min-w-[7rem]"
                aria-label="Status filter"
              >
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input-field py-2.5 text-sm min-w-[7rem]"
                aria-label="Sort field"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <select
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value)}
                className="input-field py-2.5 text-sm min-w-[6rem]"
                aria-label="Sort direction"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {beaconList.length === 0 ? (
            <div className="glass-panel p-8 text-center text-muted">
              {searchQuery.trim() || statusFilter !== 'all'
                ? 'No beacons match your filters.'
                : 'No beacon data available.'}
            </div>
          ) : (
            beaconList.map((beacon) => {
              const isHighlighted = highlightMac
                && beacon.mac_addr?.toLowerCase() === highlightMac;
              return (
                <div key={beacon.mac_addr} ref={isHighlighted ? highlightRef : undefined}>
                  <BeaconCard
                    beacon={beacon}
                    isAdmin={isAdmin}
                    onEdit={setEditingBeacon}
                    highlighted={isHighlighted}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      <BeaconEditModal
        beacon={editingBeacon}
        open={editingBeacon != null}
        onClose={() => setEditingBeacon(null)}
        onSaved={mergeBeaconUpdates}
        onDeleted={removeBeacon}
      />
    </div>
  );
};

const StatCard = ({ icon, label, value, subValue }) => (
  <div className="glass-panel p-4 md:p-6 flex items-center gap-4">
    <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5">
      {icon}
    </div>
    <div>
      <p className="text-xs text-muted uppercase tracking-widest">{label}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-bold">{value}</h3>
        {subValue && <span className="text-[10px] text-muted">{subValue}</span>}
      </div>
    </div>
  </div>
);
