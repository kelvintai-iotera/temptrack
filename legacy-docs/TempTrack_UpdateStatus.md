# TempTrack Σ┐«µö╣ΦêçΘâ¿τ╜▓τ┤ÇΘîä

µ£¼µ¬öµíêΦ¿ÿΘîäµ»Åµ¼íτ¿ïσ╝ÅΣ┐«µö╣σàºσ«╣Φêçσ£¿ Ubuntu Σ╝║µ£ìσÖ¿Σ╕èτÜäµ¢┤µû░µû╣σ╝ÅπÇé

---

## [2026-06-08] Dashboard Σ╕ëσìÇσ£ûΦí¿

### Σ┐«µö╣σàºσ«╣

1. **Dashboard 1**∩╝Üµ║½σ║ªµö╣τé║ **Bar Chart**∩╝êX=Beacon σÉìτ¿▒πÇüY=µ║½σ║ª ┬░C∩╝ë
2. **Dashboard 2**∩╝Ü**σ£ôΘñàσ£û** ΓÇö σÉä Location∩╝êGateway∩╝ëBeacon µò╕ΘçÅ
3. **Dashboard 3**∩╝Ü**µ⌐½σÉæσêåµ«╡µó¥σ£û** ΓÇö µ»Åσêù Location∩╝îΦë▓σíèτé║µëÇσ▒¼ Beacon

### Ubuntu µ¢┤µû░

```bash
cd ~/temptrack
git fetch origin && git reset --hard origin/main
docker compose up -d --build
```

τÇÅΦª╜σÖ¿ **Ctrl+F5** Θûï https://10.0.56.200:3011

---

## [2026-06-01] µ║½σ║ªΦºúµ₧ÉΣ┐«µ¡úπÇüUI ΦêçΘâ¿τ╜▓τ╡ÉµºïΦ¬┐µò┤

### Σ┐«µö╣σàºσ«╣

1. **Beacon σêùΦí¿**
   - σÅûµ╢ê Socket µ¢┤µû░µÖéτÜäσïòµàïΦ╖│Σ╜ì∩╝êτº╗ΘÖñ framer-motion layout σïòτò½∩╝ë
   - σ¢║σ«ÜΣ╛¥ Beacon σÉìτ¿▒µÄÆσ║Å∩╝ê`nickname` ΓåÆ `name` ΓåÆ `mac`∩╝ë∩╝îσÉîσÉìσåìΣ╛¥ MAC
   - πÇîLive Beacon StatusπÇìµùüµû░σó₧µÉ£σ░ïµíå∩╝êσÅ»Σ╛¥ Beacon µêû Gateway σÉìτ¿▒τ»⌐Θü╕∩╝ë

2. **Σ╗ïΘ¥óσôüτëîΦêçΣ╕╗Θíî**
   - τ│╗τ╡▒σÉìτ¿▒τö▒ `eLogbook` µö╣τé║ `TempTrack`
   - ΘáÉΦ¿¡τÖ╜σ║ò∩╝¢Σ╛¥τ│╗τ╡▒ `prefers-color-scheme` σ£¿µÖÜΣ╕èΦç¬σïòσêçµÅ¢µ╖▒Φë▓µ¿íσ╝Å

3. **µ║½σ║ª∩╝ÅΘ¢╗ΘçÅ∩╝êMFR Φºúµ₧É∩╝ë**
   - µû░σó₧ `nodeapp/app/mqtt/mfr-parser.js`πÇü`nodeapp/app/beacon/sensor-values.js`
   - Σ╛¥ Minew HT / Info / Legacy σ░üσîàΘí₧σ₧ïσêåσêÑΦºúµ₧É∩╝îµïÆτ╡òΣ╕ìσÉêτÉåµ║½σ║ª∩╝ê10┬░C∩╜₧45┬░C∩╝ë
   - Σ┐«µ¡úσñÜµò╕ Beacon σ¢║σ«ÜΘí»τñ║ **58.8┬░C + 21%** τÜäΘî»Φ¬ñ∩╝êΦêèΦ│çµûÖΦêçΘî»Φ¬ñ offset∩╝ë
   - `88ECCCDΓÇª` µö»µÅ┤ legacy∩╝¢`88ECCCΓÇª` σèáσ╝╖ HT σ░üσîàµÉ£σ░ï

4. **Φ│çµûÖσ║½**
   - `migration_lock.toml` µö╣τé║ `postgresql`∩╝êΣ┐«µ¡ú Prisma P3019∩╝ë

5. **Docker / σ░êµíêτ╡Éµºï**
   - σÇëσ║½µëüσ╣│σîû∩╝Ü`docker-compose.yml` σ£¿σ░êµíêµá╣τ¢«Θîä∩╝êΣ╕ìσåìσñÜΣ╕Çσ▒ñ `eLogbook/eLogbook`∩╝ë
   - σ«╣σÖ¿σàºσëìτ½» build Φ╝╕σç║Φç│ `/app/public`∩╝êΣ┐«µ¡ú UI Σ╕ìµ¢┤µû░σòÅΘíî∩╝ë
   - `.gitignore` Σ┐«µ¡ú∩╝ÜΣ╕ìσåìΦ¬ñσ┐╜τòÑ `nodeapp/` τ¢«Θîä

