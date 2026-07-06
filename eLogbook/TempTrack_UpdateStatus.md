# TempTrack 修改與部署紀錄

本檔案記錄每次程式修改內容與在 Ubuntu 伺服器上的更新方式。

---

## [2026-06-08] Dashboard 三區圖表

### 修改內容

1. **Dashboard 1**：溫度改為 **Bar Chart**（X=Beacon 名稱、Y=溫度 °C）
2. **Dashboard 2**：**圓餅圖** — 各 Location（Gateway）Beacon 數量
3. **Dashboard 3**：**橫向分段條圖** — 每列 Location，色塊為所屬 Beacon

### Ubuntu 更新

```bash
cd ~/eLogbook
git fetch origin && git reset --hard origin/main
docker compose up -d --build
```

瀏覽器 **Ctrl+F5** 開 https://10.0.56.200:3011

---

## [2026-06-01] 溫度解析修正、UI 與部署結構調整

### 修改內容

1. **Beacon 列表**
   - 取消 Socket 更新時的動態跳位（移除 framer-motion layout 動畫）
   - 固定依 Beacon 名稱排序（`nickname` → `name` → `mac`），同名再依 MAC
   - 「Live Beacon Status」旁新增搜尋框（可依 Beacon 或 Gateway 名稱篩選）

2. **介面品牌與主題**
   - 系統名稱由 `eLogbook` 改為 `TempTrack`
   - 預設白底；依系統 `prefers-color-scheme` 在晚上自動切換深色模式

3. **溫度／電量（MFR 解析）**
   - 新增 `nodeapp/app/mqtt/mfr-parser.js`、`nodeapp/app/beacon/sensor-values.js`
   - 依 Minew HT / Info / Legacy 封包類型分別解析，拒絕不合理溫度（10°C～45°C）
   - 修正多數 Beacon 固定顯示 **58.8°C + 21%** 的錯誤（舊資料與錯誤 offset）
   - `88ECCCD…` 支援 legacy；`88ECCC…` 加強 HT 封包搜尋

4. **資料庫**
   - `migration_lock.toml` 改為 `postgresql`（修正 Prisma P3019）

5. **Docker / 專案結構**
   - 倉庫扁平化：`docker-compose.yml` 在專案根目錄（不再多一層 `eLogbook/eLogbook`）
   - 容器內前端 build 輸出至 `/app/public`（修正 UI 不更新問題）
   - `.gitignore` 修正：不再誤忽略 `nodeapp/` 目錄

6. **腳本**
   - `scripts/deploy.sh`、`install_docker.sh` 設為可執行（100755）

### Ubuntu 更新步驟

```bash
cd ~/eLogbook

# 若曾遇 Permission denied，先停容器並改回目錄擁有權
docker compose down
sudo chown -R $USER:$USER nodeapp/public nodeapp/node_modules 2>/dev/null

# 同步最新程式
git fetch origin
git reset --hard origin/main
git log -1 --oneline

# 重建並啟動（會重新 build 前端）
docker compose up --build -d

# 查看日誌
docker compose logs -f app
```

瀏覽器請 **Ctrl+F5** 或無痕模式開啟。

### 預設登入帳號

- 帳號：`admin`
- 密碼：`admin123`  
（若無法登入：`docker compose exec app sh -lc "cd /app && npx prisma db seed"`）

### 相關 Git Commit（由舊到新）

- `72731e7` — 儀表板搜尋、白／深色主題、固定名稱排序
- `93a7ca6` — Docker 前端 build 路徑修正
- `29e639f` / `19855cc` / `53f54a1` — MFR 溫度／電量解析修正

---

## [2026-05-22] 認證與版面（歷史紀錄）

- **狀態**：已完成（見當時 commit）
- **內容**：Beacon 橫向卡片、JWT 登入、Settings 使用者管理
- **部署**：`npm install`、`npx prisma migrate deploy`、`npx prisma db seed`

---

## [2026-06-02] 首頁重構為三大 Dashboard

### 修改內容

1. **首頁名稱調整**
   - 側欄原本 `Dashboard` 改為 `Real Time Status`
   - Header 顯示改為 `Real Time Status View`

2. **首頁版面重建**
   - 重新設計首頁為 3 個 dashboard 區塊
   - Dashboard 1：溫度 Line Chart
   - Dashboard 2、Dashboard 3：先建立空框（預留後續功能）

