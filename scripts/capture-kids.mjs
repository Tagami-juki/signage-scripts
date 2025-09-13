// Kids Yahoo!「今日は何の日」カードだけを撮る（要素スクショ版）
import fs from "node:fs";
import puppeteer from "puppeteer";

const URL = "https://kids.yahoo.co.jp/today/";
const OUT = "shots/kids-today.png";

// ← ここを Today_info__ の接頭辞一致に
const SEL = '#__next > div > main > div[class^="Today_info__"]';

const VIEWPORT = { width: 1920, height: 1080 };
const WAIT = 15000; // 最大待機

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: VIEWPORT,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);

    await page.goto(URL, { waitUntil: "networkidle2", timeout: 60000 });

    const el = await page.waitForSelector(SEL, { visible: true, timeout: WAIT });
    if (!el) {
      console.warn("Target element not found, fallback to full page.");
      await page.screenshot({ path: OUT, fullPage: true });
      console.log("Saved (fallback full page):", OUT);
      return;
    }

    await page.evaluate((selector) => {
      const n = document.querySelector(selector);
      if (n) n.scrollIntoView({ block: "center", inline: "center" });
    }, SEL);

    await el.screenshot({ path: OUT });
    console.log(`Captured by selector: ${SEL}`);
    console.log("Saved:", OUT);
  } catch (e) {
    console.error("Capture error:", e);
    try {
      const pages = await browser.pages();
      if (pages && pages[0]) {
        await pages[0].screenshot({ path: OUT, fullPage: true });
        console.log("Saved (error fallback full page):", OUT);
      }
    } catch {}
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