6. **Φà│µ£¼**
   - `scripts/deploy.sh`πÇü`install_docker.sh` Φ¿¡τé║σÅ»σƒ╖Φíî∩╝ê100755∩╝ë

### Ubuntu µ¢┤µû░µ¡ÑΘ⌐ƒ

```bash
cd ~/temptrack

# ΦïÑµ¢╛Θüç Permission denied∩╝îσàêσü£σ«╣σÖ¿Σ╕ªµö╣σ¢₧τ¢«Θîäµôüµ£ëµ¼è
docker compose down
sudo chown -R $USER:$USER nodeapp/public nodeapp/node_modules 2>/dev/null

# σÉîµ¡Ñµ£Çµû░τ¿ïσ╝Å
git fetch origin
git reset --hard origin/main
git log -1 --oneline

# Θçìσ╗║Σ╕ªσòƒσïò∩╝êµ£âΘçìµû░ build σëìτ½»∩╝ë
docker compose up --build -d

# µƒÑτ£ïµùÑΦ¬î
docker compose logs -f app
```

τÇÅΦª╜σÖ¿Φ½ï **Ctrl+F5** µêûτäíτùòµ¿íσ╝ÅΘûïσòƒπÇé

### ΘáÉΦ¿¡τÖ╗σàÑσ╕│ΦÖƒ

- σ╕│ΦÖƒ∩╝Ü`admin`
- σ»åτó╝∩╝Ü`admin123`  
∩╝êΦïÑτäíµ│òτÖ╗σàÑ∩╝Ü`docker compose exec app sh -lc "cd /app && npx prisma db seed"`∩╝ë

### τ¢╕Θù£ Git Commit∩╝êτö▒Φêèσê░µû░∩╝ë

- `72731e7` ΓÇö σäÇΦí¿µ¥┐µÉ£σ░ïπÇüτÖ╜∩╝Åµ╖▒Φë▓Σ╕╗ΘíîπÇüσ¢║σ«ÜσÉìτ¿▒µÄÆσ║Å
- `93a7ca6` ΓÇö Docker σëìτ½» build Φ╖»σ╛æΣ┐«µ¡ú
- `29e639f` / `19855cc` / `53f54a1` ΓÇö MFR µ║½σ║ª∩╝ÅΘ¢╗ΘçÅΦºúµ₧ÉΣ┐«µ¡ú

---

## [2026-05-22] Φ¬ìΦ¡ëΦêçτëêΘ¥ó∩╝êµ¡╖σÅ▓τ┤ÇΘîä∩╝ë

- **τïÇµàï**∩╝Üσ╖▓σ«îµêÉ∩╝êΦªïτò╢µÖé commit∩╝ë
- **σàºσ«╣**∩╝ÜBeacon µ⌐½σÉæσìíτëçπÇüJWT τÖ╗σàÑπÇüSettings Σ╜┐τö¿ΦÇàτ«íτÉå
- **Θâ¿τ╜▓**∩╝Ü`npm install`πÇü`npx prisma migrate deploy`πÇü`npx prisma db seed`

---

## [2026-06-02] ΘªûΘáüΘçìµºïτé║Σ╕ëσñº Dashboard

### Σ┐«µö╣σàºσ«╣

1. **ΘªûΘáüσÉìτ¿▒Φ¬┐µò┤**
   - σü┤µ¼äσÄƒµ£¼ `Dashboard` µö╣τé║ `Real Time Status`
   - Header Θí»τñ║µö╣τé║ `Real Time Status View`

2. **ΘªûΘáüτëêΘ¥óΘçìσ╗║**
   - Θçìµû░Φ¿¡Φ¿êΘªûΘáüτé║ 3 σÇï dashboard σìÇσíè
   - Dashboard 1∩╝Üµ║½σ║ª Line Chart
   - Dashboard 2πÇüDashboard 3∩╝Üσàêσ╗║τ½ïτ⌐║µíå∩╝êΘáÉτòÖσ╛îτ║îσèƒΦâ╜∩╝ë

3. **Line Chart σ«Üτ╛⌐**
   - Σ╜┐τö¿ `recharts` σ╗║τ½ïµèÿτ╖Üσ£û
   - X Φ╗╕∩╝ÜTemperature (┬░C)
   - Y Φ╗╕∩╝ÜBeacon σÉìτ¿▒
   - σâàΘí»τñ║µ£ëµ║½σ║ªµò╕µôÜτÜä Beacon

### σ╜▒Θƒ┐µ¬öµíê

- `frontend/src/App.jsx`
- `frontend/src/components/Dashboard.jsx`

### Ubuntu µ¢┤µû░µ¡ÑΘ⌐ƒ

