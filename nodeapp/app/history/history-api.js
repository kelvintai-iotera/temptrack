import { loggerFactory } from '../../config/logger.js';
import { BEACON_STATUS } from '../beacon/beacon-status.js';
import { c } from '../../config/constant.js'
import { formatClientTemp, formatClientBattery } from '../beacon/sensor-values.js'
import { buildWhereFromFilters, validateOrderDir, validateOrderField } from './history-query-builder.js'
import { parseHistoryQuerySql } from './history-sql-parser.js'
import pkg from '@prisma/client'

const prisma = new pkg.PrismaClient()
const logger = loggerFactory('beacon-history-api')

const MAX_RECORD = c.HISTORY_API_PAGE_RECORD
const QUERY_MAX = c.HISTORY_QUERY_MAX_RECORD
const EXPORT_MAX = c.HISTORY_EXPORT_MAX_RECORD
const OFFSET_MAX = 50000

class BeaconHistoryApi {
    async getAll(startPage) {
        try {
            const input = {
                skip: startPage * MAX_RECORD,
                take: MAX_RECORD,
                orderBy: { report_at: 'desc' }
            }

            const result = await prisma.beacon_history.findMany(input)
            return this._remap(result)
        }
        catch (e) {
            logger.error(e)
            throw e
            return []
        }
    }

    _resolveQueryInput(body = {}) {
        if (body.sql) {
            return parseHistoryQuerySql(body.sql)
        }

        return {
            filters: Array.isArray(body.filters) ? body.filters : [],
            orderBy: body.orderBy || 'report_at',
            orderDir: body.orderDir || 'desc',
            limit: body.limit ?? MAX_RECORD,
            offset: body.offset ?? 0,
        }
    }

    async query(body = {}) {
        try {
            const parsed = this._resolveQueryInput(body)
            const orderField = validateOrderField(parsed.orderBy)
            const orderDir = validateOrderDir(parsed.orderDir)
            const take = Math.min(Math.max(parseInt(parsed.limit, 10) || MAX_RECORD, 1), QUERY_MAX)
            const skip = Math.min(Math.max(parseInt(parsed.offset, 10) || 0, 0), OFFSET_MAX)
            const where = buildWhereFromFilters(parsed.filters)

            const [rows, total] = await Promise.all([
                prisma.beacon_history.findMany({
                    where,
                    skip,
                    take,
                    orderBy: { [orderField]: orderDir },
                }),
                prisma.beacon_history.count({ where }),
            ])

            return {
                items: this._remap(rows),
                total,
                limit: take,
                offset: skip,
                orderBy: orderField,
                orderDir,
            }
        }
        catch (e) {
            logger.error(e)
            throw e
        }
    }

    async exportCsv(body = {}) {
        try {
            const parsed = this._resolveQueryInput(body)
            const orderField = validateOrderField(parsed.orderBy)
            const orderDir = validateOrderDir(parsed.orderDir)
            const take = Math.min(Math.max(parseInt(parsed.limit, 10) || EXPORT_MAX, 1), EXPORT_MAX)
            const where = buildWhereFromFilters(parsed.filters)

            const rows = await prisma.beacon_history.findMany({
                where,
                take,
                orderBy: { [orderField]: orderDir },
            })

            return this._toCsv(this._remap(rows))
        }
        catch (e) {
            logger.error(e)
            throw e
        }
    }

    _csvCell(value) {
        if (value == null) return ''
        const text = String(value)
        if (/[",\n\r]/.test(text)) {
            return `"${text.replace(/"/g, '""')}"`
        }
        return text
    }

    _toCsv(rows) {
        const headers = [
            'report_at',
            'beacon_mac_addr',
            'name',
            'nickname',
            'gateway_name',
            'gateway_mac_addr',
            'temp_c',
            'battery',
            'rssi',
            'status',
        ]

        const lines = [headers.join(',')]
        rows.forEach((row) => {
            lines.push([
                row.report_at ? new Date(row.report_at).toISOString() : '',
                row.beacon_mac_addr,
                row.name,
                row.nickname,
                row.gateway_name,
                row.gateway_mac_addr,
                row.temp,
                row.battery,
                row.rssi,
                row.status,
            ].map((v) => this._csvCell(v)).join(','))
        })

        return lines.join('\n')
    }

    async get(beacon_mac_addr, startPage) {
        try {
            const input = {
                skip: startPage * MAX_RECORD,
                take: MAX_RECORD,
                where: { beacon_mac_addr: beacon_mac_addr },
                orderBy: { report_at: 'desc' }
            }

            const result = await prisma.beacon_history.findMany(input)
            return this._remap(result)
        }
        catch (e) {
            logger.error(e)
            throw e
            return []
        }
    }

    _remap(beacons){
        return beacons.map(beacon => {
            return {
                report_at: beacon.report_at,
                name: beacon.name,
                nickname: beacon.nickname,
                beacon_mac_addr: beacon.beacon_mac_addr,
                temp: formatClientTemp(beacon.temp),
                battery: formatClientBattery(beacon.battery),
                rssi: beacon.rssi,
                status: beacon.status.toUpperCase(),
                gateway_name: beacon.gateway_name,
                gateway_mac_addr: beacon.gateway_mac_addr,
                alert: (beacon.status == BEACON_STATUS.ALERT)
            }
        })
    }
}

export { BeaconHistoryApi }