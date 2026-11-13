import { loggerFactory } from '../../config/logger.js';
import express from 'express'
import { BeaconApi } from './beacon-api.js';
import { adminMiddleware } from '../auth/auth-middleware.js';

const logger = loggerFactory("beacon-router")

function addBeaconRouter(beaconRepository, mqttProcessor) {
    const beaconApi = new BeaconApi(beaconRepository)
    const router = express.Router()

    router.patch('/:mac/labels', adminMiddleware, async (req, res) => {
        const mac = req.params.mac
        const { nickname, gatewayName } = req.body ?? {}

        if (nickname === undefined && gatewayName === undefined) {
            return res.status(400).json({ msg: 'Provide nickname and/or gatewayName' })
        }

        try {
            const result = await beaconApi.updateLabels(mac, { nickname, gatewayName })

            if (result.error === 'NOT_FOUND') {
                return res.status(404).json({ msg: 'Beacon not found' })
            }
            if (result.error === 'NO_GATEWAY' || result.error === 'GATEWAY_NOT_FOUND') {
                return res.status(404).json({ msg: 'Gateway not found for this beacon' })
            }

            mqttProcessor.publishClientUpdate(result.beacons)
            res.json(result.clients)
        } catch (err) {
            logger.error(err)
            const msg = err.message === 'Gateway name is required'
                ? err.message
                : 'Failed to update labels'
            res.status(500).json({ msg })
        }
    })

    router.delete('/:mac', adminMiddleware, async (req, res) => {
        const mac = req.params.mac

        try {
            const result = await beaconApi.delete(mac)

            if (result.error === 'NOT_FOUND') {
                return res.status(404).json({ msg: 'Beacon not found' })
            }

            mqttProcessor.publishClientRemove(result.mac_addr)
            res.json({ mac_addr: result.mac_addr })
        } catch (err) {
            logger.error(err)
            res.status(500).json({ msg: 'Failed to delete beacon' })
        }
    })

    router.get('/b/:mac', async (req, res, next) => {
        const mac = req.params.mac
        const result = beaconApi.get(mac)
        if(result == null){
            res.status(404).json({})
        }
        else{
            res.json(result)
        }
    })

    router.get('/:page?', async (req, res, next) => {
        const page = parseInt(req.params.page) || 0
        const result = beaconApi.getAll(page)
        res.json(result)
    })

    return router
}
export { addBeaconRouter }
