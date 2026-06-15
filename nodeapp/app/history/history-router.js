import { loggerFactory } from '../../config/logger.js';
import express from 'express'
import { adminMiddleware } from '../auth/auth-middleware.js';
import { BeaconHistoryApi } from './history-api.js';

const logger = loggerFactory("history-router")

function addHistoryRouter(){
    const router = express.Router()
    const api = new BeaconHistoryApi()

    router.post('/query', async (req, res) => {
        try {
            const result = await api.query(req.body || {})
            res.json(result)
        }
        catch (e) {
            logger.error(e)
            res.status(400).json({ error: e.message || 'Invalid history query' })
        }
    })

    router.post('/export', adminMiddleware, async (req, res) => {
        try {
            const csv = await api.exportCsv(req.body || {})
            const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
            res.setHeader('Content-Type', 'text/csv; charset=utf-8')
            res.setHeader('Content-Disposition', `attachment; filename="history-export-${stamp}.csv"`)
            res.send(`\uFEFF${csv}`)
        }
        catch (e) {
            logger.error(e)
            res.status(400).json({ error: e.message || 'Invalid export query' })
        }
    })

    router.get('/b/:mac/:page?', async (req, res, next) => {
        const mac = req.params.mac
        const page = parseInt(req.params.page) || 0
        const allBeacons = await api.get(mac, page)

        res.json(allBeacons)
    })

    router.get('/:page?', async (req, res, next) => {
        const page = parseInt(req.params.page) || 0
        const allBeacons = await api.getAll(page)

        res.json(allBeacons)
    })

    return router
}
export { addHistoryRouter }