```bash
cd ~/temptrack
git fetch origin
git reset --hard origin/main
docker compose up --build -d
```

---

## [2026-06-03] Admin τ╖¿Φ╝» Beacon / Gateway σÉìτ¿▒ΦêçσêùΦí¿τëêΘ¥ó

### Σ┐«µö╣σàºσ«╣

1. **Admin Φ¿¡σ«ÜµîëΘêò**
   - Real Time Status µ»Åσêù Beacon σÅ│σü┤Φ¿¡σ«ÜΘêò∩╝êσâà admin σÅ»Φªï∩╝ë
   - Modal σÅ»τ╖¿Φ╝» Beacon Θí»τñ║σÉì∩╝ê`nickname`∩╝ëΦêç Gateway σÉìτ¿▒

2. **API**
   - `PATCH /beacons/:mac/labels`∩╝êΘ£Ç admin∩╝ë
   - Σ┐«µ¡ú DB `update` µÖéΣ╕ÇΣ╜╡µîüΣ╣àσîû `nickname`

3. **τëêΘ¥ó**
   - `BeaconCard` µö╣τé║ responsive grid∩╝îτº╗ΘÖñµ⌐½σÉæµì▓σïòΦêçσ¢║σ«Üµ£Çσ░Åσ»¼σ║ª

### σ╜▒Θƒ┐µ¬öµíê

- `nodeapp/app/beacon/beacon-api.js`
- `nodeapp/app/beacon/beacon-router.js`
- `nodeapp/app/beacon/beacon-repository.js`
- `nodeapp/app/beacon/beacon-datastore.js`
- `nodeapp/app/mqtt/mqtt-processor.js`
- `nodeapp/app/app.js`
- `frontend/src/components/BeaconCard.jsx`
- `frontend/src/components/BeaconEditModal.jsx`∩╝êµû░σó₧∩╝ë
- `frontend/src/components/RealTimeStatus.jsx`
- `frontend/src/App.jsx`

### Ubuntu µ¢┤µû░µ¡ÑΘ⌐ƒ

```bash
cd ~/temptrack
docker compose down
sudo chown -R $USER:$USER nodeapp
git fetch origin && git reset --hard origin/main
docker compose up --build -d
```

---

## [2026-06-08] Σ┐«σ╛⌐Φ│çµûÖσ║½Φí¿Σ╕ìσ¡ÿσ£¿ (P2021)

### σÄƒσ¢á

`prisma/migrations` µ▓Æµ£ë SQL∩╝î`migrate deploy` Σ╕ìµ£âσ╗║Φí¿ ΓåÆ `public.param does not exist`

### Σ┐«σ╛⌐

- µû░σó₧ `prisma/migrations/20240608000000_init/migration.sql`
- σòƒσïòµÖéσƒ╖Φíî `prisma db seed`∩╝êadmin / params∩╝ë

### Ubuntu

```bash
cd ~/temptrack
git fetch origin && git reset --hard origin/main
docker compose up -d --build
sleep 15
docker compose logs app --tail 20
```

µçëτ£ïσê░ `Applying migration` σÆî `HTTPS listening on port 3011`

---

## [2026-06-08] Σ┐«σ╛⌐ crash loop + git pull µ¼èΘÖÉΘî»Φ¬ñ

### σÄƒσ¢á

1. `nodeapp/public` Φó½ Docker Σ╗Ñ root σ╗║τ½ï∩╝î`git reset` σñ▒µòù∩╝îΣ╝║µ£ìσÖ¿Σ╗ìΦ╖æΦêèτëê code
2. Docker image σàºµ£ë `/frontend`∩╝î`docker-start` µ»Åµ¼íσòƒσïòΘâ╜Φ╖æ `npm install` ΓåÆ σ«╣σÖ¿ crash loop

### Σ┐«σ╛⌐

- σòƒσïòµÖéΦ╖│ΘüÄ frontend σ«ëΦú¥∩╝êΣ╜┐τö¿ image σàºσ╖▓σ╗║τ╜«τÜä `public`∩╝ë
- σ╛₧ git τº╗ΘÖñ `nodeapp/public` Φ┐╜Φ╣ñ
- µû░σó₧ `scripts/fix-permissions.sh`

### Ubuntu∩╝êΦ½ïΣ╛¥σ║Åσƒ╖Φíî∩╝ë

```bash
cd ~/temptrack
docker compose down
bash scripts/fix-permissions.sh
git fetch origin && git reset --hard origin/main
docker compose up -d --build
sleep 15
bash scripts/diagnose.sh
docker compose logs app --tail 30
```

τÇÅΦª╜σÖ¿∩╝Ü**https://10.0.56.200:3011**

---

## [2026-06-08] µö╣σ¢₧ HTTPS UI + Σ┐«σ╛⌐σ«╣σÖ¿τäíµ│òσòƒσïò

### Φ«èµ¢┤

