import { loggerFactory } from '../../config/logger.js';
import { normalizeMac } from './mac-utils.js';
import { TEMP_UNKNOWN } from './sensor-values.js';
import pkg from '@prisma/client'

const prisma = new pkg.PrismaClient()

const logger = loggerFactory("beaconDataStore")

class BeaconDataStore {
    _beaconWriteFields(beacon) {
        return {
            name: beacon.name,
            nickname: beacon.nickname,
            temp: beacon.temp ?? TEMP_UNKNOWN,
            battery: beacon.battery ?? 0,
            rssi: beacon.rssi ?? 0,
            status: beacon.status,
            report_at: beacon.report_at,
        }
    }

    async updateBeacon(beacon){
        try {
            const fields = this._beaconWriteFields(beacon)
            const result = await prisma.beacon.upsert({
                where: { mac_addr: beacon.mac_addr },
                update: {
                    ...fields,
                    gateway_id: beacon.gateway_id,
                },
                create: {
                    ...fields,
                    mac_addr: beacon.mac_addr,
                    gateway: {
                        connect: {
                            id: beacon.gateway.id
                        }
                    }
                }
            })
            return result
        }
        catch (e) {
            logger.error(e)
            throw e
        }
    }

    async insertHistory(histories) {
        try {
            const result = await prisma.beacon_history.createMany({
                data: histories
            })
            return result
        }
        catch (e) {
            logger.error(e)
            throw e
        }
    }

    async getAllBeacons(){
        try{
            const result = await prisma.beacon.findMany({
                orderBy: { mac_addr: 'asc' },
                include: {
                    gateway: true
                }
            })
            return result
        }
        catch(e){
            logger.error(e)
            throw e
            return []
        }
    }

    async updateBeaconNickname(mac_addr, nickname) {
        return prisma.beacon.update({
            where: { mac_addr: mac_addr.toUpperCase() },
            data: { nickname: nickname || null },
        })
    }

    async updateGatewayName(gatewayId, name) {
        return prisma.gateway.update({
            where: { id: gatewayId },
            data: { name },
        })
    }

    async getAllGateways() {
        try {
            const result = await prisma.gateway.findMany()
            return result
        }
        catch (e) {
            logger.error(e)
            throw e
            return []
        }
    }

    async getGatewayById(id) {
        return prisma.gateway.findUnique({ where: { id } })
    }

    async getGatewayByMac(mac_addr) {
        return prisma.gateway.findFirst({
            where: { mac_addr: normalizeMac(mac_addr) },
        })
    }

    async createGateway(data) {
        return prisma.gateway.create({
            data: {
                id: data.id,
                name: data.name,
                mac_addr: normalizeMac(data.mac_addr),
                check_point: data.check_point,
            },
        })
    }

    async updateGateway(id, data) {
        return prisma.gateway.update({
            where: { id },
            data,
        })
    }

    async deleteGateway(id) {
        return prisma.gateway.delete({ where: { id } })
    }

    async countBeaconsForGateway(gatewayId) {
        return prisma.beacon.count({ where: { gateway_id: gatewayId } })
    }
}

export { BeaconDataStore }