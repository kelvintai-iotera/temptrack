# BLE 即時追蹤原型

後端：Express + WebSocket、加權質心、EMA。前端：Canvas + Lerp。

## 安裝與執行

```bash
cd ble-tracker-prototype/backend
npm install
npm start
```

瀏覽器開啟 http://localhost:8080

手動送 RSSI：

```bash
curl -X POST http://localhost:8080/api/rssi ^
  -H "Content-Type: application/json" ^
  -d "{\"readings\":[{\"gateway_id\":\"gw-1\",\"rssi\":-55,\"x\":120,\"y\":80},{\"gateway_id\":\"gw-2\",\"rssi\":-70,\"x\":680,\"y\":90},{\"gateway_id\":\"gw-3\",\"rssi\":-62,\"x\":400,\"y\":520}]}"
```
