// Kids Yahoo!「今日は何の日」：白いカード部分だけを自動検出して撮影
import fs from "node:fs";
import puppeteer from "puppeteer";

const URL = "https://kids.yahoo.co.jp/today";
const OUT = "shots/kids-today.png";
const VIEWPORT = { width: 1920, height: 1080 };
const DEVICE_SCALE = 2;  // くっきりさせたい時は 2～3

function ensureDirFor(p){
  const d = p.split("/").slice(0,-1).join("/");
  if (d && !fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

/** 文字列に target の全部が含まれるか（大文字小文字無視） */
function includesAll(text, targets){
  const t = (text || "").toLowerCase();
  return targets.every(x => t.includes(x.toLowerCase()));
}

/** スマート検出：本文のキーワードから「白背景＆角丸」の親要素を見つけて clip 撮影 */
async function shootTodayCardSmart(page, outPath){
  // 1) ページ内からキーワードに合う要素を見つける
  const rect = await page.evaluate(() => {
    // 検索の手掛かり（ページ内にほぼ必ずある見出し）
    const KEYWORDS = ["この日が誕生日の著名人", "この日の出来事"];

    // 文字を持つ要素を幅広く
    const all = Array.from(document.querySelectorAll("main *"))
      .filter(el => (el.innerText || "").trim().length > 0);

    // キーワードを含む要素を探す
    const hits = all.filter(el =>
      KEYWORDS.every(k => (document.body.innerText || "").includes(k))
    );

    // もし body.innerText にキーワードが無いなら諦める
    if (hits.length === 0) {
      // 代替：キーワード1個でも含むものを探す
      const loose = all.find(el => {
        const t = (el.innerText || "").trim();
        return KEYWORDS.some(k => t.includes(k));
      });
      if (!loose) return null;

      // 近い親を探索
      let cand = loose;
      for (let hop = 0; hop < 12 && cand; hop++) {
        const cs = getComputedStyle(cand);
        const bg = cs.backgroundColor || "";
        const radius = parseFloat(cs.borderTopLeftRadius || "0");
        // ほぼ白の背景＆角丸っぽい
        const isWhite =
          bg.startsWith("rgb") &&
          (() => {
            const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (!m) return false;
            const [r,g,b] = [Number(m[1]),Number(m[2]),Number(m[3])];
            return (r>240 && g>240 && b>240); // ほぼ白
          })();
        if (isWhite && radius >= 8) break;
        cand = cand.parentElement;
      }
      if (!cand) return null;

      const r = cand.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    }

    // 厳密ヒットがある場合は、その共通親（白背景＆角丸）を探す
    // まずは2つのヒット要素（著名人／出来事）を拾う
    const anchor1 = all.find(el => el.innerText.includes("この日が誕生日の著名人"));
    const anchor2 = all.find(el => el.innerText.includes("この日の出来事")) || anchor1;

    // 共通の上位要素へ徐々に登る
    function ancestors(el){
      const list = [];
      let cur = el;
      for (let i=0;i<20 && cur;i++){ list.push(cur); cur = cur.parentElement; }
      return list;
    }
    const a1 = ancestors(anchor1);
    const a2 = ancestors(anchor2);
    let common = null;
    for (const n1 of a1){
      if (a2.includes(n1)){ common = n1; break; }
    }
    if (!common) common = anchor1.parentElement || anchor1;

    // 白背景＆角丸の近い親を再度上にたどる
    let cand = common;
    for (let hop=0; hop<12 && cand; hop++){
      const cs = getComputedStyle(cand);
      const bg = cs.backgroundColor || "";
      const radius = parseFloat(cs.borderTopLeftRadius || "0");
      const isWhite =
        bg.startsWith("rgb") &&
        (() => {
          const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (!m) return false;
          const [r,g,b] = [Number(m[1]),Number(m[2]),Number(m[3])];
          return (r>240 && g>240 && b>240);
        })();
      if (isWhite && radius >= 8) break;
      cand = cand.parentElement;
    }
    if (!cand) cand = common;

    const r = cand.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });

  if (!rect) return false;

  // 2) 少し余白を足して clip 撮影
  const PAD = 16; // 余白(px)
  const clip = {
    x: Math.max(0, rect.x - PAD),
    y: Math.max(0, rect.y - PAD),
    width: Math.max(1, rect.w + PAD*2),
    height: Math.max(1, rect.h + PAD*2),
  };
  await page.screenshot({ path: outPath, clip });
  console.log("Captured by SMART clip:", clip);
  return true;
}

/** 旧来のセレクタでも一応トライ（保険） */
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

(async () => {
  ensureDirFor(OUT);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--lang=ja-JP,ja"],
    defaultViewport: { ...VIEWPORT, deviceScaleFactor: DEVICE_SCALE },
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

    // 1) スマート検出（推奨）
    let ok = await shootTodayCardSmart(page, OUT);

    // 2) セレクタの保険（サイト側の構造変更時）
    if (!ok) {
      ok = await shootElementBySelectors(
        page,
        [
          // 有力候補を上から（必要に応じて増減OK）
          'main section[class*="today"] article',
          'main section[class*="today"]',
          'main .todayMain',
          'main .today',
          'main article',
        ],
        OUT
      );
    }

    // 3) だめなら全画面
    if (!ok){
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
