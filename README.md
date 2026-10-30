# Image Crop Studio / 圖片裁切工作台

A buildless, browser-only image editor. Images are processed on the visitor's own device. No image upload server, account system, external CDN, or backend database is required.

純靜態批次圖片編輯工具，圖片在使用者電腦的瀏覽器內處理，不上傳到伺服器。可直接部署 GitHub Pages。

## Use / 使用

1. Open **Open Folder** or **Open Images** to select your own originals.
2. Compare the original on the left with the editable image on the right.
3. Resize the crop using its eight handles. Drag inside to move it; gestures outside do not replace it.
4. Drag the ↻ handle or change the angle for free 360° rotation. The crop automatically fits inside the actual image. The 90° buttons turn the crop and image together.
5. Wheel over the actual image to pan it; wheel over empty space to scroll the page. Ctrl + wheel zooms around the pointer, up to 800%. Space + drag / middle-button drag pans. Fit to View resets the zoom.
6. Each image has independent Undo / Redo, including rotation and reset. Ctrl + Z / Ctrl + Y / Ctrl + Shift + Z act on the hovered image. Fifty undo steps are retained per image.
7. **Save All / Save Edited** always opens a destination folder picker and creates a new timestamped `cropped-results-*` subfolder and writes images one at a time, including a progress backup. Existing originals/results are not overwritten. A separate **Download ZIP** button is under Help. Save buttons never automatically download ZIP files; unsupported browsers show guidance to use desktop Chrome/Edge.

開啟資料夾或多張圖片後，即可左右對照、裁切、旋轉、縮放，每張圖片各有復原紀錄；不需逐張按完成。框外操作不改變原框，裁切範圍不超出實際圖片。預設直接儲存到你選擇的資料夾，建立新的帶時間結果子資料夾；不覆蓋原圖或先前輸出。也可展開說明，另外按「Download ZIP」。兩個 Save 按鈕不會自動轉成 ZIP；不支援直接寫入時會提示改用電腦版 Chrome 或 Edge。

## Progress / 進度

- Images and progress are stored in IndexedDB on this browser/device when storage permits. Reopening the same site restores the last session.
- Selecting the same unchanged image collection restores its settings using filenames, sizes and modification times.
- **Save Progress** downloads a JSON backup. To restore it, select the matching original image collection, then use **Restore Progress**. The backup does not include originals.
- Browser storage has quotas and can be cleared or evicted. A visible warning appears if caching or saving fails. Keep progress backups and your originals.
- Private/incognito sessions may not retain data after closing. Different browsers and devices do not share progress.
- Folder imports exclude `裁切結果`, `cropped-results` and timestamped `cropped-results-*` output directories to avoid reimporting generated images.

進度與可快取的圖片儲存在本機瀏覽器；清除網站資料、無痕模式或空間不足可能使快取消失。請定期下載進度 JSON；備份不包含原圖，還原時需先選取同一批原圖。

## Formats / 格式

Input: JPEG, PNG, WebP, BMP, GIF and TIFF (`.tif` / `.tiff`). Native browser formats use browser decoders; TIFF uses bundled UTIF.js. Only the first animation frame / TIFF page is edited. Some uncommon TIFF encodings may not decode.

Output defaults to the original JPEG/PNG/WebP format, with JPEG/WebP quality 95; TIFF, BMP and GIF export as PNG. You can instead select lossless PNG or JPEG for all files. When explicitly converting formats, the source extension is retained (`photo.jpg.png`) to avoid filename collisions. Output is 8-bit RGB on white; transparency, high bit depth and source metadata are not preserved. Arbitrary-angle rotation resamples pixels. Export uses original image dimensions, not preview resolution. Extremely large images/batches are limited by browser memory and canvas/ZIP limits; split them into smaller batches if needed.

支援 WebP、TIFF 等格式（動態圖或多頁影像只處理第一張）。可保留原格式或統一轉 PNG／JPEG。PNG 壓縮本身無損；任意角度旋轉仍會重採樣。輸出為 8-bit RGB、透明處填白色，不保留原始中繼資料。大圖及大型批次受瀏覽器記憶體限制。

## Deploy / 部署

Enable GitHub Pages with **GitHub Actions** as the source. The `pages.yml` workflow tests the project, packages only static website files and vendored libraries, then deploys on pushes to `main`.

All asset URLs are relative, so the site works at `/image-cropper/` and under custom domains. GitHub receives normal requests for website assets; selected images and crop settings are not transmitted. There are no third-party runtime/CDN dependencies or analytics.

GitHub Pages 設定來源為 GitHub Actions，推送 main 後會先測試再部署。網站請求僅用於下載工具本身，不傳送所選圖片。

## Development

Node 24+ and pnpm 11.25.0: `pnpm install --frozen-lockfile`, then `pnpm test`. Preview with `python -m http.server 8080 --bind 127.0.0.1` and open `http://127.0.0.1:8080`. Use HTTP/HTTPS rather than `file://` for Worker and storage support.

Vendored libraries are pinned and include their license files and SHA-256 manifest. See `vendor/manifest.json`. `scripts/vendor.py` refreshes the same pinned versions from the official npm registry.

The compact toolbar keeps English labels above Chinese subtitles while taking approximately half the former desktop header height. Help, privacy details and progress backup tools are collapsed by default. Folder writes require your explicit browser permission and remain on your device. Cancelling the destination picker does not export files.
