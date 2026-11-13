import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import axios from '../api/axiosSetup';
import { useSocket } from '../hooks/useSocket';
import { beaconDisplayName } from '../utils/beaconDisplay';
import { mergeBeaconRecord } from '../utils/mergeBeacon';

const BeaconContext = createContext(null);

export function BeaconProvider({ children }) {
  const [beacons, setBeacons] = useState({});
  const [updatesPerMin, setUpdatesPerMin] = useState(0);
  const [loadError, setLoadError] = useState('');
  const updateTimestamps = useRef([]);
  const { socket, isConnected, reconnect } = useSocket('/');

  const recordSocketActivity = useCallback(() => {
    const now = Date.now();
    updateTimestamps.current.push(now);
    updateTimestamps.current = updateTimestamps.current.filter((t) => now - t < 60_000);
    setUpdatesPerMin(updateTimestamps.current.length);
  }, []);

  const mergeBeaconUpdates = useCallback((data) => {
    if (!Array.isArray(data) || data.length === 0) return;
    recordSocketActivity();
    setBeacons((prev) => {
      const next = { ...prev };
      data.forEach((incoming) => {
        if (!incoming?.mac_addr) return;
        next[incoming.mac_addr] = mergeBeaconRecord(prev[incoming.mac_addr], incoming);
      });
      return next;
    });
  }, [recordSocketActivity]);

  const removeBeacon = useCallback((mac_addr) => {
    if (!mac_addr) return;
    setBeacons((prev) => {
      if (!prev[mac_addr]) return prev;
      const next = { ...prev };
      delete next[mac_addr];
      return next;
    });
  }, []);

  const refreshBeacons = useCallback(async () => {
    try {
      const res = await axios.get('/beacons');
      const beaconMap = {};
      res.data.forEach((b) => {
        if (b?.mac_addr) beaconMap[b.mac_addr] = b;
      });
      setBeacons(beaconMap);
      setLoadError('');
    } catch {
      setLoadError('Failed to load beacon data');
    }
  }, []);

  useEffect(() => {
    refreshBeacons();
  }, [refreshBeacons]);

  useEffect(() => {
    if (!socket) return undefined;

    const onData = (data) => mergeBeaconUpdates(data);
    const onRemoved = (payload) => {
      const mac = payload?.mac_addr;
      if (mac) removeBeacon(mac);
    };
    socket.on('ADDED_DATA', onData);
    socket.on('REMOVED_DATA', onRemoved);
    return () => {
      socket.off('ADDED_DATA', onData);
      socket.off('REMOVED_DATA', onRemoved);
    };
  }, [socket, mergeBeaconUpdates, removeBeacon]);

  const beaconList = useMemo(() => (
    Object.values(beacons).sort((a, b) => {
      const byName = beaconDisplayName(a).localeCompare(
        beaconDisplayName(b),
        undefined,
        { sensitivity: 'base', numeric: true },
      );
      if (byName !== 0) return byName;
      return (a.mac_addr || '').localeCompare(b.mac_addr || '', undefined, { numeric: true });
    })
  ), [beacons]);

  const value = useMemo(() => ({
    beacons,
    beaconList,
    isConnected,
    updatesPerMin,
    loadError,
    mergeBeaconUpdates,
    removeBeacon,
    refreshBeacons,
    reconnect,
  }), [
    beacons,
    beaconList,
    isConnected,
    updatesPerMin,
    loadError,
    mergeBeaconUpdates,
    removeBeacon,
    refreshBeacons,
    reconnect,
  ]);

  return (
    <BeaconContext.Provider value={value}>
      {children}
    </BeaconContext.Provider>
  );
}

export function useBeacons() {
  const ctx = useContext(BeaconContext);
  if (!ctx) {
    throw new Error('useBeacons must be used within BeaconProvider');
  }
  return ctx;
}
