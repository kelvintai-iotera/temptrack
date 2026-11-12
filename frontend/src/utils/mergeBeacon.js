/** Keep last known sensor values when socket payloads omit them. */
export function mergeBeaconRecord(prev, incoming) {
  if (!incoming?.mac_addr) return prev ?? incoming;
  if (!prev) return incoming;

  return {
    ...prev,
    ...incoming,
    temp: incoming.temp != null ? incoming.temp : prev.temp,
    humidity: incoming.humidity != null ? incoming.humidity : prev.humidity,
    battery: incoming.battery != null ? incoming.battery : prev.battery,
    rssi: incoming.rssi != null ? incoming.rssi : prev.rssi,
    gateway_name: incoming.gateway_name ?? prev.gateway_name,
    gateway_id: incoming.gateway_id ?? prev.gateway_id,
    gateway_mac_addr: incoming.gateway_mac_addr ?? prev.gateway_mac_addr,
    nickname: incoming.nickname ?? prev.nickname,
    name: incoming.name ?? prev.name,
  };
}
