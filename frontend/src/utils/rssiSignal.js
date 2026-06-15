/** Map RSSI (dBm) to bar count and display metadata. */
export function getRssiSignal(rssi) {
  if (rssi == null || !Number.isFinite(Number(rssi))) {
    return {
      bars: 0,
      level: 'none',
      label: 'No signal',
      tone: 'muted',
    };
  }

  const dbm = Number(rssi);

  if (dbm >= -55) {
    return { bars: 5, level: 'excellent', label: 'Excellent', tone: 'strong' };
  }
  if (dbm >= -65) {
    return { bars: 4, level: 'good', label: 'Good', tone: 'strong' };
  }
  if (dbm >= -75) {
    return { bars: 3, level: 'fair', label: 'Fair', tone: 'mid' };
  }
  if (dbm >= -85) {
    return { bars: 2, level: 'weak', label: 'Weak', tone: 'weak' };
  }
  if (dbm >= -95) {
    return { bars: 1, level: 'poor', label: 'Poor', tone: 'weak' };
  }

  return { bars: 1, level: 'critical', label: 'Very weak', tone: 'critical' };
}
