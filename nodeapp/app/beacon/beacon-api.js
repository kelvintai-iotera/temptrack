import { loggerFactory } from '../../config/logger.js';
import { BEACON_STATUS } from './beacon-status.js'
import { c } from '../../config/constant.js'
import { formatClientTemp, formatClientHumidity, formatClientBattery } from './sensor-values.js'

const MAX_RECORD = c.BEACON_API_PAGE_RECORD

function mapBeaconForClient(beacon) {
    if (beacon == null) {
        return null
    }
    return {
        mac_addr: beacon.mac_addr,
        name: beacon.name,
        nickname: beacon.nickname,
        temp: formatClientTemp(beacon.temp),
        humidity: formatClientHumidity(beacon.humidity),
        battery: formatClientBattery(beacon.battery),
        rssi: beacon.rssi,
        status: beacon.status,
        report_at: beacon.report_at,
        gateway_id: beacon.gateway_id,
        gateway_name: beacon.gateway?.name ?? null,
        gateway_mac_addr: beacon.gateway?.mac_addr ?? null,
        alert: (beacon.status == BEACON_STATUS.ALERT)
    }
}

class BeaconApi{
    constructor(beaconRepository){
        this._beaconRepository = beaconRepository
    }

    getAll(startPage) {
        const allBeacons = this._beaconRepository.getAllBeacons()

        const result = []
        let idx = 0;
        for (const b in allBeacons) {
            if(idx < startPage * MAX_RECORD){

            }
            else{
                const beacon = allBeacons[b]
                result.push(mapBeaconForClient(beacon))
            }

            if(result.length >= MAX_RECORD){
                break;
            }
            idx++;
        }
        return result
    }

    get(mac_addr){
        if(mac_addr == null || mac_addr.length == 0){
            return null
        }
        const beacon = this._beaconRepository.getExistingBeacon(mac_addr)
        return mapBeaconForClient(beacon)
    }

    async updateLabels(mac_addr, { nickname, gatewayName }) {
        const beacon = this._beaconRepository.getExistingBeacon(mac_addr)
        if (beacon == null) {
            return { error: 'NOT_FOUND' }
        }

        const notifyMap = new Map()

        if (nickname !== undefined) {
            await this._beaconRepository.setBeaconNickname(beacon, nickname)
            notifyMap.set(beacon.mac_addr, beacon)
        }

        if (gatewayName !== undefined) {
            const gatewayMac = beacon.gateway?.mac_addr
            if (!gatewayMac) {
                return { error: 'NO_GATEWAY' }
            }
            const result = await this._beaconRepository.updateGatewayDisplayName(
                gatewayMac,
                gatewayName
            )
            if (result == null) {
                return { error: 'GATEWAY_NOT_FOUND' }
            }
            result.beacons.forEach(b => notifyMap.set(b.mac_addr, b))
        }

        const beacons = [...notifyMap.values()]
        return {
            beacons,
            clients: beacons.map(mapBeaconForClient),
        }
    }

    async delete(mac_addr) {
        const beacon = await this._beaconRepository.deleteBeacon(mac_addr)
        if (beacon == null) {
            return { error: 'NOT_FOUND' }
        }
        return { mac_addr: beacon.mac_addr }
    }
}

export { BeaconApi, mapBeaconForClient }