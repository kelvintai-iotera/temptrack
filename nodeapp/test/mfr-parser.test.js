import { parseMfrPayload } from '../app/mqtt/mfr-parser.js'

describe('parseMfrPayload', () => {
    test('parses legacy fixed-offset for 80ECCC MAC (0.1°C)', () => {
        const hex = '000000000000' + 'fa00' + '64' + '00'
        const r = parseMfrPayload(hex, '80ECCCCE50B5')
        expect(r.temp).toBe(250)
        expect(r.battery).toBe(100)
    })

    test('parses legacy for 88ECCCD MAC prefix', () => {
        const hex = '000000000000' + 'f900' + '64' + '00'
        const r = parseMfrPayload(hex, '88ECCCD000B6')
        expect(r.temp).toBe(249)
        expect(r.profile).toBe('legacy-offset')
    })

    test('parses Minew HT frame (0.05°C per step)', () => {
        const bytes = [0xe1, 0xff, 0x01, 0x01, 100, 0xea, 0x01]
        const hex = bytes.map(b => b.toString(16).padStart(2, '0')).join('')
        const r = parseMfrPayload(hex, '88ECCCCE2B21')
        expect(r.temp).toBe(245)
        expect(r.profile).toBe('minew-ht')
    })

    test('rejects 58.8°C at legacy offset (588)', () => {
        const hex = '0000000000004c0215'
        const r = parseMfrPayload(hex, '80ECCCCE50B5')
        expect(r.temp).toBeNull()
    })

    test('88ECCCCE does not use legacy offset without HT frame', () => {
        const hex = '0000000000004c0215'
        const r = parseMfrPayload(hex, '88ECCCCE5CAD')
        expect(r.temp).toBeNull()
        expect(r.profile).not.toBe('legacy-offset')
    })

    test('scans HT frame without leading E1FF in MFR', () => {
        const bytes = [0x01, 0x01, 100, 0xea, 0x01]
        const hex = bytes.map(b => b.toString(16).padStart(2, '0')).join('')
        const r = parseMfrPayload(hex, '88ECCCCE5D79')
        expect(r.profile).toBe('minew-ht')
        expect(r.temp).toBe(245)
        expect(r.humidity).toBeNull()
    })

    test('parses YKT-S05 private broadcast 1 (protocol 0x08)', () => {
        // company 4B59, ver 08, MAC D94B54000001, bat 100, temp 22.91°C, hum 88.82%
        const hex = '4B5908D94B540000016408F322B20100'
        const r = parseMfrPayload(hex, 'D94B54000001')
        expect(r.profile).toBe('ykt-s05')
        expect(r.temp).toBe(229)
        expect(r.humidity).toBe(8882)
        expect(r.battery).toBe(100)
    })

    test('parses YKT-S05 when MFR includes AD length/type wrapper', () => {
        // PDF sample uses protocol 0x09 with same layout
        const hex = '02010610FF4B5909D94B550010186408F322B20100'
        const r = parseMfrPayload(hex, 'D94B55001018')
        expect(r.profile).toBe('ykt-s05')
        expect(r.temp).toBe(229)
        expect(r.humidity).toBe(8882)
        expect(r.battery).toBe(100)
    })

    test('parses YKT via MAC anchor when company ID is stripped (D948 OUI)', () => {
        // ver + MAC D94854011F38 + bat + temp 22.91 + hum 88.82 + flags
        const hex = '08D94854011F386408F322B20100'
        const r = parseMfrPayload(hex, 'D94854011F38')
        expect(r.profile).toBe('ykt-s05-mac')
        expect(r.temp).toBe(229)
        expect(r.humidity).toBe(8882)
        expect(r.battery).toBe(100)
    })

    test('parses YKT with little-endian company ID 594B', () => {
        const hex = '594B08D94854011F386408F322B20100'
        const r = parseMfrPayload(hex, 'D94854011F38')
        expect(r.profile).toBe('ykt-s05')
        expect(r.temp).toBe(229)
        expect(r.humidity).toBe(8882)
    })

    test('parses YKT MAC-reversed payload', () => {
        // MAC bytes reversed in MFR: 381F015448D9
        const hex = '4B5908381F015448D96408F322B20100'
        const r = parseMfrPayload(hex, 'D94854011F38')
        expect(['ykt-s05', 'ykt-s05-mac']).toContain(r.profile)
        expect(r.temp).toBe(229)
        expect(r.humidity).toBe(8882)
    })

    test('parses YKT-S06 private broadcast 1 (protocol 0x0A) from PDF sample', () => {
        // 13FF 4B59 0A MAC bat ch st src1=25.00°C src2=60.00%RH flags
        const hex = '02010613FF4B590AD94B5400000164000009C417700100'
        const r = parseMfrPayload(hex, 'D94B54000001')
        expect(r.profile).toBe('ykt-s06')
        expect(r.temp).toBe(250)
        expect(r.humidity).toBe(6000)
        expect(r.battery).toBe(100)
    })

    test('parses YKT-S06 dual-temp channel without humidity', () => {
        // channel 2 DS18B20: src1=20.00°C src2=21.00°C → store src1 only
        const hex = '4B590AD94B5400000164020007D008340100'
        const r = parseMfrPayload(hex, 'D94B54000001')
        expect(r.profile).toBe('ykt-s06')
        expect(r.temp).toBe(200)
        expect(r.humidity).toBeNull()
        expect(r.battery).toBe(100)
    })

    test('does not mis-parse S06 frame as S05', () => {
        const hex = '4B590AD94B5400000164000009C417700100'
        const r = parseMfrPayload(hex, 'D94B54000001')
        expect(r.profile).toBe('ykt-s06')
        expect(r.temp).toBe(250)
        expect(r.humidity).toBe(6000)
    })
})