3. **Line Chart 定義**
   - 使用 `recharts` 建立折線圖
   - X 軸：Temperature (°C)
   - Y 軸：Beacon 名稱
   - 僅顯示有溫度數據的 Beacon

### 影響檔案

- `frontend/src/App.jsx`
- `frontend/src/components/Dashboard.jsx`

### Ubuntu 更新步驟

```bash
cd ~/eLogbook
git fetch origin
git reset --hard origin/main
docker compose up --build -d
```

---

## [2026-06-03] Admin 編輯 Beacon / Gateway 名稱與列表版面

### 修改內容

1. **Admin 設定按鈕**
   - Real Time Status 每列 Beacon 右側設定鈕（僅 admin 可見）
   - Modal 可編輯 Beacon 顯示名（`nickname`）與 Gateway 名稱

2. **API**
   - `PATCH /beacons/:mac/labels`（需 admin）
   - 修正 DB `update` 時一併持久化 `nickname`

3. **版面**
   - `BeaconCard` 改為 responsive grid，移除橫向捲動與固定最小寬度

### 影響檔案

- `nodeapp/app/beacon/beacon-api.js`
- `nodeapp/app/beacon/beacon-router.js`
- `nodeapp/app/beacon/beacon-repository.js`
- `nodeapp/app/beacon/beacon-datastore.js`
- `nodeapp/app/mqtt/mqtt-processor.js`
- `nodeapp/app/app.js`
- `frontend/src/components/BeaconCard.jsx`
- `frontend/src/components/BeaconEditModal.jsx`（新增）
- `frontend/src/components/RealTimeStatus.jsx`
- `frontend/src/App.jsx`

### Ubuntu 更新步驟

```bash
cd ~/eLogbook
docker compose down
sudo chown -R $USER:$USER nodeapp
git fetch origin && git reset --hard origin/main
docker compose up --build -d
```

---

## [2026-06-08] 修復資料庫表不存在 (P2021)

### 原因

`prisma/migrations` 沒有 SQL，`migrate deploy` 不會建表 → `public.param does not exist`

### 修復

- 新增 `prisma/migrations/20240608000000_init/migration.sql`
- 啟動時執行 `prisma db seed`（admin / params）

### Ubuntu

```bash
cd ~/eLogbook
git fetch origin && git reset --hard origin/main
docker compose up -d --build
sleep 15
docker compose logs app --tail 20
```

應看到 `Applying migration` 和 `HTTPS listening on port 3011`

---

## [2026-06-08] 修復 crash loop + git pull 權限錯誤

### 原因

1. `nodeapp/public` 被 Docker 以 root 建立，`git reset` 失敗，伺服器仍跑舊版 code
2. Docker image 內有 `/frontend`，`docker-start` 每次啟動都跑 `npm install` → 容器 crash loop

### 修復

- 啟動時跳過 frontend 安裝（使用 image 內已建置的 `public`）
- 從 git 移除 `nodeapp/public` 追蹤
- 新增 `scripts/fix-permissions.sh`

### Ubuntu（請依序執行）

```bash
cd ~/eLogbook
docker compose down
bash scripts/fix-permissions.sh
git fetch origin && git reset --hard origin/main
docker compose up -d --build
sleep 15
bash scripts/diagnose.sh
docker compose logs app --tail 30
```

瀏覽器：**https://10.0.56.200:3011**

---

## [2026-06-08] 改回 HTTPS UI + 修復容器無法啟動

### 變更

- 預設 **USE_HTTP=0**，UI 使用 **https://IP:3011**
- 移除 `./nodeapp`、`./frontend` volume 掛載（避免覆蓋 image 內已建置的程式）
- docker-compose 注入 `DATABASE_URL`、`PORT`
- `restart: unless-stopped`

### Ubuntu 部署

```bash
cd ~/eLogbook
git fetch origin && git reset --hard origin/main
bash scripts/repair-env.sh
sed -i 's/^USE_HTTP=1/USE_HTTP=0/' .env 2>/dev/null || true
docker compose down
docker compose up -d --build
bash scripts/diagnose.sh
```

瀏覽器：**https://10.0.56.200:3011**（接受自簽憑證警告）

---

## [2026-06-08] 修復 UI 無法連線（HTTP + 部署穩定性）

### 原因

1. 預設伺服器只聽 **HTTPS**，瀏覽器輸入 `http://IP:3011` 會連不上
2. app 容器可能因 migrate / mqtt healthcheck 未就緒而無法啟動

### 修復