- ΘáÉΦ¿¡ **USE_HTTP=0**∩╝îUI Σ╜┐τö¿ **https://IP:3011**
- τº╗ΘÖñ `./nodeapp`πÇü`./frontend` volume µÄ¢Φ╝ë∩╝êΘü┐σàìΦªåΦôï image σàºσ╖▓σ╗║τ╜«τÜäτ¿ïσ╝Å∩╝ë
- docker-compose µ│¿σàÑ `DATABASE_URL`πÇü`PORT`
- `restart: unless-stopped`

### Ubuntu Θâ¿τ╜▓

```bash
cd ~/temptrack
git fetch origin && git reset --hard origin/main
bash scripts/repair-env.sh
sed -i 's/^USE_HTTP=1/USE_HTTP=0/' .env 2>/dev/null || true
docker compose down
docker compose up -d --build
bash scripts/diagnose.sh
```

τÇÅΦª╜σÖ¿∩╝Ü**https://10.0.56.200:3011**∩╝êµÄÑσÅùΦç¬τ░╜µåæΦ¡ëΦ¡ªσæè∩╝ë

---

## [2026-06-08] Σ┐«σ╛⌐ UI τäíµ│òΘÇúτ╖Ü∩╝êHTTP + Θâ¿τ╜▓τ⌐⌐σ«ÜµÇº∩╝ë

### σÄƒσ¢á

1. ΘáÉΦ¿¡Σ╝║µ£ìσÖ¿σÅ¬Φü╜ **HTTPS**∩╝îτÇÅΦª╜σÖ¿Φ╝╕σàÑ `http://IP:3011` µ£âΘÇúΣ╕ìΣ╕è
2. app σ«╣σÖ¿σÅ»Φâ╜σ¢á migrate / mqtt healthcheck µ£¬σ░▒τ╖ÆΦÇîτäíµ│òσòƒσïò

### Σ┐«σ╛⌐

- ΘáÉΦ¿¡ `USE_HTTP=1`∩╝Üport **3011** Σ╜┐τö¿ HTTP∩╝êσìÇτ╢▓σÅ»τ¢┤µÄÑΘûï∩╝ë
- µû░σó₧ `scripts/diagnose.sh` Φ¿║µû╖Φà│µ£¼
- migrate σñ▒µòùΦç¬σïòΘçìΦ⌐ª 5 µ¼í
- mqtt µö╣τé║ `service_started`∩╝êΣ╕ìτ¡ë healthcheck∩╝ë
- σê¬ΘÖñΘüÄµ£ƒ `frontend/package-lock.json`

### Ubuntu Θâ¿τ╜▓

```bash
cd ~/temptrack
git fetch origin && git reset --hard origin/main
bash scripts/repair-env.sh
# ΦïÑ .env µ▓Æµ£ë USE_HTTP∩╝îσèáσàÑ∩╝Ü
grep -q '^USE_HTTP=' .env || echo 'USE_HTTP=1' >> .env
docker compose down
FORCE_FRONTEND_BUILD=1 docker compose up -d --build
bash scripts/diagnose.sh
```

τÇÅΦª╜σÖ¿Θûï∩╝Ü**http://10.0.56.200:3011**

---

## [2026-06-08] Σ┐«σ╛⌐ Docker σ╗║τ╜« npm ci σñ▒µòù

### σÄƒσ¢á

`package-lock.json` Φêç `package.json` Σ╕ìσÉîµ¡Ñ∩╝êµû░σó₧ vitest σ╛îµ£¬µ¢┤µû░ lock∩╝ë∩╝î`npm ci` σ░ÄΦç┤ image σ╗║τ╜«σñ▒µòùπÇüapp τäíµ│òσòƒσïòπÇé

### Σ┐«σ╛⌐

- Dockerfile µö╣τé║ `npm install`∩╝êσ«╣Φ¿▒ lock Σ╕ìσÉîµ¡Ñ∩╝ë
- `FORCE_FRONTEND_BUILD` σé│σàÑ app σ«╣σÖ¿

### Ubuntu

```bash
cd ~/temptrack
git fetch origin && git reset --hard origin/main
docker compose down
docker compose up -d --build
docker compose ps
```

τÇÅΦª╜σÖ¿∩╝Ü**https://10.0.56.200:3011**

---

## [2026-06-08] τ¼¼σ¢¢ΘÜÄµ«╡∩╝ÜΘâ¿τ╜▓σä¬σîûΦêç CI

### Σ┐«µö╣σàºσ«╣

1. **Docker σñÜΘÜÄµ«╡σ╗║τ╜«**
   - `nodeapp/Dockerfile`∩╝ÜΘáÉσàêσ«ëΦú¥Σ╛¥Φ│┤πÇüσ╗║τ╜« frontend Φç│ image
   - µû░σó₧ `nodeapp/bin/docker-start.sh`∩╝Üσâàσ£¿σÄƒσºïτó╝Φ«èµ¢┤µÖéΘçìσ╗║ frontend

