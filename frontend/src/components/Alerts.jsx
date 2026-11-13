import React, { useMemo, useState } from 'react';
import { useBeacons } from '../hooks/useBeacons';
import { BeaconCard } from './BeaconCard';
import { BeaconEditModal } from './BeaconEditModal';
import { AlertTriangle, Thermometer } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import {
  filterTempAlertBeacons,
  getTempAlertLevel,
} from '../utils/tempAlerts';

export const Alerts = ({ currentUser }) => {
  const { beaconList, isConnected, mergeBeaconUpdates, removeBeacon } = useBeacons();
  const { config } = useSettings();
  const [editingBeacon, setEditingBeacon] = useState(null);
  const isAdmin = currentUser?.role === 'admin';
  const { tempWarnC, tempCriticalC } = config;

  const alertBeacons = useMemo(
    () => filterTempAlertBeacons(beaconList, config),
    [beaconList, config],
  );

  const critical = useMemo(
    () => alertBeacons.filter((b) => getTempAlertLevel(b.temp, config) === 'critical'),
    [alertBeacons, config],
  );

  const warn = useMemo(
    () => alertBeacons.filter((b) => getTempAlertLevel(b.temp, config) === 'warn'),
    [alertBeacons, config],
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display flex items-center gap-2">
            <AlertTriangle className="text-danger" size={28} />
            Temperature Alerts
          </h2>
          <p className="text-sm text-muted mt-1">
            Beacons above {tempWarnC}°C are flagged; above {tempCriticalC}°C is critical
          </p>
        </div>
        <div className="text-sm text-muted shrink-0">
          {alertBeacons.length} alert{alertBeacons.length !== 1 ? 's' : ''} ·{' '}
          {isConnected ? 'Live updates' : 'Disconnected'}
        </div>
      </div>

      {alertBeacons.length === 0 ? (
        <div className="glass-panel p-12 text-center text-muted">
          <Thermometer className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium text-foreground">No temperature alerts</p>
          <p className="text-sm mt-2">All beacons are at or below {tempWarnC}°C</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {critical.length > 0 && (
            <AlertSection
              title={`Critical high temp (&gt; ${tempCriticalC}°C)`}
              count={critical.length}
              tone="critical"
              beacons={critical}
              isAdmin={isAdmin}
              onEdit={setEditingBeacon}
            />
          )}
          {warn.length > 0 && (
            <AlertSection
              title={`Elevated temp (&gt; ${tempWarnC}°C)`}
              count={warn.length}
              tone="warn"
              beacons={warn}
              isAdmin={isAdmin}
              onEdit={setEditingBeacon}
            />
          )}
        </div>
      )}

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

function AlertSection({ title, count, tone, beacons, isAdmin, onEdit }) {
  const headerClass =
    tone === 'critical'
      ? 'text-danger'
      : 'text-warning';

  return (
    <section>
      <h3 className={`text-lg font-bold mb-4 ${headerClass}`}>
        {title} · {count}
      </h3>
      <div className="flex flex-col gap-4">
        {beacons.map((beacon) => (
          <BeaconCard
            key={beacon.mac_addr}
            beacon={beacon}
            isAdmin={isAdmin}
            onEdit={onEdit}
          />
        ))}
      </div>
    </section>
  );
}
