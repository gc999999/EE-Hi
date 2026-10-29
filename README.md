# 電機系學程島（EE Learning Island）

互動式學程網頁：側視霓虹海島場景，三座課程島嶼（**電磁學 / 通訊工程 / 電子學**）＋中央廣場，系主任 **PUMA** 帶你走一遍電機系四年的學習路線。

參考 [puma.taipei「HEART 政策島」](https://puma.taipei/heart-island) 的視覺風格（暗色島嶼、霓虹網格、可點擊探索），純靜態實作、無 build、無 framework、離線可用。

## 本機運行

直接開啟 `index.html` 即可（無需 server）：

```bash
# 方式一：雙擊 index.html
# 方式二：本機靜態 server（可選）
python3 -m http.server 8000
# 開 http://localhost:8000
```

## 專案結構

```
├── index.html          # 單一頁面
├── css/style.css       # 暗色主題、霓虹、面板、響應式
├── js/data.js          # 課程資料（3 門）＋學生（3 人）＋PUMA 台詞＋總回顧文案
├── js/app.js           # 場景渲染、擺位、互動邏輯
├── assets/puma.jpg     # 系主任 PUMA 立繪
└── README.md
```

## 互動說明

| 點擊對象 | 反應 |
|---|---|
| 學生（3 人） | 學生高亮，PUMA 說「海了嗎？」，右側面板顯示該年學習內容 |
| 島嶼 / 課程名牌 | 課程卡面板（說明、核心主題、先修、學完後接什麼、規劃建議） |
| PUMA / 中央廣場 | 四年總回顧：三島依順序（電子學→電磁學→通訊工程）點亮＋路徑動畫 |
| ✕ / ESC / 再點同一對象 | 關閉面板 |

## 課程資料依據

依台大、清大、海大電機系標準學程查證：

- **電子學**：大二，3 學分（先修：電路學）
- **電磁學**：大二，3 學分（先修：電路學、工程數學）
- **通訊工程**：大三，3 學分（先修：訊號與系統、機率）

若需替換為精確的系上資料，只需修改 `js/data.js`。

## GitHub Pages 部署

1. 推送到 public repo（目前部署於 `gc999999/EE-Hi`）：

   ```bash
   git init
   git add -A
   git commit -m "EE Learning Island: interactive curriculum island"
   git branch -M main
   git remote add origin git@github.com:gc999999/EE-Hi.git
   git push -u origin main
   ```

2. 在 repo 的 **Settings → Pages**，Source 選 **Deploy from a branch**，branch 選 `main`、目錄 `/ (root)`，Save。
   （或用 API：`POST /repos/gc999999/EE-Hi/pages`，body `{"source":{"branch":"main","path":"/"}}`；
   fine-grained token 需 **Pages = Read and write** 或 **Administration = Read and write**。）

3. 約 1 分鐘後開啟公開 URL：

   ```
   https://gc999999.github.io/EE-Hi/
   ```

   確認頁面可開啟、PUMA 立繪（`assets/puma.jpg`）正常顯示、無 404 資源。