2. **σƒ║τñÄΦ¿¡µû╜**
   - Postgres ΘçÿΘü╕ `postgres:14-bullseye`
   - `.gitignore` σ┐╜τòÑ `nodeapp/public/`
   - µû░σó₧ `nodeapp/.env.default`

3. **σôüΦ│¬**
   - GitHub Actions CI∩╝êbackend jest + frontend vitest/build∩╝ë
   - σëìτ½» `beaconDisplay` σû«σàâµ╕¼Φ⌐ª

4. **µûçΣ╗╢**
   - µ¢┤µû░ `README.md`∩╝êTempTrack Θâ¿τ╜▓Φ¬¬µÿÄ∩╝ë

### Ubuntu µ¢┤µû░

```bash
cd ~/temptrack
git fetch origin && git reset --hard origin/main
bash scripts/repair-env.sh
bash scripts/deploy.sh
```

σ╝╖σê╢Θçìσ╗║ UI∩╝Ü`FORCE_FRONTEND_BUILD=1 docker compose up -d --build app`

---

## [2026-06-08] Σ┐«σ╛⌐ MQTT_HOST Φêç JWT_SECRET Θ╗Åσ£¿σÉîΣ╕ÇΦíî

### σÄƒσ¢á

`.env` Φ┐╜σèá `JWT_SECRET` µÖéτ╝║σ░æµÅ¢Φíî∩╝îΦ«èµêÉ∩╝Ü
`MQTT_HOST=mqtt-brokerJWT_SECRET=...` ΓåÆ app τäíµ│òΦºúµ₧É `mqtt-broker` Σ╕╗µ⌐ƒσÉìπÇé

### Σ┐«σ╛⌐

- µû░σó₧ `scripts/repair-env.sh` Φç¬σïòµïåΦíîΣ┐«σ╛⌐
- `deploy.sh` / `ensure-runtime-env.sh` Φ┐╜σèáΦ«èµò╕µÖéσ╝╖σê╢µÅ¢Φíî
- σòƒσïòµÖéσ╝╖σê╢ `export MQTT_HOST=mqtt-broker`

### Ubuntu

```bash
cd ~/temptrack
git fetch origin && git reset --hard origin/main
bash scripts/repair-env.sh
docker compose down
docker compose up -d --build
docker compose logs app --tail 10 | grep -i mqtt
```

µçëτ£ïσê░ `MQTT broker connected`πÇé

---

## [2026-06-08] Σ┐«σ╛⌐ MQTT broker exit 13 σ┤⌐µ╜░

### σÄƒσ¢á

1. `passwd` µ¬öτé║ root `chmod 600`∩╝îMosquitto∩╝êUID 1883∩╝ëτäíµ│òΦ«ÇσÅû ΓåÆ σòƒσïòσñ▒µòù exit 13
2. `data/`πÇü`log/` τ¢«Θîäµ¼èΘÖÉΣ╕ìΦ╢│

### Σ┐«σ╛⌐

- τº╗ΘÖñ `password_file`∩╝êGateway Θ£Çσî┐σÉìτÖ╝σ╕â∩╝¢σàºτ╢▓ broker∩╝ë
- Entrypoint Σ┐«µ¡ú data/log τ¢«Θîäµ¼èΘÖÉ∩╝îΣ╜┐τö¿ `/usr/sbin/mosquitto`
- ΘçÿΘü╕ `eclipse-mosquitto:2`
- `deploy.sh` σòƒσïòσëìΣ┐«µ¡ú mosquitto τ¢«Θîäµ¼èΘÖÉ

### Ubuntu∩╝êΦ½ïµò┤µ«╡σƒ╖Φíî∩╝ë

```bash
cd ~/temptrack
git fetch origin && git reset --hard origin/main
docker compose down
sudo rm -f mosquitto/config/passwd
sudo chown -R 1883:1883 mosquitto/data mosquitto/log 2>/dev/null || sudo chmod -R 777 mosquitto/data mosquitto/log
docker compose up -d
docker compose ps
docker compose logs mqtt-broker --tail 15
```

---

## [2026-06-08] Σ┐«σ╛⌐ MQTT broker unhealthy

### σÄƒσ¢á

Healthcheck Φ¿éΘû▒ `$SYS/broker/version`∩╝îΣ╜å Mosquitto ΘáÉΦ¿¡ `sys_interval=0` Σ╕ìτÖ╝σ╕â `$SYS` Φ¿èµü» ΓåÆ broker Σ╕Çτ¢┤Φó½σêñ unhealthy ΓåÆ app τäíµ│òσòƒσïòπÇé

### Σ┐«σ╛⌐

- Healthcheck µö╣τé║ `mosquitto_pub` µ╕¼Φ⌐ªΘÇúτ╖Ü
- `mosquitto.conf` σèáσàÑ `sys_interval 10`

### Ubuntu

```bash
cd ~/temptrack
git fetch origin && git reset --hard origin/main
docker compose down
docker compose up -d
docker compose ps
```

---

## [2026-06-08] Σ┐«σ╛⌐ Beacon Φ│çµûÖΣ╕ìσì│µÖéµ¢┤µû░