- 預設 `USE_HTTP=1`：port **3011** 使用 HTTP（區網可直接開）
- 新增 `scripts/diagnose.sh` 診斷腳本
- migrate 失敗自動重試 5 次
- mqtt 改為 `service_started`（不等 healthcheck）
- 刪除過期 `frontend/package-lock.json`

### Ubuntu 部署

```bash
cd ~/eLogbook
git fetch origin && git reset --hard origin/main
bash scripts/repair-env.sh
# 若 .env 沒有 USE_HTTP，加入：
grep -q '^USE_HTTP=' .env || echo 'USE_HTTP=1' >> .env
docker compose down
FORCE_FRONTEND_BUILD=1 docker compose up -d --build
bash scripts/diagnose.sh
```

瀏覽器開：**http://10.0.56.200:3011**

---

## [2026-06-08] 修復 Docker 建置 npm ci 失敗

### 原因

`package-lock.json` 與 `package.json` 不同步（新增 vitest 後未更新 lock），`npm ci` 導致 image 建置失敗、app 無法啟動。

### 修復

- Dockerfile 改為 `npm install`（容許 lock 不同步）
- `FORCE_FRONTEND_BUILD` 傳入 app 容器

### Ubuntu

```bash
cd ~/eLogbook
git fetch origin && git reset --hard origin/main
docker compose down
docker compose up -d --build
docker compose ps
```

瀏覽器：**https://10.0.56.200:3011**

---

## [2026-06-08] 第四階段：部署優化與 CI

### 修改內容

1. **Docker 多階段建置**
   - `nodeapp/Dockerfile`：預先安裝依賴、建置 frontend 至 image
   - 新增 `nodeapp/bin/docker-start.sh`：僅在原始碼變更時重建 frontend

2. **基礎設施**
   - Postgres 釘選 `postgres:14-bullseye`
   - `.gitignore` 忽略 `nodeapp/public/`
   - 新增 `nodeapp/.env.default`

3. **品質**
   - GitHub Actions CI（backend jest + frontend vitest/build）
   - 前端 `beaconDisplay` 單元測試

4. **文件**
   - 更新 `README.md`（TempTrack 部署說明）

### Ubuntu 更新

```bash
cd ~/eLogbook
git fetch origin && git reset --hard origin/main
bash scripts/repair-env.sh
bash scripts/deploy.sh
```

強制重建 UI：`FORCE_FRONTEND_BUILD=1 docker compose up -d --build app`

---

## [2026-06-08] 修復 MQTT_HOST 與 JWT_SECRET 黏在同一行

### 原因

`.env` 追加 `JWT_SECRET` 時缺少換行，變成：
`MQTT_HOST=mqtt-brokerJWT_SECRET=...` → app 無法解析 `mqtt-broker` 主機名。

### 修復

- 新增 `scripts/repair-env.sh` 自動拆行修復
- `deploy.sh` / `ensure-runtime-env.sh` 追加變數時強制換行
- 啟動時強制 `export MQTT_HOST=mqtt-broker`

### Ubuntu

```bash
cd ~/eLogbook
git fetch origin && git reset --hard origin/main
bash scripts/repair-env.sh
docker compose down
docker compose up -d --build
docker compose logs app --tail 10 | grep -i mqtt
```

應看到 `MQTT broker connected`。

---

## [2026-06-08] 修復 MQTT broker exit 13 崩潰

### 原因

1. `passwd` 檔為 root `chmod 600`，Mosquitto（UID 1883）無法讀取 → 啟動失敗 exit 13
2. `data/`、`log/` 目錄權限不足

### 修復

- 移除 `password_file`（Gateway 需匿名發布；內網 broker）
- Entrypoint 修正 data/log 目錄權限，使用 `/usr/sbin/mosquitto`
- 釘選 `eclipse-mosquitto:2`
- `deploy.sh` 啟動前修正 mosquitto 目錄權限

### Ubuntu（請整段執行）

```bash
cd ~/eLogbook
git fetch origin && git reset --hard origin/main
docker compose down
sudo rm -f mosquitto/config/passwd
sudo chown -R 1883:1883 mosquitto/data mosquitto/log 2>/dev/null || sudo chmod -R 777 mosquitto/data mosquitto/log
docker compose up -d
docker compose ps
docker compose logs mqtt-broker --tail 15
```

---

## [2026-06-08] 修復 MQTT broker unhealthy

### 原因

Healthcheck 訂閱 `$SYS/broker/version`，但 Mosquitto 預設 `sys_interval=0` 不發布 `$SYS` 訊息 → broker 一直被判 unhealthy → app 無法啟動。

