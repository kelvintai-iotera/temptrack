/**
 * Parse BLE manufacturer data (MFR hex) into temperature, battery, and humidity.
 *
 * Minew HT (0x01): temp raw × 0.05°C → stored as ×10 (490 → 24.5°C).
 * Minew Info (0xA1): battery only.
 * Legacy offset byte 6/8: 0.1°C — only for 80ECCA/B/C and 88ECCCD MAC prefixes.
 * YKT-S05 private broadcast 1 (company 0x4B59 / LE 0x594B, protocol 0x08/0x09):
 *   temp BE 0.01°C → stored as ×10; humidity BE 0.01% → stored as hundredths.
 * YKT fallback: locate device MAC (forward or reversed) inside MFR and read sensor
 *   fields after it — covers company-stripped gateway payloads and OUI D948/D94B.
 */

import {
    isPlausibleSensorTemp,
    isPlausibleYktTemp,
    isValidBattery,
    isValidHumidity,
} from '../beacon/sensor-values.js'

const LEGACY_MAC_PREFIXES = ['80ECCA', '80ECCB', '80ECCC', '88ECCCD']
/** Wire order in PDF samples: 4B 59. Also accept BLE LE order 59 4B. */
const YKT_COMPANY_IDS = [
    [0x4b, 0x59],
    [0x59, 0x4b],
]
const YKT_PROTOCOL_VERSIONS = new Set([0x08, 0x09])
/** Real devices observed with OUI D948…; PDF samples use D94B… */
const YKT_MAC_PREFIXES = ['D94']

function emptyResult(profile = null) {
    return { temp: null, battery: null, humidity: null, profile }
}

function normalizeMfrHex(mfr) {
    if (mfr == null) return ''
    return String(mfr).replace(/[^0-9a-fA-F]/g, '').toUpperCase()
}

function hexToBytes(hex) {
    const bytes = []
    for (let i = 0; i + 1 < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16))
    }
    return bytes
}

function readInt16LE(bytes, offset) {
    if (offset + 1 >= bytes.length) return null
    const value = bytes[offset] | (bytes[offset + 1] << 8)
    return value > 0x7fff ? value - 0x10000 : value
}

function readInt16BE(bytes, offset) {
    if (offset + 1 >= bytes.length) return null
    const value = (bytes[offset] << 8) | bytes[offset + 1]
    return value > 0x7fff ? value - 0x10000 : value
}

function readUInt16BE(bytes, offset) {
    if (offset + 1 >= bytes.length) return null
    return (bytes[offset] << 8) | bytes[offset + 1]
}

function normalizeMac(macAddr) {
    return String(macAddr || '').replace(/[^0-9a-fA-F]/g, '').toUpperCase()
}

function macUsesLegacyLayout(macAddr) {
    const mac = normalizeMac(macAddr)
    return LEGACY_MAC_PREFIXES.some(prefix => mac.startsWith(prefix))
}

function macIsMinewSensorFamily(macAddr) {
    return normalizeMac(macAddr).startsWith('88ECC')
}

function macIsYktFamily(macAddr) {
    const mac = normalizeMac(macAddr)
    return YKT_MAC_PREFIXES.some(prefix => mac.startsWith(prefix))
}

function macToBytes(macAddr) {
    const mac = normalizeMac(macAddr)
    if (mac.length < 12) return null
    const bytes = []
    for (let i = 0; i < 12; i += 2) {
        bytes.push(parseInt(mac.substr(i, 2), 16))
    }
    return bytes
}

function findSubsequence(haystack, needle) {
    if (!needle || needle.length === 0 || haystack.length < needle.length) return -1
    for (let i = 0; i <= haystack.length - needle.length; i++) {
        let ok = true
        for (let j = 0; j < needle.length; j++) {
            if (haystack[i + j] !== needle[j]) {
                ok = false
                break
            }
        }
        if (ok) return i
    }
    return -1
}

/** Legacy: temp int16 LE at byte 6 (0.1°C), battery at byte 8 */
function parseLegacyFixedOffset(bytes) {
    if (bytes.length < 9) return null

    const tempRaw = readInt16LE(bytes, 6)
    const battery = bytes[8]

    if (tempRaw == null || !isValidBattery(battery)) return null

    const temp = tempRaw
    if (!isPlausibleSensorTemp(temp)) return null

    return { temp, battery, humidity: null, profile: 'legacy-offset' }
}

/** Minew payload at frame type byte */
function parseMinewFrameAt(bytes, frameStart) {
    if (frameStart + 2 >= bytes.length) return null

    const frameType = bytes[frameStart]
    const battery = bytes[frameStart + 2]

    if (frameType === 0x01) {
        if (frameStart + 4 >= bytes.length) return null
        const tempRaw = readInt16LE(bytes, frameStart + 3)
        if (tempRaw == null || !isValidBattery(battery)) return null

        const temp = Math.round(tempRaw * 0.5)
        if (!isPlausibleSensorTemp(temp)) return null

        return { temp, battery, humidity: null, profile: 'minew-ht' }
    }

    if (frameType === 0xa1) {
        if (!isValidBattery(battery)) return null
        return { temp: null, battery, humidity: null, profile: 'minew-info' }
    }

    return null
}

function parseMinewPayload(bytes) {
    let htResult = null
    let infoResult = null

    for (let i = 0; i < bytes.length - 4; i++) {
        if (bytes[i] !== 0xe1 || bytes[i + 1] !== 0xff) continue

        const parsed = parseMinewFrameAt(bytes, i + 2)
        if (!parsed) continue

        if (parsed.profile === 'minew-ht') htResult = parsed
        else if (parsed.profile === 'minew-info') infoResult = parsed
    }

    if (htResult) return htResult
    if (infoResult) return infoResult
    return null
}

