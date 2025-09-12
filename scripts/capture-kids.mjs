// scripts/capture-kids.mjs
import puppeteer from "puppeteer";

const URL = "https://kids.yahoo.co.jp/today";
const OUT = "shots/kids-today.png";
const VIEWPORT = { width: 1920, height: 1080 };

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--lang=ja-JP,ja"],
    defaultViewport: VIEWPORT,
  });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({ "Accept-Language": "ja-JP,ja;q=0.9" });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/126.0.0.0 Safari/537.36"
  );

  // ===== ここから要素限定キャプチャ（優先順でトライ） =====
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

async function shootByHeadingText(page, headingText, outPath) {
  // 見出しテキストに一致する要素を見つけ、親コンテナをたどる
  const xp = `//*[self::h1 or self::h2 or self::h3][contains(normalize-space(.), '${headingText}')]`;
  const nodes = await page.$x(xp);
  if (nodes.length) {
    // 近い親の section → div → main の順で探す
    const target = await page.evaluateHandle((h) => {
      const up = (el, tagList, maxHop=10) => {
        let cur = el;
        let hop = 0;
        while (cur && hop < maxHop) {
          cur = cur.parentElement;
          if (!cur) break;
          if (tagList.includes(cur.tagName.toLowerCase())) return cur;
          hop++;
        }
        return null;
      };
      // 親 section があれば最優先、なければ div、最後に main 配下
      return up(h, ["section"]) || up(h, ["div"]) || up(h, ["main"]) || h;
    }, nodes[0]); // 先頭マッチを採用

    const box = await (await target.asElement()).boundingBox();
    if (box && box.width > 0 && box.height > 0) {
      await (await target.asElement()).screenshot({ path: outPath });
      console.log(`Captured by heading text: ${headingText}`);
      return true;
    }
  }
  return false;
}

// 1) よくあるセレクタから試す
const tried1 = await shootElementBySelectors(page, [
  "main",                // 一般的なメイン領域
  "main .today",         // ありがちな命名の保険
  ".todayMain",          // 想定されるクラス名の保険
  ".contents main",      // ラッパ内のmain
], OUT);

// 2) 見出しテキストで親ブロックを特定して撮る
let tried2 = false;
if (!tried1) {
  tried2 = await shootByHeadingText(page, "今日は何の日", OUT);
}

// 3) それでもダメなら全画面
if (!tried1 && !tried2) {
  console.warn("Fallback to full-page capture.");
  await page.screenshot({ path: OUT, fullPage: true });
}
// ===== ここまで要素限定キャプチャ =====
})();