### 修復

- Healthcheck 改為 `mosquitto_pub` 測試連線
- `mosquitto.conf` 加入 `sys_interval 10`

### Ubuntu

```bash
cd ~/eLogbook
git fetch origin && git reset --hard origin/main
docker compose down
docker compose up -d
docker compose ps
```

---

## [2026-06-08] 修復 Beacon 資料不即時更新

### 原因

1. **MQTT 匿名發布被關閉** — 現場 Gateway 不帶帳密發布，broker 拒絕訊息，Last Seen 停止更新
2. **Socket TLS** — 以 `http://` 開啟時 WebSocket 可能未走 HTTPS

### 修復

- Mosquitto 恢復 `allow_anonymous true`（Gateway 可發布；Node app 仍用帳密訂閱）
- MQTT 連線/訂閱錯誤寫入 log
- 修正 topic MAC 解析
- Socket 在正式環境（port 3011）強制使用 TLS
- MQTT broker 加入 healthcheck，app 等 broker 就緒後才啟動

### Ubuntu 更新

```bash
cd ~/eLogbook
git fetch origin && git reset --hard origin/main
docker compose down
docker compose up -d --build
docker compose logs app --tail 20 | grep -i mqtt
```

請用 **https://10.0.56.200:3011** 開啟（不要用 `http://`）

---

## [2026-06-08] 修復 MQTT broker 重啟迴圈

### 原因

`mosquitto_passwd -c` 在 `passwd` 檔已存在時會失敗，導致 mqtt-broker 不斷 Restarting。

### 修復

- 檔案已存在時改用 `mosquitto_passwd -b` 更新帳密
- 僅在檔案不存在時使用 `-c` 建立

### Ubuntu 更新

```bash
cd ~/eLogbook
git fetch origin && git reset --hard origin/main
docker compose down
sudo rm -f mosquitto/config/passwd
docker compose up -d
docker compose ps
```

---

## [2026-06-03] 第三階段 UX / 開發體驗

### 修改內容

1. **開發環境**
   - Vite proxy 新增 `/auth`，目標改為 HTTPS 後端（`secure: false`）

2. **認證體驗**
   - Axios 401 自動導向登入頁

3. **前端架構**
   - 共用 `useBeacons` hook（Dashboard / Real Time Status）
   - `ErrorBoundary` 防止整頁白屏
   - 移除未使用的 `recharts`、`framer-motion`

4. **UX**
   - Recent Activity 改為真實 Socket 更新次數 / 分鐘
   - 系統時間每秒更新
   - 404 頁面、Settings 僅 admin 可見
   - Beacon 狀態顯示可讀標籤（In Range / Out / Alert）
   - 本地 UserAvatar（不再依賴外部 API）
   - Modal 支援 Esc 關閉、登入表單 a11y 改善

### Ubuntu 更新

```bash
cd ~/eLogbook
docker compose down
sudo chown -R $USER:$USER nodeapp
git fetch origin && git reset --hard origin/main
docker compose up --build -d
```

---

## [2026-06-03] 修復升級後無法啟動

### 原因

1. Mosquitto `docker-entrypoint.sh` 未傳入 `mosquitto -c` 參數，broker 無法正常啟動
2. 僅 `git pull` + `compose up` 時根目錄 `.env` 可能沒有 `JWT_SECRET`，app 拒絕啟動

### 修復

- 修正 Mosquitto entrypoint
- 新增 `nodeapp/bin/ensure-runtime-env.sh`：啟動前自動補齊 `JWT_SECRET` / MQTT 帳密並寫入 `nodeapp/.env`
- `docker-compose` 為 app / mqtt 加上預設環境變數與 `restart: on-failure`

### Ubuntu 更新

```bash
cd ~/eLogbook
docker compose down
sudo chown -R $USER:$USER nodeapp
git fetch origin && git reset --hard origin/main
bash scripts/deploy.sh
```

瀏覽器請用 **https://10.0.56.200:3011**（不是 `http://`）

---

## [2026-06-03] 第二階段安全強化

### 修改內容

1. **JWT**
   - 強制 `JWT_SECRET`（至少 32 字元，禁止 placeholder）
   - 未設定時服務拒絕啟動
   - `deploy.sh` 會自動產生 `JWT_SECRET`

2. **Socket.IO**
   - 連線需有效 JWT（Cookie 或 Bearer）
   - 前端 `withCredentials: true`，依協定設定 `secure`

