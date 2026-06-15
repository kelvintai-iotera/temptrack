import { loggerFactory } from '../../config/logger.js';
import { BEACON_STATUS } from './beacon-status.js';
import { normalizeMac } from './mac-utils.js';
import { TEMP_UNKNOWN } from './sensor-values.js';

const logger = loggerFactory('beacon-service')

class BeaconRepository {
    constructor(beaconDataStore) {
        this._beaconDataStore = beaconDataStore
        this._beacons = {}
        this._gateways = {}
    }

    getDataStore() {
        return this._beaconDataStore
    }

    async init(beaconPrefix) {
        await this._initData()
        this.setBeaconPrefixes(beaconPrefix)
    }

    setBeaconPrefixes(beaconPrefix) {
        this._beaconPrefixes = String(beaconPrefix || '')
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean);
    }

    async _initData() {
        const allBeacons = await this._beaconDataStore.getAllBeacons()
        this._beacons = {}
        allBeacons.forEach(b => {
            b.mac_addr = normalizeMac(b.mac_addr)
            this._beacons[b.mac_addr] = b
        })

        const allGateways = await this._beaconDataStore.getAllGateways()
        this._gateways = {}
        allGateways.forEach(g => {
            g.mac_addr = normalizeMac(g.mac_addr)
            this._gateways[g.mac_addr] = g
        })
    }

    _prepareNewBeacon(mac_addr){
        const beacon = {
            nickname: "?",
            mac_addr: normalizeMac(mac_addr),
            report_at: new Date().toISOString(),
            temp: TEMP_UNKNOWN,
            battery: 0,
            rssi: 0,
            status: BEACON_STATUS.IN
        }

        logger.info("New Beacon %s", JSON.stringify(beacon))

        return beacon
    }

    getBeacon(mac_addr) {
        const mac_address = normalizeMac(mac_addr)
        let beacon = this._beacons[mac_address]

        if (beacon == undefined && this._isAccceptedUnknownBeacon(mac_address)) {
            beacon = this._prepareNewBeacon(mac_address)
            this._beacons[beacon.mac_addr] = beacon
        }
        return beacon
    }

    _isAccceptedUnknownBeacon(mac_addr) {
        const mac = normalizeMac(mac_addr)
        for(let i=0; i < this._beaconPrefixes.length; i++){
            const prefix = this._beaconPrefixes[i].trim().toUpperCase()
            if(prefix.length > 0 && mac.startsWith(prefix)){
                return true
            }
        }
        return false
    }

    getGateway(mac_addr){
        return this._gateways[normalizeMac(mac_addr)]
    }

    async writeToDb() {
        let changed = 0
        let failed = 0
        const history = []
        const startTime = new Date()
        logger.debug("Start Writing DB" + startTime.toLocaleString())
        for (const beaconMacAddr in this._beacons) {
            const beacon = this._beacons[beaconMacAddr]
            if (!beacon.is_changed) {
                continue
            }

            if (!beacon.gateway?.id) {
                logger.warn('Deferring DB write for %s: no gateway assigned', beacon.mac_addr)
                continue
            }

            try {
                await this._beaconDataStore.updateBeacon(beacon)
                changed++
                beacon.is_changed = false

                const historyRow = this._convertToHistory(beacon)
                if (historyRow) {
                    history.push(historyRow)
                }
            } catch (e) {
                failed++
                logger.error('Failed to persist beacon %s: %s', beacon.mac_addr, e.message)
            }
        }
        if (changed > 0) {
            logger.info("Updated Records: %d, failed: %d, startTime: %s, time spent: %d", changed, failed, startTime.toLocaleString(), (new Date() - startTime)/1000)
        }
        else if (failed === 0) {
            logger.info("No Change")
        }

        await this._writeHistory(history)
    }

    async _writeHistory(history) {
        if (history.length === 0) {
            return 0
        }

        try {
            const i = await this._beaconDataStore.insertHistory(history)
            logger.info("Insert History: %d", i.count)
            return i.count
        } catch (e) {
            logger.error('Failed to insert history (%d rows): %s', history.length, e.message)
            return 0
        }
    }

    _convertToHistory(beacon){
        if (!beacon.gateway?.mac_addr || !beacon.gateway?.name) {
            return null
        }

        return {
            name: beacon.name,
            nickname: beacon.nickname,
            beacon_mac_addr: beacon.mac_addr,
            report_at: beacon.report_at,
            temp: beacon.temp ?? TEMP_UNKNOWN,
            battery: beacon.battery ?? 0,
            rssi: beacon.rssi ?? 0,
            status: beacon.status,
            gateway_mac_addr: beacon.gateway.mac_addr,
            gateway_name: beacon.gateway.name
        }
    }

    getAllBeacons(){
        return this._beacons
    }

    getAllGateways() {
        return this._gateways
    }

    upsertGatewayInMemory(gateway) {
        const normalized = {
            ...gateway,
            mac_addr: normalizeMac(gateway.mac_addr),
        }
        this._gateways[normalized.mac_addr] = normalized
        return normalized
    }

    removeGatewayFromMemory(mac_addr) {
        delete this._gateways[normalizeMac(mac_addr)]
    }

    syncBeaconGatewayMetadata(gateway) {
        for (const beaconMacAddr in this._beacons) {
            const beacon = this._beacons[beaconMacAddr]
            if (beacon.gateway_id === gateway.id && beacon.gateway) {
                beacon.gateway = {
                    ...beacon.gateway,
                    id: gateway.id,
                    name: gateway.name,
                    mac_addr: normalizeMac(gateway.mac_addr),
                    check_point: gateway.check_point,
                }
            }
        }
    }

    getExistingBeacon(mac_addr) {
        return this._beacons[normalizeMac(mac_addr)]
    }

    async setBeaconNickname(beacon, nickname) {
        const trimmed = typeof nickname === 'string' ? nickname.trim() : ''
        beacon.nickname = trimmed.length > 0 ? trimmed : null
        await this._beaconDataStore.updateBeaconNickname(beacon.mac_addr, beacon.nickname)
        return beacon
    }

    async updateGatewayDisplayName(gatewayMac, name) {
        const mac = normalizeMac(gatewayMac)
        const gateway = this._gateways[mac]
        if (!gateway) {
            return null
        }
        const trimmed = (name || '').trim()
        if (trimmed.length === 0) {
            throw new Error('Gateway name is required')
        }
        gateway.name = trimmed
        await this._beaconDataStore.updateGatewayName(gateway.id, trimmed)

        const updatedBeacons = []
        for (const beaconMacAddr in this._beacons) {
            const beacon = this._beacons[beaconMacAddr]
            if (beacon.gateway_id === gateway.id) {
                if (beacon.gateway) {
                    beacon.gateway.name = trimmed
                }
                updatedBeacons.push(beacon)
            }
        }
        return { gateway, beacons: updatedBeacons }
    }
}

export { BeaconRepository }