### σÄƒσ¢á

1. **MQTT σî┐σÉìτÖ╝σ╕âΦó½Θù£Θûë** ΓÇö τÅ╛σá┤ Gateway Σ╕ìσ╕╢σ╕│σ»åτÖ╝σ╕â∩╝îbroker µïÆτ╡òΦ¿èµü»∩╝îLast Seen σü£µ¡óµ¢┤µû░
2. **Socket TLS** ΓÇö Σ╗Ñ `http://` ΘûïσòƒµÖé WebSocket σÅ»Φâ╜µ£¬Φ╡░ HTTPS

### Σ┐«σ╛⌐

- Mosquitto µüóσ╛⌐ `allow_anonymous true`∩╝êGateway σÅ»τÖ╝σ╕â∩╝¢Node app Σ╗ìτö¿σ╕│σ»åΦ¿éΘû▒∩╝ë
- MQTT ΘÇúτ╖Ü/Φ¿éΘû▒Θî»Φ¬ñσ»½σàÑ log
- Σ┐«µ¡ú topic MAC Φºúµ₧É
- Socket σ£¿µ¡úσ╝ÅτÆ░σóâ∩╝êport 3011∩╝ëσ╝╖σê╢Σ╜┐τö¿ TLS
- MQTT broker σèáσàÑ healthcheck∩╝îapp τ¡ë broker σ░▒τ╖Æσ╛îµëìσòƒσïò

### Ubuntu µ¢┤µû░

```bash
cd ~/temptrack
git fetch origin && git reset --hard origin/main
docker compose down
docker compose up -d --build
docker compose logs app --tail 20 | grep -i mqtt
```

Φ½ïτö¿ **https://10.0.56.200:3011** Θûïσòƒ∩╝êΣ╕ìΦªüτö¿ `http://`∩╝ë

---

## [2026-06-08] Σ┐«σ╛⌐ MQTT broker ΘçìσòƒΦ┐┤σ£ê

### σÄƒσ¢á

`mosquitto_passwd -c` σ£¿ `passwd` µ¬öσ╖▓σ¡ÿσ£¿µÖéµ£âσñ▒µòù∩╝îσ░ÄΦç┤ mqtt-broker Σ╕ìµû╖ RestartingπÇé

### Σ┐«σ╛⌐

- µ¬öµíêσ╖▓σ¡ÿσ£¿µÖéµö╣τö¿ `mosquitto_passwd -b` µ¢┤µû░σ╕│σ»å
- σâàσ£¿µ¬öµíêΣ╕ìσ¡ÿσ£¿µÖéΣ╜┐τö¿ `-c` σ╗║τ½ï

### Ubuntu µ¢┤µû░

```bash
cd ~/temptrack
git fetch origin && git reset --hard origin/main
docker compose down
sudo rm -f mosquitto/config/passwd
docker compose up -d
docker compose ps
```

---

## [2026-06-03] τ¼¼Σ╕ëΘÜÄµ«╡ UX / ΘûïτÖ╝Θ½öΘ⌐ù

### Σ┐«µö╣σàºσ«╣

1. **ΘûïτÖ╝τÆ░σóâ**
   - Vite proxy µû░σó₧ `/auth`∩╝îτ¢«µ¿Öµö╣τé║ HTTPS σ╛îτ½»∩╝ê`secure: false`∩╝ë

2. **Φ¬ìΦ¡ëΘ½öΘ⌐ù**
   - Axios 401 Φç¬σïòσ░ÄσÉæτÖ╗σàÑΘáü

3. **σëìτ½»µ₧╢µºï**
   - σà▒τö¿ `useBeacons` hook∩╝êDashboard / Real Time Status∩╝ë
   - `ErrorBoundary` Θÿ▓µ¡óµò┤ΘáüτÖ╜σ▒Å
   - τº╗ΘÖñµ£¬Σ╜┐τö¿τÜä `recharts`πÇü`framer-motion`

4. **UX**
   - Recent Activity µö╣τé║τ£ƒσ»ª Socket µ¢┤µû░µ¼íµò╕ / σêåΘÉÿ
   - τ│╗τ╡▒µÖéΘûôµ»ÅτºÆµ¢┤µû░
   - 404 ΘáüΘ¥óπÇüSettings σâà admin σÅ»Φªï
   - Beacon τïÇµàïΘí»τñ║σÅ»Φ«Çµ¿Öτ▒ñ∩╝êIn Range / Out / Alert∩╝ë
   - µ£¼σ£░ UserAvatar∩╝êΣ╕ìσåìΣ╛¥Φ│┤σñûΘâ¿ API∩╝ë
   - Modal µö»µÅ┤ Esc Θù£ΘûëπÇüτÖ╗σàÑΦí¿σû« a11y µö╣σûä

### Ubuntu µ¢┤µû░

```bash
cd ~/temptrack
docker compose down
sudo chown -R $USER:$USER nodeapp
git fetch origin && git reset --hard origin/main
docker compose up --build -d
```

