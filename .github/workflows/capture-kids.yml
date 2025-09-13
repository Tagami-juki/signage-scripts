// Kids Yahoo!「今日は何の日」を対象要素キャプチャ（$x不使用）
import fs from "node:fs";
import puppeteer from "puppeteer";

const URL = "https://kids.yahoo.co.jp/today";
const OUT = "shots/kids-today.png";
const VIEWPORT = { width: 1920, height: 1080 };

// ---------- utils ----------
function ensureDirFor(p){
  const d = p.split("/").slice(0,-1).join("/");
  if (d && !fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

// セレクタを上から順に試す
async function shootElementBySelectors(page, selectors, outPath){
  for (const sel of selectors){
    const el = await page.$(sel);
    if (el){
      await el.screenshot({ path: outPath });
      console.log("Captured by selector:", sel);
      return true;
    }
  }
  return false;
}

// 見出しテキストに一致するh1/h2/h3を探し、近い親(section→div→main)を撮る
async function shootByHeadingText(page, headingText, outPath){
  const headings = await page.$$("h1, h2, h3");
  for (const h of headings){
    const txt = await page.evaluate(el => (el.textContent||"").trim(), h);
    if (!txt || !txt.includes(headingText)) continue;

    const handle = await page.evaluateHandle(el => {
      const up = (n, tags, max=12) => {
        let cur=n, hop=0;
        while (cur && hop<max){
          cur = cur.parentElement;
          if (!cur) break;
          if (tags.includes(cur.tagName.toLowerCase())) return cur;
          hop++;
        }
        return null;
      };
      return up(el, ["section"]) || up(el, ["div"]) || up(el, ["main"]) || el;
    }, h);

    const el = handle.asElement();
    if (el){
      await el.screenshot({ path: outPath });
      console.log("Captured by heading text:", headingText);
      return true;
    }
  }
  return false;
}

// ---------- main ----------
(async () => {
  ensureDirFor(OUT);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--lang=ja-JP,ja"],
    defaultViewport: VIEWPORT,
  });

  try{
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ "Accept-Language": "ja-JP,ja;q=0.9" });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/126.0.0.0 Safari/537.36"
    );

    await page.goto(URL, { waitUntil: "networkidle2", timeout: 120000 });
    await page.waitForSelector("main", { timeout: 8000 }).catch(()=>{});

    // 1) 代表的なセレクタ
    const ok1 = await shootElementBySelectors(
      page,
      ["main", "main .today", ".todayMain", ".contents main"],
      OUT
    );

    // 2) 見出しから推定
    let ok2 = false;
    if (!ok1) ok2 = await shootByHeadingText(page, "今日は何の日", OUT);

    // 3) フォールバック：全画面
    if (!ok1 && !ok2){
      console.warn("Fallback to full-page capture.");
      await page.screenshot({ path: OUT, fullPage: true });
    }

    console.log("Saved:", OUT);
  } catch (e){
    console.error("Capture failed:", e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
