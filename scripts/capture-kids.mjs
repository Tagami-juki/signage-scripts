// scripts/capture-kids.mjs
// Kids Yahoo!「今日は何の日」を対象要素キャプチャでスクリーンショット保存
// Node: >= v20 / Puppeteer: 最新


import fs from "node:fs";
import puppeteer from "puppeteer";

const URL = "https://kids.yahoo.co.jp/today";
const OUT = "shots/kids-today.png";
const VIEWPORT = { width: 1920, height: 1080 };

// ---------------- ユーティリティ ----------------
function ensureDirFor(filePath) {
  const dir = filePath.split("/").slice(0, -1).join("/");
  if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// セレクタ配列を上から順に試して撮る
async function shootElementBySelectors(page, selectors, outPath) {
  for (const sel of selectors) {
    const el = await page.$(sel);
    if (el) {
      await el.screenshot({ path: outPath });
      console.log(`Captured by selector: ${sel}`);
      return true;
    }
  }
  return false;
}

// 見出しテキストから近い親コンテナ(section/div/main)を見つけて撮る（XPathは使わない）
async function shootByHeadingText(page, headingText, outPath) {
  const headings = await page.$$("h1, h2, h3");
  for (const h of headings) {
    const txt = await page.evaluate(el => (el.textContent || "").trim(), h);
    if (!txt || !txt.includes(headingText)) continue;

    // 近い親の section → div → main の順でたどる（最大12段）
    const containerHandle = await page.evaluateHandle((el) => {
      const up = (node, tags, maxHop = 12) => {
        let cur = node, hop = 0;
        while (cur && hop < maxHop) {
          cur = cur.parentElement;
          if (!cur) break;
          if (tags.includes(cur.tagName.toLowerCase())) return cur;
          hop++;
        }
        return null;
      };
      return up(el, ["section"]) || up(el, ["div"]) || up(el, ["main"]) || el;
    }, h);

    const el = containerHandle.asElement();
    if (el) {
      await el.screenshot({ path: outPath });
      console.log(`Captured by heading text: ${headingText}`);
      return true;
    }
  }
  return false;
}

// ---------------- メイン処理 ----------------
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
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/126.0.0.0 Safari/537.36"
    );

    await page.goto(URL, { waitUntil: "networkidle2", timeout: 120_000 });

    // まず main があれば待つ（なくても続行）
    await page.waitForSelector("main", { timeout: 8000 }).catch(() => {});

    // 1) よくあるセレクタで試す
    const tried1 = await shootElementBySelectors(page, [
      "main",            // 一般的なメイン領域
      "main .today",     // 想定クラスの保険
      ".todayMain",      // 想定クラスの保険
      ".contents main",
    ], OUT);

    // 2) 見出し「今日は何の日」で親ブロック特定
    let tried2 = false;
    if (!tried1) {
      tried2 = await shootByHeadingText(page, "今日は何の日", OUT);
    }

    // 3) ダメなら全画面
    if (!tried1 && !tried2) {
      console.warn("Fallback to full-page capture.");
      await page.screenshot({ path: OUT, fullPage: true });
    }

    console.log(`Saved: ${OUT}`);
  } catch (e) {
    console.error("Capture failed:", e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