---

## [2026-06-03] Σ┐«σ╛⌐σìçτ┤Üσ╛îτäíµ│òσòƒσïò

### σÄƒσ¢á

1. Mosquitto `docker-entrypoint.sh` µ£¬σé│σàÑ `mosquitto -c` σÅâµò╕∩╝îbroker τäíµ│òµ¡úσ╕╕σòƒσïò
2. σâà `git pull` + `compose up` µÖéµá╣τ¢«Θîä `.env` σÅ»Φâ╜µ▓Æµ£ë `JWT_SECRET`∩╝îapp µïÆτ╡òσòƒσïò

### Σ┐«σ╛⌐

- Σ┐«µ¡ú Mosquitto entrypoint
- µû░σó₧ `nodeapp/bin/ensure-runtime-env.sh`∩╝ÜσòƒσïòσëìΦç¬σïòΦú£Θ╜è `JWT_SECRET` / MQTT σ╕│σ»åΣ╕ªσ»½σàÑ `nodeapp/.env`
- `docker-compose` τé║ app / mqtt σèáΣ╕èΘáÉΦ¿¡τÆ░σóâΦ«èµò╕Φêç `restart: on-failure`

### Ubuntu µ¢┤µû░

```bash
cd ~/temptrack
docker compose down
sudo chown -R $USER:$USER nodeapp
git fetch origin && git reset --hard origin/main
bash scripts/deploy.sh
```

τÇÅΦª╜σÖ¿Φ½ïτö¿ **https://10.0.56.200:3011**∩╝êΣ╕ìµÿ» `http://`∩╝ë

---

## [2026-06-03] τ¼¼Σ║îΘÜÄµ«╡σ«ëσà¿σ╝╖σîû

### Σ┐«µö╣σàºσ«╣

1. **JWT**
   - σ╝╖σê╢ `JWT_SECRET`∩╝êΦç│σ░æ 32 σ¡ùσàâ∩╝îτªüµ¡ó placeholder∩╝ë
   - µ£¬Φ¿¡σ«ÜµÖéµ£ìσïÖµïÆτ╡òσòƒσïò
   - `deploy.sh` µ£âΦç¬σïòτöóτöƒ `JWT_SECRET`

2. **Socket.IO**
   - ΘÇúτ╖ÜΘ£Çµ£ëµòê JWT∩╝êCookie µêû Bearer∩╝ë
   - σëìτ½» `withCredentials: true`∩╝îΣ╛¥σìöσ«ÜΦ¿¡σ«Ü `secure`

3. **HTTP σ«ëσà¿**
   - σòƒτö¿ `helmet`∩╝êSPA Θü⌐τö¿ CSP∩╝ë
   - Auth Cookie∩╝Ü`secure` + `sameSite: lax`
   - τÖ╗σàÑ API ΘÖÉµ╡ü∩╝ê15 σêåΘÉÿ / 20 µ¼í∩╝ë

4. **MQTT**
   - Mosquitto Θù£Θûëσî┐σÉìΘÇúτ╖Ü
   - σòƒσïòµÖéΣ╛¥ `.env` τÜä `MQTT_USER` / `MQTT_PASSWORD` τöóτöƒ passwd
   - Node MQTT client µö╣Φ«ÇτÆ░σóâΦ«èµò╕

5. **Σ╜┐τö¿ΦÇàτ«íτÉå**
   - σ╗║τ½ïΣ╜┐τö¿ΦÇà∩╝Üσ»åτó╝Φç│σ░æ 8 σ¡ùσàâπÇüΦºÆΦë▓ΘÖÉ `admin` / `viewer`

### Θâ¿τ╜▓µ│¿µäÅ∩╝êΘçìΦªü∩╝ë

µ¢┤µû░σ╛îΦ½ïσ£¿ Ubuntu σƒ╖Φíî `deploy.sh`∩╝îµêûµëïσïòσ£¿ **µá╣τ¢«Θîä `.env`** σèáσàÑ∩╝Ü

```bash
JWT_SECRET=$(openssl rand -hex 32)
MQTT_USER=temptrack
MQTT_PASSWORD=<Φ½ïµö╣µêÉσ╝╖σ»åτó╝>
```

ΦïÑσÅ¬ `git pull` ΦÇîµ£¬Φ¿¡σ«Ü `JWT_SECRET`∩╝îapp σ«╣σÖ¿µ£âτäíµ│òσòƒσïòπÇé

### σ╜▒Θƒ┐µ¬öµíê

- `nodeapp/config/jwt.js`∩╝êµû░σó₧∩╝ë
- `nodeapp/app/auth/*`
- `nodeapp/app/app.js`
- `nodeapp/bin/www.js`
- `nodeapp/app/mqtt/mqtt-client.js`
- `nodeapp/package.json`
- `mosquitto/config/mosquitto.conf`
- `mosquitto/config/docker-entrypoint.sh`∩╝êµû░σó₧∩╝ë
- `docker-compose.yml`
- `.env.default`
- `scripts/deploy.sh`
- `frontend/src/hooks/useSocket.js`

