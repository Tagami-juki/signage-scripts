// scripts/fetch-openmeteo.js
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const OUT_DIR    = path.resolve(__dirname, "..", "data");
fs.mkdirSync(OUT_DIR, { recursive: true });

const places = [
  { id: "chiyoda", name: "千代田", lat: 35.69, lon: 139.76 },
  { id: "narita",  name: "成田",   lat: 35.77, lon: 140.39 },
  { id: "sendai",  name: "仙台",   lat: 38.27, lon: 140.87 },
];

const API = "https://api.open-meteo.com/v1/forecast";
const common = {
  current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
  daily:   "weather_code,temperature_2m_max,temperature_2m_min",
  timezone:"Asia/Tokyo",
};

function urlFor(p) {
  const u = new URL(API);
  u.searchParams.set("latitude",  p.lat);
  u.searchParams.set("longitude", p.lon);
  u.searchParams.set("current",   common.current);
  u.searchParams.set("daily",     common.daily);
  u.searchParams.set("forecast_days", "7");
  u.searchParams.set("timezone",  common.timezone);
  return u.toString();
}

async function fetchJson(u) {
  const res  = await fetch(u, { headers: { "User-Agent": "LEVEL6-Yodeck-Fetch/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();              // ← 空レス対策
  if (!text)  throw new Error("Empty body");  // ← ここで弾く
  try { return JSON.parse(text); } catch (e) { throw new Error("Invalid JSON"); }
}

const index = [];
for (const p of places) {
  try {
    const data = await fetchJson(urlFor(p));
    const out  = {
      place: p,
      updatedAt: new Date().toISOString(),
      current: data.current || null,
      daily:   data.daily   || null,
    };
    fs.writeFileSync(path.join(OUT_DIR, `${p.id}.json`), JSON.stringify(out));
    index.push({ id: p.id, name: p.name });
  } catch (e) {
    // 失敗時は直近成功版を温存できるよう、新規書き込みをスキップ（ログのみ）
    console.error(`[${p.id}] fetch failed:`, e.message);
  }
}
fs.writeFileSync(path.join(OUT_DIR, "index.json"), JSON.stringify({ places: index, updatedAt: new Date().toISOString() }));
