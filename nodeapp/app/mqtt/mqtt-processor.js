import { loggerFactory } from '../../config/logger.js';
import { BEACON_STATUS } from '../beacon/beacon-status.js'
import { mapBeaconForClient } from '../beacon/beacon-api.js'
import { normalizeMac } from '../beacon/mac-utils.js'
import { parseMfrPayload } from './mfr-parser.js'
import { isPlausibleSensorTemp, TEMP_UNKNOWN } from '../beacon/sensor-values.js'

const logger = loggerFactory('mqtt-processor')

class MqttProcessor{
    constructor(beaconRepository){
        this._beaconRepository = beaconRepository
        this._expiredSeconds = 60
    }

    async init(io, expiredSeconds){
        this._expiredSeconds = Number(expiredSeconds) || 60
        this._io = io;

        logger.info("Beacon Out Seconds is %d", this._expiredSeconds)
    }

    setExpiredSeconds(seconds) {
        const n = Number(seconds);
        if (!Number.isFinite(n) || n < 1) return;
        this._expiredSeconds = n;
        logger.info('Beacon Out Seconds updated to %d', n);
    }

    async process(json, gatewayMac){
        if (!Array.isArray(json)) {
            return
        }

        const gateway = this._beaconRepository.getGateway(gatewayMac)
        if (!gateway) {
            logger.warn('Unknown gateway MAC: %s', gatewayMac)
            return
        }

        for (const element of json) {
            const beacon = this._beaconRepository.getBeacon(element.mac)
            if (beacon != undefined) {
                await this._onBeaconData(element, beacon, gateway)
            }
        }
    }

    async _onBeaconData(updatedData, beacon, gateway) {
        const mfr = updatedData.MFR
        if (mfr == undefined) return;

        if (!gateway) {
            logger.warn('Skipping beacon update without gateway: %s', updatedData.mac)
            return
        }

        const parsed = parseMfrPayload(mfr, updatedData.mac)
        const rssiParsed = parseInt(updatedData.rssi, 10)
        const rssi = Number.isFinite(rssiParsed) ? rssiParsed : null

        const sometimesBefore = new Date()
        sometimesBefore.setSeconds(sometimesBefore.getSeconds() - 2)

        const sameGateway = gateway.id === beacon.gateway_id
        const shouldUpdate = sameGateway
            || beacon.gateway == null
            || new Date(beacon.report_at) < sometimesBefore
            || (rssi != null && (beacon.rssi == null || rssi > beacon.rssi))

        if(shouldUpdate){
            beacon.name = updatedData.name
            beacon.mac_addr = normalizeMac(updatedData.mac)
            if (parsed.temp != null) {
                beacon.temp = parsed.temp
            } else if (
                parsed.profile === 'minew-info' &&
                !isPlausibleSensorTemp(beacon.temp)
            ) {
                beacon.temp = TEMP_UNKNOWN
            } else if (beacon.temp == null) {
                beacon.temp = TEMP_UNKNOWN
            }
            if (parsed.battery != null) {
                beacon.battery = parsed.battery
            } else if (beacon.battery == null) {
                beacon.battery = 0
            }
            if (rssi != null) {
                beacon.rssi = rssi
            }
            beacon.gateway = gateway
            beacon.gateway_id = gateway.id
            beacon.report_at = new Date().toISOString()
            beacon.is_changed = true
            beacon.status = BEACON_STATUS.IN

            this._notify([beacon])
        }
    }

    async writeToDb() {
        await this._beaconRepository.writeToDb()
    }

    _notify(beacons) {
        const payload = beacons.map(mapBeaconForClient)
        this._io.emit('ADDED_DATA', payload);
    }

    publishClientUpdate(beacons) {
        if (beacons?.length > 0) {
            this._notify(beacons)
        }
    }

    setBeaconsStatus() {
        const expired = new Date()
        expired.setSeconds(expired.getSeconds() - this._expiredSeconds)

        const allBeacons = this._beaconRepository.getAllBeacons()
        const notifyBeacons = []
        for (const beaconMacAddr in allBeacons) {
            const beacon = allBeacons[beaconMacAddr]
            if (beacon.status == 'in') {
                const reportAt = new Date(beacon.report_at)

                if(reportAt < expired){
                    if (!beacon.gateway) {
                        beacon.status = BEACON_STATUS.ALERT
                    } else if (beacon.gateway.check_point) {
                        beacon.status = BEACON_STATUS.OUT
                    } else {
                        beacon.status = BEACON_STATUS.ALERT
                    }
                    beacon.is_changed = true
                    notifyBeacons.push(beacon)
                }
            }
        }
        if(notifyBeacons.length > 0){
            this._notify(notifyBeacons)
        }
    }

    getAllGateways(){
        return this._beaconRepository.getAllGateways()
    }
}

export { MqttProcessor }
