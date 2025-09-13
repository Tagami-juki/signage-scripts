// Kids Yahoo!「今日は何の日」専用キャプチャ（特定要素のみ）
import fs from "node:fs";
import puppeteer from "puppeteer";

const URL = "https://kids.yahoo.co.jp/today";
const OUT = "shots/kids-today.png";
const VIEWPORT = { width: 1920, height: 1080 };

// 出力フォルダを確実に作成
function ensureDirFor(p) {
  const d = p.split("/").slice(0, -1).join("/");
  if (d && !fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

(async () => {
  ensureDirFor(OUT);
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--lang=ja-JP,ja"],
    defaultViewport: VIEWPORT,
  });

  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ "Accept-Language": "ja-JP,ja;q=0.9" });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    );

    // ページを開く
    await page.goto(URL, { waitUntil: "networkidle2", timeout: 120000 });

    // 対象要素を待機
    const selector = '#__next > div > main > div[class^="Today_info__"]';
    await page.waitForSelector(selector, { timeout: 10000 });

    // 要素をキャプチャ
    const el = await page.$(selector);
    if (el) {
      await el.screenshot({ path: OUT });
      console.log("Captured by selector:", selector);
    } else {
      console.warn("Target element not found, fallback to full page.");
      await page.screenshot({ path: OUT, fullPage: true });
    }

    console.log("Saved:", OUT);
  } catch (e) {
    console.error("Capture failed:", e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
