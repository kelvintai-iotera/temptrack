import { describe, it, expect } from 'vitest';
import { mergeBeaconRecord } from './mergeBeacon';

describe('mergeBeaconRecord', () => {
  it('preserves temp when update omits it', () => {
    const prev = { mac_addr: 'AA', temp: 36.4, rssi: -50 };
    const incoming = { mac_addr: 'AA', temp: null, rssi: -48 };
    expect(mergeBeaconRecord(prev, incoming).temp).toBe(36.4);
    expect(mergeBeaconRecord(prev, incoming).rssi).toBe(-48);
  });

  it('updates temp when a new value arrives', () => {
    const prev = { mac_addr: 'AA', temp: 36.4 };
    const incoming = { mac_addr: 'AA', temp: 30 };
    expect(mergeBeaconRecord(prev, incoming).temp).toBe(30);
  });

  it('preserves humidity when update omits it', () => {
    const prev = { mac_addr: 'AA', humidity: 55.5 };
    const incoming = { mac_addr: 'AA', humidity: null };
    expect(mergeBeaconRecord(prev, incoming).humidity).toBe(55.5);
  });
});
