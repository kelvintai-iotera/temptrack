import pkg from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new pkg.PrismaClient()

const LEGACY_GATEWAY_IDS = ['Check Point Gateway', 'Check Point']
const WORKSHOP_ID = 'Workshop'
const OFFICE_DESK_ID = 'OfficeDesk'
const OFFICE_DESK_MAC = 'CE6299527263'
const LEGACY_GATEWAY_02_ID = 'Gateway 02'
const NEW_BEACON_PREFIX_VALUE = '80ECCC0,80ECCB0'

/** Rename existing DB gateway (seed alone does not update old primary keys). */
async function migrateLegacyGatewayToWorkshop() {
  for (const oldId of LEGACY_GATEWAY_IDS) {
    const legacy = await prisma.gateway.findUnique({ where: { id: oldId } })
    if (!legacy) continue

    await prisma.gateway.upsert({
      where: { id: WORKSHOP_ID },
      update: {
        name: WORKSHOP_ID,
        mac_addr: legacy.mac_addr,
        check_point: legacy.check_point,
      },
      create: {
        id: WORKSHOP_ID,
        name: WORKSHOP_ID,
        mac_addr: legacy.mac_addr,
        check_point: legacy.check_point,
      },
    })

    await prisma.beacon.updateMany({
      where: { gateway_id: oldId },
      data: { gateway_id: WORKSHOP_ID },
    })

    await prisma.beacon_history.updateMany({
      where: { gateway_name: oldId },
      data: { gateway_name: WORKSHOP_ID },
    })

    if (oldId !== WORKSHOP_ID) {
      await prisma.gateway.delete({ where: { id: oldId } })
    }

    console.log(`Migrated gateway "${oldId}" → "${WORKSHOP_ID}"`)
  }
}

async function migrateGateway02ToOfficeDesk() {
  const legacy = await prisma.gateway.findUnique({ where: { id: LEGACY_GATEWAY_02_ID } })
  if (!legacy) return

  await prisma.gateway.upsert({
    where: { id: OFFICE_DESK_ID },
    update: {
      name: OFFICE_DESK_ID,
      mac_addr: OFFICE_DESK_MAC,
      check_point: legacy.check_point,
    },
    create: {
      id: OFFICE_DESK_ID,
      name: OFFICE_DESK_ID,
      mac_addr: OFFICE_DESK_MAC,
      check_point: legacy.check_point,
    },
  })

  await prisma.beacon.updateMany({
    where: { gateway_id: LEGACY_GATEWAY_02_ID },
    data: { gateway_id: OFFICE_DESK_ID },
  })

  await prisma.beacon_history.updateMany({
    where: { gateway_name: LEGACY_GATEWAY_02_ID },
    data: { gateway_name: OFFICE_DESK_ID },
  })

  await prisma.gateway.delete({ where: { id: LEGACY_GATEWAY_02_ID } })
  console.log(`Migrated gateway "${LEGACY_GATEWAY_02_ID}" → "${OFFICE_DESK_ID}"`)
}

/** CE6299527263 is OfficeDesk gateway MAC — not a beacon. */
async function fixMisassignedOfficeDeskBeacon() {
  const mistaken = await prisma.beacon.findUnique({ where: { mac_addr: OFFICE_DESK_MAC } })
  if (mistaken) {
    await prisma.beacon.delete({ where: { mac_addr: OFFICE_DESK_MAC } })
    console.log(`Removed mistaken beacon for gateway MAC ${OFFICE_DESK_MAC}`)
  }
}

async function main() {
  await migrateLegacyGatewayToWorkshop()
  await migrateGateway02ToOfficeDesk()
  await fixMisassignedOfficeDeskBeacon()

  const hashedPassword = await bcrypt.hash('admin123', 10)
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { password: hashedPassword, role: 'admin' },
    create: {
      username: 'admin',
      password: hashedPassword,
      role: 'admin'
    }
  })
  const gateway1 = await prisma.gateway.upsert({
    where: { id: WORKSHOP_ID },
    update: { name: WORKSHOP_ID },
    create: {
      id: WORKSHOP_ID,
      name: WORKSHOP_ID,
      mac_addr: "EB42F1F2B7B2",
      check_point: true
    },
  })
  const gateway2 = await prisma.gateway.upsert({
    where: { id: OFFICE_DESK_ID },
    update: {
      name: OFFICE_DESK_ID,
      mac_addr: OFFICE_DESK_MAC,
    },
    create: {
      id: OFFICE_DESK_ID,
      name: OFFICE_DESK_ID,
      mac_addr: OFFICE_DESK_MAC,
      check_point: false
    },
  })

  console.log({ gateway1, gateway2 })
  newBeacon()
  param()
  await seedSampleHistory()
}