/** Find HT frame when MFR is a slice without leading E1FF (common on 88ECCCE devices) */
function scanForMinewHtFrame(bytes) {
    for (let i = 0; i + 4 < bytes.length; i++) {
        let frameStart = -1

        if (bytes[i] === 0xe1 && bytes[i + 1] === 0xff && bytes[i + 2] === 0x01) {
            frameStart = i + 2
        } else if (bytes[i] === 0x01 && bytes[i + 1] <= 0x20) {
            frameStart = i
        }

        if (frameStart < 0) continue

        const parsed = parseMinewFrameAt(bytes, frameStart)
        if (parsed?.profile === 'minew-ht') return parsed
    }
    return null
}

function hasMinewCompanyId(bytes) {
    for (let i = 0; i < bytes.length - 1; i++) {
        if (bytes[i] === 0xe1 && bytes[i + 1] === 0xff) return true
    }
    return false
}

function buildYktSensorResult(battery, tempRaw, humidityRaw, profile) {
    if (tempRaw == null || humidityRaw == null || !isValidBattery(battery)) return null

    const temp = Math.round(tempRaw / 10)
    if (!isPlausibleYktTemp(temp)) return null
    if (!isValidHumidity(humidityRaw)) return null

    return {
        temp,
        battery,
        humidity: humidityRaw,
        profile,
    }
}

/**
 * YKT-S05 私有廣播 1: company + version + MAC(6) + battery + temp BE + humidity BE + flags
 */
function parseYktS05FrameAt(bytes, companyStart) {
    if (companyStart + 15 >= bytes.length) return null

    const version = bytes[companyStart + 2]
    if (!YKT_PROTOCOL_VERSIONS.has(version)) return null

    const battery = bytes[companyStart + 9]
    const tempRaw = readInt16BE(bytes, companyStart + 10)
    const humidityRaw = readUInt16BE(bytes, companyStart + 12)
    return buildYktSensorResult(battery, tempRaw, humidityRaw, 'ykt-s05')
}

function parseYktS05Payload(bytes) {
    for (let i = 0; i < bytes.length - 15; i++) {
        for (const company of YKT_COMPANY_IDS) {
            if (bytes[i] !== company[0] || bytes[i + 1] !== company[1]) continue
            const parsed = parseYktS05FrameAt(bytes, i)
            if (parsed) return parsed
        }
    }
    return null
}

function hasYktCompanyId(bytes) {
    for (let i = 0; i < bytes.length - 1; i++) {
        for (const company of YKT_COMPANY_IDS) {
            if (bytes[i] === company[0] && bytes[i + 1] === company[1]) return true
        }
    }
    return false
}

/**
 * Locate this beacon's MAC inside MFR (forward or reversed) and decode sensor tail.
 * Works when gateway strips company ID or uses an unknown protocol version byte.
 */
function parseYktByMacAnchor(bytes, macAddr) {
    const macBytes = macToBytes(macAddr)
    if (!macBytes) return null

    const candidates = [macBytes, [...macBytes].reverse()]
    for (const needle of candidates) {
        let from = 0
        while (from <= bytes.length - 6) {
            const idx = findSubsequence(bytes.slice(from), needle)
            if (idx < 0) break
            const macOffset = from + idx

            // Private broadcast 1 sensor tail after MAC
            if (macOffset + 12 < bytes.length) {
                const battery = bytes[macOffset + 6]
                const tempRaw = readInt16BE(bytes, macOffset + 7)
                const humidityRaw = readUInt16BE(bytes, macOffset + 9)
                const parsed = buildYktSensorResult(battery, tempRaw, humidityRaw, 'ykt-s05-mac')
                if (parsed) return parsed
            }

            // Private broadcast 2: MAC + battery only (no temp/humidity)
            if (macOffset + 6 < bytes.length) {
                const battery = bytes[macOffset + 6]
                if (isValidBattery(battery)) {
                    return {
                        temp: null,
                        battery,
                        humidity: null,
                        profile: 'ykt-s05-beacon',
                    }
                }
            }

            from = macOffset + 1
        }
    }

    return null
}

function parseMfrPayload(mfr, macAddr) {
    const hex = normalizeMfrHex(mfr)
    if (hex.length < 8) {
        return emptyResult()
    }

    const bytes = hexToBytes(hex)

    if (hasYktCompanyId(bytes)) {
        const ykt = parseYktS05Payload(bytes)
        if (ykt) return ykt
        // Company ID present but version/layout unknown — try MAC anchor before giving up
        if (macIsYktFamily(macAddr)) {
            const anchored = parseYktByMacAnchor(bytes, macAddr)
            if (anchored) return anchored
        }
        return emptyResult('ykt-non-sensor')
    }

    if (macIsYktFamily(macAddr)) {
        const anchored = parseYktByMacAnchor(bytes, macAddr)
        if (anchored) return anchored
    }

    if (hasMinewCompanyId(bytes)) {
        const minew = parseMinewPayload(bytes)
        if (minew) return minew
        return emptyResult('minew-non-sensor')
    }

    if (macIsMinewSensorFamily(macAddr)) {
        const ht = scanForMinewHtFrame(bytes)
        if (ht) return ht
    }

    if (macUsesLegacyLayout(macAddr)) {
        const legacy = parseLegacyFixedOffset(bytes)
        if (legacy) return legacy
    }

    return emptyResult()
}

export {
    parseMfrPayload,
    normalizeMfrHex,
    macUsesLegacyLayout,
    macIsMinewSensorFamily,
    macIsYktFamily,
}
