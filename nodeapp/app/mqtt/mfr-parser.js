/**
 * Parse BLE manufacturer data (MFR hex) into temperature, battery, and humidity.
 *
 * Minew HT (0x01): temp raw × 0.05°C → stored as ×10 (490 → 24.5°C).
 * Minew Info (0xA1): battery only.
 * Legacy offset byte 6/8: 0.1°C — only for 80ECCA/B/C and 88ECCCD MAC prefixes.
 *
 * YKT-S05 private broadcast 1 (protocol 0x08/0x09):
 *   company + ver + MAC + battery + temp BE + humidity BE + flags
 *
 * YKT-S06 private broadcast 1 (protocol 0x0A) — different layout:
 *   company + ver + MAC + battery + channel + status + src1 BE + src2 BE + flags
 *   channel 0/1: src1=temp 0.01°C, src2=humidity 0.01%RH
 *   channel 2/3/4: src1/src2 = dual temperatures (store src1 as temp, humidity null)
 *
 * YKT fallback: locate device MAC (forward/reversed) and pick layout from version byte.
 */

import {
    isPlausibleSensorTemp,
    isPlausibleYktTemp,
    isPlausibleYktS06Temp,
    isValidBattery,
    isValidHumidity,
    YKT_SENSOR_INVALID_RAW,
} from '../beacon/sensor-values.js'

const LEGACY_MAC_PREFIXES = ['80ECCA', '80ECCB', '80ECCC', '88ECCCD']
/** Wire order in PDF: 4B 59 (config 0x594B LE). Also accept 59 4B. */
const YKT_COMPANY_IDS = [
    [0x4b, 0x59],
    [0x59, 0x4b],
]
const YKT_S05_PROTOCOL_VERSIONS = new Set([0x08, 0x09])
const YKT_S06_PROTOCOL_VERSION = 0x0a
/** Real devices observed with OUI D948…; PDF samples use D94B… */
const YKT_MAC_PREFIXES = ['D94']
/** S06 channel: 0 builtin T/H, 1 external T/H, 2 DS18B20, 3 PT100, 4 NTC */
const YKT_S06_TH_CHANNELS = new Set([0, 1])
const YKT_S06_TEMP_ONLY_CHANNELS = new Set([2, 3, 4])

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