const NAMED_BEACONS = [
  { id: 'B1', mac: '80ECCC0008B6', nickname: 'Beacon 1', gateway_id: WORKSHOP_ID },
  { id: 'B2', mac: '80ECCB002111', nickname: 'Beacon 2', gateway_id: OFFICE_DESK_ID },
  { id: 'B3', mac: '80ECCC0006D1', nickname: 'Beacon 3', gateway_id: WORKSHOP_ID },
  { id: 'B4', mac: '80ECCC0008D1', nickname: 'Beacon 4', gateway_id: OFFICE_DESK_ID },
]

async function upsertNamedBeacon({ id, mac, nickname, gateway_id }) {
  return prisma.beacon.upsert({
    where: { mac_addr: mac },
    update: { name: nickname, nickname, gateway_id },
    create: {
      id,
      name: nickname,
      nickname,
      mac_addr: mac,
      gateway_id,
      temp: 242,
      battery: 0,
      rssi: 0,
      status: 'in',
    },
  })
}

async function newBeacon() {
  const results = []
  for (const beacon of NAMED_BEACONS) {
    results.push(await upsertNamedBeacon(beacon))
  }
  console.log({ beacons: results.map((b) => ({ mac: b.mac_addr, nickname: b.nickname })) })
}

async function seedSampleHistory() {
  const existing = await prisma.beacon_history.count()
  if (existing > 0) {
    console.log(`History already has ${existing} rows, skipping sample seed`)
    return
  }

  const gateways = await prisma.gateway.findMany()
  const gwById = Object.fromEntries(gateways.map((g) => [g.id, g]))
  const now = Date.now()
  const rows = []

  for (const beacon of NAMED_BEACONS) {
    const gateway = gwById[beacon.gateway_id]
    if (!gateway) continue

    for (let i = 0; i < 12; i += 1) {
      const reportAt = new Date(now - i * 15 * 60 * 1000)
      const tempTenths = 220 + (i % 5) * 8 + (beacon.id === 'B4' ? 80 : 0)
      rows.push({
        beacon_mac_addr: beacon.mac,
        name: beacon.nickname,
        nickname: beacon.nickname,
        report_at: reportAt,
        gateway_mac_addr: gateway.mac_addr,
        gateway_name: gateway.name,
        temp: tempTenths,
        battery: Math.max(40, 95 - i * 3),
        rssi: -55 - (i % 4) * 3,
        status: i > 8 ? 'out' : 'in',
      })
    }
  }

  if (rows.length > 0) {
    await prisma.beacon_history.createMany({ data: rows })
    console.log(`Seeded ${rows.length} sample history rows`)
  }
}

async function param() {
  await prisma.param.upsert({
    where: { key: 'BEACON_OUT_TIME' },
    update: {},
    create: {
      key: 'BEACON_OUT_TIME',
      value: '30',
      desc: 'Time to consider the beacon to be `OUT` or `ALERT`.  In seconds.'
    }
  })
  await prisma.param.upsert({
    where: { key: 'HISTORY_DELETE_EXPIRED_HOUR' },
    update: {},
    create: {
      key: 'HISTORY_DELETE_EXPIRED_HOUR',
      value: '36',
      desc: 'Time to delete the beacon history.  In hours.'
    }
  })
  await prisma.param.upsert({
    where: { key: 'NEW_BEACON_PREFIX' },
    update: { value: NEW_BEACON_PREFIX_VALUE },
    create: {
      key: 'NEW_BEACON_PREFIX',
      value: NEW_BEACON_PREFIX_VALUE,
      desc: 'New Beacon Mac Address Prefix to be automatically accepted by system. Comma separated (,).'
    }
  })
  await prisma.param.upsert({
    where: { key: 'TEMP_WARN_C' },
    update: {},
    create: {
      key: 'TEMP_WARN_C',
      value: '32',
      desc: 'Temperature warning threshold in °C.'
    }
  })
  await prisma.param.upsert({
    where: { key: 'TEMP_CRITICAL_C' },
    update: {},
    create: {
      key: 'TEMP_CRITICAL_C',
      value: '36',
      desc: 'Temperature critical threshold in °C.'
    }
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })