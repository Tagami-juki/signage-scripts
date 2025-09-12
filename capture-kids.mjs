// scripts/capture-kids.mjs
import puppeteer from "puppeteer";

const URL = "https://kids.yahoo.co.jp/today";
const OUT = "shots/kids-today.png";
const VIEWPORT = { width: 1920, height: 1080 };

(async () => {
  const browser = await puppeteer.launch({
    headless: "new", // 最新系のヘッドレス
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--lang=ja-JP,ja",
    ],
    defaultViewport: VIEWPORT,
  });
  const page = await browser.newPage();

  // 日本語レンダリング&ブロック回避ぽい最低限のUA/ヘッダ
  await page.setExtraHTTPHeaders({ "Accept-Language": "ja-JP,ja;q=0.9" });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/126.0.0.0 Safari/537.36"
  );

  // ナビゲーション
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 120000 });

  // ページ内の不要な余白が多ければ、ここで要素指定のキャプチャに切替も可
  // 例）const el = await page.$("main") ; await el.screenshot({ path: OUT });
  await page.screenshot({ path: OUT, type: "png" }); // 画面サイズで撮影

  await browser.close();
  console.log(`Saved: ${OUT}`);
})();