### Ubuntu µ¢┤µû░µ¡ÑΘ⌐ƒ

```bash
cd ~/temptrack
docker compose down
sudo chown -R $USER:$USER nodeapp
git fetch origin && git reset --hard origin/main
bash scripts/deploy.sh
```

---

## [2026-06-03] τ¼¼Σ╕ÇΘÜÄµ«╡τ⌐⌐σ«ÜµÇºΣ┐«σ╛⌐

### Σ┐«µö╣σàºσ«╣

1. **History API Φ╖»τö▒**
   - `/history/b/:mac` µö╣τé║σä¬σàêµû╝ `/:page`∩╝îΣ┐«µ¡úσû«Σ╕Ç Beacon µ¡╖σÅ▓µƒÑΦ⌐óσñ▒µòê

2. **MAC σ£░σ¥Çτ╡▒Σ╕Ç**
   - µû░σó₧ `mac-utils.js`∩╝îMQTT / Repository / API Σ╕Çσ╛ïµ¡úΦªÅσîûτé║σñºσ»½

3. **MQTT ΦÖòτÉå**
   - Gateway τé║ null µÖéΣ╕ìσåì crash
   - Gateway µ»öΦ╝âµö╣τé║ `gateway.id === beacon.gateway_id`
   - τäíµòê RSSI Σ╕ìσåìΘáÉΦ¿¡ 1234
   - `forEach(async)` µö╣τé║ `for...of` Σ╕ª await
   - µâíµäÅ/Θî»Φ¬ñ MQTT JSON Σ╗Ñ try/catch ΘÜöΘ¢ó

4. **Φ│çµûÖσ║½σ»½σàÑ**
   - `updateBeacon` / `insertHistory` σñ▒µòùµÖé throw∩╝îΣ╕ìσåìΘ¥£Θ╗ÿσÉ₧Θî»
   - σ»½σàÑσñ▒µòùµÖéΣ┐¥τòÖ `is_changed`∩╝¢τäí gateway τÜä Beacon σ╗╢σ╛îσ»½σàÑ

5. **σòƒσïòΘáåσ║Å**
   - `await myApp.init(io)` σ«îµêÉσ╛îµëì `listen`

### σ╜▒Θƒ┐µ¬öµíê

- `nodeapp/app/beacon/mac-utils.js`∩╝êµû░σó₧∩╝ë
- `nodeapp/app/beacon/beacon-repository.js`
- `nodeapp/app/beacon/beacon-datastore.js`
- `nodeapp/app/beacon/beacon-api.js`
- `nodeapp/app/history/history-router.js`
- `nodeapp/app/mqtt/mqtt-processor.js`
- `nodeapp/app/mqtt/mqtt-client.js`
- `nodeapp/bin/www.js`

### Ubuntu µ¢┤µû░µ¡ÑΘ⌐ƒ

```bash
cd ~/temptrack
docker compose down
sudo chown -R $USER:$USER nodeapp
git fetch origin && git reset --hard origin/main
docker compose up --build -d
```

---

## [2026-06-02] Σ┐«µ¡úσ£ûΦí¿Φ╗╕σÉæΣ╕ªΘéäσÄƒ Real Time Status σêùΦí¿Θáü

### Σ┐«µö╣σàºσ«╣

1. **σ£ûΦí¿Φ╗╕σÉæΣ┐«µ¡ú**
   - Dashboard 1 µèÿτ╖Üσ£ûµö╣τé║∩╝Ü**X Φ╗╕ = Beacon σÉìτ¿▒**πÇü**Y Φ╗╕ = µ║½σ║ª (┬░C)**

2. **ΘéäσÄƒσàêσëì Dashboard∩╝êσêùΦí¿Θáü∩╝ë**
   - µû░σó₧ `RealTimeStatus.jsx`∩╝Üµüóσ╛⌐τ╡▒Φ¿êσìíπÇüµÉ£σ░ïµíåπÇüBeacon µ⌐½σÉæσêùΦí¿
   - σü┤µ¼äσêåτé║σà⌐Θáà∩╝Ü
     - `Dashboard` ΓåÆ `/`∩╝êΣ╕ëσÇï dashboard σìÇσíèΘªûΘáü∩╝ë
     - `Real Time Status` ΓåÆ `/real-time`∩╝êσì│µÖéσêùΦí¿Θáü∩╝ë

### σ╜▒Θƒ┐µ¬öµíê

- `frontend/src/App.jsx`
- `frontend/src/components/Dashboard.jsx`
- `frontend/src/components/RealTimeStatus.jsx`∩╝êµû░σó₧∩╝ë

### Ubuntu µ¢┤µû░µ¡ÑΘ⌐ƒ

```bash
cd ~/temptrack
docker compose down
sudo chown -R $USER:$USER nodeapp
git fetch origin
git reset --hard origin/main
docker compose up --build -d
```
