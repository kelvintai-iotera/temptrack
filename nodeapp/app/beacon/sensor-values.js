/** Shared validation for temperature (0.1°C storage), humidity (0.01% storage), and battery %. */

const TEMP_PLAUSIBLE_MIN = 100  // 10.0°C
const TEMP_PLAUSIBLE_MAX = 450  // 45.0°C
/** YKT-S05 rated range −40~125°C (stored as 0.1°C tenths). */
const YKT_TEMP_PLAUSIBLE_MIN = -400
const YKT_TEMP_PLAUSIBLE_MAX = 1250
const TEMP_UNKNOWN = 9999       // written to DB when clearing bad readings
const HUMIDITY_PLAUSIBLE_MIN = 0
const HUMIDITY_PLAUSIBLE_MAX = 10000 // 100.00%

function isPlausibleSensorTemp(tempTenths) {
    return tempTenths != null && tempTenths >= TEMP_PLAUSIBLE_MIN && tempTenths <= TEMP_PLAUSIBLE_MAX
}

function isPlausibleYktTemp(tempTenths) {
    return tempTenths != null
        && tempTenths >= YKT_TEMP_PLAUSIBLE_MIN
        && tempTenths <= YKT_TEMP_PLAUSIBLE_MAX
}

function formatClientTemp(tempTenths) {
    if (tempTenths == null) return null
    if (isPlausibleSensorTemp(tempTenths) || isPlausibleYktTemp(tempTenths)) {
        return tempTenths / 10
    }
    return null
}

function isValidHumidity(humidityHundredths) {
    return humidityHundredths != null
        && Number.isFinite(humidityHundredths)
        && humidityHundredths >= HUMIDITY_PLAUSIBLE_MIN
        && humidityHundredths <= HUMIDITY_PLAUSIBLE_MAX
}

function formatClientHumidity(humidityHundredths) {
    if (!isValidHumidity(humidityHundredths)) return null
    return Math.round(humidityHundredths) / 100
}

function formatClientBattery(battery) {
    if (battery == null || battery < 0 || battery > 100) return null
    return battery
}

function isValidBattery(battery) {
    return battery != null && battery >= 0 && battery <= 100
}

export {
    TEMP_PLAUSIBLE_MIN,
    TEMP_PLAUSIBLE_MAX,
    YKT_TEMP_PLAUSIBLE_MIN,
    YKT_TEMP_PLAUSIBLE_MAX,
    TEMP_UNKNOWN,
    HUMIDITY_PLAUSIBLE_MIN,
    HUMIDITY_PLAUSIBLE_MAX,
    isPlausibleSensorTemp,
    isPlausibleYktTemp,
    isValidHumidity,
    formatClientTemp,
    formatClientHumidity,
    formatClientBattery,
    isValidBattery,
}
