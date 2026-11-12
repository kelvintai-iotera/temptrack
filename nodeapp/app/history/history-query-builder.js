const QUERY_FIELDS = Object.freeze({
    beacon_mac_addr: { type: 'string' },
    gateway_mac_addr: { type: 'string' },
    gateway_name: { type: 'string' },
    name: { type: 'string' },
    nickname: { type: 'string' },
    status: { type: 'status' },
    temp: { type: 'temp' },
    humidity: { type: 'humidity' },
    battery: { type: 'number' },
    rssi: { type: 'number' },
    report_at: { type: 'datetime' },
})

const ORDER_FIELDS = new Set(Object.keys(QUERY_FIELDS))

const STRING_OPS = new Set(['=', '!=', '<>', 'like', 'not_like'])
const NUMERIC_OPS = new Set(['=', '!=', '<>', '>', '>=', '<', '<='])
const DATETIME_OPS = new Set(['=', '!=', '<>', '>', '>=', '<', '<='])
const STATUS_OPS = new Set(['=', '!=', '<>', 'in'])

function normalizeOp(op) {
    const key = String(op || '').trim().toLowerCase().replace(/\s+/g, '_')
    if (key === '<>') return '!='
    if (key === 'not_like') return 'not_like'
    return key
}

function normalizeStatus(value) {
    return String(value || '').trim().toLowerCase()
}

function parseDateValue(value) {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) {
        throw new Error(`Invalid date: ${value}`)
    }
    return d
}

function coerceFilterValue(field, op, rawValue) {
    const meta = QUERY_FIELDS[field]
    if (!meta) {
        throw new Error(`Unknown field: ${field}`)
    }

    const opKey = normalizeOp(op)

    if (opKey === 'in') {
        if (!Array.isArray(rawValue) || rawValue.length === 0) {
            throw new Error(`IN requires a non-empty list for ${field}`)
        }
        if (meta.type === 'status') {
            return rawValue.map(normalizeStatus)
        }
        return rawValue.map((v) => String(v).trim())
    }

    if (meta.type === 'temp') {
        const num = Number(rawValue)
        if (Number.isNaN(num)) {
            throw new Error(`Invalid temperature: ${rawValue}`)
        }
        return Math.round(num * 10)
    }

    if (meta.type === 'humidity') {
        const num = Number(rawValue)
        if (Number.isNaN(num)) {
            throw new Error(`Invalid humidity: ${rawValue}`)
        }
        return Math.round(num * 100)
    }

    if (meta.type === 'number') {
        const num = Number(rawValue)
        if (Number.isNaN(num)) {
            throw new Error(`Invalid number for ${field}: ${rawValue}`)
        }
        return num
    }

    if (meta.type === 'datetime') {
        return parseDateValue(rawValue)
    }

    if (meta.type === 'status') {
        return normalizeStatus(rawValue)
    }

    return String(rawValue ?? '').trim()
}

function assertOpAllowed(field, op) {
    const meta = QUERY_FIELDS[field]
    const opKey = normalizeOp(op)
    let allowed = STRING_OPS

    if (meta.type === 'temp' || meta.type === 'humidity' || meta.type === 'number') {
        allowed = NUMERIC_OPS
    } else if (meta.type === 'datetime') {
        allowed = DATETIME_OPS
    } else if (meta.type === 'status') {
        allowed = STATUS_OPS
    }

    if (!allowed.has(opKey)) {
        throw new Error(`Operator ${op} is not allowed for field ${field}`)
    }
}

function likePatternToPrisma(pattern) {
    const p = String(pattern)
    if (p.includes('%')) {
        if (p.startsWith('%') && p.endsWith('%') && p.length > 2) {
            return { contains: p.slice(1, -1), mode: 'insensitive' }
        }
        if (p.endsWith('%')) {
            return { startsWith: p.slice(0, -1), mode: 'insensitive' }
        }
        if (p.startsWith('%')) {
            return { endsWith: p.slice(1), mode: 'insensitive' }
        }
    }
    return { equals: p, mode: 'insensitive' }
}

function buildSingleCondition(field, op, rawValue) {
    assertOpAllowed(field, op)
    const opKey = normalizeOp(op)
    const value = coerceFilterValue(field, opKey, rawValue)

    if (opKey === 'in') {
        return { [field]: { in: value } }
    }

    if (opKey === 'like') {
        return { [field]: likePatternToPrisma(value) }
    }

    if (opKey === 'not_like') {
        return { NOT: { [field]: likePatternToPrisma(value) } }
    }

    if (opKey === '=') {
        if (QUERY_FIELDS[field].type === 'string' || QUERY_FIELDS[field].type === 'status') {
            return { [field]: { equals: value, mode: 'insensitive' } }
        }
        return { [field]: value }
    }

    if (opKey === '!=') {
        if (QUERY_FIELDS[field].type === 'string' || QUERY_FIELDS[field].type === 'status') {
            return { NOT: { [field]: { equals: value, mode: 'insensitive' } } }
        }
        return { NOT: { [field]: value } }
    }

    const prismaOp = opKey === '>' ? 'gt'
        : opKey === '>=' ? 'gte'
            : opKey === '<' ? 'lt'
                : opKey === '<=' ? 'lte'
                    : null

    if (!prismaOp) {
        throw new Error(`Unsupported operator: ${op}`)
    }

    return { [field]: { [prismaOp]: value } }
}

function buildWhereFromFilters(filters) {
    if (!Array.isArray(filters) || filters.length === 0) {
        return {}
    }

    const conditions = filters.map((f) => {
        if (!f?.field) {
            throw new Error('Each filter must include field')
        }
        const field = String(f.field).trim()
        if (!QUERY_FIELDS[field]) {
            throw new Error(`Unknown field: ${field}`)
        }
        return buildSingleCondition(field, f.op || '=', f.value)
    })

    return conditions.length === 1 ? conditions[0] : { AND: conditions }
}

function validateOrderField(field) {
    const key = String(field || 'report_at').trim()
    if (!ORDER_FIELDS.has(key)) {
        throw new Error(`Invalid ORDER BY field: ${field}`)
    }
    return key
}

function validateOrderDir(dir) {
    const key = String(dir || 'desc').trim().toLowerCase()
    if (key !== 'asc' && key !== 'desc') {
        throw new Error(`Invalid sort direction: ${dir}`)
    }
    return key
}

export {
    QUERY_FIELDS,
    ORDER_FIELDS,
    buildWhereFromFilters,
    buildSingleCondition,
    validateOrderField,
    validateOrderDir,
    coerceFilterValue,
    normalizeOp,
}
