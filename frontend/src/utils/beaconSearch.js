import {
  beaconDisplayName,
  formatBeaconStatus,
  gatewayDisplayName,
} from './beaconDisplay';

/** Build searchable text from all fields shown on Real Time Status rows. */
export function beaconSearchableText(beacon) {
  if (!beacon) return '';

  const parts = [
    beaconDisplayName(beacon),
    beacon.name,
    beacon.nickname,
    beacon.mac_addr,
    beacon.mac_addr?.replace(/:/g, ''),
    gatewayDisplayName(beacon),
    beacon.gateway_id,
    beacon.gateway_name,
    beacon.gateway_mac_addr,
    beacon.status,
    formatBeaconStatus(beacon.status),
    beacon.temp != null ? String(beacon.temp) : '',
    beacon.temp != null ? `${beacon.temp}°c` : '',
    beacon.temp != null ? `${beacon.temp}°C` : '',
    beacon.humidity != null ? String(beacon.humidity) : '',
    beacon.humidity != null ? `${beacon.humidity}%` : '',
    beacon.humidity != null ? 'humidity' : '',
    beacon.battery != null ? String(beacon.battery) : '',
    beacon.battery != null ? `${beacon.battery}%` : '',
    beacon.rssi != null ? String(beacon.rssi) : '',
    beacon.rssi != null ? `${beacon.rssi} dbm` : '',
    beacon.rssi != null ? `${beacon.rssi} dBm` : '',
    beacon.alert ? 'alert' : '',
    beacon.report_at,
  ];

  if (beacon.report_at) {
    try {
      parts.push(new Date(beacon.report_at).toLocaleTimeString());
      parts.push(new Date(beacon.report_at).toLocaleString());
    } catch {
      // ignore invalid dates
    }
  }

  return parts
    .filter((p) => p != null && String(p).trim() !== '')
    .join(' ')
    .toLowerCase();
}

export function beaconMatchesSearch(beacon, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return beaconSearchableText(beacon).includes(q);
}