function isYktInvalidRaw(raw) {
    return raw == null || raw === YKT_SENSOR_INVALID_RAW
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

function buildYktS05Result(battery, tempRaw, humidityRaw, profile) {
    if (isYktInvalidRaw(tempRaw) || humidityRaw == null || !isValidBattery(battery)) return null

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
 * S06 dual-source frame after MAC:
 *   +0 battery, +1 channel, +2 status, +3..4 src1, +5..6 src2, +7 record, +8 alarm
 */
function buildYktS06Result(battery, channel, src1Raw, src2Raw, profile) {
    if (!isValidBattery(battery)) return null
    if (channel == null || channel < 0 || channel > 4) return null

    if (YKT_S06_TH_CHANNELS.has(channel)) {
        if (isYktInvalidRaw(src1Raw) || isYktInvalidRaw(src2Raw)) {
            // Partial: keep whatever channel is valid
            const temp = !isYktInvalidRaw(src1Raw) ? Math.round(src1Raw / 10) : null
            const humidity = !isYktInvalidRaw(src2Raw) && isValidHumidity(src2Raw) ? src2Raw : null
            if (temp != null && !isPlausibleYktS06Temp(temp) && !isPlausibleYktTemp(temp)) {
                return null
            }
            if (temp == null && humidity == null) return null
            return { temp, battery, humidity, profile }
        }

        const temp = Math.round(src1Raw / 10)
        if (!isPlausibleYktTemp(temp) && !isPlausibleYktS06Temp(temp)) return null
        if (!isValidHumidity(src2Raw)) return null
        return { temp, battery, humidity: src2Raw, profile }
    }

    if (YKT_S06_TEMP_ONLY_CHANNELS.has(channel)) {
        if (isYktInvalidRaw(src1Raw)) return null
        const temp = Math.round(src1Raw / 10)
        if (!isPlausibleYktS06Temp(temp)) return null
        return { temp, battery, humidity: null, profile }
    }

    return null
}

/** YKT-S05: company + ver + MAC + battery + temp + humidity + flags (16 bytes from company) */
function parseYktS05FrameAt(bytes, companyStart) {
    if (companyStart + 15 >= bytes.length) return null

    const version = bytes[companyStart + 2]
    if (!YKT_S05_PROTOCOL_VERSIONS.has(version)) return null

    const battery = bytes[companyStart + 9]
    const tempRaw = readInt16BE(bytes, companyStart + 10)
    const humidityRaw = readUInt16BE(bytes, companyStart + 12)
    return buildYktS05Result(battery, tempRaw, humidityRaw, 'ykt-s05')
}

/**
 * YKT-S06: company + ver + MAC + battery + channel + status + src1 + src2 + flags
 * Manufacturer AD length 0x13 (19) = 2 company + 17 payload from version…alarm, or
 * 2 company + 16 private bytes per doc (offsets 0..17 inclusive = 18 bytes from company).
 */
function parseYktS06FrameAt(bytes, companyStart) {
    // Need through alarm at companyStart+17
    if (companyStart + 17 >= bytes.length) return null

    const version = bytes[companyStart + 2]
    if (version !== YKT_S06_PROTOCOL_VERSION) return null

    const battery = bytes[companyStart + 9]
    const channel = bytes[companyStart + 10]
    const src1Raw = readInt16BE(bytes, companyStart + 12)
    const src2Raw = readInt16BE(bytes, companyStart + 14)
    return buildYktS06Result(battery, channel, src1Raw, src2Raw, 'ykt-s06')
}

function parseYktCompanyFrames(bytes) {
    for (let i = 0; i < bytes.length - 15; i++) {
        for (const company of YKT_COMPANY_IDS) {
            if (bytes[i] !== company[0] || bytes[i + 1] !== company[1]) continue

            const version = bytes[i + 2]
            if (YKT_S05_PROTOCOL_VERSIONS.has(version)) {
                const s05 = parseYktS05FrameAt(bytes, i)
                if (s05) return s05
            }
            if (version === YKT_S06_PROTOCOL_VERSION) {
                const s06 = parseYktS06FrameAt(bytes, i)
                if (s06) return s06
            }
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

function parseYktS05TailAfterMac(bytes, macOffset, profile) {
    if (macOffset + 12 >= bytes.length) return null
    const battery = bytes[macOffset + 6]
    const tempRaw = readInt16BE(bytes, macOffset + 7)
    const humidityRaw = readUInt16BE(bytes, macOffset + 9)
    return buildYktS05Result(battery, tempRaw, humidityRaw, profile)
}

function parseYktS06TailAfterMac(bytes, macOffset, profile) {
    // battery(+6) … alarm(+14) → need macOffset+14
    if (macOffset + 14 >= bytes.length) return null
    const battery = bytes[macOffset + 6]
    const channel = bytes[macOffset + 7]
    const src1Raw = readInt16BE(bytes, macOffset + 9)
    const src2Raw = readInt16BE(bytes, macOffset + 11)
    return buildYktS06Result(battery, channel, src1Raw, src2Raw, profile)
}

/**
 * Locate this beacon's MAC inside MFR and decode using version byte before MAC when present.
 */
function parseYktByMacAnchor(bytes, macAddr) {
    const macBytesArr = macToBytes(macAddr)
    if (!macBytesArr) return null

    const candidates = [macBytesArr, [...macBytesArr].reverse()]
    for (const needle of candidates) {
        let from = 0
        while (from <= bytes.length - 6) {
            const idx = findSubsequence(bytes.slice(from), needle)
            if (idx < 0) break
            const macOffset = from + idx
            const version = macOffset > 0 ? bytes[macOffset - 1] : null

            if (version === YKT_S06_PROTOCOL_VERSION) {
                const s06 = parseYktS06TailAfterMac(bytes, macOffset, 'ykt-s06-mac')
                if (s06) return s06
            }

            if (version != null && YKT_S05_PROTOCOL_VERSIONS.has(version)) {
                const s05 = parseYktS05TailAfterMac(bytes, macOffset, 'ykt-s05-mac')
                if (s05) return s05
            }

            // Unknown version: prefer S06 only when the longer S06 tail is present
            const hasS06Tail = macOffset + 14 < bytes.length
            if (hasS06Tail) {
                const tryS06 = parseYktS06TailAfterMac(bytes, macOffset, 'ykt-s06-mac')
                if (tryS06) return tryS06
            }
            const tryS05 = parseYktS05TailAfterMac(bytes, macOffset, 'ykt-s05-mac')
            if (tryS05) return tryS05

            // Private broadcast 2: MAC + battery only
            if (macOffset + 6 < bytes.length) {
                const battery = bytes[macOffset + 6]
                if (isValidBattery(battery)) {
                    return {
                        temp: null,
                        battery,
                        humidity: null,
                        profile: 'ykt-beacon',
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
        const ykt = parseYktCompanyFrames(bytes)
        if (ykt) return ykt
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
