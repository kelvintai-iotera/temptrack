import '../config/env.js'
import express from 'express';
import helmet from 'helmet';
import { join, dirname } from 'path';
import cookieParser from 'cookie-parser';
import { logger } from '../config/logger.js';
import expressPinoLogger from 'express-pino-logger';
import { fileURLToPath } from 'url';

import { addBeaconRouter } from './beacon/beacon-router.js'
import { addHistoryRouter } from './history/history-router.js'

import { MyMqttClient } from './mqtt/mqtt-client.js';
import { BeaconDataStore } from './beacon/beacon-datastore.js';
import { BeaconRepository } from './beacon/beacon-repository.js';
import { ParamRepository } from './param/param-repository.js';
import { MqttProcessor } from './mqtt/mqtt-processor.js';
import { ScheduleTask } from './job/schedule-task.js';
import { addSettingsRouter } from './settings/settings-router.js';
import { addFloorPlanRouter } from './floor-plan/floor-plan-router.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const expressPino = expressPinoLogger({
    logger: logger
})

function initApp() {
    const app = express();

    // app.use(expressPino);
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "blob:"],
                connectSrc: ["'self'", "wss:", "ws:"],
            },
        },
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));
    // Floor plan uploads are base64 JSON payloads — parse before the global 256kb limit.
    app.use('/floor-plan/upload', express.json({ limit: '12mb' }));
    app.use(express.json({ limit: '256kb' }));
    app.use(express.urlencoded({ extended: false, limit: '256kb' }));
    app.use(cookieParser());
    app.use(express.static(join(__dirname, '../public')));

    app.set('view engine', 'ejs'); 
    app.set('views', join(__dirname, 'views'))

    return app;
}


import { authRouter } from './auth/auth-router.js';
import { authMiddleware } from './auth/auth-middleware.js';
import { getJwtSecret } from '../config/jwt.js';

class MyApp {
    constructor(){
        this.app = initApp()

        this._beaconRepository = new BeaconRepository(new BeaconDataStore())
        this._mqttProcessor = new MqttProcessor(this._beaconRepository)
        this._mqttClient = new MyMqttClient(this._mqttProcessor)
        this._paramRepository = null
        this._scheduleTask = null
        this._startedAt = null
    }

    getApp(){
        return this.app
    }

    async init(io) {
        getJwtSecret()
        this._startedAt = new Date()

        const paramRepository = new ParamRepository()
        await paramRepository.init()
        this._paramRepository = paramRepository

        await this._beaconRepository.init(paramRepository.getNewBeaconPrefix())
        await this._mqttProcessor.init(io, paramRepository.getBeaconOutTime())
        await this._mqttClient.init()

        this._scheduleTask = new ScheduleTask(
            this._mqttProcessor,
            paramRepository.getHistoryExpiredTime()
        )
        this._scheduleTask.schedule()

        this._initRouter(this.app, paramRepository)
    }

    _initRouter(app, paramRepository) {
        app.use('/auth', authRouter)
        app.use('/settings', addSettingsRouter({
            paramRepository,
            mqttProcessor: this._mqttProcessor,
            beaconRepository: this._beaconRepository,
            scheduleTask: this._scheduleTask,
            mqttClient: this._mqttClient,
            startedAt: this._startedAt,
        }))
        app.use('/beacons', authMiddleware, addBeaconRouter(this._beaconRepository, this._mqttProcessor))
        app.use('/history', authMiddleware, addHistoryRouter())
        app.use('/floor-plan', addFloorPlanRouter())

        // Serve the dashboard for any other routes (SPA support)
        app.get('*', (req, res) => {
            res.sendFile(join(__dirname, '../public/index.html'));
        });

        return app
    }
}


const myApp = new MyApp()

export { myApp }