3. **HTTP 安全**
   - 啟用 `helmet`（SPA 適用 CSP）
   - Auth Cookie：`secure` + `sameSite: lax`
   - 登入 API 限流（15 分鐘 / 20 次）

4. **MQTT**
   - Mosquitto 關閉匿名連線
   - 啟動時依 `.env` 的 `MQTT_USER` / `MQTT_PASSWORD` 產生 passwd
   - Node MQTT client 改讀環境變數

5. **使用者管理**
   - 建立使用者：密碼至少 8 字元、角色限 `admin` / `viewer`

### 部署注意（重要）

更新後請在 Ubuntu 執行 `deploy.sh`，或手動在 **根目錄 `.env`** 加入：

```bash
JWT_SECRET=$(openssl rand -hex 32)
MQTT_USER=temptrack
MQTT_PASSWORD=<請改成強密碼>
```

若只 `git pull` 而未設定 `JWT_SECRET`，app 容器會無法啟動。

### 影響檔案

- `nodeapp/config/jwt.js`（新增）
- `nodeapp/app/auth/*`
- `nodeapp/app/app.js`
- `nodeapp/bin/www.js`
- `nodeapp/app/mqtt/mqtt-client.js`
- `nodeapp/package.json`
- `mosquitto/config/mosquitto.conf`
- `mosquitto/config/docker-entrypoint.sh`（新增）
- `docker-compose.yml`
- `.env.default`
- `scripts/deploy.sh`
- `frontend/src/hooks/useSocket.js`

### Ubuntu 更新步驟

```bash
cd ~/eLogbook
docker compose down
sudo chown -R $USER:$USER nodeapp
git fetch origin && git reset --hard origin/main
bash scripts/deploy.sh
```

---

## [2026-06-03] 第一階段穩定性修復

### 修改內容

1. **History API 路由**
   - `/history/b/:mac` 改為優先於 `/:page`，修正單一 Beacon 歷史查詢失效

2. **MAC 地址統一**
   - 新增 `mac-utils.js`，MQTT / Repository / API 一律正規化為大寫

3. **MQTT 處理**
   - Gateway 為 null 時不再 crash
   - Gateway 比較改為 `gateway.id === beacon.gateway_id`
   - 無效 RSSI 不再預設 1234
   - `forEach(async)` 改為 `for...of` 並 await
   - 惡意/錯誤 MQTT JSON 以 try/catch 隔離

4. **資料庫寫入**
   - `updateBeacon` / `insertHistory` 失敗時 throw，不再靜默吞錯
   - 寫入失敗時保留 `is_changed`；無 gateway 的 Beacon 延後寫入

5. **啟動順序**
   - `await myApp.init(io)` 完成後才 `listen`

### 影響檔案

- `nodeapp/app/beacon/mac-utils.js`（新增）
- `nodeapp/app/beacon/beacon-repository.js`
- `nodeapp/app/beacon/beacon-datastore.js`
- `nodeapp/app/beacon/beacon-api.js`
- `nodeapp/app/history/history-router.js`
- `nodeapp/app/mqtt/mqtt-processor.js`
- `nodeapp/app/mqtt/mqtt-client.js`
- `nodeapp/bin/www.js`

### Ubuntu 更新步驟

```bash
cd ~/eLogbook
docker compose down
sudo chown -R $USER:$USER nodeapp
git fetch origin && git reset --hard origin/main
docker compose up --build -d
```

---

## [2026-06-02] 修正圖表軸向並還原 Real Time Status 列表頁

### 修改內容

1. **圖表軸向修正**
   - Dashboard 1 折線圖改為：**X 軸 = Beacon 名稱**、**Y 軸 = 溫度 (°C)**

2. **還原先前 Dashboard（列表頁）**
   - 新增 `RealTimeStatus.jsx`：恢復統計卡、搜尋框、Beacon 橫向列表
   - 側欄分為兩項：
     - `Dashboard` → `/`（三個 dashboard 區塊首頁）
     - `Real Time Status` → `/real-time`（即時列表頁）

### 影響檔案

- `frontend/src/App.jsx`
- `frontend/src/components/Dashboard.jsx`
- `frontend/src/components/RealTimeStatus.jsx`（新增）

### Ubuntu 更新步驟

```bash
cd ~/eLogbook
docker compose down
sudo chown -R $USER:$USER nodeapp
git fetch origin
git reset --hard origin/main
docker compose up --build -d
```
